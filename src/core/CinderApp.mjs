/** [LAYER: CORE] */

import { ElasticsearchClient } from "../infrastructure/ElasticsearchClient.mjs";
import { MemoryAttendeeRepository } from "../infrastructure/MemoryAttendeeRepository.mjs";
import { MemoryPodRepository } from "../infrastructure/MemoryPodRepository.mjs";
import { SimpleEventBus } from "../infrastructure/SimpleEventBus.mjs";
import { AiFacilitatorEngine } from "../infrastructure/AiFacilitatorEngine.mjs";

import { CheckInController } from "./CheckInController.mjs";
import { DiscoveryController } from "./DiscoveryController.mjs";
import { PodOrchestrationController } from "./PodOrchestrationController.mjs";
import { CommunicationController } from "./CommunicationController.mjs";
import { FacilitatorController } from "./FacilitatorController.mjs";

import { SEED_ATTENDEES, SEED_CONFERENCE_AGENDA } from "../plumbing/conferenceSeedData.mjs";

/**
 * CINDER Application Container & Composition Root.
 * Wires together Domain, Infrastructure, and Core use case controllers.
 */
export class CinderApp {
  /**
   * @param {Object} [options]
   * @param {string} [options.elasticsearchUrl]
   */
  constructor(options = {}) {
    // Infrastructure ports
    this.esClient = new ElasticsearchClient({ nodeUrl: options.elasticsearchUrl });
    this.attendeeRepo = new MemoryAttendeeRepository();
    this.podRepo = new MemoryPodRepository();
    this.eventBus = new SimpleEventBus();
    this.facilitatorService = new AiFacilitatorEngine();

    // Core Controllers
    this.checkInCtrl = new CheckInController({
      attendeeRepo: this.attendeeRepo,
      esClient: this.esClient,
      eventBus: this.eventBus
    });

    this.discoveryCtrl = new DiscoveryController({
      attendeeRepo: this.attendeeRepo,
      esClient: this.esClient,
      eventBus: this.eventBus
    });

    this.podCtrl = new PodOrchestrationController({
      podRepo: this.podRepo,
      attendeeRepo: this.attendeeRepo,
      esClient: this.esClient,
      eventBus: this.eventBus,
      facilitatorService: this.facilitatorService
    });

    this.commCtrl = new CommunicationController({
      podRepo: this.podRepo,
      attendeeRepo: this.attendeeRepo,
      eventBus: this.eventBus,
      facilitatorService: this.facilitatorService
    });

    this.facilitatorCtrl = new FacilitatorController({
      podRepo: this.podRepo,
      attendeeRepo: this.attendeeRepo,
      eventBus: this.eventBus,
      facilitatorService: this.facilitatorService
    });

    this.agenda = SEED_CONFERENCE_AGENDA;
    this.initialized = false;
  }

  /**
   * Boots the application and seeds initial conference profiles.
   */
  async initialize() {
    if (this.initialized) return;

    await this.esClient.ensureIndex();

    // Seed the 5 core demo attendees into Elasticsearch & Repository
    for (const seedProfile of SEED_ATTENDEES) {
      await this.checkInCtrl.checkIn(seedProfile);
    }

    this.initialized = true;
    return {
      status: "initialized",
      seededAttendeesCount: SEED_ATTENDEES.length
    };
  }

  /**
   * Returns complete system status.
   */
  async getStatus() {
    const esStatus = await this.esClient.getStatus();
    const attendees = await this.attendeeRepo.listAll();
    const pods = await this.podRepo.listAll();

    return {
      appName: "CINDER",
      tagline: "The Social Infrastructure for Conferences",
      status: "healthy",
      elasticsearch: esStatus,
      attendeeCount: attendees.length,
      podCount: pods.length,
      agendaSessionsCount: this.agenda.length
    };
  }
}

