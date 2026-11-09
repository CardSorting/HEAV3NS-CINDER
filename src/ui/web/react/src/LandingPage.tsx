/** [LAYER: UI] */
import { useEffect, useState } from 'react';
import { ArrowDown, ArrowRight, ArrowUpRight, CalendarDays, Heart, MapPin, Menu, MessageCircle, Sparkles, UsersRound, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import editorialHero from '../../public/assets/cinder-editorial-hero.webp';
import podLounge from '../../public/assets/cinder-pod-lounge.webp';
import meetup from '../../public/assets/cinder-real-life-meetup.webp';

const navigation = [
  { label: 'How it works', href: '#how-it-works' },
  { label: 'Discover', href: '#discover-people' },
  { label: 'Pods', href: '#find-your-pod' },
  { label: 'AI facilitator', href: '#facilitator' },
  { label: 'For conferences', href: '#for-conferences' },
];

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    document.title = 'CINDER — Discover your people';
  }, []);

  const closeMenu = () => setMenuOpen(false);

  return <div className="marketing-site">
    <a className="marketing-skip" href="#marketing-main">Skip to content</a>
    <header className="marketing-header">
      <div className="marketing-header-inner">
        <Link className="marketing-brand" to="/" aria-label="CINDER home" onClick={closeMenu}>
          <span className="marketing-brand-mark" aria-hidden="true">✳</span><span>CINDER</span>
        </Link>
        <button className="marketing-menu-toggle" type="button" aria-expanded={menuOpen} aria-controls="marketing-navigation" aria-label={menuOpen ? 'Close navigation' : 'Open navigation'} onClick={() => setMenuOpen(open => !open)}>
          {menuOpen ? <X size={20}/> : <Menu size={20}/>}
        </button>
        <nav className={`marketing-navigation${menuOpen ? ' is-open' : ''}`} id="marketing-navigation" aria-label="Main navigation">
          {navigation.map(item => <a key={item.href} href={item.href} onClick={closeMenu}>{item.label}</a>)}
        </nav>
        <div className="marketing-account-actions">
          <Link className="marketing-login" to="/app">Log in</Link>
          <Link className="marketing-button marketing-button-primary marketing-header-cta" to="/app">Join the experience <ArrowUpRight size={16}/></Link>
        </div>
      </div>
    </header>

    <main id="marketing-main">
      <section className="marketing-hero" aria-labelledby="marketing-title">
        <div className="marketing-shell marketing-hero-grid">
          <div className="marketing-hero-copy">
            <p className="marketing-eyebrow"><span className="marketing-eyebrow-mark"/> SOCIAL INFRASTRUCTURE FOR CONFERENCES</p>
            <h1 id="marketing-title">The best part of a conference <em>is who you meet.</em></h1>
            <p className="marketing-hero-description">CINDER helps you discover the right people, find your Pod, and turn conference attendance into meaningful connections.</p>
            <div className="marketing-hero-actions">
              <Link className="marketing-button marketing-button-primary" to="/app">Join the experience <ArrowRight size={17}/></Link>
              <a className="marketing-button marketing-button-text" href="#how-it-works">See how it works <ArrowDown size={16}/></a>
            </div>
            <p className="marketing-hero-note"><Sparkles size={15}/> Less chance. More meaningful hellos.</p>
          </div>

          <div className="marketing-hero-art">
            <img className="marketing-hero-image" src={editorialHero} alt="Three conference attendees sharing a conversation over coffee" width="1376" height="768" fetchPriority="high" />
            <div className="marketing-photo-caption"><span>THE MOMENTS BETWEEN SESSIONS</span><span>CINDER <b>✳</b></span></div>
            <div className="marketing-hero-note-card">
              <span className="marketing-card-icon"><Heart size={17} fill="currentColor"/></span>
              <div><strong>Start with what brings you together.</strong><span>Interests, projects, and the people you hope to meet.</span></div>
            </div>
            <div className="marketing-hero-stamp" aria-hidden="true"><span>MEET</span><b>✳</b><span>YOUR PEOPLE</span></div>
          </div>
        </div>
        <div className="marketing-hero-bottom" aria-hidden="true"><span>01 — DISCOVER</span><span>02 — FIND YOUR POD</span><span>03 — MEET IN PERSON</span></div>
      </section>

      <section className="marketing-belief" aria-label="CINDER's purpose">
        <div className="marketing-shell marketing-belief-inner">
          <p>Built for the people who make conferences worth attending.</p>
          <span>DISCOVER <i>·</i> CONNECT <i>·</i> SHOW UP</span>
        </div>
      </section>

      <section className="marketing-section marketing-discover" id="discover-people" aria-labelledby="discover-title">
        <div className="marketing-shell marketing-split">
          <div className="marketing-section-copy">
            <p className="marketing-overline"><span>01</span> / DISCOVER YOUR PEOPLE</p>
            <h2 id="discover-title">Your next great connection is already in the room.</h2>
            <p>Find people through shared interests, complementary expertise, and the projects you’re working on. CINDER gives you a thoughtful reason to start the conversation.</p>
            <ul className="marketing-check-list">
              <li><span><Heart size={14}/></span>Recommendations that explain why you might connect</li>
              <li><span><UsersRound size={14}/></span>Mutual connections when you both want to meet</li>
            </ul>
            <Link className="marketing-inline-link" to="/app">Explore attendee discovery <ArrowRight size={16}/></Link>
          </div>
          <div className="marketing-discovery-card" aria-label="Illustration of CINDER attendee discovery">
            <div className="marketing-demo-topline"><span><i/> A LOOK AT DISCOVERY</span><span>CINDER</span></div>
            <div className="marketing-demo-profile">
              <div className="marketing-demo-avatar" aria-hidden="true">✳</div>
              <div><span className="marketing-demo-kicker">A MORE INTENTIONAL HELLO</span><h3>Meet beyond the badge.</h3><p>Discover people through what they care about and what they’re building.</p></div>
            </div>
            <div className="marketing-demo-reason"><span className="marketing-demo-spark"><Sparkles size={15}/></span><div><strong>Why you might connect</strong><span>Shared curiosity. Complementary strengths. A good place to begin.</span></div></div>
            <div className="marketing-demo-tags"><span>SHARED INTERESTS</span><span>COMPLEMENTARY EXPERTISE</span></div>
            <div className="marketing-demo-actions"><span><X size={17}/></span><span><Heart size={17}/></span></div>
            <p className="marketing-demo-caption">A clearer first hello, guided by your profile.</p>
          </div>
        </div>
      </section>

      <section className="marketing-section marketing-pods" id="find-your-pod" aria-labelledby="pods-title">
        <div className="marketing-shell marketing-split marketing-split-reverse">
          <div className="marketing-photo-panel marketing-pod-photo">
            <img src={podLounge} alt="A small group of conference attendees talking together in a lounge" width="1376" height="768" loading="lazy" />
            <div className="marketing-photo-label"><span className="marketing-photo-label-icon"><UsersRound size={16}/></span><span><b>YOUR POD</b><small>A smaller room for a better conversation</small></span><ArrowUpRight size={17}/></div>
          </div>
          <div className="marketing-section-copy">
            <p className="marketing-overline"><span>02</span> / FIND YOUR POD</p>
            <h2 id="pods-title">Better conversations don’t happen by accident.</h2>
            <p>CINDER brings compatible attendees into small groups where shared interests and different perspectives give everyone a place to start.</p>
            <div className="marketing-feature-pair">
              <div><span className="marketing-feature-number">A</span><strong>A group with a point of connection</strong><p>Pods are organized around common ground and complementary strengths.</p></div>
              <div><span className="marketing-feature-number">B</span><strong>A place to keep talking</strong><p>Meet your group, trade ideas, and coordinate what happens next.</p></div>
            </div>
            <Link className="marketing-inline-link" to="/app">See how Pods work <ArrowRight size={16}/></Link>
          </div>
        </div>
      </section>

      <section className="marketing-facilitator" id="facilitator" aria-labelledby="facilitator-title">
        <div className="marketing-shell marketing-facilitator-grid">
          <div className="marketing-facilitator-copy">
            <p className="marketing-overline"><span>03</span> / A LITTLE HELP, RIGHT ON TIME</p>
            <h2 id="facilitator-title">A facilitator that helps people show up for each other.</h2>
            <p>Inside your Pod, the AI facilitator can help with conversation prompts, conference context, and meetup coordination. It supports the group; the connection stays human.</p>
            <Link className="marketing-button marketing-button-light" to="/app">Explore the attendee experience <ArrowRight size={16}/></Link>
          </div>
          <div className="marketing-facilitator-preview" aria-label="Examples of ways an AI facilitator supports a Pod">
            <div className="marketing-facilitator-heading"><span className="marketing-facilitator-avatar"><Sparkles size={17}/></span><div><strong>FACILITATOR SUPPORT</strong><small>Examples of ways the AI can help</small></div><span className="marketing-online-dot" aria-hidden="true"/></div>
            <div className="marketing-facilitator-message"><span>HELP YOUR GROUP GET STARTED</span><p>Find a shared topic, check what’s coming up, or coordinate a time and place to meet.</p></div>
            <div className="marketing-facilitator-tools"><span><MessageCircle size={15}/> Conversation prompts</span><span><CalendarDays size={15}/> Agenda context</span><span><MapPin size={15}/> Meetup coordination</span></div>
            <p className="marketing-facilitator-foot">A useful nudge when you need one. A real conversation when you don’t.</p>
          </div>
        </div>
      </section>

      <section className="marketing-section marketing-meetup" aria-labelledby="meetup-title">
        <div className="marketing-shell marketing-split">
          <div className="marketing-section-copy">
            <p className="marketing-overline"><span>04</span> / FROM SCREEN TO REAL LIFE</p>
            <h2 id="meetup-title">Less scrolling. More meeting.</h2>
            <p>Pods give the conversation a home and make it easier to choose a time, find a place, and meet face to face. The point is what happens after the screen.</p>
            <Link className="marketing-inline-link" to="/app">Find your people <ArrowRight size={16}/></Link>
          </div>
          <div className="marketing-photo-panel marketing-meetup-photo">
            <img src={meetup} alt="Conference attendees meeting around an outdoor table" width="1376" height="768" loading="lazy" />
            <div className="marketing-meetup-note"><span><MapPin size={16}/></span><div><b>MAKE A PLAN TO MEET</b><small>Coordinate in your Pod, then be there.</small></div></div>
          </div>
        </div>
      </section>

      <section className="marketing-steps" id="how-it-works" aria-labelledby="how-title">
        <div className="marketing-shell">
          <div className="marketing-steps-heading"><div><p className="marketing-overline"><span>THE CINDER PATH</span></p><h2 id="how-title">Four steps from check-in to connection.</h2></div><p>A simple path through the conference, with your people in the middle of it.</p></div>
          <ol className="marketing-steps-list">
            <li><span className="marketing-step-index">01</span><div><h3>Check in</h3><p>Make a lightweight attendee profile and share what interests you.</p></div><ArrowRight size={19}/></li>
            <li><span className="marketing-step-index">02</span><div><h3>Discover</h3><p>Explore relevant attendees and choose who you’d like to meet.</p></div><ArrowRight size={19}/></li>
            <li><span className="marketing-step-index">03</span><div><h3>Join your Pod</h3><p>Meet a small group with shared interests and different strengths.</p></div><ArrowRight size={19}/></li>
            <li><span className="marketing-step-index">04</span><div><h3>Meet, participate, connect</h3><p>Coordinate with your Pod and make time for the people around you.</p></div><ArrowUpRight size={19}/></li>
          </ol>
        </div>
      </section>

      <section className="marketing-organizers" id="for-conferences" aria-labelledby="organizers-title">
        <div className="marketing-shell marketing-organizers-inner">
          <span className="marketing-organizers-mark" aria-hidden="true">✳</span>
          <div><p className="marketing-overline">FOR CONFERENCES</p><h2 id="organizers-title">Make more room for the people side of your event.</h2></div>
          <p>CINDER gives attendees a shared path to discover one another, find their group, and coordinate time together.</p>
        </div>
      </section>

      <section className="marketing-final-cta" aria-labelledby="final-title">
        <div className="marketing-shell marketing-final-inner">
          <p className="marketing-overline"><span>YOUR NEXT CONVERSATION IS OUT THERE</span></p>
          <h2 id="final-title">You came for the conference.<br/><em>Don’t miss the people.</em></h2>
          <p>Find your people, join your Pod, and make the most of being there.</p>
          <Link className="marketing-button marketing-button-primary" to="/app">Get started <ArrowRight size={17}/></Link>
        </div>
      </section>
    </main>

    <footer className="marketing-footer">
      <div className="marketing-shell">
        <div className="marketing-footer-main">
          <div className="marketing-footer-brand"><Link className="marketing-brand" to="/" aria-label="CINDER home"><span className="marketing-brand-mark" aria-hidden="true">✳</span><span>CINDER</span></Link><p>Discover your people.<br/>Find your Pod. Make something happen.</p><small>Made for the moments between sessions.</small></div>
          <div className="marketing-footer-column"><strong>EXPLORE</strong><a href="#how-it-works">How it works</a><a href="#discover-people">Discover</a><a href="#find-your-pod">Pods</a><a href="#facilitator">AI facilitator</a></div>
          <div className="marketing-footer-column"><strong>FOR CONFERENCES</strong><a href="#for-conferences">The attendee experience</a><a href="#meetup-title">Meet in person</a></div>
          <div className="marketing-footer-column"><strong>YOUR CINDER</strong><Link to="/app">Log in</Link><Link to="/app">Join the experience</Link></div>
        </div>
        <div className="marketing-footer-bottom"><span>© {new Date().getFullYear()} CINDER</span><span>CONNECTIONS WITH PURPOSE <b>✳</b></span></div>
      </div>
    </footer>
  </div>;
}
