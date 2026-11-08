/* Oasis Radio Duck Race – pure logic (no DOM): deterministic race sim, game-picker visibility, result reporter.
   Shared by duck-race.html and the Node tests in tests/duck-race.test.js. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.DuckCore = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const GAME_ID = 'duck';
  const D = 6000;            // river length (race units) from start line to finish line
  const DT = 1 / 60;
  // The race is timed to the music: the FIRST duck crosses the line exactly RACE_S seconds after GO (3:21 = 201 s).
  const RACE_S = 201, RACE_MS = RACE_S * 1000;
  const STAGGER_S = 12;      // the rest of the field crosses within ~12 s of the winner
  const MAX_FINISH_S = RACE_S + STAGGER_S + 2;   // last duck is across by here (server duck timeout is far later)
  const SIM_MAX_S = 235;     // sim-time budget (sim time is warped by ~1-4% so the winner lands on exactly RACE_S)
  const EVT = { gust: { d: 2.2, v: 1.45 }, eddy: { d: 2.4, v: .55 }, spin: { d: 1.6, v: .6 }, snag: { d: 2.8, v: .3 }, ripple: { d: 1.8, v: 1.22 } };
  const EVW = [['gust', .28], ['eddy', .2], ['spin', .2], ['snag', .14], ['ripple', .18]];
  const ease = t => t * t * (3 - 2 * t);

  function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

  // Same inputs (entry list order + server seed) => same race on every overlay client.
  // The race is simulated in "sim time" (~200 s, natural pace) and then uniformly time-warped by k = simFirstCross / RACE_S,
  // so in real time the winner crosses at exactly RACE_S and every other duck keeps its relative gap.
  function simulate(list, seed) {
    const rng = mulberry((seed >>> 0) || 1), V0 = D / 196;
    const ds = list.map((m, i) => ({ id: String(m.id), name: m.name, idx: i, base: V0 * (1 + (rng() - .5) * .05), w1: .12 + rng() * .2, w2: .4 + rng() * .5,
      p1: rng() * 6.28, p2: rng() * 6.28, next: 3 + rng() * 6, events: [], y: 0, v: 0, cross: null, ys: [0] }));
    let t = 0, leaderY = 0, firstSim = null;
    for (let step = 0; step < SIM_MAX_S / DT; step++) {
      for (const c of ds) {
        if (t >= c.next) { let r = rng(), type = 'gust'; for (const [k, w] of EVW) { if (r < w) { type = k; break; } r -= w; } c.events.push({ type, t0: t, d: EVT[type].d }); c.next = t + EVT[type].d + 4 + rng() * 8; }
        const e = c.events[c.events.length - 1], inE = e && t < e.t0 + e.d;
        let target = c.base * (1 + .09 * Math.sin(t * c.w1 + c.p1) + .05 * Math.sin(t * c.w2 + c.p2));
        target *= 1 + .22 * Math.min(1, Math.max(0, leaderY - c.y) / 900);           // current helps stragglers stay in the pack
        if (inE) target *= EVT[e.type].v;
        if (c.cross !== null) target *= .45;                                         // drift gently after the line
        target *= Math.min(1, ease(Math.min(1, t / 2.5)) + .05);
        if (c.cross === null) {                                                      // safety current: never miss the stagger window
          const deadline = firstSim !== null ? firstSim + STAGGER_S * .97 : SIM_MAX_S - 20;
          if (firstSim !== null || t > 150) { const need = (D - c.y) / Math.max(.5, deadline - t); if (target < need) target = need; }
        }
        c.v += (target - c.v) * Math.min(1, DT * 2.5);
        const py = c.y; c.y += c.v * DT;
        if (c.cross === null && c.y >= D) { c.cross = t + DT * (D - py) / Math.max(1e-6, c.y - py); if (firstSim === null || c.cross < firstSim) firstSim = c.cross; }
        c.ys.push(c.y);
      }
      t += DT; leaderY = 0; for (const c of ds) if (c.y > leaderY) leaderY = c.y;
      if (ds.every(c => c.cross !== null) && t > ds.reduce((a, c) => Math.max(a, c.cross), 0) + 8) break;
    }
    const k = firstSim / RACE_S;                                                     // real t  ->  sim t*k
    for (const c of ds) { c.k = k; c.simCross = c.cross; c.cross = c.cross === null ? null : c.cross / k; }
    const order = ds.slice().sort((a, b) => (a.simCross ?? 1e9) - (b.simCross ?? 1e9) || b.y - a.y || a.idx - b.idx);
    order.forEach((c, i) => { c.place = i + 1; });
    order[0].cross = RACE_S;                                                         // exact by construction (avoid float dust)
    const crosses = order.map(c => c.cross ?? Infinity);
    return { ds, order, ids: order.map(c => c.id), k, firstCross: crosses[0], lastCross: crosses[crosses.length - 1], duration: t / k };
  }
  function yAt(c, t) { const f = t * (c.k || 1) / DT, i = Math.floor(f); if (i < 0) return 0; const n = c.ys.length; if (i >= n - 1) return c.ys[n - 1]; return c.ys[i] + (c.ys[i + 1] - c.ys[i]) * (f - i); }
  function eventAt(c, t) { const st = t * (c.k || 1); for (let i = c.events.length - 1; i >= 0; i--) { const e = c.events[i]; if (st >= e.t0 && st < e.t0 + e.d) return [e, (st - e.t0) / e.d]; if (st >= e.t0 + e.d) break; } return null; }
  // Race clock from the SERVER's startAt (skew-corrected): a late join / reconnect lands on the same elapsed time, never restarts.
  function elapsedS(startAtServer, serverNow) { return (serverNow - startAtServer) / 1000; }
  function clock(t) { const s = Math.max(0, Math.min(RACE_S, Math.floor(t))); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }

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
          if (r && r.status === 425) { log('too early'); await sleep(Math.max(500, Math.min(5000, (r.body && r.body.retryAfterMs) || 1500))); i = Math.max(-1, i - 1); continue; }
          if (r && r.status >= 400 && r.status < 500) { log('rejected', r.status); return { ok: false, status: r.status, tries: i + 1, body: r.body }; }
        } catch (e) { log('error', String(e && e.message || e)); }
        await sleep(Math.min(8000, 1000 * 2 ** i));
      }
      return { ok: false, gaveUp: true, tries: maxTries };
    };
  }
  return { GAME_ID, D, DT, RACE_S, RACE_MS, STAGGER_S, MAX_FINISH_S, elapsedS, clock, mulberry, simulate, yAt, eventAt, isActive, createReporter };
});
