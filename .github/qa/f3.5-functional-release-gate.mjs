import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const baseUrl = process.env.STAGING_URL || 'https://landing-premium-lm-staging.pages.dev';
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await context.newPage();
const consoleErrors = [];
const pageErrors = [];

page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
page.on('pageerror', error => pageErrors.push(String(error)));

const response = await page.goto(baseUrl, { waitUntil: 'networkidle' });
assert.equal(response?.status(), 200, 'staging must return HTTP 200');

// Minimum document and discoverability contract.
assert.equal(await page.locator('html[lang="pt-BR"]').count(), 1, 'document language must be pt-BR');
assert.equal(await page.locator('h1').count(), 1, 'home must expose exactly one h1');
assert.ok((await page.title()).trim().length > 0, 'document title is required');
const description = await page.locator('meta[name="description"]').getAttribute('content');
assert.ok(description && description.trim().length >= 50, 'meta description must be meaningful');

// Core release assets must load successfully and render.
for (const selector of ['.hero__media img', '.results-grid img', '#sobre img']) {
  const images = page.locator(selector);
  assert.ok(await images.count() > 0, `missing release image set: ${selector}`);
  for (let i = 0; i < await images.count(); i += 1) {
    const image = images.nth(i);
    await image.scrollIntoViewIfNeeded();
    await page.waitForFunction(el => el.complete, await image.elementHandle());
    const state = await image.evaluate(el => ({ complete: el.complete, width: el.naturalWidth, height: el.naturalHeight }));
    assert.ok(state.complete && state.width > 0 && state.height > 0, `broken image: ${await image.getAttribute('src')}`);
  }
}

// Internal navigation targets cannot point to missing sections.
const hashLinks = page.locator('a[href^="#"]');
for (let i = 0; i < await hashLinks.count(); i += 1) {
  const href = await hashLinks.nth(i).getAttribute('href');
  if (!href || href === '#') continue;
  assert.equal(await page.locator(href).count(), 1, `missing internal target: ${href}`);
}

// Commercial links and conversion entry points are part of the release contract.
const portalLinks = page.locator('a[href="https://app.lucasmorenopersonal.com.br/"]');
assert.ok(await portalLinks.count() >= 1, 'Portal do Aluno link is required');
assert.ok(await page.locator('[data-start-qualification]').count() >= 3, 'qualification must have multiple entry points');
const directWhatsApp = page.locator('a[href^="https://wa.me/5514991174500"]');
assert.ok(await directWhatsApp.count() >= 1, 'direct WhatsApp fallback is required');

// Full premium handoff must remain functional at release time.
const trigger = page.locator('[data-start-qualification][data-source="premium"]');
await trigger.scrollIntoViewIfNeeded();
await trigger.click();
const dialog = page.locator('#qualification-dialog');
await dialog.waitFor({ state: 'visible' });
for (const step of ['1', '2', '3']) {
  const active = page.locator(`[data-step="${step}"]`);
  await active.locator('[data-answer]').first().click();
}
assert.equal(await page.locator('#qualification-progress-label').textContent(), 'Concluído');
const handoff = await page.locator('#qualification-whatsapp').getAttribute('href');
assert.match(handoff || '', /^https:\/\/wa\.me\/5514991174500\?text=/, 'qualification handoff must target official WhatsApp');
assert.match(decodeURIComponent((handoff || '').split('text=')[1] || ''), /Consultoria Premium LM/, 'premium WhatsApp context is required');

// Release must not ship developer placeholders or fake social proof markers.
const bodyText = await page.locator('body').innerText();
for (const forbidden of ['TODO', 'Lorem ipsum', 'Depoimento fictício', 'placeholder']) {
  assert.ok(!bodyText.toLowerCase().includes(forbidden.toLowerCase()), `forbidden release placeholder: ${forbidden}`);
}
assert.match(bodyText, /novo Portal LM está sendo desenvolvido/i, 'Portal must remain explicitly described as in development');

// Functional release cannot contain runtime errors or horizontal overflow.
assert.deepEqual(consoleErrors, [], `console errors: ${consoleErrors.join(' | ')}`);
assert.deepEqual(pageErrors, [], `page errors: ${pageErrors.join(' | ')}`);
const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
assert.ok(overflow <= 1, `horizontal overflow: ${overflow}px`);

await context.close();
await browser.close();
console.log('PASS F3.5 functional release gate');
