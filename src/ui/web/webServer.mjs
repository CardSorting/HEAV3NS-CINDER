/** [LAYER: UI] */

import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { CinderApp } from "../../core/CinderApp.mjs";
import { ScenarioRunner } from "../../core/ScenarioRunner.mjs";

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
    this.sseClients = new Set();
    this.directMessages = new Map();
    this.server = null;
  }

  async start() {
    await this.app.initialize();

    // Hook domain events to SSE clients
    this.app.eventBus.subscribe("attendee.checked_in", (payload) => {
      this.broadcastSSE("attendee.checked_in", payload);
    });
    this.app.eventBus.subscribe("match.mutual", (payload) => {
      this.broadcastSSE("match.mutual", payload);
    });
    this.app.eventBus.subscribe("pod.formed", (payload) => {
      this.broadcastSSE("pod.formed", payload);
    });
    this.app.eventBus.subscribe("message.sent", (payload) => {
      this.broadcastSSE("message.sent", payload);
    });
    this.app.eventBus.subscribe("meetup.pinned", (payload) => {
      this.broadcastSSE("meetup.pinned", payload);
    });
    this.app.eventBus.subscribe("facilitator.announcement", (payload) => {
      this.broadcastSSE("facilitator.announcement", payload);
    });

    this.server = http.createServer(async (req, res) => {
      try {
        await this.handleRequest(req, res);
      } catch (err) {
        console.error("HTTP Request Error:", err);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: err.message }));
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
      for (const client of this.sseClients) {
        client.end();
      }
      this.sseClients.clear();
      await new Promise((resolve) => this.server.close(resolve));
    }
  }

  broadcastSSE(type, payload) {
    const data = JSON.stringify({ type, payload });
    for (const client of this.sseClients) {
      client.write(`data: ${data}\n\n`);
    }
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
      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive"
      });
      res.write("retry: 10000\n\n");
      this.sseClients.add(res);
      req.on("close", () => this.sseClients.delete(res));
      return;
    }

    // 2. REST API Routes
    if (pathname === "/api/status" && method === "GET") {
      const status = await this.app.getStatus();
      return this.sendJson(res, status);
    }

    if (pathname === "/api/agenda" && method === "GET") {
      return this.sendJson(res, {
        sessions: this.app.agenda,
        venues: this.app.venues || [],
        prompts: this.app.discussionPrompts || []
      });
    }

    if (pathname === "/api/attendees" && method === "GET") {
      const list = await this.app.checkInCtrl.listAttendees();
      return this.sendJson(res, list.map((a) => a.toJSON()));
    }

    if (pathname === "/api/check-in" && method === "POST") {
      const body = await this.readJsonBody(req);
      const attendee = await this.app.checkInCtrl.checkIn(body);
      return this.sendJson(res, attendee.toJSON());
    }

    if (pathname === "/api/discovery" && method === "GET") {
      const attendeeId = url.searchParams.get("attendeeId") || "att_alex_chen";
      const limit = parseInt(url.searchParams.get("limit") || "10", 10);
      const feed = await this.app.discoveryCtrl.getDiscoveryFeed(attendeeId, limit);
      return this.sendJson(res, feed);
    }

    if (pathname === "/api/discovery/reset" && method === "POST") {
      const body = await this.readJsonBody(req);
      const attendeeId = body.attendeeId || "att_alex_chen";
      for (const [key, action] of this.app.discoveryCtrl.swipes.entries()) {
        if (key.startsWith(`${attendeeId}:`) && (action === "pass" || body.resetAll)) {
          this.app.discoveryCtrl.swipes.delete(key);
        }
      }
      const feed = await this.app.discoveryCtrl.getDiscoveryFeed(attendeeId, 10);
      return this.sendJson(res, { reset: true, feed });
    }

    if (pathname === "/api/swipe" && method === "POST") {
      const body = await this.readJsonBody(req);
      if (body.action === "like" && body.autoReciprocate) {
        const reverseKey = `${body.toAttendeeId}:${body.fromAttendeeId}`;
        if (!this.app.discoveryCtrl.swipes.has(reverseKey)) {
          await this.app.discoveryCtrl.recordSwipe({
            fromAttendeeId: body.toAttendeeId,
            toAttendeeId: body.fromAttendeeId,
            action: "like"
          });
        }
      }
      const result = await this.app.discoveryCtrl.recordSwipe(body);
      return this.sendJson(res, result);
    }

    if (pathname === "/api/matches" && method === "GET") {
      const attendeeId = url.searchParams.get("attendeeId") || "att_alex_chen";
      const mutuals = await this.app.discoveryCtrl.getMutualMatches(attendeeId);
      const pods = await this.app.podCtrl.listPods();
      const enriched = mutuals.map((item) => {
        const sharedPod = pods.find(
          (p) => p.memberIds.includes(attendeeId) && item.partner && p.memberIds.includes(item.partner.id)
        );
        return {
          ...item,
          sharedPodId: sharedPod ? sharedPod.id : null,
          sharedPodName: sharedPod ? sharedPod.name : null,
          messages: this.directMessages.get(item.match.id) || []
        };
      });
      return this.sendJson(res, enriched);
    }

    if (pathname.startsWith("/api/matches/") && pathname.endsWith("/messages") && method === "POST") {
      const parts = pathname.split("/");
      const matchId = parts[3];
      const body = await this.readJsonBody(req);
      const sender = await this.app.checkInCtrl.getProfile(body.senderId);
      const msg = {
        id: `dm_${Date.now()}`,
        matchId,
        senderId: body.senderId,
        senderName: sender ? sender.name : "Attendee",
        content: body.content,
        timestamp: new Date().toISOString()
      };
      const existing = this.directMessages.get(matchId) || [];
      existing.push(msg);
      this.directMessages.set(matchId, existing);
      this.broadcastSSE("match.message", { matchId, message: msg });
      return this.sendJson(res, msg);
    }

    if (pathname === "/api/pods" && method === "GET") {
      const pods = await this.app.podCtrl.listPods();
      return this.sendJson(res, pods.map((p) => {
        const json = p.toJSON();
        json.compositionMeta = p.compositionMeta || null;
        return json;
      }));
    }

    if (pathname === "/api/pods/compose" && method === "POST") {
      const body = await this.readJsonBody(req);
      const seedAttendeeIds = Array.isArray(body.seedAttendeeIds) && body.seedAttendeeIds.length > 0
        ? body.seedAttendeeIds
        : ["att_alex_chen", "att_maya_lin"];
      const theme = body.theme || "Autonomous Cloud & Systems";
      const targetSize = Number(body.targetSize) || 5;
      const pod = await this.app.podCtrl.composePod({ seedAttendeeIds, theme, targetSize });
      await this.app.facilitatorCtrl.welcomePod(pod.id);
      const updatedPod = await this.app.podCtrl.getPod(pod.id);
      const json = updatedPod.toJSON();
      json.compositionMeta = updatedPod.compositionMeta || null;
      return this.sendJson(res, json);
    }

    if (pathname.startsWith("/api/pods/") && pathname.endsWith("/messages") && method === "GET") {
      const parts = pathname.split("/");
      const podId = parts[3];
      const messages = await this.app.commCtrl.getMessages(podId);
      return this.sendJson(res, messages);
    }

    if (pathname.startsWith("/api/pods/") && pathname.endsWith("/messages") && method === "POST") {
      const parts = pathname.split("/");
      const podId = parts[3];
      const body = await this.readJsonBody(req);
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
      let msg = null;
      if (body.action === "welcome") {
        msg = await this.app.facilitatorCtrl.welcomePod(podId);
      } else if (body.action === "agenda") {
        msg = await this.app.facilitatorCtrl.triggerAgendaAlert(podId, body.sessionId || "session_05");
      } else {
        msg = await this.app.facilitatorCtrl.triggerDiscussionPrompt(podId);
      }
      return this.sendJson(res, msg ? msg.toJSON() : { error: "Pod not found" }, msg ? 200 : 404);
    }

    if (pathname.startsWith("/api/pods/") && pathname.endsWith("/meetup") && method === "POST") {
      const parts = pathname.split("/");
      const podId = parts[3];
      const body = await this.readJsonBody(req);
      const location = body.location || "Main Hall East Patio";
      const time = body.time || "12:15 PM";
      const senderId = body.senderId || "att_alex_chen";
      const proposalText = body.note || `Let's meet at ${location} at ${time} to collaborate!`;
      await this.app.commCtrl.sendMessage({
        podId,
        senderId,
        content: proposalText
      });
      const pod = await this.app.podCtrl.getPod(podId);
      if (pod) {
        pod.pinMeetup(location, time, true);
        pod.pinnedMeetup.rsvps = Array.from(new Set([...(pod.memberIds.slice(0, 3)), senderId]));
        await this.app.podRepo.save(pod);
        this.broadcastSSE("meetup.pinned", {
          podId,
          location,
          time,
          rsvps: pod.pinnedMeetup.rsvps
        });
      }
      return this.sendJson(res, pod ? pod.pinnedMeetup : { location, time, confirmed: true });
    }

    if (pathname.startsWith("/api/pods/") && pathname.endsWith("/rsvp") && method === "POST") {
      const parts = pathname.split("/");
      const podId = parts[3];
      const body = await this.readJsonBody(req);
      const attendeeId = body.attendeeId || "att_alex_chen";
      const pod = await this.app.podCtrl.getPod(podId);
      if (!pod) {
        return this.sendJson(res, { error: "Pod not found" }, 404);
      }
      if (!pod.pinnedMeetup) {
        pod.pinMeetup("Main Hall East Patio", "12:15 PM", true);
      }
      const initialRsvps = pod.pinnedMeetup.rsvps || pod.memberIds.filter((id) => id !== attendeeId);
      const rsvpSet = new Set(initialRsvps);
      if (body.attending === false) {
        rsvpSet.delete(attendeeId);
      } else {
        rsvpSet.add(attendeeId);
      }
      pod.pinnedMeetup.rsvps = Array.from(rsvpSet);
      await this.app.podRepo.save(pod);
      this.broadcastSSE("meetup.rsvp", {
        podId,
        pinnedMeetup: pod.pinnedMeetup
      });
      return this.sendJson(res, pod.pinnedMeetup);
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

