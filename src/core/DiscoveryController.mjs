/** [LAYER: CORE] */

import { Match } from "../domain/match.mjs";
import { explainMatchRelevance } from "../domain/relevanceScore.mjs";
import { generatePrefixedId } from "../plumbing/idGenerator.mjs";

/**
 * Controller for Milestone 2: Attendee Discovery & Swipe Matching.
 * Coordinates Elasticsearch Hybrid Search and Match relationships.
 */
export class DiscoveryController {
  /**
   * @param {Object} params
   * @param {import("../domain/interfaces/IAttendeeRepository.mjs").IAttendeeRepository} params.attendeeRepo
   * @param {import("../domain/interfaces/IElasticsearchClient.mjs").IElasticsearchClient} params.esClient
   * @param {import("../domain/interfaces/IEventBus.mjs").IEventBus} params.eventBus
   */
  constructor({ attendeeRepo, esClient, eventBus }) {
    this.attendeeRepo = attendeeRepo;
    this.esClient = esClient;
    this.eventBus = eventBus;
    // Track swipes: key = `${fromId}:${toId}`, value = "like" | "pass"
    this.swipes = new Map();
    // Track mutual matches
    this.matches = new Map();
  }

  /**
   * Retrieves discovery candidate cards for an attendee via Elasticsearch Hybrid Search.
   * @param {string} attendeeId
   * @param {number} [limit=10]
   */
  async getDiscoveryFeed(attendeeId, limit = 10) {
    const source = await this.attendeeRepo.findById(attendeeId);
    if (!source) {
      throw new Error(`Attendee ${attendeeId} not found`);
    }

    // Exclude self and already swiped attendees
    const excludedIds = [attendeeId];
    for (const [key] of this.swipes.entries()) {
      if (key.startsWith(`${attendeeId}:`)) {
        const targetId = key.split(":")[1];
        excludedIds.push(targetId);
      }
    }

    const queryText = [
      ...source.interests,
      ...source.topics,
      source.projects,
      source.challenges
    ].join(" ");

    const esResult = await this.esClient.hybridSearch({
      queryText,
      queryVector: source.embedding,
      excludeIds: excludedIds,
      limit
    });

    const candidates = [];
    for (const hit of esResult.hits) {
      const candidateProfile = hit.source;
      const explanation = explainMatchRelevance(source, candidateProfile, {
        bm25Score: hit.bm25Score,
        knnScore: hit.knnScore,
        rrfScore: hit.rrfScore
      });

      candidates.push({
        profile: candidateProfile,
        score: hit.score,
        bm25Score: hit.bm25Score,
        knnScore: hit.knnScore,
        bm25Rank: hit.bm25Rank,
        knnRank: hit.knnRank,
        explanation
      });
    }

    return {
      candidates,
      esQuerySpec: esResult.querySpec,
      tookMs: esResult.tookMs,
      totalFound: esResult.totalHits
    };
  }

  /**
   * Records a swipe (like or pass).
   * Detects and establishes mutual matches.
   *
   * @param {Object} params
   * @param {string} params.fromAttendeeId
   * @param {string} params.toAttendeeId
   * @param {"like" | "pass"} params.action
   */
  async recordSwipe({ fromAttendeeId, toAttendeeId, action }) {
    const swipeKey = `${fromAttendeeId}:${toAttendeeId}`;
    this.swipes.set(swipeKey, action);

    let isMutual = false;
    let matchEntity = null;

    if (action === "like") {
      const reverseKey = `${toAttendeeId}:${fromAttendeeId}`;
      if (this.swipes.get(reverseKey) === "like") {
        isMutual = true;

        const source = await this.attendeeRepo.findById(fromAttendeeId);
        const target = await this.attendeeRepo.findById(toAttendeeId);
        const explanation = source && target ? explainMatchRelevance(source, target).synergySummary : "";

        matchEntity = new Match({
          id: generatePrefixedId("match"),
          initiatorId: fromAttendeeId,
          targetId: toAttendeeId,
          action: "like",
          mutual: true,
          explanation
        });

        this.matches.set(matchEntity.id, matchEntity);

        this.eventBus.publish("match.mutual", {
          match: matchEntity.toJSON(),
          fromAttendeeId,
          toAttendeeId
        });
      }
    }

    return {
      success: true,
      action,
      isMutual,
      match: matchEntity ? matchEntity.toJSON() : null
    };
  }

  /**
   * Lists mutual matches for an attendee.
   * @param {string} attendeeId
   */
  async getMutualMatches(attendeeId) {
    const results = [];
    for (const match of this.matches.values()) {
      if (match.initiatorId === attendeeId || match.targetId === attendeeId) {
        const partnerId = match.initiatorId === attendeeId ? match.targetId : match.initiatorId;
        const partner = await this.attendeeRepo.findById(partnerId);
        results.push({
          match: match.toJSON(),
          partner: partner ? partner.toJSON() : null
        });
      }
    }
    return results;
  }
}
