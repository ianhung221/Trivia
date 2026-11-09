import { STORAGE_KEY, CATEGORIES, TYPE_NAMES, emptyState, sanitizeState, chooseQuestions, shuffled, recordAnswer, acceptOwnAnswer } from './lib/quiz.mjs';

const main = document.querySelector('#main');
const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
let bank, questions = [], byId = new Map(), sources = new Map(), state = emptyState(), screen = 'home', storageAvailable = true, toastTimer;
let offlineReady = false, registration;

function toast(message) {
  const el = document.querySelector('#toast');
  el.textContent = message;
  el.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('visible'), 3500);
}
function save() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
  catch { if (storageAvailable) toast('瀏覽器無法保存紀錄；這次仍可繼續遊玩。'); storageAvailable = false; }
}
function syncFavorites() { document.querySelector('#favorite-count').textContent = state.favorites.length; }
function navigate(view, focus = true) {
  screen = view;
  if (view === 'quiz') renderQuiz();
  else if (view === 'result') renderResult();
  else if (view === 'library') renderLibrary();
  else renderHome();
  syncFavorites();
  if (focus) { main.focus({ preventScroll: true }); window.scrollTo({ top: 0, behavior: 'instant' }); }
}
function filterPool() { return questions.filter(q => (state.settings.category === 'all' || state.settings.category === q.category) && (state.settings.type === 'all' || state.settings.type === q.type)); }
function renderHome() {
  const { category, type, count } = state.settings;
  const records = Object.values(state.records);
  const attempts = records.reduce((n, r) => n + r.attempts, 0);
  const correct = records.reduce((n, r) => n + r.correct, 0);
  const available = filterPool().length;
  const inProgress = state.session && state.session.index < state.session.ids.length;
  main.innerHTML = `
    <section class="hero" aria-labelledby="home-title">
      <div><span class="eyebrow">A LITTLE DETOUR / 一點好奇，一段岔路</span><h1 id="home-title">世界很大，<br>先猜<em>一題。</em></h1><p class="hero-copy">從地圖上的一條邊界，到航班背後的小祕密。<br>把等下一班飛機的時間，留給好奇心。</p></div>
      <div class="hero-art"><img src="./assets/route.svg" alt="兩地間的旅行航線示意圖" width="620" height="370"><div class="stamp"><strong>${questions.length.toLocaleString()}</strong><span>個發現等著你</span></div><div class="map-caption"><span>DEPARTURE: HERE</span><span>DESTINATION: SOMEWHERE NEW</span></div></div>
    </section>
    <section class="journey" aria-labelledby="journey-title"><div class="journey-main">
      <div class="section-heading"><h2 id="journey-title"><span class="index-label">01 /</span>今天，往哪裡走？</h2><span class="section-caption">挑個方向，或隨興出發</span></div>
      <div class="categories" role="group" aria-label="題目分類">${[['all', '隨興漫遊'], ...CATEGORIES.map(c => [c, c])].map(([value, label]) => `<button class="chip" data-category="${value}" aria-pressed="${category === value}">${label}</button>`).join('')}</div>
      <div class="session-options"><div><span class="field-label">這趟走多遠</span><div class="segments" role="group" aria-label="每回合題數">${[10, 20, 50].map(n => `<button class="segment" data-count="${n}" aria-pressed="${count === n}">${n} 題</button>`).join('')}</div></div><div><label for="type-select" class="field-label">答題方式</label><select id="type-select"><option value="all" ${type === 'all' ? 'selected' : ''}>混合題型</option>${Object.entries(TYPE_NAMES).map(([key, name]) => `<option value="${key}" ${type === key ? 'selected' : ''}>${name}</option>`).join('')}</select></div><span class="section-caption">${available} 題可探索</span></div>
      </div><div class="ticket"><div class="ticket-route"><div><b>NOW</b><small>此時此地</small></div><span class="route-line" aria-hidden="true"></span><div><b>WOW</b><small>原來如此</small></div></div><button class="primary" id="start" ${available ? '' : 'disabled'}>出發，來 ${Math.min(count, available)} 題 <span aria-hidden="true">↗</span></button><span class="ticket-note">不限時 · 答完就有解說 · 隨時可以歇腳</span></div></section>
    ${inProgress ? `<div class="resume"><span>上一趟還沒走完：已答 ${state.session.answers.length} / ${state.session.ids.length} 題</span><button class="text-button" id="resume">接著走 →</button></div>` : ''}
    <section class="underfold" aria-label="旅途筆記"><div class="editor-note"><span class="note-number" aria-hidden="true">✳</span><div><span class="eyebrow">NOT ALL WHO WANDER ARE LOST</span><h3>猜錯，也是一種抵達。</h3><p>這裡沒有倒數，也沒有排行榜。想不到就翻答案，<br>把喜歡的知識收進口袋，下次說給同行的人聽。</p></div></div><div class="stats"><div class="stat"><strong>${records.length}</strong><span>已探索的題目</span></div><div class="stat"><strong>${attempts ? Math.round(correct / attempts * 100) + '%' : '—'}</strong><span>累計答對率</span></div><div class="stat"><strong>${state.favorites.length}</strong><span>口袋收藏</span></div></div></section>
    ${!storageAvailable ? '<p class="inline-notice">目前無法保存紀錄，關閉此頁後可能遺失進度。</p>' : ''}`;
  main.querySelectorAll('[data-category]').forEach(button => button.addEventListener('click', () => { state.settings.category = button.dataset.category; save(); renderHome(); main.querySelector(`[data-category="${state.settings.category}"]`).focus(); }));
  main.querySelectorAll('[data-count]').forEach(button => button.addEventListener('click', () => { state.settings.count = Number(button.dataset.count); save(); renderHome(); main.querySelector(`[data-count="${state.settings.count}"]`).focus(); }));
  main.querySelector('#type-select').addEventListener('change', event => { state.settings.type = event.target.value; save(); renderHome(); main.querySelector('#type-select').focus(); });
  main.querySelector('#start').addEventListener('click', () => {
    if (inProgress && !window.confirm('開始新的一趟，會取代尚未完成的回合；已答紀錄和收藏都會保留。要出發嗎？')) return;
    startSession(chooseQuestions(questions, state.settings, state.records));
  });
  main.querySelector('#resume')?.addEventListener('click', () => navigate('quiz'));
}
function startSession(ids) {
  if (!ids.length) { toast('這個方向暫時沒有題目，試試另一個分類。'); return; }
  state.session = { ids, index: 0, answers: [], optionOrder: {} };
  save(); navigate('quiz');
}
function sourceMarkup(question) {
  return `<div class="source-list">資料來源 · ${question.sourceIds.map(id => sources.get(id)).filter(Boolean).map(source => {
    let safeUrl; try { const u = new URL(source.url); if (u.protocol === 'https:' || u.protocol === 'http:') safeUrl = u.href; } catch {}
    return safeUrl ? `<a href="${escape(safeUrl)}" target="_blank" rel="noopener noreferrer">${escape(source.publisher || source.title)} ↗</a>` : escape(source.title);
  }).join('')}<span class="source-date">查核 ${escape(question.checkedAt)} · 外部來源需連網</span></div>`;
}
function renderQuiz() {
  const session = state.session;
  if (!session) { navigate('home'); return; }
  if (session.index >= session.ids.length) { navigate('result'); return; }
  const question = byId.get(session.ids[session.index]);
  const response = session.answers[session.index];
  const saved = state.favorites.includes(question.id);
  let options = session.optionOrder[question.id];
  if (question.type !== 'fill' && (!Array.isArray(options) || options.length !== question.options.length || new Set(options).size !== options.length || options.some(v => !question.options.includes(v)))) {
    options = question.type === 'choice' ? shuffled(question.options) : question.options;
    session.optionOrder[question.id] = options;
    save();
  }
  main.innerHTML = `<section class="quiz" aria-labelledby="question-title"><div class="quiz-topline"><button class="text-button" id="back-home">← 暫停，回到起點</button><span class="progress-label">${String(session.index + 1).padStart(2, '0')} / ${String(session.ids.length).padStart(2, '0')}</span></div><div class="progress" role="progressbar" aria-label="回合進度" aria-valuemin="0" aria-valuemax="${session.ids.length}" aria-valuenow="${session.answers.length}"><div class="progress-fill" style="width:${session.answers.length / session.ids.length * 100}%"></div></div>
    <div class="question-meta"><span class="tag">${escape(question.category)}</span><span class="tag">${TYPE_NAMES[question.type]}</span><span class="question-id">NO. ${escape(question.id.replace(/[^0-9]/g, ''))}</span><button class="bookmark" id="bookmark" aria-pressed="${saved}">${saved ? '◆ 已收藏' : '◇ 收進口袋'}</button></div>
    <h1 class="question" id="question-title">${escape(question.prompt)}</h1>
    ${question.image && /^\.\/assets\/flags\/[a-z]{2}\.svg$/.test(question.image) ? `<figure class="flag-question"><img src="${escape(question.image)}" alt="本題待辨識的旗幟" width="240" height="160"></figure>` : ''}
    ${question.type === 'fill' ? `<form id="answer-form"><label class="answer-label" for="answer">你的答案</label><div class="answer-row"><input id="answer" class="answer-input" type="text" maxlength="300" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="在這裡寫下你的猜想…" value="${escape(response?.input || '')}" ${response ? 'disabled' : ''} required aria-describedby="answer-hint"><button class="primary" type="submit" ${response ? 'disabled' : ''}>確認答案 <span aria-hidden="true">→</span></button></div><p id="answer-hint" class="answer-hint">可用常見別稱；英文不分大小寫。如果是合理的另一種寫法，揭曉後可自行改判。</p></form>` : `<div class="options" role="group" aria-label="請選擇答案">${options.map((option, i) => `<button class="option ${response && option === question.answer ? 'is-right' : response && response.input === option ? 'is-wrong' : ''}" data-option="${i}" ${response ? 'disabled' : ''}><span class="option-letter">${String.fromCharCode(65 + i)}</span><span>${escape(option)}</span>${response && option === question.answer ? '<span aria-label="正確答案">✓</span>' : ''}</button>`).join('')}</div>`}
    ${!response ? '<div class="reveal-row"><span class="answer-hint">不用急，旅途沒有計時。</span><button class="text-button" id="reveal">還沒頭緒，直接看解說 ↗</button></div>' : feedbackMarkup(question, response, session.index === session.ids.length - 1)}
    </section>`;
  main.querySelector('#back-home').addEventListener('click', () => navigate('home'));
  main.querySelector('#bookmark').addEventListener('click', () => {
    toggleFavorite(question.id);
    const button = main.querySelector('#bookmark');
    const active = state.favorites.includes(question.id);
    button.setAttribute('aria-pressed', String(active)); button.textContent = active ? '◆ 已收藏' : '◇ 收進口袋';
  });
  main.querySelector('#answer-form')?.addEventListener('submit', event => { event.preventDefault(); const value = main.querySelector('#answer').value.trim(); if (value) submit(question, value); });
  main.querySelectorAll('[data-option]').forEach(button => button.addEventListener('click', () => submit(question, options[Number(button.dataset.option)])));
  main.querySelector('#reveal')?.addEventListener('click', () => submit(question, main.querySelector('#answer')?.value || '', true));
  main.querySelector('#self-mark')?.addEventListener('click', () => { if (acceptOwnAnswer(state)) { save(); renderQuiz(); main.querySelector('#next').focus({ preventScroll: true }); toast('已改為答對，僅調整這次作答紀錄。'); } });
  main.querySelector('#next')?.addEventListener('click', () => { session.index++; save(); navigate(session.index >= session.ids.length ? 'result' : 'quiz'); });
}
function feedbackMarkup(question, response, last) {
  return `<section class="feedback ${response.correct ? '' : 'wrong'}" aria-labelledby="feedback-label" tabindex="-1" id="feedback"><div class="feedback-header"><span class="feedback-label" id="feedback-label">${response.correct ? response.selfMarked ? '✓ 自行確認答對' : '✓ 猜對了！' : response.revealed ? '↗ 一起看看答案' : '↗ 差一點，帶走一個新發現'}</span><strong class="feedback-answer">${escape(question.answer)}</strong></div><p>${escape(question.explanation)}</p>${sourceMarkup(question)}</section><div class="answer-actions">${!response.correct && !response.revealed && question.type === 'fill' ? '<button class="text-button" id="self-mark">我的寫法不同，但意思相同 → 算我答對</button>' : '<span class="answer-hint">喜歡這個發現？可以收進口袋。</span>'}<button class="primary" id="next">${last ? '看看這趟收穫' : '下一個發現'} <span aria-hidden="true">→</span></button></div>`;
}
function submit(question, input, revealed = false) {
  if (!recordAnswer(state, question, input, revealed)) return;
  save(); renderQuiz();
  main.querySelector('#feedback').focus({ preventScroll: true });
  main.querySelector('#feedback').scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'nearest' });
}
function toggleFavorite(id) {
  state.favorites = state.favorites.includes(id) ? state.favorites.filter(item => item !== id) : [...state.favorites, id];
  save(); syncFavorites();
}
function renderResult() {
  if (!state.session) { navigate('home'); return; }
  const answers = state.session.answers;
  const correct = answers.filter(a => a.correct).length;
  const missed = answers.filter(a => !a.correct).map(a => a.id);
  main.innerHTML = `<section class="result"><span class="eyebrow">ARRIVAL / 這一站，原來如此</span><h1>又多認識了世界一點。</h1><p class="result-intro">${correct === answers.length ? '這條路上的風景，你都認出來了。' : '答對的留下成就感，猜錯的留下新故事。'}<br>下一次候機，又有話題可以聊了。</p><div class="result-score"><div class="score-number">${correct}<small> / ${answers.length}</small></div><div class="score-caption">這一趟答對的題目<br><span class="section-caption">${answers.filter(a => a.revealed).length} 題直接看解說 · ${answers.filter(a => a.selfMarked).length} 題自行改判</span></div></div><div class="result-actions"><button class="primary" id="again">再走一趟 <span aria-hidden="true">↗</span></button>${missed.length ? '<button class="secondary" id="retry-missed">重訪剛才沒答對的題目</button>' : ''}<button class="secondary" id="result-home">回到起點</button></div><ol class="review-list">${answers.map(a => { const q = byId.get(a.id); return `<li><span class="review-status ${a.correct ? '' : 'miss'}" aria-label="${a.correct ? '答對' : '未答對'}">${a.correct ? '✓' : '↗'}</span><div>${escape(q.prompt)}<span class="review-answer">${escape(q.answer)}</span></div></li>`; }).join('')}</ol></section>`;
  main.querySelector('#again').addEventListener('click', () => startSession(chooseQuestions(questions, state.settings, state.records)));
  main.querySelector('#retry-missed')?.addEventListener('click', () => startSession(shuffled(missed)));
  main.querySelector('#result-home').addEventListener('click', () => navigate('home'));
}
function renderLibrary() {
  const favorites = state.favorites.map(id => byId.get(id));
  main.innerHTML = `<section class="library"><button class="text-button" id="library-home">← 回到起點</button><h1>口袋裡的世界。</h1><p class="library-intro">把想再看一次、或想說給別人聽的知識留在這裡。收藏與作答紀錄只保存在這台裝置的瀏覽器。</p>${favorites.length ? '<button class="secondary" id="practice-favorites">用收藏來一趟小旅行 →</button>' : '<p class="empty-state">口袋還是空的。答題時按「收進口袋」，就能在這裡再次閱讀。</p>'}<div class="library-grid">${favorites.map(q => `<article class="saved-card"><span class="eyebrow">${escape(q.category)}</span><h2>${escape(q.prompt)}</h2><p class="saved-answer">${escape(q.answer)}</p><p>${escape(q.explanation)}</p>${sourceMarkup(q)}<button class="text-button" data-remove="${escape(q.id)}">移出收藏</button></article>`).join('')}</div></section>`;
  main.querySelector('#library-home').addEventListener('click', () => navigate('home'));
  main.querySelector('#practice-favorites')?.addEventListener('click', () => {
    if (state.session && state.session.index < state.session.ids.length && !window.confirm('用收藏開始新回合，會取代尚未完成的回合。要繼續嗎？')) return;
    startSession(shuffled(state.favorites).slice(0, state.settings.count));
  });
  main.querySelectorAll('[data-remove]').forEach(button => button.addEventListener('click', () => { toggleFavorite(button.dataset.remove); renderLibrary(); toast('已移出收藏。'); }));
}
document.querySelector('#brand').addEventListener('click', event => { if (!bank) return; event.preventDefault(); navigate('home'); });
document.querySelector('#favorites-nav').addEventListener('click', () => { if (bank) navigate('library'); });

