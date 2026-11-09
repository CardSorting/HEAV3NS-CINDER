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
    assert.strictEqual(result.steps.length, 8); // Logged milestones (1, 3, 4, 5, 6, 7, 9, 10)
    assert.ok(recordedSteps.includes(1));
    assert.ok(recordedSteps.includes(10));

    const finalStatus = await app.getStatus();
    assert.strictEqual(finalStatus.attendeeCount, 5);
    assert.strictEqual(finalStatus.podCount, 1);
  });
});
