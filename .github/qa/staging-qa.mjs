import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const baseUrl = process.env.STAGING_URL || 'https://landing-premium-lm-staging.pages.dev';
const viewports = [
  { name: 'mobile-360', width: 360, height: 800 },
  { name: 'mobile-412', width: 412, height: 915 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1440, height: 900 }
];

const browser = await chromium.launch({ headless: true });
const failures = [];
const passes = [];

const run = async (name, fn) => {
  try {
    await fn();
    passes.push(name);
    console.log(`PASS ${name}`);
  } catch (error) {
    failures.push({ name, error: error?.stack || String(error) });
    console.error(`FAIL ${name}\n${error?.stack || error}`);
  }
};

await run('HTTP, headers, robots and static assets', async () => {
  const context = await browser.newContext();
  const page = await context.newPage();
  const badResponses = [];
  page.on('response', response => {
    if (response.status() >= 400 && new URL(response.url()).origin === new URL(baseUrl).origin) {
      badResponses.push(`${response.status()} ${response.url()}`);
    }
  });
  const response = await page.goto(baseUrl, { waitUntil: 'networkidle' });
  assert.equal(response?.status(), 200);
  const robotsHeader = response?.headers()['x-robots-tag'] || '';
  assert.match(robotsHeader, /noindex/i);
  const robots = await context.request.get(`${baseUrl}/robots.txt`);
  assert.equal(robots.status(), 200);
  assert.match(await robots.text(), /Disallow:\s*\//i);
  assert.deepEqual(badResponses, []);
  await context.close();
});

for (const viewport of viewports) {
  await run(`layout ${viewport.name}`, async () => {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    const consoleErrors = [];
    const pageErrors = [];
    page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
    page.on('pageerror', error => pageErrors.push(String(error)));
    await page.goto(baseUrl, { waitUntil: 'networkidle' });
    assert.equal(await page.locator('h1').count(), 1);
    assert.equal(await page.locator('#consultoria').count(), 1);
    assert.equal(await page.locator('#resultados').count(), 1);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    assert.ok(overflow <= 1, `horizontal overflow: ${overflow}px`);
    const heroBox = await page.locator('.hero').boundingBox();
    assert.ok(heroBox && heroBox.width > 0 && heroBox.height > 0);
    assert.deepEqual(consoleErrors, []);
    assert.deepEqual(pageErrors, []);
    await context.close();
  });
}

await run('qualification premium route, focus, back, restart and WhatsApp', async () => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  const trigger = page.locator('[data-start-qualification][data-source="premium"]');
  await trigger.scrollIntoViewIfNeeded();
  await trigger.click();
  const dialog = page.locator('#qualification-dialog');
  await expectVisible(dialog);
  assert.equal(await page.evaluate(() => document.activeElement?.closest('[data-step]')?.getAttribute('data-step')), '1');
  await page.locator('[data-step="1"] [data-answer]').first().click();
  assert.equal(await page.locator('#qualification-progress-label').textContent(), '2 de 3');
  await page.locator('[data-step="2"] [data-back]').click();
  assert.equal(await page.locator('#qualification-progress-label').textContent(), '1 de 3');
  await page.locator('[data-step="1"] [data-answer]').first().click();
  await page.locator('[data-step="2"] [data-answer]').first().click();
  await page.locator('[data-step="3"] [data-answer]').first().click();
  assert.equal(await page.locator('#qualification-progress-label').textContent(), 'Concluído');
  const href = await page.locator('#qualification-whatsapp').getAttribute('href');
  assert.match(href || '', /^https:\/\/wa\.me\/5514991174500\?text=/);
  assert.match(decodeURIComponent((href || '').split('text=')[1] || ''), /Consultoria Premium LM/);
  await page.locator('[data-restart]').click();
  assert.equal(await page.locator('#qualification-progress-label').textContent(), '1 de 3');
  await page.locator('[data-close-qualification]').click();
  await dialog.waitFor({ state: 'hidden' });
  assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('data-source')), 'premium');
  await context.close();
});

await run('training route and contextual WhatsApp', async () => {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await page.locator('[data-start-qualification][data-source="final"]').click();
  await page.locator('[data-step="1"] [data-answer]').first().click();
  await page.locator('[data-step="2"] [data-answer]').first().click();
  const training = page.locator('[data-step="3"] [data-answer][data-value="Principalmente um treino organizado"]');
  assert.equal(await training.count(), 1);
  await training.click();
  const href = await page.locator('#qualification-whatsapp').getAttribute('href');
  const decoded = decodeURIComponent((href || '').split('text=')[1] || '');
  assert.match(decoded, /principalmente um treino organizado/i);
  await context.close();
});

