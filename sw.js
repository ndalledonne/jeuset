/**
 * JeuSet — service worker
 *
 * Lets the app open without a network connection (courts often have poor
 * reception). Strategy: network first, so a new version is picked up as soon
 * as it is online; the cached copy is used only when the network fails.
 *
 * Change CACHE_VERSION when the list of files changes.
 *
 * @license MIT
 */
'use strict';

const CACHE_VERSION = 'jeuset-v2';

const APP_FILES = [
  './',
  'index.html',
  'favicon.ico',
  'assets/css/style.css',
  'assets/js/score.js',
  'assets/js/summary.js',
  'assets/js/app.js',
  'assets/favicon.svg',
  'assets/site.webmanifest',
  'assets/icon-192.png',
  'assets/icon-512.png',
  'assets/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then((cache) => cache.addAll(APP_FILES))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(() => caches.match(request).then((cached) => cached || caches.match('index.html'))),
  );
});
