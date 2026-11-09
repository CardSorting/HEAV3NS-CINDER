/** [LAYER: CORE] */

import { Message } from "../domain/message.mjs";
import { generatePrefixedId } from "../plumbing/idGenerator.mjs";
import { CONTENT_SESSION_TYPES } from "../plumbing/sessionTypes.mjs";
import { slotSummary } from "../domain/meetupTime.mjs";

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
   * @param {import("../domain/interfaces/IAgendaRepository.mjs").IAgendaRepository} params.agendaRepo
   * @param {import("../domain/interfaces/IPromptRepository.mjs").IPromptRepository} params.promptRepo
   * @param {import("../domain/interfaces/ISpaceRepository.mjs").ISpaceRepository} params.spaceRepo
   * @param {{ nowMs: () => number }} params.clock
   * @param {string|null} [params.defaultEventId=null] - event for Pods created without one
   */
  constructor({ podRepo, attendeeRepo, eventBus, facilitatorService, agendaRepo, promptRepo, spaceRepo, clock, defaultEventId = null }) {
    if (!agendaRepo || !promptRepo || !spaceRepo || !clock) {
      throw new Error("FacilitatorController requires agendaRepo, promptRepo, spaceRepo and clock");
    }
    this.podRepo = podRepo;
    this.attendeeRepo = attendeeRepo;
    this.eventBus = eventBus;
    this.facilitatorService = facilitatorService;
    this.agendaRepo = agendaRepo;
    this.promptRepo = promptRepo;
    this.spaceRepo = spaceRepo;
    this.clock = clock;
    this.defaultEventId = defaultEventId;
    this.promptIndex = 0;
  }

  /**
   * The agenda view served on /api/agenda: sessions, meetup-friendly venues and discussion prompts.
   * @param {string} eventId
   * @returns {Promise<{ sessions: Object[], venues: Array<{ id: string, name: string, tag: string, capacity: number }>, prompts: string[] }>}
   */
  async getAgenda(eventId) {
    const [sessions, spaces, prompts] = await Promise.all([
      this.agendaRepo.listByEvent(eventId),
      this.spaceRepo.listForEvent(eventId, { meetupFriendlyOnly: true }),
      this.promptRepo.listByPhase("deep-dive")
    ]);
    return {
      sessions: sessions.map((s) => s.toJSON()),
      venues: spaces.map((s) => ({ id: s.id, name: s.name, tag: s.displayTag(), capacity: s.capacity })),
      prompts: prompts.map((p) => p.text)
    };
  }

  /** The next break/lunch/networking slot by the clock, summarized for facilitator messages. */
  async nextSocialSlot(eventId) {
    if (!eventId) return null;
    const slot = await this.agendaRepo.findNextSocialSlot(eventId, this.clock.nowMs());
    return slot ? slotSummary(slot.toJSON()) : null;
  }

  /** Next discussion prompt (rotates through the deep-dive prompts). */
  async nextPrompt() {
    const prompts = await this.promptRepo.listByPhase("deep-dive");
    if (!prompts.length) return undefined;
    return prompts[this.promptIndex++ % prompts.length].text;
  }

  /**
   * The session an agenda alert is about: the requested one if it belongs to the Pod's event, else the next
   * content session (talk, keynote, workshop…) starting after the clock, else the event's last one.
   */
  async resolveAlertSession(eventId, sessionId) {
    if (sessionId) {
      const requested = await this.agendaRepo.findById(sessionId);
      if (requested) return requested;
    }
    const content = (await this.agendaRepo.listByEvent(eventId)).filter((s) => CONTENT_SESSION_TYPES.includes(s.sessionType));
    const now = this.clock.nowMs();
    return content.find((s) => (s.startsAtMs() ?? 0) >= now) || content[content.length - 1] || null;
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

    const intro = await this.facilitatorService.generateWelcomeIntro(pod, members, {
      nextSocial: await this.nextSocialSlot(pod.eventId || this.defaultEventId)
    });

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
   * @param {string} [sessionId] - defaults to the next upcoming session
   */
  async triggerAgendaAlert(podId, sessionId) {
    const pod = await this.podRepo.findById(podId);
    if (!pod) return null;

    const sessionEntity = await this.resolveAlertSession(pod.eventId || this.defaultEventId, sessionId);
    if (!sessionEntity) return null;
    const session = sessionEntity.toJSON();
    const notif = await this.facilitatorService.generateAgendaNotification(pod, session, { prompt: await this.nextPrompt() });

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

    const promptText = await this.facilitatorService.generateDiscussionPrompt(pod, members, { prompt: await this.nextPrompt() });

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