function refreshOfflineStatus(error = false) {
  const label = document.querySelector('#offline-status');
  const dot = document.querySelector('#status-dot');
  dot.className = `status-dot ${offlineReady ? 'ready' : error ? 'failed' : ''}`;
  label.textContent = offlineReady ? navigator.onLine ? '離線題庫已就緒' : '目前離線，照樣可以探索' : error ? '離線準備未完成，請連網後重試' : '正在準備離線題庫';
  document.querySelector('#offline-retry').hidden = !error;
}
async function confirmOfflineCache() {
  const worker = registration?.active;
  if (!worker || worker.state !== 'activated') return;
  const result = await new Promise(resolve => {
    const channel = new MessageChannel();
    const timer = setTimeout(() => { channel.port1.close(); resolve(false); }, 8000);
    channel.port1.onmessage = event => { clearTimeout(timer); channel.port1.close(); resolve(event.data?.ready === true); };
    worker.postMessage({ type: 'CACHE_STATUS' }, [channel.port2]);
  });
  offlineReady = result;
  refreshOfflineStatus(!result);
}
function offerUpdate() { document.querySelector('#update-button').hidden = !registration?.waiting; }
async function prepareOffline() {
  if (!('serviceWorker' in navigator)) { document.querySelector('#offline-status').textContent = '此瀏覽器不支援離線快取'; return; }
  refreshOfflineStatus();
  try {
    registration = await navigator.serviceWorker.register('./sw.js', { scope: './' });
    offerUpdate();
    const observe = worker => {
      if (!worker) return;
      worker.addEventListener('statechange', () => {
        if (worker.state === 'installed') { offerUpdate(); }
        if (worker.state === 'activated') confirmOfflineCache();
        if (worker.state === 'redundant' && !registration.active) refreshOfflineStatus(true);
      });
    };
    observe(registration.installing);
    registration.addEventListener('updatefound', () => observe(registration.installing));
    if (registration.active) await confirmOfflineCache();
  } catch { refreshOfflineStatus(true); }
}
let reloadForUpdate = false;
navigator.serviceWorker?.addEventListener('controllerchange', () => { if (reloadForUpdate) window.location.reload(); else confirmOfflineCache(); });
document.querySelector('#update-button').addEventListener('click', () => { if (registration?.waiting) { save(); reloadForUpdate = true; registration.waiting.postMessage({ type: 'SKIP_WAITING' }); } });
document.querySelector('#offline-retry').addEventListener('click', async () => {
  if (registration?.waiting) { save(); reloadForUpdate = true; registration.waiting.postMessage({ type: 'SKIP_WAITING' }); return; }
  if (!registration?.active) { await prepareOffline(); return; }
  refreshOfflineStatus();
  const repaired = await new Promise(resolve => {
    const channel = new MessageChannel();
    const timer = setTimeout(() => { channel.port1.close(); resolve(false); }, 20000);
    channel.port1.onmessage = event => { clearTimeout(timer); channel.port1.close(); resolve(event.data?.ready === true); };
    registration.active.postMessage({ type: 'REPAIR_CACHE' }, [channel.port2]);
  });
  if (repaired) await confirmOfflineCache();
  else refreshOfflineStatus(true);
});
window.addEventListener('online', () => { if (offlineReady) refreshOfflineStatus(); else prepareOffline(); });
window.addEventListener('offline', () => refreshOfflineStatus(!offlineReady));

