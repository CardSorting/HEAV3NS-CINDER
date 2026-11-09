/** [LAYER: CORE] */

import { Message } from "../domain/message.mjs";
import { generatePrefixedId } from "../plumbing/idGenerator.mjs";
import { SEED_CONFERENCE_AGENDA } from "../plumbing/conferenceSeedData.mjs";

/**
 * Controller for Milestone 5: Proactive AI Facilitator.
 * Understands conference agenda, triggers announcements, prompts, and reminders.
 */
export class FacilitatorController {
  /**
   * @param {Object} params
   * @param {import("../domain/interfaces/IPodRepository.mjs").IPodRepository} params.podRepo
   * @param {import("../domain/interfaces/IAttendeeRepository.mjs").IAttendeeRepository} params.attendeeRepo
   * @param {import("../domain/interfaces/IEventBus.mjs").IEventBus} params.eventBus
   * @param {import("../domain/interfaces/IAiFacilitatorService.mjs").IAiFacilitatorService} params.facilitatorService
   */
  constructor({ podRepo, attendeeRepo, eventBus, facilitatorService }) {
    this.podRepo = podRepo;
    this.attendeeRepo = attendeeRepo;
    this.eventBus = eventBus;
    this.facilitatorService = facilitatorService;
    this.agenda = SEED_CONFERENCE_AGENDA;
  }

  /**
   * Posts an onboarding welcome message to a newly created Pod.
   * @param {string} podId
   */
  async welcomePod(podId) {
    const pod = await this.podRepo.findById(podId);
    if (!pod) return null;

    const members = [];
    for (const mid of pod.memberIds) {
      const att = await this.attendeeRepo.findById(mid);
      if (att) members.push(att);
    }

    const intro = await this.facilitatorService.generateWelcomeIntro(pod, members);

    const message = new Message({
      id: generatePrefixedId("msg_welcome"),
      podId,
      senderId: "facilitator_ai",
      senderName: pod.facilitatorName,
      senderType: "facilitator",
      content: intro.content,
      pinned: true,
      metadata: {
        type: "welcome_intro",
        starters: intro.suggestedStarters
      }
    });

    pod.addMessage(message);
    await this.podRepo.save(pod);

    this.eventBus.publish("facilitator.announcement", {
      podId,
      message: message.toJSON()
    });

    return message;
  }

  /**
   * Broadcasts an agenda alert / session reminder to a Pod.
   * @param {string} podId
   * @param {string} [sessionId="session_05"]
   */
  async triggerAgendaAlert(podId, sessionId = "session_05") {
    const pod = await this.podRepo.findById(podId);
    if (!pod) return null;

    const session = this.agenda.find((s) => s.id === sessionId) || this.agenda[4];
    const notif = await this.facilitatorService.generateAgendaNotification(pod, session);

    const message = new Message({
      id: generatePrefixedId("msg_agenda"),
      podId,
      senderId: "facilitator_ai",
      senderName: pod.facilitatorName,
      senderType: "facilitator",
      content: notif.alertMessage,
      pinned: true,
      metadata: {
        type: "agenda_alert",
        session
      }
    });

    pod.addMessage(message);
    await this.podRepo.save(pod);

    this.eventBus.publish("facilitator.announcement", {
      podId,
      message: message.toJSON()
    });

    return message;
  }

  /**
   * Dispatches a deep conversation prompt to stimulate meaningful technical collaboration.
   * @param {string} podId
   */
  async triggerDiscussionPrompt(podId) {
    const pod = await this.podRepo.findById(podId);
    if (!pod) return null;

    const members = [];
    for (const mid of pod.memberIds) {
      const att = await this.attendeeRepo.findById(mid);
      if (att) members.push(att);
    }

    const promptText = await this.facilitatorService.generateDiscussionPrompt(pod, members);

    const message = new Message({
      id: generatePrefixedId("msg_prompt"),
      podId,
      senderId: "facilitator_ai",
      senderName: pod.facilitatorName,
      senderType: "facilitator",
      content: promptText,
      metadata: {
        type: "discussion_prompt"
      }
    });

    pod.addMessage(message);
    await this.podRepo.save(pod);

    this.eventBus.publish("facilitator.announcement", {
      podId,
      message: message.toJSON()
    });

    return message;
  }
}

