const CACHE_NAME = 'video-snap-cache-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/sw.js',
  '/lib/jszip.min.js',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  'https://fonts.googleapis.com/css2?family=Oswald:wght@700&family=Montserrat:wght@400;700&display=swap'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching app shell');
      return cache.addAll(ASSETS_TO_CACHE).catch(error => {
        // சில நேரங்களில் Google Fonts போன்ற வெளி சொத்துக்களை கேச் செய்ய முடியாமல் போகலாம்.
        console.warn('[Service Worker] Failed to cache some assets:', error);
        // தோல்வியுற்ற கோப்புகளைத் தவிர்த்துவிட்டு மற்றவற்றை கேச் செய்யவும்
        const essentialAssets = ASSETS_TO_CACHE.filter(asset => !asset.startsWith('http')); 
        return cache.addAll(essentialAssets);
      });
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(keyList.map((key) => {
        if (key !== CACHE_NAME) {
          console.log('[Service Worker] Removing old cache', key);
          return caches.delete(key);
        }
      }));
    })
  );
  // Service Worker ஐ அனைத்து கிளைண்டுகளுக்கும் உடனடியாக கட்டுப்படுத்தவும்
  return self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // வீடியோ பிளேயரில் வரும் பெரிய பைல்களை கேச் செய்ய வேண்டாம்
  if (event.request.destination === 'video' || event.request.destination === 'audio') {
    return;
  }
  
  // Font கோரிக்கைகள் இருந்தால் network-first strategy பயன்படுத்தலாம்
  if (event.request.url.includes('fonts.googleapis.com') || event.request.url.includes('fonts.gstatic.com')) {
    event.respondWith(
      caches.match(event.request).then(response => {
        return response || fetch(event.request);
      })
    );
    return;
  }
  
  // மற்ற அனைத்து கோரிக்கைகளுக்கும் cache-first, then network strategy
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request).catch(() => {
        // ஆஃப்லைனில் இருக்கும்போது கோப்பு கேச் செய்யப்படவில்லை என்றால், ஒரு fallback கொடுக்கலாம்
        if (event.request.mode === 'navigate') {
          // Fallback HTML page இங்கே சேர்க்கலாம், ஆனால் இப்போதைக்கு வெறுமனே தோல்வியைத் தெரிவிக்கும்
          console.warn('[Service Worker] Fetch failed and no cache match for navigation.');
        }
      });
    })
  );
});
