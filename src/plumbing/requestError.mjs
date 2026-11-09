/** [LAYER: PLUMBING] */

/**
 * Builds an Error that carries an HTTP-style status and a stable code, so use cases can reject a request
 * (bad input, unknown resource, not allowed) and the web layer can answer with the right status.
 * Pure; zero mutable module state.
 * @param {string} code - e.g. "EVENT_NOT_FOUND"
 * @param {number} status - e.g. 404
 * @param {string} message
 * @returns {Error & { code: string, status: number }}
 */
export function requestError(code, status, message) {
  const err = new Error(message);
  err.code = code;
  err.status = status;
  return err;
}
