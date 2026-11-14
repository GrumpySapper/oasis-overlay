/* Oasis Radio Christmas skin (Nov 2026). Loaded by xmas-theme.js only when the page URL has ?theme=christmas
   (or when xmas-theme.js's XMAS_DEFAULT is flipped to 'christmas'). It only ADDS a stylesheet + light decorations;
   it never touches the page's data, race entries, jar, votes or hall of fame.
   Light on GPU: one small snow canvas at 30fps with no shadowBlur, CSS-opacity twinkle lights, static SVG holly.
   Per-link tweaks: &xmasSnow=0  &xmasLights=0  &xmasN=40 (flake count)  &xmasWelcome=keep (keep Bob's own welcome text). */
(function () {
  if (window.__oasisXmasSkin) return; window.__oasisXmasSkin = 1;
  var q = new URLSearchParams(location.search);
  var me = document.currentScript, BASE = (me && me.src) ? me.src.replace(/christmas-skin\.js.*$/, '') : '';
  function X(n) { return BASE + 'xmas/' + n + '.svg?v=2'; }
  var page = (location.pathname.split('/').pop() || 'overlay.html').replace(/\.html?$/, '') || 'overlay';
  var RED = '#c8102e', GREEN = '#0b6b3a', GOLD = '#ffd54a';
  var HOLLY = "data:image/svg+xml," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 80"><path d="M60 46C45 20 22 12 4 18c8 6 6 14 0 18 10 2 12 10 8 16 14-6 30-4 48-6z" fill="#0f7a3d" stroke="#064022" stroke-width="2"/><path d="M60 46c15-26 38-34 56-28-8 6-6 14 0 18-10 2-12 10-8 16-14-6-30-4-48-6z" fill="#13904a" stroke="#064022" stroke-width="2"/><path d="M60 46C46 33 22 26 8 28M60 46c14-13 38-20 52-18" stroke="#064022" stroke-width="1.5" fill="none"/><circle cx="52" cy="50" r="9" fill="#d10f2f"/><circle cx="68" cy="50" r="9" fill="#e0182f"/><circle cx="60" cy="38" r="9" fill="#c20a26"/><circle cx="49" cy="47" r="2.5" fill="#fff" opacity=".7"/><circle cx="65" cy="47" r="2.5" fill="#fff" opacity=".7"/><circle cx="57" cy="35" r="2.5" fill="#fff" opacity=".7"/></svg>');
  var HAT = "data:image/svg+xml," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 80"><path d="M12 62C20 30 44 8 70 10c14 1 22 12 20 26-6-8-14-10-20-6-6 6-4 20-2 32z" fill="#d10f2f"/><path d="M20 50c12-22 30-34 48-36" stroke="#8b0016" stroke-width="4" fill="none" opacity=".45"/><rect x="4" y="56" width="74" height="18" rx="9" fill="#fff"/><circle cx="90" cy="40" r="10" fill="#fff"/></svg>');
  var CANE = 'repeating-linear-gradient(135deg,#fff 0 9px,' + RED + ' 9px 18px)';

  var css = [
    "@import url('https://fonts.googleapis.com/css2?family=Mountains+of+Christmas:wght@700&display=swap');",
    ".xholly{position:absolute;width:70px;height:47px;background:url(\"" + HOLLY + "\") no-repeat center/contain;pointer-events:none;z-index:3}",
    "#title .xbob,#banner .xbob{-webkit-text-fill-color:#fff;color:#fff;background:none;filter:none}",
    ".xbob{position:relative;display:inline-block}.xbob::before{content:'';position:absolute;left:-12%;top:-52%;width:95%;height:78%;background:url(\"" + HAT + "\") no-repeat center/contain;transform:rotate(-16deg);pointer-events:none}",
    "#xlights{position:fixed;left:0;right:0;top:0;height:64px;pointer-events:none;z-index:2147482990}",
    "#xlights svg{position:absolute;inset:0;width:100%;height:100%}",
    "#xlights i{position:absolute;width:11px;height:17px;margin-left:-5.5px;border-radius:50% 50% 45% 45%;animation:xtw 2.4s ease-in-out infinite}",
    "#xlights i::before{content:'';position:absolute;left:2px;top:-5px;width:7px;height:6px;background:#3d4a3f;border-radius:2px}",
    "@keyframes xtw{0%,100%{opacity:1}50%{opacity:.25}}",
    "#xframe{position:fixed;inset:0;pointer-events:none;z-index:2147482980;border:var(--fw,9px) solid transparent;border-image:" + CANE + " 9}",
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
    overlay: { snow: 24, lights: 1, frame: 1, drift: 1, snowman: 1 }, nowplaying: {}, 'gifter-hall-of-fame': {},
    'song-vote': { snow: 16 }, wheels: { snow: 20, lights: 1, drift: 1 }, 'gift-jar': { snow: 14, lights: 1 },
    'marble-run': { snow: 16, lights: 1, frame: 1 }, 'marble-race': { snow: 16, lights: 1, frame: 1 },
    'pod-race': { snow: 16, lights: 1, frame: 1 }, 'duck-race': { snow: 16, lights: 1, frame: 1 },
    'camel-race': { snow: 16, lights: 1, frame: 1 }, 'camel-race-2d': { snow: 16, lights: 1, frame: 1 }
  }[page] || (/^(bob-|donate)/.test(page) ? {} : { snow: 16, lights: 1 });
  if (q.get('xmasFrame') === '0') DECO.frame = 0;
  if (q.get('xmasSnowman') === '0') DECO.snowman = 0;
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
    var F = []; for (var i = 0; i < n; i++) F.push({ x: Math.random(), y: Math.random(), r: 1.6 + Math.random() * 3.2, v: .12 + Math.random() * .3, w: Math.random() * 6, a: .28 + Math.random() * .4 });
    var last = 0;
    function tick(ms) {
      requestAnimationFrame(tick);
      if (ms - last < 41) return; var dt = Math.min(3, (ms - last) / 16.7); last = ms;   // ~24fps cap
      x.clearRect(0, 0, W, H);
      for (var i = 0; i < F.length; i++) {
        var f = F[i]; f.y += f.v * dt * 1.6 / H; f.w += .012 * dt;
        if (f.y > 1.03) { f.y = -.03; f.x = Math.random(); }
        x.globalAlpha = f.a; x.drawImage(spr, f.x * W + Math.sin(f.w) * 9 - f.r, f.y * H - f.r, f.r * 2, f.r * 2);
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


  // ---------- v2: edge decorations (static SVGs, only the snowman arm + bauble sway animate) ----------
  css.push(
    ".xd{position:fixed;pointer-events:none;background:no-repeat center/contain;z-index:2147482975}",
    ".xd.cane{width:var(--w,46px);height:calc(var(--w,46px)*2.67)}",
    ".xd.baub{width:var(--w,34px);height:calc(var(--w,34px)*1.27);transform-origin:50% -60px;animation:xsway 5s ease-in-out infinite}",
    ".xd.baub::before{content:'';position:absolute;left:50%;bottom:92%;width:1.5px;height:var(--s,40px);background:#3d4a3f;opacity:.8}",
    "@keyframes xsway{0%,100%{transform:rotate(-4deg)}50%{transform:rotate(4deg)}}",
    ".xd.star{animation:xstar 3s ease-in-out infinite}@keyframes xstar{0%,100%{opacity:.55}50%{opacity:1}}",
    "#xdrift{position:fixed;left:0;right:0;bottom:0;height:var(--dh,3.4vh);pointer-events:none;z-index:2147482972}",
    "#xsnowman{position:fixed;right:1.2vw;bottom:.6vh;height:22vh;aspect-ratio:220/270;pointer-events:none;z-index:2147482976;background:url(\"" + X('snowman') + "\") no-repeat center/contain;animation:xsmbob 3.2s ease-in-out infinite;transform-origin:50% 100%}",
    "@keyframes xsmbob{0%,100%{transform:translateY(0) rotate(0)}25%{transform:translateY(-1.2%) rotate(-1.5deg)}75%{transform:translateY(-.6%) rotate(1.5deg)}}",
    ".xcandy{height:5px;border-radius:3px;background:repeating-linear-gradient(135deg,#fff 0 7px," + RED + " 7px 14px)}"
  );
  function D(file, cls, st) { var e = document.createElement('div'); e.className = 'xd ' + (cls || ''); e.style.cssText = 'background-image:url("' + X(file) + '");' + (st || ''); document.body.appendChild(e); return e; }
  function edgeSet(kind) {
    var big = kind === 'wide';   // 1920x1080 layers vs 720x1280 portrait layers
    var cw = big ? 'min(2.6vw,4.4vh)' : '6.2vw';
    // crossed candy canes in the top corners, under the lights
    D('candy-cane', 'cane', '--w:' + cw + ';left:1.2%;top:' + (big ? '5vh' : '4.6vh') + ';transform:rotate(-14deg)');
    D('candy-cane', 'cane', '--w:' + cw + ';left:3.4%;top:' + (big ? '5.4vh' : '5vh') + ';transform:scaleX(-1) rotate(-14deg)');
    D('candy-cane', 'cane', '--w:' + cw + ';right:1.2%;top:' + (big ? '5vh' : '4.6vh') + ';transform:scaleX(-1) rotate(-14deg)');
    D('candy-cane', 'cane', '--w:' + cw + ';right:3.4%;top:' + (big ? '5.4vh' : '5vh') + ';transform:rotate(-14deg)');
    D('holly', '', 'width:' + (big ? '5.4vw' : '15vw') + ';aspect-ratio:3/2;left:.6%;top:' + (big ? '4.2vh' : '3.8vh'));
    D('holly', '', 'width:' + (big ? '5.4vw' : '15vw') + ';aspect-ratio:3/2;right:.6%;top:' + (big ? '4.2vh' : '3.8vh') + ';transform:scaleX(-1)');
    // baubles hanging off the light string
    var B = big ? [['red', 8, 34], ['gold', 13, 18], ['green', 87, 18], ['red', 92, 34]] : [['red', 14, 26], ['gold', 86, 26]];
    B.forEach(function (b, i) { D('bauble-' + b[0], 'baub', '--w:' + (big ? '1.7vw' : '5vw') + ';--s:' + b[2] + 'px;left:' + b[1] + '%;top:' + (b[2] + (big ? 22 : 20)) + 'px;animation-delay:' + (-i * 1.3) + 's'); });
    // twinkly stars
    (big ? [[18, 9], [82, 9], [6, 30], [94, 30]] : [[22, 7], [78, 7]]).forEach(function (p, i) { D('star', 'star', 'width:' + (big ? '1.4vw' : '4vw') + ';aspect-ratio:1;left:' + p[0] + '%;top:' + p[1] + 'vh;animation-delay:' + (-i * .8) + 's'); });
  }
  function bottomSet(kind) {
    var big = kind === 'wide';
    if (big) {   // left edge, above where Now Playing sits; bottom-right belongs to the snowman
      D('candy-cane', 'cane', '--w:min(2.4vw,4.2vh);left:.8vw;bottom:15vh;transform:rotate(8deg)');
      D('gingerbread', '', 'width:3.2vw;aspect-ratio:.8;left:2.6vw;bottom:15.4vh;transform:rotate(-6deg)');
      D('present', '', 'width:3vw;aspect-ratio:1;right:' + (DECO.snowman ? '11.6vw' : '1.4vw') + ';bottom:1.2vh');
      D('present-green', '', 'width:2.3vw;aspect-ratio:1;right:' + (DECO.snowman ? '14.4vw' : '4.2vw') + ';bottom:1.2vh;transform:rotate(-4deg)');
      if (!DECO.snowman) D('candy-cane', 'cane', '--w:min(2.4vw,4.2vh);right:.8vw;bottom:15vh;transform:scaleX(-1) rotate(8deg)');
    } else {
      D('candy-cane', 'cane', '--w:6vw;left:2.2%;bottom:1.6%;transform:rotate(6deg)');
      D('candy-cane', 'cane', '--w:6vw;right:2.2%;bottom:1.6%;transform:scaleX(-1) rotate(6deg)');
      D('present', '', 'width:9vw;aspect-ratio:1;left:9%;bottom:1.2%');
      D('gingerbread', '', 'width:8vw;aspect-ratio:.8;right:9%;bottom:1.2%');
    }
  }
  function drift(h) {
    var d = document.createElement('div'); d.id = 'xdrift'; if (h) d.style.setProperty('--dh', h);
    d.innerHTML = '<svg viewBox="0 0 1000 40" preserveAspectRatio="none" width="100%" height="100%"><defs><linearGradient id="xdg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#cfe3f3"/></linearGradient></defs>' +
      '<path d="M0 22 C60 10 110 26 170 18 S290 6 350 16 470 28 540 17 660 6 720 15 840 27 900 16 970 10 1000 14 V40 H0Z" fill="url(#xdg)" opacity=".92"/>' +
      '<path d="M0 30 C80 22 150 34 230 27 S380 20 460 29 600 36 680 28 830 20 1000 26 V40 H0Z" fill="#e9f3fb" opacity=".9"/></svg>';
    document.body.appendChild(d);
  }

  // ---------- v2: Santa hat on every Bob ----------
  // Pre-baked Santa-hat copies of every Bob image/video (hat tracked to his head frame by frame).
  // The four bike assets got 25% transparent headroom on top so the hat isn't cut off; their pages get 25% taller boxes to match.
  var BOBRX = /^(.*?)(images\/donate\/bob-(?:still|walk|walkleft|wave|pull)|images\/bob-ride-right|images\/bob-ride|images\/bob-daredevil|videos\/bob-(?:raver|glamrock)-loop)\.(webm|webp|png)(\?.*)?$/;
  function hatSrc(el) {
    var a = el.getAttribute && el.getAttribute('src'); if (!a || a.indexOf('-xmas.') >= 0) return;
    var m = a.match(BOBRX); if (!m) return;
    var v = m[1] + m[2] + '-xmas.' + m[3] + (m[4] || '');
    var wasPlaying = el.tagName === 'VIDEO' && !el.paused;
    el.setAttribute('src', v);
    if (el.tagName === 'VIDEO' && (wasPlaying || el.autoplay)) { try { el.load(); var pr = el.play(); if (pr && pr.catch) pr.catch(function () {}); } catch (e) {} }
  }
  function hatAll(root) { (root.querySelectorAll ? root.querySelectorAll('img,video,source') : []).forEach(hatSrc); if (root.tagName) hatSrc(root); }
  function hatWatch() {
    hatAll(document);
    new MutationObserver(function (ms) { ms.forEach(function (m) {
      if (m.type === 'attributes') hatSrc(m.target); else Array.prototype.forEach.call(m.addedNodes, function (n) { if (n.nodeType === 1) hatAll(n); });
    }); }).observe(document.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: ['src'] });
    // 🤖 emoji in plain page text (e.g. the wheels title) gets a hat too
    ['title', 'banner'].forEach(function (id) { var e = document.getElementById(id); if (e && e.innerHTML.indexOf('🤖') >= 0 && e.innerHTML.indexOf('xbob') < 0) e.innerHTML = hatBob(e.innerHTML); });
  }
  P['bob-ride'] = ["#ride{height:calc(var(--h)*1.25)}"];
  P['bob-ride-still'] = [".rider{height:calc(var(--h)*1.25)}"];

  function C(parent, file, st) { if (!parent) return; var e = document.createElement('div'); e.className = 'xc'; e.style.cssText = 'position:absolute;pointer-events:none;background:url("' + X(file) + '") no-repeat center/contain;z-index:6;' + st; parent.appendChild(e); return e; }
  P.overlay.push(".reply .hd,.gift .hd{padding-bottom:5px;margin-bottom:6px;background:repeating-linear-gradient(135deg,#fff 0 7px,#c8102e 7px 14px) bottom/100% 3px no-repeat}",
    ".gift.heartme .hd{display:none}");
  P['song-vote'].push("#head::after{content:'';display:block;height:7px;margin:14px 70px 0;border-radius:4px;background:repeating-linear-gradient(135deg,#fff 0 7px,#c8102e 7px 14px);box-shadow:0 0 10px rgba(255,255,255,.35)}",
    "#feedHead{border-top:5px solid transparent;border-image:repeating-linear-gradient(135deg,#fff 0 7px,#c8102e 7px 14px) 5;padding-top:6px}");
  P['gifter-hall-of-fame'].push(".sub::after{content:'';display:block;height:5px;margin:8px 30px 0;border-radius:3px;background:repeating-linear-gradient(135deg,#fff 0 7px,#c8102e 7px 14px)}",
    ".row{border-bottom:none;background:repeating-linear-gradient(135deg,#fff 0 7px,#c8102e 7px 14px) bottom/100% 2px no-repeat;background-blend-mode:normal}.row:last-child{background:none}");
  P.nowplaying.push("#np .box{border-left:none;overflow:visible}#np .box::before{content:'';position:absolute;left:0;top:0;bottom:0;width:9px;border-radius:16px 0 0 16px;background:repeating-linear-gradient(160deg,#fff 0 7px,#c8102e 7px 14px)}");
  function panelDeco() {
    if (page === 'song-vote') { var pn = document.getElementById('panel');
      C(pn, 'candy-cane', 'width:34px;height:91px;left:-12px;top:60px;transform:rotate(-10deg)');
      C(pn, 'candy-cane', 'width:34px;height:91px;right:-12px;top:60px;transform:scaleX(-1) rotate(-10deg)');
      C(pn, 'bauble-red', 'width:30px;height:38px;left:54px;top:-2px');
      C(pn, 'bauble-gold', 'width:30px;height:38px;right:54px;top:-2px');
      C(pn, 'present', 'width:54px;height:54px;left:-10px;bottom:-14px;transform:rotate(-6deg)');
      C(pn, 'gingerbread', 'width:50px;height:62px;right:-8px;bottom:-14px;transform:rotate(6deg)');
      C(pn, 'star', 'width:30px;height:30px;left:50%;margin-left:-15px;top:-17px'); }
    if (page === 'gifter-hall-of-fame') { var hp = document.getElementById('p');
      C(hp, 'candy-cane', 'width:26px;height:70px;right:-10px;top:-18px;transform:scaleX(-1) rotate(-12deg)');
      C(hp, 'bauble-gold', 'width:26px;height:33px;right:28px;top:-10px');
      C(hp, 'star', 'width:30px;height:30px;left:50%;margin-left:-15px;top:-17px');
      C(hp, 'present', 'width:44px;height:44px;right:-12px;bottom:-12px;transform:rotate(6deg)'); }
    if (page === 'nowplaying') { var tryNp2 = function () { var b = document.querySelector('#np .box'); if (!b) return setTimeout(tryNp2, 500);
      C(b, 'candy-cane', 'width:18px;height:48px;right:-8px;bottom:-6px;transform:rotate(12deg)');
      C(b, 'bauble-red', 'width:20px;height:25px;right:30px;top:-12px'); }; tryNp2(); }
  }
  function start() {
    var st = document.createElement('style'); st.id = 'xmas-skin-css'; st.textContent = css.concat(P[page] || []).join('\n'); document.head.appendChild(st);
    document.documentElement.classList.add('xmas');
    if (DECO.snow) snow(DECO.snow);
    if (DECO.lights) lights();
    if (DECO.frame) { var f = document.createElement('div'); f.id = 'xframe'; if (page === 'overlay') f.style.setProperty('--fw', '6px'); document.body.appendChild(f); }
    if (page === 'overlay') overlayCards();
    hatWatch(); panelDeco();
    if (DECO.lights) { if (page === 'overlay' || page === 'wheels') { edgeSet('wide'); } else if (DECO.frame || page === 'gift-jar') { edgeSet('tall'); } }
    if (page === 'overlay' || page === 'wheels') bottomSet('wide'); else if (DECO.frame || page === 'gift-jar') bottomSet('tall');
    if (DECO.drift) drift(page === 'wheels' ? '4.5vh' : null);
    if (DECO.snowman) { var sm = document.createElement('div'); sm.id = 'xsnowman'; document.body.appendChild(sm); }
    if (page === 'nowplaying') { var tryNp = function () { var b = document.querySelector('#np .box'); if (b) holly(b); else setTimeout(tryNp, 500); }; tryNp(); }
    if (page === 'song-vote') holly(document.getElementById('panel'));
    if (page === 'gifter-hall-of-fame') holly(document.getElementById('p'));
  }
  document.body ? start() : addEventListener('DOMContentLoaded', start);
})();
