#!/usr/bin/env node
/** [LAYER: UI] */

import { CinderApp } from "../src/core/CinderApp.mjs";
import { ScenarioRunner } from "../src/core/ScenarioRunner.mjs";
import { CliPresenter } from "../src/ui/cli/cliPresenter.mjs";

async function main() {
  CliPresenter.banner();
  console.log("Starting CINDER Hackathon Demonstration Scenario (10 Continuous Steps)...\n");

  const app = new CinderApp();
  const runner = new ScenarioRunner(app);

  const result = await runner.runFullScenario({
    onStep: (step) => {
      CliPresenter.renderStepHeader(step.step, step.title);

      if (step.step === 1) {
        console.log(`Indexed ${step.details.attendeeCount} diverse attendees into Elasticsearch (dense_vector 32-dim + BM25 text index).`);
        step.details.attendees.forEach((a) => {
          CliPresenter.renderAttendeeCard(a);
        });
      } else if (step.step === 3) {
        console.log(`Executed Elasticsearch Hybrid Query combining dense_vector kNN (cosine) with BM25 multi_match.`);
        console.log(`Found candidate: ${step.details.topCandidate}`);
        console.log(`Match Reason: ${step.details.relevanceExplanation.headline}`);
        console.log(`Relevance:    ${step.details.relevanceExplanation.synergySummary}`);
      } else if (step.step === 4) {
        console.log(`Swipe Interface: Alex swiped LIKE on Maya. Maya swiped LIKE on Alex.`);
        console.log(`✨ Mutual Connection Established! Added to candidate pool.`);
      } else if (step.step === 5) {
        CliPresenter.renderPodBanner({
          name: step.details.podName,
          memberIds: new Array(step.details.memberCount).fill(0),
          topic: step.details.topic,
          facilitatorName: "CINDER Facilitator (AI)"
        });
      } else if (step.step === 6) {
        CliPresenter.renderChatMessage(step.details.sender, step.details.welcomeMessage, true, step.details.pinned);
      } else if (step.step === 7) {
        step.details.dialogue.forEach((msg) => {
          CliPresenter.renderChatMessage(msg.from, msg.text, false, false);
        });
      } else if (step.step === 9) {
        console.log(`📍 Facilitator detected lunch coordination in chat.`);
        console.log(`Pinned Meetup Location: ${step.details.pinnedLocation} at ${step.details.meetupTime}`);
      } else if (step.step === 10) {
        CliPresenter.renderChatMessage("CINDER Facilitator (AI)", step.details.agendaAnnouncement, true, true);
        CliPresenter.renderChatMessage("CINDER Facilitator (AI)", step.details.discussionPrompt, true, false);
      }
    }
  });

  const status = await app.getStatus();
  CliPresenter.renderSummary(status);
}

main().catch((err) => {
  console.error("Error executing demo:", err);
  process.exit(1);
});
