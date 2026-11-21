/* NUMOTIFSTUDIO - Trace: offline support.
   - The app itself (page, icons, built-in croquis, sample designs) is saved on install.
   - The page is fetched fresh when there is a connection (so updates arrive), and from the saved copy when there is not.
   - Libraries from jsDelivr and the fonts are saved the first time they are used; their URLs carry exact versions.
   - The AI models are saved by the page itself (Cache Storage 'trace-camera-ai-v1'), so they are left alone here.
   Bump VERSION when the list of app files changes. */
var VERSION = 'v3';
var SHELL = 'numotif-trace-shell-' + VERSION, LIBS = 'numotif-trace-libs-v1';
var SAMPLES = ['gown-front', 'gown-back', 'blazer-wide-leg-trousers', 'blouse-pencil-skirt', 'wide-leg-jumpsuit',
  'cable-knit-pleated-midi', 'cropped-jacket-fit-and-flare'];
var FILES = ['./', 'manifest.webmanifest', 'assets/favicon-32.png', 'assets/icon-192.png', 'assets/icon-512.png',
  'assets/apple-touch-icon.png', 'assets/wordmark-white.png',
  'assets/croquis/croquis-9-head-front.png', 'assets/croquis/croquis-9-head-back.png']
  .concat(SAMPLES.map(function (s) { return 'assets/samples/' + s + '.jpg'; }))
  .concat(SAMPLES.map(function (s) { return 'assets/samples/thumb-' + s + '.jpg'; }));

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(SHELL).then(function (c) { return c.addAll(FILES); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k.indexOf('numotif-trace-shell-') === 0 && k !== SHELL; })
      .map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

function timeout(ms) { return new Promise(function (res, rej) { setTimeout(function () { rej(new Error('slow network')); }, ms); }); }

self.addEventListener('fetch', function (e) {
  var req = e.request; if (req.method !== 'GET') return;
  var url = new URL(req.url);
  var same = url.origin === self.location.origin;
  // the page: fresh when online (quickly), the saved copy when offline or the network is very slow
  if (req.mode === 'navigate' && same) {
    e.respondWith(Promise.race([fetch(req), timeout(5000)]).then(function (res) {
      if (res && res.ok) { var copy = res.clone(); caches.open(SHELL).then(function (c) { c.put('./', copy); }); }
      return res;
    }).catch(function () {
      return caches.match('./', { cacheName: SHELL }).then(function (hit) { return hit || fetch(req); });
    }));
    return;
  }
  // versioned libraries and fonts: saved copy first, saved on first use
  if (url.hostname === 'cdn.jsdelivr.net' || url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(caches.open(LIBS).then(function (c) {
      return c.match(req).then(function (hit) {
        return hit || fetch(req).then(function (res) { if (res && (res.ok || res.type === 'opaque')) c.put(req, res.clone()); return res; });
      });
    }));
    return;
  }
  // the app's own files (not the AI model, which the page caches itself): saved copy at once, refreshed in the background
  if (same && url.pathname.indexOf('/models/') < 0) {
    e.respondWith(caches.open(SHELL).then(function (c) {
      return c.match(req, { ignoreSearch: true }).then(function (hit) {
        var net = fetch(req).then(function (res) { if (res && res.ok) c.put(req, res.clone()); return res; });
        return hit ? (net.catch(function () {}), hit) : net;
      });
    }));
  }
});
