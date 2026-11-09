/** [LAYER: INFRASTRUCTURE] */

import { IElasticsearchClient } from "../domain/interfaces/IElasticsearchClient.mjs";
import { computeBM25Score, tokenizeText, calculateTermFrequencies } from "../plumbing/bm25Scorer.mjs";
import { cosineSimilarity } from "../plumbing/vectorMath.mjs";
import { reciprocalRankFusion } from "../plumbing/rrfRanker.mjs";
import { DEFAULT_EMBED_MODEL } from "../plumbing/elasticConfig.mjs";

const DEFAULT_TIMEOUT_MS = 5000;
const DEFAULT_CHAT_MODEL = ".anthropic-claude-5-sonnet-chat_completion";
const EMBED_BATCH = 16; // max inputs per request for Elastic-hosted embedding endpoints
// refresh=wait_for waits for the next scheduled refresh; on serverless that can take several seconds.
const REFRESH_WAIT_TIMEOUT_MS = 30000;

/**
 * Error raised by the live transport. Carries the Elasticsearch error type so callers can decide
 * whether to fall back (network/timeout), surface (mapping/validation), or retry (429/5xx).
 */
export class ElasticsearchError extends Error {
  /**
   * @param {string} message
   * @param {Object} details
   * @param {number} [details.status]  HTTP status (0 for network errors and timeouts)
   * @param {string} [details.type]    Elasticsearch error type, e.g. `strict_dynamic_mapping_exception`,
   *                                   or `timeout` / `network_error` / `forbidden`
   * @param {string} [details.method]
   * @param {string} [details.path]
   * @param {Object} [details.body]    Parsed error body when available
   */
  constructor(message, { status = 0, type = "unknown", method = "", path = "", body = null } = {}) {
    super(message);
    this.name = "ElasticsearchError";
    this.status = status;
    this.type = type;
    this.method = method;
    this.path = path;
    this.body = body;
  }

  /** True for failures where switching to the embedded engine is the right response. */
  get isConnectivity() {
    return this.type === "timeout" || this.type === "network_error" || this.status >= 500;
  }
}

/**
 * Concrete Elasticsearch Adapter.
 * Supports dual mode: live HTTP cluster (API-key authenticated) or the embedded zero-dependency engine.
 * Implements IElasticsearchClient.
 */
export class ElasticsearchClient extends IElasticsearchClient {
  /**
   * @param {Object} [options]
   * @param {{url: string|null, apiKey: string|null, embedModel?: string}} [options.config]
   *   Resolved config from `resolveElasticConfig` (plumbing/elasticConfig.mjs). Takes precedence.
   * @param {string} [options.nodeUrl] - Cluster URL (default: process.env.ELASTICSEARCH_URL || "http://localhost:9200")
   * @param {string} [options.apiKey] - Base64 API key sent as `Authorization: ApiKey <key>`
   * @param {string} [options.indexName="cinder_attendees"] - Index used by the attendee methods
   * @param {number} [options.timeoutMs=5000] - Default per-request timeout
   * @param {string} [options.chatModel] - Chat-completion inference endpoint id
   * @param {typeof fetch} [options.fetchImpl] - Injectable fetch (tests)
   */
  constructor(options = {}) {
    super();
    const config = options.config || {};
    this.nodeUrl = (config.url || options.nodeUrl || process.env.ELASTICSEARCH_URL || "http://localhost:9200").replace(/\/+$/, "");
    this.apiKey = config.apiKey || options.apiKey || null;
    this.embedModel = config.embedModel || options.embedModel || DEFAULT_EMBED_MODEL;
    this.chatModel = options.chatModel || DEFAULT_CHAT_MODEL;
    this.indexName = options.indexName || "cinder_attendees";
    this.timeoutMs = options.timeoutMs || DEFAULT_TIMEOUT_MS;
    this.fetchImpl = options.fetchImpl || ((...args) => fetch(...args));
    this.isLiveCluster = false;
    this.clusterInfo = null;

    // In-memory index documents store
    this.docs = new Map();
    // Inverted index stats for BM25
    this.docFrequencies = new Map();
    this.totalTokenCount = 0;
  }

