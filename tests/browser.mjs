import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile } from 'node:fs/promises';

const origin = 'http://127.0.0.1:4173';
const baseURL = `${origin}/Trivia/`;
const output = new URL('../test-results/', import.meta.url);
await mkdir(output, { recursive: true });
const bank = JSON.parse(await readFile(new URL('../data/questions.json', import.meta.url), 'utf8'));
const key = 'en-route-trivia:v1';
const questions = bank.questions;
const fills = questions.filter(q => q.type === 'fill');
const choice = questions.find(q => q.type === 'choice');
const boolean = questions.find(q => q.type === 'boolean');
assert.ok(fills.length >= 10 && choice && boolean);
const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const report = { startedAt: new Date().toISOString(), checks: [], errors: [], screenshots: [] };
const contexts = [];

function check(name) { report.checks.push(name); console.log(`PASS ${name}`); }
async function context(options = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1050 }, ...options });
  contexts.push(ctx);
  return ctx;
}
function watch(page) {
  page.on('pageerror', e => report.errors.push(e.message));
  page.on('console', msg => { if (msg.type() === 'error' && !msg.text().includes('net::ERR_') && !msg.text().includes('404')) report.errors.push(msg.text()); });
}
async function newPage(ctx) { const p = await ctx.newPage(); watch(p); return p; }
async function home(page) { await page.goto(baseURL); await page.locator('#start').waitFor(); }
async function ready(page) {
  await page.waitForFunction(() => document.querySelector('#status-dot')?.classList.contains('ready'), null, { timeout: 20000 });
}
async function screenshot(page, filename) {
  await page.screenshot({ path: new URL(filename, output).pathname.replace(/^\/([A-Za-z]:)/, '$1'), fullPage: true, animations: 'disabled' });
  report.screenshots.push(filename);
}
async function noOverflow(page, label) {
  const dimensions = await page.evaluate(() => ({ doc: document.documentElement.scrollWidth, viewport: innerWidth }));
  assert.ok(dimensions.doc <= dimensions.viewport, `${label}: ${JSON.stringify(dimensions)}`);
  check(`${label}: no horizontal overflow`);
}
function fixture(ids) { return { version: 1, favorites: [], records: {}, settings: { category: 'all', type: 'all', count: 10 }, session: { ids, index: 0, answers: [], optionOrder: {} } }; }
async function seed(page, ids) {
  await page.evaluate(({ key, state }) => localStorage.setItem(key, JSON.stringify(state)), { key, state: fixture(ids) });
  await page.reload();
  await page.locator('#question-title').waitFor();
}
async function stored(page) { return page.evaluate(key => JSON.parse(localStorage.getItem(key)), key); }
async function fillAnswer(page, value) { await page.locator('#answer').fill(value); await page.locator('#answer-form button[type=submit]').click(); await page.locator('#feedback').waitFor(); }

