/** [LAYER: UI] */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { dotProduct, magnitude, cosineSimilarity, normalizeVector, vectorCentroid } from "../src/plumbing/vectorMath.mjs";
import { tokenizeText, calculateTermFrequencies, computeBM25Score } from "../src/plumbing/bm25Scorer.mjs";
import { reciprocalRankFusion } from "../src/plumbing/rrfRanker.mjs";
import { generateDenseEmbedding } from "../src/plumbing/textEmbedder.mjs";
import { createClock, clockFromEnv, minutesUntil, formatLocalTime } from "../src/plumbing/clock.mjs";
import { parseDotenv, mergeEnv, resolveElasticConfig, loadElasticConfig, redactElasticConfig } from "../src/plumbing/elasticConfig.mjs";

describe("Vector Math Plumbing", () => {
  it("calculates dotProduct and magnitude", () => {
    const v1 = [3, 4];
    assert.strictEqual(magnitude(v1), 5);
    const v2 = [1, 2];
    assert.strictEqual(dotProduct(v1, v2), 11);
  });

  it("calculates cosine similarity correctly", () => {
    const a = [1, 0];
    const b = [1, 0];
    const c = [0, 1];
    assert.strictEqual(cosineSimilarity(a, b), 1);
    assert.strictEqual(cosineSimilarity(a, c), 0);
  });

  it("normalizes vector to unit length", () => {
    const v = [0, 5, 0];
    const norm = normalizeVector(v);
    assert.strictEqual(norm[1], 1);
    assert.strictEqual(magnitude(norm), 1);
  });

  it("computes centroid of multiple vectors", () => {
    const v1 = [1, 0];
    const v2 = [0, 1];
    const centroid = vectorCentroid([v1, v2]);
    assert.strictEqual(centroid.length, 2);
    assert.ok(Math.abs(magnitude(centroid) - 1.0) < 0.0001);
  });
});

describe("BM25 Scorer", () => {
  it("tokenizes and counts term frequencies", () => {
    const tokens = tokenizeText("Kubernetes, eBPF and kubernetes observability!");
    assert.deepStrictEqual(tokens, ["kubernetes", "ebpf", "and", "kubernetes", "observability"]);
    const tf = calculateTermFrequencies(tokens);
    assert.strictEqual(tf.get("kubernetes"), 2);
    assert.strictEqual(tf.get("ebpf"), 1);
  });

  it("computes BM25 score for matching terms", () => {
    const tokens = tokenizeText("kubernetes autonomous cluster healing");
    const tf = calculateTermFrequencies(tokens);
    const score = computeBM25Score({
      queryTerms: ["kubernetes", "autonomous"],
      docTermFreqs: tf,
      docLength: tokens.length,
      avgDocLength: 4,
      totalDocs: 5,
      docFrequencies: new Map([["kubernetes", 2], ["autonomous", 1]])
    });
    assert.ok(score > 0);
  });
});

describe("Reciprocal Rank Fusion (RRF)", () => {
  it("fuses lexical and vector candidate ranks", () => {
    const bm25Results = [
      { id: "doc1", score: 4.5, doc: { name: "Doc 1" } },
      { id: "doc2", score: 2.1, doc: { name: "Doc 2" } }
    ];
    const knnResults = [
      { id: "doc2", score: 0.95, doc: { name: "Doc 2" } },
      { id: "doc1", score: 0.80, doc: { name: "Doc 1" } }
    ];

    const fused = reciprocalRankFusion({ bm25Results, knnResults, k: 60 });
    assert.strictEqual(fused.length, 2);
    // Both docs should have computed RRF score
    assert.ok(fused[0].rrfScore > 0);
    assert.ok(fused[1].rrfScore > 0);
  });
});

describe("Semantic Text Embedder", () => {
  it("generates deterministic 32-dimensional normalized vectors", () => {
    const v1 = generateDenseEmbedding("kubernetes orchestration", ["k8s"]);
    const v2 = generateDenseEmbedding("kubernetes orchestration", ["k8s"]);
    assert.strictEqual(v1.length, 32);
    assert.deepStrictEqual(v1, v2);
    assert.ok(Math.abs(magnitude(v1) - 1.0) < 0.0001);
  });

  it("yields high cosine similarity for semantically close topics", () => {
    const k8sVec = generateDenseEmbedding("kubernetes platform clusters", ["k8s"]);
    const ebpfVec = generateDenseEmbedding("ebpf kernel telemetry observability", ["tracing"]);
    const sim = cosineSimilarity(k8sVec, ebpfVec);
    // Both are systems/infrastructure domains
    assert.ok(sim > 0.2);
  });
});

