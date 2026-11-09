/** [LAYER: UI] */
import { ArrowRight, Flame, Home, Compass, UsersRound, MessagesSquare, CalendarDays, Bell, UserRound } from 'lucide-react';
import type { Attendee, Page } from './types';

export const navigation: { id: Page; label: string; icon: typeof Home }[] = [
  { id: 'home', label: 'Home', icon: Home }, { id: 'discover', label: 'Discover', icon: Compass },
  { id: 'matches', label: 'Matches', icon: UsersRound }, { id: 'pods', label: 'Pods', icon: MessagesSquare },
  { id: 'agenda', label: 'Agenda', icon: CalendarDays }, { id: 'activity', label: 'Activity', icon: Bell },
  { id: 'profile', label: 'Profile', icon: UserRound },
];
export function Logo() { return <span className="logo"><span className="logo-mark"><Flame size={20} strokeWidth={2.4}/></span><span>CINDER<span className="logo-dot">.</span></span></span>; }
export function Avatar({ person, size = 'normal' }: { person: Pick<Attendee, 'name' | 'avatar'>; size?: 'small' | 'normal' | 'large' }) {
  return <span className={`avatar avatar-${size}`}><img src={person.avatar} alt="" onError={e => { e.currentTarget.style.display = 'none'; }} /><span>{person.name.split(' ').map(s => s[0]).slice(0, 2).join('')}</span></span>;
}
export function Nav({ page, go, mobile = false }: { page: Page; go: (page: Page) => void; mobile?: boolean }) {
  return <nav className={mobile ? 'mobile-nav' : 'side-nav'} aria-label={mobile ? 'Mobile navigation' : 'Main navigation'}>{navigation.filter(n => !mobile || !['activity', 'profile'].includes(n.id)).map(({ id, label, icon: Icon }) => <button type="button" key={id} onClick={() => go(id)} className={page === id ? 'nav-item active' : 'nav-item'} aria-current={page === id ? 'page' : undefined}><Icon size={19}/><span>{label}</span></button>)}</nav>;
}
export function Empty({ title, children, action, onAction }: { title: string; children: React.ReactNode; action?: string; onAction?: () => void }) { return <div className="empty"><div className="empty-icon"><Flame size={23}/></div><h3>{title}</h3><p>{children}</p>{action && <button className="button button-dark" onClick={onAction}>{action}<ArrowRight size={16}/></button>}</div>; }
export function SectionHeading({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) { return <div className="section-heading"><h2>{title}</h2>{action && <button className="text-link" onClick={onAction}>{action}<ArrowRight size={15}/></button>}</div>; }
export function Tags({ items }: { items: string[] }) { return <div className="tags">{items.map(x => <span className="tag" key={x}>{x}</span>)}</div>; }