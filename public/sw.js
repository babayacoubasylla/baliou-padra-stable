const CACHE_NAME = "baliou-padra-cache-v1";

const urlsToCache = [
    "/",
    "/login",
    "/profil",
    "/dashboard",
    "/manifest.json",
    "/logo.png",
    "/icon-192.png",
    "/icon-512.png"
];

self.addEventListener("install", function (event) {
    self.skipWaiting();

    event.waitUntil(
        caches.open(CACHE_NAME).then(function (cache) {
            return cache.addAll(urlsToCache).catch(function () {
                return Promise.resolve();
            });
        })
    );
});

self.addEventListener("activate", function (event) {
    event.waitUntil(
        caches.keys().then(function (cacheNames) {
            return Promise.all(
                cacheNames.map(function (cacheName) {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );

    self.clients.claim();
});

self.addEventListener("fetch", function (event) {
    if (event.request.method !== "GET") return;

    event.respondWith(
        fetch(event.request)
            .then(function (response) {
                return response;
            })
            .catch(function () {
                return caches.match(event.request);
            })
    );
});