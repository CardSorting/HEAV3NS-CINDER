#!/usr/bin/env python3
# [LAYER: INFRASTRUCTURE]
"""Generate CINDER data for every conference / academic / meetup / expo event in `eventapp`.

  python3 elasticsearch/cinder/generate.py setup              # pipelines + create missing indices (non-destructive)
  python3 elasticsearch/cinder/generate.py build [--dry-run]  # generate, embed, bulk-load reference data
  python3 elasticsearch/cinder/generate.py reset              # delete synthetic docs from reference indices

Reference indices (seeded here): cinder-people, cinder-registrations, cinder-sessions, cinder-spaces,
cinder-announcements, cinder-prompts. Runtime indices (created empty, written by the app):
cinder-pods, cinder-interactions, cinder-messages.

Output is deterministic: every random choice is seeded from the event @id.
"""
import concurrent.futures as cf
import datetime as dt
import hashlib
import json
import os
import random
import sys
from collections import defaultdict
from zoneinfo import ZoneInfo

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.dirname(HERE))
from setup import es  # noqa: E402  (elasticsearch/setup.py: auth + error reporting)
import catalog as C  # noqa: E402

EVENT_INDEX = "eventapp"
EVENT_CATEGORIES = ["conference", "academic", "meetup", "expo"]
EMBED_MODEL = ".jina-embeddings-v5-text-small"
REFERENCE = ["cinder-people", "cinder-registrations", "cinder-sessions", "cinder-spaces", "cinder-announcements", "cinder-prompts"]
RUNTIME = ["cinder-pods", "cinder-interactions", "cinder-messages"]
NOW = dt.datetime(2026, 11, 9, tzinfo=dt.timezone.utc)


# ---------------------------------------------------------------- helpers
def rng_for(*parts):
    return random.Random(int(hashlib.sha256("|".join(map(str, parts)).encode()).hexdigest()[:16], 16))


def short_hash(*parts, n=8):
    return hashlib.sha1("|".join(map(str, parts)).encode()).hexdigest()[:n]


def slug(text):
    out, dash = [], False
    for ch in text.lower():
        if ch.isascii() and ch.isalnum():
            out.append(ch); dash = False
        elif not dash and out:
            out.append("-"); dash = True
    return "".join(out).strip("-")


def parse(s):
    return dt.datetime.fromisoformat(s.replace("Z", "+00:00"))


def iso(d):
    return d.isoformat(timespec="seconds")


def at(day, hhmm, tz):
    h, m = map(int, hhmm.split(":"))
    return dt.datetime(day.year, day.month, day.day, h, m, tzinfo=tz)


def weighted(r, weights):
    keys = sorted(weights)
    return r.choices(keys, weights=[weights[k] for k in keys])[0]


def registration_text(d):
    """Must stay in sync with the painless in cinder-embed-registration (runtime check-ins)."""
    parts = []
    if d.get("title"):
        parts.append(d["title"] + (" at " + d["company"] if d.get("company") else "") + ".")
    if d.get("bio"): parts.append(d["bio"])
    if d.get("interests"): parts.append("Interests: " + ", ".join(d["interests"]) + ".")
    if d.get("expertise"): parts.append("Expertise: " + ", ".join(d["expertise"]) + ".")
    if d.get("projects"): parts.append("Working on: " + d["projects"])
    if d.get("challenges"): parts.append("Challenge: " + d["challenges"])
    if d.get("looking_for"): parts.append("Looking for: " + d["looking_for"])
    if d.get("topics"): parts.append("Topics: " + ", ".join(d["topics"]) + ".")
    return " ".join(parts)


def session_text(d):
    """Must stay in sync with cinder-embed-session."""
    parts = [d["title"] + "."]
    if d.get("abstract"): parts.append(d["abstract"])
    if d.get("track"): parts.append("Track: " + d["track"] + ".")
    if d.get("tags"): parts.append("Tags: " + ", ".join(d["tags"]) + ".")
    return " ".join(parts)


# ---------------------------------------------------------------- ingest pipelines (runtime embedding)
INFER = lambda: {"inference": {"model_id": EMBED_MODEL, "input_output": [{"input_field": "searchText", "output_field": "embedding"}],
                               "if": "ctx.embedding == null && ctx.searchText != null"}}
# The inference processor also writes a top-level `model_id`; the cinder-* mappings are strict, so drop it.
DROP_MODEL_ID = lambda: {"remove": {"field": "model_id", "ignore_missing": True}}
PIPELINES = {
    "cinder-embed-registration": {
        "description": "Build searchText for an attendee registration (if absent) and embed it with " + EMBED_MODEL,
        "processors": [{"script": {"lang": "painless", "source": """
if (ctx.searchText == null) {
  List p = new ArrayList();
  if (ctx.title != null) p.add(ctx.title + (ctx.company != null ? ' at ' + ctx.company : '') + '.');
  if (ctx.bio != null) p.add(ctx.bio);
  if (ctx.interests != null && !ctx.interests.isEmpty()) p.add('Interests: ' + String.join(', ', ctx.interests) + '.');
  if (ctx.expertise != null && !ctx.expertise.isEmpty()) p.add('Expertise: ' + String.join(', ', ctx.expertise) + '.');
  if (ctx.projects != null) p.add('Working on: ' + ctx.projects);
  if (ctx.challenges != null) p.add('Challenge: ' + ctx.challenges);
  if (ctx.looking_for != null) p.add('Looking for: ' + ctx.looking_for);
  if (ctx.topics != null && !ctx.topics.isEmpty()) p.add('Topics: ' + String.join(', ', ctx.topics) + '.');
  ctx.searchText = String.join(' ', p);
}"""}}, INFER(), DROP_MODEL_ID()],
    },
    "cinder-embed-session": {
        "description": "Build searchText for a session (if absent) and embed it with " + EMBED_MODEL,
        "processors": [{"script": {"lang": "painless", "source": """
if (ctx.searchText == null) {
  List p = new ArrayList(); p.add(ctx.title + '.');
  if (ctx.abstract != null) p.add(ctx.abstract);
  if (ctx.track != null) p.add('Track: ' + ctx.track + '.');
  if (ctx.tags != null && !ctx.tags.isEmpty()) p.add('Tags: ' + String.join(', ', ctx.tags) + '.');
  ctx.searchText = String.join(' ', p);
}"""}}, INFER(), DROP_MODEL_ID()],
    },
    "cinder-embed-prompt": {
        "description": "Embed a discussion prompt with " + EMBED_MODEL,
        "processors": [{"set": {"field": "searchText", "copy_from": "text", "override": False}}, INFER(), DROP_MODEL_ID()],
    },
}


