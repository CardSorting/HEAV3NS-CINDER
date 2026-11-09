/** [LAYER: INFRASTRUCTURE] */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { ElasticsearchEventRepository, eventappToProps } from "../src/infrastructure/ElasticsearchEventRepository.mjs";
import { ElasticsearchAttendeeRepository, toRegistrationDoc } from "../src/infrastructure/ElasticsearchAttendeeRepository.mjs";
import { ElasticsearchInteractionRepository, swipeDocId } from "../src/infrastructure/ElasticsearchInteractionRepository.mjs";
import { ElasticsearchMessageRepository } from "../src/infrastructure/ElasticsearchMessageRepository.mjs";
import { ElasticsearchPodRepository } from "../src/infrastructure/ElasticsearchPodRepository.mjs";
import { ElasticsearchAgendaRepository, fromSessionDoc } from "../src/infrastructure/ElasticsearchAgendaRepository.mjs";
import { ElasticsearchSpaceRepository } from "../src/infrastructure/ElasticsearchSpaceRepository.mjs";
import { ElasticsearchAnnouncementRepository } from "../src/infrastructure/ElasticsearchAnnouncementRepository.mjs";
import { ElasticsearchPromptRepository } from "../src/infrastructure/ElasticsearchPromptRepository.mjs";
import { buildDiscoveryQuery, parseRetrieverRanks } from "../src/infrastructure/discoveryRetriever.mjs";

const EV = "urn:ue:event:devsummit-2026";
const MAPPINGS = JSON.parse(readFileSync(new URL("../elasticsearch/cinder/indices.json", import.meta.url), "utf8"));

/** Fails if `doc` has a field the strict mapping of `index` does not declare. */
function assertFitsMapping(index, doc, props = MAPPINGS[index].mappings.properties, path = "") {
  for (const [key, value] of Object.entries(doc)) {
    const field = props[key];
    assert.ok(field, `${index}: field "${path}${key}" is not in the strict mapping`);
    if (field.type === "flattened" || field.enabled === false) continue;
    if (field.properties && value && typeof value === "object" && !Array.isArray(value)) {
      assertFitsMapping(index, value, field.properties, `${path}${key}.`);
    }
    if (field.type === "dense_vector") assert.strictEqual(value.length, field.dims, `${index}: ${path}${key} dims`);
  }
}

/** Fake IElasticsearchClient recording calls; `routes` answers search/get by index. */
function fakeClient({ search = () => [], get = () => null } = {}) {
  const calls = [];
  const hitsOf = (docs) => ({ hits: docs.map((d) => ({ id: d.id, score: 1, source: d })), total: docs.length, tookMs: 1 });
  return {
    calls,
    async search(index, body, opts) { calls.push({ op: "search", index, body, opts }); return hitsOf(search(index, body) || []); },
    async get(index, id, opts) { calls.push({ op: "get", index, id, opts }); return get(index, id) ?? null; },
    async index(index, doc, opts) { calls.push({ op: "index", index, doc, opts }); return { id: opts.id, result: "created" }; },
    async deleteByQuery(index, query, opts) { calls.push({ op: "deleteByQuery", index, query, opts }); return { deleted: 2 }; },
    of: (op) => calls.filter((c) => c.op === op)
  };
}

const vec = (n = 1024) => Array.from({ length: n }, (_, i) => i / n);

