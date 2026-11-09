/** [LAYER: PLUMBING] */

/**
 * Pure Elasticsearch configuration helpers.
 * Parses `.env` text and resolves connection settings and index names from an environment map.
 * Zero I/O: callers read the `.env` file and pass its text in. Zero mutable module state.
 */

export const DEFAULT_EMBED_MODEL = ".jina-embeddings-v5-text-small";
export const DEFAULT_EVENTS_INDEX = "eventapp";
export const DEFAULT_CINDER_PREFIX = "cinder-";

const CINDER_INDEX_KEYS = Object.freeze([
  "registrations",
  "people",
  "sessions",
  "spaces",
  "announcements",
  "prompts",
  "pods",
  "interactions",
  "messages"
]);

/**
 * Parses `.env` file text into a plain object.
 * Supports `KEY=value`, optional `export ` prefix, `#` comment lines, single/double-quoted values,
 * and `=` inside values. Later keys override earlier ones.
 * @param {string} text
 * @returns {Readonly<Record<string, string>>}
 */
export function parseDotenv(text = "") {
  const out = {};
  for (const rawLine of String(text).split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const body = line.startsWith("export ") ? line.slice(7).trim() : line;
    const eq = body.indexOf("=");
    if (eq <= 0) continue;
    const key = body.slice(0, eq).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;
    let value = body.slice(eq + 1).trim();
    const quote = value[0];
    if ((quote === '"' || quote === "'") && value.endsWith(quote) && value.length >= 2) {
      value = value.slice(1, -1);
    } else {
      const hash = value.indexOf(" #");
      if (hash !== -1) value = value.slice(0, hash).trim();
    }
    out[key] = value;
  }
  return Object.freeze(out);
}

/**
 * Merges `.env` values with the process environment. Process environment wins, so deployments can
 * override the file without editing it.
 * @param {Record<string, string>} fileEnv
 * @param {Record<string, string | undefined>} processEnv
 * @returns {Readonly<Record<string, string>>}
 */
export function mergeEnv(fileEnv = {}, processEnv = {}) {
  const merged = { ...fileEnv };
  for (const [key, value] of Object.entries(processEnv)) {
    if (value !== undefined && value !== "") merged[key] = value;
  }
  return Object.freeze(merged);
}

/**
 * Resolves Elasticsearch settings from an environment map.
 *
 * Variables (same names as elasticsearch/ tooling):
 * - `ES_URL` (falls back to legacy `ELASTICSEARCH_URL`)
 * - `ES_API_KEY` (base64 API key; sent as `Authorization: ApiKey <key>`)
 * - `ES_INDEX` events index (default `eventapp`)
 * - `ES_CINDER_PREFIX` prefix for cinder indices (default `cinder-`)
 * - `ES_INDEX_<NAME>` overrides one cinder index, e.g. `ES_INDEX_REGISTRATIONS`
 * - `ES_EMBED_MODEL` inference endpoint id (default `.jina-embeddings-v5-text-small`)
 *
 * @param {Record<string, string | undefined>} env
 * @returns {Readonly<{url: string|null, apiKey: string|null, configured: boolean, embedModel: string, indices: Readonly<Record<string, string>>}>}
 */
export function resolveElasticConfig(env = {}) {
  const url = (env.ES_URL || env.ELASTICSEARCH_URL || "").trim().replace(/\/+$/, "") || null;
  const apiKey = (env.ES_API_KEY || "").trim() || null;
  const prefix = env.ES_CINDER_PREFIX || DEFAULT_CINDER_PREFIX;

  const indices = { events: env.ES_INDEX || DEFAULT_EVENTS_INDEX };
  for (const key of CINDER_INDEX_KEYS) {
    indices[key] = env[`ES_INDEX_${key.toUpperCase()}`] || `${prefix}${key}`;
  }

  return Object.freeze({
    url,
    apiKey,
    configured: Boolean(url && apiKey),
    embedModel: env.ES_EMBED_MODEL || DEFAULT_EMBED_MODEL,
    indices: Object.freeze(indices)
  });
}

/**
 * Convenience: `.env` text + process environment -> resolved config.
 * @param {string} dotenvText
 * @param {Record<string, string | undefined>} processEnv
 */
export function loadElasticConfig(dotenvText = "", processEnv = {}) {
  return resolveElasticConfig(mergeEnv(parseDotenv(dotenvText), processEnv));
}

/**
 * Returns a copy of the config that is safe to log or send to clients (API key masked).
 * @param {{apiKey: string|null}} config
 */
export function redactElasticConfig(config) {
  const key = config.apiKey;
  return Object.freeze({ ...config, apiKey: key ? `${key.slice(0, 4)}…(${key.length} chars)` : null });
}
