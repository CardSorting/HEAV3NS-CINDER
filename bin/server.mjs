#!/usr/bin/env node
/** [LAYER: UI] */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { CinderWebServer } from "../src/ui/web/webServer.mjs";
import { CliPresenter } from "../src/ui/cli/cliPresenter.mjs";
import { CinderApp } from "../src/core/CinderApp.mjs";
import { parseDotenv, mergeEnv, resolveElasticConfig } from "../src/plumbing/elasticConfig.mjs";
import { clockFromEnv } from "../src/plumbing/clock.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** `.env` at the repo root (optional) merged with the process environment; process wins. */
function loadEnvironment() {
  const file = path.join(ROOT, ".env");
  const text = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
  return mergeEnv(parseDotenv(text), process.env);
}

async function main() {
  const env = loadEnvironment();
  const port = env.PORT ? parseInt(env.PORT, 10) : 3000;
  const app = new CinderApp({
    config: resolveElasticConfig(env),
    clock: clockFromEnv(env),
    defaultEventId: env.CINDER_DEMO_EVENT_ID || null,
    forceOffline: /^(1|true|yes)$/i.test(env.CINDER_OFFLINE || "")
  });
  const webServer = new CinderWebServer({ port, app });

  CliPresenter.banner();
  console.log("Booting CINDER Web Platform & Realtime Event Hub...");

  const { url } = await webServer.start();
  const status = await app.getStatus();
  const modeLine = status.dataMode === "live"
    ? `Elasticsearch: LIVE (${status.elasticsearch.clusterName}) · event ${status.defaultEventId || "(none selected)"}`
    : `Elasticsearch: OFFLINE seed data${status.fallbackReason ? ` (fallback: ${status.fallbackReason})` : ""}`;
  console.log(`\n🚀 CINDER Conference Platform is live at: ${url}`);
  console.log(`🔎 ${modeLine}`);
  if (app.clock.isDemo) console.log(`🕒 Demo clock: ${app.clock.toISOString()}${app.clock.frozen ? " (frozen)" : ""}`);
  console.log(`⚡ Experience the Attendee Discovery, Curated Pods & AI Facilitator in your browser.\n`);
}

main().catch((err) => {
  console.error("Failed to start CINDER server:", err);
  process.exit(1);
});