describe("ElasticsearchEventRepository", () => {
  const doc = {
    "@id": EV, name: "DevSummit 2026", category: "conference", startDate: "2026-12-23T09:00:00-07:00", endDate: "2026-12-25T17:30:00-07:00",
    timezone: "America/Denver", eventStatus: "EventScheduled", eventAttendanceMode: "MixedEventAttendanceMode", labels: ["devops"],
    location: [{ "@type": "VirtualLocation", url: "x" }, { "@id": "urn:ue:place:salt-palace", "@type": "ConventionCenter", name: "Salt Palace",
      address: { addressLocality: "Salt Lake City", addressRegion: "UT", addressCountry: "US" }, geo: { latitude: 40.7, longitude: -111.9 } }],
    cinder: { enabled: true, registrations: 160 }
  };

  it("queries selectable events with category, date window and cancellation filters", async () => {
    const es = fakeClient({ search: () => [doc] });
    const repo = new ElasticsearchEventRepository({ esClient: es, index: "eventapp", toEntity: (p) => ({ entity: p }) });
    const list = await repo.listSelectable({ categories: ["meetup"], from: "2026-12-01", to: "2026-12-31", limit: 5 });
    const { body } = es.of("search")[0];
    assert.deepStrictEqual(body.query.bool.filter, [
      { term: { "cinder.enabled": true } }, { terms: { category: ["meetup"] } },
      { range: { endDate: { gte: "2026-12-01" } } }, { range: { startDate: { lte: "2026-12-31" } } }
    ]);
    assert.deepStrictEqual(body.query.bool.must_not, [{ term: { eventStatus: "EventCancelled" } }]);
    assert.strictEqual(body.size, 5);
    assert.strictEqual(list[0].entity.id, EV);
  });

  it("maps the first physical location to the venue and skips virtual ones", () => {
    const p = eventappToProps(doc);
    assert.deepStrictEqual(p.venue, { id: "urn:ue:place:salt-palace", name: "Salt Palace", city: "Salt Lake City", region: "UT", country: "US", lat: 40.7, lon: -111.9 });
    assert.strictEqual(p.attendanceMode, "MixedEventAttendanceMode");
    assert.strictEqual(eventappToProps({ ...doc, location: [{ "@type": "VirtualLocation" }] }).venue, null);
  });

  it("returns null for missing or non-selectable categories", async () => {
    const repo = new ElasticsearchEventRepository({ esClient: fakeClient({ get: (i, id) => (id === "concert" ? { ...doc, category: "concert" } : null) }), index: "eventapp" });
    assert.strictEqual(await repo.findById("concert"), null);
    assert.strictEqual(await repo.findById("missing"), null);
  });
});

describe("ElasticsearchAttendeeRepository", () => {
  const attendee = {
    id: "att_alex_chen", name: "Alex Chen", title: "Platform Engineer", company: "", bio: "", interests: ["Kubernetes"], expertise: ["Go"],
    projects: "", challenges: "", looking_for: "", topics: [], embedding: vec(32), searchText: "stale", checked_in_at: "2026-12-23T08:30:00Z", eventId: null,
    toJSON() { const { toJSON, ...rest } = this; return rest; }
  };

  it("writes a strict-mapping registration: eventId/personId/role added, hashed embedding and searchText dropped, refresh=true", async () => {
    const es = fakeClient();
    await new ElasticsearchAttendeeRepository({ esClient: es, index: "cinder-registrations", defaultEventId: EV }).save(attendee);
    const { doc, opts } = es.of("index")[0];
    assert.strictEqual(doc.eventId, EV);
    assert.strictEqual(doc.personId, "att_alex_chen");
    assert.strictEqual(doc.role, "attendee");
    assert.ok(!("embedding" in doc) && !("searchText" in doc));
    assert.deepStrictEqual(opts, { id: "att_alex_chen", refresh: "true" });
    assertFitsMapping("cinder-registrations", doc);
  });

  it("refuses to save without an event and keeps an explicit eventId", () => {
    assert.throws(() => toRegistrationDoc({ id: "x", name: "X" }), /no eventId/);
    assert.strictEqual(toRegistrationDoc({ id: "x", name: "X", eventId: "e2" }, EV).eventId, "e2");
  });

  it("scopes reads by event and only loads vectors on request", async () => {
    const stored = { id: "att_1", name: "A", eventId: EV, searchText: "t", embedding: vec() };
    const es = fakeClient({ get: () => stored, search: () => [stored] });
    const repo = new ElasticsearchAttendeeRepository({ esClient: es, index: "cinder-registrations", defaultEventId: EV });
    assert.strictEqual(await repo.findById("att_1", { eventId: "urn:ue:event:other" }), null);
    assert.deepStrictEqual((await repo.findById("att_1")).embedding, []);
    assert.strictEqual((await repo.findById("att_1", { includeVectors: true })).embedding.length, 1024);
    assert.strictEqual(es.of("get")[2].opts.includeVectors, true);
    const list = await repo.listAll();
    assert.deepStrictEqual(es.of("search")[0].body.query.bool.filter, [{ term: { eventId: EV } }]);
    assert.ok(!("searchText" in list[0]));
    await assert.rejects(() => new ElasticsearchAttendeeRepository({ esClient: es, index: "i" }).listAll(), /requires an eventId/);
  });
});