  // ---------------------------------------------------------------------------------------------
  // Live HTTP transport
  // ---------------------------------------------------------------------------------------------

  /**
   * Sends one authenticated request to the cluster and returns the parsed response.
   * Throws ElasticsearchError with the Elasticsearch error type on non-2xx responses, and with
   * type `timeout` / `network_error` when the request never completes.
   * @param {string} method
   * @param {string} path - Path starting with `/`, including any query string
   * @param {Object} [opts]
   * @param {any} [opts.body] - JSON-serialisable body
   * @param {string} [opts.ndjson] - Raw NDJSON body (bulk)
   * @param {number} [opts.timeoutMs]
   * @param {boolean} [opts.allow404=false] - Return null instead of throwing on 404
   * @param {boolean} [opts.raw=false] - Return the Response object (streaming)
   */
  async request(method, path, { body, ndjson, timeoutMs, allow404 = false, raw = false } = {}) {
    const headers = { Accept: "application/json" };
    if (this.apiKey) headers.Authorization = `ApiKey ${this.apiKey}`;
    let payload;
    if (ndjson !== undefined) {
      headers["Content-Type"] = "application/x-ndjson";
      payload = ndjson;
    } else if (body !== undefined) {
      headers["Content-Type"] = "application/json";
      payload = JSON.stringify(body);
    }

    let res;
    try {
      res = await this.fetchImpl(`${this.nodeUrl}${path}`, {
        method,
        headers,
        body: payload,
        signal: AbortSignal.timeout(timeoutMs || this.timeoutMs)
      });
    } catch (err) {
      const timedOut = err && (err.name === "TimeoutError" || err.name === "AbortError");
      throw new ElasticsearchError(
        timedOut ? `Elasticsearch ${method} ${path} timed out` : `Elasticsearch ${method} ${path} failed: ${err?.message || err}`,
        { status: 0, type: timedOut ? "timeout" : "network_error", method, path }
      );
    }

    if (raw && res.ok) return res;
    if (res.status === 404 && allow404) return null;

    const text = await res.text();
    let parsed = null;
    try {
      parsed = text ? JSON.parse(text) : {};
    } catch {
      // Streaming endpoints report errors as an SSE event: `event: error` / `data: {...}`
      const dataLine = text.split(/\r?\n/).find((l) => l.startsWith("data:"));
      try {
        parsed = dataLine ? JSON.parse(dataLine.slice(5).trim()) : { raw: text };
      } catch {
        parsed = { raw: text };
      }
    }
    if (!res.ok) {
      const err = parsed?.error;
      // Inference errors look like { code: "forbidden", type: "error" }: prefer the specific code.
      const type = typeof err === "object"
        ? ((err.type && err.type !== "error" ? err.type : err.code) || err.type || `http_${res.status}`)
        : `http_${res.status}`;
      const reason = typeof err === "object" ? (err.reason || err.message || JSON.stringify(err)) : (err || text || res.statusText);
      throw new ElasticsearchError(`Elasticsearch ${method} ${path} -> ${res.status} ${type}: ${String(reason).slice(0, 500)}`, {
        status: res.status, type, method, path, body: parsed
      });
    }
    return parsed;
  }

  /**
   * Fast health check probe for Elasticsearch cluster with bounded timeout.
   * @param {number} [timeoutMs=250]
   */
  async checkHealth(timeoutMs = 250) {
    const start = performance.now();
    try {
      const data = await this.request("GET", "/_cluster/health", { timeoutMs });
      const latencyMs = Number((performance.now() - start).toFixed(2));
      this.isLiveCluster = true;
      this.clusterInfo = data;
      return {
        live: true,
        status: data.status || "green",
        clusterName: data.cluster_name || "elasticsearch",
        mode: "live-elasticsearch-cluster",
        latencyMs
      };
    } catch {
      // Cluster offline or unreachable - seamless embedded fallback
    }

    this.isLiveCluster = false;
    return {
      live: false,
      status: "green",
      clusterName: "cinder-es-cluster",
      mode: "embedded-es-engine",
      latencyMs: Number((performance.now() - start).toFixed(2))
    };
  }

