/** [LAYER: PLUMBING] */

/**
 * Pure clock factory: one source of "now" for all time-dependent logic.
 *
 * - Real mode: returns the system time.
 * - Demo mode: starts at a configured demo time and advances in real time from the moment the clock
 *   is created (so countdowns work during a live demo). `frozen` stops it advancing (tests).
 *
 * Zero mutable module state; the system time source is injectable.
 */

/**
 * @typedef {Object} Clock
 * @property {() => number} nowMs        Current time in epoch milliseconds.
 * @property {() => Date} now            Current time as a Date.
 * @property {() => string} toISOString  Current time as ISO-8601 UTC.
 * @property {boolean} isDemo            True when running on a configured demo time.
 * @property {boolean} frozen            True when the demo time does not advance.
 */

/**
 * @param {Object} [options]
 * @param {string|number|Date|null} [options.demoTime]  Demo start time; null/empty = real time.
 * @param {boolean} [options.frozen=false]             Demo time does not advance.
 * @param {() => number} [options.systemNow=Date.now]   Injectable system time source.
 * @returns {Readonly<Clock>}
 */
export function createClock({ demoTime = null, frozen = false, systemNow = Date.now } = {}) {
  const demoMs = parseTime(demoTime);
  if (demoMs === null) {
    return Object.freeze({
      nowMs: () => systemNow(),
      now: () => new Date(systemNow()),
      toISOString: () => new Date(systemNow()).toISOString(),
      isDemo: false,
      frozen: false
    });
  }
  const anchor = systemNow();
  const nowMs = frozen ? () => demoMs : () => demoMs + (systemNow() - anchor);
  return Object.freeze({
    nowMs,
    now: () => new Date(nowMs()),
    toISOString: () => new Date(nowMs()).toISOString(),
    isDemo: true,
    frozen: Boolean(frozen)
  });
}

/**
 * Builds a clock from environment variables:
 * `CINDER_DEMO_TIME` (ISO-8601 with offset, e.g. `2026-11-10T11:55:00-06:00`) and
 * `CINDER_DEMO_FROZEN` (`true`/`1` to stop the demo time advancing).
 * @param {Record<string, string|undefined>} env
 * @param {() => number} [systemNow]
 */
export function clockFromEnv(env = {}, systemNow = Date.now) {
  const frozen = /^(1|true|yes)$/i.test(String(env.CINDER_DEMO_FROZEN || ""));
  return createClock({ demoTime: env.CINDER_DEMO_TIME || null, frozen, systemNow });
}

/**
 * Minutes from `clock` now until `target` (negative if in the past).
 * @param {Clock} clock
 * @param {string|number|Date} target
 */
export function minutesUntil(clock, target) {
  const t = parseTime(target);
  if (t === null) throw new Error(`minutesUntil: invalid time ${target}`);
  return (t - clock.nowMs()) / 60000;
}

/**
 * Formats an instant as local wall-clock time in an IANA timezone, e.g. "12:15 PM".
 * @param {string|number|Date} time
 * @param {string} [timeZone="UTC"]
 * @param {string} [locale="en-US"]
 */
export function formatLocalTime(time, timeZone = "UTC", locale = "en-US") {
  const t = parseTime(time);
  if (t === null) throw new Error(`formatLocalTime: invalid time ${time}`);
  return new Intl.DateTimeFormat(locale, { hour: "numeric", minute: "2-digit", timeZone }).format(new Date(t));
}

/** @returns {number|null} epoch ms, or null for empty input */
function parseTime(value) {
  if (value === null || value === undefined || value === "") return null;
  const ms = value instanceof Date ? value.getTime() : typeof value === "number" ? value : Date.parse(value);
  if (Number.isNaN(ms)) throw new Error(`Invalid time: ${value}`);
  return ms;
}
