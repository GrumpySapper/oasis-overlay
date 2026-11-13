// Snowy 80s neon Christmas layer. Does NOTHING unless the page URL has theme=xmas
// (or this script is loaded with data-force="1", as xmas-snow.html does).
(function () {
  var s = document.currentScript;
  // ONE-STEP CHRISTMAS SWITCH: change 'off' to 'christmas' and every overlay link turns Christmas with no URL changes.
  // Any link can still opt out with ?theme=off (or keep the old neon snow with ?theme=xmas).
  var XMAS_DEFAULT = 'off';
  var th = new URLSearchParams(location.search).get('theme') || XMAS_DEFAULT;
  if (th === 'christmas' && !(s && s.dataset.force === '1')) {
    var k = document.createElement('script'); k.src = (s && s.src ? s.src.replace(/xmas-theme\.js.*$/, '') : '') + 'christmas-skin.js?v=1';
    (document.head || document.documentElement).appendChild(k); return;
  }
  var on = th === 'xmas' || (s && s.dataset.force === '1');
  if (!on) return;
  function start() {
    var c = document.createElement('canvas');
    c.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;z-index:2147483000';
    document.body.appendChild(c);
    var x = c.getContext('2d'), W, H, dpr = Math.min(2, window.devicePixelRatio || 1);
    function size() { W = innerWidth; H = innerHeight; c.width = W * dpr; c.height = H * dpr; x.setTransform(dpr, 0, 0, dpr, 0, 0); }
    size(); addEventListener('resize', size);
    var N = Math.round(Math.min(160, 60 + innerWidth * innerHeight / 9000));
    var F = []; for (var i = 0; i < N; i++) F.push({ x: Math.random(), y: Math.random(), r: .8 + Math.random() * 2.6, v: .25 + Math.random() * .9, w: Math.random() * 6 });
    var COLS = ['#ff2bd6', '#00f0ff', '#ffe600', '#39ff14', '#ff8a00'];
    function garland(t) {
      var n = Math.max(10, Math.round(W / 46)), sag = Math.min(34, H * .03);
      x.strokeStyle = 'rgba(20,60,30,.9)'; x.lineWidth = 2.5; x.beginPath();
      for (var i = 0; i <= 60; i++) { var u = i / 60, px = u * W, py = 8 + Math.abs(Math.sin(u * Math.PI * 4)) * sag; i ? x.lineTo(px, py) : x.moveTo(px, py); } x.stroke();
      for (var k = 0; k < n; k++) {
        var u = (k + .5) / n, px = u * W, py = 12 + Math.abs(Math.sin(u * Math.PI * 4)) * sag;
        var col = COLS[k % 5], blink = .55 + .45 * Math.sin(t * 3 + k * 1.7);
        x.shadowColor = col; x.shadowBlur = 16 * blink; x.fillStyle = col; x.globalAlpha = .5 + .5 * blink;
        x.beginPath(); x.ellipse(px, py + 6, 5, 8, 0, 0, 7); x.fill();
      }
      x.globalAlpha = 1; x.shadowBlur = 0;
    }
    function tick(ms) {
      var t = ms / 1000; x.clearRect(0, 0, W, H);
      x.fillStyle = '#fff'; x.shadowColor = '#bfe9ff';
      for (var i = 0; i < F.length; i++) { var f = F[i]; f.y += f.v / H * 2.2; f.w += .015; if (f.y > 1.02) { f.y = -.02; f.x = Math.random(); }
        x.globalAlpha = .85; x.shadowBlur = 6; x.beginPath(); x.arc(f.x * W + Math.sin(f.w) * 12, f.y * H, f.r, 0, 7); x.fill(); }
      x.globalAlpha = 1; x.shadowBlur = 0; garland(t);
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }
  document.body ? start() : addEventListener('DOMContentLoaded', start);
})();
