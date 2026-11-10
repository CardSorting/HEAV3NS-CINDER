/** [LAYER: UI] */

// Loads the five scripted demo attendees (src/plumbing/conferenceSeedData.mjs) into the live demo event,
// keeping their att_ ids so the React app, the ten-step scenario and docs work unchanged.
//   npm run seed:demo                 # CINDER_DEMO_EVENT_ID from .env
//   npm run seed:demo -- --event <id>
// Goes through the app's own check-in path (CinderApp -> CheckInController -> Elasticsearch repository), so the
// registrations get eventId/role and a 1024-dim embedding from the cinder-embed-registration pipeline.
// Idempotent: re-running overwrites the same five documents.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { CinderApp } from "../../src/core/CinderApp.mjs";
import { parseDotenv, mergeEnv, resolveElasticConfig } from "../../src/plumbing/elasticConfig.mjs";
import { SEED_ATTENDEES } from "../../src/plumbing/conferenceSeedData.mjs";

// Disciplines for Pod diversity (the seed profiles predate the field).
const SEED_DISCIPLINES = Object.freeze({
  att_alex_chen: "platform",
  att_maya_lin: "sre",
  att_jordan_taylor: "ml-eng",
  att_elena_rostova: "backend",
  att_marcus_vance: "sre"
});

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const envFile = path.join(ROOT, ".env");
const env = mergeEnv(parseDotenv(fs.existsSync(envFile) ? fs.readFileSync(envFile, "utf8") : ""), process.env);
const args = process.argv.slice(2);
const eventId = args.includes("--event") ? args[args.indexOf("--event") + 1] : env.CINDER_DEMO_EVENT_ID;
const config = resolveElasticConfig(env);

if (!config.configured || !eventId) {
  console.error("seed:demo needs ES_URL, ES_API_KEY and CINDER_DEMO_EVENT_ID (or --event).");
  process.exit(2);
}

const app = new CinderApp({ config, defaultEventId: eventId });
await app.initialize();
if (app.mode !== "live") {
  console.error(`Cluster unavailable (${app.fallbackReason}); nothing seeded.`);
  process.exit(1);
}
const event = await app.eventCtrl.resolveEvent(eventId);
console.log(`Seeding ${SEED_ATTENDEES.length} demo attendees into ${event.name} (${event.id})`);

for (const seed of SEED_ATTENDEES) {
  const attendee = await app.checkInCtrl.checkIn({
    ...seed,
    eventId: event.id,
    discipline: SEED_DISCIPLINES[seed.id] || "",
    checked_in_at: event.startDate
  });
  const stored = await app.attendeeRepo.findById(attendee.id, { includeVectors: true });
  console.log(`  ✓ ${stored.name.padEnd(16)} ${stored.id.padEnd(20)} ${stored.discipline.padEnd(8)} embedding ${stored.embedding.length} dims`);
}
