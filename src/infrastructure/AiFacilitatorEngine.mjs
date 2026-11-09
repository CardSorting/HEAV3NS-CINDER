/** [LAYER: INFRASTRUCTURE] */

import { IAiFacilitatorService } from "../domain/interfaces/IAiFacilitatorService.mjs";

const FALLBACK_PROMPT = "What problem did you come to this event hoping to solve, and what would 'solved' look like?";

/**
 * Intelligent AI Facilitator Engine.
 * Understands conference agenda, member backgrounds, and actively coordinates Pods.
 * Implements IAiFacilitatorService.
 */
export class AiFacilitatorEngine extends IAiFacilitatorService {
  constructor() {
    super();
  }

  /**
   * Generates a context-aware welcome and introduction for a newly formed Pod.
   * @param {import("../domain/pod.mjs").Pod} pod
   * @param {import("../domain/attendee.mjs").Attendee[]} members
   */
  async generateWelcomeIntro(pod, members, { nextSocial = null } = {}) {
    const memberNames = members.map((m) => m.name).join(", ");
    const topics = Array.from(new Set(members.flatMap((m) => m.interests))).slice(0, 4);

    const content =
      `👋 Welcome to ${pod.name}!\n\n` +
      `You have been curated together around ${topics.join(", ")}.\n\n` +
      `Members in this Pod: ${memberNames}.\n\n` +
      (nextSocial
        ? `📅 Up next: ${nextSocial.title} at ${nextSocial.time}${nextSocial.room ? ` in ${nextSocial.room}` : ""}.\n`
        : `📅 Check the agenda for the next break to meet in person.\n`) +
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
  async evaluateMeetupIntent(_pod, text, { spaces = [], when = null, defaultPlace = null } = {}) {
    const lower = text.toLowerCase();

    // The most specific space the message names, matched on the space's name and aliases
    // ("patio" -> East Terrace, "outside room 2.04" -> Room 2.04). Spaces are VenueSpace entities.
    let mentioned = null;
    let bestScore = 0;
    for (const space of spaces) {
      const score = typeof space.mentionedIn === "function"
        ? space.mentionedIn(text)
        : (lower.includes(String(space.name).toLowerCase()) ? String(space.name).length : 0);
      if (score > bestScore) {
        mentioned = space;
        bestScore = score;
      }
    }

    const isMeetupKeyword = /\b(meet|meetup|lunch|coffee|where|grab|catch up)\b/.test(lower);
    if (!isMeetupKeyword && !(mentioned && /\b(at|in|on|by|near|outside)\b/.test(lower))) {
      return { isMeetupProposal: false };
    }

    // No place named: the room of the slot the meetup falls in, else a meetup-friendly space (chosen by core).
    const place = mentioned || defaultPlace || null;
    const detectedLocation = place ? place.name : null;

    const time = when?.time || null;
    const soon = Number.isFinite(when?.minutesUntil) && when.minutesUntil > 0 && when.minutesUntil <= 120
      ? ` It starts in ${Math.round(when.minutesUntil)} minutes.`
      : "";
    const slot = when?.slotTitle ? ` (${when.slotTitle})` : "";
    const confirmationMessage = !detectedLocation
      ? "📍 Where should we meet? Name a spot (for example a café or lounge) and I'll pin it."
      : time
        ? `📍 Meetup Confirmed: ${detectedLocation} at ${time}${slot}.\nI've pinned this to your Pod header.${soon}`
        : `📍 Meetup spot pinned: ${detectedLocation}. There are no more breaks on today's agenda, so agree on a time here.`;

    return {
      isMeetupProposal: true,
      location: detectedLocation,
      spaceId: place ? place.id : null,
      time,
      confirmationMessage
    };
  }

  /**
   * Generates agenda notifications and reminders.
   * @param {import("../domain/pod.mjs").Pod} _pod
   * @param {any} session
   */
  async generateAgendaNotification(_pod, session, { prompt = FALLBACK_PROMPT } = {}) {
    const alertMessage =
      `⏰ Upcoming Conference Highlight: "${session.title}" starts at ${session.startTime} in ${session.room}.\n` +
      `Featuring: ${session.speakers.join(", ")}. Perfect alignment with this Pod's focus.`;

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
  async generateDiscussionPrompt(pod, _members, { prompt = FALLBACK_PROMPT } = {}) {
    return `💡 Pod Discussion Prompt: ${prompt}`;
  }
}

