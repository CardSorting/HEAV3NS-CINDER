/** [LAYER: UI] */
import type { Session } from './types';

export interface ScheduleSettings { date: string; timeZone: string }
const storageKey = 'cinder.schedule.v1';
export function validSettings(value: ScheduleSettings): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value.date)) return false;
  const date = new Date(`${value.date}T00:00:00Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value.date) return false;
  try { new Intl.DateTimeFormat('en', { timeZone: value.timeZone }).format(); return true; } catch { return false; }
}
export function readSchedule(): ScheduleSettings | null {
  try { const raw = localStorage.getItem(storageKey); if (!raw) return null; const parsed = JSON.parse(raw); return validSettings(parsed) ? parsed : null; } catch { return null; }
}
export function saveSchedule(value: ScheduleSettings | null): boolean {
  try { if (value) localStorage.setItem(storageKey, JSON.stringify(value)); else localStorage.removeItem(storageKey); return true; } catch { return false; }
}
export function schedulePosition(session: Session, settings: ScheduleSettings, now: Date): 'Live now' | 'Upcoming' | 'Ended' | null {
  if (!validSettings(settings) || !/^\d{2}:\d{2}$/.test(session.startTime) || !/^\d{2}:\d{2}$/.test(session.endTime) || session.endTime <= session.startTime) return null;
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: settings.timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(now);
  const get = (name: string) => parts.find(part => part.type === name)?.value || '';
  const today = `${get('year')}-${get('month')}-${get('day')}`;
  const time = `${get('hour')}:${get('minute')}`;
  if (today < settings.date || (today === settings.date && time < session.startTime)) return 'Upcoming';
  if (today > settings.date || time >= session.endTime) return 'Ended';
  return 'Live now';
}