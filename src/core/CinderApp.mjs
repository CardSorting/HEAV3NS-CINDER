/** [LAYER: CORE] */

import { ElasticsearchClient } from "../infrastructure/ElasticsearchClient.mjs";
import { MemoryAttendeeRepository } from "../infrastructure/MemoryAttendeeRepository.mjs";
import { MemoryPodRepository } from "../infrastructure/MemoryPodRepository.mjs";
import { MemoryEventRepository } from "../infrastructure/MemoryEventRepository.mjs";
import { MemoryAgendaRepository } from "../infrastructure/MemoryAgendaRepository.mjs";
import { MemorySpaceRepository } from "../infrastructure/MemorySpaceRepository.mjs";
import { MemoryAnnouncementRepository } from "../infrastructure/MemoryAnnouncementRepository.mjs";
import { MemoryPromptRepository } from "../infrastructure/MemoryPromptRepository.mjs";
import { MemoryInteractionRepository } from "../infrastructure/MemoryInteractionRepository.mjs";
import { MemoryMessageRepository } from "../infrastructure/MemoryMessageRepository.mjs";
import { ElasticsearchAttendeeRepository } from "../infrastructure/ElasticsearchAttendeeRepository.mjs";
import { ElasticsearchPodRepository } from "../infrastructure/ElasticsearchPodRepository.mjs";
import { ElasticsearchEventRepository } from "../infrastructure/ElasticsearchEventRepository.mjs";
import { ElasticsearchAgendaRepository } from "../infrastructure/ElasticsearchAgendaRepository.mjs";
import { ElasticsearchSpaceRepository } from "../infrastructure/ElasticsearchSpaceRepository.mjs";
import { ElasticsearchAnnouncementRepository } from "../infrastructure/ElasticsearchAnnouncementRepository.mjs";
import { ElasticsearchPromptRepository } from "../infrastructure/ElasticsearchPromptRepository.mjs";
import { ElasticsearchInteractionRepository } from "../infrastructure/ElasticsearchInteractionRepository.mjs";
import { ElasticsearchMessageRepository } from "../infrastructure/ElasticsearchMessageRepository.mjs";
import { SimpleEventBus } from "../infrastructure/SimpleEventBus.mjs";
import { AiFacilitatorEngine } from "../infrastructure/AiFacilitatorEngine.mjs";

import { Attendee } from "../domain/attendee.mjs";
import { Pod } from "../domain/pod.mjs";
import { Match } from "../domain/match.mjs";
import { Message } from "../domain/message.mjs";
import { Session } from "../domain/agenda.mjs";
import { VenueSpace } from "../domain/venueSpace.mjs";
import { Announcement } from "../domain/announcement.mjs";
import { ConferenceEvent } from "../domain/conferenceEvent.mjs";

import { CheckInController } from "./CheckInController.mjs";
import { DiscoveryController } from "./DiscoveryController.mjs";
import { PodOrchestrationController } from "./PodOrchestrationController.mjs";
import { CommunicationController } from "./CommunicationController.mjs";
import { FacilitatorController } from "./FacilitatorController.mjs";
import { EventController } from "./EventController.mjs";

import { createClock } from "../plumbing/clock.mjs";
import { SEED_ATTENDEES, SEED_EVENT } from "../plumbing/conferenceSeedData.mjs";

/** Health-probe timeout used at startup (cold connections to a cloud cluster are slow). */
const STARTUP_PROBE_TIMEOUT_MS = 5000;

/** Entity factories injected into the adapters (infrastructure never imports concrete domain code). */
const ENTITY = Object.freeze({
  attendee: (p) => new Attendee(p),
  pod: (p) => new Pod(p),
  match: (p) => new Match(p),
  message: (p) => new Message(p),
  session: (p) => new Session(p),
  space: (p) => new VenueSpace(p),
  announcement: (p) => new Announcement(p),
  event: (p) => new ConferenceEvent(p)
});

/**
 * CINDER Application Container & Composition Root.
 * Wires together Domain, Infrastructure, and Core use case controllers.
 *
 * Two containers:
 * - "live": Elasticsearch-backed repositories over the cinder-* indices (when `config.configured`).
 * - "offline": in-memory repositories over the bundled seed data (no cluster needed; used by tests).
 * A live container whose cluster is unreachable at `initialize()` is rebuilt as offline.
 */