async function init() {
  try {
    const response = await fetch('./data/questions.json');
    if (!response.ok) throw new Error('Question bank unavailable');
    const data = await response.json();
    if (!Array.isArray(data.questions) || !data.questions.length || !Array.isArray(data.sources)) throw new Error('Invalid bank');
    bank = data;
    questions = bank.questions;
    byId = new Map(questions.map(q => [q.id, q]));
    sources = new Map(bank.sources.map(s => [s.id, s]));
    try { const raw = localStorage.getItem(STORAGE_KEY); if (raw) { try { state = sanitizeState(JSON.parse(raw), questions); } catch { toast('舊紀錄無法讀取，已開啟新的旅程。'); } } } catch { storageAvailable = false; }
    navigate(state.session ? state.session.index >= state.session.ids.length ? 'result' : 'quiz' : 'home', false);
    await prepareOffline();
  } catch {
    main.innerHTML = '<section class="loading"><span class="eyebrow">A SHORT STOPOVER</span><h1>題庫還沒到站。</h1><p>首次開啟需要網路。請確認連線後再試一次；若你正在本機預覽，請使用 HTTP 伺服器開啟。</p><button class="primary" id="reload">重新載入 →</button></section>';
    main.querySelector('#reload').addEventListener('click', () => window.location.reload());
    refreshOfflineStatus(true);
  }
}
init();