await run('Escape, backdrop and close analytics', async () => {
  await assertExitReason('escape', async page => {
    await page.keyboard.press('Escape');
  });

  await assertExitReason('backdrop', async page => {
    const dialog = page.locator('#qualification-dialog');
    const box = await dialog.boundingBox();
    assert.ok(box, 'dialog bounding box unavailable');
    const viewport = page.viewportSize();
    assert.ok(viewport, 'viewport unavailable');
    const candidates = [
      { x: Math.max(1, box.x - 12), y: Math.max(1, box.y + 12) },
      { x: Math.min(viewport.width - 1, box.x + box.width + 12), y: Math.max(1, box.y + 12) },
      { x: Math.max(1, box.x + 12), y: Math.max(1, box.y - 12) },
      { x: Math.max(1, box.x + 12), y: Math.min(viewport.height - 1, box.y + box.height + 12) }
    ];
    const outside = candidates.find(point => point.x < box.x || point.x > box.x + box.width || point.y < box.y || point.y > box.y + box.height);
    assert.ok(outside, 'no backdrop coordinate available');
    await page.mouse.click(outside.x, outside.y);
  });

  await assertExitReason('close_button', async page => {
    await page.locator('[data-close-qualification]').click();
  });
});

await run('analytics funnel and UTM continuity', async () => {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(`${baseUrl}/?utm_source=instagram&utm_medium=social&utm_campaign=f32qa`, { waitUntil: 'networkidle' });
  let data = await page.evaluate(() => window.dataLayer || []);
  const pageViews = data.filter(item => item.event === 'page_view');
  assert.equal(pageViews.length, 1);
  assert.equal(pageViews[0].utm_source, 'instagram');
  assert.equal(pageViews[0].utm_campaign, 'f32qa');
  await page.locator('[data-start-qualification][data-source="premium"]').click();
  await page.locator('[data-step="1"] [data-answer]').first().click();
  await page.locator('[data-step="2"] [data-answer]').first().click();
  await page.locator('[data-step="3"] [data-answer]').first().click();
  data = await page.evaluate(() => window.dataLayer || []);
  for (const event of ['qualification_started','qualification_q1_answered','qualification_q2_answered','qualification_q3_answered','qualification_completed']) {
    assert.ok(data.some(item => item.event === event), `missing ${event}`);
  }
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  data = await page.evaluate(() => window.dataLayer || []);
  const refreshed = data.filter(item => item.event === 'page_view').at(-1);
  assert.equal(refreshed?.utm_source, 'instagram');
  assert.equal(refreshed?.utm_campaign, 'f32qa');
  await context.close();
});

await run('restricted sessionStorage does not break conversion', async () => {
  const context = await browser.newContext();
  await context.addInitScript(() => {
    Object.defineProperty(window, 'sessionStorage', {
      configurable: true,
      get() { throw new DOMException('Blocked', 'SecurityError'); }
    });
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(String(error)));
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await page.locator('[data-start-qualification][data-source="premium"]').click();
  await expectVisible(page.locator('#qualification-dialog'));
  assert.deepEqual(errors, []);
  await context.close();
});

await browser.close();

console.log(`\nRESULT ${passes.length} passed, ${failures.length} failed`);
if (failures.length) {
  for (const failure of failures) console.error(`\n${failure.name}\n${failure.error}`);
  process.exit(1);
}

async function expectVisible(locator) {
  await locator.waitFor({ state: 'visible', timeout: 10000 });
  assert.equal(await locator.isVisible(), true);
}

async function lastEvent(page, eventName) {
  return page.evaluate(name => [...(window.dataLayer || [])].reverse().find(item => item.event === name) || null, eventName);
}

async function assertExitReason(reason, action) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await page.locator('[data-start-qualification][data-source="audience"]').click();
  const before = await page.evaluate(() => (window.dataLayer || []).filter(item => item.event === 'qualification_closed').length);
  await action(page);
  await page.waitForFunction(() => !document.querySelector('#qualification-dialog')?.open);
  await page.waitForFunction(expected => (window.dataLayer || []).filter(item => item.event === 'qualification_closed').length > expected, before);
  const closed = await lastEvent(page, 'qualification_closed');
  assert.equal(closed?.close_reason, reason);
  await context.close();
}
