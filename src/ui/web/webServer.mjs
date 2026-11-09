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

    if (pathname === "/api/swipe" && method === "POST") {
      const body = await this.readJsonBody(req);
      const result = await this.app.discoveryCtrl.recordSwipe(body);
      return this.sendJson(res, result);
    }

    if (pathname === "/api/pods" && method === "GET") {
      const pods = await this.app.podCtrl.listPods();
      return this.sendJson(res, pods.map((p) => p.toJSON()));
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

    const ext = path.extname(filePath);
    const mimeTypes = {
      ".html": "text/html",
      ".css": "text/css",
      ".js": "application/javascript",
      ".json": "application/json",
      ".svg": "image/svg+xml"
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