export class CinderApp {
  /**
   * @param {Object} [options]
   * @param {{ url: string|null, apiKey: string|null, configured: boolean, embedModel: string, indices: Object }} [options.config]
   *   Resolved config from plumbing/elasticConfig.mjs; live mode when `configured`.
   * @param {{ nowMs: () => number }} [options.clock] - plumbing clock (real or demo time)
   * @param {string|null} [options.defaultEventId] - event used when a request names none (live demo event)
   * @param {boolean} [options.forceOffline=false] - ignore the config and run on seed data
   * @param {Object} [options.esClient] - pre-built client (tests)
   * @param {{ weights?: Object, rankWindowSize?: number, rankConstant?: number }} [options.discoveryTuning]
   *   live discovery retriever tuning (evaluation tooling; defaults in infrastructure/discoveryRetriever.mjs)
   * @param {string} [options.elasticsearchUrl] - legacy: embedded-mode client URL
   */
  constructor(options = {}) {
    this.options = options;
    this.config = options.config || null;
    this.clock = options.clock || createClock();
    this.requestedMode = this.config?.configured && !options.forceOffline ? "live" : "offline";
    this.fallbackReason = null;
    this.initialized = false;
    this.build(this.requestedMode);
  }

  /**
   * (Re)builds the infrastructure ports and controllers for a mode.
   * @param {"live"|"offline"} mode
   */
  build(mode) {
    const opts = this.options;
    this.mode = mode;

    if (mode === "live") {
      const idx = this.config.indices;
      const defaultEventId = opts.defaultEventId || null;
      this.defaultEventId = defaultEventId;
      this.esClient = opts.esClient || new ElasticsearchClient({
        config: this.config, legacyAttendeeIndex: false, discoveryIndex: idx.registrations, discoveryTuning: opts.discoveryTuning
      });
      const es = this.esClient;
      this.eventRepo = new ElasticsearchEventRepository({ esClient: es, index: idx.events, toEntity: ENTITY.event });
      this.attendeeRepo = new ElasticsearchAttendeeRepository({ esClient: es, index: idx.registrations, defaultEventId, toEntity: ENTITY.attendee });
      this.messageRepo = new ElasticsearchMessageRepository({ esClient: es, index: idx.messages, defaultEventId, toEntity: ENTITY.message });
      this.podRepo = new ElasticsearchPodRepository({ esClient: es, index: idx.pods, messageRepo: this.messageRepo, defaultEventId, toEntity: ENTITY.pod });
      this.interactionRepo = new ElasticsearchInteractionRepository({ esClient: es, index: idx.interactions, defaultEventId, toEntity: ENTITY.match });
      this.agendaRepo = new ElasticsearchAgendaRepository({ esClient: es, index: idx.sessions, toEntity: ENTITY.session, embedModel: this.config.embedModel });
      this.spaceRepo = new ElasticsearchSpaceRepository({ esClient: es, index: idx.spaces, eventsIndex: idx.events, toEntity: ENTITY.space });
      this.announcementRepo = new ElasticsearchAnnouncementRepository({ esClient: es, index: idx.announcements, toEntity: ENTITY.announcement });
      this.promptRepo = new ElasticsearchPromptRepository({ esClient: es, index: idx.prompts, embedModel: this.config.embedModel });
    } else {
      // Offline always runs against the bundled seed event, whatever the live default is.
      const defaultEventId = SEED_EVENT.id;
      this.defaultEventId = defaultEventId;
      this.esClient = new ElasticsearchClient({ nodeUrl: opts.elasticsearchUrl });
      this.eventRepo = new MemoryEventRepository({ toEntity: ENTITY.event });
      this.attendeeRepo = new MemoryAttendeeRepository();
      this.messageRepo = new MemoryMessageRepository({ toEntity: ENTITY.message });
      this.podRepo = new MemoryPodRepository();
      this.interactionRepo = new MemoryInteractionRepository({ defaultEventId, toEntity: ENTITY.match });
      this.agendaRepo = new MemoryAgendaRepository({ toEntity: ENTITY.session });
      this.spaceRepo = new MemorySpaceRepository({ toEntity: ENTITY.space });
      this.announcementRepo = new MemoryAnnouncementRepository({ toEntity: ENTITY.announcement });
      this.promptRepo = new MemoryPromptRepository();
    }

    this.eventBus = new SimpleEventBus();
    this.facilitatorService = new AiFacilitatorEngine();

    // Core Controllers
    this.eventCtrl = new EventController({ eventRepo: this.eventRepo, clock: this.clock, defaultEventId: this.defaultEventId });

    this.checkInCtrl = new CheckInController({
      attendeeRepo: this.attendeeRepo,
      esClient: this.esClient,
      eventBus: this.eventBus,
      liveEmbeddings: mode === "live"
    });

    this.discoveryCtrl = new DiscoveryController({
      attendeeRepo: this.attendeeRepo,
      esClient: this.esClient,
      eventBus: this.eventBus,
      interactionRepo: this.interactionRepo
    });

    this.podCtrl = new PodOrchestrationController({
      podRepo: this.podRepo,
      attendeeRepo: this.attendeeRepo,
      esClient: this.esClient,
      eventBus: this.eventBus,
      facilitatorService: this.facilitatorService,
      interactionRepo: this.interactionRepo,
      nextSocialSlot: (eventId) => this.facilitatorCtrl.nextSocialSlot(eventId)
    });

    this.commCtrl = new CommunicationController({
      podRepo: this.podRepo,
      attendeeRepo: this.attendeeRepo,
      eventBus: this.eventBus,
      facilitatorService: this.facilitatorService,
      messageRepo: this.messageRepo,
      interactionRepo: this.interactionRepo,
      spaceRepo: this.spaceRepo,
      agendaRepo: this.agendaRepo,
      clock: this.clock,
      defaultEventId: this.defaultEventId
    });

    this.facilitatorCtrl = new FacilitatorController({
      podRepo: this.podRepo,
      attendeeRepo: this.attendeeRepo,
      eventBus: this.eventBus,
      facilitatorService: this.facilitatorService,
      agendaRepo: this.agendaRepo,
      promptRepo: this.promptRepo,
      spaceRepo: this.spaceRepo,
      announcementRepo: this.announcementRepo,
      clock: this.clock,
      defaultEventId: this.defaultEventId
    });
  }