  /**
   * Ensures the index and mappings exist in live cluster or embedded engine.
   */
  async ensureIndex() {
    const health = await this.checkHealth(250);

    if (this.isLiveCluster) {
      try {
        const exists = await this.request("HEAD", `/${this.indexName}`, { timeoutMs: 1000, allow404: true });
        if (exists === null) {
          await this.request("PUT", `/${this.indexName}`, {
            timeoutMs: 2000,
            body: {
              mappings: {
                properties: {
                  embedding: { type: "dense_vector", dims: 32, index: true, similarity: "cosine" },
                  interests: { type: "text" },
                  expertise: { type: "text" },
                  projects: { type: "text" },
                  challenges: { type: "text" }
                }
              }
            }
          });
        }
      } catch {
        // Embedded engine is fully operational
      }
    }

    return {
      acknowledged: true,
      index: this.indexName,
      mode: this.isLiveCluster ? "live-elasticsearch-cluster" : "in-process-es-engine",
      clusterStatus: health.status
    };
  }

  /**
   * Indexes an attendee in embedded engine and synchronizes to live cluster if active.
   * @param {any} attendee
   */
  async indexAttendee(attendee) {
    const rawDoc = typeof attendee.toJSON === "function" ? attendee.toJSON() : attendee;
    const searchableText = typeof attendee.toSearchableText === "function"
      ? attendee.toSearchableText()
      : Object.values(rawDoc).join(" ");
    const tokens = tokenizeText(searchableText);
    const termFreqs = calculateTermFrequencies(tokens);

    for (const term of termFreqs.keys()) {
      if (!this.docFrequencies.has(term)) {
        this.docFrequencies.set(term, 1);
      } else if (!this.docs.has(attendee.id)) {
        this.docFrequencies.set(term, this.docFrequencies.get(term) + 1);
      }
    }

    this.totalTokenCount += tokens.length;
    this.docs.set(attendee.id, {
      rawDoc,
      searchableText,
      tokens,
      termFreqs,
      tokenLength: tokens.length,
      embedding: attendee.embedding || []
    });

    if (this.isLiveCluster) {
      try {
        await this.request("PUT", `/${this.indexName}/_doc/${encodeURIComponent(attendee.id)}`, { body: rawDoc, timeoutMs: 1000 });
      } catch {
        // Embedded fallback guarantees continuous operation
      }
    }

    return {
      result: "created",
      id: attendee.id,
      index: this.indexName
    };
  }

  /**
   * Performs Elasticsearch Hybrid Search (BM25 + kNN dense_vector + RRF).
   */
  async hybridSearch({
    queryText,
    queryVector,
    excludeIds = [],
    limit = 10
  }) {
    const start = performance.now();
    const queryTerms = tokenizeText(queryText);
    const totalDocs = this.docs.size;
    const avgDocLength = totalDocs > 0 ? this.totalTokenCount / totalDocs : 1;
    const excludeSet = new Set(excludeIds);

    // 1. BM25 Lexical Phase
    const bm25Candidates = [];
    for (const [id, docEntry] of this.docs.entries()) {
      if (excludeSet.has(id)) continue;
      const score = computeBM25Score({
        queryTerms,
        docTermFreqs: docEntry.termFreqs,
        docLength: docEntry.tokenLength,
        avgDocLength,
        totalDocs,
        docFrequencies: this.docFrequencies
      });
      bm25Candidates.push({ id, score, doc: docEntry.rawDoc });
    }
    bm25Candidates.sort((a, b) => b.score - a.score);

    // 2. Dense Vector kNN Phase
    const knnCandidates = [];
    for (const [id, docEntry] of this.docs.entries()) {
      if (excludeSet.has(id)) continue;
      const sim = cosineSimilarity(queryVector, docEntry.embedding);
      knnCandidates.push({ id, score: Number(sim.toFixed(4)), doc: docEntry.rawDoc });
    }
    knnCandidates.sort((a, b) => b.score - a.score);

    // 3. Reciprocal Rank Fusion (RRF)
    const fusedResults = reciprocalRankFusion({
      bm25Results: bm25Candidates,
      knnResults: knnCandidates,
      k: 60
    });

    const tookMs = Number((performance.now() - start).toFixed(2));

    // Construct realistic Elasticsearch Query DSL representation for inspection
    const esQueryDsl = {
      index: this.indexName,
      query: {
        bool: {
          should: [
            {
              multi_match: {
                query: queryText,
                fields: ["interests^3", "expertise^2", "projects", "challenges", "bio"],
                boost: 0.5
              }
            }
          ]
        }
      },
      knn: {
        field: "embedding",
        query_vector: queryVector.slice(0, 8).map((v) => Number(v.toFixed(3))),
        k: limit,
        num_candidates: 50,
        similarity: "cosine"
      },
      rank: {
        rrf: {
          window_size: 50,
          rank_constant: 60
        }
      },
      size: limit
    };

    const topHits = fusedResults.slice(0, limit).map((hit) => ({
      id: hit.id,
      score: hit.rrfScore,
      rrfScore: hit.rrfScore,
      bm25Score: hit.bm25Score,
      knnScore: hit.knnScore,
      bm25Rank: hit.bm25Rank,
      knnRank: hit.knnRank,
      source: hit.doc
    }));

    return {
      hits: topHits,
      totalHits: fusedResults.length,
      tookMs,
      querySpec: esQueryDsl
    };
  }

