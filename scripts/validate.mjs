import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import { CATEGORIES, normalizeAnswer } from '../lib/quiz.mjs';
const bank = JSON.parse(await readFile(new URL('../data/questions.json', import.meta.url), 'utf8'));
const sources = new Set();
for (const source of bank.sources) {
  assert.ok(source.id && source.title && source.publisher, 'Source metadata missing');
  assert.ok(!sources.has(source.id), `Duplicate source ID: ${source.id}`);
  assert.ok(['https:', 'http:'].includes(new URL(source.url).protocol), `Invalid source URL: ${source.id}`);
  sources.add(source.id);
}
const ids = new Set(), prompts = new Set(), counts = { fill: 0, choice: 0, boolean: 0 }, categories = {};
for (const q of bank.questions) {
  assert.ok(q.id && !ids.has(q.id), `Duplicate ID: ${q.id}`); ids.add(q.id);
  const prompt = normalizeAnswer(q.prompt) + '|' + (q.image || '') + '|' + (q.type === 'choice' ? [...q.options].sort().join('|') : '');
  assert.ok(prompt && !prompts.has(prompt), `Duplicate prompt: ${q.id}`); prompts.add(prompt);
  assert.ok(CATEGORIES.includes(q.category), `Unknown category: ${q.id}`);
  assert.ok(Object.hasOwn(counts, q.type), `Invalid type: ${q.id}`); counts[q.type]++;
  categories[q.category] = (categories[q.category] || 0) + 1;
  assert.ok(typeof q.answer === 'string' && q.answer.trim(), `Missing answer: ${q.id}`);
  assert.ok(Array.isArray(q.aliases) && q.aliases.every(a => typeof a === 'string' && a.trim()), `Invalid aliases: ${q.id}`);
  assert.ok(typeof q.explanation === 'string' && q.explanation.length >= 20, `Short explanation: ${q.id}`);
  assert.ok(/\p{Script=Han}/u.test(q.prompt) && /\p{Script=Han}/u.test(q.explanation), `Missing Chinese: ${q.id}`);
  assert.ok(q.sourceIds?.length > 0 && q.sourceIds.every(id => sources.has(id)), `Missing source: ${q.id}`);
  assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(q.checkedAt) && q.checkedAt <= bank.updatedAt, `Invalid checkedAt: ${q.id}`);
  assert.ok(Array.isArray(q.options), `Missing options: ${q.id}`);
  if (q.image) {
    assert.ok(/^\.\/assets\/flags\/[a-z]{2}\.svg$/.test(q.image), `Invalid flag image: ${q.id}`);
    await access(new URL('../' + q.image.slice(2), import.meta.url));
  }
  if (q.type !== 'fill') {
    assert.equal(q.options.length, q.type === 'choice' ? 4 : 2, `Option count: ${q.id}`);
    assert.equal(new Set(q.options.map(normalizeAnswer)).size, q.options.length, `Duplicate options: ${q.id}`);
    assert.ok(q.options.includes(q.answer), `Answer not in options: ${q.id}`);
    if (q.type === 'boolean') assert.deepEqual([...q.options].sort(), ['否', '是'].sort(), `Boolean options: ${q.id}`);
  } else assert.equal(q.options.length, 0, `Fill options: ${q.id}`);
}
assert.equal(bank.questions.length, 1000, 'Release requires 1,000 questions');
assert.deepEqual(counts, { fill: 800, choice: 100, boolean: 100 }, 'Release question mix');
console.log(JSON.stringify({ questions: ids.size, types: counts, categories, sources: sources.size, result: 'PASS' }, null, 2));
