/** [LAYER: UI] */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { createServer } from 'vite';
import puppeteer from 'puppeteer-core';
import { CinderWebServer } from '../src/ui/web/webServer.mjs';

const chrome = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const clickText = async (page, text) => {
  const buttons = await page.$$('button');
  for (const button of buttons) {
    const property = await button.getProperty('textContent');
    if ((await property.jsonValue()).trim() === text && await button.isVisible()) { await button.click(); return; }
  }
  assert.fail(`Could not find visible button: ${text}`);
};
const waitText = (page, text) => page.waitForSelector(`text/${text}`);

test('React journeys use the real API on desktop and mobile', { skip: !existsSync(chrome), timeout: 60000 }, async () => {
  const api = new CinderWebServer({ port: 37494 });
  let vite, browser;
  try {
    await api.start();
    process.env.CINDER_API_URL = 'http://localhost:37494';
    vite = await createServer({ configFile: 'src/ui/web/react/vite.config.ts', server: { port: 37495, strictPort: true } });
    await vite.listen();
    browser = await puppeteer.launch({ executablePath: chrome, headless: true, args: ['--no-sandbox'] });
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.setViewport({ width: 1440, height: 900 });
    await page.goto('http://localhost:37495/', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.marketing-hero');
    for (const section of ['#how-it-works', '#discover-people', '#find-your-pod', '#facilitator', '#for-conferences']) {
      await page.click(`.marketing-navigation a[href="${section}"]`);
      assert.equal(new URL(page.url()).hash, section);
      assert.ok(await page.$(section), `Missing marketing section: ${section}`);
    }
    await page.goto('http://localhost:37495/', { waitUntil: 'domcontentloaded' });
    await page.click('.marketing-login');
    await page.waitForSelector('.home-workspace');
    assert.equal(new URL(page.url()).pathname, '/app');
    await page.goto('http://localhost:37495/', { waitUntil: 'domcontentloaded' });
    await page.click('.marketing-header-cta');
    await page.waitForSelector('.home-workspace');
    assert.equal(new URL(page.url()).pathname, '/app');
    await clickText(page, 'Discover');
    await page.waitForSelector('.candidate-top h2');
    assert.equal(new URL(page.url()).pathname, '/app/discover');
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.candidate-top h2');
    const candidateName = await (await (await page.$('.candidate-top h2')).getProperty('textContent')).jsonValue();
    const candidates = await (await fetch('http://localhost:37494/api/discovery?attendeeId=att_alex_chen')).json();
    const candidateId = candidates.candidates.find(item => item.profile.name === candidateName).profile.id;
    await fetch('http://localhost:37494/api/swipe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fromAttendeeId: candidateId, toAttendeeId: 'att_alex_chen', action: 'like' }) });
    await clickText(page, 'Connect');
    await waitText(page, 'It’s a connection.');
    await clickText(page, 'Go to your matches');
    await page.click('[aria-label="Activity"]');
    await waitText(page, 'You have a new mutual connection.');
    await page.reload({ waitUntil: 'domcontentloaded' });
    await waitText(page, 'You have a new mutual connection.');
    assert.equal(new URL(page.url()).pathname, '/app/activity');
    await page.click('[aria-label="Your profile"]');
    await page.waitForSelector('#attendee-switch');
    await page.select('#attendee-switch', candidateId);
    await clickText(page, 'Activity');
    await waitText(page, 'Nothing new right now');
    await page.click('[aria-label="Your profile"]');
    await page.waitForSelector('#attendee-switch');
    await page.select('#attendee-switch', 'att_alex_chen');
    await clickText(page, 'Activity');
    await waitText(page, 'You have a new mutual connection.');
    await clickText(page, 'Matches');
    await page.waitForSelector('#direct-message');
    await page.type('#direct-message', 'Hello from the browser test');
    await clickText(page, 'Send');
    await waitText(page, 'Hello from the browser test');
    await page.click('.side-nav .nav-item:nth-child(4)');
    assert.equal(new URL(page.url()).pathname, '/app/pods');
    await page.waitForSelector('.pod-layout, .empty');
    if (await page.$('.pod-layout')) await page.click('.pod-sidebar-top button');
    else await clickText(page, 'Create a Pod');
    await page.waitForSelector('#pod-message');
    await page.type('#pod-message', 'A real Pod message');
    await page.click('[aria-label="Send message"]');
    await waitText(page, 'A real Pod message');
    await clickText(page, 'Plan meetup');
    await page.select('.meetup-form select', 'Main Hall East Patio');
    await page.type('.meetup-form input', '12:15PM');
    await clickText(page, 'Pin meetup');
    await waitText(page, 'Meetup pinned');
    await page.waitForSelector('.pinned-bar');
    const pod = (await (await fetch('http://localhost:37494/api/pods')).json())[0];
    assert.equal(pod.pinnedMeetup.location, 'Main Hall East Patio');
    await page.click('.pinned-bar button');
    await waitText(page, 'Your RSVP was updated.');
    await clickText(page, 'Agenda');
    await waitText(page, 'Make time for ideas');
    await page.click('.schedule-summary button');
    const date = await page.$('.schedule-fields input[type="date"]');
    const client = await page.createCDPSession();
    const { root } = await client.send('DOM.getDocument');
    const { nodeId } = await client.send('DOM.querySelector', { nodeId: root.nodeId, selector: '.schedule-fields input[type="date"]' });
    await client.send('DOM.setAttributeValue', { nodeId, name: 'value', value: '2026-11-20' });
    await date.focus();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowUp');
    const zone = await page.$('.schedule-fields input:not([type="date"])');
    await zone.type('America/Los_Angeles');
    await clickText(page, 'Save details');
    await waitText(page, 'Personal schedule:');
    await page.reload({ waitUntil: 'domcontentloaded' });
    await waitText(page, 'Personal schedule:');
    assert.equal(new URL(page.url()).pathname, '/app/agenda');
    await clickText(page, 'Discover');
    await page.goBack({ waitUntil: 'domcontentloaded' });
    await waitText(page, 'Make time for ideas');
    assert.equal(new URL(page.url()).pathname, '/app/agenda');
    await page.click('[aria-label="Your profile"]');
    await page.waitForSelector('#attendee-switch');
    await clickText(page, 'Check in a new attendee');
    await page.type('.form-grid input', 'Test Attendee');
    await clickText(page, 'Complete check-in');
    await waitText(page, 'You’re checked in.');
    const attendees = await (await fetch('http://localhost:37494/api/attendees')).json();
    assert.ok(attendees.some(item => item.name === 'Test Attendee'));
    assert.deepEqual(errors, []);
    await page.close();

    const degraded = await browser.newPage();
    await degraded.setRequestInterception(true);
    let failRefresh = false;
    degraded.on('request', intercepted => {
      if (intercepted.url().includes('/api/swipe') && intercepted.method() === 'POST') failRefresh = true;
      if (failRefresh && intercepted.url().includes('/api/attendees')) void intercepted.abort();
      else void intercepted.continue();
    });
    await degraded.goto('http://localhost:37495/#discover', { waitUntil: 'domcontentloaded' });
    await degraded.waitForSelector('.candidate-top h2');
    await clickText(degraded, 'Pass');
    await waitText(degraded, 'Your action was confirmed, but the latest information could not be loaded.');
    await degraded.close();

    const marketingMobile = await browser.newPage();
    await marketingMobile.setViewport({ width: 390, height: 844 });
    await marketingMobile.goto('http://localhost:37495/', { waitUntil: 'domcontentloaded' });
    await marketingMobile.click('.marketing-menu-toggle');
    await marketingMobile.waitForSelector('.marketing-navigation.is-open');
    await marketingMobile.click('.marketing-navigation a[href="#find-your-pod"]');
    assert.equal(new URL(marketingMobile.url()).hash, '#find-your-pod');
    await marketingMobile.click('.marketing-header-cta');
    await marketingMobile.waitForSelector('.home-workspace');
    const marketingBody = await marketingMobile.$('body');
    const marketingWidth = await (await marketingBody.getProperty('scrollWidth')).jsonValue();
    assert.ok(marketingWidth <= 390, 'Horizontal overflow on the public landing page');
    await marketingMobile.close();

    const mobile = await browser.newPage();
    await mobile.setViewport({ width: 390, height: 844 });
    await mobile.goto('http://localhost:37495/app', { waitUntil: 'domcontentloaded' });
    await mobile.waitForSelector('.home-workspace');
    for (const [index, heading] of [[2, 'Meet someone new'], [3, 'Your connections'], [4, 'Your Pod space'], [5, 'Make time for ideas']]) {
      await mobile.click(`.mobile-nav .nav-item:nth-child(${index})`);
      await waitText(mobile, heading);
      const body = await mobile.$('body');
      const width = await (await body.getProperty('scrollWidth')).jsonValue();
      assert.ok(width <= 390, `Horizontal overflow on ${heading}`);
    }
    await mobile.close();
  } finally {
    if (browser) await browser.close();
    if (vite) await vite.close();
    await api.stop();
  }
});
