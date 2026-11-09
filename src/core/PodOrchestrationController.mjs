/** [LAYER: CORE] */

import { Pod } from "../domain/pod.mjs";
import { formatPodName, generatePrefixedId } from "../plumbing/idGenerator.mjs";
import { vectorCentroid } from "../plumbing/vectorMath.mjs";
import { generateDenseEmbedding } from "../plumbing/textEmbedder.mjs";
import { selectPodMembers, disciplineOf } from "../domain/podComposition.mjs";

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
   * @param {import("../domain/interfaces/IInteractionRepository.mjs").IInteractionRepository} [params.interactionRepo]
   *   mutual matches of the seeds are added as anchors when available
   */
  constructor({ podRepo, attendeeRepo, esClient, eventBus, facilitatorService, interactionRepo = null }) {
    this.interactionRepo = interactionRepo;
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
    let podEventId = eventId;
    const seedProfiles = [];
    for (const sid of seedAttendeeIds) {
      const att = await this.attendeeRepo.findById(sid, { includeVectors: true });
      seedProfiles.push(att || { id: sid });
    }
    if (!podEventId) podEventId = seedProfiles.find((p) => p.eventId)?.eventId || null;

    let candidateRankings = [];
    let hybridQuerySpec = null;
    let tookMs = 0;
    let selection = { members: seedProfiles, anchorsUsed: [], disciplines: {}, relaxedCap: false, skippedForDiversity: [] };

    if (seedProfiles.length < targetSize) {
      // Anchors: people the seeds already matched with (mutual likes), same event.
      const anchors = [];
      if (this.interactionRepo && podEventId) {
        for (const seed of seedProfiles) {
          for (const match of await this.interactionRepo.listMutualMatches(podEventId, seed.id)) {
            const partnerId = match.initiatorId === seed.id ? match.targetId : match.initiatorId;
            if (anchors.some((a) => a.id === partnerId) || seedAttendeeIds.includes(partnerId)) continue;
            const partner = await this.attendeeRepo.findById(partnerId);
            if (partner && (!partner.eventId || partner.eventId === podEventId)) anchors.push(partner);
          }
        }
      }

      // Candidates via Elasticsearch hybrid search: kNN around the seed attendees' centroid (stored profile
      // vectors) fused with BM25 over the theme and seed keywords, scoped to the pod's event (live: one RRF
      // retriever on cinder-registrations). Over-fetch so the diversity rule has room to choose.
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

      const esResult = await this.esClient.hybridSearch({
        queryText,
        queryVector,
        excludeIds: [...seedAttendeeIds],
        // Deep enough that other disciplines appear even when the nearest neighbours share the seeds' discipline.
        limit: Math.max(targetSize * 10, 50),
        eventId: podEventId || undefined
      });
      tookMs = esResult.tookMs;
      hybridQuerySpec = esResult.querySpec;

      const ranked = esResult.hits.map((hit) => ({ ...hit.source, id: hit.id, _hit: hit }));
      selection = selectPodMembers({ seeds: seedProfiles, anchors, candidates: ranked, targetSize });

      // Fallback pool (whole event) only when search could not fill the Pod.
      if (selection.members.length < targetSize) {
        const pool = (await this.attendeeRepo.listAll(podEventId || undefined))
          .filter((a) => !ranked.some((r) => r.id === a.id))
          .map((a) => (typeof a.toJSON === "function" ? a.toJSON() : a));
        selection = selectPodMembers({ seeds: seedProfiles, anchors, candidates: [...ranked, ...pool], targetSize });
      }

      candidateRankings = selection.members
        .filter((m) => !seedAttendeeIds.includes(m.id))
        .map((m) => {
          const hit = m._hit || {};
          return {
            id: m.id,
            name: m.name,
            title: m.title,
            company: m.company,
            discipline: disciplineOf(m),
            via: selection.anchorsUsed.includes(m.id) ? "mutual-match" : (m._hit ? "search" : "fallback"),
            score: hit.score ?? null,
            rrfScore: hit.rrfScore ?? null,
            bm25Score: hit.bm25Score ?? null,
            knnScore: hit.knnScore ?? null,
            bm25Rank: hit.bm25Rank ?? null,
            knnRank: hit.knnRank ?? null
          };
        });
    }

    const selectedIds = new Set(selection.members.map((m) => m.id));
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
      disciplines: selection.disciplines,
      anchorsUsed: selection.anchorsUsed,
      relaxedDiversityCap: selection.relaxedCap,
      skippedForDiversity: selection.skippedForDiversity,
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