describe("ElasticsearchInteractionRepository", () => {
  const swipe = { id: "m1", initiatorId: "maya", targetId: "alex", action: "like", mutual: true, explanation: "Both on eBPF", createdAt: "2026-12-23T18:50:00Z", eventId: EV };

  it("stores one strict-mapping document per directed swipe with a deterministic id", async () => {
    const es = fakeClient();
    await new ElasticsearchInteractionRepository({ esClient: es, index: "cinder-interactions" }).saveSwipe(swipe);
    const { doc, opts } = es.of("index")[0];
    assert.strictEqual(opts.id, swipeDocId(EV, "maya", "alex"));
    assert.strictEqual(opts.refresh, "true");
    assertFitsMapping("cinder-interactions", doc);
  });

  it("never deletes mutual matches on reset and scopes queries by event", async () => {
    const es = fakeClient();
    const repo = new ElasticsearchInteractionRepository({ esClient: es, index: "cinder-interactions", defaultEventId: EV });
    await repo.deleteSwipes(undefined, "alex", { action: "pass" });
    const { query } = es.of("deleteByQuery")[0];
    assert.deepStrictEqual(query.bool.must_not, [{ term: { mutual: true } }]);
    assert.deepStrictEqual(query.bool.filter, [{ term: { eventId: EV } }, { term: { initiatorId: "alex" } }, { term: { action: "pass" } }]);
    await repo.listMutualMatches(EV, "alex");
    const mm = es.of("search")[0].body.query.bool;
    assert.strictEqual(mm.minimum_should_match, 1);
    assert.deepStrictEqual(mm.should, [{ term: { initiatorId: "alex" } }, { term: { targetId: "alex" } }]);
  });
});

describe("ElasticsearchMessageRepository", () => {
  it("writes strict-mapping pod and direct messages on separate channels", async () => {
    const es = fakeClient();
    const repo = new ElasticsearchMessageRepository({ esClient: es, index: "cinder-messages", defaultEventId: EV });
    await repo.appendPodMessage({ id: "p1", podId: "pod_07", senderId: "a", senderName: "A", senderType: "attendee", content: "hi",
      timestamp: "2026-12-23T18:50:00Z", pinned: false, metadata: { type: "agenda_alert", session: { id: "s1", speakers: [] } }, eventId: null });
    await repo.appendDirectMessage({ id: "dm1", matchId: "m1", senderId: "a", senderName: "A", content: "coffee?" });
    const [pod, dm] = es.of("index").map((c) => c.doc);
    assert.strictEqual(pod.channel, "pod");
    assert.strictEqual(pod.eventId, EV);
    assert.strictEqual(dm.channel, "direct");
    assert.strictEqual(dm.matchId, "m1");
    assertFitsMapping("cinder-messages", pod);
    assertFitsMapping("cinder-messages", dm);
    await assert.rejects(() => repo.appendDirectMessage({ id: "x", content: "no match" }), /requires id, matchId and content/);
  });

  it("returns the newest messages in chronological order", async () => {
    const newestFirst = [{ id: "p3", timestamp: "3", channel: "pod" }, { id: "p2", timestamp: "2", channel: "pod" }];
    const es = fakeClient({ search: () => newestFirst });
    const out = await new ElasticsearchMessageRepository({ esClient: es, index: "cinder-messages" }).listPodMessages("pod_07", { limit: 2 });
    assert.deepStrictEqual(out.map((m) => m.id), ["p2", "p3"]);
    assert.ok(!("channel" in out[0]));
    assert.deepStrictEqual(es.of("search")[0].body.sort, [{ timestamp: "desc" }, { id: "desc" }]);
  });
});

