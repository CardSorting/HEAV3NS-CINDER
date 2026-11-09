/** [LAYER: UI] */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { Attendee } from "../src/domain/attendee.mjs";
import { Pod } from "../src/domain/pod.mjs";
import { Message } from "../src/domain/message.mjs";
import { Match } from "../src/domain/match.mjs";
import { Session } from "../src/domain/agenda.mjs";
import { explainMatchRelevance } from "../src/domain/relevanceScore.mjs";
import { ConferenceEvent, SELECTABLE_CATEGORIES } from "../src/domain/conferenceEvent.mjs";
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
