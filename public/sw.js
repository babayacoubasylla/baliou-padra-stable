const CACHE_NAME = "baliou-padra-static-v2";

const STATIC_ASSETS = [
    "/manifest.json",
    "/logo.png",
    "/icon-192.png",
    "/icon-512.png",
    "/apple-icon.png"
];

self.addEventListener("install", function (event) {
    self.skipWaiting();

    event.waitUntil(
        caches.open(CACHE_NAME).then(function (cache) {
            return cache.addAll(STATIC_ASSETS).catch(function () {
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
    const request = event.request;

    if (request.method !== "GET") return;

    const url = new URL(request.url);

    // Ne jamais cacher les pages sensibles ou dynamiques
    if (
        url.pathname.startsWith("/admin") ||
        url.pathname.startsWith("/profil") ||
        url.pathname.startsWith("/finances") ||
        url.pathname.startsWith("/dashboard") ||
        url.pathname.startsWith("/chef-gen") ||
        url.pathname.startsWith("/tresorier") ||
        url.pathname.startsWith("/comite-com-gen") ||
        url.pathname.startsWith("/gestion-base-donnees") ||
        url.pathname.startsWith("/etat-civil") ||
        url.pathname.startsWith("/api")
    ) {
        event.respondWith(fetch(request));
        return;
    }

    // Cache seulement les fichiers statiques
    if (
        url.pathname.endsWith(".png") ||
        url.pathname.endsWith(".jpg") ||
        url.pathname.endsWith(".jpeg") ||
        url.pathname.endsWith(".svg") ||
        url.pathname.endsWith(".ico") ||
        url.pathname === "/manifest.json"
    ) {
        event.respondWith(
            caches.match(request).then(function (cached) {
                if (cached) return cached;

                return fetch(request).then(function (response) {
                    const copy = response.clone();

                    caches.open(CACHE_NAME).then(function (cache) {
                        cache.put(request, copy);
                    });

                    return response;
                });
            })
        );

        return;
    }

    // Pour le reste : réseau d'abord
    event.respondWith(
        fetch(request).catch(function () {
            return caches.match(request);
        })
    );
});