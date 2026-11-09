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

  it("checks in live attendees through the repository without a hashed embedding", async () => {
    const saved = [];
    let indexed = 0;
    const app = new CinderApp({ config: unreachable, clock, defaultEventId: DEMO,
      esClient: { legacyAttendeeIndex: false, async checkHealth() { return { live: true }; }, async indexAttendee() { indexed++; } } });
    app.attendeeRepo.save = async (a) => { saved.push(a.toJSON()); };
    assert.strictEqual(app.checkInCtrl.liveEmbeddings, true);
    const attendee = await app.checkInCtrl.checkIn({ name: "Live Person", title: "SRE", eventId: DEMO, embedding: [1, 2, 3] });
    assert.deepStrictEqual(attendee.embedding, [], "no 32-dim (or client-supplied) vector in live mode");
    assert.strictEqual(saved.length, 1);
    assert.strictEqual(saved[0].eventId, DEMO);
    assert.strictEqual(indexed, 0, "embedded engine is not fed in live mode");
    const offline = new CinderApp({ clock });
    const local = await offline.checkInCtrl.checkIn({ name: "Offline Person", title: "SRE" });
    assert.strictEqual(local.embedding.length, 32, "offline mode keeps the hashed embedding");
  });

  it("loads the requester's stored vector and passes it to the live retriever", async () => {
    const sentParams = [];
    const app = new CinderApp({ config: unreachable, clock, defaultEventId: DEMO,
      esClient: { legacyAttendeeIndex: false, async checkHealth() { return { live: true }; },
        async hybridSearch(p) { sentParams.push(p); return { hits: [], totalHits: 0, tookMs: 1, querySpec: {} }; } } });
    const options = [];
    app.attendeeRepo.findById = async (id, opts) => { options.push(opts); return { id, eventId: DEMO, interests: ["Kubernetes"], topics: [], projects: "", challenges: "",
      looking_for: "Observability engineers", embedding: Array(1024).fill(0.01) }; };
    app.interactionRepo.listSwipedIds = async () => ["att_seen"];
    await app.discoveryCtrl.getDiscoveryFeed("att_me", 5);
    assert.deepStrictEqual(options[0], { includeVectors: true });
    assert.strictEqual(sentParams[0].queryVector.length, 1024);
    assert.strictEqual(sentParams[0].eventId, DEMO);
    assert.strictEqual(sentParams[0].lookingForText, "Observability engineers");
    assert.deepStrictEqual(sentParams[0].excludeIds, ["att_me", "att_seen"]);
  });

  it("composes live pods by kNN around the seeds' centroid within the event", async () => {
    const sent = [];
    const app = new CinderApp({ config: unreachable, clock, defaultEventId: DEMO,
      esClient: { legacyAttendeeIndex: false, async checkHealth() { return { live: true }; },
        async hybridSearch(p) { sent.push(p); return { hits: [{ id: "att_c", score: 1, source: { id: "att_c", name: "C" } }], totalHits: 1, tookMs: 1, querySpec: {} }; } } });
    const vectors = { att_a: Array(1024).fill(0.2), att_b: Array(1024).fill(0.4) };
    app.attendeeRepo.findById = async (id) => ({ id, name: id, eventId: DEMO, interests: ["Kubernetes"], topics: [], expertise: [], embedding: vectors[id] || [], toJSON() { return { id }; } });
    app.attendeeRepo.listAll = async () => [];
    app.interactionRepo.listMutualMatches = async () => [];
    app.podRepo.save = async () => {};
    const pod = await app.podCtrl.composePod({ seedAttendeeIds: ["att_a", "att_b"], theme: "Platform", targetSize: 3 });
    assert.strictEqual(sent[0].eventId, DEMO);
    assert.strictEqual(sent[0].queryVector.length, 1024);
    // Centroid of [0.2…] and [0.4…] is [0.3…], normalized to unit length for cosine kNN: 1/sqrt(1024) each.
    assert.ok(sent[0].queryVector.every((v) => Math.abs(v - 1 / 32) < 1e-9), "query vector is the seeds' normalized centroid");
    assert.deepStrictEqual(sent[0].excludeIds, ["att_a", "att_b"]);
    assert.deepStrictEqual(pod.memberIds, ["att_a", "att_b", "att_c"]);
    assert.strictEqual(pod.eventId, DEMO);
  });

  it("facilitator uses the agenda, prompt and space repositories with the clock", async () => {
    const app = new CinderApp({ clock });   // offline seed event, demo clock frozen at 11:45 local
    await app.initialize();
    const pod = await app.podCtrl.composePod({ seedAttendeeIds: ["att_alex_chen", "att_maya_lin"], targetSize: 4 });
    const alert = await app.facilitatorCtrl.triggerAgendaAlert(pod.id);
    const next = alert.metadata.session;
    assert.strictEqual(next.startTime, "13:30", "next content session after 11:45 (lunch is not content)");
    assert.ok(Date.parse(next.startDate) > clock.nowMs());
    const prompt = await app.facilitatorCtrl.triggerDiscussionPrompt(pod.id);
    const seedPrompts = (await app.promptRepo.listByPhase("deep-dive")).map((x) => x.text);
    assert.ok(seedPrompts.some((p) => prompt.content.includes(p)), "prompt comes from the prompt repository");
    const explicit = await app.facilitatorCtrl.triggerAgendaAlert(pod.id, "session_02");
    assert.strictEqual(explicit.metadata.session.id, "session_02");
    const agenda = await app.facilitatorCtrl.getAgenda(app.defaultEventId);
    assert.strictEqual(agenda.sessions.length, 5);
    assert.strictEqual(agenda.venues.length, 4);
    assert.strictEqual(agenda.prompts.length, 3);
  });

  it("retries the startup probe with a longer timeout before falling back", async () => {
    const probes = [];
    let calls = 0;
    const flaky = { legacyAttendeeIndex: false, lastHealthError: "0 timeout",
      async checkHealth(timeoutMs) { probes.push(timeoutMs); return { live: ++calls > 1 }; } };
    const app = new CinderApp({ config: unreachable, clock, defaultEventId: DEMO, esClient: flaky });
    await app.initialize();
    assert.deepStrictEqual(probes, [5000, 5000]);
    assert.strictEqual(app.mode, "live", "a cold first probe does not drop the app to offline");
  });

  it("resolves meetup locations from the event's space aliases", async () => {
    const app = new CinderApp({ clock });
    await app.initialize();
    const pod = await app.podCtrl.composePod({ seedAttendeeIds: ["att_alex_chen", "att_maya_lin"], targetSize: 4 });
    const cases = [
      ["Shall we meet at the tech cafe for lunch?", "Tech Cafe (Booth 4)", "loc_tech_cafe"],
      ["lunch on the patio?", "Main Hall East Patio", "loc_east_patio"],
      ["meet in the garden lounge after the keynote", "Garden Networking Lounge", "loc_garden_lounge"]
    ];
    for (const [text, name, spaceId] of cases) {
      await app.commCtrl.sendMessage({ podId: pod.id, senderId: "att_alex_chen", content: text });
      const pinned = (await app.podRepo.findById(pod.id)).pinnedMeetup;
      assert.strictEqual(pinned.location, name, text);
      assert.strictEqual(pinned.spaceId, spaceId, text);
    }
    const before = (await app.podRepo.findById(pod.id)).messages.length;
    await app.commCtrl.sendMessage({ podId: pod.id, senderId: "att_alex_chen", content: "Great talk this morning!" });
    assert.strictEqual((await app.podRepo.findById(pod.id)).messages.length, before + 1, "no meetup confirmation for small talk");
  });
});
