/** [LAYER: UI] */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { CinderApp } from "../src/core/CinderApp.mjs";
import { ScenarioRunner } from "../src/core/ScenarioRunner.mjs";
import { createClock } from "../src/plumbing/clock.mjs";
import { SEED_EVENT } from "../src/plumbing/conferenceSeedData.mjs";

describe("CINDER 10-Step Demonstration Scenario", () => {
  it("executes all 10 continuous demonstration steps cleanly (offline seed event, demo clock)", async () => {
    const app = new CinderApp({ clock: createClock({ demoTime: "2026-12-23T11:45:00-07:00", frozen: true }) });
    const runner = new ScenarioRunner(app);

    const recordedSteps = [];
    const result = await runner.runFullScenario({
      onStep: (step) => {
        recordedSteps.push(step.step);
      }
    });

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.mode, "offline");
    assert.strictEqual(result.eventId, SEED_EVENT.id);
    assert.ok(result.podId);
    assert.strictEqual(result.steps.length, 10);
    for (let i = 1; i <= 10; i++) {
      assert.ok(recordedSteps.includes(i), `Step ${i} must be recorded`);
    }
    const step = (n) => result.steps.find((s) => s.step === n).details;

    assert.strictEqual(step(1).castCount, 5);
    assert.strictEqual(step(2).totalDocsIndexed, 5);
    assert.strictEqual(step(2).mappings.embedding.type, "dense_vector");
    assert.strictEqual(step(2).mappings.embedding.dims, 32);

    assert.strictEqual(step(4).partner, "Maya Lin");
    assert.strictEqual(step(4).isMutual, true);
    assert.ok(step(5).memberIds.includes("att_alex_chen") && step(5).memberIds.includes("att_maya_lin"));
    assert.ok(step(6).channel.startsWith("#pod-"));

    // The meetup place and time come from the event's agenda and spaces, not the script.
    assert.strictEqual(step(8).sender, "Marcus Vance");
    assert.strictEqual(step(8).proposedLocation, "Main Hall East Patio");
    assert.strictEqual(step(8).proposedTime, "12:15 PM");
    assert.strictEqual(step(9).status, "CONFIRMED");
    assert.match(step(9).facilitatorConfirmation, /12:15 PM/);
    assert.ok(step(10).agendaAnnouncement);
    assert.ok(step(10).discussionPrompt);

    const finalStatus = await app.getStatus();
    assert.strictEqual(finalStatus.attendeeCount, 5);
    assert.strictEqual(finalStatus.podCount, 1);
  });

  it("explains how to seed an event that has no demo attendees", async () => {
    const app = new CinderApp();
    await app.initialize();
    app.attendeeRepo.listAll = async () => [];
    await assert.rejects(() => new ScenarioRunner(app).runFullScenario(), /seed:demo/);
  });
});
