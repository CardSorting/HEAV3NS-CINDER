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
   * @param {import("../domain/interfaces/IInteractionRepository.mjs").IInteractionRepository} params.interactionRepo
   *   Swipes and mutual matches (event-scoped)
   */
  constructor({ attendeeRepo, esClient, eventBus, interactionRepo }) {
    if (!interactionRepo) throw new Error("DiscoveryController requires interactionRepo");
    this.attendeeRepo = attendeeRepo;
    this.esClient = esClient;
    this.eventBus = eventBus;
    this.interactionRepo = interactionRepo;
  }

  /**
   * Retrieves discovery candidate cards for an attendee via Elasticsearch Hybrid Search.
   * @param {string} attendeeId
   * @param {number} [limit=10]
   * @param {Object} [options]
   * @param {string} [options.eventId] - only suggest attendees of this event (defaults to the source's event)
   */
  async getDiscoveryFeed(attendeeId, limit = 10, { eventId } = {}) {
    const source = await this.attendeeRepo.findById(attendeeId);
    if (!source) {
      throw new Error(`Attendee ${attendeeId} not found`);
    }
    const scopeEventId = eventId || source.eventId || null;

    // Exclude self and already swiped attendees
    const excludedIds = [attendeeId, ...(await this.interactionRepo.listSwipedIds(scopeEventId || undefined, attendeeId))];

    const queryText = [
      ...source.interests,
      ...source.topics,
      source.projects,
      source.challenges
    ].join(" ");

    // The embedded engine holds every event's attendees: over-fetch, then keep the same event only.
    const esResult = await this.esClient.hybridSearch({
      queryText,
      queryVector: source.embedding,
      excludeIds: excludedIds,
      limit: scopeEventId ? Math.max(limit * 4, 50) : limit
    });
    const scopedHits = esResult.hits
      .filter((hit) => !scopeEventId || hit.source?.eventId === scopeEventId)
      .slice(0, limit);

    const candidates = [];
    for (const hit of scopedHits) {
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
      targetAttendeeId: attendeeId,
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
   * @param {string} [params.eventId] - defaults to the swiping attendee's event
   */
  async recordSwipe({ fromAttendeeId, toAttendeeId, action, eventId }) {
    const source = await this.attendeeRepo.findById(fromAttendeeId);
    const scopeEventId = eventId || source?.eventId || null;

    let isMutual = false;
    let matchEntity = null;

    // A like completes a match when the other attendee already liked back.
    const reverse = action === "like"
      ? await this.interactionRepo.findSwipe(scopeEventId || undefined, toAttendeeId, fromAttendeeId)
      : null;

    if (reverse?.action === "like") {
      isMutual = true;
      const target = await this.attendeeRepo.findById(toAttendeeId);
      const explanation = source && target ? explainMatchRelevance(source, target).synergySummary : "";
      matchEntity = new Match({
        id: generatePrefixedId("match"),
        initiatorId: fromAttendeeId,
        targetId: toAttendeeId,
        action: "like",
        mutual: true,
        explanation,
        eventId: scopeEventId
      });
      // The completing swipe is stored as the mutual match.
      await this.interactionRepo.saveSwipe(matchEntity);
    } else {
      await this.interactionRepo.saveSwipe(new Match({
        id: generatePrefixedId("swipe"),
        initiatorId: fromAttendeeId,
        targetId: toAttendeeId,
        action,
        eventId: scopeEventId
      }));
    }

    if (isMutual) {
      this.eventBus.publish("match.mutual", {
        match: matchEntity.toJSON(),
        fromAttendeeId,
        toAttendeeId
      });
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
   * @param {Object} [options]
   * @param {string} [options.eventId] - event to look in (defaults to the attendee's event)
   */
  async getMutualMatches(attendeeId, { eventId } = {}) {
    const scopeEventId = eventId || (await this.attendeeRepo.findById(attendeeId))?.eventId || undefined;
    const matches = await this.interactionRepo.listMutualMatches(scopeEventId, attendeeId);
    const results = [];
    for (const match of matches) {
      const partnerId = match.initiatorId === attendeeId ? match.targetId : match.initiatorId;
      const partner = await this.attendeeRepo.findById(partnerId);
      results.push({
        match: match.toJSON(),
        partner: partner ? partner.toJSON() : null
      });
    }
    return results;
  }

  /**
   * Whether one attendee has already liked another (used to auto-reciprocate demo likes).
   * @param {string} fromAttendeeId
   * @param {string} toAttendeeId
   * @param {string} [eventId]
   */
  async hasLiked(fromAttendeeId, toAttendeeId, eventId) {
    const swipe = await this.interactionRepo.findSwipe(eventId, fromAttendeeId, toAttendeeId);
    return swipe?.action === "like";
  }
}

