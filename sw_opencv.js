// =============================================
//  sw_opencv.js — Service Worker Paper 2
//  Treatment A: OpenCV.js WASM PWA
// =============================================

const CACHE_NAME = 'presensi-opencv-paper2-v1';
const CACHE_WASM = 'opencv-wasm-assets-v1';

// App shell
const APP_ASSETS = [
  './',
  './style.css',
  './opencv.html'
];

// OpenCV.js dan Haar Cascade XML
const WASM_ASSETS = [
  'https://docs.opencv.org/4.8.0/opencv.js',
  'https://raw.githubusercontent.com/opencv/opencv/master/data/haarcascades/haarcascade_frontalface_default.xml'
];

// ─── Install ──────────────────────────────────
self.addEventListener('install', event => {
  console.log('[SW-OpenCV] Install — caching assets...');
  event.waitUntil(
    Promise.all([
      caches.open(CACHE_NAME).then(cache => cache.addAll(APP_ASSETS)),
      caches.open(CACHE_WASM).then(cache => {
        return Promise.allSettled(
          WASM_ASSETS.map(url =>
            fetch(url).then(resp => {
              if (resp.ok) cache.put(url, resp);
              return resp;
            }).catch(err => console.warn('[SW-OpenCV] Gagal cache:', url))
          )
        );
      })
    ]).then(() => self.skipWaiting())
  );
});

// ─── Activate ────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME && k !== CACHE_WASM).map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ─── Fetch Strategy ───────────────────────────
self.addEventListener('fetch', event => {
  const url = event.request.url;

  // Assets OpenCV & XML: Cache First (File besar/statis)
  if (url.includes('opencv.js') || url.includes('haarcascade')) {
    event.respondWith(cacheFirst(event.request, CACHE_WASM));
    return;
  }

  // App HTML/Assets: Network First
  if (url.includes(self.location.origin)) {
    event.respondWith(networkFirst(event.request, CACHE_NAME));
    return;
  }

  event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
});

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    const cache = await caches.open(cacheName);
    cache.put(request, response.clone());
    return response;
  } catch (e) {
    return new Response('Offline — OpenCV tidak tersedia di cache', { status: 503 });
  }
}

async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request);
    const cache = await caches.open(cacheName);
    cache.put(request, response.clone());
    return response;
  } catch (e) {
    return await caches.match(request);
  }
}
