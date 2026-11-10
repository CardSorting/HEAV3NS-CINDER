#!/usr/bin/env node
/** [LAYER: UI] */

import { CliPresenter } from "../src/ui/cli/cliPresenter.mjs";
import { createAppFromEnv } from "../src/ui/cli/appFromEnv.mjs";

const command = process.argv[2] || "help";

async function main() {
  if (command === "demo") {
    const { default: demoRunner } = await import("./demo.mjs");
    return;
  }

  if (command === "server" || command === "start") {
    const { default: serverRunner } = await import("./server.mjs");
    return;
  }

  if (command === "status") {
    const app = createAppFromEnv({ forceOffline: process.argv.includes("--offline") });
    await app.initialize();
    const status = await app.getStatus();
    console.log(JSON.stringify(status, null, 2));
    return;
  }

  CliPresenter.banner();
  console.log(`Usage: cinder <command>

Commands:
  demo        Run the 10-step hackathon attendee demonstration scenario
  server      Launch the real-time interactive web platform (http://localhost:3000)
  status      Inspect Elasticsearch cluster & CINDER state
  help        Display this help menu
`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

