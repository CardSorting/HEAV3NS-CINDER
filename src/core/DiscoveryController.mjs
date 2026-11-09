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
   * @param {boolean} [options.explain=false] - include each candidate's rank in every live retriever (slower)
   */
  async getDiscoveryFeed(attendeeId, limit = 10, { eventId, explain = false } = {}) {
    // The stored profile vector is reused as the kNN query vector, so load it explicitly.
    const source = await this.attendeeRepo.findById(attendeeId, { includeVectors: true });
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

    // Both engines scope by event themselves, so ask for exactly `limit` (live explain cost grows with hits).
    const esResult = await this.esClient.hybridSearch({
      queryText,
      queryVector: source.embedding,
      excludeIds: excludedIds,
      limit,
      eventId: scopeEventId || undefined,
      lookingForText: source.looking_for,
      explain
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
        rrfScore: hit.rrfScore,
        retrieverRanks: hit.retrieverRanks
      });

      candidates.push({
        profile: candidateProfile,
        score: hit.score,
        bm25Score: hit.bm25Score,
        knnScore: hit.knnScore,
        bm25Rank: hit.bm25Rank,
        knnRank: hit.knnRank,
        retrieverRanks: hit.retrieverRanks || null,
        explanation
      });
    }

    return {
      targetAttendeeId: attendeeId,
      candidates,
      esQuerySpec: esResult.querySpec,
      engine: esResult.engine || "embedded",
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
   * Resets an attendee's discovery deck: removes their passes (or every swipe with `resetAll`) so those
   * attendees can be suggested again. Mutual matches are never removed.
   * @param {string} attendeeId
   * @param {Object} [options]
   * @param {string} [options.eventId] - defaults to the attendee's event
   * @param {boolean} [options.resetAll=false] - also clear likes that did not become matches
   * @param {number} [options.limit=10] - size of the refreshed feed
   * @returns {Promise<{ reset: true, removed: number, feed: Object }>}
   */
  async resetDiscovery(attendeeId, { eventId, resetAll = false, limit = 10 } = {}) {
    const scopeEventId = eventId || (await this.attendeeRepo.findById(attendeeId))?.eventId || undefined;
    const removed = await this.interactionRepo.deleteSwipes(scopeEventId, attendeeId, { action: resetAll ? undefined : "pass" });
    const feed = await this.getDiscoveryFeed(attendeeId, limit, { eventId: scopeEventId });
    return { reset: true, removed, feed };
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

