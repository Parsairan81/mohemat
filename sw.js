// Service Worker - دفترچه یادداشت من
const CACHE_NAME = 'memo-v3';
const urlsToCache = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json'
];

// نصب - کش کردن فایل‌های اصلی
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(urlsToCache);
    })
  );
  self.skipWaiting();
});

// فعال‌سازی - پاک کردن کش‌های قدیمی
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(name) {
          if (name !== CACHE_NAME) {
            return caches.delete(name);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// درخواست‌ها - اول از کش، بعد از شبکه
self.addEventListener('fetch', function(event) {
  const url = new URL(event.request.url);

  // درخواست‌های Cloudflare Worker رو از کش نخون
  if (url.hostname.includes('workers.dev')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then(function(response) {
      if (response) return response;
      return fetch(event.request).then(function(response) {
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then(function(cache) {
          cache.put(event.request, responseToCache);
        });
        return response;
      });
    })
  );
});
