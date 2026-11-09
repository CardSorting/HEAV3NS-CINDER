/** [LAYER: UI] */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { Attendee } from "../src/domain/attendee.mjs";
import { Pod } from "../src/domain/pod.mjs";
import { Message } from "../src/domain/message.mjs";
import { Match } from "../src/domain/match.mjs";
import { Session, SOCIAL_SESSION_TYPES } from "../src/domain/agenda.mjs";
import { explainMatchRelevance } from "../src/domain/relevanceScore.mjs";
import { ConferenceEvent, SELECTABLE_CATEGORIES } from "../src/domain/conferenceEvent.mjs";
import { VenueSpace, findMentionedSpace } from "../src/domain/venueSpace.mjs";
import { Announcement } from "../src/domain/announcement.mjs";
import { IEventRepository } from "../src/domain/interfaces/IEventRepository.mjs";
import { IAgendaRepository } from "../src/domain/interfaces/IAgendaRepository.mjs";
import { ISpaceRepository } from "../src/domain/interfaces/ISpaceRepository.mjs";
import { IAnnouncementRepository } from "../src/domain/interfaces/IAnnouncementRepository.mjs";
import { IPromptRepository } from "../src/domain/interfaces/IPromptRepository.mjs";
import { IInteractionRepository } from "../src/domain/interfaces/IInteractionRepository.mjs";
import { IMessageRepository } from "../src/domain/interfaces/IMessageRepository.mjs";
import { IElasticsearchClient } from "../src/domain/interfaces/IElasticsearchClient.mjs";

describe("Domain Entities", () => {
  it("creates and validates Attendee entity", () => {
    const attendee = new Attendee({
      id: "att_1",
      name: "Alex Chen",
      title: "Platform Lead",
      interests: ["Kubernetes", "eBPF"],
      expertise: ["Go"]
    });
    assert.strictEqual(attendee.id, "att_1");
    assert.strictEqual(attendee.name, "Alex Chen");
    assert.ok(attendee.toSearchableText().includes("Kubernetes"));
    const json = attendee.toJSON();
    assert.strictEqual(json.name, "Alex Chen");
  });

  it("throws error for invalid Attendee", () => {
    assert.throws(() => new Attendee({ id: "", name: "Alex" }));
    assert.throws(() => new Attendee({ id: "att_1", name: "" }));
  });

  it("manages Pod membership and messages", () => {
    const pod = new Pod({
      id: "pod_01",
      name: "Pod 01: Cloud Systems",
      topic: "Cloud Infrastructure",
      memberIds: ["att_1"]
    });

    pod.addMember("att_2");
    assert.deepStrictEqual(pod.memberIds, ["att_1", "att_2"]);

    // Ignore duplicate members
    pod.addMember("att_1");
    assert.strictEqual(pod.memberIds.length, 2);

    const msg = new Message({
      id: "msg_1",
      podId: pod.id,
      senderId: "att_1",
      senderName: "Alex",
      content: "Hello Pod!"
    });
    pod.addMessage(msg);
    assert.strictEqual(pod.messages.length, 1);

    pod.pinMeetup("Tech Cafe", "12:15 PM");
    assert.strictEqual(pod.pinnedMeetup?.location, "Tech Cafe");
  });

  it("creates Match entity", () => {
    const match = new Match({
      id: "m_1",
      initiatorId: "att_1",
      targetId: "att_2",
      action: "like",
      mutual: true
    });
    assert.strictEqual(match.mutual, true);
    assert.strictEqual(match.action, "like");
  });

  it("creates Session entity", () => {
    const session = new Session({
      id: "s_1",
      title: "Opening Keynote",
      speakers: ["Dr. Smith"],
      startTime: "09:00",
      endTime: "10:00",
      room: "Hall A"
    });
    assert.strictEqual(session.title, "Opening Keynote");
  });

  it("generates intuitive match relevance explanation", () => {
    const a1 = new Attendee({
      id: "a1",
      name: "Alex",
      interests: ["Kubernetes", "eBPF"],
      expertise: ["Go"]
    });
    const a2 = new Attendee({
      id: "a2",
      name: "Maya",
      interests: ["Kubernetes", "Observability"],
      expertise: ["Linux Kernel", "Tracing"]
    });

    const explanation = explainMatchRelevance(a1, a2, { knnScore: 0.88 });
    assert.ok(explanation.headline.includes("Kubernetes"));
    assert.ok(explanation.synergySummary.includes("Maya"));
    assert.strictEqual(explanation.scorePercent, 88);
  });
});

