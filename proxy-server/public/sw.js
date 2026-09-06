importScripts('/uv/uv.bundle.js', '/uv.config.js', '/uv/uv.sw.js');
const uv = new UVServiceWorker();
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', event => {
  if (uv.route(event)) event.respondWith(uv.fetch(event));
});
