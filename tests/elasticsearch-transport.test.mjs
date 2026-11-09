/** [LAYER: INFRASTRUCTURE] */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { ElasticsearchClient, ElasticsearchError } from "../src/infrastructure/ElasticsearchClient.mjs";

const CONFIG = { url: "https://es.example:443/", apiKey: "dGVzdDprZXk=", embedModel: ".test-embed" };

/** Mock fetch that records calls and answers from a route table: (method, path) -> { status, body } */
function mockFetch(routes) {
  const calls = [];
  const impl = async (url, init) => {
    const path = url.replace("https://es.example:443", "");
    calls.push({ url, path, method: init.method, headers: init.headers, body: init.body });
    const route = routes(init.method, path, init);
    if (route instanceof Error) throw route;
    if (route === "hang") {
      return new Promise((_, reject) => init.signal.addEventListener("abort", () => reject(init.signal.reason)));
    }
    const { status = 200, body = {}, text } = route;
    return new Response(text !== undefined ? text : JSON.stringify(body), { status });
  };
  return { impl, calls };
}

const clusterInfo = { cluster_name: "abc", version: { number: "9.7.0", build_flavor: "serverless" } };

describe("ElasticsearchClient live transport (mocked fetch)", () => {
  it("sends the ApiKey authorization header and JSON content type", async () => {
    const { impl, calls } = mockFetch(() => ({ body: { count: 7 } }));
    const es = new ElasticsearchClient({ config: CONFIG, fetchImpl: impl });
    assert.strictEqual(await es.count("cinder-registrations", { term: { eventId: "e1" } }), 7);
    assert.strictEqual(calls[0].url, "https://es.example:443/cinder-registrations/_count");
    assert.strictEqual(calls[0].headers.Authorization, "ApiKey dGVzdDprZXk=");
    assert.strictEqual(calls[0].headers["Content-Type"], "application/json");
    assert.deepStrictEqual(JSON.parse(calls[0].body), { query: { term: { eventId: "e1" } } });
  });

  it("omits the authorization header when no API key is configured", async () => {
    const { impl, calls } = mockFetch(() => ({ body: clusterInfo }));
    const es = new ElasticsearchClient({ nodeUrl: "http://localhost:9200", fetchImpl: impl });
    await es.checkHealth();
    assert.strictEqual(calls[0].headers.Authorization, undefined);
  });

  it("probes GET / and reports a serverless cluster as live", async () => {
    const { impl, calls } = mockFetch((m, p) => (m === "GET" && p === "/" ? { body: clusterInfo } : { status: 410, body: {} }));
    const es = new ElasticsearchClient({ config: CONFIG, fetchImpl: impl });
    const health = await es.checkHealth();
    assert.strictEqual(calls[0].path, "/");
    assert.strictEqual(health.live, true);
    assert.strictEqual(health.serverless, true);
    const status = await es.getStatus();
    assert.strictEqual(status.mode, "live-cluster");
    assert.strictEqual(status.version, "9.7.0");
  });

  it("uses a cloud-friendly probe timeout when an API key is set", () => {
    assert.strictEqual(new ElasticsearchClient({ config: CONFIG }).healthTimeoutMs, 2000);
    assert.strictEqual(new ElasticsearchClient({ nodeUrl: "http://localhost:9200" }).healthTimeoutMs, 250);
  });

  it("raises a typed timeout error when a request exceeds its timeout", async () => {
    const { impl } = mockFetch(() => "hang");
    const es = new ElasticsearchClient({ config: CONFIG, fetchImpl: impl, timeoutMs: 20 });
    // AbortSignal.timeout uses an unref'd timer; a real hung request holds a socket open, the mock doesn't.
    const keepAlive = setInterval(() => {}, 1000);
    try {
      await assert.rejects(() => es.count("x"), (err) => {
        assert.ok(err instanceof ElasticsearchError);
        assert.strictEqual(err.type, "timeout");
        assert.strictEqual(err.status, 0);
        assert.strictEqual(err.isConnectivity, true);
        return true;
      });
    } finally {
      clearInterval(keepAlive);
    }
  });

  it("raises a typed network error when the connection fails", async () => {
    const { impl } = mockFetch(() => new TypeError("fetch failed"));
    const es = new ElasticsearchClient({ config: CONFIG, fetchImpl: impl });
    await assert.rejects(() => es.search("x", {}), { name: "ElasticsearchError", type: "network_error" });
  });

  it("surfaces 4xx Elasticsearch error types without treating them as connectivity failures", async () => {
    const { impl } = mockFetch(() => ({
      status: 400,
      body: { error: { type: "strict_dynamic_mapping_exception", reason: "mapping set to strict, dynamic introduction of [foo]" }, status: 400 }
    }));
    const es = new ElasticsearchClient({ config: CONFIG, fetchImpl: impl });
    es.isLiveCluster = true;
    await assert.rejects(() => es.index("cinder-pods", { id: "p1", foo: 1 }), (err) => {
      assert.strictEqual(err.status, 400);
      assert.strictEqual(err.type, "strict_dynamic_mapping_exception");
      assert.match(err.message, /dynamic introduction of \[foo\]/);
      assert.strictEqual(err.isConnectivity, false);
      return true;
    });
    assert.strictEqual(es.isLiveCluster, true, "a mapping error must not drop live mode");
  });

  it("prefers the specific code for inference errors reported as SSE events", async () => {
    const sse = 'event: error\ndata: {"error":{"code":"forbidden","message":"Forbidden","type":"error"}}\n';
    const { impl } = mockFetch(() => ({ status: 403, text: sse }));
    const es = new ElasticsearchClient({ config: CONFIG, fetchImpl: impl });
    await assert.rejects(() => es.chatCompletion([{ role: "user", content: "hi" }]), { status: 403, type: "forbidden" });
  });

  it("collects a streamed chat completion into one string", async () => {
    const sse = [
      'data: {"choices":[{"delta":{"content":"Lunch "}}]}',
      'data: {"choices":[{"delta":{"content":"is at 12:15."}}]}',
      "data: [DONE]",
      ""
    ].join("\n");
    const { impl, calls } = mockFetch(() => ({ text: sse }));
    const es = new ElasticsearchClient({ config: CONFIG, fetchImpl: impl, chatModel: ".chat" });
    const out = await es.chatCompletion([{ role: "user", content: "When is lunch?" }]);
    assert.strictEqual(out.content, "Lunch is at 12:15.");
    assert.strictEqual(calls[0].path, "/_inference/chat_completion/.chat/_stream");
  });

  it("drops to the embedded engine on 5xx and recovers on the next successful probe", async () => {
    let failing = false;
    const { impl } = mockFetch((m, p) => {
      if (p === "/") return failing ? { status: 503, body: { error: { type: "unavailable" } } } : { body: clusterInfo };
      return failing ? { status: 503, body: { error: { type: "unavailable", reason: "down" } } } : { body: { count: 1 } };
    });
    const es = new ElasticsearchClient({ config: CONFIG, fetchImpl: impl });
    await es.checkHealth();
    assert.strictEqual((await es.getStatus()).mode, "live-cluster");

    failing = true;
    await assert.rejects(() => es.count("x"), { status: 503 });
    let status = await es.getStatus();
    assert.strictEqual(status.mode, "embedded-es-engine");
    assert.strictEqual(status.fallbackReason, "503 http_503");

    failing = false;
    await es.checkHealth();
    status = await es.getStatus();
    assert.strictEqual(status.mode, "live-cluster");
    assert.strictEqual(status.fallbackReason, null);
  });

  it("falls back to embedded when credentials are rejected", async () => {
    const { impl } = mockFetch(() => ({ status: 401, body: { error: { type: "security_exception", reason: "unable to authenticate" } } }));
    const es = new ElasticsearchClient({ config: CONFIG, fetchImpl: impl });
    const health = await es.checkHealth();
    assert.strictEqual(health.live, false);
    assert.strictEqual((await es.getStatus()).fallbackReason, "401 security_exception");
  });

  it("adds exclude_vectors=false to _source when vectors are requested, keeping includes", async () => {
    const { impl, calls } = mockFetch(() => ({ body: { took: 3, hits: { total: { value: 1 }, hits: [{ _id: "r1", _score: 1.5, _source: { name: "A", embedding: [0.1] } }] } } }));
    const es = new ElasticsearchClient({ config: CONFIG, fetchImpl: impl });
    const res = await es.search("cinder-registrations", { query: { match_all: {} }, _source: ["name", "embedding"] }, { includeVectors: true });
    assert.deepStrictEqual(JSON.parse(calls[0].body)._source, { includes: ["name", "embedding"], exclude_vectors: false });
    assert.deepStrictEqual(res.hits[0], { id: "r1", score: 1.5, source: { name: "A", embedding: [0.1] } });
    assert.strictEqual(res.total, 1);
  });

  it("returns null from get for missing documents", async () => {
    const { impl } = mockFetch(() => ({ status: 404, body: { found: false } }));
    const es = new ElasticsearchClient({ config: CONFIG, fetchImpl: impl });
    assert.strictEqual(await es.get("cinder-pods", "missing"), null);
  });

  it("builds NDJSON bulk bodies and reports per-item errors", async () => {
    const { impl, calls } = mockFetch(() => ({
      body: { errors: true, items: [{ index: { _id: "a", status: 201 } }, { update: { _id: "b", status: 400, error: { type: "x" } } }] }
    }));
    const es = new ElasticsearchClient({ config: CONFIG, fetchImpl: impl });
    const res = await es.bulk([
      { action: "index", index: "i", id: "a", doc: { id: "a" } },
      { action: "update", index: "i", id: "b", doc: { n: 1 } },
      { action: "delete", index: "i", id: "c" }
    ], { refresh: "wait_for" });
    assert.strictEqual(calls[0].headers["Content-Type"], "application/x-ndjson");
    assert.strictEqual(calls[0].path, "/_bulk?refresh=wait_for");
    const lines = calls[0].body.trim().split("\n").map((l) => JSON.parse(l));
    assert.deepStrictEqual(lines, [
      { index: { _index: "i", _id: "a" } }, { id: "a" },
      { update: { _index: "i", _id: "b" } }, { doc: { n: 1 } },
      { delete: { _index: "i", _id: "c" } }
    ]);
    assert.strictEqual(res.errors, true);
    assert.deepStrictEqual(res.items[1], { id: "b", status: 400, error: { type: "x" } });
  });

  it("refuses an empty delete-by-query", async () => {
    const es = new ElasticsearchClient({ config: CONFIG, fetchImpl: mockFetch(() => ({})).impl });
    await assert.rejects(() => es.deleteByQuery("cinder-pods", {}), /non-empty query/);
  });

  it("embeds in batches of 16 with the requested input type", async () => {
    const { impl, calls } = mockFetch((m, p, init) => {
      const n = JSON.parse(init.body).input.length;
      return { body: { text_embedding: Array.from({ length: n }, () => ({ embedding: [1, 2, 3] })) } };
    });
    const es = new ElasticsearchClient({ config: CONFIG, fetchImpl: impl });
    const vectors = await es.embed(Array.from({ length: 20 }, (_, i) => `t${i}`), { inputType: "search" });
    assert.strictEqual(vectors.length, 20);
    assert.strictEqual(calls.length, 2);
    assert.strictEqual(calls[0].path, "/_inference/text_embedding/.test-embed");
    assert.strictEqual(JSON.parse(calls[0].body).input.length, 16);
    assert.strictEqual(JSON.parse(calls[0].body).input_type, "search");
  });

  it("live hybridSearch excludes self and swiped attendees inside every retriever", async () => {
    const { impl, calls } = mockFetch(() => ({ body: { took: 5, hits: { total: { value: 1 }, hits: [{ _id: "att_x", _score: 0.5, _source: { id: "att_x" },
      _explanation: { description: "rrf score: [0.1] computed for initial ranks [3, 1, 2, -] with rankConstant: [60]" } }] } } }));
    const es = new ElasticsearchClient({ config: CONFIG, fetchImpl: impl, discoveryIndex: "cinder-registrations" });
    es.isLiveCluster = true;
    const res = await es.hybridSearch({
      queryText: "kubernetes", queryVector: Array(1024).fill(0.1), excludeIds: ["att_me", "att_passed", "att_liked"],
      limit: 10, eventId: "urn:ue:event:e1", lookingForText: "backend engineers"
    });
    assert.strictEqual(calls[0].path, "/cinder-registrations/_search");
    const inner = JSON.parse(calls[0].body).retriever.rrf.retrievers.map((r) => r.retriever);
    assert.strictEqual(inner.length, 4);
    for (const r of inner) {
      const bool = r.standard ? r.standard.query.bool : r.knn.filter.bool;
      assert.deepStrictEqual(bool.must_not, [{ ids: { values: ["att_me", "att_passed", "att_liked"] } }]);
      assert.deepStrictEqual(bool.filter, [{ term: { eventId: "urn:ue:event:e1" } }]);
    }
    assert.strictEqual(res.engine, "elasticsearch");
    assert.strictEqual(res.hits[0].id, "att_x");
    assert.strictEqual(JSON.parse(calls[0].body).explain, true);
    assert.deepStrictEqual(res.hits[0].retrieverRanks, { bm25: 3, profile_knn: 1, looking_for_knn: 2, looking_for_bm25: null });
    assert.strictEqual(res.hits[0].bm25Rank, 3);
    assert.strictEqual(res.hits[0].knnRank, 1);
    assert.strictEqual(res.querySpec.explain, true, "querySpec is the executed request");
    assert.deepStrictEqual(res.querySpec.retrievers, ["bm25", "profile_knn", "looking_for_knn", "looking_for_bm25"]);
  });

  it("hybridSearch stays on the embedded engine without an event or when the cluster is down", async () => {
    const { impl, calls } = mockFetch(() => ({ body: {} }));
    const es = new ElasticsearchClient({ config: CONFIG, fetchImpl: impl, discoveryIndex: "cinder-registrations" });
    await es.hybridSearch({ queryText: "x", queryVector: [], excludeIds: [], limit: 5, eventId: "e1" });
    es.isLiveCluster = true;
    await es.hybridSearch({ queryText: "x", queryVector: [], excludeIds: [], limit: 5 });
    assert.strictEqual(calls.length, 0, "no cluster requests");
  });
});
