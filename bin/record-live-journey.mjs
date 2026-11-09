/** [LAYER: UI] */

import path from "node:path";
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import puppeteer from "puppeteer-core";
import { CinderWebServer } from "../src/ui/web/webServer.mjs";

const PORT = 3888;
const OUTPUT_MP4 = path.resolve("public/video-deck/CINDER_Live_App_Session_Recording.mp4");
const ROOT_MP4 = path.resolve("CINDER_Live_App_Session_Recording.mp4");

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function recordLiveJourney() {
  console.log("🔥 PLUS ULTRA: Starting CINDER Live User Journey Recording...");
  console.log("1. Starting embedded CINDER web server on port", PORT);
  const webServer = new CinderWebServer({ port: PORT });
  const { url } = await webServer.start();
  console.log("   ✓ Server online at", url);

  console.log("2. Launching Google Chrome (1920x1080 Full-HD)...");
  const browser = await puppeteer.launch({
    executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    headless: "new",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--window-size=1920,1080",
      "--hide-scrollbars",
      "--force-device-scale-factor=1",
      "--enable-font-antialiasing",
    ],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  // Handle any remaining native dialogs gracefully
  page.on("dialog", async (d) => {
    console.log("Dialog intercepted:", d.message());
    await d.accept();
  });

  await page.goto(url, { waitUntil: "domcontentloaded" });
  await sleep(1000);

  // Inject Virtual Smooth Animated Cursor into the page DOM
  await page.evaluate(() => {
    const cursor = document.createElement("div");
    cursor.id = "virtual-cursor";
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("width", "28");
    svg.setAttribute("height", "28");
    svg.setAttribute("viewBox", "0 0 28 28");
    svg.setAttribute("fill", "none");
    svg.style.filter = "drop-shadow(0 2px 8px rgba(0,0,0,0.8))";

    const pathEl = document.createElementNS("http://www.w3.org/2000/svg", "path");
    pathEl.setAttribute("d", "M4 2L22 13L13 15L9 24L4 2Z");
    pathEl.setAttribute("fill", "#ff6b35");
    pathEl.setAttribute("stroke", "#ffffff");
    pathEl.setAttribute("stroke-width", "1.8");
    pathEl.setAttribute("stroke-linejoin", "round");
    svg.appendChild(pathEl);

    const rip = document.createElement("div");
    rip.id = "virtual-ripple";
    rip.style.position = "absolute";
    rip.style.top = "-10px";
    rip.style.left = "-10px";
    rip.style.width = "44px";
    rip.style.height = "44px";
    rip.style.borderRadius = "50%";
    rip.style.border = "2px solid #00f0ff";
    rip.style.opacity = "0";
    rip.style.pointerEvents = "none";
    rip.style.transform = "scale(0.3)";
    rip.style.transition = "all 0.35s ease-out";

    cursor.appendChild(svg);
    cursor.appendChild(rip);
    cursor.style.position = "fixed";
    cursor.style.top = "0px";
    cursor.style.left = "0px";
    cursor.style.width = "28px";
    cursor.style.height = "28px";
    cursor.style.pointerEvents = "none";
    cursor.style.zIndex = "999999";
    cursor.style.display = "block";
    cursor.style.transform = "translate(960px, 540px)";
    document.body.appendChild(cursor);

    window.__cursorX = 960;
    window.__cursorY = 540;

    window.moveCursorTo = function (x, y, duration = 400) {
      return new Promise((resolve) => {
        const startX = window.__cursorX;
        const startY = window.__cursorY;
        const startTime = performance.now();

        function step(now) {
          const elapsed = now - startTime;
          const progress = Math.min(1, elapsed / duration);
          // Ease-in-out cubic
          const ease = progress < 0.5
            ? 4 * progress * progress * progress
            : 1 - Math.pow(-2 * progress + 2, 3) / 2;

          window.__cursorX = startX + (x - startX) * ease;
          window.__cursorY = startY + (y - startY) * ease;

          const el = document.getElementById("virtual-cursor");
          if (el) el.style.transform = `translate(${window.__cursorX}px, ${window.__cursorY}px)`;

          if (progress < 1) {
            requestAnimationFrame(step);
          } else {
            resolve();
          }
        }
        requestAnimationFrame(step);
      });
    };

    window.triggerCursorClick = function () {
      const el = document.getElementById("virtual-cursor");
      const rip = document.getElementById("virtual-ripple");
      if (el) el.style.transform = `translate(${window.__cursorX}px, ${window.__cursorY}px) scale(0.85)`;
      if (rip) {
        rip.style.opacity = "1";
        rip.style.transform = "scale(1.2)";
      }
      setTimeout(() => {
        if (el) el.style.transform = `translate(${window.__cursorX}px, ${window.__cursorY}px) scale(1)`;
        if (rip) {
          rip.style.opacity = "0";
          rip.style.transform = "scale(0.3)";
        }
      }, 200);
    };

    // Keep page animation active for 60fps repaints
    let tick = 0;
    const ticker = document.createElement("div");
    ticker.id = "live-stream-ticker";
    ticker.style.position = "fixed";
    ticker.style.bottom = "0px";
    ticker.style.right = "0px";
    ticker.style.width = "1px";
    ticker.style.height = "1px";
    ticker.style.opacity = "0.01";
    document.body.appendChild(ticker);

    function repaintLoop() {
      tick = (tick + 1) % 1000;
      ticker.style.transform = `translateZ(${tick}px)`;
      requestAnimationFrame(repaintLoop);
    }
    requestAnimationFrame(repaintLoop);
  });

  console.log("3. Preparing FFmpeg real session video pipeline (30 FPS)...");
  const ffmpeg = spawn("ffmpeg", [
    "-y",
    "-f", "image2pipe",
    "-vcodec", "mjpeg",
    "-r", "30",
    "-i", "-",
    "-vf", "fps=30,format=yuv420p",
    "-c:v", "libx264",
    "-preset", "fast",
    "-crf", "18",
    "-movflags", "+faststart",
    "/tmp/cinder_live_journey_raw.mp4",
  ]);

  const client = await page.target().createCDPSession();
  let frameCount = 0;

  client.on("Page.screencastFrame", async ({ data, sessionId }) => {
    try {
      const buf = Buffer.from(data, "base64");
      ffmpeg.stdin.write(buf);
      frameCount++;
      await client.send("Page.screencastFrameAck", { sessionId });
    } catch (e) {
      // Pipe closing
    }
  });

  await client.send("Page.startScreencast", { format: "jpeg", quality: 88, everyNthFrame: 1 });

  // Virtual interaction runner
  async function moveCursor(selectorOrCoords, duration = 500) {
    if (typeof selectorOrCoords === "string") {
      const box = await page.evaluate((sel) => {
        const el = document.querySelector(sel);
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      }, selectorOrCoords);
      if (box && !isNaN(box.x) && !isNaN(box.y)) {
        await page.evaluate((x, y, d) => window.moveCursorTo(x, y, d), box.x, box.y, duration);
      }
    } else {
      await page.evaluate((x, y, d) => window.moveCursorTo(x, y, d), selectorOrCoords.x, selectorOrCoords.y, duration);
    }
    await sleep(duration + 40);
  }

  async function clickElement(selector) {
    await moveCursor(selector, 450);
    await page.evaluate(() => window.triggerCursorClick());
    await sleep(150);
    await page.evaluate((sel) => {
      const el = document.querySelector(sel);
      if (el) el.click();
    }, selector);
    await sleep(350);
  }

  try {
    console.log("4. Executing authentic live user journey with visible animated cursor...");

    // ACT 1: Landing & Exploration (0s - 7s)
    await sleep(1000);
    console.log("   - Gliding cursor over brand logo");
    await moveCursor(".brand", 600);
    await sleep(800);

    console.log("   - Inspecting Elasticsearch cluster health chip");
    await moveCursor(".es-status-chip", 600);
    await sleep(1000);

    console.log("   - Inspecting Milestone tracker");
    await moveCursor("#ms-1", 500);
    await sleep(400);
    await moveCursor("#ms-2", 400);
    await sleep(600);

    // ACT 2: Hero Selection & Discovery (7s - 14s)
    console.log("   - Selecting Alex Chen");
    await moveCursor("#attendee-select", 500);
    await page.select("#attendee-select", "Alex Chen");
    await sleep(1200);

    console.log("   - Inspecting Maya Lin's 89% Hybrid Match Card");
    await moveCursor("#card-score", 600);
    await sleep(800);
    await moveCursor(".why-match-box", 600);
    await sleep(1200);

    // ACT 3: Connect Button & Match Celebration (14s - 22s)
    console.log("   - Clicking Connect to forge mutual match");
    await clickElement("#btn-connect");
    await sleep(1400);

    console.log("   - Inspecting Celebration Modal (Alex × Maya converge)");
    await moveCursor(".match-badge-glow", 600);
    await sleep(800);
    await moveCursor(".match-affinity-pill", 500);
    await sleep(800);

    console.log("   - Clicking 'Enter Pod 07 & Chat'");
    await clickElement("#btn-match-pod");
    await sleep(1500);

    // ACT 4: Pod 07 Chat & Real-Time Interaction (22s - 34s)
    console.log("   - Inside #pod-07-autonomous-cloud");
    await moveCursor("#pod-title", 500);
    await sleep(800);

    // Trigger full scenario so all seed chat and pinned meetup load seamlessly
    console.log("   - Syncing scenario and facilitator state");
    await webServer.scenarioRunner.runFullScenario();
    await page.evaluate(() => window.selectPod("pod_mw9p6n2q_wxe3ebdg"));
    await sleep(1200);

    console.log("   - Scrolling through group chat messages");
    await page.evaluate(() => {
      const c = document.getElementById("chat-messages-container");
      if (c) c.scrollTop = c.scrollHeight;
    });
    await sleep(1000);

    console.log("   - Typing message into Pod channel");
    await clickElement("#chat-input");
    const msgText = "Whiteboarding the eBPF healing controller at 12:15 lunch?";
    for (const char of msgText) {
      await page.type("#chat-input", char, { delay: 35 });
    }
    await sleep(400);
    await clickElement("#chat-send-btn");
    await sleep(1000);

    console.log("   - Confirming RSVP on Pinned Meetup Bar");
    await clickElement("#btn-rsvp");
    await sleep(1500);

    // ACT 5: Vector Topology Radar (34s - 45s)
    console.log("   - Switching to 🌐 Vector Topology Radar");
    await clickElement('[data-tab="tab-radar"]');
    await sleep(1500);

    console.log("   - Exploring 32-dim polar embedding projection");
    await moveCursor({ x: 960, y: 560 }, 800);
    await sleep(1500);
    await moveCursor({ x: 1080, y: 500 }, 700); // Maya Lin node
    await sleep(1500);
    await moveCursor(".radar-telemetry-bar", 600);
    await sleep(1200);

    // ACT 6: Conference Agenda & Story Verification (45s - 55s)
    console.log("   - Checking Conference Agenda");
    await clickElement('[data-tab="tab-agenda"]');
    await sleep(1500);
    await moveCursor(".tag.accent", 600);
    await sleep(1200);

    console.log("   - Running 10-Step Hackathon Verification Modal");
    await clickElement('[data-tab="tab-discover"]');
    await sleep(800);
    await clickElement("#btn-run-story");
    await sleep(6500);

    console.log("   ✓ Live user journey recording complete!");
  } finally {
    await client.send("Page.stopScreencast");
    ffmpeg.stdin.end();
    await new Promise((r) => ffmpeg.on("close", r));
    await browser.close();
    if (webServer.server) webServer.server.close();
  }

  console.log(`5. Captured ${frameCount} raw 60/30fps video frames.`);

  // Mix with synchronized voiceover narration
  console.log("6. Mixing synchronized audio narration and audio stream...");
  const audioWav = path.resolve("public/video-deck/audio_demo/master_demo_voiceover.wav");

  const mixCmd = [
    "ffmpeg", "-y",
    "-i", "/tmp/cinder_live_journey_raw.mp4",
    "-i", audioWav,
    "-c:v", "libx264",
    "-preset", "fast",
    "-crf", "18",
    "-pix_fmt", "yuv420p",
    "-c:a", "aac",
    "-b:a", "192k",
    "-shortest",
    "-movflags", "+faststart",
    OUTPUT_MP4,
  ];

  await new Promise((resolve, reject) => {
    const p = spawn("ffmpeg", mixCmd.slice(1));
    p.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg exited with code ${code}`))));
  });

  await fs.copyFile(OUTPUT_MP4, ROOT_MP4);
  console.log("   ✓ Final Live User Journey Video generated:");
  console.log("     -", OUTPUT_MP4);
  console.log("     -", ROOT_MP4);
}

recordLiveJourney().catch((err) => {
  console.error("Live journey recording failed:", err);
  process.exit(1);
});
