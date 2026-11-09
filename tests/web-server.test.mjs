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
});

