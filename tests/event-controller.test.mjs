/** [LAYER: UI] */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { EventController } from "../src/core/EventController.mjs";
import { ConferenceEvent } from "../src/domain/conferenceEvent.mjs";
import { createClock } from "../src/plumbing/clock.mjs";

const DEMO = "urn:ue:event:devsummit-2026";
const make = (id, extra = {}) => new ConferenceEvent({
  id, name: id, category: "conference", startDate: "2026-12-23T09:00:00-07:00", endDate: "2026-12-25T17:30:00-07:00",
  timezone: "America/Denver", cinder: { enabled: true, registrations: 10 }, ...extra
});

function fakeRepo(events) {
  const calls = { findById: 0, listSelectable: [] };
  return {
    calls,
    async listSelectable(filters) { calls.listSelectable.push(filters); return events.filter((e) => e.isSelectable()); },
    async findById(id) { calls.findById++; return events.find((e) => e.id === id) || null; }
  };
}

describe("EventController", () => {
  const clock = createClock({ demoTime: "2026-12-23T11:45:00-07:00", frozen: true });

  it("lists selectable events with phase and default flag, passing filters through", async () => {
    const repo = fakeRepo([make(DEMO), make("urn:ue:event:later", { startDate: "2027-03-01T09:00:00Z", endDate: "2027-03-02T17:00:00Z" })]);
    const ctrl = new EventController({ eventRepo: repo, clock, defaultEventId: DEMO });
    const list = await ctrl.listEvents({ categories: ["conference"] });
    assert.deepStrictEqual(repo.calls.listSelectable[0], { categories: ["conference"] });
    assert.deepStrictEqual(list.map((e) => [e.id, e.phase, e.isDefault]), [[DEMO, "in-progress", true], ["urn:ue:event:later", "upcoming", false]]);
  });

  it("resolves the explicit event, else the default, and caches it", async () => {
    const repo = fakeRepo([make(DEMO), make("urn:ue:event:b")]);
    const ctrl = new EventController({ eventRepo: repo, clock, defaultEventId: DEMO });
    assert.strictEqual((await ctrl.resolveEvent()).id, DEMO);
    assert.strictEqual((await ctrl.resolveEvent("urn:ue:event:b")).id, "urn:ue:event:b");
    await ctrl.resolveEvent(DEMO);
    assert.strictEqual(repo.calls.findById, 2, "second lookup of the demo event is served from cache");
  });

  it("rejects missing, unknown, cancelled or non-CINDER events with request errors", async () => {
    const repo = fakeRepo([make("cancelled", { status: "EventCancelled" }), make("nodata", { cinder: { enabled: false } })]);
    const noDefault = new EventController({ eventRepo: repo, clock });
    await assert.rejects(() => noDefault.resolveEvent(), { code: "EVENT_REQUIRED", status: 400 });
    for (const id of ["unknown", "cancelled", "nodata"]) {
      await assert.rejects(() => noDefault.resolveEvent(id), { code: "EVENT_NOT_FOUND", status: 404 });
    }
  });

  it("describes an event with its phase at the clock time", async () => {
    const ctrl = new EventController({ eventRepo: fakeRepo([make(DEMO)]), clock, defaultEventId: DEMO });
    const d = await ctrl.describeEvent(DEMO);
    assert.strictEqual(d.phase, "in-progress");
    assert.strictEqual(d.isDefault, true);
    assert.strictEqual(d.cinder.registrations, 10);
  });
});
