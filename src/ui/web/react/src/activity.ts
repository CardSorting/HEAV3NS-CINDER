/** [LAYER: UI] */
import { useCallback, useEffect, useState } from 'react';
import type { Activity } from './types';

const keyFor = (id: string) => `cinder.activity.v1.${id}`;
const isActivity = (value: unknown): value is Activity => {
  if (!value || typeof value !== 'object') return false;
  const item = value as Record<string, unknown>;
  return typeof item.id === 'string' && typeof item.text === 'string' && typeof item.timestamp === 'string'
    && !Number.isNaN(Date.parse(item.timestamp)) && ['home', 'discover', 'matches', 'pods', 'agenda', 'activity', 'profile'].includes(String(item.page));
};

function read(id: string): { items: Activity[]; available: boolean } {
  try {
    const value = localStorage.getItem(keyFor(id));
    if (!value) return { items: [], available: true };
    const parsed: unknown = JSON.parse(value);
    return { items: Array.isArray(parsed) ? parsed.filter(isActivity).slice(0, 100) : [], available: true };
  } catch { return { items: [], available: false }; }
}

export function useActivity(attendeeId: string) {
  const [state, setState] = useState(() => ({ owner: attendeeId, ...read(attendeeId) }));
  const current = state.owner === attendeeId ? state : { owner: attendeeId, ...read(attendeeId) };
  useEffect(() => { setState(previous => previous.owner === attendeeId ? previous : { owner: attendeeId, ...read(attendeeId) }); }, [attendeeId]);
  const update = useCallback((change: (items: Activity[]) => Activity[]) => {
    setState(previous => {
      const old = previous.owner === attendeeId ? previous : { owner: attendeeId, ...read(attendeeId) };
      const items = change(old.items).slice(0, 100);
      let available = old.available;
      try { localStorage.setItem(keyFor(attendeeId), JSON.stringify(items)); available = true; } catch { available = false; }
      return { owner: attendeeId, items, available };
    });
  }, [attendeeId]);
  return {
    items: current.items,
    available: current.available,
    unread: current.items.filter(item => !item.read).length,
    add: useCallback((item: Activity) => update(items => items.some(old => old.id === item.id) ? items : [item, ...items]), [update]),
    markRead: useCallback(() => update(items => items.map(item => ({ ...item, read: true }))), [update]),
    clear: useCallback(() => update(() => []), [update]),
  };
}