describe("IElasticsearchClient contract", () => {
  const methods = ["ensureIndex", "indexAttendee", "hybridSearch", "getStatus", "checkHealth",
    "search", "count", "get", "index", "update", "deleteByQuery", "bulk", "embed", "chatCompletion"];

  for (const name of methods) {
    it(`declares ${name} and rejects until an adapter implements it`, async () => {
      const contract = new IElasticsearchClient();
      assert.strictEqual(typeof contract[name], "function");
      await assert.rejects(() => contract[name](), new RegExp(`IElasticsearchClient\\.${name} must be implemented`));
    });
  }
});

describe("Event scoping on domain entities", () => {
  const EV = "urn:ue:event:devsummit-2026";
  const base = {
    attendee: { id: "att_1", name: "Alex" },
    pod: { id: "pod_1", name: "Pod 01", topic: "Infra" },
    match: { id: "m_1", initiatorId: "a", targetId: "b", action: "like" },
    message: { id: "msg_1", podId: "pod_1", senderId: "a", senderName: "A", content: "hi" }
  };
  const ctors = { attendee: Attendee, pod: Pod, match: Match, message: Message };

  for (const [name, Ctor] of Object.entries(ctors)) {
    it(`${name}: eventId defaults to null and round-trips through toJSON`, () => {
      assert.strictEqual(new Ctor(base[name]).eventId, null);
      assert.strictEqual(new Ctor(base[name]).toJSON().eventId, null);
      const scoped = new Ctor({ ...base[name], eventId: EV });
      assert.strictEqual(scoped.toJSON().eventId, EV);
      assert.strictEqual(new Ctor(scoped.toJSON()).eventId, EV);
    });

    it(`${name}: rejects an empty or non-string eventId`, () => {
      assert.throws(() => new Ctor({ ...base[name], eventId: "" }), /eventId must be a non-empty string or null/);
      assert.throws(() => new Ctor({ ...base[name], eventId: 42 }), /eventId must be a non-empty string or null/);
    });
  }

  it("pod stamps its eventId onto messages and rejects messages from another event", () => {
    const pod = new Pod({ ...base.pod, eventId: EV });
    const msg = new Message(base.message);
    pod.addMessage(msg);
    assert.strictEqual(msg.eventId, EV);
    assert.strictEqual(pod.toJSON().messages[0].eventId, EV);
    const foreign = new Message({ ...base.message, id: "msg_2", eventId: "urn:ue:event:other" });
    assert.throws(() => pod.addMessage(foreign), /belongs to event urn:ue:event:other/);
  });

  it("pod without an eventId leaves messages unscoped", () => {
    const pod = new Pod(base.pod);
    const msg = new Message(base.message);
    pod.addMessage(msg);
    assert.strictEqual(msg.eventId, null);
  });
});