# ---------------------------------------------------------------- people
class People:
    def __init__(self):
        self.by_id = {}
        self.pool = defaultdict(list)          # (city, discipline) -> [person ids]
        self.names = set()

    def _name(self, r):
        for _ in range(50):
            n = f"{r.choice(C.FIRST_NAMES)} {r.choice(C.LAST_NAMES)}"
            if n not in self.names:
                return n
        return f"{r.choice(C.FIRST_NAMES)} {r.choice(C.LAST_NAMES)}-{r.choice(C.LAST_NAMES)}"

    def create(self, r, disc, city, country, name=None, title=None, company=None, created=None):
        D = C.DISCIPLINES[disc]
        name = name or self._name(r)
        if title is None:
            idx = min(int(r.random() ** 1.6 * len(D["titles"])), len(D["titles"]) - 1)
            title = D["titles"][idx]
        idx = D["titles"].index(title) if title in D["titles"] else 1
        seniority = ["junior", "mid", "senior", "lead", "executive"][min(idx + (1 if len(D["titles"]) <= 4 else 0), 4)]
        company = company or (r.choice(C.UNIVERSITIES) if disc == "ml-research" else r.choice(C.COMPANIES))
        pid = f"per_{slug(name)}_{short_hash(name, company, n=8)}"
        if pid in self.by_id:
            return self.by_id[pid]
        p = {
            "id": pid, "name": name, "title": title, "company": company,
            "avatar": f"https://api.dicebear.com/7.x/notionists/svg?seed={pid}",
            "bio": f"{title} at {company}. {r.choice(D['bios'])}",
            "discipline": disc, "seniority": seniority, "yearsExperience": r.randint(2, 6) + idx * r.randint(2, 5),
            "homeCity": city, "homeCountry": country,
            "interests": r.sample(D["interests"], min(len(D["interests"]), r.randint(4, 6))),
            "expertise": r.sample(D["expertise"], min(len(D["expertise"]), r.randint(3, 5))),
            "createdAt": iso(created or NOW - dt.timedelta(days=r.randint(30, 600))), "synthetic": True,
        }
        self.by_id[pid] = p
        self.names.add(name)
        self.pool[(city, disc)].append(pid)
        return p

    def pick(self, r, disc, city, country, exclude, reuse_p):
        cands = [pid for pid in self.pool[(city, disc)] if pid not in exclude]
        if cands and r.random() < reuse_p:
            return self.by_id[r.choice(cands)]
        return self.create(r, disc, city, country)


# ---------------------------------------------------------------- event model helpers
def event_topics(ev):
    labels = [l for l in ev.get("labels", []) if l in C.TOPIC_DISCIPLINES]
    if ev["category"] == "academic" and "research" not in labels:
        labels.append("research")
    return labels or ["devops"]


def topic_terms(topics):
    terms = []
    for t in topics:
        terms += C.TOPICS.get(t, {}).get("terms", [])
    return terms or C.TOPICS["devops"]["terms"]


def primary_topic(topics):
    return next((t for t in topics if t in C.TOPICS), "devops")


def discipline_weights(topics, category):
    w = defaultdict(float)
    for t in topics:
        for d, x in C.TOPIC_DISCIPLINES[t].items():
            w[d] += x
    if category == "expo":
        w["b2b"] += 4
    w["eng-leadership"] += 0.5
    w["devrel"] += 0.3
    return dict(w)


def discipline_from_title(title, fallback):
    for word, disc in C.TITLE_DISCIPLINE:
        if word in title:
            return disc
    return fallback


def venue_of(ev):
    phys = next((l for l in ev.get("location", []) if l.get("@type") != "VirtualLocation"), None)
    return phys


# ---------------------------------------------------------------- spaces
def build_spaces(ev, phys):
    if phys is None:  # online-only: per-event virtual spaces
        style, venue_id, venue_name, ev_id, cap = "virtual", None, "Online", ev["@id"], 5000
    else:
        style = C.STYLE_BY_PLACE_TYPE.get(phys["@type"], "room")
        venue_id, venue_name, ev_id, cap = phys["@id"], phys["name"], None, phys.get("maximumAttendeeCapacity", 500)
    out = {}
    owner = venue_id or ev_id
    for key, name, kind, floor, capacity, tags, aliases, meetup in C.SPACES[style]:
        sid = f"space:{owner.split(':')[-1]}:{key}"
        out[key] = {"id": sid, "venueId": venue_id, "venueName": venue_name, "eventId": ev_id, "name": name,
                    "aliases": aliases, "kind": kind, "floor": floor,
                    "capacity": min(capacity, cap) if capacity else cap, "tags": tags, "meetupFriendly": meetup, "synthetic": True}
    return style, out


