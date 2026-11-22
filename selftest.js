/* Device check for NUMOTIFSTUDIO - Trace and KP Art (open the app with ?selftest).
   It drives the real drawing engine on this device with simulated Pencil and finger input, measures how long things
   take, checks the results, and shows a report to copy or share. It runs on its own storage (settings, prints and
   projects with a '-selftest' suffix), which it deletes at the end, so the designer's work is never touched. */
(function () {
  'use strict';
  var T = window.__trace; if (!T) return;
  var $ = function (id) { return document.getElementById(id); };
  var results = [], info = {}, running = false;

  // ---------- the panel
  var css = '#stPanel{position:fixed;z-index:60;inset:auto 12px 12px 12px;max-width:560px;margin:0 auto;max-height:min(78vh,720px);overflow:auto;' +
    'background:#fff;border-radius:18px;box-shadow:0 12px 40px rgba(0,0,0,.25);padding:16px 18px;font:14px/1.4 var(--font,system-ui);color:#2b2724}' +
    '#stPanel h2{margin:0 0 4px;font-size:1.1rem}#stPanel p{margin:4px 0 10px;color:#6b635b}' +
    '#stPanel .row{display:flex;gap:8px;flex-wrap:wrap;margin:10px 0 0;position:sticky;bottom:-16px;background:#fff;padding:10px 0 16px}#stPanel button{font:600 14px/1 var(--font,system-ui);border-radius:999px;padding:10px 16px;border:1px solid #d9d2c8;background:#fff;cursor:pointer}' +
    '#stPanel button.primary{background:var(--accent,#7c2a34);color:#fff;border-color:transparent}#stPanel button:disabled{opacity:.45}' +
    '#stPanel ol{margin:6px 0;padding-left:0;list-style:none;display:grid;gap:4px}#stPanel li{display:grid;grid-template-columns:22px 1fr auto;gap:6px;align-items:baseline}' +
    '#stPanel li .n{color:#6b635b;font-variant-numeric:tabular-nums;font-size:.85rem;text-align:right}#stPanel li .d{grid-column:2/4;color:#6b635b;font-size:.8rem}' +
    '#stPanel .ok{color:#1e6b46}#stPanel .bad{color:#b3262e}#stPanel .warn{color:#a66a00}#stPanel .prog{height:6px;border-radius:3px;background:#eee;overflow:hidden}' +
    '#stPanel .prog i{display:block;height:100%;width:0;background:var(--accent,#7c2a34);transition:width .2s}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
  var P = document.createElement('div'); P.id = 'stPanel'; P.setAttribute('role', 'dialog'); P.setAttribute('aria-label', 'Device check');
  P.innerHTML = '<h2>Device check</h2><p>Tests every drawing tool on this device with a simulated Pencil, and times it. It uses its own ' +
    'storage and deletes it at the end; your drawings are not touched. Takes about a minute. Keep the app in front while it runs.</p>' +
    '<div class="prog"><i id="stBar"></i></div><ol id="stList"></ol>' +
    '<div class="row"><button type="button" class="primary" id="stRun">Run the check</button><button type="button" id="stCopy" hidden>Copy report</button>' +
    '<button type="button" id="stShare" hidden>Share report</button><button type="button" id="stBack">Back to Trace</button></div>';
  document.body.appendChild(P);
  $('stBack').addEventListener('click', function () { cleanup().then(function () { location.href = location.pathname; }); });
  $('stRun').addEventListener('click', function () { if (!running) run(); });
  $('stCopy').addEventListener('click', function () {
    var t = reportText();
    (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(function () { $('stCopy').textContent = 'Copied'; }, function () { prompt('Copy the report:', t); });
  });
  $('stShare').addEventListener('click', function () { if (navigator.share) navigator.share({ title: 'Trace device check', text: reportText() }).catch(function () {}); });

  function row(r) {
    var li = document.createElement('li');
    var mark = r.ok === true ? '<span class="ok">✓</span>' : r.ok === false ? '<span class="bad">✗</span>' : '<span class="warn">•</span>';
    li.innerHTML = mark + '<span></span><span class="n"></span>' + (r.detail ? '<span class="d"></span>' : '');
    li.children[1].textContent = r.name; li.children[2].textContent = r.value || '';
    if (r.detail) li.children[3].textContent = r.detail;
    $('stList').appendChild(li); li.scrollIntoView({ block: 'nearest' });
  }
  function add(name, ok, value, detail) { var r = { name: name, ok: ok, value: value, detail: detail }; results.push(r); row(r); return r; }
  function reportText() {
    var L = [document.title + ' device check — build ' + (document.querySelector('meta[name=app-build]') || {}).content + ' — ' + new Date().toISOString()];
    Object.keys(info).forEach(function (k) { L.push(k + ': ' + info[k]); });
    L.push('');
    results.forEach(function (r) { L.push((r.ok === true ? 'PASS ' : r.ok === false ? 'FAIL ' : 'INFO ') + r.name + (r.value ? ' — ' + r.value : '') + (r.detail ? ' (' + r.detail + ')' : '')); });
    return L.join('\n');
  }

  // ---------- simulated input
  function ev(type, x, y, o) {
    o = o || {};
    var e = new PointerEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y, pointerId: o.id || 77, pointerType: o.pt || 'pen',
      pressure: type === 'pointerup' ? 0 : (o.pressure || 0.5), buttons: type === 'pointerup' ? 0 : 1, button: 0, isPrimary: true, altKey: !!o.alt });
    $('stage').dispatchEvent(e);
  }
  function stroke(pts, o) { ev('pointerdown', pts[0][0], pts[0][1], o); for (var i = 1; i < pts.length; i++) ev('pointermove', pts[i][0], pts[i][1], o); var l = pts[pts.length - 1]; ev('pointerup', l[0], l[1], o); }
  function line(x0, y0, x1, y1, n) { var p = []; n = n || 40; for (var i = 0; i <= n; i++) p.push([x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n]); stroke(p); }
  function wave(x0, y, len, amp, n) { var p = []; n = n || 50; for (var k = 0; k <= n; k++) p.push([x0 + len * k / n, y + Math.sin(k / 4) * amp]); stroke(p); }
  function rect(x0, y0, x1, y1, o) { var c = [[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]], p = []; for (var k = 0; k < 4; k++) for (var i = 0; i < 20; i++) p.push([c[k][0] + (c[k + 1][0] - c[k][0]) * i / 20, c[k][1] + (c[k + 1][1] - c[k][1]) * i / 20]); p.push([x0, y0 + 1]); stroke(p, o); }
  function wait(ms) { return new Promise(function (r) { setTimeout(r, ms || 16); }); }
  function until(fn, ms) { var t0 = performance.now(); return new Promise(function (res) { (function c() { if (fn() || performance.now() - t0 > (ms || 15000)) res(); else setTimeout(c, 20); })(); }); }
  function pick(b, layer) { T.S.inkBrush = b; T.S.inkErase = false; T.S.inkFill = false; if (layer) T.S.activeLayer = layer; }
  function pix() { T.INK.dirty = true; T.inkPaint(); var c = $('inkLayer'); return c.getContext('2d').getImageData(0, 0, c.width, c.height).data; }
  function diff(a, b) { var n = 0, mx = 0; for (var i = 0; i < a.length; i++) { var d = Math.abs(a[i] - b[i]); if (d > 8) n++; if (d > mx) mx = d; } return { n: n, mx: mx }; }
  function ms(v) { return Math.round(v) + ' ms'; }
  // the longest time the page's own thread was busy (a timer that should fire every 4 ms)
  function blockMeter() { var max = 0, last = performance.now(), on = true; (function tick() { var n = performance.now(); max = Math.max(max, n - last); last = n; if (on) setTimeout(tick, 4); })(); return { stop: function () { on = false; return max; } }; }
  function fresh() { if (T.S.sym && T.S.sym.mode !== 'off') { T.S.sym.mode = 'off'; T.symChanged(); } T.setSelMode(false); T.INK.strokes = []; T.setLayers(null); T.S.activeLayer = 'sketch'; T.INK.dirty = true; T.inkPaint(); }
  function W() { return window.innerWidth; } function H() { return window.innerHeight; }

  // ---------- the checks
  var CHECKS = [
    ['This device', function () {
      var nav = navigator;
      info.Device = nav.userAgent; info.Screen = screen.width + '×' + screen.height + ' @' + (window.devicePixelRatio || 1) + 'x, window ' + W() + '×' + H();
      info.Cores = nav.hardwareConcurrency || '?'; info.Memory = nav.deviceMemory ? nav.deviceMemory + ' GB' : 'not told';
      info['Paint workers'] = (T.RW.ok(), T.RW.size()); info['Screen resolution used'] = T.inkDpr() + 'x';
      info['Cache budget'] = Math.round(T.MEM.budget / 1048576) + ' MB';
      add('Pointer events', !!window.PointerEvent, '');
      add('Workers for painting', T.RW.size() > 0, T.RW.size() + ' workers');
      add('Share sheet with files', null, navigator.canShare && (function () { try { return navigator.canShare({ files: [new File(['x'], 'x.png', { type: 'image/png' })] }); } catch (e) { return false; } })() ? 'yes' : 'no (downloads instead)');
      var mp4 = window.MediaRecorder && MediaRecorder.isTypeSupported && (MediaRecorder.isTypeSupported('video/mp4') || MediaRecorder.isTypeSupported('video/mp4;codecs=avc1'));
      add('Time-lapse video (MP4)', null, mp4 ? 'yes' : window.MediaRecorder ? 'WebM only' : 'no');
      add('WebGPU (faster AI outlines)', null, navigator.gpu ? 'yes' : 'no (uses the slower path)');
      return (navigator.storage && navigator.storage.estimate ? navigator.storage.estimate() : Promise.resolve(null)).then(function (e) {
        if (e) add('Storage', null, Math.round((e.usage || 0) / 1048576) + ' MB used of ' + Math.round((e.quota || 0) / 1048576) + ' MB');
        return navigator.storage && navigator.storage.persisted ? navigator.storage.persisted() : null;
      }).then(function (p) { add('Storage kept permanently', p ? true : null, p ? 'yes' : 'no', p ? '' : 'Safari may clear it after weeks unused; Add to Home Screen keeps it'); });
    }],
    ['Every brush', function () {
      fresh(); var keys = ['pencil', 'charcoal', 'pen', 'tech', 'brush', 'dip', 'callig', 'marker', 'water', 'gouache', 'dry', 'pastel', 'air', 'shadow', 'light'];
      var worst = 0, worstK = '', y0 = H() * 0.12, gap = (H() * 0.76) / keys.length;
      keys.forEach(function (k, i) {
        pick(k, ['pencil', 'charcoal'].indexOf(k) >= 0 ? 'sketch' : ['pen', 'tech', 'brush', 'dip', 'callig'].indexOf(k) >= 0 ? 'lines' : 'colour');
        var t = performance.now(); wave(W() * 0.15, y0 + i * gap, W() * 0.6, gap * 0.3); var d = performance.now() - t;
        if (d > worst) { worst = d; worstK = k; }
      });
      var t2 = performance.now(); pix(); var full = performance.now() - t2;
      add('15 brushes drew', T.INK.strokes.length === keys.length, T.INK.strokes.length + ' strokes');
      add('Slowest stroke (draw + lift)', worst < 120, ms(worst), worstK);
      add('Full redraw of the page', full < 250, ms(full));
    }],
    ['Heavy painting', function () {
      fresh();
      for (var i = 0; i < 40; i++) { var b = ['water', 'air', 'shadow', 'water'][i % 4]; pick(b, 'colour'); T.S.brushSet[b].size = 2; wave(W() * 0.1, H() * 0.1 + (i % 20) * H() * 0.04, W() * 0.75, 20); }
      T.S.brushSet.water.size = 1; T.S.brushSet.air.size = 1; T.S.brushSet.shadow.size = 1;
      pix();
      var m = blockMeter(), t = performance.now();
      $('stage').dispatchEvent(new WheelEvent('wheel', { deltaY: -100, clientX: W() / 2, clientY: H() / 2, bubbles: true, cancelable: true }));
      pix(); var zoom = performance.now() - t;
      return until(function () { return !T.RW.pending(); }).then(function () {
        var sharpen = performance.now() - t, block = m.stop();
        add('Zoom on a heavy painting', zoom < 100, ms(zoom), 'paint shows at once');
        add('Paint sharpened in the background', !T.RW.pending(), ms(sharpen), 'longest pause ' + ms(block));
        var a = pix(); T.INK.strokes.forEach(function (s) { s._r = null; }); var b2 = pix(); var d = diff(a, b2);
        add('Workers paint the same pixels', d.n === 0, d.n ? d.n + ' differ' : 'identical');
        add('Paint cache memory', T.MEM.bytes < T.MEM.budget * 1.2, Math.round(T.MEM.bytes / 1048576) + ' MB of ' + Math.round(T.MEM.budget / 1048576), 'peak ' + Math.round(T.MEM.peak / 1048576) + ' MB');
        $('stage').dispatchEvent(new WheelEvent('wheel', { deltaY: 100, clientX: W() / 2, clientY: H() / 2, bubbles: true, cancelable: true }));
      });
    }],
    ['Exports', function () {
      var m = blockMeter(), t = performance.now();
      return T.inkPngBlob().then(function (png) {
        var d = performance.now() - t; add('PNG of the heavy painting', !!png, ms(d), (png ? Math.round(png.size / 1024) + ' KB, ' : '') + 'longest pause ' + ms(m.stop()));
        var m2 = blockMeter(), t2 = performance.now();
        return T.inkSvgReady().then(function (svg) {
          var d2 = performance.now() - t2, okSvg = !!svg && !new DOMParser().parseFromString(svg, 'image/svg+xml').querySelector('parsererror');
          add('SVG of the heavy painting', okSvg, ms(d2), (svg ? (svg.length / 1048576).toFixed(1) + ' MB, ' : '') + 'longest pause ' + ms(m2.stop()));
          if (svg && !/<image/.test(svg)) { add('SVG holds lines only in this app', null, '', 'paint is in the PNG'); return null; }
          return Promise.all([createImageBitmap(png), new Promise(function (res, rej) { var im = new Image(); im.onload = function () { res(im); }; im.onerror = rej; im.src = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' })); })]);
        }).then(function (ims) {
          if (!ims) return;
          var a = ims[0], w = a.width, h = a.height, c1 = document.createElement('canvas'), c2 = document.createElement('canvas'); c1.width = c2.width = w; c1.height = c2.height = h;
          c1.getContext('2d').drawImage(a, 0, 0); c2.getContext('2d').drawImage(ims[1], 0, 0, w, h);
          var A = c1.getContext('2d').getImageData(0, 0, w, h).data, B = c2.getContext('2d').getImageData(0, 0, w, h).data, inter = 0, uni = 0;
          for (var i = 3; i < A.length; i += 4) { var x = A[i] > 60, y = B[i] > 60; if (x && y) inter++; if (x || y) uni++; }
          add('SVG matches the PNG', inter / uni > 0.97, (inter / uni * 100).toFixed(1) + '% overlap');
        });
      });
    }],
    ['Layers', function () {
      fresh(); pick('pencil', 'sketch'); line(W() * 0.2, H() * 0.3, W() * 0.7, H() * 0.32); line(W() * 0.2, H() * 0.36, W() * 0.7, H() * 0.38);
      $('railLayers').click(); $('layerAdd').click();
      var inp = document.querySelector('.layerPick input'); if (inp) { inp.value = 'Check'; inp.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); }
      $('inkPopClose').click();
      var id = T.S.activeLayer, named = T.layerState().some(function (l) { return l.id === id && l.name === 'Check'; });
      add('New layer, named', named && T.LAYERS.length === 4, T.LAYERS.length + ' layers');
      pick('pen'); T.S.activeLayer = id; rect(W() * 0.3, H() * 0.25, W() * 0.5, H() * 0.45);
      var before = pix(); T.mergeDown(id); var after = pix(), d = diff(before, after);
      add('Merge down looks the same', d.n < 60, d.n + ' px differ');
      $('undoBtn').click(); add('Undo brings the layer back', T.LAYERS.length === 4);
      T.S.layerSet[id].lock = true; var n0 = T.INK.strokes.length; line(W() * 0.2, H() * 0.6, W() * 0.6, H() * 0.6);
      add('A locked layer takes no strokes', T.INK.strokes.length === n0); T.S.layerSet[id].lock = false;
      T.S.layerSet[id].blend = 'multiply'; var blend = pix(); add('Blend modes draw', blend.length > 0, 'multiply');
      T.duplicateLayer(id); add('Duplicate layer', T.LAYERS.length === 5);
    }],
    ['Select and move', function () {
      fresh(); pick('pen', 'lines');
      var cx = W() * 0.4, cy = H() * 0.4, r = Math.min(W(), H()) * 0.08, p = [];
      for (var i = 0; i <= 60; i++) { var a = i / 60 * Math.PI * 2; p.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } stroke(p);
      $('railSelect').click(); rect(cx - r * 1.6, cy - r * 1.6, cx + r * 1.6, cy + r * 1.6);
      var sel = T.INK.sel; add('Loop selects the line', !!sel && sel.list.length === 1 && !sel.pix);
      var x0 = sel.list[0].p[0], t = performance.now(), path = [];
      for (i = 0; i <= 20; i++) path.push([cx + 30 * i, cy + 15 * i]); stroke(path);
      var d = performance.now() - t, moved = T.INK.sel.list[0].p[0] - x0, want = 600 / T.V.s;   // screen px → page px at this zoom
      add('Drag moves it exactly', Math.abs(moved - want) < 0.5, Math.round(moved) + ' px of ' + Math.round(want), 'drag ' + ms(d));
      $('undoBtn').click();
      T.S.inkErase = false; pick('pen', 'lines'); T.setSelMode(false); line(W() * 0.15, H() * 0.7, W() * 0.75, H() * 0.7);
      $('railSelect').click(); var before = pix(); rect(W() * 0.4, H() * 0.65, W() * 0.5, H() * 0.75);
      add('A loop through a line takes pixels', !!T.INK.sel && T.INK.sel.pix);
      stroke([[W() * 0.45, H() * 0.7], [W() * 0.47, H() * 0.6], [W() * 0.5, H() * 0.5]]);
      add('Pixels moved (picture + cut)', T.INK.strokes.some(function (s) { return s.t === 'img'; }) && T.INK.strokes.some(function (s) { return s.t === 'cut'; }));
      $('undoBtn').click(); var d2 = diff(before, pix()); add('Undo puts the pixels back', d2.n === 0, d2.n ? d2.n + ' px differ' : 'exact');
      T.setSelMode(false);
    }],
    ['Fill and drape', function () {
      fresh(); pick('pen', 'lines'); rect(W() * 0.3, H() * 0.25, W() * 0.65, H() * 0.7);
      T.S.inkFill = true; T.S.fillPrint = 'gingham'; T.S.fillMode = 'fill'; var t = performance.now();
      ev('pointerdown', W() * 0.47, H() * 0.47); ev('pointerup', W() * 0.47, H() * 0.47);
      return until(function () { return T.INK.strokes.some(function (s) { return s.t === 'fill'; }); }, 8000).then(function () {
        var d = performance.now() - t, has = T.INK.strokes.some(function (s) { return s.t === 'fill'; });
        add('Fill' + ($('fillModeSeg') ? ' with a print' : ''), has, ms(d));
        if (!has || !$('fillModeSeg')) return;   // KP Art has plain fills only
        T.S.fillMode = 'drape'; var pts = []; for (var i = 0; i <= 30; i++) pts.push([W() * 0.4 + i * 4, H() * 0.47 + i * 2]);
        ev('pointerdown', pts[0][0], pts[0][1]); var t2 = performance.now(); for (i = 1; i < pts.length; i++) { ev('pointermove', pts[i][0], pts[i][1]); pix(); } var per = (performance.now() - t2) / (pts.length - 1);
        ev('pointerup', pts[pts.length - 1][0], pts[pts.length - 1][1]); T.S.fillMode = 'fill'; T.S.inkFill = false;
        add('Drape, per move', per < 34, ms(per), per < 34 ? 'smooth' : 'may feel heavy');
      });
    }],
    ['Pick a colour', function () {
      fresh(); T.S.inkColor = '#b3262e'; pick('gouache', 'colour'); line(W() * 0.2, H() * 0.5, W() * 0.7, H() * 0.5); T.S.inkColor = '#111111'; pick('pen', 'lines');
      ev('pointerdown', W() * 0.45, H() * 0.5);
      return wait(650).then(function () { var loupe = !$('loupe').hidden; ev('pointerup', W() * 0.45, H() * 0.5); add('Touch and hold picks the paint', loupe && T.S.inkColor !== '#111111', T.S.inkColor); });
    }],
    ['Pattern studio', function () {
      if (!T.symGet || !$('railPattern')) return;
      fresh(); T.S.sym.mode = 'kaleido'; T.S.sym.n = 8; T.S.sym.mirror = true; T.S.sym.ox = null; T.S.sym.oy = null; T.symChanged();
      pick('pen', 'lines'); var t = performance.now(); line(W() * 0.55, H() * 0.3, W() * 0.65, H() * 0.42); var d = performance.now() - t;
      add('Kaleidoscope copies each line', T.symGet().ops.length === 16, T.symGet().ops.length + ' copies', 'stroke ' + ms(d));
      // the 17 wallpaper symmetries: the right number of moves, each fitting the grid
      var want = { p1: 1, p2: 2, pm: 2, pg: 2, cm: 4, pmm: 4, pmg: 4, pgg: 4, cmm: 8, p4: 4, p4m: 8, p4g: 8, p3: 3, p3m1: 6, p31m: 6, p6: 6, p6m: 12 }, bad = [];
      T.WALL.forEach(function (g) { var sv = T.symBuild({ mode: 'wall', group: g[0], size: 160, n: 8, mirror: true, layout: 'grid' }, { x: 0, y: 0 }); if (sv.ops.length !== want[g[0]]) bad.push(g[0]); });
      add('17 wallpaper symmetries', !bad.length, bad.length ? bad.join(', ') + ' wrong' : 'all correct');
      fresh(); T.S.sym.mode = 'wall'; T.S.sym.group = 'p6m'; T.S.sym.size = 160; T.symChanged();
      pick('gouache', 'colour'); T.S.inkColor = '#b3262e'; var m = blockMeter(); t = performance.now();
      for (var i = 0; i < 5; i++) wave(W() * 0.35 + i * 12, H() * 0.4 + i * 10, W() * 0.2, 25, 30);
      var dd = performance.now() - t, blk = m.stop(), got = T.INK.strokes.length;
      add('Drawing a hex wallpaper', got === 5 && dd < 2000, got === 5 ? ms(dd / 5) + ' a stroke' : got + ' of 5 strokes drawn', 'longest pause ' + ms(blk));
      t = performance.now();
      return T.symTileImage(2048).then(function (tile) {
        var d2 = performance.now() - t; if (!tile) { add('Pattern tile', false, 'none'); return; }
        var Wt = tile.width, Ht = tile.height, two = document.createElement('canvas'); two.width = 2 * Wt; two.height = Ht; var x2 = two.getContext('2d'); x2.drawImage(tile, 0, 0); x2.drawImage(tile, Wt, 0);
        var dt = x2.getImageData(Wt - 2, 0, 4, Ht).data, join = 0, inside = 0;
        for (var y = 0; y < Ht; y++) { join += Math.abs(dt[(y * 4 + 2) * 4 + 3] - dt[(y * 4 + 1) * 4 + 3]); inside += Math.abs(dt[(y * 4 + 1) * 4 + 3] - dt[(y * 4) * 4 + 3]); }
        var ink = 0, td = tile.getContext('2d').getImageData(0, 0, Wt, Ht).data; for (var q = 3; q < td.length; q += 40) if (td[q] > 20) ink++;
        add('Pattern tile (2048 px)', ink > 50, ms(d2), Wt + ' × ' + Ht + ' px, ' + Math.round(ink * 1000 / (td.length / 40)) / 10 + '% painted');
        add('Tile is seamless', join <= inside * 2 + Ht * 2, join <= inside * 2 + Ht * 2 ? 'edges meet' : 'edge step ' + join + ' vs ' + inside);
        t = performance.now();
        return T.symSvgText().then(function (svg) {
          var okSvg = !!svg && !new DOMParser().parseFromString(svg, 'image/svg+xml').querySelector('parsererror');
          add('Pattern swatch as SVG', okSvg, ms(performance.now() - t), svg ? (svg.length / 1048576).toFixed(1) + ' MB' : '');
          T.S.sym.mode = 'off'; T.symChanged();
        });
      });
    }],
    ['Procreate-style tools', function () {
      fresh(); pick('gouache', 'colour'); T.S.inkColor = '#e4ded5'; T.S.brushSet.gouache.size = 4;
      for (var r = 0; r < 5; r++) line(W() * 0.35, H() * 0.35 + r * 22, W() * 0.65, H() * 0.35 + r * 22);
      T.S.brushSet.gouache.size = 1;
      $('layerAdd').click(); var inp = document.querySelector('.layerPick input'); if (inp) inp.blur(); $('inkPopClose').click();
      var id = T.S.activeLayer; T.S.layerSet[id].clip = true; T.S.inkColor = '#b3262e'; pick('pen', id);
      line(W() * 0.2, H() * 0.42, W() * 0.8, H() * 0.42);
      var c = $('inkLayer'), dp = T.inkDpr(); T.INK.dirty = true; T.inkPaint();
      var out = c.getContext('2d').getImageData(W() * 0.25 * dp, H() * 0.42 * dp, 1, 1).data[3], inn = c.getContext('2d').getImageData(W() * 0.5 * dp, H() * 0.42 * dp, 1, 1).data;
      add('Clipping mask', out === 0 && inn[0] > 150 && inn[1] < 90, out === 0 ? 'stays inside its base' : 'leaks outside');
      // QuickShape: a wobbly circle held at the end
      fresh(); pick('pen', 'lines'); var pts = [], cx = W() * 0.5, cy = H() * 0.45, rr = Math.min(W(), H()) * 0.12;
      for (var i = 0; i <= 60; i++) { var a = i / 60 * Math.PI * 2; pts.push([cx + Math.cos(a) * rr * (1 + 0.06 * Math.sin(a * 3)), cy + Math.sin(a) * rr * 0.8]); }
      ev('pointerdown', pts[0][0], pts[0][1]); for (i = 1; i < pts.length; i++) ev('pointermove', pts[i][0], pts[i][1]);
      return wait(800).then(function () {
        ev('pointermove', pts[60][0] + 0.4, pts[60][1]); ev('pointerup', pts[60][0] + 0.4, pts[60][1]);
        var st = T.INK.strokes[T.INK.strokes.length - 1]; add('QuickShape (hold to snap)', st && st.qs === 'ellipse', st && st.qs || 'did not snap');
        // flat blocks: every preset front and back on every body, every option on its own, without broken points
        if (!T.BLK_PRESETS) return;   // KP Art has no garment blocks
        var bad = 0, n = 0, def = function (b) { var o = {}; T.BLK_PARAMS[b].forEach(function (pp) { o[pp[0]] = pp[2] === 'bool' ? false : pp[2][0][0]; }); return o; };
        var broken = function (ls) { return !ls.length || ls.some(function (l) { return l.pts.length < 2 || l.pts.some(function (q) { return !isFinite(q[0]) || !isFinite(q[1]); }); }); };
        var bodies = Object.keys(T.BLK_BODIES), t0 = performance.now();
        T.BLK_PRESETS.forEach(function (cat) { cat[1].forEach(function (pr) { ['front', 'back'].forEach(function (v) { bodies.forEach(function (bo) { n++; if (broken(T.blkLines(pr[1], Object.assign(def(pr[1]), pr[2]), v, bo))) bad++; }); }); }); });
        add('Flat blocks (' + n / 2 / bodies.length + ' garments, ' + bodies.length + ' bodies)', !bad, bad ? bad + ' broken views' : 'front and back all fine', ms(performance.now() - t0) + ' to draw them all');
        var bad2 = 0, n2 = 0;
        Object.keys(T.BLK_PARAMS).forEach(function (base) { T.BLK_PARAMS[base].forEach(function (pa) { (pa[2] === 'bool' ? [true, false] : pa[2].map(function (o) { return o[0]; })).forEach(function (val) { ['front', 'back'].forEach(function (v) { var p = def(base); p[pa[0]] = val; n2++; if (broken(T.blkLines(base, p, v))) bad2++; }); }); }); });
        add('Every garment option', !bad2, bad2 ? bad2 + ' of ' + n2 + ' broken' : n2 + ' views fine');
        fresh(); var t1 = performance.now(); T.blkPlace('Button-up shirt', 'shirt', { collar: 'point', sleeve: 'long', pocket: true, tail: true });
        add('Placing a shirt (front + back)', T.INK.strokes.length > 50, ms(performance.now() - t1), T.INK.strokes.length + ' strokes');
        // an option changed after moving the garment with Select: it stays where it was moved to; undo brings the old option back
        var box = function () { var b = [1e9, 1e9]; T.INK.strokes.forEach(function (st) { if (st.blk) for (var i = 0; i < st.p.length; i += 3) { b[0] = Math.min(b[0], st.p[i]); b[1] = Math.min(b[1], st.p[i + 1]); } }); return b; };
        var b0 = box(); T.INK.strokes = T.INK.strokes.map(function (st) { if (!st.blk) return st; var o = Object.assign({}, st); o.p = st.p.map(function (v, i) { return i % 3 === 0 ? v + 40 : i % 3 === 1 ? v + 25 : v; }); return o; });
        var cur = T.INK.blkCur; T.blkChange(function (g) { g.p.collar = 'band'; }); var b1 = box();
        var kept = Math.abs(b1[0] - b0[0] - 40) < 2 && T.INK.blocks[cur].p.collar === 'band';
        $('undoBtn').click(); var back = T.INK.blocks[cur] && T.INK.blocks[cur].p.collar === 'point';
        add('Changing a moved garment', kept && back, kept ? (back ? 'stays put; undo restores it' : 'undo did not restore the collar') : 'jumped back ' + Math.round(b1[0] - b0[0]) + ' px');
        var hgt = function () { var y0 = 1e9, y1 = -1e9; T.INK.strokes.forEach(function (st) { if (st.blk) for (var i = 1; i < st.p.length; i += 3) { y0 = Math.min(y0, st.p[i]); y1 = Math.max(y1, st.p[i]); } }); return y1 - y0; };
        var h0 = hgt(); T.blkChange(function (g) { g.body = 'child'; }); var h1 = hgt();
        add('Child body', h1 < h0 * 0.75 && h1 > h0 * 0.45, Math.round(h1 / h0 * 100) + '% of the height');
        // stitch lines: a drawn line becomes a zip; double-needle topstitching becomes two rows of dashes
        fresh(); pick('pen', 'lines'); T.S.stitch = 'zip'; line(W() * 0.3, H() * 0.3, W() * 0.3, H() * 0.6);
        var zip = T.INK.strokes.filter(function (st) { return st.stitch === 'zip'; }).length;
        T.S.stitch = 'top2'; line(W() * 0.5, H() * 0.3, W() * 0.7, H() * 0.5);
        var dash = T.INK.strokes.filter(function (st) { return st.stitch === 'top2'; }).length; T.S.stitch = 'off';
        add('Stitch lines (zip, double needle)', zip > 30 && dash > 10, zip + ' zip parts, ' + dash + ' stitches');
      });
    }],
    ['Save and reopen', function () {
      fresh(); pick('pen', 'lines'); line(W() * 0.2, H() * 0.3, W() * 0.6, H() * 0.3);
      $('layerAdd').click(); var inp = document.querySelector('.layerPick input'); if (inp) inp.blur(); $('inkPopClose').click();
      var want = JSON.stringify(T.layerState()), n = T.INK.strokes.length, t = performance.now();
      return Promise.resolve(T.saveSession()).then(function () {
        var d = performance.now() - t, key = T.PROJ && T.PROJ.id ? 'project:' + T.PROJ.id : 'session';   // Trace keeps a list of projects, KP Art the current drawing
        return T.store('kv', 'readonly', function (s) { return s.get(key); }).then(function (rec) {
          add('Project saved with its layers', !!rec && rec.ink.length === n && JSON.stringify(rec.layers) === want, ms(d));
        });
      });
    }]
  ];

  function run() {
    running = true; results = []; $('stList').innerHTML = ''; $('stRun').disabled = true; $('stCopy').hidden = true; $('stShare').hidden = true;
    var go = $('start') && !$('start').hidden ? (($('goScreen') || {}).click && $('goScreen').click(), wait(600)) : Promise.resolve();
    var i = 0;
    return go.then(function next() {
      if (i >= CHECKS.length) return;
      var c = CHECKS[i++]; $('stBar').style.width = Math.round(i / CHECKS.length * 100) + '%';
      var r; try { r = c[1](); } catch (e) { add(c[0] + ' (stopped)', false, '', e && e.message || String(e)); }
      return Promise.resolve(r).catch(function (e) { add(c[0] + ' (stopped)', false, '', e && e.message || String(e)); }).then(function () { return wait(60); }).then(next);
    }).then(function () {
      var bad = results.filter(function (r) { return r.ok === false; }).length;
      add(bad ? bad + ' check' + (bad === 1 ? '' : 's') + ' failed' : 'All checks passed', !bad, '');
      return cleanup();
    }).then(function () {
      running = false; $('stRun').disabled = false; $('stRun').textContent = 'Run again'; $('stCopy').hidden = false; $('stShare').hidden = !navigator.share;
    });
  }
  // delete everything the check stored (its own settings, prints and projects)
  function cleanup() {
    try { fresh(); } catch (e) {}
    try { Object.keys(localStorage).forEach(function (k) { if (/-selftest$/.test(k)) localStorage.removeItem(k); }); } catch (e) {}
    return T.store('kv', 'readwrite', function (s) { s.clear(); }).catch(function () {}).then(function () {
      return T.store('boards', 'readwrite', function (s) { s.clear(); }).catch(function () {});
    });
  }
  window.addEventListener('error', function (e) { if (running) add('Page error', false, '', (e.message || '') + ' @' + (e.lineno || '')); });
})();
