/** [LAYER: UI] */

import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";

import { CinderApp } from "../src/core/CinderApp.mjs";

describe("CINDER Matching and Pod Orchestration", () => {
  let app;

  beforeEach(async () => {
    app = new CinderApp();
    await app.initialize();
  });

  it("checks in attendees and retrieves discovery feed", async () => {
    const attendees = await app.checkInCtrl.listAttendees();
    assert.strictEqual(attendees.length, 5);

    const feed = await app.discoveryCtrl.getDiscoveryFeed("att_alex_chen", 3);
    assert.ok(feed.candidates.length > 0);
    assert.ok(feed.candidates[0].explanation.headline);
    assert.strictEqual(feed.candidates.some((c) => c.profile.id === "att_alex_chen"), false);
  });

  it("records swipes and detects mutual match", async () => {
    // 1-way swipe
    const swipe1 = await app.discoveryCtrl.recordSwipe({
      fromAttendeeId: "att_alex_chen",
      toAttendeeId: "att_maya_lin",
      action: "like"
    });
    assert.strictEqual(swipe1.isMutual, false);

    // 2nd way swipe -> mutual match!
    const swipe2 = await app.discoveryCtrl.recordSwipe({
      fromAttendeeId: "att_maya_lin",
      toAttendeeId: "att_alex_chen",
      action: "like"
    });
    assert.strictEqual(swipe2.isMutual, true);
    assert.ok(swipe2.match);

    const mutuals = await app.discoveryCtrl.getMutualMatches("att_alex_chen");
    assert.strictEqual(mutuals.length, 1);
    assert.strictEqual(mutuals[0].partner?.name, "Maya Lin");
  });

  it("orchestrates pod formation and welcomes members", async () => {
    const pod = await app.podCtrl.composePod({
      seedAttendeeIds: ["att_alex_chen", "att_maya_lin"],
      targetSize: 4
    });

    assert.strictEqual(pod.memberIds.length, 4);
    assert.ok(pod.name.includes("Pod"));

    const welcome = await app.facilitatorCtrl.welcomePod(pod.id);
    assert.ok(welcome.content.includes("Welcome to"));
    assert.strictEqual(welcome.pinned, true);
  });

  it("coordinates messages and detects physical meetup intent", async () => {
    const pod = await app.podCtrl.composePod({
      seedAttendeeIds: ["att_alex_chen", "att_maya_lin"],
      targetSize: 2
    });

    // Normal message
    await app.commCtrl.sendMessage({
      podId: pod.id,
      senderId: "att_alex_chen",
      content: "Excited for the talks today!"
    });

    // Meetup intent message
    await app.commCtrl.sendMessage({
      podId: pod.id,
      senderId: "att_maya_lin",
      content: "Let's meet for lunch at the Main Hall East Patio at 12:15 PM!"
    });

    const updatedPod = await app.podCtrl.getPod(pod.id);
    assert.strictEqual(updatedPod.pinnedMeetup?.location, "Main Hall East Patio");
    assert.strictEqual(updatedPod.pinnedMeetup?.time, "12:15 PM");
    assert.strictEqual(updatedPod.pinnedMeetup?.confirmed, true);

    const messages = await app.commCtrl.getMessages(pod.id);
    // Should have: user msg 1, user msg 2, and AI facilitator confirmation
    assert.ok(messages.length >= 3);
    const facMsg = messages.find((m) => m.senderType === "facilitator");
    assert.ok(facMsg);
    assert.ok(facMsg.content.includes("Meetup Confirmed"));
  });
});
