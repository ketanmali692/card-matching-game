// ============================================================
//  SERVICE WORKER - Card Matching Game PWA
// ============================================================

var CACHE_NAME = 'card-matching-v2';

var STATIC_ASSETS = [
    './',
    './index.html',
    './login.html',
    './signup.html',
    './style.css',
    './login.css',
    './api.js',
    './game.js',
    './login.js',
    './signup.js',
    './pwa.js',
    './manifest.json'
];

self.addEventListener('install', function(event) {
    console.log('[SW] Installing...');
    event.waitUntil(
        caches.open(CACHE_NAME).then(function(cache) {
            return cache.addAll(STATIC_ASSETS).catch(function(err) {
                console.log('[SW] Some assets failed to cache:', err);
            });
        }).then(function() {
            return self.skipWaiting();
        })
    );
});

self.addEventListener('activate', function(event) {
    console.log('[SW] Activating...');
    event.waitUntil(
        caches.keys().then(function(keys) {
            return Promise.all(
                keys.map(function(key) {
                    if (key !== CACHE_NAME) {
                        console.log('[SW] Deleting old cache:', key);
                        return caches.delete(key);
                    }
                })
            );
        }).then(function() {
            return self.clients.claim();
        })
    );
});

self.addEventListener('fetch', function(event) {
    var req = event.request;

    if (req.method !== 'GET') return;

    // API calls ko cache NA karo
    if (req.url.indexOf('/api/') !== -1) {
        event.respondWith(
            fetch(req).catch(function() {
                return new Response(
                    JSON.stringify({ error: 'Offline - no network' }),
                    { headers: { 'Content-Type': 'application/json' } }
                );
            })
        );
        return;
    }

    // Cache-first, phir network
    event.respondWith(
        caches.match(req).then(function(cached) {
            if (cached) return cached;
            return fetch(req).then(function(response) {
                if (!response || response.status !== 200 || response.type === 'opaque') {
                    return response;
                }
                var responseClone = response.clone();
                caches.open(CACHE_NAME).then(function(cache) {
                    cache.put(req, responseClone);
                });
                return response;
            }).catch(function() {
                if (req.mode === 'navigate') {
                    return caches.match('./login.html');
                }
            });
        })
    );
});