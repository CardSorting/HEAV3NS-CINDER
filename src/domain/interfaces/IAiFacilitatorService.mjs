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
   * @returns {Promise<{ content: string, suggestedStarters: string[] }>}
   */
  async generateWelcomeIntro(_pod, _members) {
    throw new Error("IAiFacilitatorService.generateWelcomeIntro must be implemented by an infrastructure adapter.");
  }

  /**
   * Evaluates or confirms a meetup location coordination within a Pod chat.
   * @param {import("../pod.mjs").Pod} _pod
   * @param {string} _text
   * @returns {Promise<{ isMeetupProposal: boolean, location?: string, time?: string, confirmationMessage?: string }>}
   */
  async evaluateMeetupIntent(_pod, _text) {
    throw new Error("IAiFacilitatorService.evaluateMeetupIntent must be implemented by an infrastructure adapter.");
  }

  /**
   * Generates agenda alerts and timely reminders for upcoming talks or activities.
   * @param {import("../pod.mjs").Pod} _pod
   * @param {any} _currentOrUpcomingSession
   * @returns {Promise<{ alertMessage: string, discussionPrompt: string }>}
   */
  async generateAgendaNotification(_pod, _currentOrUpcomingSession) {
    throw new Error("IAiFacilitatorService.generateAgendaNotification must be implemented by an infrastructure adapter.");
  }

  /**
   * Generates an intelligent conversation prompt based on the group's collective interests.
   * @param {import("../pod.mjs").Pod} _pod
   * @param {import("../attendee.mjs").Attendee[]} _members
   * @returns {Promise<string>}
   */
  async generateDiscussionPrompt(_pod, _members) {
    throw new Error("IAiFacilitatorService.generateDiscussionPrompt must be implemented by an infrastructure adapter.");
  }
}

