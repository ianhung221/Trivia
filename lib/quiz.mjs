export const STORAGE_KEY = 'en-route-trivia:v1';
export const CATEGORIES = ['地圖與地理', '國家與文化', '交通與鐵道', '航空與機場', '科技與導航'];
export const TYPE_NAMES = { fill: '填充題', choice: '選擇題', boolean: '是非題' };

export function normalizeAnswer(value) {
  return String(value ?? '').normalize('NFKC').trim().toLocaleLowerCase('en').replace(/\s+/gu, '').replace(/臺/g, '台');
}
export function isCorrect(question, input) {
  const value = normalizeAnswer(input);
  return value.length > 0 && [question.answer, ...(question.aliases || [])].some(answer => normalizeAnswer(answer) === value);
}
export function shuffled(items, random = Math.random) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
export function emptyState() {
  return { version: 1, favorites: [], records: {}, session: null, settings: { category: 'all', type: 'all', count: 10 } };
}
export function sanitizeState(raw, questions) {
  const state = emptyState();
  if (!raw || raw.version !== 1) return state;
  const validIds = new Set(questions.map(q => q.id));
  const allowed = id => typeof id === 'string' && validIds.has(id);
  state.favorites = Array.isArray(raw.favorites) ? [...new Set(raw.favorites.filter(allowed))] : [];
  for (const [id, record] of Object.entries(raw.records || {})) {
    if (allowed(id) && record && Number.isInteger(record.attempts) && record.attempts > 0 && Number.isInteger(record.correct) && record.correct >= 0 && record.correct <= record.attempts) {
      state.records[id] = { attempts: record.attempts, correct: record.correct, lastCorrect: record.lastCorrect === true };
    }
  }
  const settings = raw.settings || {};
  state.settings = { category: ['all', ...CATEGORIES].includes(settings.category) ? settings.category : 'all', type: ['all', 'fill', 'choice', 'boolean'].includes(settings.type) ? settings.type : 'all', count: [10, 20, 50].includes(settings.count) ? settings.count : 10 };
  const session = raw.session;
  if (session && Array.isArray(session.ids) && session.ids.length > 0 && session.ids.length <= 1000 && session.ids.every(allowed) && new Set(session.ids).size === session.ids.length && Number.isInteger(session.index) && session.index >= 0 && session.index <= session.ids.length && Array.isArray(session.answers)) {
    const answersValid = session.answers.length <= session.ids.length && session.answers.every((a, i) => a && a.id === session.ids[i] && typeof a.correct === 'boolean' && typeof a.input === 'string' && typeof a.revealed === 'boolean');
    const consistent = session.answers.length === session.index || (session.index < session.ids.length && session.answers.length === session.index + 1);
    if (answersValid && consistent) state.session = { ids: [...session.ids], index: session.index, answers: session.answers.map(a => ({ id: a.id, input: a.input.slice(0, 300), correct: a.correct, revealed: a.revealed, selfMarked: a.selfMarked === true })), optionOrder: session.optionOrder && typeof session.optionOrder === 'object' ? session.optionOrder : {} };
  }
  return state;
}
export function chooseQuestions(questions, settings, records, count = settings.count) {
  const pool = questions.filter(q => (settings.category === 'all' || q.category === settings.category) && (settings.type === 'all' || q.type === settings.type));
  // Balance the order by previous exposure, retaining randomness within each group.
  const mixed = shuffled(pool);
  mixed.sort((a, b) => (records[a.id]?.attempts || 0) - (records[b.id]?.attempts || 0));
  // Keep a handful of stories in mixed journeys without repeating a question.
  const stories = mixed.filter(q => q.collection === 'stories').slice(0, Math.ceil(count * 0.3));
  const picked = new Set(stories.map(q => q.id));
  const rest = mixed.filter(q => !picked.has(q.id)).slice(0, Math.max(0, count - stories.length));
  return shuffled([...stories, ...rest]).map(q => q.id);
}
export function recordAnswer(state, question, input, revealed = false) {
  const session = state.session;
  if (!session || session.ids[session.index] !== question.id || session.answers.length !== session.index) return false;
  const correct = !revealed && isCorrect(question, input);
  session.answers.push({ id: question.id, input: String(input).slice(0, 300), correct, revealed, selfMarked: false });
  const previous = state.records[question.id] || { attempts: 0, correct: 0 };
  state.records[question.id] = { attempts: previous.attempts + 1, correct: previous.correct + Number(correct), lastCorrect: correct };
  return true;
}
export function acceptOwnAnswer(state) {
  const session = state.session;
  const answer = session?.answers[session.index];
  if (!answer || answer.correct || answer.revealed || !answer.input.trim()) return false;
  answer.correct = true;
  answer.selfMarked = true;
  state.records[answer.id] ||= { attempts: 1, correct: 0, lastCorrect: false };
  state.records[answer.id].correct++;
  state.records[answer.id].lastCorrect = true;
  return true;
}
