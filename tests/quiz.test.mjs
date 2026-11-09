import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeAnswer, isCorrect, emptyState, sanitizeState, chooseQuestions, recordAnswer, acceptOwnAnswer, shuffled } from '../lib/quiz.mjs';
const q = { id: 'test-1', type: 'fill', category: '地圖與地理', answer: '臺北', aliases: ['Taipei'] };
const second = { id: 'test-2', type: 'choice', category: '國家與文化', answer: '瑞士', aliases: [] };
function session() { const state = emptyState(); state.session = { ids: [q.id, second.id], index: 0, answers: [], optionOrder: {} }; return state; }
test('接受明列別名、全形英文和台臺差異，不以模糊字串亂判', () => {
  assert.ok(isCorrect(q, ' 台北 '));
  assert.ok(isCorrect(q, 'ＴＡＩＰＥＩ'));
  assert.ok(!isCorrect(q, '台中'));
  assert.ok(!isCorrect(q, ''));
  assert.ok(!isCorrect(q, '北'));
  assert.notEqual(normalizeAnswer('-30'), normalizeAnswer('30'));
});
test('同一次作答不能重複計分，改判只能加一次，揭曉不算答對', () => {
  const state = session();
  assert.ok(recordAnswer(state, q, '臺北市'));
  assert.ok(!recordAnswer(state, q, '臺北'));
  assert.deepEqual(state.records[q.id], { attempts: 1, correct: 0, lastCorrect: false });
  assert.ok(acceptOwnAnswer(state));
  assert.ok(!acceptOwnAnswer(state));
  assert.deepEqual(state.records[q.id], { attempts: 1, correct: 1, lastCorrect: true });
  state.session.index++;
  recordAnswer(state, second, '瑞士', true);
  assert.equal(state.session.answers[1].correct, false);
  assert.ok(!acceptOwnAnswer(state));
});
test('依分類題型篩選、不重複，優先未探索的題目', () => {
  const pool = Array.from({ length: 25 }, (_, i) => ({ ...q, id: `q-${i}` }));
  const records = Object.fromEntries(pool.slice(0, 10).map(item => [item.id, { attempts: 3 }]));
  const ids = chooseQuestions(pool, { category: q.category, type: 'fill', count: 10 }, records);
  assert.equal(new Set(ids).size, 10);
  assert.ok(ids.every(id => !records[id]));
  assert.equal(chooseQuestions(pool, { category: '國家與文化', type: 'all', count: 10 }, {}).length, 0);
  assert.equal(chooseQuestions(pool, { category: 'all', type: 'choice', count: 10 }, {}).length, 0);
});
test('儲存恢復排除舊題、重複收藏、損毀回合，保留合法作答', () => {
  const state = session();
  recordAnswer(state, q, '台北');
  state.favorites = [q.id, q.id, 'removed'];
  const restored = sanitizeState(JSON.parse(JSON.stringify(state)), [q, second]);
  assert.deepEqual(restored.favorites, [q.id]);
  assert.equal(restored.session.answers[0].correct, true);
  assert.equal(sanitizeState({ ...state, session: { ...state.session, ids: [q.id, q.id] } }, [q, second]).session, null);
  assert.equal(sanitizeState({ ...state, session: { ...state.session, index: 6 } }, [q, second]).session, null);
  assert.deepEqual(sanitizeState({ version: 77 }, [q]), emptyState());
});
test('亂數打散不改變原始選項，也不遺失任何選項', () => {
  const input = ['a', 'b', 'c', 'd'];
  const output = shuffled(input, () => 0);
  assert.deepEqual(input, ['a', 'b', 'c', 'd']);
  assert.deepEqual([...output].sort(), input);
  assert.notDeepEqual(output, input);
});
