import { readFile, writeFile } from 'node:fs/promises';
const root = new URL('../', import.meta.url);
const banks = await Promise.all(['data/geography.json', 'data/curated.json'].map(path => readFile(new URL(path, root), 'utf8').then(JSON.parse)));
const sourceMap = new Map();
for (const bank of banks) for (const source of bank.sources) {
  if (sourceMap.has(source.id) && sourceMap.get(source.id).url !== source.url) throw new Error(`Duplicate source ID: ${source.id}`);
  sourceMap.set(source.id, source);
}
const bank = {
  version: 1,
  updatedAt: '2026-11-09',
  description: '途中 TRIVIA：地理基礎與趣味故事題庫；每題附來源。',
  sources: [...sourceMap.values()],
  questions: banks.flatMap((bank, index) => bank.questions.map(q => ({ ...q, collection: index === 0 ? 'atlas' : 'stories' }))),
};
await writeFile(new URL('data/questions.json', root), JSON.stringify(bank, null, 2) + '\n');
console.log(`Assembled ${bank.questions.length} questions / ${bank.sources.length} sources.`);
