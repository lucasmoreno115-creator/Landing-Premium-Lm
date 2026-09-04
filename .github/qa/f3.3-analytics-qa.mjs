import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const baseUrl = process.env.STAGING_URL || 'https://landing-premium-lm-staging.pages.dev';
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();
const page = await context.newPage();

await page.goto(`${baseUrl}/?utm_source=instagram&utm_medium=social&utm_campaign=f33qa`, { waitUntil: 'networkidle' });

await page.locator('[data-track="hero_resultados"]').click();
let data = await page.evaluate(() => window.dataLayer || []);
assert.ok(data.some(item => item.event === 'results_click' && item.source === 'hero_resultados'));
assert.ok(!data.some(item => item.event === 'consultoria_navigation_click' && item.source === 'hero_resultados'));

await page.locator('[data-track="hero_consultoria"]').click();
data = await page.evaluate(() => window.dataLayer || []);
assert.ok(data.some(item => item.event === 'consultoria_navigation_click' && item.source === 'hero_consultoria'));

await page.locator('[data-start-qualification][data-source="premium"]').click();
await page.locator('[data-step="1"] [data-value="Emagrecer"]').click();
await page.locator('[data-step="2"] [data-value="Organizar a alimentação"]').click();
await page.locator('[data-step="3"] [data-value="Treino e alimentação individualizados"]').click();

data = await page.evaluate(() => window.dataLayer || []);
const q1 = data.find(item => item.event === 'qualification_q1_answered');
const q2 = data.find(item => item.event === 'qualification_q2_answered');
const q3 = data.find(item => item.event === 'qualification_q3_answered');
const completed = data.find(item => item.event === 'qualification_completed');

assert.equal(q1?.answer_code, 'weight_loss');
assert.equal(q2?.answer_code, 'nutrition_organization');
assert.equal(q3?.answer_code, 'premium');
assert.equal(completed?.objective_code, 'weight_loss');
assert.equal(completed?.difficulty_code, 'nutrition_organization');
assert.equal(completed?.help_code, 'premium');
assert.equal(completed?.route, 'premium');

for (const event of [q1, q2, q3, completed]) {
  const serialized = JSON.stringify(event || {});
  assert.ok(!serialized.includes('Emagrecer'), 'raw objective leaked to analytics');
  assert.ok(!serialized.includes('Organizar a alimentação'), 'raw difficulty leaked to analytics');
  assert.ok(!serialized.includes('Treino e alimentação individualizados'), 'raw help answer leaked to analytics');
  assert.equal(Object.prototype.hasOwnProperty.call(event || {}, 'answer'), false, 'legacy raw answer field present');
}

const href = await page.locator('#qualification-whatsapp').getAttribute('href');
const decoded = decodeURIComponent((href || '').split('text=')[1] || '');
assert.match(decoded, /Objetivo: Emagrecer/);
assert.match(decoded, /Principal dificuldade: Organizar a alimentação/);
assert.match(decoded, /Tipo de ajuda: Treino e alimentação individualizados/);

await page.locator('#qualification-whatsapp').click({ noWaitAfter: true });
data = await page.evaluate(() => window.dataLayer || []);
assert.ok(data.some(item => item.event === 'qualification_handoff' && item.route === 'premium'));
assert.ok(data.some(item => item.event === 'whatsapp_click' && item.qualification_completed === true));
assert.ok(!data.some(item => item.event === 'lead'), 'WhatsApp click must not be treated as a confirmed lead');
assert.ok(!data.some(item => item.event === 'sale'), 'client-side flow must not emit sale');

await context.close();
await browser.close();
console.log('PASS F3.3 analytics privacy, event semantics and conversion boundary');