describe("ConferenceEvent entity", () => {
  const props = {
    id: "urn:ue:event:devsummit-2026", name: "DevSummit 2026", category: "conference",
    startDate: "2026-12-23T09:00:00-07:00", endDate: "2026-12-25T17:30:00-07:00", timezone: "America/Denver",
    venue: { id: "urn:ue:place:salt-palace", name: "Salt Palace Convention Center", city: "Salt Lake City" },
    cinder: { enabled: true, registrations: 160, sessions: 61 }
  };

  it("constructs, round-trips and reports duration in its own timezone", () => {
    const ev = new ConferenceEvent(props);
    assert.strictEqual(ev.durationDays(), 3);
    assert.deepStrictEqual(new ConferenceEvent(ev.toJSON()).toJSON(), ev.toJSON());
    assert.strictEqual(ev.toJSON().cinder.speakers, 0);
  });

  it("is selectable only when CINDER-enabled and not cancelled", () => {
    assert.strictEqual(new ConferenceEvent(props).isSelectable(), true);
    assert.strictEqual(new ConferenceEvent({ ...props, status: "EventCancelled" }).isSelectable(), false);
    assert.strictEqual(new ConferenceEvent({ ...props, cinder: { enabled: false } }).isSelectable(), false);
  });

  it("reports its phase relative to a clock time", () => {
    const ev = new ConferenceEvent(props);
    assert.strictEqual(ev.phaseAt(Date.parse("2026-12-01T00:00:00Z")), "upcoming");
    assert.strictEqual(ev.phaseAt(Date.parse("2026-12-23T18:45:00Z")), "in-progress");
    assert.strictEqual(ev.phaseAt(Date.parse("2027-01-01T00:00:00Z")), "past");
  });

  it("validates category, dates and timezone", () => {
    assert.deepStrictEqual([...SELECTABLE_CATEGORIES], ["conference", "academic", "meetup", "expo"]);
    assert.throws(() => new ConferenceEvent({ ...props, category: "concert" }), /category must be one of/);
    assert.throws(() => new ConferenceEvent({ ...props, startDate: "nope" }), /valid ISO startDate/);
    assert.throws(() => new ConferenceEvent({ ...props, endDate: "2026-12-01T00:00:00Z" }), /must not be before/);
    assert.throws(() => new ConferenceEvent({ ...props, timezone: "" }), /IANA timezone/);
  });
});

describe("Session absolute timing", () => {
  const seed = { id: "s1", title: "Lunch & Pod Meetups", startTime: "12:15", endTime: "13:30", room: "Exhibit Hall" };
  const full = { ...seed, startDate: "2026-12-23T12:15:00-07:00", endDate: "2026-12-23T13:30:00-07:00",
    timezone: "America/Denver", sessionType: "lunch", spaceId: "space:salt-palace:exhibit-hall" };

  it("keeps seed sessions without dates working", () => {
    const s = new Session(seed);
    assert.strictEqual(s.startsAtMs(), null);
    assert.strictEqual(s.isSocialSlot(), false);
    assert.strictEqual(s.toJSON().startDate, null);
  });

  it("carries absolute times, type and space and round-trips", () => {
    const s = new Session(full);
    assert.strictEqual(s.startsAtMs(), Date.parse("2026-12-23T19:15:00Z"));
    assert.strictEqual(s.endsAtMs() - s.startsAtMs(), 75 * 60000);
    assert.strictEqual(s.isSocialSlot(), true);
    assert.deepStrictEqual(new Session(s.toJSON()).toJSON(), s.toJSON());
    assert.ok(SOCIAL_SESSION_TYPES.includes("networking"));
  });

  it("validates absolute times", () => {
    assert.throws(() => new Session({ ...seed, startDate: full.startDate }), /provided together/);
    assert.throws(() => new Session({ ...full, endDate: "garbage" }), /valid ISO-8601/);
    assert.throws(() => new Session({ ...full, endDate: "2026-12-23T11:00:00-07:00" }), /must not be before/);
  });
});

