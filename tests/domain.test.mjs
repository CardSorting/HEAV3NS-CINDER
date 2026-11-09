/** [LAYER: UI] */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { Attendee } from "../src/domain/attendee.mjs";
import { Pod } from "../src/domain/pod.mjs";
import { Message } from "../src/domain/message.mjs";
import { Match } from "../src/domain/match.mjs";
import { Session } from "../src/domain/agenda.mjs";
import { explainMatchRelevance } from "../src/domain/relevanceScore.mjs";

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

