/** [LAYER: CORE] */

import { Pod } from "../domain/pod.mjs";
import { formatPodName, generatePrefixedId } from "../plumbing/idGenerator.mjs";
import { vectorCentroid } from "../plumbing/vectorMath.mjs";
import { generateDenseEmbedding } from "../plumbing/textEmbedder.mjs";

/**
 * Controller for Milestone 3: Automatic Pod Composition & Orchestration.
 * Curates 4-6 attendee groups based on semantic similarity & complementary skills
 * using Elasticsearch Hybrid Search (BM25 + dense_vector kNN + RRF).
 */
export class PodOrchestrationController {
  /**
   * @param {Object} params
   * @param {import("../domain/interfaces/IPodRepository.mjs").IPodRepository} params.podRepo
   * @param {import("../domain/interfaces/IAttendeeRepository.mjs").IAttendeeRepository} params.attendeeRepo
   * @param {import("../domain/interfaces/IElasticsearchClient.mjs").IElasticsearchClient} params.esClient
   * @param {import("../domain/interfaces/IEventBus.mjs").IEventBus} params.eventBus
   * @param {import("../domain/interfaces/IAiFacilitatorService.mjs").IAiFacilitatorService} params.facilitatorService
   */
  constructor({ podRepo, attendeeRepo, esClient, eventBus, facilitatorService }) {
    this.podRepo = podRepo;
    this.attendeeRepo = attendeeRepo;
    this.esClient = esClient;
    this.eventBus = eventBus;
    this.facilitatorService = facilitatorService;
    this.podSequence = 7; // Default to Pod 07 for the showcase scenario
  }

  /**
   * Composes a Pod around seed attendees or a theme using Elasticsearch hybrid search ranking.
   * @param {Object} params
   * @param {string[]} [params.seedAttendeeIds=[]]
   * @param {string} [params.theme="Autonomous Cloud & Systems"]
   * @param {number} [params.targetSize=5]
   * @param {string} [params.eventId] - event the pod belongs to (defaults to the first seed attendee's event)
   * @returns {Promise<Pod>}
   */
  async composePod({
    seedAttendeeIds = [],
    theme = "Autonomous Cloud & Systems",
    targetSize = 5,
    eventId = null
  }) {
    const selectedIds = new Set(seedAttendeeIds);
    let podEventId = eventId;
    if (!podEventId && seedAttendeeIds.length) {
      podEventId = (await this.attendeeRepo.findById(seedAttendeeIds[0]))?.eventId || null;
    }
    const candidateRankings = [];
    let hybridQuerySpec = null;
    let tookMs = 0;

    // If we need more members to reach target size, retrieve complementary attendees via Elasticsearch Hybrid Search
    if (selectedIds.size < targetSize) {
      const seedProfiles = [];
      for (const sid of selectedIds) {
        const att = await this.attendeeRepo.findById(sid, { includeVectors: true });
        if (att) seedProfiles.push(att);
      }

      // Build hybrid query keywords and dense embedding vector
      const seedKeywords = seedProfiles.flatMap((p) => [
        ...(p.interests || []),
        ...(p.topics || []),
        ...(p.expertise || [])
      ]);
      const queryText = [theme, ...seedKeywords].filter(Boolean).join(" ");

      const seedVectors = seedProfiles
        .map((p) => p.embedding)
        .filter((v) => Array.isArray(v) && v.length > 0);

      const queryVector = seedVectors.length > 0
        ? vectorCentroid(seedVectors)
        : generateDenseEmbedding(theme, seedKeywords);

      // Execute Elasticsearch Hybrid Search (BM25 multi_match + dense_vector kNN + RRF)
      const esResult = await this.esClient.hybridSearch({
        queryText,
        queryVector,
        excludeIds: Array.from(selectedIds),
        limit: Math.max(targetSize * 2, 10)
      });

      tookMs = esResult.tookMs;
      hybridQuerySpec = esResult.querySpec;

      for (const hit of esResult.hits) {
        if (!selectedIds.has(hit.id)) {
          selectedIds.add(hit.id);
          candidateRankings.push({
            id: hit.id,
            name: hit.source?.name,
            title: hit.source?.title,
            company: hit.source?.company,
            score: hit.score,
            rrfScore: hit.rrfScore,
            bm25Score: hit.bm25Score,
            knnScore: hit.knnScore,
            bm25Rank: hit.bm25Rank,
            knnRank: hit.knnRank
          });
          if (selectedIds.size >= targetSize) break;
        }
      }

      // Fallback safety to guarantee reaching targetSize
      if (selectedIds.size < targetSize) {
        const allAttendees = await this.attendeeRepo.listAll(podEventId || undefined);
        for (const att of allAttendees) {
          if (!selectedIds.has(att.id)) {
            selectedIds.add(att.id);
            if (selectedIds.size >= targetSize) break;
          }
        }
      }
    }

    const memberIds = Array.from(selectedIds);
    const podId = generatePrefixedId("pod");
    const podName = formatPodName(this.podSequence++, theme);

    const pod = new Pod({
      id: podId,
      name: podName,
      topic: theme,
      memberIds,
      eventId: podEventId
    });

    pod.compositionMeta = {
      theme,
      seedAttendeeIds: [...seedAttendeeIds],
      candidateRankings,
      hybridQuerySpec,
      tookMs
    };

    // Persist Pod
    await this.podRepo.save(pod);

    // Retrieve full member objects for facilitator welcome intro
    const memberEntities = [];
    for (const mid of memberIds) {
      const att = await this.attendeeRepo.findById(mid);
      if (att) memberEntities.push(att);
    }

    // Trigger AI Facilitator to generate welcoming intro
    const welcomeIntro = await this.facilitatorService.generateWelcomeIntro(pod, memberEntities);

    this.eventBus.publish("pod.formed", {
      pod: pod.toJSON(),
      members: memberEntities.map((m) => m.toJSON()),
      welcomeIntro,
      candidateRankings
    });

    return pod;
  }

  /**
   * Retrieves a Pod by ID.
   * @param {string} podId
   */
  async getPod(podId) {
    return this.podRepo.findById(podId);
  }

  /**
   * Finds the Pod that an attendee belongs to.
   * @param {string} attendeeId
   */
  async getPodForAttendee(attendeeId) {
    return this.podRepo.findByMemberId(attendeeId);
  }

  /**
   * Lists formed Pods, optionally only those of one event.
   * @param {string} [eventId]
   */
  async listPods(eventId) {
    return this.podRepo.listAll(eventId);
  }
}

