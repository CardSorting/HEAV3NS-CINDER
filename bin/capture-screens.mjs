/** [LAYER: UI] */

import path from "node:path";
import fs from "node:fs/promises";
import puppeteer from "puppeteer-core";
import { CinderWebServer } from "../src/ui/web/webServer.mjs";

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function run() {
  const PORT = 3777;
  const webServer = new CinderWebServer({ port: PORT });
  const { url } = await webServer.start();
  console.log("Server started at", url);

  const browser = await puppeteer.launch({
    executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    headless: "new",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--window-size=1920,1080",
      "--hide-scrollbars",
      "--force-device-scale-factor=1",
    ],
  });

  const page = await browser.newPage();
  page.on("dialog", async (dialog) => {
    console.log("Browser Dialog handled:", dialog.message());
    await dialog.accept();
  });

  await page.setViewport({ width: 1920, height: 1080 });
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await sleep(1500);

  const outDir = path.resolve("public/video-deck/screens");
  await fs.mkdir(outDir, { recursive: true });

  // 1. Landing Dashboard
  await page.screenshot({ path: path.join(outDir, "screen-01-dashboard.png") });
  console.log("✓ Captured screen 1 (dashboard)");

  // 2. Select Alex Chen & view discovery
  await page.select("#attendee-select", "Alex Chen");
  await sleep(1500);
  await page.screenshot({ path: path.join(outDir, "screen-02-swipe-discovery.png") });
  console.log("✓ Captured screen 2 (swipe discovery)");

  // 3. Connect to Maya Lin
  const connectBtn = await page.$("#btn-connect");
  if (connectBtn) {
    await connectBtn.click();
    console.log("✓ Clicked Connect button");
  }
  await sleep(1500);
  await page.screenshot({ path: path.join(outDir, "screen-03-mutual-match.png") });
  console.log("✓ Captured screen 3 (mutual match)");

  // 4. Run full scenario on server
  console.log("Triggering scenario run on server...");
  await webServer.scenarioRunner.runFullScenario();
  console.log("✓ Server scenario completed!");
  await sleep(1000);

  // 5. Pods tab
  await page.evaluate(() => {
    const tab = document.querySelector('[data-tab="tab-pods"]');
    if (tab) tab.click();
  });
  await sleep(1500);
  await page.screenshot({ path: path.join(outDir, "screen-04-pod-channels.png") });
  console.log("✓ Captured screen 4 (pod channels)");

  // Scroll chat to show pinned meetup
  await page.evaluate(() => {
    const el = document.getElementById("chat-messages-container");
    if (el) el.scrollTop = el.scrollHeight;
  });
  await sleep(1000);
  await page.screenshot({ path: path.join(outDir, "screen-05-chat-meetup.png") });
  console.log("✓ Captured screen 5 (chat meetup)");

  // 6. Agenda tab
  await page.evaluate(() => {
    const tab = document.querySelector('[data-tab="tab-agenda"]');
    if (tab) tab.click();
  });
  await sleep(1500);
  await page.screenshot({ path: path.join(outDir, "screen-06-agenda.png") });
  console.log("✓ Captured screen 6 (agenda)");

  // 6b. Vector Topology Radar tab
  await page.evaluate(() => {
    const tab = document.querySelector('[data-tab="tab-radar"]');
    if (tab) tab.click();
  });
  await sleep(1500);
  await page.screenshot({ path: path.join(outDir, "screen-08-vector-radar.png") });
  console.log("✓ Captured screen 8 (vector radar)");

  // 7. Return to Discover and open story modal
  await page.evaluate(() => {
    const tab = document.querySelector('[data-tab="tab-discover"]');
    if (tab) tab.click();
  });
  await sleep(500);
  await page.evaluate(() => {
    const btn = document.getElementById("btn-run-story");
    if (btn) btn.click();
  });
  await sleep(4000);
  await page.screenshot({ path: path.join(outDir, "screen-07-story-modal.png") });
  console.log("✓ Captured screen 7 (story modal)");

  await browser.close();
  if (webServer.server) webServer.server.close();
  console.log("🎉 All 7 real live app screens captured successfully!");
}

run().catch((err) => {
  console.error("Error capturing screens:", err);
  process.exit(1);
});
