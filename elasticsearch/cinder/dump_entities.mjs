/** [LAYER: UI] */

// Compatibility probe used by compat_check.py (not app code).
//   node elasticsearch/cinder/dump_entities.mjs dump            -> runs CINDER's scenario, prints the entities it produces
//   node elasticsearch/cinder/dump_entities.mjs sessions <file> -> constructs domain Session objects from ES-mapped agenda JSON
import { readFileSync } from "node:fs";
import { CinderApp } from "../../src/core/CinderApp.mjs";
import { ScenarioRunner } from "../../src/core/ScenarioRunner.mjs";
import { Session } from "../../src/domain/agenda.mjs";

const [mode, file] = process.argv.slice(2);

if (mode === "dump") {
  const app = new CinderApp();
  const runner = new ScenarioRunner(app);
  const log = console.log;
  console.log = () => {};
  await runner.runFullScenario({});
  console.log = log;
  const pods = (await app.podCtrl.listPods()).map((p) => {
    const j = p.toJSON();
    j.compositionMeta = p.compositionMeta || null;
    if (j.pinnedMeetup) j.pinnedMeetup.rsvps = p.memberIds.slice(0, 3); // as POST /api/pods/:id/rsvp does
    return j;
  });
  const attendees = (await app.checkInCtrl.listAttendees()).map((a) => a.toJSON());
  const matches = [...app.discoveryCtrl.matches.values()].map((m) => m.toJSON());
  // Same shape webServer builds for POST /api/matches/:id/messages
  const directMessage = {
    id: "dm_compat", matchId: matches[0]?.id, senderId: attendees[0].id, senderName: attendees[0].name,
    content: "Coffee before the keynote?", timestamp: new Date().toISOString()
  };
  process.stdout.write(JSON.stringify({ attendees, pods, matches, directMessage }));
} else if (mode === "sessions") {
  const { sessions } = JSON.parse(readFileSync(file, "utf8"));
  const errors = [];
  for (const s of sessions) {
    try { new Session(s); } catch (e) { errors.push(`${s.id}: ${e.message}`); }
  }
  process.stdout.write(JSON.stringify({ total: sessions.length, errors }));
} else {
  console.error("usage: dump | sessions <file>");
  process.exit(2);
}
