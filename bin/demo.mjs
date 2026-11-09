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
        console.log(`Registered ${step.details.attendeeCount} diverse conference attendees:`);
        step.details.attendees.forEach((a) => {
          CliPresenter.renderAttendeeCard(a);
        });
      } else if (step.step === 2) {
        CliPresenter.renderIndexingBreakdown(step.details);
      } else if (step.step === 3) {
        console.log(`Executed Elasticsearch Hybrid Query combining dense_vector kNN (cosine) with BM25 multi_match.`);
        console.log(`Target Attendee: ${step.details.searchedFor}`);
        console.log(`Found Candidate: ${step.details.topCandidate} (${step.details.candidatesCount} retrieved in ${step.details.tookMs}ms)`);
        console.log(`Match Reason:    ${step.details.relevanceExplanation.headline}`);
        console.log(`Relevance:       ${step.details.relevanceExplanation.synergySummary}`);
      } else if (step.step === 4) {
        console.log(`Swipe Interface: Alex Chen swiped LIKE on Maya Lin. Maya Lin swiped LIKE on Alex Chen.`);
        console.log(`✨ Mutual Connection Established! Added to candidate pool (Match ID: ${step.details.matchId}).`);
      } else if (step.step === 5) {
        CliPresenter.renderPodBanner({
          name: step.details.podName,
          memberIds: step.details.memberIds,
          topic: step.details.topic,
          facilitatorName: "CINDER Facilitator (AI)"
        }, step.details.candidateRankings);
      } else if (step.step === 6) {
        CliPresenter.renderChannelCreated(step.details);
      } else if (step.step === 7) {
        CliPresenter.renderChatMessage(step.details.facilitatorName || "CINDER Facilitator (AI)", step.details.welcomeMessage, true, step.details.pinned);
        step.details.dialogue.forEach((msg) => {
          CliPresenter.renderChatMessage(msg.from, msg.text, false, false);
        });
      } else if (step.step === 8) {
        console.log(`💬 Physical meetup proposed by ${step.details.sender}:`);
        CliPresenter.renderChatMessage(step.details.sender, step.details.proposalMessage, false, false);
        console.log(`   Proposed Location: ${step.details.proposedLocation} | Time: ${step.details.proposedTime}`);
      } else if (step.step === 9) {
        console.log(`📍 AI Facilitator verified venue schedule & confirmed meetup:`);
        CliPresenter.renderChatMessage("CINDER Facilitator (AI)", step.details.facilitatorConfirmation, true, true);
        console.log(`   📌 Pinned Header: ${step.details.pinnedLocation} at ${step.details.meetupTime} [${step.details.status}]`);
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

