/** [LAYER: UI] */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { CinderApp } from "../../core/CinderApp.mjs";
import { parseDotenv, mergeEnv, resolveElasticConfig } from "../../plumbing/elasticConfig.mjs";
import { clockFromEnv } from "../../plumbing/clock.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

/** `.env` at the repo root (optional) merged with the process environment; the process wins. */
export function loadEnvironment(root = ROOT) {
  const file = path.join(root, ".env");
  const text = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
  return mergeEnv(parseDotenv(text), process.env);
}

/**
 * The CinderApp every entry point (server, demo, status) runs: live against the configured cluster and demo
 * event when `.env` provides them, otherwise (or with CINDER_OFFLINE=true / `forceOffline`) the offline seed event.
 * @param {Object} [options]
 * @param {Record<string, string|undefined>} [options.env]
 * @param {boolean} [options.forceOffline]
 */
export function createAppFromEnv({ env = loadEnvironment(), forceOffline = false } = {}) {
  return new CinderApp({
    config: resolveElasticConfig(env),
    clock: clockFromEnv(env),
    defaultEventId: env.CINDER_DEMO_EVENT_ID || null,
    forceOffline: forceOffline || /^(1|true|yes)$/i.test(env.CINDER_OFFLINE || "")
  });
}
