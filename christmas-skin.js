/* Oasis Radio Christmas skin (Nov 2026). Loaded by xmas-theme.js only when the page URL has ?theme=christmas
   (or when xmas-theme.js's XMAS_DEFAULT is flipped to 'christmas'). It only ADDS a stylesheet + light decorations;
   it never touches the page's data, race entries, jar, votes or hall of fame.
   Light on GPU: one small snow canvas at 30fps with no shadowBlur, CSS-opacity twinkle lights, static SVG holly.
   Per-link tweaks: &xmasSnow=0  &xmasLights=0  &xmasN=40 (flake count)  &xmasWelcome=keep (keep Bob's own welcome text). */
(function () {
  if (window.__oasisXmasSkin) return; window.__oasisXmasSkin = 1;
  var q = new URLSearchParams(location.search);
  var page = (location.pathname.split('/').pop() || 'overlay.html').replace(/\.html?$/, '') || 'overlay';
  var RED = '#c8102e', GREEN = '#0b6b3a', GOLD = '#ffd54a';
  var HOLLY = "data:image/svg+xml," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 80"><path d="M60 46C45 20 22 12 4 18c8 6 6 14 0 18 10 2 12 10 8 16 14-6 30-4 48-6z" fill="#0f7a3d" stroke="#064022" stroke-width="2"/><path d="M60 46c15-26 38-34 56-28-8 6-6 14 0 18-10 2-12 10-8 16-14-6-30-4-48-6z" fill="#13904a" stroke="#064022" stroke-width="2"/><path d="M60 46C46 33 22 26 8 28M60 46c14-13 38-20 52-18" stroke="#064022" stroke-width="1.5" fill="none"/><circle cx="52" cy="50" r="9" fill="#d10f2f"/><circle cx="68" cy="50" r="9" fill="#e0182f"/><circle cx="60" cy="38" r="9" fill="#c20a26"/><circle cx="49" cy="47" r="2.5" fill="#fff" opacity=".7"/><circle cx="65" cy="47" r="2.5" fill="#fff" opacity=".7"/><circle cx="57" cy="35" r="2.5" fill="#fff" opacity=".7"/></svg>');
  var HAT = "data:image/svg+xml," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 80"><path d="M12 62C20 30 44 8 70 10c14 1 22 12 20 26-6-8-14-10-20-6-6 6-4 20-2 32z" fill="#d10f2f"/><path d="M20 50c12-22 30-34 48-36" stroke="#8b0016" stroke-width="4" fill="none" opacity=".45"/><rect x="4" y="56" width="74" height="18" rx="9" fill="#fff"/><circle cx="90" cy="40" r="10" fill="#fff"/></svg>');
  var CANE = 'repeating-linear-gradient(135deg,#fff 0 9px,' + RED + ' 9px 18px)';

  var css = [
    "@import url('https://fonts.googleapis.com/css2?family=Mountains+of+Christmas:wght@700&display=swap');",
    ".xholly{position:absolute;width:70px;height:47px;background:url(\"" + HOLLY + "\") no-repeat center/contain;pointer-events:none;z-index:3}",
    ".xbob{position:relative;display:inline-block}.xbob::before{content:'';position:absolute;left:-12%;top:-52%;width:95%;height:78%;background:url(\"" + HAT + "\") no-repeat center/contain;transform:rotate(-16deg);pointer-events:none}",
    "#xlights{position:fixed;left:0;right:0;top:0;height:64px;pointer-events:none;z-index:2147482990}",
    "#xlights svg{position:absolute;inset:0;width:100%;height:100%}",
    "#xlights i{position:absolute;width:11px;height:17px;margin-left:-5.5px;border-radius:50% 50% 45% 45%;animation:xtw 2.4s ease-in-out infinite}",
    "#xlights i::before{content:'';position:absolute;left:2px;top:-5px;width:7px;height:6px;background:#3d4a3f;border-radius:2px}",
    "@keyframes xtw{0%,100%{opacity:1}50%{opacity:.25}}",
    "#xframe{position:fixed;inset:0;pointer-events:none;z-index:2147482980;border:9px solid transparent;border-image:" + CANE + " 9}",
    "#xsnow{position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;z-index:2147482970}"
  ];
  var P = {
    overlay: [
      ".welcome{position:relative;background:linear-gradient(100deg,rgba(150,8,30,.96),rgba(214,32,44,.96)) padding-box," + CANE + " border-box;border:5px solid transparent;box-shadow:0 0 26px rgba(255,90,90,.55),0 10px 30px rgba(0,0,0,.45)}",
      ".welcome .txt{font-family:'Mountains of Christmas',Montserrat,serif;font-weight:700;font-size:38px;letter-spacing:.01em}",
      ".welcome .u{color:#ffe28a}",
      ".reply{position:relative;background:linear-gradient(100deg,rgba(6,78,42,.96),rgba(16,122,64,.96)) padding-box,repeating-linear-gradient(135deg,#ffd54a 0 9px,#fff 9px 18px) border-box;border:4px solid transparent;box-shadow:0 0 24px rgba(255,213,74,.45),0 10px 30px rgba(0,0,0,.45)}",
      ".reply .hd{color:#ffe28a}",
      ".fact{position:relative;background:linear-gradient(180deg,rgba(248,252,255,.97),rgba(222,240,255,.97));border-left-color:" + RED + ";box-shadow:0 0 0 3px " + GREEN + ",0 0 22px rgba(190,230,255,.7),0 10px 30px rgba(0,0,0,.45)}",
      ".fact .lbl{color:" + RED + "}",
      ".gift .hd{color:" + RED + "}",
      ".gift.medium{background:linear-gradient(100deg,rgba(214,32,44,.96),rgba(255,196,0,.96));color:#fff}.gift.medium .hd{color:#fff2b0}",
      ".gift.big{background:linear-gradient(100deg,rgba(200,16,46,.98),rgba(255,200,40,.98),rgba(11,107,58,.98))}",
      ".gift.huge{background:linear-gradient(100deg,#c8102e,#ffd54a,#0b6b3a,#c8102e);background-size:300% 100%}",
      ".card .xholly{top:-26px;right:-18px}",
      "#showtitle{background:radial-gradient(ellipse at center,rgba(6,60,30,.30),rgba(60,0,10,.18) 70%)}",
      "#showtitle .st{font-family:'Mountains of Christmas',Montserrat,serif;font-weight:700;background:linear-gradient(90deg,#fff,#ffd54a,#ff4d5e,#fff,#ffd54a,#fff);background-size:200% auto;-webkit-background-clip:text;background-clip:text;color:transparent;filter:drop-shadow(0 0 12px rgba(255,60,60,.85)) drop-shadow(0 4px 4px rgba(0,0,0,.75))}",
      "#showtitle .ss{text-shadow:0 0 14px rgba(11,140,70,.95),0 0 6px rgba(255,213,74,.8),0 3px 6px rgba(0,0,0,.85)}",
      "#showtitle.mini .wrap{position:relative;background:linear-gradient(100deg,rgba(120,6,24,.62),rgba(6,70,36,.62)) padding-box," + CANE + " border-box;border:4px solid transparent;box-shadow:0 0 22px rgba(255,80,80,.55)}",
      "#showtitle .tw{filter:none}","#showtitle .wrap{position:relative}#showtitle .wrap .xholly{top:-34px;right:-26px}",
      "#legend{background:radial-gradient(ellipse at center,rgba(110,6,22,.85) 0%,rgba(4,40,20,.92) 70%)}",
      "#legend .lg{font-family:'Mountains of Christmas',Montserrat,serif;letter-spacing:.2em}"
    ],
    nowplaying: [
      "#np .box{position:relative;background:linear-gradient(135deg,rgba(6,70,36,.94),rgba(120,6,24,.94));border-left-color:" + RED + ";box-shadow:0 0 0 3px rgba(255,255,255,.9),0 0 22px rgba(255,213,74,.45),0 10px 28px rgba(0,0,0,.45)}",
      "#np .lbl{color:" + GOLD + "}#np .eq i{background:#fff;box-shadow:0 0 4px #fff}",
      "#np .artist{color:#ffe28a}#np .xholly{top:-24px;right:-16px}"
    ],
    'song-vote': [
      "#bg{background:linear-gradient(180deg,#02122b 0%,#0a2a4f 50%,#1b4a6b 66%,#e8f4ff 67%,#c7dff2 100%)}",
      "#sun,#grid{display:none}",
      "#panel{background:linear-gradient(160deg,rgba(5,48,28,.9),rgba(70,4,18,.9)) padding-box," + CANE + " border-box;border:6px solid transparent;box-shadow:0 0 30px rgba(255,213,74,.35),0 0 70px rgba(200,16,46,.35)}",
      "#brand{color:" + GOLD + ";text-shadow:0 0 10px rgba(255,213,74,.8)}",
      "#title{font:700 66px/1.02 'Mountains of Christmas',serif;text-transform:none;text-shadow:0 0 8px #fff,0 0 22px #ff3b4f,0 4px 4px rgba(0,0,0,.6)}",
      "#how{color:#ffe28a}#how b{background:linear-gradient(180deg,#e0182f,#8b0016);box-shadow:0 0 12px rgba(255,60,60,.7)}",
      "#rule{border-color:#fff;background:rgba(255,255,255,.12);box-shadow:0 0 12px rgba(255,255,255,.4)}",
      "#badge.open{background:#e0182f;color:#fff;box-shadow:0 0 20px #ff3b4f}#badge.idle{background:#0b6b3a;color:#eafff0;box-shadow:0 0 12px rgba(40,200,110,.6)}#badge.revealed{background:" + GOLD + "}",
      "#timer{text-shadow:0 0 12px #9fe0ff,0 0 26px #5fc4ff}",
      ".track{background:rgba(255,255,255,.1);border-color:rgba(255,255,255,.35)}",
      "#rvTop{color:" + GOLD + ";text-shadow:0 0 14px rgba(255,213,74,.9)}",
      "#rvBig{font-family:'Mountains of Christmas',serif;font-weight:700;text-shadow:0 0 10px #fff,0 0 30px #ff3b4f,0 0 70px #0fa04f}",
      "#panel .xholly{top:-20px}"
    ],
    wheels: [
      "body{background:radial-gradient(ellipse at 50% 30%,#123a6b 0%,#0a1f3d 50%,#030a17 100%)}",
      "body::before{background:linear-gradient(transparent,rgba(235,245,255,.9));transform:none;height:16%;opacity:.9;border-radius:50% 50% 0 0/30% 30% 0 0}",
      "body.transparent{background:transparent}",
      "#title{font-family:'Mountains of Christmas',serif;font-weight:700;font-size:clamp(22px,4.4vh,58px);background:linear-gradient(90deg,#ff4d5e,#ffd54a,#fff,#4fd17f);-webkit-background-clip:text;background-clip:text;color:transparent;filter:drop-shadow(0 2px 3px rgba(0,0,0,.7))}",
      ".wheelLabel{font-family:'Mountains of Christmas',serif;font-weight:700;text-shadow:0 0 10px #ff3b4f,0 2px 3px #000}",
      ".result{color:" + GOLD + ";text-shadow:0 0 8px #c8102e,0 0 18px #0b6b3a}",
      "#banner{background:rgba(6,40,22,.85) padding-box," + CANE + " border-box;border:5px solid transparent;box-shadow:0 0 16px rgba(255,80,80,.6)}",
      "#banner b{color:#ff8a95}#banner span{color:" + GOLD + "}",
      "button{border-color:#ff3b4f;background:#0b3a22}#spinAll{border-color:" + GOLD + ";box-shadow:0 0 12px " + GOLD + "}"
    ],
    'gifter-hall-of-fame': [
      "#p{background:linear-gradient(170deg,rgba(6,60,32,.88),rgba(90,4,20,.88)) padding-box," + CANE + " border-box;border:5px solid transparent;box-shadow:0 0 22px rgba(255,213,74,.4)}",
      "h1{font:700 44px 'Mountains of Christmas',serif;color:" + GOLD + ";text-shadow:0 0 10px #c8102e,0 3px 3px #000}",
      ".sub{color:#fff;text-shadow:0 0 8px #9fe0ff}.tonight{border-color:" + GOLD + ";box-shadow:0 0 12px rgba(255,213,74,.6)}.tonight .lbl{color:" + GOLD + "}",
      ".row{border-bottom-color:rgba(255,255,255,.22)}.rk{color:#ff8a95;text-shadow:0 0 8px #c8102e}.av{border-color:#fff;box-shadow:0 0 8px #9fe0ff}",
      ".nm{text-shadow:0 0 6px #c8102e}.tt small,.ft,.empty{color:#bfe6ff}",
      "#p .xholly{top:-22px;left:-18px}"
    ]
  };
  // which decorations each page gets (overlay is the always-on full-screen layer, so it carries the snow + lights;
  // nowplaying sits on top of it, so it only gets its card restyle and no second snowfall)
  var DECO = {
    overlay: { snow: 46, lights: 1 }, nowplaying: {}, 'gifter-hall-of-fame': {},
    'song-vote': { snow: 40 }, wheels: { snow: 40, lights: 1 }, 'gift-jar': { snow: 30, lights: 1 },
    'marble-run': { snow: 36, lights: 1, frame: 1 }, 'marble-race': { snow: 36, lights: 1, frame: 1 },
    'pod-race': { snow: 36, lights: 1, frame: 1 }, 'duck-race': { snow: 36, lights: 1, frame: 1 },
    'camel-race': { snow: 36, lights: 1, frame: 1 }, 'camel-race-2d': { snow: 36, lights: 1, frame: 1 }
  }[page] || { snow: 36, lights: 1 };
  if (q.get('xmasSnow') === '0') DECO.snow = 0; else if (q.get('xmasN')) DECO.snow = Math.max(0, Math.min(120, +q.get('xmasN') || 0));
  if (q.get('xmasLights') === '0') DECO.lights = 0;

  function holly(el) { if (!el || el.querySelector(':scope > .xholly')) return; var h = document.createElement('div'); h.className = 'xholly'; el.appendChild(h); }
  function hatBob(html) { return html.replace(/🤖/g, '<span class="xbob">🤖</span>'); }

  function snow(n) {
    var c = document.createElement('canvas'); c.id = 'xsnow'; document.body.appendChild(c);
    var x = c.getContext('2d'), W, H, dpr = Math.min(1.5, window.devicePixelRatio || 1);
    function size() { W = innerWidth; H = innerHeight; c.width = W * dpr; c.height = H * dpr; x.setTransform(dpr, 0, 0, dpr, 0, 0); }
    size(); addEventListener('resize', size);
    var spr = document.createElement('canvas'); spr.width = spr.height = 32; var s = spr.getContext('2d');
    var g = s.createRadialGradient(16, 16, 0, 16, 16, 16); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.45, 'rgba(240,248,255,.85)'); g.addColorStop(1, 'rgba(220,240,255,0)');
    s.fillStyle = g; s.fillRect(0, 0, 32, 32);
    var F = []; for (var i = 0; i < n; i++) F.push({ x: Math.random(), y: Math.random(), r: 3 + Math.random() * 7, v: .35 + Math.random() * .8, w: Math.random() * 6, a: .55 + Math.random() * .45 });
    var last = 0;
    function tick(ms) {
      requestAnimationFrame(tick);
      if (ms - last < 33) return; var dt = Math.min(3, (ms - last) / 16.7); last = ms;   // ~30fps cap
      x.clearRect(0, 0, W, H);
      for (var i = 0; i < F.length; i++) {
        var f = F[i]; f.y += f.v * dt * 1.6 / H; f.w += .02 * dt;
        if (f.y > 1.03) { f.y = -.03; f.x = Math.random(); }
        x.globalAlpha = f.a; x.drawImage(spr, f.x * W + Math.sin(f.w) * 14 - f.r, f.y * H - f.r, f.r * 2, f.r * 2);
      }
    }
    requestAnimationFrame(tick);
  }

  function lights() {
    var box = document.createElement('div'); box.id = 'xlights';
    var n = Math.max(12, Math.min(30, Math.round(innerWidth / 64))), sag = 16, W = 1000;
    var d = ''; for (var i = 0; i <= 80; i++) { var u = i / 80; d += (i ? 'L' : 'M') + (u * W).toFixed(1) + ' ' + (6 + Math.abs(Math.sin(u * Math.PI * (n / 4))) * sag).toFixed(1); }
    box.innerHTML = '<svg viewBox="0 0 1000 64" preserveAspectRatio="none"><path d="' + d + '" stroke="#16331f" stroke-width="2.5" fill="none"/></svg>';
    var COLS = ['#ff3b4f', '#ffd54a', '#3ee07a', '#5fc4ff', '#ff9a3c'];
    for (var k = 0; k < n; k++) {
      var u = (k + .5) / n, y = 6 + Math.abs(Math.sin(u * Math.PI * (n / 4))) * sag, b = document.createElement('i'), col = COLS[k % COLS.length];
      b.style.cssText = 'left:' + (u * 100) + '%;top:' + (y * 64 / 64 + 4) + 'px;background:' + col + ';box-shadow:0 0 10px 3px ' + col + ';animation-delay:' + (-(k * 0.37) % 2.4).toFixed(2) + 's';
      box.appendChild(b);
    }
    document.body.appendChild(box);
  }

  function overlayCards() {
    var stage = document.getElementById('stage'); if (!stage) return;
    var keep = q.get('xmasWelcome') === 'keep';
    var HD = { 'Ta very much!': '🎄 Ta very much! Ho ho ho!', 'Cor blimey!': '🎅 Cor blimey!', 'Big gift alert!': '🎁 Big Christmas gift!', 'HUGE gift alert!': '🌟 HUGE Christmas gift!' };
    function fix(el) {
      if (!el.classList || !el.classList.contains('card') || el.__x) return; el.__x = 1;
      if (el.classList.contains('welcome')) {
        var ic = el.querySelector('.icon'); if (ic) ic.innerHTML = '<span class="xbob">🤖</span>';
        var u = el.querySelector('.txt .u'), t = el.querySelector('.txt');
        if (!keep && u && t) t.innerHTML = 'Merry Christmas, <span class="u">' + u.textContent.replace(/[<>&]/g, '') + '</span>! Ho ho ho! 🎄';
      } else if (el.classList.contains('reply')) {
        var hd = el.querySelector('.hd'); if (hd) hd.innerHTML = hatBob(hd.innerHTML);
      } else if (el.classList.contains('fact')) {
        var lb = el.querySelector('.lbl'); if (lb && lb.textContent.indexOf('🎄') < 0) lb.textContent = '🎄 ' + lb.textContent;
      } else if (el.classList.contains('gift')) {
        var g = el.querySelector('.hd'); if (g && HD[g.textContent]) g.textContent = HD[g.textContent];
        var gi = el.querySelector('.icon'); if (gi && el.classList.contains('huge')) gi.textContent = '🎄';
      }
      holly(el);
    }
    Array.prototype.forEach.call(stage.children, fix);
    new MutationObserver(function (ms) { ms.forEach(function (m) { Array.prototype.forEach.call(m.addedNodes, fix); }); }).observe(stage, { childList: true });
    var mini = document.querySelector('#showtitle .wrap'); if (mini) holly(mini);
  }

  function start() {
    var st = document.createElement('style'); st.id = 'xmas-skin-css'; st.textContent = css.concat(P[page] || []).join('\n'); document.head.appendChild(st);
    document.documentElement.classList.add('xmas');
    if (DECO.snow) snow(DECO.snow);
    if (DECO.lights) lights();
    if (DECO.frame) { var f = document.createElement('div'); f.id = 'xframe'; document.body.appendChild(f);
      ['left:6px;bottom:6px', 'right:6px;bottom:6px;transform:scaleX(-1)'].forEach(function (p) { var h = document.createElement('div'); h.className = 'xholly'; h.style.cssText = 'position:fixed;z-index:2147482985;width:96px;height:64px;' + p; document.body.appendChild(h); }); }
    if (page === 'overlay') overlayCards();
    if (page === 'nowplaying') { var tryNp = function () { var b = document.querySelector('#np .box'); if (b) holly(b); else setTimeout(tryNp, 500); }; tryNp(); }
    if (page === 'song-vote') holly(document.getElementById('panel'));
    if (page === 'gifter-hall-of-fame') holly(document.getElementById('p'));
  }
  document.body ? start() : addEventListener('DOMContentLoaded', start);
})();