describe("ElasticsearchPodRepository", () => {
  it("saves a strict-mapping pod without messages and appends only new messages", async () => {
    const es = fakeClient();
    const appended = [];
    const messageRepo = { appendPodMessage: async (m) => appended.push(m.id), listPodMessages: async () => [] };
    const repo = new ElasticsearchPodRepository({ esClient: es, index: "cinder-pods", messageRepo, defaultEventId: EV });
    const pod = {
      id: "pod_07", name: "Pod 07", topic: "Infra", memberIds: ["a", "b"], pinnedAnnouncements: [], facilitatorName: "F", createdAt: "2026-12-23T18:00:00Z",
      eventId: EV, pinnedMeetup: { location: "East Terrace", time: "12:15 PM", confirmed: true, rsvps: ["a"] },
      compositionMeta: { theme: "Infra", candidateRankings: [{ id: "x" }] }, centroid: vec(),
      messages: [{ id: "w1", eventId: null }]
    };
    await repo.save(pod);
    pod.messages.push({ id: "c1", eventId: EV });
    await repo.save(pod);
    assert.deepStrictEqual(appended, ["w1", "c1"]);
    const { doc } = es.of("index")[0];
    assert.ok(!("messages" in doc));
    assertFitsMapping("cinder-pods", doc);
    pod.centroid = vec(32);
    await repo.save(pod);
    assert.ok(!("centroid" in es.of("index")[2].doc), "wrong-size centroid is skipped");
  });

  it("hydrates pods with messages, compositionMeta and centroid", async () => {
    const stored = { id: "pod_07", name: "Pod 07", topic: "Infra", eventId: EV, status: "active", compositionMeta: { tookMs: 3 }, centroid: vec() };
    const es = fakeClient({ get: () => stored });
    const messageRepo = { listPodMessages: async () => [{ id: "w1" }], appendPodMessage: async () => assert.fail("no re-append") };
    const repo = new ElasticsearchPodRepository({ esClient: es, index: "cinder-pods", messageRepo, toEntity: (p) => ({ ...p }) });
    const pod = await repo.findById("pod_07");
    assert.deepStrictEqual(pod.messages, [{ id: "w1" }]);
    assert.strictEqual(pod.compositionMeta.tookMs, 3);
    assert.strictEqual(pod.centroid.length, 1024);
    await repo.save({ ...pod, toJSON: undefined });
  });
});

describe("ElasticsearchAgendaRepository", () => {
  const s = { id: "s1", eventId: EV, title: "Lunch & Pod Meetups", sessionType: "lunch", startDate: "2026-12-23T12:15:00-07:00",
    endDate: "2026-12-23T13:30:00-07:00", timezone: "America/Denver", roomName: "Exhibit Hall", spaceId: "space:x:exhibit-hall", speakerNames: [] };

  it("maps session documents to Session props with local display times", () => {
    assert.deepStrictEqual(fromSessionDoc(s), {
      id: "s1", title: "Lunch & Pod Meetups", speakers: [], startTime: "12:15", endTime: "13:30", room: "Exhibit Hall", track: "Lunch",
      description: "", startDate: s.startDate, endDate: s.endDate, timezone: "America/Denver", sessionType: "lunch", spaceId: "space:x:exhibit-hall"
    });
  });

  it("finds the next social slot after a clock time and relevant content sessions by vector", async () => {
    const es = fakeClient({ search: () => [s] });
    const repo = new ElasticsearchAgendaRepository({ esClient: es, index: "cinder-sessions" });
    assert.strictEqual((await repo.findNextSocialSlot(EV, 1000)).id, "s1");
    const f = es.of("search")[0].body.query.bool.filter;
    assert.ok(f.some((c) => c.terms?.sessionType?.includes("lunch")));
    assert.deepStrictEqual(f.at(-1), { range: { startDate: { gte: 1000, format: "epoch_millis" } } });
    await repo.findRelevant(EV, vec(), { afterMs: 5, limit: 2 });
    const knn = es.of("search")[1].body.knn;
    assert.strictEqual(knn.k, 2);
    assert.ok(knn.filter.bool.filter.some((c) => c.terms?.sessionType?.includes("talk")));
  });
});

