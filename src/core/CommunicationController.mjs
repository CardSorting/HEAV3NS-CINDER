/** [LAYER: CORE] */

import { Message } from "../domain/message.mjs";
import { generatePrefixedId } from "../plumbing/idGenerator.mjs";
import { requestError } from "../plumbing/requestError.mjs";

/**
 * Controller for Milestone 4: Realtime Pod Communication & Meetup Coordination.
 */
export class CommunicationController {
  /**
   * @param {Object} params
   * @param {import("../domain/interfaces/IPodRepository.mjs").IPodRepository} params.podRepo
   * @param {import("../domain/interfaces/IAttendeeRepository.mjs").IAttendeeRepository} params.attendeeRepo
   * @param {import("../domain/interfaces/IEventBus.mjs").IEventBus} params.eventBus
   * @param {import("../domain/interfaces/IAiFacilitatorService.mjs").IAiFacilitatorService} params.facilitatorService
   * @param {import("../domain/interfaces/IMessageRepository.mjs").IMessageRepository} params.messageRepo - 1:1 messages
   * @param {import("../domain/interfaces/IInteractionRepository.mjs").IInteractionRepository} params.interactionRepo - matches
   */
  constructor({ podRepo, attendeeRepo, eventBus, facilitatorService, messageRepo, interactionRepo }) {
    if (!messageRepo || !interactionRepo) throw new Error("CommunicationController requires messageRepo and interactionRepo");
    this.podRepo = podRepo;
    this.attendeeRepo = attendeeRepo;
    this.eventBus = eventBus;
    this.facilitatorService = facilitatorService;
    this.messageRepo = messageRepo;
    this.interactionRepo = interactionRepo;
  }

  /**
   * Posts a message to a Pod chat.
   * Automatically evaluates meetup intents and AI Facilitator assistance.
   *
   * @param {Object} params
   * @param {string} params.podId
   * @param {string} params.senderId
   * @param {string} [params.senderName]
   * @param {"attendee" | "facilitator" | "system"} [params.senderType="attendee"]
   * @param {string} params.content
   * @param {boolean} [params.pinned=false]
   * @param {Record<string, any>} [params.metadata]
   */
  async sendMessage({
    podId,
    senderId,
    senderName,
    senderType = "attendee",
    content,
    pinned = false,
    metadata = {}
  }) {
    const pod = await this.podRepo.findById(podId);
    if (!pod) {
      throw new Error(`Pod ${podId} not found`);
    }

    let resolvedName = senderName;
    if (!resolvedName && senderType === "attendee") {
      const attendee = await this.attendeeRepo.findById(senderId);
      resolvedName = attendee ? attendee.name : "Attendee";
    } else if (!resolvedName) {
      resolvedName = "CINDER Facilitator (AI)";
    }

    const message = new Message({
      id: generatePrefixedId("msg"),
      podId,
      senderId,
      senderName: resolvedName,
      senderType,
      content,
      pinned,
      metadata
    });

    pod.addMessage(message);
    await this.podRepo.save(pod);

    this.eventBus.publish("message.sent", {
      podId,
      message: message.toJSON()
    });

    // Check if message triggers meetup coordination
    if (senderType === "attendee") {
      const meetupIntent = await this.facilitatorService.evaluateMeetupIntent(pod, content);
      if (meetupIntent.isMeetupProposal && meetupIntent.location) {
        pod.pinMeetup(meetupIntent.location, meetupIntent.time || "12:15 PM", true);
        await this.podRepo.save(pod);

        // Send confirmation message from facilitator
        const facilitatorMsg = new Message({
          id: generatePrefixedId("msg_fac"),
          podId,
          senderId: "facilitator_ai",
          senderName: pod.facilitatorName,
          senderType: "facilitator",
          content: meetupIntent.confirmationMessage || `Meetup confirmed at ${meetupIntent.location}!`,
          pinned: true,
          metadata: {
            meetupConfirmed: true,
            location: meetupIntent.location,
            time: meetupIntent.time
          }
        });

        pod.addMessage(facilitatorMsg);
        await this.podRepo.save(pod);

        this.eventBus.publish("meetup.pinned", {
          podId,
          location: meetupIntent.location,
          time: meetupIntent.time,
          message: facilitatorMsg.toJSON()
        });
      }
    }

    return message;
  }

