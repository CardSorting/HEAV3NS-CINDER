/** [LAYER: PLUMBING] */

import { normalizeVector } from "./vectorMath.mjs";

/**
 * Deterministic Semantic Vector Embedder for Technical Conference Profiles.
 * Maps profile texts and domain keywords into dense 32-dimensional embedding vectors.
 * Ensures reproducible, realistic vector search in Elasticsearch.
 * Stateless pure functions.
 */

const DIMENSIONS = 32;

/**
 * Semantic anchor keywords mapped to specific sub-space dimensions.
 * Related concepts share overlapping orthogonal basis weights.
 */
const SEMANTIC_CLUSTERS = Object.freeze({
  kubernetes: [0, 1, 2, 4],
  k8s: [0, 1, 2, 4],
  containers: [0, 1, 2],
  platform: [1, 2, 3, 4],
  infrastructure: [1, 2, 3, 4],
  ebpf: [2, 4, 5, 6],
  observability: [4, 5, 6, 7],
  telemetry: [4, 5, 7, 8],
  tracing: [5, 6, 7, 8],
  metrics: [6, 7, 8, 9],
  agents: [10, 11, 12],
  autonomous: [10, 12, 13],
  orchestration: [2, 11, 13],
  llm: [12, 13, 14],
  ai: [10, 13, 14],
  distributed: [15, 16, 17],
  consensus: [16, 17, 18],
  raft: [16, 18, 19],
  storage: [17, 19, 20],
  database: [17, 20, 21],
  elasticsearch: [20, 21, 22],
  search: [21, 22, 23],
  vector: [21, 23, 24],
  reliability: [25, 26, 27],
  sre: [25, 27, 28],
  chaos: [26, 27, 29],
  incident: [27, 28, 29],
  automation: [2, 11, 28, 30],
  cloud: [1, 3, 4, 30, 31],
  networking: [2, 4, 5, 31]
});

/**
 * Deterministic hash of string to number in range [0, 1]
 * @param {string} str
 * @returns {number}
 */
function hashString(str) {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967296;
}

/**
 * Generates a 32-dimensional dense embedding vector from text and tags.
 * @param {string} text
 * @param {readonly string[]} [tags=[]]
 * @returns {number[]} Normalized 32-dim vector
 */
export function generateDenseEmbedding(text = "", tags = []) {
  const vec = new Array(DIMENSIONS).fill(0);
  const normalizedText = (text + " " + tags.join(" ")).toLowerCase();
  const tokens = normalizedText.replace(/[^a-z0-9_-]/g, " ").split(/\s+/).filter(Boolean);

  for (const token of tokens) {
    if (SEMANTIC_CLUSTERS[token]) {
      const indices = SEMANTIC_CLUSTERS[token];
      for (const idx of indices) {
        vec[idx] += 1.8;
      }
    } else {
      // General deterministic token projection
      const baseIdx = Math.floor(hashString(token) * DIMENSIONS);
      vec[baseIdx] += 0.45;
      vec[(baseIdx + 1) % DIMENSIONS] += 0.25;
    }
  }

  // Add tag emphasis
  for (const tag of tags) {
    const cleanTag = tag.toLowerCase().trim();
    if (SEMANTIC_CLUSTERS[cleanTag]) {
      for (const idx of SEMANTIC_CLUSTERS[cleanTag]) {
        vec[idx] += 2.2;
      }
    }
  }

  return normalizeVector(vec);
}