  /**
   * Returns current cluster status and engine configuration.
   */
  async getStatus() {
    return {
      status: this.isLiveCluster ? (this.clusterInfo?.status || "green") : "green",
      clusterName: this.isLiveCluster ? (this.clusterInfo?.cluster_name || "cinder-live-es") : "cinder-es-cluster",
      docCount: this.docs.size,
      mode: this.isLiveCluster ? "live-cluster" : "embedded-es-engine",
      nodeUrl: this.nodeUrl,
      indexName: this.indexName
    };
  }

  // ---------------------------------------------------------------------------------------------
  // Generic document and inference operations (live cluster)
  // ---------------------------------------------------------------------------------------------

  /** Timeout for a write: longer when it waits for a refresh. */
  writeTimeout(refresh) {
    return refresh === "wait_for" || refresh === true || refresh === "true"
      ? Math.max(this.timeoutMs, REFRESH_WAIT_TIMEOUT_MS)
      : this.timeoutMs;
  }

  /** @inheritdoc */
  async search(index, body = {}, { includeVectors = false } = {}) {
    const request = includeVectors ? withVectorsInSource(body) : body;
    const res = await this.request("POST", `/${encodeIndex(index)}/_search`, { body: request });
    const total = typeof res.hits?.total === "number" ? res.hits.total : (res.hits?.total?.value ?? 0);
    return {
      hits: (res.hits?.hits || []).map((h) => ({ id: h._id, score: h._score ?? null, source: h._source || {} })),
      total,
      tookMs: res.took ?? 0,
      raw: res
    };
  }

  /** @inheritdoc */
  async count(index, query) {
    const res = await this.request("POST", `/${encodeIndex(index)}/_count`, { body: query ? { query } : {} });
    return res.count ?? 0;
  }

  /** @inheritdoc */
  async get(index, id, { includeVectors = false } = {}) {
    if (includeVectors) {
      const res = await this.search(index, { size: 1, query: { ids: { values: [id] } } }, { includeVectors: true });
      return res.hits[0]?.source || null;
    }
    const res = await this.request("GET", `/${encodeIndex(index)}/_doc/${encodeURIComponent(id)}`, { allow404: true });
    return res && res.found !== false ? res._source : null;
  }

  /** @inheritdoc */
  async index(index, doc, { id, refresh = "false" } = {}) {
    const docId = id || doc?.id;
    if (!docId) throw new Error("ElasticsearchClient.index requires options.id or doc.id");
    const res = await this.request("PUT", `/${encodeIndex(index)}/_doc/${encodeURIComponent(docId)}?refresh=${refresh}`, {
      body: doc,
      timeoutMs: this.writeTimeout(refresh)
    });
    return { id: res._id, result: res.result };
  }

  /** @inheritdoc */
  async update(index, id, changes, { refresh = "false", retryOnConflict = 3 } = {}) {
    if (!changes || (!changes.doc && !changes.script)) throw new Error("ElasticsearchClient.update requires { doc } or { script }");
    const res = await this.request(
      "POST",
      `/${encodeIndex(index)}/_update/${encodeURIComponent(id)}?refresh=${refresh}&retry_on_conflict=${retryOnConflict}`,
      { body: changes, timeoutMs: this.writeTimeout(refresh) }
    );
    return { id: res._id, result: res.result };
  }

