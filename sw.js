// Funcționare offline: fișierele aplicației se păstrează pe telefon. Pozele și contactele nu trec pe aici.
const VERSIUNE = 'text-ecran-2.0.0';
const FISIERE = ['./', 'index.html', 'reguli.js', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'ocr/tesseract.min.js', 'ocr/worker.min.js', 'ocr/tesseract-core-simd-lstm.wasm.js', 'ocr/ron.b64.txt', 'ocr/eng.b64.txt'];
self.addEventListener('install', e => e.waitUntil(caches.open(VERSIUNE).then(c => c.addAll(FISIERE)).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x !== VERSIUNE).map(x => caches.delete(x)))).then(() => self.clients.claim())));
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;
  const pagina = e.request.mode === 'navigate' || /\/(index\.html|reguli\.js)$/.test(u.pathname);
  if (pagina) e.respondWith(fetch(e.request).then(r => { const k = r.clone(); caches.open(VERSIUNE).then(c => c.put(e.request, k)); return r }).catch(() => caches.match(e.request, { ignoreSearch: true })));
  else e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(r => r || fetch(e.request)));
});
