/** [LAYER: PLUMBING] */

/**
 * Pure stateless ID generators for attendees, pods, and messages.
 * Zero mutable module state.
 */

/**
 * Generates a unique prefixed identifier.
 * @param {string} prefix
 * @returns {string}
 */
export function generatePrefixedId(prefix = "id") {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${timestamp}_${randomPart}`;
}

/**
 * Generates a clean Pod name.
 * @param {number} number
 * @param {string} theme
 * @returns {string}
 */
export function formatPodName(number, theme = "Autonomous Cloud & Systems") {
  const padded = String(number).padStart(2, "0");
  return `Pod ${padded}: ${theme}`;
}
