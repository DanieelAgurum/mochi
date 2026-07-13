const CACHE_NAME = 'mochi-bloop-v15';

const ASSETS = [
    "public/img/biteForce.png",
    "public/img/cajaMusical.png",
    "public/img/circo.png",
    "public/img/favicon.ico",
    "public/img/globo_azul.png",
    "public/img/globo_morado.png",
    "public/img/globo_rosa.png",
    "public/img/heart.png",
    "public/img/inicio.png",
    "public/img/lady.png",
    "public/img/ladyAngry.png",
    "public/img/ladyDead.png",
    "public/img/logo.png",
    "public/img/logoGame.png",
    "public/img/maskable_icon.png",
    "public/img/maskable_icon_x128.png",
    "public/img/maskable_icon_x192.png",
    "public/img/maskable_icon_x384.png",
    "public/img/maskable_icon_x48.png",
    "public/img/maskable_icon_x512.png",
    "public/img/maskable_icon_x72.png",
    "public/img/maskable_icon_x96.png",
    "public/img/mochi.png",
    "public/img/mochiLose.png",
    "public/img/mochi_colapso_frame.png",
    "public/img/mochi_gameover_spritesheet.png",
    "public/img/mochi_llanto_frame.png",
    "public/img/mochi_salto_frame.png",
    "public/img/mochi_sorpresa_frame.png",
    "public/img/mochi_susto_frame.png",
    "public/img/mochi_triunfo_frame.png",
    "public/img/mochi_win_spritesheet.png",
    "public/img/Nota.png",
    "public/img/NotaAzul.png",
    "public/img/NotaRosa.png",
    "public/img/poppi.png",
    "public/img/poppiAngry.png",
    "public/img/poppiBola.png",
    "public/img/proyectil_frame1.png",
    "public/img/proyectil_frame2.png",
    "public/img/proyectil_frame3.png",
    "public/img/proyectil_spritesheet.png",
    "public/img/screenshot_horizontal.png",
    "public/index.html",
    "public/manifest.json",
    "public/scripts/audio.js",
    "public/scripts/input.js",
    "public/scripts/mecanicas.js",
    "public/scripts/menu.js",
    "public/sounds/Batty McFaddin.mp3",
    "public/sounds/designerschoice__musctoy_music-box-playing-carousel-possible-use-for-ice-cream-truck-bells_nicholas-judy_tdc.wav",
    "public/sounds/earth_cord__button-push.wav",
    "public/sounds/gregorquendel__procrastination-rag-1927-george-l.mp3",
    "public/sounds/littlerobotsoundfactory__jingle_lose_00.wav",
    "public/sounds/matustrm__completed.wav",
    "public/styles/styles.css",
    "public/"
];

self.addEventListener('install', event => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
        )
    );
    self.clients.claim();
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request).then(cached => cached || fetch(event.request))
    );
});