# ---------------------------------------------------------------- sessions
class Agenda:
    def __init__(self, ev, spaces, tz):
        self.ev, self.spaces, self.tz, self.items = ev, spaces, tz, []

    def free_space(self, keys, start, mins):
        """First space key in `keys` with no session overlapping [start, start+mins)."""
        s0, s1 = iso(start), iso(start + dt.timedelta(minutes=mins))
        for k in keys:
            sid = self.spaces.get(k, {}).get("id")
            if sid and not any(x["spaceId"] == sid and x["startDate"] < s1 and x["endDate"] > s0 for x in self.items):
                return k
        return keys[0]

    def add(self, r, day_idx, start, mins, title, stype, space_key, track=None, abstract=None, speakers=(), tags=(), level=None, source=None):
        sp = self.spaces.get(space_key) or next(iter(self.spaces.values()))
        s = {
            "id": f"ses_{short_hash(self.ev['@id'], day_idx, iso(start), title, sp['id'], track, n=12)}", "eventId": self.ev["@id"],
            "title": title, "abstract": abstract, "sessionType": stype, "track": track, "level": level,
            "tags": list(tags), "day": day_idx + 1, "startDate": iso(start), "endDate": iso(start + dt.timedelta(minutes=mins)),
            "timezone": self.ev["timezone"], "spaceId": sp["id"], "roomName": sp["name"],
            "speakerIds": [p["regId"] for p in speakers], "speakerNames": [p["name"] for p in speakers],
            "capacity": sp["capacity"], "streamed": self.ev["eventAttendanceMode"] != "OfflineEventAttendanceMode" and sp["kind"] in ("auditorium", "virtual-stage", "breakout"),
            "synthetic": True,
        }
        if source:
            s["sourceSubEventId"] = source
        s = {k: v for k, v in s.items() if v is not None}
        self.items.append(s)
        return s


def talk_title(r, terms, company):
    T, T2 = r.sample(terms, 2)
    return T, T2, r.choice(C.TALK_TITLES).format(T=T, T2=T2, n=r.randint(2, 8), company=company)


