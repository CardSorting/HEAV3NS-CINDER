/** [LAYER: UI] */

import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { CinderApp } from "../../core/CinderApp.mjs";
import { ScenarioRunner } from "../../core/ScenarioRunner.mjs";
import { requestError } from "../../plumbing/requestError.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PUBLIC_DIR = path.join(__dirname, "public");

/**
 * Native HTTP & SSE Web Server for CINDER.
 * Zero external web framework dependencies.
 */
export class CinderWebServer {
  /**
   * @param {Object} [options]
   * @param {number} [options.port=3000]
   * @param {CinderApp} [options.app]
   */
  constructor({ port = 3000, app = null } = {}) {
    this.port = port;
    this.app = app || new CinderApp();
    this.scenarioRunner = new ScenarioRunner(this.app);
    /** @type {Map<import("node:http").ServerResponse, string>} SSE client -> eventId it watches */
    this.sseClients = new Map();
    this.server = null;
  }

  async start() {
    await this.app.initialize();

    // Hook domain events to SSE clients, delivered only to clients watching the same event
    for (const type of ["attendee.checked_in", "match.mutual", "match.message", "pod.formed", "message.sent", "meetup.pinned", "meetup.rsvp", "facilitator.announcement"]) {
      this.app.eventBus.subscribe(type, (payload) => {
        this.eventIdOf(payload)
          .then((eventId) => this.broadcastSSE(type, payload, eventId))
          .catch((err) => console.error(`SSE ${type} routing failed:`, err));
      });
    }

    this.server = http.createServer(async (req, res) => {
      try {
        await this.handleRequest(req, res);
      } catch (err) {
        const status = Number.isInteger(err.status) ? err.status : 500;
        if (status >= 500) console.error("HTTP Request Error:", err);
        res.writeHead(status, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: err.message, code: err.code || null }));
      }
    });

    return new Promise((resolve) => {
      this.server.listen(this.port, () => {
        resolve({ port: this.port, url: `http://localhost:${this.port}` });
      });
    });
  }

  async stop() {
    if (this.server) {
      for (const client of this.sseClients.keys()) {
        client.end();
      }
      this.sseClients.clear();
      await new Promise((resolve) => this.server.close(resolve));
    }
  }

  /**
   * Sends a realtime event to SSE clients. With an eventId, only clients watching that event receive it;
   * without one (event could not be determined) every client does.
   * @param {string} type
   * @param {Object} payload
   * @param {string|null} [eventId]
   */
  broadcastSSE(type, payload, eventId = null) {
    const data = JSON.stringify({ type, eventId, payload });
    for (const [client, clientEventId] of this.sseClients) {
      if (!eventId || clientEventId === eventId) client.write(`data: ${data}\n\n`);
    }
  }

  /**
   * Works out which event a domain-event payload belongs to (directly, or via its attendee or pod).
   * @param {Object} payload
   * @returns {Promise<string|null>}
   */
  async eventIdOf(payload = {}) {
    const direct = payload.eventId || payload.pod?.eventId || payload.match?.eventId || payload.message?.eventId;
    if (direct) return direct;
    const attendeeId = payload.fromAttendeeId || payload.match?.initiatorId;
    if (attendeeId) return (await this.app.checkInCtrl.getProfile(attendeeId))?.eventId || null;
    if (payload.podId) return (await this.app.podCtrl.getPod(payload.podId))?.eventId || null;
    return null;
  }

  async handleRequest(req, res) {
    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
    const pathname = url.pathname;
    const method = req.method;

    // CORS headers for local development
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    // 1. SSE Realtime Event Stream
    if (pathname === "/api/events" && method === "GET") {
      const event = await this.eventFor(url.searchParams.get("eventId"));
      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive"
      });
      res.write("retry: 10000\n\n");
      this.sseClients.set(res, event.id);
      req.on("close", () => this.sseClients.delete(res));
      return;
    }

    // 2. REST API Routes
    if (pathname === "/api/status" && method === "GET") {
      const status = await this.app.getStatus();
      return this.sendJson(res, status);
    }

    // Event selection: everything below is scoped to one event (?eventId= / body.eventId, else the default event)
    if (pathname === "/api/conferences" && method === "GET") {
      const categories = url.searchParams.get("category");
      const events = await this.app.eventCtrl.listEvents({
        categories: categories ? categories.split(",") : undefined,
        from: url.searchParams.get("from") || undefined,
        to: url.searchParams.get("to") || undefined,
        limit: url.searchParams.get("limit") ? parseInt(url.searchParams.get("limit"), 10) : undefined
      });
      return this.sendJson(res, { defaultEventId: this.app.defaultEventId, events });
    }

    if (pathname.startsWith("/api/conferences/") && method === "GET") {
      const eventId = decodeURIComponent(pathname.slice("/api/conferences/".length));
      return this.sendJson(res, await this.app.eventCtrl.describeEvent(eventId));
    }

    if (pathname === "/api/agenda" && method === "GET") {
      const event = await this.eventFor(url.searchParams.get("eventId"));
      return this.sendJson(res, {
        eventId: event.id,
        // Date and timezone so clients can place "HH:MM" session times (startDate/endDate are absolute).
        event: { id: event.id, name: event.name, timezone: event.timezone, startDate: event.startDate, endDate: event.endDate },
        ...(await this.app.facilitatorCtrl.getAgenda(event.id))
      });
    }

    if (pathname === "/api/attendees" && method === "GET") {
      const event = await this.eventFor(url.searchParams.get("eventId"));
      const list = await this.app.checkInCtrl.listAttendees(event.id);
      return this.sendJson(res, list.map((a) => a.toJSON()));
    }

    if (pathname === "/api/check-in" && method === "POST") {
      const body = await this.readJsonBody(req);
      const event = await this.eventFor(body.eventId);
      const attendee = await this.app.checkInCtrl.checkIn({ ...body, eventId: event.id });
      return this.sendJson(res, attendee.toJSON());
    }

    if (pathname === "/api/discovery" && method === "GET") {
      const event = await this.eventFor(url.searchParams.get("eventId"));
      const attendeeId = url.searchParams.get("attendeeId") || "att_alex_chen";
      const limit = parseInt(url.searchParams.get("limit") || "10", 10);
      await this.attendeeIn(event, attendeeId);
      const explain = /^(1|true)$/i.test(url.searchParams.get("explain") || "");
      const feed = await this.app.discoveryCtrl.getDiscoveryFeed(attendeeId, limit, { eventId: event.id, explain });
      return this.sendJson(res, { eventId: event.id, ...feed });
    }

    if (pathname === "/api/discovery/reset" && method === "POST") {
      const body = await this.readJsonBody(req);
      const event = await this.eventFor(body.eventId);
      const attendeeId = body.attendeeId || "att_alex_chen";
      await this.attendeeIn(event, attendeeId);
      const result = await this.app.discoveryCtrl.resetDiscovery(attendeeId, { eventId: event.id, resetAll: Boolean(body.resetAll) });
      return this.sendJson(res, { ...result, eventId: event.id });
    }

    if (pathname === "/api/swipe" && method === "POST") {
      const body = await this.readJsonBody(req);
      const event = await this.eventFor(body.eventId);
      await this.attendeeIn(event, body.fromAttendeeId);
      await this.attendeeIn(event, body.toAttendeeId);
      if (body.action === "like" && body.autoReciprocate) {
        if (!(await this.app.discoveryCtrl.hasLiked(body.toAttendeeId, body.fromAttendeeId, event.id))) {
          await this.app.discoveryCtrl.recordSwipe({
            fromAttendeeId: body.toAttendeeId,
            toAttendeeId: body.fromAttendeeId,
            action: "like",
            eventId: event.id
          });
        }
      }
      const result = await this.app.discoveryCtrl.recordSwipe({ ...body, eventId: event.id });
      return this.sendJson(res, result);
    }

    if (pathname === "/api/matches" && method === "GET") {
      const event = await this.eventFor(url.searchParams.get("eventId"));
      const attendeeId = url.searchParams.get("attendeeId") || "att_alex_chen";
      await this.attendeeIn(event, attendeeId);
      const mutuals = await this.app.discoveryCtrl.getMutualMatches(attendeeId, { eventId: event.id });
      const pods = await this.app.podCtrl.listPods(event.id);
      const enriched = await Promise.all(mutuals.map(async (item) => {
        const sharedPod = pods.find(
          (p) => p.memberIds.includes(attendeeId) && item.partner && p.memberIds.includes(item.partner.id)
        );
        return {
          ...item,
          sharedPodId: sharedPod ? sharedPod.id : null,
          sharedPodName: sharedPod ? sharedPod.name : null,
          messages: await this.app.commCtrl.listDirectMessages(item.match.id)
        };
      }));
      return this.sendJson(res, enriched);
    }

    if (pathname.startsWith("/api/matches/") && pathname.endsWith("/messages") && method === "POST") {
      const parts = pathname.split("/");
      const matchId = parts[3];
      const body = await this.readJsonBody(req);
      const event = await this.eventFor(body.eventId);
      await this.attendeeIn(event, body.senderId);
      const msg = await this.app.commCtrl.sendDirectMessage({
        matchId,
        senderId: body.senderId,
        content: body.content,
        eventId: event.id
      });
      return this.sendJson(res, msg);
    }

    if (pathname === "/api/pods" && method === "GET") {
      const event = await this.eventFor(url.searchParams.get("eventId"));
      const pods = await this.app.podCtrl.listPods(event.id);
      return this.sendJson(res, pods.map((p) => {
        const json = p.toJSON();
        json.compositionMeta = p.compositionMeta || null;
        return json;
      }));
    }

    if (pathname === "/api/pods/compose" && method === "POST") {
      const body = await this.readJsonBody(req);
      const event = await this.eventFor(body.eventId);
      const seedAttendeeIds = Array.isArray(body.seedAttendeeIds) && body.seedAttendeeIds.length > 0
        ? body.seedAttendeeIds
        : ["att_alex_chen", "att_maya_lin"];
      for (const id of seedAttendeeIds) await this.attendeeIn(event, id);
      const theme = body.theme || undefined; // omitted -> derived from the members' shared interests
      const targetSize = Number(body.targetSize) || 5;
      const pod = await this.app.podCtrl.composePod({ seedAttendeeIds, theme, targetSize, eventId: event.id });
      await this.app.facilitatorCtrl.welcomePod(pod.id);
      const updatedPod = await this.app.podCtrl.getPod(pod.id);
      const json = updatedPod.toJSON();
      json.compositionMeta = updatedPod.compositionMeta || null;
      return this.sendJson(res, json);
    }

    if (pathname.startsWith("/api/pods/") && pathname.endsWith("/messages") && method === "GET") {
      const parts = pathname.split("/");
      const podId = parts[3];
      const event = await this.eventFor(url.searchParams.get("eventId"));
      await this.podIn(event, podId);
      const messages = await this.app.commCtrl.getMessages(podId);
      return this.sendJson(res, messages);
    }

    if (pathname.startsWith("/api/pods/") && pathname.endsWith("/messages") && method === "POST") {
      const parts = pathname.split("/");
      const podId = parts[3];
      const body = await this.readJsonBody(req);
      const event = await this.eventFor(body.eventId);
      await this.podIn(event, podId);
      const message = await this.app.commCtrl.sendMessage({
        podId,
        senderId: body.senderId,
        content: body.content
      });
      return this.sendJson(res, message.toJSON());
    }

    if (pathname.startsWith("/api/pods/") && pathname.endsWith("/facilitator") && method === "POST") {
      const parts = pathname.split("/");
      const podId = parts[3];
      const body = await this.readJsonBody(req);
      const event = await this.eventFor(body.eventId);
      await this.podIn(event, podId);
      let msg = null;
      if (body.action === "welcome") {
        msg = await this.app.facilitatorCtrl.welcomePod(podId);
      } else if (body.action === "agenda") {
        msg = await this.app.facilitatorCtrl.triggerAgendaAlert(podId, body.sessionId);
      } else {
        msg = await this.app.facilitatorCtrl.triggerDiscussionPrompt(podId);
      }
      return this.sendJson(res, msg ? msg.toJSON() : { error: "Pod not found" }, msg ? 200 : 404);
    }

    if (pathname.startsWith("/api/pods/") && pathname.endsWith("/meetup") && method === "POST") {
      const parts = pathname.split("/");
      const podId = parts[3];
      const body = await this.readJsonBody(req);
      const event = await this.eventFor(body.eventId);
      await this.podIn(event, podId);
      const pinned = await this.app.commCtrl.proposeMeetup({
        podId,
        senderId: body.senderId || "att_alex_chen",
        location: body.location || undefined,
        time: body.time || undefined,
        note: body.note
      });
      return this.sendJson(res, pinned);
    }

    if (pathname.startsWith("/api/pods/") && pathname.endsWith("/rsvp") && method === "POST") {
      const parts = pathname.split("/");
      const podId = parts[3];
      const body = await this.readJsonBody(req);
      const event = await this.eventFor(body.eventId);
      await this.podIn(event, podId);
      const pinned = await this.app.commCtrl.rsvpMeetup({
        podId,
        attendeeId: body.attendeeId || "att_alex_chen",
        attending: body.attending !== false
      });
      return this.sendJson(res, pinned);
    }

    if (pathname === "/api/scenario/run" && method === "POST") {
      const result = await this.scenarioRunner.runFullScenario();
      return this.sendJson(res, result);
    }

    // 3. Static Assets Server
    const cleanPath = path.normalize(pathname).replace(/^(\.\.[\/\\])+/, "");
    const requestedFile = cleanPath === "/" || cleanPath === "" ? "index.html" : cleanPath.replace(/^\/+/, "");
    let filePath = path.join(PUBLIC_DIR, requestedFile);

    if (!filePath.startsWith(PUBLIC_DIR) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      filePath = path.join(PUBLIC_DIR, "index.html");
    }

    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
      ".html": "text/html",
      ".css": "text/css",
      ".js": "application/javascript",
      ".json": "application/json",
      ".svg": "image/svg+xml",
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".webp": "image/webp",
      ".ico": "image/x-icon",
      ".mp4": "video/mp4",
      ".pdf": "application/pdf"
    };

    const contentType = mimeTypes[ext] || "text/plain";
    const content = fs.readFileSync(filePath);
    res.writeHead(200, { "Content-Type": contentType });
    res.end(content);
  }

  sendJson(res, data, statusCode = 200) {
    res.writeHead(statusCode, { "Content-Type": "application/json" });
    res.end(JSON.stringify(data));
  }

  /**
   * Resolves the event a request runs against (explicit id, else the default event).
   * Throws 400/404 request errors that the handler maps to HTTP statuses.
   * @param {string|null|undefined} eventId
   */
  async eventFor(eventId) {
    return this.app.eventCtrl.resolveEvent(eventId || undefined);
  }

  /** Returns the attendee if registered for the event, else throws a 404 request error. */
  async attendeeIn(event, attendeeId) {
    const attendee = attendeeId ? await this.app.checkInCtrl.getProfile(attendeeId) : null;
    if (!attendee || (attendee.eventId && attendee.eventId !== event.id)) {
      throw requestError("ATTENDEE_NOT_FOUND", 404, `Attendee ${attendeeId} is not registered for ${event.id}`);
    }
    return attendee;
  }

  /** Returns the pod if it belongs to the event, else throws a 404 request error. */
  async podIn(event, podId) {
    const pod = await this.app.podCtrl.getPod(podId);
    if (!pod || (pod.eventId && pod.eventId !== event.id)) {
      throw requestError("POD_NOT_FOUND", 404, `Pod ${podId} not found for ${event.id}`);
    }
    return pod;
  }

  async readJsonBody(req) {
    return new Promise((resolve, reject) => {
      let body = "";
      req.on("data", (chunk) => {
        body += chunk;
      });
      req.on("end", () => {
        try {
          resolve(body ? JSON.parse(body) : {});
        } catch (err) {
          reject(new Error("Invalid JSON body"));
        }
      });
      req.on("error", reject);
    });
  }
}
