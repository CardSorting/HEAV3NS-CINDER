/** [LAYER: UI] */

import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";

import { CinderWebServer } from "../src/ui/web/webServer.mjs";

describe("CinderWebServer HTTP & API Routes", () => {
  let server;
  let baseUrl;

  before(async () => {
    // Pick port 0 to bind to an available random ephemeral port
    server = new CinderWebServer({ port: 3888 });
    const info = await server.start();
    baseUrl = info.url;
  });

  after(async () => {
    if (server) {
      await server.stop();
    }
  });

  it("serves static index.html and assets", async () => {
    const htmlRes = await fetch(`${baseUrl}/`);
    assert.strictEqual(htmlRes.status, 200);
    assert.strictEqual(htmlRes.headers.get("content-type"), "text/html");
    const html = await htmlRes.text();
    assert.ok(html.includes("CINDER"));
    assert.ok(html.includes("Run Hackathon Demo Story"));

    const jsRes = await fetch(`${baseUrl}/app.js`);
    assert.strictEqual(jsRes.status, 200);
    assert.strictEqual(jsRes.headers.get("content-type"), "application/javascript");
    const js = await jsRes.text();
    assert.ok(js.includes("CINDER Client-side Application Controller"));

    const cssRes = await fetch(`${baseUrl}/styles.css`);
    assert.strictEqual(cssRes.status, 200);
    assert.strictEqual(cssRes.headers.get("content-type"), "text/css");
  });

  it("prevents path traversal outside of public directory", async () => {
    const traversalRes = await fetch(`${baseUrl}/../../package.json`);
    assert.strictEqual(traversalRes.status, 200);
    const content = await traversalRes.text();
    // Must serve index.html fallback, NOT package.json
    assert.ok(content.includes("<title>CINDER"));
    assert.strictEqual(content.includes('"name": "cinder-conference"'), false);
  });

  it("handles /api/status endpoint", async () => {
    const res = await fetch(`${baseUrl}/api/status`);
    assert.strictEqual(res.status, 200);
    const status = await res.json();
    assert.strictEqual(status.status, "healthy");
    assert.strictEqual(status.attendeeCount, 5);
    assert.ok(status.elasticsearch);
  });

  it("reports the active search mode explicitly in /api/status", async () => {
    const status = await (await fetch(`${baseUrl}/api/status`)).json();
    // Tests run without ES_URL/ES_API_KEY, so the embedded engine must be active and say why.
    assert.strictEqual(status.searchMode, "embedded");
    assert.strictEqual(status.elasticsearch.live, false);
    assert.strictEqual(status.elasticsearch.mode, "embedded-es-engine");
    assert.strictEqual(status.elasticsearch.configured, false);
    assert.match(status.elasticsearch.fallbackReason, /no ES_URL\/ES_API_KEY configured/);
  });

  it("handles attendee listing and discovery feed", async () => {
    const res = await fetch(`${baseUrl}/api/attendees`);
    assert.strictEqual(res.status, 200);
    const attendees = await res.json();
    assert.strictEqual(attendees.length, 5);

    const discRes = await fetch(`${baseUrl}/api/discovery?attendeeId=att_alex_chen&limit=3`);
    assert.strictEqual(discRes.status, 200);
    const feed = await discRes.json();
    assert.strictEqual(feed.targetAttendeeId, "att_alex_chen");
    assert.ok(feed.candidates.length > 0);
  });

  it("executes the full scenario via POST /api/scenario/run", async () => {
    const res = await fetch(`${baseUrl}/api/scenario/run`, { method: "POST" });
    assert.strictEqual(res.status, 200);
    const result = await res.json();
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.steps.length, 10);
    assert.ok(result.podId);
  });

  describe("event scoping", () => {
    const SEED = "urn:ue:event:cloud-ai-summit-2026";
    const enc = encodeURIComponent;

    it("lists selectable conferences and describes one", async () => {
      const list = await (await fetch(`${baseUrl}/api/conferences`)).json();
      assert.strictEqual(list.defaultEventId, SEED);
      assert.deepStrictEqual(list.events.map((e) => e.id), [SEED]);
      assert.strictEqual(list.events[0].isDefault, true);
      const one = await fetch(`${baseUrl}/api/conferences/${enc(SEED)}`);
      assert.strictEqual(one.status, 200);
      assert.strictEqual((await one.json()).name, "Cloud & AI Summit 2026");
      const missing = await fetch(`${baseUrl}/api/conferences/${enc("urn:ue:event:nope")}`);
      assert.strictEqual(missing.status, 404);
      assert.strictEqual((await missing.json()).code, "EVENT_NOT_FOUND");
    });

    it("scopes attendee, discovery, pod and agenda routes to the requested event", async () => {
      const attendees = await (await fetch(`${baseUrl}/api/attendees?eventId=${enc(SEED)}`)).json();
      assert.ok(attendees.length >= 5);
      assert.ok(attendees.every((a) => a.eventId === SEED));
      const feed = await (await fetch(`${baseUrl}/api/discovery?eventId=${enc(SEED)}&attendeeId=att_alex_chen`)).json();
      assert.strictEqual(feed.eventId, SEED);
      assert.ok(feed.candidates.every((c) => c.profile.eventId === SEED));
      const agenda = await (await fetch(`${baseUrl}/api/agenda?eventId=${enc(SEED)}`)).json();
      assert.strictEqual(agenda.eventId, SEED);
      for (const path of ["/api/attendees", "/api/pods", "/api/agenda", "/api/discovery?attendeeId=att_alex_chen"]) {
        const sep = path.includes("?") ? "&" : "?";
        const res = await fetch(`${baseUrl}${path}${sep}eventId=${enc("urn:ue:event:nope")}`);
        assert.strictEqual(res.status, 404, `${path} with unknown event`);
      }
    });

    it("rejects attendees and pods that are not part of the event", async () => {
      const res = await fetch(`${baseUrl}/api/discovery?attendeeId=att_does_not_exist`);
      assert.strictEqual(res.status, 404);
      assert.strictEqual((await res.json()).code, "ATTENDEE_NOT_FOUND");
      const swipe = await fetch(`${baseUrl}/api/swipe`, { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fromAttendeeId: "att_alex_chen", toAttendeeId: "att_ghost", action: "like" }) });
      assert.strictEqual(swipe.status, 404);
      const pod = await fetch(`${baseUrl}/api/pods/pod_missing/messages`);
      assert.strictEqual(pod.status, 404);
      assert.strictEqual((await pod.json()).code, "POD_NOT_FOUND");
    });

    it("stamps the event onto check-ins and composed pods", async () => {
      const res = await fetch(`${baseUrl}/api/check-in`, { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Event Scoped", title: "SRE", interests: ["Observability"] }) });
      assert.strictEqual((await res.json()).eventId, SEED);
      const pod = await (await fetch(`${baseUrl}/api/pods/compose`, { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seedAttendeeIds: ["att_alex_chen", "att_maya_lin"], theme: "Scoped Pod" }) })).json();
      assert.strictEqual(pod.eventId, SEED);
      const pods = await (await fetch(`${baseUrl}/api/pods?eventId=${enc(SEED)}`)).json();
      assert.ok(pods.some((p) => p.id === pod.id));
    });
  });
});

