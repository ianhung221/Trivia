const VERSION = '2026-11-09-v1';
const ROOT = new URL('./', self.location.href);
const PREFIX = `en-route-${ROOT.pathname}-`;
const CACHE = `${PREFIX}${VERSION}`;
const PATHS = ['./', './index.html', './credits.html', './styles.css', './app.js', './lib/quiz.mjs', './data/questions.json', './manifest.webmanifest', './assets/icon.svg', './assets/route.svg'];
const URLS = PATHS.map(path => new URL(path, ROOT).href);
async function bankImages(cache) {
  const response = await cache.match(new URL('./data/questions.json', ROOT).href);
  if (!response) return [];
  const bank = await response.json();
  return [...new Set(bank.questions.map(q => q.image).filter(path => typeof path === 'string' && /^\.\/assets\/flags\/[a-z]{2}\.svg$/.test(path)))].map(path => new URL(path, ROOT).href);
}
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    try {
      // addAll is atomic: no partial bank is marked as ready.
      await cache.addAll(URLS.map(url => new Request(url, { cache: 'reload' })));
      await cache.addAll((await bankImages(cache)).map(url => new Request(url, { cache: 'reload' })));
    } catch (error) { await caches.delete(CACHE); throw error; }
  })());
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith(PREFIX) && key !== CACHE).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== ROOT.origin || !url.pathname.startsWith(ROOT.pathname)) return;
  if (event.request.mode === 'navigate') {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE);
      // A version is served as a unit; registration checks install future versions.
      return await cache.match(url.href) || await cache.match(new URL('./index.html', ROOT).href) || fetch(event.request);
    })());
  } else if (URLS.includes(url.href) || url.pathname.startsWith(new URL('./assets/flags/', ROOT).pathname)) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE);
      return await cache.match(event.request) || fetch(event.request);
    })());
  }
});
self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') { self.skipWaiting(); return; }
  if (event.data?.type === 'REPAIR_CACHE') event.waitUntil((async () => {
    try {
      const cache = await caches.open(CACHE);
      await cache.addAll(URLS.map(url => new Request(url, { cache: 'reload' })));
      await cache.addAll((await bankImages(cache)).map(url => new Request(url, { cache: 'reload' })));
      event.ports[0]?.postMessage({ ready: true });
    } catch { event.ports[0]?.postMessage({ ready: false }); }
  })());
  if (event.data?.type === 'CACHE_STATUS') event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    const matches = await Promise.all([...URLS, ...await bankImages(cache)].map(url => cache.match(url)));
    event.ports[0]?.postMessage({ ready: matches.every(Boolean), version: VERSION });
  })());
});
