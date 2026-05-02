const CACHE_NAME = 'quizaroni-v1';
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/manifest.json',
    // Add main JS/CSS bundles (Vite generates hashed names, so this is a pattern)
];

// Install: Cache static assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            // Cache the static assets
            return cache.addAll(STATIC_ASSETS).catch((err) => {
                console.log('Some assets failed to cache:', err);
            });
        })
    );
    // Activate immediately
    self.skipWaiting();
});

// Activate: Clean up old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((name) => name !== CACHE_NAME)
                    .map((name) => caches.delete(name))
            );
        })
    );
    self.clients.claim();
});

// Fetch: Network-first strategy for API, cache-first for assets
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET requests and browser extensions
    if (request.method !== 'GET' || url.protocol === 'chrome-extension:') {
        return;
    }

    // API requests: Network first, no cache
    if (
        url.pathname.startsWith('/api/') ||
        url.hostname.includes('amazonaws.com')
    ) {
        event.respondWith(
            fetch(request).catch(() => {
                // Return offline response for API calls
                return new Response(
                    JSON.stringify({
                        error: 'Offline',
                        message:
                            'Request queued for sync when connection returns',
                    }),
                    {
                        status: 503,
                        headers: { 'Content-Type': 'application/json' },
                    }
                );
            })
        );
        return;
    }

    // Static assets: Cache first, network fallback
    event.respondWith(
        caches.match(request).then((cached) => {
            if (cached) {
                // Return cached version and refresh in background
                fetch(request)
                    .then((response) => {
                        if (response.ok) {
                            caches.open(CACHE_NAME).then((cache) => {
                                cache.put(request, response.clone());
                            });
                        }
                    })
                    .catch(() => {});
                return cached;
            }

            // Not in cache, fetch from network
            return fetch(request)
                .then((response) => {
                    if (
                        !response ||
                        response.status !== 200 ||
                        response.type !== 'basic'
                    ) {
                        return response;
                    }

                    const responseToCache = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(request, responseToCache);
                    });

                    return response;
                })
                .catch((error) => {
                    console.log('Fetch failed:', error);
                    // Return cached offline page if available
                    return caches.match('/offline.html');
                });
        })
    );
});

// Message handling from main thread
self.addEventListener('message', (event) => {
    if (event.data === 'skipWaiting') {
        self.skipWaiting();
    }
});
