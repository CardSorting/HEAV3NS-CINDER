#!/usr/bin/env node
/** [LAYER: UI] */

import { CinderWebServer } from "../src/ui/web/webServer.mjs";
import { CliPresenter } from "../src/ui/cli/cliPresenter.mjs";

async function main() {
  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  const webServer = new CinderWebServer({ port });

  CliPresenter.banner();
  console.log("Booting CINDER Web Platform & Realtime Event Hub...");

  const { url } = await webServer.start();
  console.log(`\n🚀 CINDER Conference Platform is live at: ${url}`);
  console.log(`⚡ Experience the Attendee Discovery, Curated Pods & AI Facilitator in your browser.\n`);
}

main().catch((err) => {
  console.error("Failed to start CINDER server:", err);
  process.exit(1);
});
