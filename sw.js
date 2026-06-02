const CACHE_NAME = "starfall-circus-v1";
const ASSETS = [
    "./",
    "./starfall_circus.html",
    "./styles.css",
    "./mecanicas.js",
    "./mochi.png",
    "./poppi.png",
    "./poppiBola.png",
    "./poppiAngry.png",
    "./circo.png",
    "./heart.png"
];

self.addEventListener("install", (e) => {
    e.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
    );
});

self.addEventListener("fetch", (e) => {
    e.respondWith(
        caches.match(e.request).then(cached => cached || fetch(e.request))
    );
});