/** [LAYER: UI] */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { dotProduct, magnitude, cosineSimilarity, normalizeVector, vectorCentroid } from "../src/plumbing/vectorMath.mjs";
import { tokenizeText, calculateTermFrequencies, computeBM25Score } from "../src/plumbing/bm25Scorer.mjs";
import { reciprocalRankFusion } from "../src/plumbing/rrfRanker.mjs";
import { generateDenseEmbedding } from "../src/plumbing/textEmbedder.mjs";

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

