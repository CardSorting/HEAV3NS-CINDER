/** [LAYER: CORE] */

import { Message } from "../domain/message.mjs";
import { generatePrefixedId } from "../plumbing/idGenerator.mjs";

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
   */
  constructor({ podRepo, attendeeRepo, eventBus, facilitatorService }) {
    this.podRepo = podRepo;
    this.attendeeRepo = attendeeRepo;
    this.eventBus = eventBus;
    this.facilitatorService = facilitatorService;
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
   * Retrieves all messages for a Pod.
   * @param {string} podId
   */
  async getMessages(podId) {
    const pod = await this.podRepo.findById(podId);
    if (!pod) return [];
    return pod.messages.map((m) => m.toJSON());
  }
}

