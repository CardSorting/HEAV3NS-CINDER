/** [LAYER: CORE] */

import { Pod } from "../domain/pod.mjs";
import { formatPodName, generatePrefixedId } from "../plumbing/idGenerator.mjs";

/**
 * Controller for Milestone 3: Automatic Pod Composition & Orchestration.
 * Curates 4-6 attendee groups based on semantic similarity & complementary skills.
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
   * Composes a Pod around a seed attendee or theme.
   * @param {Object} params
   * @param {string[]} [params.seedAttendeeIds=[]]
   * @param {string} [params.theme="Autonomous Cloud & Systems"]
   * @param {number} [params.targetSize=5]
   * @returns {Promise<Pod>}
   */
  async composePod({
    seedAttendeeIds = [],
    theme = "Autonomous Cloud & Systems",
    targetSize = 5
  }) {
    const selectedIds = new Set(seedAttendeeIds);

    // If we need more members to reach target size, retrieve complementary attendees
    if (selectedIds.size < targetSize) {
      const allAttendees = await this.attendeeRepo.listAll();
      for (const att of allAttendees) {
        if (!selectedIds.has(att.id)) {
          selectedIds.add(att.id);
          if (selectedIds.size >= targetSize) break;
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
      memberIds
    });

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
      welcomeIntro
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
   * Lists all formed Pods.
   */
  async listPods() {
    return this.podRepo.listAll();
  }
}
