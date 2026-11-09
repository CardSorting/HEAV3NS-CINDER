#!/usr/bin/env node
/** [LAYER: UI] */

// Evaluates live discovery quality on a fixed set of attendees and compares retriever tunings.
//   npm run eval:discovery                      # default grid, demo event
//   npm run eval:discovery -- --event <id> --n 40 --quick
// Runs the real code path (CinderApp -> DiscoveryController -> live retriever). Read-only.
// Metrics per variant (top 10 per attendee, averaged):
//   answers  - candidate is who the attendee's looking_for asked for (same rule as the explanations)
//   mutual   - candidate's looking_for also describes the attendee
//   same     - candidate has the attendee's own discipline (lookalikes)
//   diverse  - distinct disciplines among the 10

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { CinderApp } from "../src/core/CinderApp.mjs";
import { parseDotenv, mergeEnv, resolveElasticConfig } from "../src/plumbing/elasticConfig.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : fallback;
};

const envFile = path.join(ROOT, ".env");
const env = mergeEnv(parseDotenv(fs.existsSync(envFile) ? fs.readFileSync(envFile, "utf8") : ""), process.env);
const config = resolveElasticConfig(env);
if (!config.configured) {
  console.error("eval:discovery needs ES_URL and ES_API_KEY (.env).");
  process.exit(2);
}
const eventId = opt("event", env.CINDER_DEMO_EVENT_ID);
const sampleSize = Number(opt("n", 40));
const quick = args.includes("--quick");

const W = (lfKnn, lfBm25, bm25 = 1, profile = 1) => ({ bm25, profile_knn: profile, looking_for_knn: lfKnn, looking_for_bm25: lfBm25 });
const variants = quick
  ? [["equal", { weights: W(1, 1) }], ["default", {}]]
  : [
      ["equal weights", { weights: W(1, 1) }],
      ["lf_knn 3, lf_bm25 1", { weights: W(3, 1) }],
      ["lf_knn 3, lf_bm25 2 (previous default)", { weights: W(3, 2) }],
      ["lf_knn 3, lf_bm25 3", { weights: W(3, 3) }],
      ["lf_knn 4, lf_bm25 2", { weights: W(4, 2) }],
      ["lf_knn 4, lf_bm25 3", { weights: W(4, 3) }],
      ["lf_knn 2, lf_bm25 2", { weights: W(2, 2) }],
      ["lf 3/2, profile 0.5", { weights: W(3, 2, 1, 0.5) }],
      ["lf 3/2, window 20", { weights: W(3, 2), rankWindowSize: 20 }],
      ["lf 3/2, window 100", { weights: W(3, 2), rankWindowSize: 100 }]
    ];

async function evaluate(tuning) {
  const app = new CinderApp({ config, defaultEventId: eventId, discoveryTuning: tuning });
  await app.initialize();
  if (app.mode !== "live") throw new Error(`cluster unavailable: ${app.fallbackReason}`);
  const idx = config.indices.registrations;
  const regs = (await app.esClient.search(idx, {
    size: 1000, _source: ["id", "discipline", "looking_for", "role"], query: { term: { eventId } }, sort: [{ "name.keyword": "asc" }]
  })).hits.map((h) => h.source);
  const discipline = new Map(regs.map((r) => [r.id, r.discipline]));
  const sample = regs.filter((r) => r.role === "attendee" && r.looking_for).slice(0, sampleSize);

  const totals = { answers: 0, mutual: 0, same: 0, diverse: 0, n: 0, ms: 0 };
  for (const me of sample) {
    const t0 = performance.now();
    const feed = await app.discoveryCtrl.getDiscoveryFeed(me.id, 10, { eventId });
    totals.ms += performance.now() - t0;
    const cands = feed.candidates;
    totals.answers += cands.filter((c) => c.explanation.answersLookingFor).length / Math.max(1, cands.length);
    totals.mutual += cands.filter((c) => c.explanation.mutualFit).length / Math.max(1, cands.length);
    totals.same += cands.filter((c) => discipline.get(c.profile.id) === me.discipline).length / Math.max(1, cands.length);
    totals.diverse += new Set(cands.map((c) => discipline.get(c.profile.id))).size;
    totals.n++;
  }
  return {
    answers: totals.answers / totals.n, mutual: totals.mutual / totals.n, same: totals.same / totals.n,
    diverse: totals.diverse / totals.n, ms: totals.ms / totals.n, n: totals.n
  };
}

console.log(`Discovery evaluation: ${eventId}, ${sampleSize} attendees (fixed, alphabetical), top 10\n`);
console.log(`${"variant".padEnd(40)} answers  mutual  same  diverse  avg ms`);
const pct = (x) => `${Math.round(x * 100)}%`.padStart(6);
for (const [name, tuning] of variants) {
  const r = await evaluate(tuning);
  console.log(`${name.padEnd(40)} ${pct(r.answers)}  ${pct(r.mutual)} ${pct(r.same)}  ${r.diverse.toFixed(1).padStart(6)}  ${String(Math.round(r.ms)).padStart(6)}`);
}
