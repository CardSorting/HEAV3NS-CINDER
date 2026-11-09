/** [LAYER: INFRASTRUCTURE] */

import { IElasticsearchClient } from "../domain/interfaces/IElasticsearchClient.mjs";
import { computeBM25Score, tokenizeText, calculateTermFrequencies } from "../plumbing/bm25Scorer.mjs";
import { cosineSimilarity } from "../plumbing/vectorMath.mjs";
import { reciprocalRankFusion } from "../plumbing/rrfRanker.mjs";
import { DEFAULT_EMBED_MODEL } from "../plumbing/elasticConfig.mjs";
import { buildDiscoveryQuery, parseRetrieverRanks } from "./discoveryRetriever.mjs";

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
   * @param {boolean} [options.explainDiscovery=true] - ask Elasticsearch to explain discovery hits so each
   *   candidate carries its rank in every retriever (adds some latency)
   * @param {string|null} [options.discoveryIndex=null] - registrations index for live discovery; when set
   *   and the cluster is live, hybridSearch runs an Elasticsearch RRF retriever instead of the embedded engine
   * @param {boolean} [options.legacyAttendeeIndex=true] - create/mirror the old 32-dim `cinder_attendees`
   *   index in live mode. The composition root turns this off when the cinder-* repositories are in use.
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
    // Local clusters answer in milliseconds; cloud clusters (API key) can take ~0.5-0.8s for GET /.
    this.healthTimeoutMs = options.healthTimeoutMs || (this.apiKey ? 2000 : 250);
    this.lastHealthError = null;
    this.lastHealthCheck = null;
    this.fetchImpl = options.fetchImpl || ((...args) => fetch(...args));
    this.legacyAttendeeIndex = options.legacyAttendeeIndex !== false;
    this.discoveryIndex = options.discoveryIndex || null;
    this.explainDiscovery = options.explainDiscovery !== false;
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
      const error = new ElasticsearchError(
        timedOut ? `Elasticsearch ${method} ${path} timed out` : `Elasticsearch ${method} ${path} failed: ${err?.message || err}`,
        { status: 0, type: timedOut ? "timeout" : "network_error", method, path }
      );
      this.recordConnectivityFailure(error);
      throw error;
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
      if (res.status >= 500 || res.status === 401) {
        this.recordConnectivityFailure(new ElasticsearchError(`${method} ${path} -> ${res.status}`, { status: res.status, type: `http_${res.status}` }));
      }
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
   *
   * Probes `GET /` (cluster info), which every deployment answers, including Elastic Serverless where
   * `/_cluster/health` returns 410 Gone. Any authenticated 2xx means the cluster is live; serverless has
   * no shard-health colour, so a reachable cluster reports "green".
   * @param {number} [timeoutMs] Defaults to `healthTimeoutMs` (250ms local, 2000ms for API-key/cloud clusters).
   */
  async checkHealth(timeoutMs = this.healthTimeoutMs) {
    const start = performance.now();
    try {
      const data = await this.request("GET", "/", { timeoutMs });
      const latencyMs = Number((performance.now() - start).toFixed(2));
      this.isLiveCluster = true;
      this.clusterInfo = data;
      this.lastHealthError = null;
      this.lastHealthCheck = { at: new Date().toISOString(), latencyMs };
      return {
        live: true,
        status: "green",
        clusterName: data.cluster_name || "elasticsearch",
        version: data.version?.number || null,
        serverless: data.version?.build_flavor === "serverless",
        mode: "live-elasticsearch-cluster",
        latencyMs
      };
    } catch (err) {
      // Cluster offline, unreachable or rejecting credentials - seamless embedded fallback
      this.lastHealthError = err instanceof ElasticsearchError ? `${err.status} ${err.type}` : String(err?.message || err);
      this.lastHealthCheck = { at: new Date().toISOString(), latencyMs: Number((performance.now() - start).toFixed(2)) };
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
    const health = await this.checkHealth();

    if (this.isLiveCluster && this.legacyAttendeeIndex) {
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

    if (this.isLiveCluster && this.legacyAttendeeIndex) {
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
   * Hybrid attendee search (BM25 + dense vector kNN + RRF).
   * Live (discoveryIndex set and cluster live): Elasticsearch RRF retriever over the registrations index,
   * scoped to `eventId`, using the stored profile vector and the `looking_for` text.
   * Otherwise: the embedded in-process engine.
   * @param {Object} params
   * @param {string} params.queryText
   * @param {number[]} [params.queryVector] - embedded mode: 32-dim vector; live mode: stored 1024-dim profile vector
   * @param {string[]} [params.excludeIds]
   * @param {number} [params.limit]
   * @param {string} [params.eventId] - live mode: event to search in (required live)
   * @param {string} [params.lookingForText] - live mode: requester's looking_for
   */
  async hybridSearch(params) {
    if (this.discoveryIndex && this.isLiveCluster && params.eventId) return this.liveHybridSearch(params);
    return this.embeddedHybridSearch(params);
  }

  /** Live discovery: one Elasticsearch RRF retriever request (see discoveryRetriever.mjs). */
  async liveHybridSearch({ queryText, queryVector, excludeIds = [], limit = 10, eventId, lookingForText }) {
    const { body, retrievers, weights } = buildDiscoveryQuery({
      eventId, queryText, profileVector: queryVector, lookingForText, excludeIds, limit, embedModel: this.embedModel
    });
    const executed = this.explainDiscovery ? { ...body, explain: true } : body;
    const res = await this.search(this.discoveryIndex, executed);
    const explanations = new Map((res.raw?.hits?.hits || []).map((h) => [h._id, h._explanation]));
    return {
      hits: res.hits.map((h) => {
        const retrieverRanks = parseRetrieverRanks(explanations.get(h.id), retrievers);
        return {
          id: h.id,
          score: h.score,
          rrfScore: h.score,
          bm25Score: null,
          knnScore: null,
          // Ranks of this candidate in each retriever before fusion (null = not returned by that retriever).
          bm25Rank: retrieverRanks.bm25 ?? null,
          knnRank: retrieverRanks.profile_knn ?? retrieverRanks.looking_for_knn ?? null,
          retrieverRanks,
          source: h.source
        };
      }),
      totalHits: res.total,
      tookMs: res.tookMs,
      // The request exactly as executed (query vectors shortened for display).
      querySpec: { index: this.discoveryIndex, retrievers, weights, ...summarizeVectors(executed) },
      engine: "elasticsearch"
    };
  }

  /** Embedded in-process hybrid search (offline mode and fallback). */
  async embeddedHybridSearch({
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
    const live = this.isLiveCluster;
    return {
      status: "green",
      live,
      mode: live ? "live-cluster" : "embedded-es-engine",
      // Why we're on the embedded engine: not configured, or the last probe/request failure.
      fallbackReason: live ? null : (this.apiKey ? (this.lastHealthError || "not probed yet") : "no ES_URL/ES_API_KEY configured"),
      configured: Boolean(this.apiKey),
      clusterName: live ? (this.clusterInfo?.cluster_name || "cinder-live-es") : "cinder-es-cluster",
      version: live ? (this.clusterInfo?.version?.number || null) : null,
      serverless: live ? this.clusterInfo?.version?.build_flavor === "serverless" : false,
      lastHealthCheck: this.lastHealthCheck,
      docCount: this.docs.size,
      nodeUrl: this.nodeUrl,
      indexName: this.indexName
    };
  }

  /**
   * Drops to the embedded engine after a connectivity failure (timeout, network error, 5xx, rejected
   * credentials) on a live request. The next successful `checkHealth()` restores live mode.
   * @param {ElasticsearchError} error
   */
  recordConnectivityFailure(error) {
    if (this.isLiveCluster) this.isLiveCluster = false;
    this.lastHealthError = `${error.status} ${error.type}`;
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

/** Copy of a search body with long query vectors shortened for display (the request itself is unchanged). */
function summarizeVectors(body) {
  return JSON.parse(JSON.stringify(body, (key, value) =>
    key === "query_vector" && Array.isArray(value)
      ? [...value.slice(0, 4).map((v) => Number(v.toFixed(4))), `…(${value.length} dims)`]
      : value));
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
