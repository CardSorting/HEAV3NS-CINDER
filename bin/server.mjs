#!/usr/bin/env node
/** [LAYER: UI] */

import { CinderWebServer } from "../src/ui/web/webServer.mjs";
import { CliPresenter } from "../src/ui/cli/cliPresenter.mjs";
import { loadEnvironment, createAppFromEnv } from "../src/ui/cli/appFromEnv.mjs";

async function main() {
  const env = loadEnvironment();
  const port = env.PORT ? parseInt(env.PORT, 10) : 3000;
  const app = createAppFromEnv({ env });
  const webServer = new CinderWebServer({ port, app });

  CliPresenter.banner();
  console.log("Booting CINDER Web Platform & Realtime Event Hub...");

  const { url } = await webServer.start();
  // The banner's status read is informational: a slow cluster here must not take the server down.
  let modeLine;
  try {
    const status = await app.getStatus();
    modeLine = status.dataMode === "live"
      ? `Elasticsearch: LIVE (${status.elasticsearch.clusterName}) · event ${status.defaultEventId || "(none selected)"}`
      : `Elasticsearch: OFFLINE seed data${status.fallbackReason ? ` (fallback: ${status.fallbackReason})` : ""}`;
  } catch (err) {
    modeLine = `Elasticsearch: ${app.mode.toUpperCase()} (status unavailable: ${err?.message || err})`;
  }
  console.log(`\n🚀 CINDER Conference Platform is live at: ${url}`);
  console.log(`🔎 ${modeLine}`);
  if (app.clock.isDemo) console.log(`🕒 Demo clock: ${app.clock.toISOString()}${app.clock.frozen ? " (frozen)" : ""}`);
  console.log(`⚡ Experience the Attendee Discovery, Curated Pods & AI Facilitator in your browser.\n`);
}

main().catch((err) => {
  console.error("Failed to start CINDER server:", err);
  process.exit(1);
});