describe("ElasticsearchSpaceRepository", () => {
  it("lists a venue's spaces (looking the venue up once) and an online event's own spaces", async () => {
    const events = {
      [EV]: { location: [{ "@type": "VirtualLocation" }, { "@id": "urn:ue:place:salt-palace", "@type": "ConventionCenter" }] },
      online: { location: [{ "@type": "VirtualLocation" }] }
    };
    const es = fakeClient({ get: (i, id) => events[id], search: () => [] });
    const repo = new ElasticsearchSpaceRepository({ esClient: es, index: "cinder-spaces", eventsIndex: "eventapp" });
    await repo.listForEvent(EV, { meetupFriendlyOnly: true });
    await repo.listForEvent(EV);
    await repo.listForEvent("online");
    assert.strictEqual(es.of("get").length, 2, "venue looked up once per event");
    assert.deepStrictEqual(es.of("search")[0].body.query.bool.filter, [{ term: { venueId: "urn:ue:place:salt-palace" } }, { term: { meetupFriendly: true } }]);
    assert.deepStrictEqual(es.of("search")[2].body.query.bool.filter, [{ term: { eventId: "online" } }]);
    await assert.rejects(() => repo.listForEvent("nope"), /Unknown event/);
  });
});

describe("ElasticsearchAnnouncementRepository and ElasticsearchPromptRepository", () => {
  it("filters announcements by publish time and affected refs", async () => {
    const es = fakeClient();
    const repo = new ElasticsearchAnnouncementRepository({ esClient: es, index: "cinder-announcements" });
    assert.deepStrictEqual(await repo.listAffecting(EV, {}, 1), []);
    assert.strictEqual(es.calls.length, 0, "no query without refs");
    await repo.listAffecting(EV, { sessionIds: ["s1"], spaceIds: ["sp1"] }, 99);
    const q = es.of("search")[0].body.query.bool;
    assert.deepStrictEqual(q.should, [{ terms: { "affects.sessionIds": ["s1"] } }, { terms: { "affects.spaceIds": ["sp1"] } }]);
    assert.deepStrictEqual(q.filter[1], { range: { publishAt: { lte: 99, format: "epoch_millis" } } });
  });

  it("finds prompts by vector within a phase", async () => {
    const es = fakeClient({ search: () => [{ id: "p", text: "Q?", phase: "deep-dive", topics: ["cloud"], embedding: [1] }] });
    const out = await new ElasticsearchPromptRepository({ esClient: es, index: "cinder-prompts" }).findForVector(vec(), { phase: "deep-dive" });
    assert.deepStrictEqual(out, [{ id: "p", text: "Q?", phase: "deep-dive", topics: ["cloud"] }]);
    assert.deepStrictEqual(es.of("search")[0].body.knn.filter, { term: { phase: "deep-dive" } });
  });
});

