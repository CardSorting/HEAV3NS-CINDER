/** [LAYER: PLUMBING] */

/**
 * Pure session-type vocabulary shared by the domain (Session.isSocialSlot) and the agenda adapters.
 * Zero mutable module state.
 */

/** Session types where attendees are free to meet (used to confirm pod meetups). */
export const SOCIAL_SESSION_TYPES = Object.freeze(["break", "lunch", "networking", "registration", "arrival"]);

/** Session types with content worth recommending to attendees and pods. */
export const CONTENT_SESSION_TYPES = Object.freeze([
  "keynote", "talk", "workshop", "panel", "paper-session", "poster-session", "lightning", "stage-talk"
]);