# ---------------------------------------------------------------- per-event build
class EventBuild:
    def __init__(self, ev, people):
        self.ev, self.people = ev, people
        self.r = rng_for(ev["@id"])
        self.tz = ZoneInfo(ev["timezone"])
        self.start, self.end = parse(ev["startDate"]).astimezone(self.tz), parse(ev["endDate"]).astimezone(self.tz)
        self.days = [self.start.date() + dt.timedelta(days=i) for i in range((self.end.date() - self.start.date()).days + 1)]
        self.topics = event_topics(ev)
        self.topic_terms = {tp: C.TOPICS[tp]["terms"] for tp in self.topics if tp in C.TOPICS} or {"devops": C.TOPICS["devops"]["terms"]}
        self.ptopic = primary_topic(self.topics)
        self.label = C.TOPICS[self.ptopic]["label"]
        self.weights = discipline_weights(self.topics, ev["category"])
        phys = venue_of(ev)
        self.city = phys["address"]["addressLocality"] if phys else None
        self.country = phys["address"]["addressCountry"] if phys else None
        self.style, self.spaces = build_spaces(ev, phys)
        self.agenda = Agenda(ev, self.spaces, self.tz)
        self.regs = {}                  # personId -> registration
        self.announcements = []

    def tt(self):
        """Terms of one topic, weighted 65% toward the event's primary topic."""
        keys = sorted(self.topic_terms)
        if self.ptopic in self.topic_terms and (len(keys) == 1 or self.r.random() < 0.65):
            return self.topic_terms[self.ptopic]
        return self.topic_terms[self.r.choice(keys)]

    # -- people / registrations
    def home(self):
        r = self.r
        local_p = 1.0 if self.ev["category"] == "meetup" else 0.55
        if self.city and r.random() < local_p:
            return self.city, self.country
        other = r.choice(self.people_cities) if self.people_cities else (self.city or "Seattle", self.country or "US")
        return other

    def register(self, person, role):
        if person["id"] in self.regs:
            reg = self.regs[person["id"]]
            if role == "speaker" and reg["role"] == "attendee":
                reg["role"] = "speaker"
            return reg
        r, D = self.r, C.DISCIPLINES[person["discipline"]]
        ev_terms = r.sample(self.tt(), 2)
        i1 = r.choice(person["interests"]); e1 = r.choice(person["expertise"])
        comp = C.DISCIPLINES[r.choice(D["complements"])]
        interests = list(dict.fromkeys(r.sample(person["interests"], min(4, len(person["interests"]))) + ev_terms[:1]))
        reg = {
            "id": f"reg_{short_hash(self.ev['@id'], person['id'], n=12)}", "eventId": self.ev["@id"], "personId": person["id"],
            **{k: person[k] for k in ("name", "title", "company", "avatar", "bio", "discipline", "seniority", "homeCity")},
            "interests": interests, "expertise": person["expertise"],
            "projects": r.choice(D["projects"]).format(i1=i1, e1=e1),
            "challenges": r.choice(D["challenges"]).format(i1=i1, e1=e1),
            "looking_for": f"{r.choice(['Looking to meet', 'Hoping to connect with', 'Want to find'])} {comp['plural']} who {comp['offer']}, especially around {ev_terms[1]}.",
            "topics": ev_terms, "role": role, "speakerSessionIds": [], "bookmarkedSessionIds": [],
            "openTo": r.sample(C.OPEN_TO, r.randint(2, 4)),
            "registeredAt": iso(min(NOW, self.start.astimezone(dt.timezone.utc)) - dt.timedelta(days=r.randint(1, 120), hours=r.randint(0, 23))),
            "synthetic": True,
        }
        if self.end < NOW and r.random() < 0.85:
            reg["checked_in_at"] = iso(self.start - dt.timedelta(minutes=r.randint(-30, 90)))
        self.regs[person["id"]] = reg
        return reg

    def new_attendee(self, role="attendee", disc=None):
        disc = disc or weighted(self.r, self.weights)
        city, country = self.home()
        reuse = 0.15 if self.ev["category"] == "meetup" else 0.35
        p = self.people.pick(self.r, disc, city, country, set(self.regs), reuse)
        return self.register(p, role)

    def speaker(self, name=None, description=None):
        """Speaker from eventapp (name + 'Title at Company') or a newly generated one."""
        if name:
            title, _, company = (description or "").partition(" at ")
            disc = discipline_from_title(title, weighted(self.r, self.weights))
            city, country = self.home()
            p = self.people.create(self.r, disc, city, country, name=name.replace("Dr. ", ""),
                                   title=title or None, company=company or None)
        else:
            disc = weighted(self.r, self.weights)
            city, country = self.home()
            p = self.people.pick(self.r, disc, city, country, set(self.regs), 0.25)
        reg = self.register(p, "speaker")
        return {"regId": reg["id"], "name": p["name"], "company": p["company"], "expertise": p["expertise"], "reg": reg}

    # -- agendas
    def build_conference(self, academic=False):
        r, ev, A = self.r, self.ev, self.agenda
        subs = ev.get("subEvent", [])
        expected = ev.get("expectedAttendance", {}).get("value", 500)
        tracks = (["Paper Session A", "Paper Session B"] if academic
                  else (["Main", self.label, "Deep Dives"] if expected >= 800 else ["Main", self.label]))
        room = {tracks[0]: "ballroom-a", tracks[1]: "ballroom-b"}
        if len(tracks) > 2: room[tracks[2]] = "room-2-04"
        if self.style == "virtual":
            room = {t: k for t, k in zip(tracks, ["main-stage-live", "breakout-1", "breakout-2"])}
        keynote_room = "main-stage-live" if self.style == "virtual" else "main-auditorium"
        slots = ["10:30", "11:30", "13:30", "14:30", "15:45"]
        taken = set()
        # 1) carry over eventapp subEvents (keynote + talks/workshops) at their original times
        for sub in subs:
            st = parse(sub["startDate"]).astimezone(self.tz)
            d_idx = (st.date() - self.days[0]).days
            perf = (sub.get("performer") or [{}])[0].get("performer", [{}])[0]
            spk = [self.speaker(perf.get("name"), perf.get("description"))] if perf.get("name") else []
            mins = int((parse(sub["endDate"]) - parse(sub["startDate"])).total_seconds() // 60)
            stype = sub.get("sessionType", "talk")
            T = r.choice(self.tt())
            if stype == "keynote":
                theme = sub["name"].split(":", 1)[-1].strip()
                ab = C.KEYNOTE_ABSTRACT.format(speaker=spk[0]["name"] if spk else "Our keynote speaker", day=d_idx + 1, event=ev["name"], label=self.label, theme=theme)
                s = A.add(r, d_idx, st, mins, sub["name"], "keynote", keynote_room, "Keynotes", ab, spk, [self.ptopic], source=sub.get("@id"))
            elif stype == "workshop":
                ab = C.WORKSHOP_ABSTRACT.format(T=T, T2=r.choice(self.tt()), e=r.choice(spk[0]["expertise"]) if spk else "the basics")
                wroom = A.free_space(["room-3-10", "hack-hub", "room-2-04"] if self.style != "virtual" else ["workshop-room", "breakout-2"], st, mins)
                s = A.add(r, d_idx, st, mins, sub["name"], "workshop", wroom, "Workshops", ab, spk, [self.ptopic], "intermediate", source=sub.get("@id"))
                taken.add((d_idx, "workshop", st.strftime("%H:%M")))
            else:
                track = sub.get("track") if sub.get("track") in room else tracks[0]
                hhmm = st.strftime("%H:%M")
                if (d_idx, track, hhmm) in taken:
                    track = next((t for t in tracks if (d_idx, t, hhmm) not in taken), track)
                taken.add((d_idx, track, hhmm))
                title = sub["name"].replace("Paper Session: ", "") if academic else sub["name"]
                ab = r.choice(C.TALK_ABSTRACTS).format(speaker=spk[0]["name"] if spk else "The speaker", company=spk[0]["company"] if spk else "their team", T=title, T2=r.choice(self.tt()), n=r.randint(3, 20))
                stype2 = "paper-session" if academic else "talk"
                if academic:
                    title = f"Paper Session: {title}"
                s = A.add(r, d_idx, st, mins, title, stype2, room[track], track, ab, spk, [self.ptopic], r.choice(["intro", "intermediate", "advanced"]), source=sub.get("@id"))
            for p in spk:
                p["reg"]["speakerSessionIds"].append(s["id"])
        # 2) fill the rest of each day
        for d_idx, day in enumerate(self.days):
            last = d_idx == len(self.days) - 1
            A.add(r, d_idx, at(day, "08:00", self.tz), 60, "Registration & Breakfast" if d_idx == 0 else "Breakfast", "registration" if d_idx == 0 else "break", "registration-foyer" if self.style == "hall" else "lobby")
            if d_idx == 0:
                A.add(r, d_idx, at(day, "09:00", self.tz), 15, "Welcome & Opening Remarks", "opening", keynote_room, "Keynotes")
            has_keynote = any(s["sessionType"] == "keynote" and s["day"] == d_idx + 1 for s in A.items)
            if not has_keynote:
                spk = self.speaker()
                theme = r.choice(C.KEYNOTE_THEMES)
                s = A.add(r, d_idx, at(day, "09:15", self.tz), 60, f"Day {d_idx + 1} Keynote: {theme}", "keynote", keynote_room, "Keynotes",
                          C.KEYNOTE_ABSTRACT.format(speaker=spk["name"], day=d_idx + 1, event=ev["name"], label=self.label, theme=theme), [spk], [self.ptopic])
                spk["reg"]["speakerSessionIds"].append(s["id"])
            A.add(r, d_idx, at(day, "10:15", self.tz), 15, "Coffee Break", "break", "tech-cafe" if self.style == "hall" else "virtual-lounge" if self.style == "virtual" else "lobby")
            A.add(r, d_idx, at(day, "12:15", self.tz), 75, "Lunch & Pod Meetups", "lunch", "exhibit-hall" if self.style == "hall" else "virtual-lounge" if self.style == "virtual" else "lobby",
                  abstract="Lunch is served. CINDER pods meet at the spot pinned in their pod channel.")
            A.add(r, d_idx, at(day, "15:15", self.tz), 30, "Afternoon Break", "break", "tech-cafe" if self.style == "hall" else "virtual-lounge" if self.style == "virtual" else "lobby")
            if not academic and r.random() < 0.6 and not any(k[0] == d_idx and k[1] == "workshop" for k in taken):
                spk = self.speaker()
                T, T2 = r.sample(self.tt(), 2)
                s = A.add(r, d_idx, at(day, "13:30", self.tz), 165, f"Workshop: Hands-on {T}", "workshop", "room-3-10" if self.style != "virtual" else "workshop-room", "Workshops",
                          C.WORKSHOP_ABSTRACT.format(T=T, T2=T2, e=r.choice(spk["expertise"])), [spk], [self.ptopic], "intermediate")
                spk["reg"]["speakerSessionIds"].append(s["id"])
            for hhmm in slots:
                if last and hhmm == "15:45" and len(self.days) > 1:
                    continue
                for track in tracks:
                    if (d_idx, track, hhmm) in taken:
                        continue
                    taken.add((d_idx, track, hhmm))
                    if academic:
                        authors = [self.speaker() for _ in range(3)]
                        T = r.choice(self.tt())
                        papers = [r.choice(C.PAPER_TITLES).format(T=r.choice(self.tt())) for _ in range(3)]
                        ab = "Papers: " + "; ".join(f"\"{p}\" ({a['name']})" for p, a in zip(papers, authors)) + "."
                        s = A.add(r, d_idx, at(day, hhmm, self.tz), 45, f"Paper Session: {T}", "paper-session", room[track], track, ab, authors, [self.ptopic], "advanced")
                        for a in authors: a["reg"]["speakerSessionIds"].append(s["id"])
                    else:
                        spk = self.speaker()
                        T, T2, title = talk_title(r, self.tt(), spk["company"])
                        ab = r.choice(C.TALK_ABSTRACTS).format(speaker=spk["name"], company=spk["company"], T=T, T2=T2, n=r.randint(3, 20))
                        s = A.add(r, d_idx, at(day, hhmm, self.tz), 45, title, "talk", room[track], track, ab, [spk], [self.ptopic, slug(T)], r.choice(["intro", "intermediate", "advanced"]))
                        spk["reg"]["speakerSessionIds"].append(s["id"])
            if academic and self.style != "virtual":
                A.add(r, d_idx, at(day, "15:45", self.tz) if not last else at(day, "13:30", self.tz), 60, "Poster Session", "poster-session", "exhibit-hall" if self.style == "hall" else "lobby",
                      abstract="Authors present posters; coffee provided.", tags=[self.ptopic])
            if last:
                end_room = keynote_room
                if academic:
                    A.add(r, d_idx, at(day, "17:00", self.tz), 60, "Best Paper Awards & Closing", "closing", end_room, "Keynotes")
                else:
                    panel = [self.speaker() for _ in range(3)]
                    s = A.add(r, d_idx, at(day, "16:45", self.tz), 45, f"Closing Panel: The Future of {self.label}", "panel", end_room, "Keynotes",
                              C.PANEL_ABSTRACT.format(c1=panel[0]["company"], c2=panel[1]["company"], c3=panel[2]["company"], label=self.label), panel, [self.ptopic])
                    for p in panel: p["reg"]["speakerSessionIds"].append(s["id"])
            if d_idx == 0 and len(self.days) > 1:
                A.add(r, d_idx, at(day, "17:30", self.tz), 90, "Welcome Reception", "networking", "networking-lounge" if self.style == "hall" else "virtual-lounge" if self.style == "virtual" else "lobby",
                      abstract="Drinks and snacks. A good moment to find your pod in person.")

    def build_meetup(self):
        r, ev, A = self.r, self.ev, self.agenda
        main = {"room": "community-room", "theater": "conference-room-1", "club": "main-room", "hall": "room-2-04", "virtual": "main-stage-live"}[self.style]
        social = {"room": "lobby", "theater": "foyer-bar", "club": "bar-lounge", "hall": "tech-cafe", "virtual": "virtual-lounge"}[self.style]
        S, E, d = self.start, self.end, 0
        perfs = [p.get("performer", [{}])[0] for p in ev.get("performer", [])]
        A.add(r, d, S, 30, "Doors, Pizza & Hellos", "arrival", social, abstract="Grab food, find your pod, say hi to someone new.")
        if "Hack Night" in ev["name"]:
            A.add(r, d, S + dt.timedelta(minutes=30), 15, "Project Pitches", "lightning", main, abstract="Anyone can pitch a project in 60 seconds and recruit collaborators.")
            A.add(r, d, S + dt.timedelta(minutes=45), int((E - S).total_seconds() // 60) - 75, "Open Hacking", "hacking", main, tags=[self.ptopic])
            A.add(r, d, E - dt.timedelta(minutes=30), 30, "Demos & Wrap-up", "demo", main)
        else:
            if len(perfs) <= 1:
                spk = [self.speaker(perfs[0].get("name"), perfs[0].get("description"))] if perfs else [self.speaker()]
                title = ev["name"].split(": ", 1)[-1]
                ab = r.choice(C.TALK_ABSTRACTS).format(speaker=spk[0]["name"], company=spk[0]["company"], T=title, T2=r.choice(self.tt()), n=r.randint(2, 10))
                s = A.add(r, d, S + dt.timedelta(minutes=30), 45, title, "talk", main, None, ab, spk, [self.ptopic], r.choice(["intro", "intermediate"]))
                spk[0]["reg"]["speakerSessionIds"].append(s["id"])
            else:
                for i, pf in enumerate(perfs[:3]):
                    spk = self.speaker(pf.get("name"), pf.get("description"))
                    T, T2, title = talk_title(r, self.tt(), spk["company"])
                    s = A.add(r, d, S + dt.timedelta(minutes=30 + 13 * i), 12, f"Lightning Talk: {title}", "lightning", main, None,
                              f"Ten minutes on {T} from {spk['name']} ({spk['company']}).", [spk], [self.ptopic])
                    spk["reg"]["speakerSessionIds"].append(s["id"])
            nstart = S + dt.timedelta(minutes=80)
            A.add(r, d, nstart, max(20, int((E - nstart).total_seconds() // 60)), "Networking & Pod Meetups", "networking", social,
                  abstract="Pods meet up; everyone else mingles.")

    def build_expo(self):
        r, A = self.r, self.agenda
        stage_keys = ["main-stage", "innovation-theater"] if self.style == "hall" else ["main-stage-live", "breakout-1"]
        hall = "exhibit-hall" if self.style == "hall" else "virtual-lounge"
        for d_idx, day in enumerate(self.days):
            last = d_idx == len(self.days) - 1
            close = "16:00" if last else "18:00"
            open_mins = int((at(day, close, self.tz) - at(day, "10:00", self.tz)).total_seconds() // 60)
            A.add(r, d_idx, at(day, "10:00", self.tz), open_mins, "Exhibit Hall Open", "expo-floor", hall, abstract="Visit exhibitor booths across the hall.")
            A.add(r, d_idx, at(day, "12:00", self.tz), 90, "Lunch (Food Court)", "lunch", "tech-cafe" if self.style == "hall" else hall)
            for i, hhmm in enumerate(["10:30", "11:00", "11:30", "13:30", "14:00", "14:30", "15:00"]):
                if last and hhmm >= "15:00":
                    continue
                spk = self.speaker()
                T = r.choice(self.tt())
                title = r.choice(C.EXPO_TALKS).format(T=T, company=spk["company"], year=day.year)
                s = A.add(r, d_idx, at(day, hhmm, self.tz), 25, title, "stage-talk", stage_keys[i % 2], "Stage",
                          f"{spk['name']} ({spk['company']}) on {T}: what it costs, what it delivers and how to evaluate vendors.", [spk], [self.ptopic])
                spk["reg"]["speakerSessionIds"].append(s["id"])
            if d_idx == 0:
                A.add(r, d_idx, at(day, close, self.tz), 90, "Exhibitor Reception", "networking", "networking-lounge" if self.style == "hall" else hall)

    # -- announcements
    def announce(self, publish_at, kind, title, body, sessions=(), spaces=(), severity="info", audience="all"):
        self.announcements.append({
            "id": f"ann_{short_hash(self.ev['@id'], kind, title, n=10)}", "eventId": self.ev["@id"], "publishAt": iso(publish_at),
            "kind": kind, "severity": severity, "audience": audience, "title": title, "body": body,
            "affects": {"sessionIds": list(sessions), "spaceIds": list(spaces)}, "synthetic": True,
        })

    def build_announcements(self):
        r, ev, items = self.r, self.ev, self.agenda.items
        first = self.days[0]
        sp = self.spaces
        entry = sp.get("registration-foyer") or sp.get("lobby") or next(iter(sp.values()))
        self.announce(at(first, "18:00", self.tz) - dt.timedelta(days=1), "general", f"Welcome to {ev['name']}!",
                      f"Check-in opens at {self.start.strftime('%H:%M') if ev['category'] == 'meetup' else '08:00'} at the {entry['name']}. "
                      "Complete your CINDER profile tonight so we can match you with your pod.", spaces=[entry["id"]])
        status = ev.get("eventStatus")
        if status == "EventRescheduled" and ev.get("previousStartDate"):
            old = parse(ev["previousStartDate"][0]).astimezone(self.tz)
            self.announce(self.start - dt.timedelta(days=30), "schedule-change", "New dates confirmed",
                          f"{ev['name']} has moved from {old.strftime('%d %B')} to {self.start.strftime('%d %B %Y')}. Existing registrations stay valid.", severity="important")
        if status == "EventMovedOnline":
            self.announce(self.start - dt.timedelta(days=7), "schedule-change", "This event is now online",
                          f"{ev['name']} has moved online. Join the livestream and breakout rooms from the event page; pods will meet in the Virtual Lounge.", severity="important")
        if status == "EventPostponed":
            self.announce(self.start - dt.timedelta(days=14), "schedule-change", "Event postponed",
                          f"{ev['name']} is postponed. New dates will be announced soon; registrations carry over.", severity="critical")
        talks = [s for s in items if s["sessionType"] in ("talk", "paper-session", "stage-talk")]
        if ev["category"] in ("conference", "academic") and talks and r.random() < 0.7:
            s = r.choice(talks)
            busy = {x["spaceId"] for x in items if x["startDate"] < s["endDate"] and x["endDate"] > s["startDate"]}
            alt = next((v for k, v in sp.items() if v["kind"] in ("breakout", "auditorium", "virtual-room") and v["id"] not in busy), None)
            if alt:
                old_room = s["roomName"]
                s["previousSpaceId"], s["spaceId"], s["roomName"], s["capacity"] = s["spaceId"], alt["id"], alt["name"], alt["capacity"]
                self.announce(parse(s["startDate"]) - dt.timedelta(hours=2), "room-change", f"Room change: {s['title']}",
                              f"\"{s['title']}\" moves from {old_room} to {alt['name']} due to high demand. Same time.",
                              [s["id"]], [s["previousSpaceId"], alt["id"]], "important")
        if ev["category"] in ("conference", "academic") and len(talks) > 3 and r.random() < 0.5:
            s = r.choice(talks)
            if "previousSpaceId" not in s:
                st, en = parse(s["startDate"]), parse(s["endDate"])
                s["originalStartDate"] = s["startDate"]
                s["startDate"], s["endDate"] = iso(st + dt.timedelta(minutes=15)), iso(en + dt.timedelta(minutes=15))
                self.announce(st - dt.timedelta(minutes=30), "schedule-change", f"Delayed: {s['title']}",
                              f"\"{s['title']}\" in {s['roomName']} will start 15 minutes late, at {(st + dt.timedelta(minutes=15)).strftime('%H:%M')}.",
                              [s["id"]], [s["spaceId"]], "important")
        for s in items:
            if s["sessionType"] == "lunch" and s["day"] == 1:
                self.announce(parse(s["startDate"]) - dt.timedelta(minutes=20), "reminder", "Lunch & pod meetups",
                              f"Lunch starts at {parse(s['startDate']).strftime('%H:%M')} in the {s['roomName']}. Check your pod channel for your meetup spot.",
                              [s["id"]], [s["spaceId"]], audience="all")
            if s["sessionType"] in ("networking",) and s["day"] == 1:
                self.announce(parse(s["startDate"]) - dt.timedelta(minutes=30), "reminder", s["title"],
                              f"{s['title']} starts at {parse(s['startDate']).strftime('%H:%M')} in the {s['roomName']}.", [s["id"]], [s["spaceId"]])
            if s["sessionType"] in ("panel", "closing"):
                self.announce(parse(s["startDate"]) - dt.timedelta(minutes=15), "reminder", "Closing session",
                              f"\"{s['title']}\" starts at {parse(s['startDate']).strftime('%H:%M')} in the {s['roomName']}. Please fill in the feedback survey afterwards.",
                              [s["id"]], [s["spaceId"]])
        if ev["category"] == "meetup":
            room = next((s for s in items if s["sessionType"] in ("talk", "lightning", "hacking")), None)
            if room:
                sp_room = next(v for v in sp.values() if v["id"] == room["spaceId"])
                self.announce(self.start - dt.timedelta(hours=3), "logistics", "Finding the room",
                              f"We're in the {sp_room['name']} ({sp_room['floor']}). Doors open at {self.start.strftime('%H:%M')}.", spaces=[sp_room["id"]])

    # -- bulk out the attendee list and bookmarks
    def fill_attendees(self):
        r, ev = self.r, self.ev
        exp = ev.get("expectedAttendance", {}).get("value", 100)
        cat = ev["category"]
        target = {"conference": lambda: max(40, min(160, round(exp * r.uniform(0.03, 0.06)))),
                  "academic": lambda: max(30, min(90, round(exp * 0.08))),
                  "meetup": lambda: max(12, min(60, round(exp * r.uniform(0.4, 0.8)))),
                  "expo": lambda: max(50, min(140, round(exp * 0.01)))}[cat]()
        if cat == "expo":
            for i, sp_name in enumerate([s["name"] for s in ev.get("sponsor", [])] + r.sample(C.COMPANIES, 12)):
                disc = r.choice(["b2b", "manufacturing", "b2b", "product"])
                city, country = self.home()
                p = self.people.create(r, disc, city, country, company=sp_name)
                reg = self.register(p, "exhibitor")
                reg["booth"] = f"{'ABC'[i % 3]}-{10 + i}"
        else:
            for sp_name in [s["name"] for s in ev.get("sponsor", [])]:
                disc = r.choice(["devrel", "b2b"])
                city, country = self.home()
                self.register(self.people.create(r, disc, city, country, company=sp_name), "sponsor")
        for _ in range(2 if cat != "meetup" else 1):
            self.register(self.people.pick(r, "eng-leadership" if cat != "meetup" else "devrel", *self.home(), set(self.regs), 0.3), "organizer")
        target += sum(1 for x in self.regs.values() if x["role"] != "attendee")
        while len(self.regs) < target:
            self.new_attendee()
        bookable = [s for s in self.agenda.items if s["sessionType"] in ("talk", "workshop", "paper-session", "keynote", "panel", "stage-talk", "lightning")]
        for reg in self.regs.values():
            if bookable:
                ranked = sorted(bookable, key=lambda s: -sum(t.lower() in s["title"].lower() for t in reg["topics"] + reg["interests"]) - r.random())
                reg["bookmarkedSessionIds"] = [s["id"] for s in ranked[: r.randint(2, 6)]]

    def run(self):
        cat = self.ev["category"]
        if cat in ("conference", "academic"):
            self.build_conference(academic=cat == "academic")
        elif cat == "meetup":
            self.build_meetup()
        else:
            self.build_expo()
        self.build_announcements()
        self.fill_attendees()
        return self


# ---------------------------------------------------------------- embeddings + bulk
def embed_all(texts, batch=16, workers=10):
    """batch=16 is the endpoint's max inputs per request."""
    import time
    out = [None] * len(texts)
    chunks = [(i, texts[i:i + batch]) for i in range(0, len(texts), batch)]

    def call(chunk):
        i, inp = chunk
        for attempt in range(5):
            try:
                # input_type "ingest" = the same document-side embedding the ingest pipelines produce (verified cosine ≈ 1.0);
                # the default/"search" type gives ~0.93, which would put bulk-loaded and runtime docs in different spaces.
                res = es("POST", f"/_inference/text_embedding/{EMBED_MODEL}", {"input": inp, "input_type": "ingest"})
                return i, [e["embedding"] for e in res["text_embedding"]]
            except SystemExit as e:          # es() exits on HTTP errors; retry transient ones (429/5xx/timeouts)
                if attempt == 4 or "HTTP 400" in str(e):
                    raise
                time.sleep(2 ** attempt)

    done, step = 0, max(1, len(texts) // 10)
    with cf.ThreadPoolExecutor(workers) as ex:
        for i, vecs in ex.map(call, chunks):
            out[i:i + len(vecs)] = vecs
            done += len(vecs)
            if done // step != (done - len(vecs)) // step:
                print(f"    embedded {done}/{len(texts)}", flush=True)
    return out


def bulk(index, docs, chunk=400):
    errors = 0
    for i in range(0, len(docs), chunk):
        lines = []
        for d in docs[i:i + chunk]:
            lines.append(json.dumps({"index": {"_index": index, "_id": d["id"]}}))
            lines.append(json.dumps(d, ensure_ascii=False))
        res = es_ndjson("/_bulk?refresh=false", "\n".join(lines) + "\n")
        if res.get("errors"):
            bad = [it["index"] for it in res["items"] if "error" in it["index"]]
            errors += len(bad)
            print("   ", index, "error sample:", json.dumps(bad[0]["error"])[:500])
    return errors


def es_ndjson(path, body):
    import urllib.request
    from setup import ENV
    req = urllib.request.Request(ENV["ES_URL"].rstrip("/") + path, data=body.encode(), method="POST",
                                 headers={"Authorization": "ApiKey " + ENV["ES_API_KEY"], "Content-Type": "application/x-ndjson"})
    with urllib.request.urlopen(req, timeout=300) as r:
        return json.load(r)


# ---------------------------------------------------------------- commands
def cmd_setup():
    for name, body in PIPELINES.items():
        print(name, es("PUT", f"/_ingest/pipeline/{name}", body))
    defs = json.load(open(os.path.join(HERE, "indices.json")))
    existing = {x["index"] for x in es("GET", "/_cat/indices/cinder-*?format=json&h=index")}
    for name, body in defs.items():
        if name in existing:
            print(name, "exists (left unchanged)")
        else:
            print(name, es("PUT", f"/{name}", body))
    print(EVENT_INDEX, "mapping cinder.*", es("PUT", f"/{EVENT_INDEX}/_mapping", {"properties": {"cinder": {"properties": {
        "enabled": {"type": "boolean"}, "registrations": {"type": "integer"}, "sessions": {"type": "integer"},
        "speakers": {"type": "integer"}, "announcements": {"type": "integer"}}}}}))


def fetch_events():
    q = {"size": 1000, "query": {"terms": {"category": EVENT_CATEGORIES}}, "sort": [{"startDate": "asc"}, {"@id": "asc"}]}
    return [h["_source"] for h in es("POST", f"/{EVENT_INDEX}/_search", q)["hits"]["hits"]]


def cmd_build(dry_run=False):
    events = fetch_events()
    print(f"{len(events)} events in categories {EVENT_CATEGORIES}")
    people = People()
    cities = sorted({(l["address"]["addressLocality"], l["address"]["addressCountry"]) for e in events
                     for l in e.get("location", []) if l.get("address")})
    sessions, spaces, anns, regs, updates = [], {}, [], [], []
    skipped = 0
    for ev in events:
        if ev["eventStatus"] == "EventCancelled":
            updates.append((ev["@id"], {"enabled": False}))
            skipped += 1
            continue
        b = EventBuild(ev, people)
        b.people_cities = cities
        b.run()
        sessions += b.agenda.items
        for s in b.spaces.values():
            spaces[s["id"]] = s
        anns += b.announcements
        regs += list(b.regs.values())
        updates.append((ev["@id"], {"enabled": True, "registrations": len(b.regs), "sessions": len(b.agenda.items),
                                    "speakers": sum(1 for x in b.regs.values() if x["role"] == "speaker"), "announcements": len(b.announcements)}))
    prompts = [{"id": f"prm_{short_hash(t, n=10)}", "phase": ph, "topics": tp, "text": t, "synthetic": True} for ph, tp, t in C.PROMPTS]
    people_docs = list(people.by_id.values())
    print(f"generated: people={len(people_docs)} registrations={len(regs)} sessions={len(sessions)} spaces={len(spaces)} "
          f"announcements={len(anns)} prompts={len(prompts)} (skipped {skipped} cancelled events)")
    for r_ in regs: r_["searchText"] = registration_text(r_)
    for s in sessions: s["searchText"] = session_text(s)
    for p in prompts: p["searchText"] = p["text"]
    if dry_run:
        json.dump({"people": people_docs[:3], "registrations": regs[:3], "sessions": sessions[:12], "spaces": list(spaces.values())[:5],
                   "announcements": anns[:6]}, open(os.path.join(HERE, "dry-run-sample.json"), "w"), indent=1, ensure_ascii=False)
        print("dry run: sample written to elasticsearch/cinder/dry-run-sample.json")
        return
    print("embedding (", EMBED_MODEL, ") ...")
    for docs in (prompts, sessions, regs):
        for d, v in zip(docs, embed_all([d["searchText"] for d in docs])):
            d["embedding"] = v
    print("bulk loading ...")
    for index, docs in (("cinder-people", people_docs), ("cinder-spaces", list(spaces.values())), ("cinder-prompts", prompts),
                        ("cinder-announcements", anns), ("cinder-sessions", sessions), ("cinder-registrations", regs)):
        err = bulk(index, docs)
        print(f"  {index}: {len(docs)} docs, {err} errors")
    lines = []
    for eid, c in updates:
        lines.append(json.dumps({"update": {"_index": EVENT_INDEX, "_id": eid}}))
        lines.append(json.dumps({"doc": {"cinder": c}}))
    res = es_ndjson("/_bulk", "\n".join(lines) + "\n")
    print(f"  {EVENT_INDEX}: cinder summary on {len(updates)} events, errors={res.get('errors')}")
    es("POST", "/cinder-*/_refresh")
    es("POST", f"/{EVENT_INDEX}/_refresh")


def cmd_reset():
    for idx in REFERENCE:
        print(idx, es("POST", f"/{idx}/_delete_by_query?refresh=true&conflicts=proceed", {"query": {"term": {"synthetic": True}}}).get("deleted"))


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else ""
    if cmd == "setup": cmd_setup()
    elif cmd == "build": cmd_build(dry_run="--dry-run" in sys.argv)
    elif cmd == "reset": cmd_reset()
    else: print(__doc__)
