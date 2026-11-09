/** [LAYER: UI] */
import { useState } from 'react';
import { CalendarClock, X } from 'lucide-react';
import { validSettings } from './schedule';
import type { ScheduleSettings } from './schedule';

export function AgendaSettings({ settings, onSave }: { settings: ScheduleSettings | null; onSave: (value: ScheduleSettings | null) => boolean }) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(settings?.date || '');
  const [zone, setZone] = useState(settings?.timeZone || '');
  const [error, setError] = useState('');
  return <section className="schedule-settings" aria-label="Personal schedule settings">
    <div className="schedule-summary"><CalendarClock size={20}/><div><strong>{settings ? `Personal schedule: ${settings.date} · ${settings.timeZone}` : 'Add a date and time zone'}</strong><p>{settings ? 'These details are yours, not verified conference information.' : 'The organizer has not supplied these details. Add them if you know them.'}</p></div><button className="button button-outline compact" aria-expanded={open} onClick={() => setOpen(value => !value)}>{open ? 'Close' : settings ? 'Edit' : 'Add details'}</button></div>
    {open && <form className="schedule-form" onSubmit={event => { event.preventDefault(); const value = { date, timeZone: zone.trim() }; if (!validSettings(value)) { setError('Enter a valid date and IANA time zone, such as America/Los_Angeles.'); return; } if (!onSave(value)) { setError('Browser storage is unavailable. Your schedule could not be saved.'); return; } setError(''); setOpen(false); }}><p>These details are saved only in this browser and do not update the conference schedule for others.</p><div className="schedule-fields"><label>Conference date<input type="date" required value={date} onChange={event => setDate(event.target.value)}/></label><label>Conference time zone<input required value={zone} onChange={event => setZone(event.target.value)} placeholder="America/Los_Angeles"/><small>Use an IANA time zone, for example America/New_York.</small></label></div>{error && <p className="schedule-error" role="alert">{error}</p>}<div className="schedule-actions"><button className="button button-dark compact">Save details</button>{settings && <button type="button" className="button button-outline compact" onClick={() => { if (onSave(null)) { setDate(''); setOpen(false); setError(''); } else setError('Browser storage is unavailable.'); }}><X size={14}/> Remove</button>}</div></form>}
  </section>;
}