  /**
   * Boots the application. Live mode probes the cluster and falls back to offline if it is unreachable;
   * offline mode seeds the bundled demo attendees into the seed event.
   */
  async initialize() {
    if (this.initialized) return;

    if (this.mode === "live") {
      // The first request to a cloud cluster pays DNS + TLS (+ serverless wake-up) and can exceed the normal
      // probe budget, so startup gets a longer timeout and one retry before falling back to offline data.
      let health = await this.esClient.checkHealth(STARTUP_PROBE_TIMEOUT_MS);
      if (!health.live) health = await this.esClient.checkHealth(STARTUP_PROBE_TIMEOUT_MS);
      if (!health.live) {
        this.fallbackReason = this.esClient.lastHealthError || "cluster unreachable";
        this.build("offline");
      }
    }

    let seeded = 0;
    if (this.mode === "offline") {
      await this.esClient.ensureIndex();
      for (const seedProfile of SEED_ATTENDEES) {
        await this.checkInCtrl.checkIn({ ...seedProfile, eventId: SEED_EVENT.id });
        seeded++;
      }
    }

    this.initialized = true;
    return {
      status: "initialized",
      mode: this.mode,
      seededAttendeesCount: seeded
    };
  }

  /**
   * Returns complete system status.
   */
  async getStatus() {
    const esStatus = await this.esClient.getStatus();
    const attendees = await this.attendeeRepo.listAll();
    const pods = await this.podRepo.listAll();
    const sessions = this.defaultEventId ? await this.agendaRepo.listByEvent(this.defaultEventId) : [];

    return {
      appName: "CINDER",
      tagline: "The Social Infrastructure for Conferences",
      status: "healthy",
      // "live" = queries run on the Elasticsearch cluster; "embedded" = in-process BM25 + vector fallback.
      searchMode: esStatus.live ? "live" : "embedded",
      // Which repositories are wired: "live" (cinder-* indices) or "offline" (seed data in memory).
      dataMode: this.mode,
      requestedMode: this.requestedMode,
      fallbackReason: this.fallbackReason,
      defaultEventId: this.defaultEventId,
      elasticsearch: esStatus,
      attendeeCount: attendees.length,
      podCount: pods.length,
      agendaSessionsCount: sessions.length
    };
  }
}
