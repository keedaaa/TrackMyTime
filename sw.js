/* TrackMyTime by Nikkhil Deshmukkh - lets the app open without internet and handles the pop-up buttons */
var CACHE = 'trackmytime-b8a6bc4294';
var FILES = ['./', 'index.html', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(FILES.map(function (f) { return new Request(f, { cache: 'reload' }); })); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k.indexOf('trackmytime-') === 0 && k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

// Open instantly from the saved copy (works at start-up before Wi-Fi connects); fetch a fresh copy in the background
self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  var key = req.mode === 'navigate' ? 'index.html' : req, saving = null;
  var net = fetch(req).then(function (r) {
    if (r && r.ok && r.type === 'basic') {
      var copy = r.clone();
      saving = caches.open(CACHE).then(function (c) { return c.put(key, copy); });
    }
    return r;
  });
  e.waitUntil(net.then(function () { return saving; }).catch(function () {}));
  e.respondWith(caches.open(CACHE).then(function (c) { return c.match(key, { ignoreSearch: true }); }).then(function (hit) { return hit || net; }));
});

// "Lunch" / "I was working" buttons on the Windows pop-up
self.addEventListener('notificationclick', function (e) {
  var n = e.notification, d = n.data || {}, kind = (e.action === 'Lunch' || e.action === 'Work') ? e.action : '';
  n.close();
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (list) {
    if (kind && d.a && d.b) {
      if (list.length) { list.forEach(function (c) { c.postMessage({ type: 'mark', kind: kind, a: d.a, b: d.b }); }); return; }
      return self.clients.openWindow('./#mark-' + kind + '-' + d.a + '-' + d.b);
    }
    if (list.length) { var c = list[0]; c.postMessage({ type: 'open' }); return c.focus(); }
    return self.clients.openWindow('./#today');
  }));
});
