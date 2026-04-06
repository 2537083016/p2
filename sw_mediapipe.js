// =============================================
//  sw_mediapipe.js — Service Worker Paper 2
//  Treatment B: MediaPipe WASM PWA
//  Strategi: Cache First, Network Fallback
// =============================================

const CACHE_NAME = 'presensi-mediapipe-paper2-v1';
const CACHE_WASM = 'wasm-assets-v1';

// Aset aplikasi inti
const APP_ASSETS = [
  './',
  './style.css',
  './mediapipe.html'
];

// Aset WASM MediaPipe — Diperlukan untuk running mode offline
const WASM_ASSETS = [
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm/vision_wasm_internal.js',
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm/vision_wasm_internal.wasm',
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm/vision_wasm_nosimd_internal.js',
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm/vision_wasm_nosimd_internal.wasm',
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/vision_bundle.mjs'
];

// ─── Install Event ────────────────────────────
self.addEventListener('install', event => {
  console.log('[SW] Install — caching assets...');
  event.waitUntil(
    Promise.all([
      caches.open(CACHE_NAME).then(cache => cache.addAll(APP_ASSETS)),
      caches.open(CACHE_WASM).then(cache => {
        return Promise.allSettled(
          WASM_ASSETS.map(url => cache.add(url).catch(err => console.warn(`Gagal cache ${url}:`, err)))
        );
      })
    ]).then(() => self.skipWaiting())
  );
});

// ─── Activate Event ───────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME && key !== CACHE_WASM)
            .map(key => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// ─── Fetch Strategy ───────────────────────────
self.addEventListener('fetch', event => {
  const url = event.request.url;

  // Strategi Cache First untuk file berat (WASM/Task)
  if (url.match(/\.(wasm|task|js|mjs)$/) || url.includes('cdn.jsdelivr.net')) {
    event.respondWith(cacheFirst(event.request, url.includes('wasm') ? CACHE_WASM : CACHE_NAME));
    return;
  }

  // Strategi Network First untuk file lokal (HTML)
  event.respondWith(networkFirst(event.request, CACHE_NAME));
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
    return new Response("Offline material missing", { status: 503 });
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

// Background Sync Placeholder
self.addEventListener('sync', event => {
  if (event.tag === 'sync-presensi') {
    console.log('[SW] Background sync active');
  }
});