describe("VenueSpace entity", () => {
  const V = "urn:ue:place:salt-palace";
  const terrace = new VenueSpace({ id: "space:sp:east-terrace", name: "East Terrace", kind: "patio", venueId: V,
    aliases: ["terrace", "patio", "outside", "east terrace"], tags: ["outdoor", "quiet"], capacity: 60, meetupFriendly: true });
  const cafe = new VenueSpace({ id: "space:sp:tech-cafe", name: "Tech Café", kind: "cafe", venueId: V,
    aliases: ["cafe", "café", "coffee", "tech cafe"], tags: ["coffee", "seating"], capacity: 80, meetupFriendly: true });
  const room = new VenueSpace({ id: "space:sp:room-2-04", name: "Room 2.04", venueId: V, aliases: ["2.04", "room 204"] });

  it("matches aliases as whole words, case- and accent-insensitively", () => {
    assert.ok(terrace.mentionedIn("Let's meet on the PATIO after lunch") > 0);
    assert.strictEqual(terrace.mentionedIn("patios are nice"), 0);
    assert.ok(cafe.mentionedIn("grab a coffee at the Tech Cafe?") >= "tech cafe".length);
    assert.ok(room.mentionedIn("meet outside room 2.04 at 12:30") > 0);
  });

  it("picks the most specific space mentioned", () => {
    // "outside" is a terrace alias, but "room 2.04" is the longer, more specific match.
    assert.strictEqual(findMentionedSpace([terrace, cafe, room], "meet outside room 2.04").id, room.id);
    assert.strictEqual(findMentionedSpace([terrace, cafe, room], "coffee?").id, cafe.id);
    assert.strictEqual(findMentionedSpace([terrace, cafe, room], "anywhere works"), null);
  });

  it("builds the display tag and round-trips", () => {
    assert.strictEqual(terrace.displayTag(), "Outdoor & Quiet");
    assert.deepStrictEqual(new VenueSpace(terrace.toJSON()).toJSON(), terrace.toJSON());
  });

  it("requires an owner and a valid capacity", () => {
    assert.throws(() => new VenueSpace({ id: "s", name: "x" }), /venueId.*or an event/);
    assert.throws(() => new VenueSpace({ id: "s", name: "x", venueId: V, capacity: -1 }), /non-negative/);
  });
});

describe("Announcement entity", () => {
  const props = {
    id: "ann_1", eventId: "urn:ue:event:devsummit-2026", publishAt: "2026-12-23T11:55:00-07:00",
    title: "Room change: Platform Teams as Product Teams", body: "Moves to Ballroom B.", kind: "room-change", severity: "important",
    affects: { sessionIds: ["ses_a"], spaceIds: ["space:sp:ballroom-a", "space:sp:ballroom-b"] }
  };

  it("is published once the clock passes publishAt", () => {
    const a = new Announcement(props);
    assert.strictEqual(a.isPublishedAt(Date.parse("2026-12-23T18:50:00Z")), false);
    assert.strictEqual(a.isPublishedAt(Date.parse("2026-12-23T18:55:00Z")), true);
  });

  it("detects whether it affects given sessions or spaces", () => {
    const a = new Announcement(props);
    assert.strictEqual(a.affectsAny({ sessionIds: ["ses_x", "ses_a"] }), true);
    assert.strictEqual(a.affectsAny({ spaceIds: ["space:sp:ballroom-b"] }), true);
    assert.strictEqual(a.affectsAny({ sessionIds: ["ses_x"], spaceIds: ["space:sp:tech-cafe"] }), false);
    assert.strictEqual(a.isScheduleChange(), true);
  });

  it("round-trips and validates kind, severity and publishAt", () => {
    const a = new Announcement(props);
    assert.deepStrictEqual(new Announcement(a.toJSON()).toJSON(), a.toJSON());
    assert.throws(() => new Announcement({ ...props, kind: "rumour" }), /kind must be one of/);
    assert.throws(() => new Announcement({ ...props, severity: "meh" }), /severity must be one of/);
    assert.throws(() => new Announcement({ ...props, publishAt: "soon" }), /publishAt/);
    assert.throws(() => new Announcement({ ...props, eventId: "" }), /eventId/);
  });
});