  /**
   * Proposes a meetup in a Pod: posts the proposal to the chat, pins the location and time, and RSVPs
   * the proposer. Other members RSVP for themselves (no RSVPs are assumed on their behalf).
   * @param {Object} params
   * @param {string} params.podId
   * @param {string} params.senderId - must be a member of the Pod
   * @param {string} [params.location="Main Hall East Patio"]
   * @param {string} [params.time="12:15 PM"]
   * @param {string} [params.note] - custom proposal text
   * @returns {Promise<{ location: string, time: string, confirmed: boolean, rsvps: string[] }>}
   */
  async proposeMeetup({ podId, senderId, location = "Main Hall East Patio", time = "12:15 PM", note }) {
    await this.requireMember(podId, senderId);
    await this.sendMessage({ podId, senderId, content: note || `Let's meet at ${location} at ${time} to collaborate!` });
    const pod = await this.podRepo.findById(podId);
    pod.pinMeetup(location, time, true);
    pod.pinnedMeetup.rsvps = [senderId];
    await this.podRepo.save(pod);
    this.eventBus.publish("meetup.pinned", { podId, location, time, rsvps: pod.pinnedMeetup.rsvps, eventId: pod.eventId });
    return pod.pinnedMeetup;
  }

  /**
   * Records a Pod member's RSVP to the pinned meetup.
   * @param {Object} params
   * @param {string} params.podId
   * @param {string} params.attendeeId - must be a member of the Pod
   * @param {boolean} [params.attending=true]
   * @returns {Promise<{ location: string, time: string, confirmed: boolean, rsvps: string[] }>}
   */
  async rsvpMeetup({ podId, attendeeId, attending = true }) {
    const pod = await this.requireMember(podId, attendeeId);
    if (!pod.pinnedMeetup) throw requestError("NO_MEETUP", 409, `Pod ${podId} has no pinned meetup to RSVP to`);
    const rsvps = new Set(pod.pinnedMeetup.rsvps || []);
    if (attending === false) rsvps.delete(attendeeId); else rsvps.add(attendeeId);
    pod.pinnedMeetup.rsvps = [...rsvps];
    await this.podRepo.save(pod);
    this.eventBus.publish("meetup.rsvp", { podId, pinnedMeetup: pod.pinnedMeetup, eventId: pod.eventId });
    return pod.pinnedMeetup;
  }

  /** Loads a Pod and checks the attendee belongs to it (404 / 403 request errors otherwise). */
  async requireMember(podId, attendeeId) {
    const pod = await this.podRepo.findById(podId);
    if (!pod) throw requestError("POD_NOT_FOUND", 404, `Pod ${podId} not found`);
    if (!attendeeId || !pod.memberIds.includes(attendeeId)) {
      throw requestError("NOT_A_POD_MEMBER", 403, `Attendee ${attendeeId} is not a member of ${podId}`);
    }
    return pod;
  }

  /**
   * Sends a 1:1 message between the two attendees of a mutual match.
   * @param {Object} params
   * @param {string} params.matchId
   * @param {string} params.senderId - must be one of the match's two attendees
   * @param {string} params.content
   * @param {string} [params.eventId] - defaults to the match's event
   * @returns {Promise<{ id: string, eventId: string, matchId: string, senderId: string, senderName: string, content: string, timestamp: string }>}
   */
  async sendDirectMessage({ matchId, senderId, content, eventId }) {
    const text = typeof content === "string" ? content.trim() : "";
    if (!text) throw requestError("MESSAGE_EMPTY", 400, "Message content is required");
    const match = await this.interactionRepo.findMatchById(matchId);
    if (!match || (eventId && match.eventId && match.eventId !== eventId)) {
      throw requestError("MATCH_NOT_FOUND", 404, `Match ${matchId} not found`);
    }
    if (senderId !== match.initiatorId && senderId !== match.targetId) {
      throw requestError("NOT_A_PARTICIPANT", 403, `Attendee ${senderId} is not part of match ${matchId}`);
    }
    const sender = await this.attendeeRepo.findById(senderId);
    const message = {
      id: generatePrefixedId("dm"),
      eventId: eventId || match.eventId,
      matchId,
      senderId,
      senderName: sender ? sender.name : "Attendee",
      content: text,
      timestamp: new Date().toISOString()
    };
    await this.messageRepo.appendDirectMessage(message);
    this.eventBus.publish("match.message", { matchId, message, eventId: message.eventId });
    return message;
  }

  /**
   * Lists a match's 1:1 messages in chronological order.
   * @param {string} matchId
   */
  async listDirectMessages(matchId) {
    return this.messageRepo.listDirectMessages(matchId);
  }

  /**
   * Retrieves all messages for a Pod.
   * @param {string} podId
   */
  async getMessages(podId) {
    const pod = await this.podRepo.findById(podId);
    if (!pod) return [];
    return pod.messages.map((m) => m.toJSON());
  }
}

