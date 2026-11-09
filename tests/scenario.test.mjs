/** [LAYER: UI] */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { CinderApp } from "../src/core/CinderApp.mjs";
import { ScenarioRunner } from "../src/core/ScenarioRunner.mjs";

describe("CINDER 10-Step Demonstration Scenario", () => {
  it("executes all 10 continuous demonstration steps cleanly", async () => {
    const app = new CinderApp();
    const runner = new ScenarioRunner(app);

    const recordedSteps = [];
    const result = await runner.runFullScenario({
      onStep: (step) => {
        recordedSteps.push(step.step);
      }
    });

    assert.strictEqual(result.success, true);
    assert.ok(result.podId);
    assert.strictEqual(result.steps.length, 10);
    for (let i = 1; i <= 10; i++) {
      assert.ok(recordedSteps.includes(i), `Step ${i} must be recorded`);
    }

    const step2 = result.steps.find((s) => s.step === 2);
    assert.ok(step2);
    assert.strictEqual(step2.details.totalDocsIndexed, 5);
    assert.strictEqual(step2.details.mappings.embedding.type, "dense_vector");
    assert.strictEqual(step2.details.mappings.embedding.dims, 32);

    const step8 = result.steps.find((s) => s.step === 8);
    assert.ok(step8);
    assert.ok(step8.details.proposalMessage.includes("Main Hall East Patio"));
    assert.strictEqual(step8.details.proposedTime, "12:15 PM");

    const finalStatus = await app.getStatus();
    assert.strictEqual(finalStatus.attendeeCount, 5);
    assert.strictEqual(finalStatus.podCount, 1);
  });
});