describe("Elasticsearch Config Plumbing", () => {
  it("parses .env text: comments, export, quotes, inline comments and '=' in values", () => {
    const env = parseDotenv([
      "# comment",
      "ES_URL=https://example.es.io:443/",
      "export ES_API_KEY=abc==",
      'QUOTED="hello # not a comment"',
      "INLINE=value # trailing comment",
      "bad line without equals",
      "1BAD=nope"
    ].join("\n"));
    assert.strictEqual(env.ES_URL, "https://example.es.io:443/");
    assert.strictEqual(env.ES_API_KEY, "abc==");
    assert.strictEqual(env.QUOTED, "hello # not a comment");
    assert.strictEqual(env.INLINE, "value");
    assert.strictEqual(env["1BAD"], undefined);
    assert.ok(Object.isFrozen(env));
  });

  it("lets the process environment override .env values, ignoring empty ones", () => {
    const merged = mergeEnv({ ES_URL: "file", ES_API_KEY: "filekey" }, { ES_URL: "proc", ES_API_KEY: "" });
    assert.strictEqual(merged.ES_URL, "proc");
    assert.strictEqual(merged.ES_API_KEY, "filekey");
  });

  it("resolves defaults, trailing-slash URLs and legacy ELASTICSEARCH_URL", () => {
    const cfg = resolveElasticConfig({ ELASTICSEARCH_URL: "http://localhost:9200/" });
    assert.strictEqual(cfg.url, "http://localhost:9200");
    assert.strictEqual(cfg.apiKey, null);
    assert.strictEqual(cfg.configured, false);
    assert.strictEqual(cfg.indices.events, "eventapp");
    assert.strictEqual(cfg.indices.registrations, "cinder-registrations");
    assert.strictEqual(cfg.indices.messages, "cinder-messages");
    assert.strictEqual(cfg.embedModel, ".jina-embeddings-v5-text-small");
  });

  it("applies index prefix and per-index overrides", () => {
    const cfg = loadElasticConfig("ES_URL=https://x\nES_API_KEY=k\nES_CINDER_PREFIX=test-", { ES_INDEX_PODS: "custom-pods", ES_INDEX: "events-v2" });
    assert.strictEqual(cfg.configured, true);
    assert.strictEqual(cfg.indices.events, "events-v2");
    assert.strictEqual(cfg.indices.sessions, "test-sessions");
    assert.strictEqual(cfg.indices.pods, "custom-pods");
  });

  it("redacts the API key for logging", () => {
    const red = redactElasticConfig(resolveElasticConfig({ ES_URL: "https://x", ES_API_KEY: "SW9uTHdhRUI4" }));
    assert.ok(!red.apiKey.includes("THdhRUI4"));
    assert.strictEqual(red.url, "https://x");
  });
});

describe("Clock Plumbing", () => {
  it("uses the injected system time in real mode", () => {
    const clock = createClock({ systemNow: () => 1_000 });
    assert.strictEqual(clock.isDemo, false);
    assert.strictEqual(clock.nowMs(), 1_000);
  });

  it("starts at the demo time and advances with real elapsed time", () => {
    let sys = 5_000;
    const clock = createClock({ demoTime: "2026-11-10T11:55:00-06:00", systemNow: () => sys });
    assert.strictEqual(clock.isDemo, true);
    assert.strictEqual(clock.toISOString(), "2026-11-10T17:55:00.000Z");
    sys += 5 * 60_000;
    assert.strictEqual(clock.toISOString(), "2026-11-10T18:00:00.000Z");
  });

  it("stays fixed when frozen", () => {
    let sys = 0;
    const clock = createClock({ demoTime: "2026-11-10T12:00:00Z", frozen: true, systemNow: () => sys });
    sys += 3_600_000;
    assert.strictEqual(clock.toISOString(), "2026-11-10T12:00:00.000Z");
  });

  it("builds from env and computes minutes until a target", () => {
    const clock = clockFromEnv({ CINDER_DEMO_TIME: "2026-11-10T12:10:00-06:00", CINDER_DEMO_FROZEN: "true" });
    assert.strictEqual(clock.frozen, true);
    assert.strictEqual(minutesUntil(clock, "2026-11-10T12:15:00-06:00"), 5);
    assert.strictEqual(clockFromEnv({}).isDemo, false);
  });

  it("formats local wall-clock time in the event timezone", () => {
    assert.strictEqual(formatLocalTime("2026-11-10T18:15:00Z", "America/Chicago"), "12:15 PM");
  });

  it("rejects invalid times", () => {
    assert.throws(() => createClock({ demoTime: "not a date" }));
  });
});
