// ============================================================
//  SERVICE WORKER - Card Matching Game PWA
//  ✅ Network-first: hamesha naya code pehle laayega,
//     internet na ho tabhi purani cache wali file dikhayega.
// ============================================================

var CACHE_NAME = 'card-matching-v11';   // ✅ Jab bhi code badlo, ye number badhao (v11, v12...)

var STATIC_ASSETS = [
    './',
    './index.html',
    './login.html',
    './signup.html',
    './splash.html',
    './style.css',
    './login.css',
    './api.js',
    './game.js',
    './login.js',
    './signup.js',
    './pwa.js',
    './guard.js',
    './levels.js',
    './splash.js',
    './manifest.json'
];

self.addEventListener('install', function(event) {
    event.waitUntil(
        caches.open(CACHE_NAME).then(function(cache) {
            return cache.addAll(STATIC_ASSETS).catch(function(err) {});
        }).then(function() { return self.skipWaiting(); })
    );
});

self.addEventListener('activate', function(event) {
    event.waitUntil(
        caches.keys().then(function(keys) {
            return Promise.all(
                keys.map(function(key) {
                    if (key !== CACHE_NAME) return caches.delete(key);
                })
            );
        }).then(function() { return self.clients.claim(); })
    );
});

self.addEventListener('fetch', function(event) {
    var req = event.request;
    if (req.method !== 'GET') return;

    // API calls: hamesha network se, cache nahi
    if (req.url.indexOf('/api/') !== -1) {
        event.respondWith(fetch(req).catch(function() {
            return new Response(JSON.stringify({ error: 'Offline' }), { headers: { 'Content-Type': 'application/json' } });
        }));
        return;
    }

    // Baaki files: pehle network, fail ho to cache
    event.respondWith(
        fetch(req).then(function(response) {
            if (response && response.status === 200 && response.type !== 'opaque') {
                var responseClone = response.clone();
                caches.open(CACHE_NAME).then(function(cache) { cache.put(req, responseClone); });
            }
            return response;
        }).catch(function() {
            return caches.match(req).then(function(cached) {
                if (cached) return cached;
                if (req.mode === 'navigate') return caches.match('./login.html');
            });
        })
    );
});