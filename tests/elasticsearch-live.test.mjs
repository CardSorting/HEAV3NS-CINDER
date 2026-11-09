/** [LAYER: INFRASTRUCTURE] */

// Opt-in integration tests against a real Elasticsearch cluster.
// Skipped unless ES_URL and ES_API_KEY are set in the process environment, so `npm test` stays offline.
// Run with: npm run test:live   (loads .env)
// Writes only to a temporary index that is created and deleted by this suite.

import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";

import { ElasticsearchClient, ElasticsearchError } from "../src/infrastructure/ElasticsearchClient.mjs";
import { resolveElasticConfig } from "../src/plumbing/elasticConfig.mjs";

const config = resolveElasticConfig(process.env);
const enabled = config.configured;
const DEMO_EVENT = process.env.CINDER_DEMO_EVENT_ID || "urn:ue:event:devsummit-2026";
const TEMP_INDEX = `cinder-live-test-${process.pid}`;

describe("Elasticsearch live cluster (opt-in)", { skip: enabled ? false : "set ES_URL and ES_API_KEY (npm run test:live)" }, () => {
  const es = new ElasticsearchClient({ config });

  before(async () => {
    await es.request("PUT", `/${TEMP_INDEX}`, {
      body: { mappings: { dynamic: "strict", properties: { id: { type: "keyword" }, eventId: { type: "keyword" }, n: { type: "integer" } } } }
    });
  });

  after(async () => {
    await es.request("DELETE", `/${TEMP_INDEX}`, { allow404: true });
  });

  it("detects the cluster as live via GET /", async () => {
    const health = await es.checkHealth();
    assert.strictEqual(health.live, true, `fallback reason: ${es.lastHealthError}`);
    assert.strictEqual((await es.getStatus()).mode, "live-cluster");
  });

  it("finds selectable CINDER events in the events index", async () => {
    const n = await es.count(config.indices.events, { term: { "cinder.enabled": true } });
    assert.ok(n > 0, "expected eventapp docs with cinder.enabled");
    const demo = await es.get(config.indices.events, DEMO_EVENT);
    assert.ok(demo, `demo event ${DEMO_EVENT} not found`);
    assert.strictEqual(demo.cinder.enabled, true);
  });

  it("returns stored 1024-dim vectors only when asked", async () => {
    const filter = { term: { eventId: DEMO_EVENT } };
    const without = await es.search(config.indices.registrations, { size: 1, query: filter });
    assert.ok(without.total > 0, "demo event has no registrations");
    assert.strictEqual(without.hits[0].source.embedding, undefined);
    const withVec = await es.search(config.indices.registrations, { size: 1, query: filter, _source: ["embedding"] }, { includeVectors: true });
    assert.strictEqual(withVec.hits[0].source.embedding.length, 1024);
  });

  it("embeds documents in the same space as the ingest pipeline", async () => {
    const text = "Senior Platform Engineer at Contoso. Interests: Kubernetes, eBPF.";
    const [direct] = await es.embed([text], { inputType: "ingest" });
    const sim = await es.request("POST", "/_ingest/pipeline/cinder-embed-prompt/_simulate", { body: { docs: [{ _source: { text } }] } });
    const piped = sim.docs[0].doc._source.embedding;
    const dot = direct.reduce((s, v, i) => s + v * piped[i], 0);
    const norm = Math.sqrt(direct.reduce((s, v) => s + v * v, 0) * piped.reduce((s, v) => s + v * v, 0));
    assert.ok(dot / norm > 0.999, `cosine ${dot / norm}`);
  });

  it("runs a kNN search with a query-side embedding filtered by event", async () => {
    const res = await es.search(config.indices.registrations, {
      size: 3,
      _source: ["name", "eventId"],
      knn: {
        field: "embedding", k: 3, num_candidates: 50, filter: { term: { eventId: DEMO_EVENT } },
        query_vector_builder: { text_embedding: { model_id: config.embedModel, model_text: "Kubernetes platform engineer" } }
      }
    });
    assert.strictEqual(res.hits.length, 3);
    assert.ok(res.hits.every((h) => h.source.eventId === DEMO_EVENT));
  });

  it("round-trips index, update, bulk and delete-by-query on a temporary index", async () => {
    await es.index(TEMP_INDEX, { id: "a", eventId: "e1", n: 1 }, { refresh: "wait_for" });
    await es.update(TEMP_INDEX, "a", { doc: { n: 2 } }, { refresh: "wait_for" });
    assert.strictEqual((await es.get(TEMP_INDEX, "a")).n, 2);
    const bulk = await es.bulk([
      { action: "index", index: TEMP_INDEX, id: "b", doc: { id: "b", eventId: "e1", n: 3 } },
      { action: "index", index: TEMP_INDEX, id: "c", doc: { id: "c", eventId: "e2", n: 4 } }
    ], { refresh: "wait_for" });
    assert.strictEqual(bulk.errors, false);
    assert.strictEqual(await es.count(TEMP_INDEX, { term: { eventId: "e1" } }), 2);
    const del = await es.deleteByQuery(TEMP_INDEX, { term: { eventId: "e1" } }, { refresh: true });
    assert.strictEqual(del.deleted, 2);
  });

  it("rejects fields outside a strict mapping with a typed error", async () => {
    await assert.rejects(() => es.index(TEMP_INDEX, { id: "x", unexpected: true }), (err) => {
      assert.ok(err instanceof ElasticsearchError);
      assert.strictEqual(err.type, "strict_dynamic_mapping_exception");
      return true;
    });
  });
});
