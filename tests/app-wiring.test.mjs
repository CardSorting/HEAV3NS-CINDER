/** [LAYER: UI] */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { CinderApp } from "../src/core/CinderApp.mjs";
import { resolveElasticConfig } from "../src/plumbing/elasticConfig.mjs";
import { createClock } from "../src/plumbing/clock.mjs";
import { SEED_EVENT } from "../src/plumbing/conferenceSeedData.mjs";

const DEMO = "urn:ue:event:devsummit-2026";
const unreachable = resolveElasticConfig({ ES_URL: "http://127.0.0.1:9", ES_API_KEY: "dGVzdA==" });
const clock = createClock({ demoTime: "2026-12-23T11:45:00-07:00", frozen: true });

describe("CinderApp composition root", () => {
  it("runs offline on seed data when no cluster is configured", async () => {
    const app = new CinderApp({ clock });
    await app.initialize();
    assert.strictEqual(app.mode, "offline");
    assert.strictEqual(app.defaultEventId, SEED_EVENT.id);
    const event = await app.eventCtrl.resolveEvent();
    assert.strictEqual(event.name, "Cloud & AI Summit 2026");
    const attendees = await app.attendeeRepo.listAll(SEED_EVENT.id);
    assert.strictEqual(attendees.length, 5, "seed attendees are registered for the seed event");
    const sessions = await app.agendaRepo.listByEvent(SEED_EVENT.id);
    assert.strictEqual(sessions.length, 5);
    const lunch = await app.agendaRepo.findNextSocialSlot(SEED_EVENT.id, clock.nowMs());
    assert.strictEqual(lunch.startTime, "12:15");
    assert.strictEqual(lunch.isSocialSlot(), true);
    const spaces = await app.spaceRepo.listForEvent(SEED_EVENT.id, { meetupFriendlyOnly: true });
    assert.strictEqual(spaces.length, 4);
    assert.ok(spaces.some((s) => s.mentionedIn("meet on the patio?") > 0));
    const status = await app.getStatus();
    assert.strictEqual(status.dataMode, "offline");
    assert.strictEqual(status.requestedMode, "offline");
  });

  it("wires the Elasticsearch repositories in live mode without the legacy 32-dim index", () => {
    const app = new CinderApp({ config: unreachable, clock, defaultEventId: DEMO });
    assert.strictEqual(app.mode, "live");
    assert.strictEqual(app.defaultEventId, DEMO);
    assert.strictEqual(app.esClient.legacyAttendeeIndex, false);
    for (const [repo, name] of [
      [app.eventRepo, "ElasticsearchEventRepository"], [app.attendeeRepo, "ElasticsearchAttendeeRepository"],
      [app.podRepo, "ElasticsearchPodRepository"], [app.messageRepo, "ElasticsearchMessageRepository"],
      [app.interactionRepo, "ElasticsearchInteractionRepository"], [app.agendaRepo, "ElasticsearchAgendaRepository"],
      [app.spaceRepo, "ElasticsearchSpaceRepository"], [app.announcementRepo, "ElasticsearchAnnouncementRepository"],
      [app.promptRepo, "ElasticsearchPromptRepository"]
    ]) assert.strictEqual(repo.constructor.name, name);
    assert.strictEqual(app.attendeeRepo.defaultEventId, DEMO);
  });

  it("falls back to offline seed data when the configured cluster is unreachable", async () => {
    const app = new CinderApp({ config: unreachable, clock, defaultEventId: DEMO });
    await app.initialize();
    assert.strictEqual(app.mode, "offline");
    assert.match(app.fallbackReason, /network_error|timeout/);
    assert.strictEqual(app.defaultEventId, SEED_EVENT.id);
    const status = await app.getStatus();
    assert.strictEqual(status.requestedMode, "live");
    assert.strictEqual(status.dataMode, "offline");
    assert.strictEqual(status.attendeeCount, 5);
  });

  it("stays live when the cluster answers and can be forced offline", async () => {
    const liveClient = {
      legacyAttendeeIndex: false,
      async checkHealth() { return { live: true }; },
      async getStatus() { return { live: true, mode: "live-cluster" }; }
    };
    const live = new CinderApp({ config: unreachable, clock, defaultEventId: DEMO, esClient: liveClient });
    const init = await live.initialize();
    assert.strictEqual(live.mode, "live");
    assert.strictEqual(init.seededAttendeesCount, 0, "live mode does not seed the index on boot");
    const forced = new CinderApp({ config: unreachable, clock, forceOffline: true });
    assert.strictEqual(forced.mode, "offline");
  });
});
