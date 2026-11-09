/** [LAYER: UI] */
import { useEffect, useState } from 'react';
import { ArrowRight, ArrowUpRight, CalendarDays, Check, Heart, MapPin, Sparkles, UsersRound, X } from 'lucide-react';
import { Avatar, Empty, SectionHeading, Tags } from './components';
import type { Activity, Agenda, Attendee, Candidate, Match, Message, Page, Pod } from './types';
import { AgendaSettings } from './AgendaSettings';
import { schedulePosition } from './schedule';
import type { ScheduleSettings } from './schedule';

type Go = (page: Page) => void;
export function HomeScreen({ attendee, candidates, matches, pods, agenda, activity, latestMessage, go }: { attendee: Attendee; candidates: Candidate[]; matches: Match[]; pods: Pod[]; agenda: Agenda; activity: Activity[]; latestMessage?: Message; go: Go }) {
  const pod = pods[0], session = agenda.sessions[0], candidate = candidates[0];
  const updates = activity.slice(-3).reverse();
  return <div className="home-workspace">
    <div className="home-welcome">
      <div><p className="overline">CLOUD &amp; AI SUMMIT 2026</p><h1>Welcome back, {attendee.name.split(' ')[0]}<span className="orange">.</span></h1><p className="page-subtitle">Here’s what’s happening in your conference space.</p></div>
      <span className="conference-label"><span className="status-dot"/> YOUR CONFERENCE</span>
    </div>

    <section className="home-agenda-feature" aria-labelledby="home-agenda-title">
      <div className="home-agenda-symbol"><CalendarDaysIcon/></div>
      <div className="home-agenda-copy"><span className="small-label">FROM YOUR AGENDA</span>{session ? <><h2 id="home-agenda-title">{session.title}</h2><p>{session.startTime}–{session.endTime} <span>·</span> {session.room}</p></> : <><h2 id="home-agenda-title">Make space for a good conversation.</h2><p>The conference agenda will appear here when it’s available.</p></>}</div>
      <button className="button button-dark home-agenda-action" onClick={() => go('agenda')}>View agenda <ArrowRight size={16}/></button>
    </section>

    <div className="home-grid home-utility-grid">
      <div className="home-main">
        <section className="home-focus-card" aria-labelledby="home-next-title">
          <div className="home-focus-heading"><SectionHeading title="A good next move"/><span className="home-focus-icon"><CompassIcon/></span></div>
          <div className="home-focus-content"><div><span className="small-label">{candidate ? 'A PERSON TO MEET' : 'KEEP EXPLORING'}</span><h2 id="home-next-title">{candidate ? `Meet ${candidate.profile.name.split(' ')[0]}` : 'See who else is here'}</h2><p>{candidate ? candidate.explanation.synergySummary : 'Browse attendee recommendations and find a useful place to start.'}</p></div><button className="button button-outline" onClick={() => go('discover')}>Discover people <ArrowRight size={16}/></button></div>
        </section>

        <div className="home-section-heading"><SectionHeading title="Your connections" action="View all" onAction={() => go('matches')}/><span className="home-count">{matches.length} {matches.length === 1 ? 'connection' : 'connections'}</span></div>
        <div className="people-preview">{matches.length ? matches.slice(0, 3).map(m => m.partner && <button className="person-row" key={m.match.id} onClick={() => go('matches')}><Avatar person={m.partner}/><span><strong>{m.partner.name}</strong><small>{m.partner.title} {m.partner.company && `· ${m.partner.company}`}</small></span><ArrowUpRight size={17}/></button>) : <div className="inline-empty"><span>No connections yet. They’ll appear here when interest is mutual.</span><button className="text-link" onClick={() => go('discover')}>Start discovering <ArrowRight size={15}/></button></div>}</div>

        <div className="home-section-heading home-updates-heading"><SectionHeading title="Latest updates" action="View activity" onAction={() => go('activity')}/></div>
        <div className="home-update-list">{updates.length ? updates.map(item => <button className="home-update" key={item.id} onClick={() => go(item.page)}><span className="home-update-mark"><Sparkles size={15}/></span><span><strong>{item.text}</strong><small>{new Date(item.timestamp).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</small></span><ArrowUpRight size={16}/></button>) : <div className="inline-empty">New matches, Pod activity, and facilitator updates will appear here.</div>}</div>
      </div>

      <aside className="home-aside home-utility-aside">
        <div className="home-section-heading"><SectionHeading title="Your Pod" action="Open" onAction={() => go('pods')}/></div>
        <section className="side-surface home-pod-card">
          <div className="pod-symbol"><MessagesIcon/></div><span className="small-label">{pod ? `${pod.memberIds.length} MEMBERS` : 'YOUR SMALL-GROUP SPACE'}</span>
          <h2>{pod ? pod.name : 'A space to connect'}</h2>
          <p>{pod ? pod.topic : 'Your Pod brings a small group together around shared interests and ideas.'}</p>
          {pod?.pinnedMeetup && <div className="home-pinned-meetup"><MapPin size={15}/><span><strong>{pod.pinnedMeetup.location}</strong><small>{pod.pinnedMeetup.time}</small></span></div>}
          {latestMessage && <div className={`home-last-message${latestMessage.senderType === 'facilitator' ? ' is-facilitator' : ''}`}><span>{latestMessage.senderType === 'facilitator' ? 'FACILITATOR' : latestMessage.senderName}</span><p>{latestMessage.content}</p></div>}
          <button className="text-link" onClick={() => go('pods')}>{pod ? 'Open your Pod' : 'Explore Pods'} <ArrowRight size={15}/></button>
        </section>
        <div className="home-quick-links"><button onClick={() => go('matches')}><span><Heart size={16}/></span><b>Matches</b><small>{matches.length}</small><ArrowUpRight size={16}/></button><button onClick={() => go('agenda')}><span><CalendarDaysIcon/></span><b>Agenda</b><small>{agenda.sessions.length} sessions</small><ArrowUpRight size={16}/></button></div>
      </aside>
    </div>
  </div>;
}
function CompassIcon() { return <Sparkles size={22}/>; }
function CalendarDaysIcon() { return <CalendarDays size={20}/>; }
function MessagesIcon() { return <span className="pod-hash">#</span>; }

export function DiscoverScreen({ candidates, busy, swipe, reset }: { candidates: Candidate[]; busy: boolean; swipe: (action: 'like' | 'pass') => void; reset: () => void }) {
  const [startX, setStartX] = useState<number | null>(null); const candidate = candidates[0];
  return <div className="narrow-page"><div className="page-top"><div><p className="overline">MAKE A MEANINGFUL CONNECTION</p><h1>Meet someone new<span className="orange">.</span></h1><p className="page-subtitle">Thoughtful introductions, picked for you.</p></div><span className="count-pill">{candidates.length} {candidates.length === 1 ? 'person' : 'people'} to explore</span></div>
    {candidate ? <div className="discovery-layout"><article className="discovery-card" onPointerDown={e => { if ((e.target as HTMLElement).closest('button')) return; setStartX(e.clientX); }} onPointerUp={e => { if (startX !== null && Math.abs(e.clientX - startX) > 100 && !busy) swipe(e.clientX > startX ? 'like' : 'pass'); setStartX(null); }} onPointerCancel={() => setStartX(null)}><div className="candidate-top"><Avatar person={candidate.profile} size="large"/><div><span className="match-label"><Sparkles size={13}/> RECOMMENDED FOR YOU</span><h2>{candidate.profile.name}</h2><p>{candidate.profile.title}{candidate.profile.company && ` · ${candidate.profile.company}`}</p></div></div><div className="why-box"><span className="small-label">WHY YOU MIGHT CONNECT</span><h3>{candidate.explanation.headline}</h3><p>{candidate.explanation.synergySummary}</p></div><div className="profile-detail"><span className="small-label">INTERESTS</span><Tags items={candidate.profile.interests}/></div>{candidate.profile.projects && <div className="profile-detail"><span className="small-label">WORKING ON</span><p>{candidate.profile.projects}</p></div>}{candidate.profile.looking_for && <div className="profile-detail"><span className="small-label">HOPING TO MEET</span><p>{candidate.profile.looking_for}</p></div>}<div className="swipe-actions"><button disabled={busy} className="button button-outline" onClick={() => swipe('pass')}><X size={18}/> Pass</button><button disabled={busy} className="button button-dark" onClick={() => swipe('like')}><Heart size={18}/> Connect</button></div><p className="swipe-hint">Swipe or use the buttons to choose. A connection happens when you both say yes.</p></article><aside className="discovery-aside"><span className="small-label">A MORE INTENTIONAL HELLO</span><h3>Better conversations start here.</h3><p>Recommendations are based on your interests, projects, and what you’re looking for.</p><div className="aside-divider"/><p>Connecting is an invitation, not a commitment. We’ll let you know when interest is mutual.</p></aside></div> : <Empty title="You’re all caught up" action="Review passed profiles" onAction={reset}>You’ve seen everyone in your current recommendations. You can revisit people you passed on.</Empty>}
  </div>;
}

export function MatchesScreen({ matches, attendee, send, go }: { matches: Match[]; attendee: Attendee; send: (id: string, content: string) => Promise<boolean>; go: Go }) {
  const [selected, setSelected] = useState<string | null>(null); const [text, setText] = useState(''); const [sending, setSending] = useState(false); const chosen = matches.find(m => m.match.id === selected) || matches[0];
  const submit = async (e: React.FormEvent) => { e.preventDefault(); if (!chosen || !text.trim()) return; setSending(true); if (await send(chosen.match.id, text.trim())) setText(''); setSending(false); };
  return <div><div className="page-top"><div><p className="overline">THE START OF SOMETHING GOOD</p><h1>Your connections<span className="orange">.</span></h1><p className="page-subtitle">The people who said yes to meeting you, too.</p></div><span className="count-pill">{matches.length} {matches.length === 1 ? 'connection' : 'connections'}</span></div>{!matches.length ? <Empty title="A good conversation is ahead" action="Discover people" onAction={() => go('discover')}>When you and another attendee both connect, they’ll appear here.</Empty> : <div className="connections-layout"><div className="connection-list">{matches.map(m => m.partner && <button key={m.match.id} className={`connection-item ${chosen?.match.id === m.match.id ? 'selected' : ''}`} onClick={() => setSelected(m.match.id)}><Avatar person={m.partner}/><span><strong>{m.partner.name}</strong><small>{m.partner.title}</small></span><ArrowRight size={16}/></button>)}</div>{chosen?.partner && <div className="conversation"><div className="conversation-header"><Avatar person={chosen.partner}/><div><h2>{chosen.partner.name}</h2><p>{chosen.partner.title} · {chosen.partner.company}</p></div></div>{chosen.match.explanation && <div className="connection-why"><Sparkles size={16}/><span>{chosen.match.explanation}</span></div>}{chosen.sharedPodName && <button className="text-link shared-pod" onClick={() => go('pods')}>Shared Pod: {chosen.sharedPodName} <ArrowRight size={15}/></button>}<div className="dm-messages">{chosen.messages.length ? chosen.messages.map(m => <div className={`dm-bubble ${m.senderId === attendee.id ? 'mine' : ''}`} key={m.id}><strong>{m.senderName}</strong><p>{m.content}</p></div>) : <p className="quiet-center">Say hello and start a conversation.</p>}</div><form className="composer" onSubmit={submit}><label className="sr-only" htmlFor="direct-message">Message {chosen.partner.name}</label><input id="direct-message" value={text} onChange={e => setText(e.target.value)} placeholder="Write a message…"/><button className="button button-dark" disabled={sending || !text.trim()}>{sending ? 'Sending…' : 'Send'} <ArrowRight size={16}/></button></form></div>}</div>}</div>;
}

export function AgendaScreen({ agenda, go, settings, saveSettings }: { agenda: Agenda; go: Go; settings: ScheduleSettings | null; saveSettings: (value: ScheduleSettings | null) => boolean }) { const [track, setTrack] = useState('All'); const [now, setNow] = useState(() => new Date()); const tracks = ['All', ...new Set(agenda.sessions.map(s => s.track))]; const sessions = agenda.sessions.filter(s => track === 'All' || s.track === track);
  useEffect(() => { const timer = window.setInterval(() => setNow(new Date()), 30000); return () => window.clearInterval(timer); }, []);
  return <div><div className="page-top"><div><p className="overline">CLOUD &amp; AI SUMMIT 2026</p><h1>Make time for ideas<span className="orange">.</span></h1><p className="page-subtitle">Your conference schedule, all in one place.</p></div></div><AgendaSettings settings={settings} onSave={saveSettings}/><div className="filter-row" aria-label="Filter agenda by track">{tracks.map(t => <button key={t} className={track === t ? 'filter active' : 'filter'} aria-pressed={track === t} onClick={() => setTrack(t)}>{t}</button>)}</div><p className="agenda-note">{settings ? `Times and status use your saved date and ${settings.timeZone}; confirm with the organizer.` : 'Conference date and time zone are not provided. Times are shown as listed.'}</p><div className="agenda-list">{sessions.map(s => <article className="session" key={s.id}><div className="session-time"><strong>{s.startTime}</strong><span>{s.endTime}</span></div><div className="session-marker"/><div className="session-content"><span className="track-label">{s.track}</span>{settings && schedulePosition(s, settings, now) && <span className="session-status">{schedulePosition(s, settings, now)}</span>}<h2>{s.title}</h2><p>{s.description}</p><div className="session-meta"><span><MapPin size={15}/>{s.room}</span><span><UsersRoundIcon/>{s.speakers.join(', ')}</span></div>{s.track === 'Social Coordination' && <button className="text-link" onClick={() => go('pods')}>Go to your Pod <ArrowRight size={15}/></button>}</div></article>)}</div></div>;
}
function UsersRoundIcon() { return <UsersRound size={15}/>; }

export function ActivityScreen({ activity, go, clear, available }: { activity: Activity[]; go: Go; clear: () => void; available: boolean }) { return <div><div className="page-top"><div><p className="overline">STAY IN THE LOOP</p><h1>Activity<span className="orange">.</span></h1><p className="page-subtitle">Updates while you’re here.</p></div>{activity.length > 0 && <button className="text-link" onClick={clear}>Clear activity <Check size={15}/></button>}</div><p className="agenda-note">{available ? 'Saved on this browser for this attendee. Updates missed while offline or on another device are not included.' : 'Browser storage is unavailable. Updates will disappear when you leave this page.'}</p>{activity.length ? <div className="activity-list">{activity.map(item => <button className="activity-item" key={item.id} onClick={() => go(item.page)}><span className="activity-icon"><Sparkles size={18}/></span><span><strong>{item.text}</strong><small>{new Date(item.timestamp).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</small></span><ArrowRight size={16}/></button>)}</div> : <Empty title="Nothing new right now">Your live updates will appear here as they happen.</Empty>}</div>; }
