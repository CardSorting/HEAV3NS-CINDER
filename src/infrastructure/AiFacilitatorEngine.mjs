/** [LAYER: INFRASTRUCTURE] */

import { IAiFacilitatorService } from "../domain/interfaces/IAiFacilitatorService.mjs";
import { VENUE_LOCATIONS, DISCUSSION_PROMPTS } from "../plumbing/conferenceSeedData.mjs";

/**
 * Intelligent AI Facilitator Engine.
 * Understands conference agenda, member backgrounds, and actively coordinates Pods.
 * Implements IAiFacilitatorService.
 */
export class AiFacilitatorEngine extends IAiFacilitatorService {
  constructor() {
    super();
    this.promptIndex = 0;
  }

  /**
   * Generates a context-aware welcome and introduction for a newly formed Pod.
   * @param {import("../domain/pod.mjs").Pod} pod
   * @param {import("../domain/attendee.mjs").Attendee[]} members
   */
  async generateWelcomeIntro(pod, members) {
    const memberNames = members.map((m) => m.name).join(", ");
    const topics = Array.from(new Set(members.flatMap((m) => m.interests))).slice(0, 4);

    const content =
      `👋 Welcome to ${pod.name}!\n\n` +
      `You have been curated together around ${topics.join(", ")}.\n\n` +
      `Members in this Pod: ${memberNames}.\n\n` +
      `📅 Upcoming Schedule: Curated Lunch Meetup begins at 12:15 PM.\n` +
      `Before we head over, take a moment to introduce the core problem you're currently tackling!`;

    const suggestedStarters = [
      "What is the toughest consensus or scaling challenge in your stack right now?",
      "How are you handling kernel-level telemetry and observability?",
      "Are you currently exploring autonomous agents in production?"
    ];

    return {
      content,
      suggestedStarters
    };
  }

  /**
   * Detects meetup coordination intent in chat messages.
   * @param {import("../domain/pod.mjs").Pod} _pod
   * @param {string} text
   */
  async evaluateMeetupIntent(_pod, text) {
    const lower = text.toLowerCase();
    const isMeetupKeyword =
      lower.includes("meet") ||
      lower.includes("lunch") ||
      lower.includes("patio") ||
      lower.includes("cafe") ||
      lower.includes("where");

    if (!isMeetupKeyword) {
      return { isMeetupProposal: false };
    }

    let detectedLocation = "Main Hall East Patio";
    for (const loc of VENUE_LOCATIONS) {
      if (lower.includes(loc.name.toLowerCase()) || lower.includes(loc.id.replace("loc_", ""))) {
        detectedLocation = loc.name;
        break;
      }
    }

    const time = "12:15 PM";
    const confirmationMessage =
      `📍 Meetup Confirmed: ${detectedLocation} at ${time}.\n` +
      `I've pinned this to your Pod header. See you there in 5 minutes!`;

    return {
      isMeetupProposal: true,
      location: detectedLocation,
      time,
      confirmationMessage
    };
  }

  /**
   * Generates agenda notifications and reminders.
   * @param {import("../domain/pod.mjs").Pod} _pod
   * @param {any} session
   */
  async generateAgendaNotification(_pod, session) {
    const alertMessage =
      `⏰ Upcoming Conference Highlight: "${session.title}" starts at ${session.startTime} in ${session.room}.\n` +
      `Featuring: ${session.speakers.join(", ")}. Perfect alignment with this Pod's focus.`;

    const prompt =
      DISCUSSION_PROMPTS[this.promptIndex % DISCUSSION_PROMPTS.length];
    this.promptIndex++;

    return {
      alertMessage,
      discussionPrompt: prompt
    };
  }

  /**
   * Generates an intelligent conversation prompt based on group focus.
   * @param {import("../domain/pod.mjs").Pod} pod
   * @param {import("../domain/attendee.mjs").Attendee[]} _members
   */
  async generateDiscussionPrompt(pod, _members) {
    const prompt =
      DISCUSSION_PROMPTS[this.promptIndex % DISCUSSION_PROMPTS.length];
    this.promptIndex++;
    return `💡 Pod Discussion Prompt: ${prompt}`;
  }
}
