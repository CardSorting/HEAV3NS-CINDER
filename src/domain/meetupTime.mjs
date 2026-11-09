/** [LAYER: DOMAIN] */

import { SOCIAL_SESSION_TYPES } from "../plumbing/sessionTypes.mjs";
import { formatLocalTime } from "../plumbing/clock.mjs";

/**
 * Pure Domain Logic: when should a proposed Pod meetup happen?
 * Zero I/O.
 */

/**
 * Resolves the time of a meetup proposal against the event agenda.
 * - An explicit time in the text ("at 12:30", "1pm", "12:45 PM") is placed on the day of the reference slot,
 *   in the event's UTC offset.
 * - Otherwise the meetup takes the current or next social slot (break, lunch, networking…).
 *
 * @param {Object} params
 * @param {string} [params.text] - the proposal message
 * @param {Array<{ title: string, sessionType: string|null, startDate: string|null, endDate: string|null, timezone?: string|null }>} params.sessions
 * @param {number} params.nowMs - from the plumbing clock
 * @param {string} [params.timezone] - event IANA timezone (falls back to the slot's)
 * @returns {{ startsAt: string, time: string, slot: Object|null, source: "message"|"agenda" } | null}
 *   null when the agenda has no remaining social slot and the message names no time
 */
export function resolveMeetupTime({ text = "", sessions, nowMs, timezone }) {
  const timed = sessions.filter((s) => s.startDate && s.endDate).sort((a, b) => Date.parse(a.startDate) - Date.parse(b.startDate));
  const social = timed.filter((s) => SOCIAL_SESSION_TYPES.includes(s.sessionType));
  // Current or next social slot: one that has not ended yet.
  const slot = social.find((s) => Date.parse(s.endDate) > nowMs) || null;
  const reference = slot || timed.find((s) => Date.parse(s.endDate) > nowMs) || timed[timed.length - 1] || null;
  const tz = timezone || reference?.timezone || "UTC";

  const explicit = parseClockTime(text);
  if (explicit && reference) {
    // Event days as "YYYY-MM-DD" + UTC offset, in order (from the agenda itself).
    const days = [];
    for (const s of timed) {
      const day = s.startDate.slice(0, 10);
      if (!days.some((d) => d.day === day)) days.push({ day, offset: s.startDate.slice(19) });
    }
    const at = ({ day, offset }) => `${day}T${pad(explicit.hours)}:${pad(explicit.minutes)}:00${offset}`;
    let i = Math.max(0, days.findIndex((d) => d.day === reference.startDate.slice(0, 10)));
    // "tomorrow", or a time already past today, means the next event day (when there is one).
    if (/\btomorrow\b/i.test(text) || Date.parse(at(days[i])) < nowMs) i = Math.min(i + 1, days.length - 1);
    const startsAt = at(days[i]);
    return { startsAt, time: displayTime(startsAt, nowMs, tz), slot: containing(social, startsAt), source: "message" };
  }
  if (!slot) return null;
  const startsAt = Date.parse(slot.startDate) >= nowMs ? slot.startDate : new Date(nowMs).toISOString();
  return { startsAt, time: displayTime(startsAt, nowMs, tz), slot, source: "agenda" };
}

/**
 * Finds a clock time in free text: "12:30", "12:30pm", "1 pm", "1pm". Bare numbers ("room 204", "2.04")
 * are ignored. Hours 1–7 without am/pm are read as afternoon (conference hours).
 * @returns {{ hours: number, minutes: number } | null}
 */
export function parseClockTime(text) {
  const m = /\b(\d{1,2})(?::(\d{2}))\s*(am|pm)?\b|\b(\d{1,2})\s*(am|pm)\b/i.exec(String(text));
  if (!m) return null;
  let hours = Number(m[1] ?? m[4]);
  const minutes = Number(m[2] ?? 0);
  const meridiem = (m[3] || m[5] || "").toLowerCase();
  if (hours > 23 || minutes > 59) return null;
  if (meridiem === "pm" && hours < 12) hours += 12;
  if (meridiem === "am" && hours === 12) hours = 0;
  if (!meridiem && hours >= 1 && hours <= 7) hours += 12;
  return { hours, minutes };
}

/** "12:15 PM" today; "Thu 10:20 AM" within the week; "Dec 23, 12:15 PM" further out (event timezone). */
function displayTime(iso, nowMs, tz) {
  const day = (ms) => new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(ms));
  const ms = Date.parse(iso);
  const time = formatLocalTime(iso, tz);
  if (day(ms) === day(nowMs)) return time;
  if (Math.abs(ms - nowMs) < 6 * 86400000) {
    return `${new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "short" }).format(new Date(ms))} ${time}`;
  }
  return `${new Intl.DateTimeFormat("en-US", { timeZone: tz, month: "short", day: "numeric" }).format(new Date(ms))}, ${time}`;
}

function containing(slots, iso) {
  const t = Date.parse(iso);
  return slots.find((s) => Date.parse(s.startDate) <= t && t < Date.parse(s.endDate)) || null;
}

function pad(n) {
  return String(n).padStart(2, "0");
}