describe("Live discovery retriever (buildDiscoveryQuery)", () => {
  const base = { eventId: EV, queryText: "Kubernetes eBPF", lookingForText: "observability engineers", embedModel: ".m", excludeIds: ["att_me", "att_seen"], limit: 5 };
  const inner = (body) => body.retriever.rrf.retrievers.map((r) => r.retriever);

  it("fuses BM25, profile kNN and the looking_for signals with weighted RRF", () => {
    const { body, retrievers, weights } = buildDiscoveryQuery({ ...base, profileVector: vec() });
    assert.deepStrictEqual(retrievers, ["bm25", "profile_knn", "looking_for_knn", "looking_for_bm25"]);
    assert.deepStrictEqual(body.retriever.rrf.retrievers.map((r) => r.weight), [1, 1, 3, 2]);
    assert.deepStrictEqual(weights, { bm25: 1, profile_knn: 1, looking_for_knn: 3, looking_for_bm25: 2 });
    const [, profile, lfKnn, lfBm25] = inner(body);
    assert.strictEqual(profile.knn.query_vector.length, 1024);
    assert.deepStrictEqual(lfKnn.knn.query_vector_builder, { text_embedding: { model_id: ".m", model_text: "observability engineers" } });
    assert.strictEqual(lfBm25.standard.query.bool.should[0].multi_match.query, "observability engineers");
    assert.ok(lfBm25.standard.query.bool.should[0].multi_match.fields.includes("title^3"));
    assert.strictEqual(body.size, 5);
    assert.deepStrictEqual(body._source.excludes, ["searchText", "embedding"]);
  });

  it("weights the looking_for signals above profile similarity, and accepts overrides", () => {
    const { weights } = buildDiscoveryQuery({ ...base, profileVector: vec() });
    assert.ok(weights.looking_for_knn > weights.profile_knn && weights.looking_for_bm25 > weights.bm25);
    const custom = buildDiscoveryQuery({ ...base, profileVector: vec(), weights: { looking_for_knn: 5 } });
    assert.deepStrictEqual(custom.body.retriever.rrf.retrievers.map((r) => r.weight), [1, 1, 5, 2]);
  });

  it("filters every retriever to the event and excludes self and swiped attendees", () => {
    const { body } = buildDiscoveryQuery({ ...base, profileVector: vec() });
    const [bm25, profile, lfKnn, lfBm25] = inner(body);
    for (const f of [bm25.standard.query.bool, profile.knn.filter.bool, lfKnn.knn.filter.bool, lfBm25.standard.query.bool]) {
      assert.deepStrictEqual(f.filter, [{ term: { eventId: EV } }]);
      assert.deepStrictEqual(f.must_not, [{ ids: { values: ["att_me", "att_seen"] } }]);
    }
  });

  it("drops retrievers without input and requires an event", () => {
    assert.deepStrictEqual(buildDiscoveryQuery({ ...base, profileVector: [] }).retrievers, ["bm25", "looking_for_knn", "looking_for_bm25"]);
    const single = buildDiscoveryQuery({ ...base, queryText: "", lookingForText: "", profileVector: vec() });
    assert.ok(single.body.retriever.knn, "a single retriever is used directly, without RRF");
    assert.throws(() => buildDiscoveryQuery({ ...base, eventId: null }), /requires an eventId/);
    assert.throws(() => buildDiscoveryQuery({ ...base, queryText: "", lookingForText: "" }), /needs query text/);
  });
});

describe("parseRetrieverRanks", () => {
  const names = ["bm25", "profile_knn", "looking_for_knn", "looking_for_bm25"];
  it("maps RRF explain initial ranks to retriever names", () => {
    const explanation = { description: "rrf score: [0.0999] computed for initial ranks [27, 19, 2, 13] with rankConstant: [60] as sum of ..." };
    assert.deepStrictEqual(parseRetrieverRanks(explanation, names), { bm25: 27, profile_knn: 19, looking_for_knn: 2, looking_for_bm25: 13 });
  });
  it("returns null for retrievers that did not return the hit and for missing explanations", () => {
    assert.deepStrictEqual(parseRetrieverRanks({ description: "computed for initial ranks [-, 4, -, 1] with" }, names),
      { bm25: null, profile_knn: 4, looking_for_knn: null, looking_for_bm25: 1 });
    assert.deepStrictEqual(parseRetrieverRanks(undefined, ["bm25"]), { bm25: null });
  });
});

