const C = 'hunt-now-v6.0';
const FILES = ['./', 'index.html', 'style.css', 'main.js', 'chars.js', 'fx.js', 'data.js', 'story.js', 'lore.js', 'synergy.js', 'mentor.js', 'beasts.js', 'vendor/three.module.js', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png',
  'img/hero_aria.webp', 'img/enemy_wolf.webp', 'img/enemy_celes.webp', 'img/enemy_drake.webp', 'img/enemy_witch.webp', 'img/enemy_siren.webp', 'img/enemy_kitsune.webp', 'img/enemy_harpy.webp',
  'img/gallery_g_party.webp', 'img/title_cover.webp', 'img/hero_aria_face.webp', 'img/hero_hana_face.webp', 'img/hero_rin_face.webp',
  'img/comp_wolf.webp', 'img/comp_witch.webp', 'img/comp_drake.webp', 'img/comp_siren.webp', 'img/comp_kitsune.webp', 'img/comp_harpy.webp', 'sfx/bgm.mp3'];
self.addEventListener('install', e => { e.waitUntil(caches.open(C).then(c => c.addAll(FILES))); self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== C).map(k => caches.delete(k))))); self.clients.claim(); });
self.addEventListener('fetch', e => { if (e.request.method !== 'GET') return;
  e.respondWith(fetch(e.request).then(r => { const cp = r.clone(); caches.open(C).then(c => c.put(e.request, cp)); return r; }).catch(() => caches.match(e.request, { ignoreSearch: true }))); });
