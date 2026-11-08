/* Oasis Radio Duck Race – pure logic (no DOM): deterministic race sim, game-picker visibility, result reporter.
   Shared by duck-race.html and the Node tests in tests/duck-race.test.js. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.DuckCore = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const GAME_ID = 'duck';
  const D = 6000;            // river length (world units) from start line to finish line
  const DT = 1 / 60;
  const MAX_FINISH_S = 70;   // every duck is guaranteed across well inside the server's 95 s race timeout
  const EVT = { gust: { d: 1.5, v: 1.7 }, eddy: { d: 1.4, v: .35 }, spin: { d: 1.1, v: .5 }, snag: { d: 1.8, v: .15 }, ripple: { d: 1.2, v: 1.3 } };
  const EVW = [['gust', .28], ['eddy', .2], ['spin', .2], ['snag', .14], ['ripple', .18]];
  const ease = t => t * t * (3 - 2 * t);

  function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

  // Same inputs (entry list order + server seed) => same race on every overlay client.
  function simulate(list, seed) {
    const rng = mulberry((seed >>> 0) || 1);
    const ds = list.map((m, i) => ({ id: String(m.id), name: m.name, idx: i, base: 112 * (1 + (rng() - .5) * .06), w1: .5 + rng() * .6, w2: 1.2 + rng() * 1.1,
      p1: rng() * 6.28, p2: rng() * 6.28, next: 2 + rng() * 5, events: [], y: 0, v: 0, cross: null, ys: [0] }));
    let t = 0, leaderY = 0;
    for (let step = 0; step < 60 * 120; step++) {
      for (const c of ds) {
        if (t >= c.next) { let r = rng(), type = 'gust'; for (const [k, w] of EVW) { if (r < w) { type = k; break; } r -= w; } c.events.push({ type, t0: t, d: EVT[type].d }); c.next = t + EVT[type].d + 3.5 + rng() * 6; }
        const e = c.events[c.events.length - 1], inE = e && t < e.t0 + e.d;
        let target = c.base * (1 + .1 * Math.sin(t * c.w1 + c.p1) + .06 * Math.sin(t * c.w2 + c.p2));
        target *= 1 + .3 * Math.min(1, Math.max(0, leaderY - c.y) / 1200);          // current helps stragglers catch up
        if (inE) target *= EVT[e.type].v;
        if (c.cross !== null) target *= .45;                                         // drift gently after the line
        target *= Math.min(1, ease(Math.min(1, t / 1.5)) + .05);
        // safety current: a duck that would finish after MAX_FINISH_S is pushed just enough to make it
        if (c.cross === null && t > 20) { const need = (D - c.y) / Math.max(1, MAX_FINISH_S - 2 - t); if (target < need) target = need; }
        c.v += (target - c.v) * Math.min(1, DT * 4);
        const py = c.y; c.y += c.v * DT;
        if (c.cross === null && c.y >= D) c.cross = t + DT * (D - py) / Math.max(1e-6, c.y - py);
        c.ys.push(c.y);
      }
      t += DT; leaderY = 0; for (const c of ds) if (c.y > leaderY) leaderY = c.y;
      if (ds.every(c => c.cross !== null) && t > ds.reduce((a, c) => Math.max(a, c.cross), 0) + 6) break;
    }
    const order = ds.slice().sort((a, b) => (a.cross ?? 1e9) - (b.cross ?? 1e9) || b.y - a.y || a.idx - b.idx);
    order.forEach((c, i) => { c.place = i + 1; });
    const crosses = order.map(c => c.cross ?? Infinity);
    return { ds, order, ids: order.map(c => c.id), firstCross: crosses[0], lastCross: crosses[crosses.length - 1], duration: t };
  }
  function yAt(c, t) { const f = t / DT, i = Math.floor(f); if (i < 0) return 0; const n = c.ys.length; if (i >= n - 1) return c.ys[n - 1]; return c.ys[i] + (c.ys[i + 1] - c.ys[i]) * (f - i); }
  function eventAt(c, t) { for (let i = c.events.length - 1; i >= 0; i--) { const e = c.events[i]; if (t >= e.t0 && t < e.t0 + e.d) return [e, (t - e.t0) / e.d]; if (t >= e.t0 + e.d) break; } return null; }

  // Overlay is only visible/active when the shared race-game picker selects the duck race (or in demo mode).
  function isActive(st, demo) { return !!demo || ((st && st.game) || 'camel') === GAME_ID; }

  // Reports the finishing order ONCE per raceId. Retries on network/5xx failure with backoff;
  // stops on success (200) or a definite rejection (4xx, e.g. 409 when another overlay already reported).
  function createReporter({ post, sleep = ms => new Promise(r => setTimeout(r, ms)), maxTries = 6, log = () => {} }) {
    const done = new Set();
    return async function report(raceId, order) {
      if (!raceId || !Array.isArray(order) || !order.length || done.has(raceId)) return { skipped: true };
      done.add(raceId);
      for (let i = 0; i < maxTries; i++) {
        try {
          const r = await post({ raceId, order });
          if (r && r.status >= 200 && r.status < 300) return { ok: true, tries: i + 1, body: r.body };
          if (r && r.status >= 400 && r.status < 500) { log('rejected', r.status); return { ok: false, status: r.status, tries: i + 1, body: r.body }; }
        } catch (e) { log('error', String(e && e.message || e)); }
        await sleep(Math.min(8000, 1000 * 2 ** i));
      }
      return { ok: false, gaveUp: true, tries: maxTries };
    };
  }
  return { GAME_ID, D, DT, MAX_FINISH_S, mulberry, simulate, yAt, eventAt, isActive, createReporter };
});