try {
  const desktop = await context();
  const page = await newPage(desktop);
  await home(page);
  await ready(page);
  assert.match(await page.locator('#home-title').innerText(), /世界很大/);
  await noOverflow(page, 'Desktop 1440px home');
  await screenshot(page, 'desktop-home.png');
  assert.equal(await page.locator('.stamp strong').innerText(), '1,000');
  check('Question count displayed as 1,000');

  const category = questions.find(q => q.type === 'choice').category;
  await page.locator(`[data-category="${category}"]`).click();
  await page.locator('[data-count="20"]').click();
  await page.locator('#type-select').selectOption('choice');
  assert.equal(await page.locator(`[data-category="${category}"]`).getAttribute('aria-pressed'), 'true');
  await page.locator('#start').click();
  await page.locator('#question-title').waitFor();
  let persisted = await stored(page);
  assert.equal(new Set(persisted.session.ids).size, persisted.session.ids.length);
  assert.ok(persisted.session.ids.every(id => questions.find(q => q.id === id).category === category && questions.find(q => q.id === id).type === 'choice'));
  check('Category, length, type filters and unique session questions');

  await seed(page, [fills[0].id, fills[1].id, fills[2].id, choice.id, boolean.id, ...fills.slice(3, 8).map(q => q.id)]);
  await screenshot(page, 'desktop-question.png');
  await page.locator('#bookmark').click();
  assert.equal(await page.locator('#bookmark').getAttribute('aria-pressed'), 'true');
  await fillAnswer(page, fills[0].aliases?.[0] || fills[0].answer);
  assert.equal((await stored(page)).session.answers[0].correct, true);
  await screenshot(page, 'desktop-explanation.png');
  const attempts = (await stored(page)).records[fills[0].id].attempts;
  await page.reload();
  await page.locator('#feedback').waitFor();
  assert.equal((await stored(page)).records[fills[0].id].attempts, attempts);
  assert.equal(await page.locator('#bookmark').getAttribute('aria-pressed'), 'true');
  check('Correct fill/alias, reload preserves feedback, score and favorite without double count');
  await page.locator('#back-home').click();
  await page.locator('#resume').click();
  await page.locator('#next').click();
  await fillAnswer(page, '測試用的另一種合理寫法');
  assert.equal((await stored(page)).session.answers[1].correct, false);
  await page.locator('#self-mark').click();
  assert.equal((await stored(page)).session.answers[1].correct, true);
  assert.equal((await stored(page)).session.answers[1].selfMarked, true);
  check('Pause/resume and fill answer self-correction');
  await page.locator('#next').click();
  await page.locator('#reveal').click();
  assert.equal((await stored(page)).session.answers[2].revealed, true);
  assert.equal(await page.locator('#self-mark').count(), 0);
  check('Reveal has explanation but is not counted as correct');
  await page.locator('#next').click();
  for (const option of await page.locator('.option').all()) if ((await option.locator('span').nth(1).innerText()) === choice.answer) { await option.click(); break; }
  assert.equal((await stored(page)).session.answers[3].correct, true);
  await page.locator('#next').click();
  const falseOption = boolean.options.find(o => o !== boolean.answer);
  const options = await page.locator('.option').all();
  for (const option of options) if ((await option.locator('span').nth(1).innerText()) === falseOption) { await option.click(); break; }
  assert.equal((await stored(page)).session.answers[4].correct, false);
  assert.equal(await page.locator('.option.is-right').count(), 1);
  check('Choice correct answer and boolean wrong answer highlight');
  await page.locator('#next').click();
  for (let i = 5; i < 10; i++) {
    await page.locator('#reveal').click();
    await page.locator('#next').click();
  }
  await page.locator('.result-score').waitFor();
  assert.match(await page.locator('.score-number').innerText(), /3\s*\/\s*10/);
  assert.equal(await page.locator('.review-list li').count(), 10);
  await screenshot(page, 'desktop-result.png');
  await page.locator('#retry-missed').click();
  assert.equal((await stored(page)).session.ids.length, 7);
  check('Ten-question result, scoring and retry-missed selection');
  await page.locator('#favorites-nav').click();
  assert.equal(await page.locator('.saved-card').count(), 1);
  assert.ok(await page.locator('.saved-card .source-list a').count());
  await page.locator('[data-remove]').click();
  assert.equal(await page.locator('.saved-card').count(), 0);
  check('Favorites library renders explanations/sources and removal persists');

  await seed(page, [fills[0].id, choice.id, boolean.id]);
  await ready(page);
  await desktop.setOffline(true);
  await page.reload();
  await page.locator('#question-title').waitFor();
  await ready(page);
  assert.match(await page.locator('#offline-status').innerText(), /目前離線/);
  await fillAnswer(page, fills[0].answer);
  await page.locator('#next').click();
  await page.locator('#reveal').click();
  await page.locator('#next').click();
  await page.locator('#reveal').click();
  await page.locator('#next').click();
  await page.locator('.result-score').waitFor();
  assert.ok(await page.locator('.review-list li').count() === 3);
  check('GitHub Pages /Trivia/ path: offline reload and complete mixed-type round');
  const flagQuestion = questions.find(q => q.image);
  if (flagQuestion) {
    await seed(page, [flagQuestion.id]);
    await page.waitForFunction(() => Array.from(document.querySelectorAll('#main img')).some(img => img.complete && img.naturalWidth > 0));
    await page.locator('#reveal').click();
    await page.locator('#feedback').waitFor();
    check('Flag image and explanation remain available offline');
  }
  const credits = await desktop.newPage();
  await credits.goto(`${baseURL}credits.html`);
  assert.ok((await credits.locator('body').innerText()).includes('ODbL'));
  await credits.close();
  check('Source and licensing credits are available offline');
  await desktop.setOffline(false);

  await seed(page, [fills[0].id, choice.id]);
  await ready(page);
  await fillAnswer(page, fills[0].answer);
  await page.evaluate(async () => {
    await navigator.serviceWorker.register('./sw.js?browser-update-check=1', { scope: './' });
  });
  await page.locator('#update-button').waitFor({ state: 'visible', timeout: 20000 });
  await Promise.all([page.waitForEvent('load'), page.locator('#update-button').click()]);
  await page.locator('#feedback').waitFor();
  await ready(page);
  assert.equal((await stored(page)).session.answers[0].correct, true);
  check('Waiting service worker update activation preserves answered session');

  const damagedContext = await context();
  const damaged = await newPage(damagedContext);
  await home(damaged);
  await ready(damaged);
  await damaged.evaluate(async () => {
    const names = await caches.keys();
    for (const name of names) {
      const cache = await caches.open(name);
      await cache.delete(new URL('./assets/icon.svg', location.href));
    }
  });
  await damaged.reload();
  await damaged.locator('#offline-retry').waitFor({ state: 'visible' });
  assert.match(await damaged.locator('#offline-status').innerText(), /未完成/);
  await damaged.locator('#offline-retry').click();
  await ready(damaged);
  check('Incomplete cache is detected and offline preparation retry restores it');

  const mobileContext = await context({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const mobile = await newPage(mobileContext);
  await home(mobile);
  await ready(mobile);
  await noOverflow(mobile, 'Mobile 390px home');
  await screenshot(mobile, 'mobile-home.png');
  await seed(mobile, [fills[0].id, choice.id]);
  await noOverflow(mobile, 'Mobile 390px quiz');
  await screenshot(mobile, 'mobile-question.png');
  await mobile.locator('#reveal').click();
  await noOverflow(mobile, 'Mobile 390px explanation');
  await screenshot(mobile, 'mobile-explanation.png');
  await mobile.setViewportSize({ width: 320, height: 740 });
  await noOverflow(mobile, 'Mobile 320px explanation');
  await mobile.locator('#back-home').click();
  await noOverflow(mobile, 'Mobile 320px home');
  await screenshot(mobile, 'mobile-320-home.png');

  const corruptContext = await context();
  const corrupt = await newPage(corruptContext);
  await corrupt.addInitScript(key => localStorage.setItem(key, '{broken'), key);
  await home(corrupt);
  assert.equal(await corrupt.locator('#start').count(), 1);
  check('Corrupted localStorage recovers to a playable home');

  const blockedContext = await context();
  const blocked = await newPage(blockedContext);
  await blocked.addInitScript(() => {
    Storage.prototype.getItem = () => { throw new DOMException('Blocked', 'SecurityError'); };
    Storage.prototype.setItem = () => { throw new DOMException('Blocked', 'SecurityError'); };
  });
  await home(blocked);
  assert.ok(await blocked.locator('.inline-notice').count());
  await blocked.locator('#start').click();
  await blocked.locator('#reveal').click();
  await blocked.locator('#feedback').waitFor();
  check('Unavailable localStorage still allows playing with honest notice');

  const failedBankContext = await context({ serviceWorkers: 'block' });
  const failedBank = await newPage(failedBankContext);
  await failedBank.route('**/data/questions.json', route => route.abort('failed'));
  await failedBank.goto(baseURL);
  await failedBank.locator('#reload').waitFor();
  assert.match(await failedBank.locator('h1').innerText(), /題庫還沒到站/);
  assert.equal(await failedBank.locator('#start').count(), 0);
  check('Unavailable first-load bank displays a retry state, not a false ready state');

  const firstOfflineContext = await context({ offline: true });
  const firstOffline = await firstOfflineContext.newPage();
  let firstLoadFailed = false;
  try { await firstOffline.goto(baseURL); } catch { firstLoadFailed = true; }
  assert.equal(firstLoadFailed, true);
  check('First-ever visit without internet/cache cannot load (documented limitation)');

  assert.deepEqual(report.errors, [], 'Unexpected browser errors');
  check('No unexpected JavaScript/console errors in normal flows');
  report.success = true;
} catch (error) {
  report.success = false;
  report.failure = error.stack;
  console.error(error.stack);
  process.exitCode = 1;
} finally {
  report.finishedAt = new Date().toISOString();
  await writeFile(new URL('browser-report.json', output), JSON.stringify(report, null, 2));
  await browser.close();
}
