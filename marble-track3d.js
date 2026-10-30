/* Oasis Radio marble race – TRUE 3D downhill track + Rapier physics (shared by the overlay and offline tests).
   createTrack()                        -> track geometry (samples along a turtle-built spline: pos/tangent/right/up, width, wall height, flags)
   createRace(RAPIER, { marbles, seed }) -> { marbles:[{id,name,pos,rot,s,place,finished}], start(), step(), finish(), leader(), standings(), t, done, ... }
   Fixed 60 Hz steps, seeded randomness only (grid order, tiny start nudges, respawn spread) => same seed + same entries = same race. */
(function (root) {
  const DS = 0.5;                 // sample spacing along the track (units; marble radius = 0.5)
  const TUNE = Object.assign({ ld: .1, ad: .05, g: 20 }, (typeof process !== "undefined" && process.env && process.env.MTUNE) ? JSON.parse(process.env.MTUNE) : {});
  const R = 0.5, G = TUNE.g, STEP = 1000 / 60, CAP_MS = 75000;
  function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  const D2R = Math.PI / 180;
  // ---- the course, as turtle segments: len, turn (deg, + = right), slope (deg downhill), bank (deg), w (inner width), h (wall height) ----
  const SEGS = [
    { key: 'start', len: 14, slope: 3, w: 9, h: 1.8 },
    { len: 16, slope: 9, ease: 6 },
    { key: 'curve', len: 32, turn: 95, slope: 7, bank: 18 },
    { key: 'chicane', len: 18, turn: -50, slope: 7.5, bank: 12 },
    { len: 18, turn: 50, slope: 7.5, bank: 12 },
    { key: 'jump', len: 12, slope: 13 },
    { len: 3.2, slope: -16, kick: true, ease: 2.2 },
    { len: 3.2, slope: 28, gap: true, ease: .4 },
    { len: 12, slope: 7, w: 9.5, h: 2.8, land: true, ease: 3 },
    { len: 8, slope: 8, ease: 5 },
    { key: 'helix', len: 124, turn: -540, slope: 8, bank: 27, h: 2.0 },
    { len: 6, slope: 9 },
    { key: 'drop', len: 10, slope: 33, ease: 5, h: 2.0 },
    { len: 6, slope: 7, ease: 5 },
    { key: 'split', len: 28, slope: 6, w: 10, h: 1.7, divider: true, ease: 4 },
    { len: 6, slope: 6, ease: 5 },
    { key: 'sweeper', len: 46, turn: 110, slope: 6, bank: 18 },
    { key: 'rollers', len: 30, slope: 7, wave: 9 },
    { key: 'final', len: 26, turn: -85, slope: 5.5, bank: 16 },
    { key: 'finish', len: 18, slope: 4 },
    { key: 'runoff', len: 24, slope: 1, w: 10, h: 2.2, ease: 4, runoff: true },
  ];
  let TRACK = null;
  function createTrack() {
    if (TRACK) return TRACK;
    const P = [], Tn = [], Rt = [], Up = [], W = [], H = [], F = [], S = [];   // F flags: 1 gap, 2 kick, 4 land, 8 divider, 16 runoff
    const feats = []; let x = 0, y = 0, z = 0, yaw = 0, pitch = SEGS[0].slope * D2R, w = SEGS[0].w, h = SEGS[0].h, s = 0;
    let prev = SEGS[0];
    for (let si = 0; si < SEGS.length; si++) {
      const sg = SEGS[si]; const n = Math.max(1, Math.round(sg.len / DS)); const p0 = pitch, w0 = w, h0 = h;
      const wT = sg.w || (s < 128 ? 7.4 : 6.6), hT = sg.h || 1.7;
      const ease = sg.ease || Math.min(4, sg.len * .5);
      if (sg.key) feats.push({ key: sg.key, s0: s, s1: s + sg.len, i0: P.length });
      for (let k = 0; k < n; k++) {
        const f = (k + 1) / n, d = (k + 1) * DS, e = Math.min(1, d / ease), es = e * e * (3 - 2 * e);
        let pt = p0 + (sg.slope * D2R - p0) * es; if (sg.wave) pt += Math.sin(d / sg.wave * Math.PI * 2) * 9 * D2R * Math.min(1, d / 4, (sg.len - d) / 4);
        pitch = pt; yaw += (sg.turn || 0) * D2R / n;
        w = w0 + (wT - w0) * es; h = h0 + (hT - h0) * es;
        const cp = Math.cos(pitch), sp = Math.sin(pitch), hx = Math.sin(yaw), hz = -Math.cos(yaw);
        x += hx * cp * DS; y -= sp * DS; z += hz * cp * DS; s += DS;
        const t = [hx * cp, -sp, hz * cp], rh = [Math.cos(yaw), 0, Math.sin(yaw)];
        const u0 = [rh[1] * t[2] - rh[2] * t[1], rh[2] * t[0] - rh[0] * t[2], rh[0] * t[1] - rh[1] * t[0]];
        const bt = (sg.bank || 0) * D2R * Math.sign(sg.turn || 0), bl = Math.min(10, sg.len * .35), be = Math.min(1, d / bl, (sg.len - d) / bl), b = bt * (be * be * (3 - 2 * be));
        const cb = Math.cos(b), sb = Math.sin(b);
        const r = [cb * rh[0] - sb * u0[0], cb * rh[1] - sb * u0[1], cb * rh[2] - sb * u0[2]], u = [sb * rh[0] + cb * u0[0], sb * rh[1] + cb * u0[1], sb * rh[2] + cb * u0[2]];
        // bank pivots about the INSIDE (low) edge so easing in/out never lifts the inside lip (no basins for marbles to stall in)
        const hw = w / 2 * Math.sign(b); const ox = (rh[0] - r[0]) * hw, oy = (rh[1] - r[1]) * hw, oz = (rh[2] - r[2]) * hw;
        P.push(x + ox, y + oy, z + oz); Tn.push(...t); Rt.push(...r); Up.push(...u); W.push(w); H.push(h); S.push(s);
        F.push((sg.gap ? 1 : 0) | (sg.kick ? 2 : 0) | (sg.land ? 4 : 0) | (sg.divider && d > 2.5 && d < sg.len - 1.5 ? 8 : 0) | (sg.runoff ? 16 : 0));
      }
      prev = sg;
    }
    const N = S.length; let minY = Infinity; for (let i = 0; i < N; i++) minY = Math.min(minY, P[i * 3 + 1]);
    const fi = feats.find(f => f.key === 'finish'), finishS = fi.s1, gateS = 12.5, total = S[N - 1];
    // checkpoints every ~12 units on solid track (+ one on the landing so a missed jump restarts after the gap)
    const cps = []; for (let i = 0; i < N; i++) { if (F[i] & 1) continue; if (!cps.length || S[i] - S[cps[cps.length - 1]] >= 12 || ((F[i] & 4) && !(F[i - 1] & 4))) cps.push(i); }
    TRACK = { N, DS, P: new Float32Array(P), T: new Float32Array(Tn), Rt: new Float32Array(Rt), Up: new Float32Array(Up), W: new Float32Array(W), H: new Float32Array(H), F: new Uint8Array(F), S: new Float32Array(S), feats, finishS, gateS, total, minY, cps, R };
    TRACK.profile = profile; return TRACK;
  }
  // U-channel cross-section (lateral, up) for inner width w and wall height h
  function profile(w, h) { const rf = .9, out = [[-w / 2, h]]; for (let k = 0; k <= 4; k++) { const a = Math.PI + k / 4 * Math.PI / 2; out.push([-w / 2 + rf + Math.cos(a) * rf, rf + Math.sin(a) * rf]); }
    for (let k = 0; k <= 4; k++) { const a = 1.5 * Math.PI + k / 4 * Math.PI / 2; out.push([w / 2 - rf + Math.cos(a) * rf, rf + Math.sin(a) * rf]); } out.push([w / 2, h]); return out; }
  // physics trimesh: channel + divider fins + end cap
  function trackMesh(tr) {
    const V = [], I = []; const NP = profile(6, 1).length;
    for (let i = 0; i < tr.N; i++) { const pr = profile(tr.W[i], tr.H[i]); for (const [a, b] of pr) V.push(tr.P[i * 3] + tr.Rt[i * 3] * a + tr.Up[i * 3] * b, tr.P[i * 3 + 1] + tr.Rt[i * 3 + 1] * a + tr.Up[i * 3 + 1] * b, tr.P[i * 3 + 2] + tr.Rt[i * 3 + 2] * a + tr.Up[i * 3 + 2] * b); }
    for (let i = 0; i < tr.N - 1; i++) { if ((tr.F[i] & 1) || (tr.F[i + 1] & 1)) continue; for (let k = 0; k < NP - 1; k++) { const a = i * NP + k, b = a + 1, c = a + NP, d = c + 1; I.push(a, b, c, b, d, c); } }
    const main = { V: new Float32Array(V), I: new Uint32Array(I) }; V.length = 0; I.length = 0;
    // divider fin + end cap (separate collider, two-sided)
    let base = 0;
    for (let i = 0; i < tr.N; i++) { if (!(tr.F[i] & 8)) continue; const hh = 1.1; const pts = [[0, 0], [0, hh]];
      for (const [a, b] of pts) V.push(tr.P[i * 3] + tr.Up[i * 3] * b + tr.Rt[i * 3] * a, tr.P[i * 3 + 1] + tr.Up[i * 3 + 1] * b, tr.P[i * 3 + 2] + tr.Up[i * 3 + 2] * b + tr.Rt[i * 3 + 2] * a); }
    const nd = (V.length / 3 - base) / 2; for (let k = 0; k < nd - 1; k++) { const a = base + k * 2; I.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
    // end cap
    const li = tr.N - 1, pr = profile(tr.W[li], tr.H[li]); base = V.length / 3; const cx = 0, cy = tr.H[li] * .5;
    V.push(tr.P[li * 3] + tr.Up[li * 3] * cy, tr.P[li * 3 + 1] + tr.Up[li * 3 + 1] * cy, tr.P[li * 3 + 2] + tr.Up[li * 3 + 2] * cy);
    for (const [a, b] of pr) V.push(tr.P[li * 3] + tr.Rt[li * 3] * a + tr.Up[li * 3] * b, tr.P[li * 3 + 1] + tr.Rt[li * 3 + 1] * a + tr.Up[li * 3 + 1] * b, tr.P[li * 3 + 2] + tr.Rt[li * 3 + 2] * a + tr.Up[li * 3 + 2] * b);
    for (let k = 0; k < pr.length - 1; k++) I.push(base, base + 1 + k, base + 2 + k);
    return { main, extra: { V: new Float32Array(V), I: new Uint32Array(I) } };
  }
  function createRace(RAPIER, opts) {
    const tr = createTrack(); const list = (opts && opts.marbles) || []; const rnd = mulberry(((opts && opts.seed) || 1) >>> 0);
    const world = new RAPIER.World({ x: 0, y: -G, z: 0 }); world.timestep = 1 / 60;
    try { world.integrationParameters.numSolverIterations = 6; } catch (e) {}
    const mesh = tr.mesh || (tr.mesh = trackMesh(tr));
    let flags; try { flags = RAPIER.TriMeshFlags.FIX_INTERNAL_EDGES; } catch (e) {}
    world.createCollider(RAPIER.ColliderDesc.trimesh(mesh.main.V, mesh.main.I, flags).setFriction(.35).setRestitution(.25));
    world.createCollider(RAPIER.ColliderDesc.trimesh(mesh.extra.V, mesh.extra.I).setFriction(.2).setRestitution(.3));
    // start gate: a bar across the pen, removed on start()
    const gi = Math.round(tr.gateS / tr.DS); const gp = [tr.P[gi * 3], tr.P[gi * 3 + 1], tr.P[gi * 3 + 2]], gt = [tr.T[gi * 3], tr.T[gi * 3 + 1], tr.T[gi * 3 + 2]], gu = [tr.Up[gi * 3], tr.Up[gi * 3 + 1], tr.Up[gi * 3 + 2]];
    const yaw = Math.atan2(gt[0], -gt[2]); const q = { x: 0, y: Math.sin(-yaw / 2), z: 0, w: Math.cos(-yaw / 2) };
    const gateBody = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(gp[0] + gu[0] * 1, gp[1] + gu[1] * 1, gp[2] + gu[2] * 1).setRotation(q));
    const gateCol = world.createCollider(RAPIER.ColliderDesc.cuboid(tr.W[gi] / 2 + .5, 1.2, .25), gateBody);
    // marbles: shuffled grid in the pen behind the gate (fair: order is random per race)
    const order = list.map((m, i) => i); for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
    const perRow = 7, gapX = 1.18, gapZ = 1.2;
    const marbles = list.map((m, i) => ({ id: m.id, name: m.name, avatar: m.avatar, color: m.color, idx: i }));
    order.forEach((mi, k) => { const m = marbles[mi]; const row = Math.floor(k / perRow), col = k % perRow; const along = tr.gateS - .9 - row * gapZ; const ii = Math.max(0, Math.round(along / tr.DS));
      const lat = (col - (perRow - 1) / 2) * gapX + (row % 2 ? gapX * .35 : 0) + (rnd() - .5) * .08; const up = R + .05 + (rnd() * .02);
      const px = tr.P[ii * 3] + tr.Rt[ii * 3] * lat + tr.Up[ii * 3] * up, py = tr.P[ii * 3 + 1] + tr.Rt[ii * 3 + 1] * lat + tr.Up[ii * 3 + 1] * up, pz = tr.P[ii * 3 + 2] + tr.Rt[ii * 3 + 2] * lat + tr.Up[ii * 3 + 2] * up;
      const body = world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(px, py, pz).setLinearDamping(TUNE.ld).setAngularDamping(TUNE.ad).setCcdEnabled(true).setCanSleep(false));
      world.createCollider(RAPIER.ColliderDesc.ball(R).setDensity(1).setFriction(.3).setRestitution(.35), body);
      Object.assign(m, { body, i: ii, s: tr.S[ii], best: tr.S[ii], lastGood: ii, refS: tr.S[ii], refT: 0, finished: false, place: null, finishMs: null, respawns: 0, pos: { x: px, y: py, z: pz }, rot: { x: 0, y: 0, z: 0, w: 1 }, vel: { x: 0, y: 0, z: 0 }, air: false });
    });
    let t = 0, started = false, done = false, finishedCount = 0; const results = [];
    function start() { if (started) return; started = true; t = 0; world.removeCollider(gateCol, false); world.removeRigidBody(gateBody);
      for (const m of marbles) m.body.applyImpulse({ x: (rnd() - .5) * .04, y: 0, z: (rnd() - .5) * .04 }, true); }
    function nearest(m, p) { let best = m.i, bd = Infinity; const lo = Math.max(0, m.i - 8), hi = Math.min(tr.N - 1, m.i + 40);
      for (let i = lo; i <= hi; i++) { const dx = p.x - tr.P[i * 3], dy = p.y - tr.P[i * 3 + 1], dz = p.z - tr.P[i * 3 + 2]; const d = dx * dx + dy * dy + dz * dz; if (d < bd) { bd = d; best = i; } } return best; }
    function respawn(m, why) { // last checkpoint at or before the last place it was properly on the track (missed jump -> landing)
      let ci = tr.cps[0]; for (const c of tr.cps) if (c <= m.lastGood) ci = c; if (tr.F[m.lastGood] & 2 || (tr.F[ci] & 2)) { const land = tr.cps.find(c => tr.F[c] & 4); if (land) ci = land; }
      const lat = (rnd() - .5) * tr.W[ci] * .5, up = R + .6;
      const p = { x: tr.P[ci * 3] + tr.Rt[ci * 3] * lat + tr.Up[ci * 3] * up, y: tr.P[ci * 3 + 1] + tr.Rt[ci * 3 + 1] * lat + tr.Up[ci * 3 + 1] * up, z: tr.P[ci * 3 + 2] + tr.Rt[ci * 3 + 2] * lat + tr.Up[ci * 3 + 2] * up };
      m.body.setTranslation(p, true); m.body.setLinvel({ x: tr.T[ci * 3] * 3, y: tr.T[ci * 3 + 1] * 3, z: tr.T[ci * 3 + 2] * 3 }, true); m.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
      m.i = ci; m.lastGood = ci; m.refS = tr.S[ci]; m.refT = t; m.respawns++; m.lastRespawn = { t, why, s: tr.S[ci] };
    }
    function step() {
      if (done) { world.step(); sync(); return; }
      if (started) t += STEP;
      world.step();
      for (const m of marbles) {
        const p = m.body.translation(); const v = m.body.linvel();
        const sp = Math.hypot(v.x, v.y, v.z); if (sp > 16) m.body.setLinvel({ x: v.x / sp * 16, y: v.y / sp * 16, z: v.z / sp * 16 }, true);
        const i = nearest(m, p); m.i = i;
        const dx = p.x - tr.P[i * 3], dy = p.y - tr.P[i * 3 + 1], dz = p.z - tr.P[i * 3 + 2];
        const lat = dx * tr.Rt[i * 3] + dy * tr.Rt[i * 3 + 1] + dz * tr.Rt[i * 3 + 2], up = dx * tr.Up[i * 3] + dy * tr.Up[i * 3 + 1] + dz * tr.Up[i * 3 + 2];
        const along = dx * tr.T[i * 3] + dy * tr.T[i * 3 + 1] + dz * tr.T[i * 3 + 2];
        m.s = tr.S[i] + Math.max(-tr.DS, Math.min(tr.DS, along)); m.air = up > R + .35;
        const onTrack = Math.abs(lat) < tr.W[i] / 2 + .2 && up > -.6 && up < tr.H[i] + 1.2 && !(tr.F[i] & 1);
        if (onTrack && !m.air) m.lastGood = Math.max(m.lastGood, i);
        if (!started || m.finished) continue;
        const off = up < -4 || Math.abs(lat) > tr.W[i] / 2 + 4 || up > 30;
        if (off) { respawn(m, 'off'); continue; }
        if (m.s > m.refS + .4) { m.refS = m.s; m.refT = t; } else if (t - m.refT > 4000) { respawn(m, 'stuck'); continue; }
        if (m.s >= tr.finishS && onTrack) { m.finished = true; m.body.setLinearDamping(1.2); m.finishMs = t; m.place = ++finishedCount; results.push(m); }
        m.best = Math.max(m.best, m.s);
      }
      sync();
      if (started && (finishedCount === marbles.length || t >= CAP_MS)) finish();
    }
    function sync() { for (const m of marbles) { const p = m.body.translation(), r = m.body.rotation(), v = m.body.linvel(); m.pos.x = p.x; m.pos.y = p.y; m.pos.z = p.z; m.rot.x = r.x; m.rot.y = r.y; m.rot.z = r.z; m.rot.w = r.w; m.vel.x = v.x; m.vel.y = v.y; m.vel.z = v.z; } }
    sync();
    function finish() { if (done) return; done = true; const rest = marbles.filter(m => !m.finished).sort((a, b) => b.s - a.s); for (const m of rest) { m.place = ++finishedCount; m.finishMs = null; results.push(m); } }
    function leader() { let b = null; for (const m of marbles) if (!m.finished && (!b || m.s > b.s)) b = m; return b; }
    function standings() { const live = marbles.filter(m => !m.finished).sort((a, b) => b.s - a.s); return results.filter(m => m.finishMs != null).concat(live); }
    function free() { try { world.free(); } catch (e) {} }
    return { track: tr, world, R, marbles, results, start, step, finish, leader, standings, free, get t() { return t; }, get done() { return done; }, get started() { return started; } };
  }
  const api = { trackMesh, createTrack, createRace, mulberry, profile, R, STEP, CAP_MS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.MarbleTrack3D = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
