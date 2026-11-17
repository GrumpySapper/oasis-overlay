/* Oasis Radio – preview-only snow caps + light flakes.
   Include from preview copies only. Does not change live pages.
   Marks: put data-snowcap on a box (positioned element, overflow visible).
   Query: ?bg=1 for a dark preview background, ?xmasSnow=0 to hide flakes. */
(function (w) {
  if (w.OasisSnowcaps) return;
  var q = new URLSearchParams(location.search);
  if (q.get('bg') === '1' || q.get('preview') === '1') document.documentElement.classList.add('snowcap-bg');

  var css = [
    'html.snowcap-bg,html.snowcap-bg body{background:#2a2a2a!important}',
    '.snowcap{position:absolute;left:-1.6%;right:-1.6%;top:-20px;height:26px;pointer-events:none;z-index:6;overflow:visible}',
    '.snowcap svg.drift{position:absolute;inset:0;width:100%;height:100%;overflow:visible;filter:drop-shadow(0 2px 2px rgba(40,70,110,.28))}',
    '.snowcap .ice{position:absolute;top:18px;width:8px;height:16px;border-radius:0 0 8px 8px;background:linear-gradient(#fff 0%,#eef8ff 70%,#cfe8f8 100%);box-shadow:0 1px 1px rgba(80,120,160,.25)}',
    '.snowcap .ice.t{height:24px;width:7px}',
    '.snowcap .ice.s{height:11px;width:6px}',
    '#xsnowcaps-flakes{position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:8}'
  ].join('\n');
  var st = document.createElement('style');
  st.id = 'oasis-snowcaps-css';
  st.textContent = css;
  (document.head || document.documentElement).appendChild(st);

  var DRIFT = '<svg class="drift" viewBox="0 0 400 28" preserveAspectRatio="none" aria-hidden="true">' +
    '<defs><linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">' +
    '<stop offset="0" stop-color="#ffffff"/>' +
    '<stop offset=".55" stop-color="#f3faff"/>' +
    '<stop offset="1" stop-color="#dceef8"/>' +
    '</linearGradient></defs>' +
    // puffy mounds with rounded ends that droop over the corners
    '<path fill="url(#sg)" d="M2 28 C0 16 8 4 22 8 C40 2 58 16 78 6 C100 -2 122 14 148 5 C174 -2 198 14 224 4 C250 -2 274 14 302 6 C328 -1 350 14 374 8 C390 4 400 12 398 28 Z"/>' +
    '<path fill="#fff" opacity=".9" d="M10 14 C28 4 50 16 74 8 C100 0 124 14 152 7 C180 0 206 13 234 6 C262 0 290 12 322 7 C348 2 372 12 390 16 C370 8 340 16 312 10 C280 2 248 16 216 9 C184 2 152 16 120 9 C88 2 56 16 28 10 C18 8 12 12 10 14 Z"/>' +
    '</svg>';

  function cap(el) {
    if (!el || el.querySelector(':scope > .snowcap')) return el;
    var cs = getComputedStyle(el);
    if (cs.position === 'static') el.style.position = 'relative';
    if (cs.overflow === 'hidden') el.style.overflow = 'visible';
    var box = document.createElement('div');
    box.className = 'snowcap';
    box.setAttribute('aria-hidden', 'true');
    box.innerHTML = DRIFT;
    var spots = [
      [6, 's'], [14, ''], [24, 't'], [36, 's'], [46, ''],
      [57, 't'], [68, 's'], [78, ''], [88, 't'], [95, 's']
    ];
    spots.forEach(function (s) {
      var i = document.createElement('span');
      i.className = 'ice' + (s[1] ? ' ' + s[1] : '');
      i.style.left = s[0] + '%';
      box.appendChild(i);
    });
    el.insertBefore(box, el.firstChild);
    return el;
  }

  function flakes(n) {
    if (q.get('xmasSnow') === '0') return;
    if (document.getElementById('xsnowcaps-flakes')) return;
    n = n || Math.max(12, Math.min(22, Math.round(innerWidth * innerHeight / 90000)));
    var c = document.createElement('canvas');
    c.id = 'xsnowcaps-flakes';
    document.body.appendChild(c);
    var x = c.getContext('2d'), W, H, dpr = Math.min(1.5, window.devicePixelRatio || 1);
    function size() {
      W = innerWidth; H = innerHeight;
      c.width = Math.max(1, Math.round(W * dpr));
      c.height = Math.max(1, Math.round(H * dpr));
      x.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    size();
    addEventListener('resize', size);
    var spr = document.createElement('canvas'); spr.width = spr.height = 32;
    var s = spr.getContext('2d');
    var g = s.createRadialGradient(16, 16, 0, 16, 16, 16);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.45, 'rgba(240,248,255,.85)');
    g.addColorStop(1, 'rgba(220,240,255,0)');
    s.fillStyle = g; s.fillRect(0, 0, 32, 32);
    var F = [];
    for (var i = 0; i < n; i++) {
      F.push({ x: Math.random(), y: Math.random(), r: 1.3 + Math.random() * 2.4, v: 0.10 + Math.random() * 0.24, w: Math.random() * 6, a: 0.28 + Math.random() * 0.4 });
    }
    var last = 0;
    function tick(ms) {
      requestAnimationFrame(tick);
      if (ms - last < 41) return;
      var dt = Math.min(3, (ms - last) / 16.7); last = ms;
      x.clearRect(0, 0, W, H);
      for (var i = 0; i < F.length; i++) {
        var f = F[i];
        f.y += f.v * dt * 1.5 / H;
        f.w += 0.012 * dt;
        if (f.y > 1.03) { f.y = -0.03; f.x = Math.random(); }
        x.globalAlpha = f.a;
        x.drawImage(spr, f.x * W + Math.sin(f.w) * 8 - f.r, f.y * H - f.r, f.r * 2, f.r * 2);
      }
      x.globalAlpha = 1;
    }
    requestAnimationFrame(tick);
  }

  function bind() {
    document.querySelectorAll('[data-snowcap]').forEach(cap);
    flakes();
  }
  if (document.body) bind();
  else document.addEventListener('DOMContentLoaded', bind);

  w.OasisSnowcaps = { cap: cap, flakes: flakes };
})(window);
