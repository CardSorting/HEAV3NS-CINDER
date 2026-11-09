/** [LAYER: DOMAIN] */

/**
 * Contractual Sovereignty interface for the AI Facilitator.
 * Understands conference agenda, pod context, and proactively coordinates groups.
 * Zero I/O.
 */
export class IAiFacilitatorService {
  /**
   * Generates a context-aware welcome and introduction for a newly formed Pod.
   * @param {import("../pod.mjs").Pod} _pod
   * @param {import("../attendee.mjs").Attendee[]} _members
   * @param {Object} [_context]
   * @param {{ title: string, time: string, room: string|null }|null} [_context.nextSocial] - next break/lunch from the agenda
   * @returns {Promise<{ content: string, suggestedStarters: string[] }>}
   */
  async generateWelcomeIntro(_pod, _members, _context) {
    throw new Error("IAiFacilitatorService.generateWelcomeIntro must be implemented by an infrastructure adapter.");
  }

  /**
   * Evaluates or confirms a meetup location coordination within a Pod chat.
   * @param {import("../pod.mjs").Pod} _pod
   * @param {string} _text
   * @param {Object} [_context]
   * @param {import("../venueSpace.mjs").VenueSpace[]} [_context.spaces] - meetup spaces available at the Pod's event
   * @param {{ time: string, startsAt: string, minutesUntil?: number, slotTitle?: string }} [_context.when]
   *   meetup time resolved against the agenda (used in the confirmation)
   * @param {{ id: string, name: string }|null} [_context.defaultPlace] - place to use when the message names none
   * @returns {Promise<{ isMeetupProposal: boolean, location?: string, spaceId?: string|null, time?: string, confirmationMessage?: string }>}
   */
  async evaluateMeetupIntent(_pod, _text, _context) {
    throw new Error("IAiFacilitatorService.evaluateMeetupIntent must be implemented by an infrastructure adapter.");
  }

  /**
   * Generates agenda alerts and timely reminders for upcoming talks or activities.
   * @param {import("../pod.mjs").Pod} _pod
   * @param {any} _currentOrUpcomingSession
   * @param {Object} [_context]
   * @param {string} [_context.prompt] - discussion prompt chosen for the Pod
   * @returns {Promise<{ alertMessage: string, discussionPrompt: string }>}
   */
  async generateAgendaNotification(_pod, _currentOrUpcomingSession, _context) {
    throw new Error("IAiFacilitatorService.generateAgendaNotification must be implemented by an infrastructure adapter.");
  }

  /**
   * Generates an intelligent conversation prompt based on the group's collective interests.
   * @param {import("../pod.mjs").Pod} _pod
   * @param {import("../attendee.mjs").Attendee[]} _members
   * @param {Object} [_context]
   * @param {string} [_context.prompt] - discussion prompt chosen for the Pod
   * @returns {Promise<string>}
   */
  async generateDiscussionPrompt(_pod, _members, _context) {
    throw new Error("IAiFacilitatorService.generateDiscussionPrompt must be implemented by an infrastructure adapter.");
  }
}