describe("Repository contracts for event-scoped data", () => {
  const contracts = {
    IEventRepository: [IEventRepository, ["listSelectable", "findById"]],
    IAgendaRepository: [IAgendaRepository, ["listByEvent", "findById", "findNextSocialSlot", "findRelevant"]],
    ISpaceRepository: [ISpaceRepository, ["listForEvent", "findById"]],
    IAnnouncementRepository: [IAnnouncementRepository, ["listByEvent", "listAffecting"]],
    IPromptRepository: [IPromptRepository, ["findForVector", "listByPhase"]],
    IInteractionRepository: [IInteractionRepository, ["saveSwipe", "findSwipe", "listSwipedIds", "listMutualMatches", "findMatchById", "deleteSwipes"]],
    IMessageRepository: [IMessageRepository, ["appendPodMessage", "listPodMessages", "appendDirectMessage", "listDirectMessages"]]
  };
  for (const [name, [Ctor, methods]] of Object.entries(contracts)) {
    it(`${name} declares ${methods.length} methods that reject until implemented`, async () => {
      const contract = new Ctor();
      for (const m of methods) {
        assert.strictEqual(typeof contract[m], "function", `${name}.${m}`);
        await assert.rejects(() => contract[m](), new RegExp(`${name}\\.${m} must be implemented`));
      }
    });
  }
});

describe("Complementary match explanations", () => {
  const amara = { id: "a", name: "Amara", title: "SRE Lead", discipline: "sre", interests: ["Runbook Automation", "SLOs"], expertise: ["Python", "Prometheus"],
    looking_for: "Looking to meet backend engineers who design APIs and systems that survive scale, especially around Runbook Automation." };
  const ingrid = { id: "b", name: "Ingrid", title: "Backend Engineer", discipline: "backend", interests: ["API Design", "Runbook Automation"], expertise: ["Go", "gRPC", "PostgreSQL"],
    looking_for: "Hoping to connect with SREs who have been paged at 3 AM and fixed the root cause." };
  const mei = { id: "c", name: "Mei", title: "Senior SRE", discipline: "sre", interests: ["SLOs"], expertise: ["Prometheus"], looking_for: "Want to find platform engineers." };

  it("leads with the fact that the candidate is who the attendee asked for, and detects mutual fit", () => {
    const e = explainMatchRelevance(amara, ingrid, { retrieverRanks: { bm25: 40, profile_knn: 30, looking_for_knn: 2, looking_for_bm25: 1 } });
    assert.strictEqual(e.answersLookingFor, true);
    assert.strictEqual(e.mutualFit, true, "Ingrid is looking for SREs");
    assert.strictEqual(e.headline, "Mutual fit: Backend Engineer you asked to meet");
    assert.match(e.synergySummary, /Ingrid \(Backend Engineer\) fits what you're looking for\. You both work with Runbook Automation, and Ingrid adds Go, gRPC, PostgreSQL\. They're looking for someone like you too\./);
    assert.strictEqual(e.reasons.length, 4);
    assert.strictEqual(e.scorePercent, 99, "best live rank 1 -> 99");
  });

  it("does not treat generic role words or lookalikes as an answer to looking_for", () => {
    const e = explainMatchRelevance(amara, mei, { retrieverRanks: { bm25: 12, profile_knn: 20, looking_for_knn: null } });
    assert.strictEqual(e.answersLookingFor, false, "'engineers' alone does not make an SRE a backend engineer");
    assert.strictEqual(e.mutualFit, false);
    assert.strictEqual(e.headline, "Shared focus on SLOs");
    assert.strictEqual(e.scorePercent, 88, "best rank 12 -> 88");
  });

  it("matches on expertise named in looking_for and keeps the old fields", () => {
    const e = explainMatchRelevance({ ...mei, looking_for: "someone strong in gRPC and PostgreSQL" }, ingrid);
    assert.strictEqual(e.answersLookingFor, true);
    assert.deepStrictEqual(Object.keys(e).slice(0, 5), ["headline", "sharedInterests", "complementaryStrengths", "synergySummary", "scorePercent"]);
    assert.strictEqual(e.scorePercent, 75, "no score information -> 75");
  });
});