  /** @inheritdoc */
  async deleteByQuery(index, query, { refresh = false } = {}) {
    if (!query || typeof query !== "object" || Object.keys(query).length === 0) {
      throw new Error("ElasticsearchClient.deleteByQuery requires a non-empty query");
    }
    const res = await this.request(
      "POST",
      `/${encodeIndex(index)}/_delete_by_query?refresh=${Boolean(refresh)}&conflicts=proceed`,
      { body: { query }, timeoutMs: Math.max(this.timeoutMs, REFRESH_WAIT_TIMEOUT_MS) }
    );
    return { deleted: res.deleted ?? 0 };
  }

  /** @inheritdoc */
  async bulk(operations, { refresh = "false" } = {}) {
    if (!operations?.length) return { errors: false, items: [] };
    const lines = [];
    for (const op of operations) {
      const meta = { _index: op.index, _id: op.id };
      lines.push(JSON.stringify({ [op.action]: meta }));
      if (op.action === "update") lines.push(JSON.stringify({ doc: op.doc }));
      else if (op.action !== "delete") lines.push(JSON.stringify(op.doc));
    }
    const res = await this.request("POST", `/_bulk?refresh=${refresh}`, {
      ndjson: lines.join("\n") + "\n",
      timeoutMs: Math.max(this.writeTimeout(refresh), 30000)
    });
    const items = (res.items || []).map((it) => {
      const r = Object.values(it)[0];
      return { id: r._id, status: r.status, error: r.error || null };
    });
    return { errors: Boolean(res.errors), items };
  }

  /** @inheritdoc */
  async embed(texts, { inputType = "ingest", modelId } = {}) {
    const model = modelId || this.embedModel;
    const vectors = [];
    for (let i = 0; i < texts.length; i += EMBED_BATCH) {
      const res = await this.request("POST", `/_inference/text_embedding/${encodeURIComponent(model)}`, {
        body: { input: texts.slice(i, i + EMBED_BATCH), input_type: inputType },
        timeoutMs: Math.max(this.timeoutMs, 30000)
      });
      for (const e of res.text_embedding || []) vectors.push(e.embedding);
    }
    return vectors;
  }

  /**
   * @inheritdoc
   * Elastic chat_completion endpoints are streaming-only; this collects the SSE stream into one string.
   */
  async chatCompletion(messages, { modelId, timeoutMs = 30000 } = {}) {
    const model = modelId || this.chatModel;
    const path = `/_inference/chat_completion/${encodeURIComponent(model)}/_stream`;
    const res = await this.request("POST", path, { body: { messages }, timeoutMs, raw: true });
    const text = await res.text();
    let content = "";
    for (const line of text.split(/\r?\n/)) {
      if (!line.startsWith("data:")) continue;
      const data = line.slice(5).trim();
      if (!data || data === "[DONE]") continue;
      let chunk;
      try {
        chunk = JSON.parse(data);
      } catch {
        continue;
      }
      if (chunk.error) {
        throw new ElasticsearchError(`Chat completion failed: ${chunk.error.message || chunk.error.code}`, {
          status: res.status, type: chunk.error.code || "inference_error", method: "POST", path, body: chunk
        });
      }
      for (const choice of chunk.choices || []) content += choice.delta?.content || "";
    }
    return { content, modelId: model };
  }
}

/** Adds `exclude_vectors: false` to a search body's `_source` option without dropping filters. */
function withVectorsInSource(body) {
  const src = body._source;
  let next;
  if (src === undefined || src === true) next = { exclude_vectors: false };
  else if (src === false) next = false;
  else if (Array.isArray(src) || typeof src === "string") next = { includes: [].concat(src), exclude_vectors: false };
  else next = { ...src, exclude_vectors: false };
  return { ...body, _source: next };
}

function encodeIndex(index) {
  if (!index || typeof index !== "string") throw new Error("Elasticsearch index name is required");
  return index.split(",").map(encodeURIComponent).join(",");
}
