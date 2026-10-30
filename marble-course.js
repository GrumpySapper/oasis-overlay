/* Oasis Radio Marble Race – course + race engine (shared by marble-race.html and offline tuning).
   createRace(Matter, { marbles:[{id,name}], seed }) -> { engine, step(), state... } */
(function (root) {
  function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  const W = 720, R = 14;
  function createRace(M, opts) {
    const { Engine, Bodies, Body, Composite, Events } = M;
    const rnd = mulberry((opts && opts.seed) || (Date.now() & 0xffffffff));
    const engine = Engine.create({ gravity: { x: 0, y: 1, scale: 0.001 }, positionIterations: 8, velocityIterations: 6 });
    const world = engine.world;
    const statics = [];      // {kind, body, ...} for drawing
    const S = { friction: 0.02, frictionStatic: 0, restitution: 0.35, isStatic: true };
    function seg(x1, y1, x2, y2, t, kind, extra) {
      t = t || 16; const len = Math.hypot(x2 - x1, y2 - y1);
      const b = Bodies.rectangle((x1 + x2) / 2, (y1 + y2) / 2, len + t * 0.5, t, Object.assign({}, S, { angle: Math.atan2(y2 - y1, x2 - x1), chamfer: { radius: t / 2 - 1 } }, extra || {}));
      Composite.add(world, b); const o = { kind: kind || 'ramp', body: b, x1, y1, x2, y2, t }; statics.push(o); return o;
    }
    function peg(x, y, r, kind) {
      const b = Bodies.circle(x, y, r || 7, Object.assign({}, S, { restitution: kind === 'bumper' ? 0.9 : 0.5 }));
      b.plugin = { kind: kind || 'peg' }; Composite.add(world, b); const o = { kind: kind || 'peg', body: b, x, y, r: r || 7 }; statics.push(o); return o;
    }
    const H = 6600, FINISH = 6330;
    // side walls
    seg(10, -400, 10, H, 24, 'wall'); seg(710, -400, 710, H, 24, 'wall');
    // start gate
    const gate = seg(22, 190, 698, 190, 14, 'gate');
    // A: peg field
    for (let row = 0; row < 11; row++) { const y = 290 + row * 62, off = row % 2 ? 32 : 0; for (let x = 52 + off; x < 690; x += 64) peg(x, y, 7); }
    // A->B guides
    seg(22, 960, 150, 1010, 14, 'ramp'); seg(698, 960, 570, 1010, 14, 'ramp');
    // B: zig-zag ramps with kickers + bumpers in the drop gaps
    const B0 = 1080;
    for (let i = 0; i < 5; i++) {
      const y = B0 + i * 250;
      if (i % 2 === 0) { seg(22, y, 575, y + 150, 16);  }
      else { seg(698, y, 145, y + 150, 16);  }
      if (i === 1) peg(640, y + 30, 22, 'bumper'); if (i === 3) peg(80, y + 25, 22, 'bumper');
    }
    // C: spinners
    const spinners = [];
    function spinner(x, y, len, w) {
      const b = Bodies.rectangle(x, y, len, 14, { isStatic: true, friction: 0.05, restitution: 0.4, chamfer: { radius: 6 } });
      Composite.add(world, b); const o = { kind: 'spinner', body: b, x, y, len, w }; spinners.push(o); return o;
    }
    const C0 = 2560;
    spinner(200, C0 + 40, 230, 0.035); spinner(520, C0 + 230, 230, -0.04); spinner(250, C0 + 450, 240, 0.045); spinner(500, C0 + 650, 200, -0.05);
    peg(470, C0 - 20, 9); peg(600, C0 + 40, 9); peg(90, C0 + 260, 9); peg(330, C0 + 300, 9); peg(640, C0 + 470, 9); peg(120, C0 + 640, 9);
    seg(22, C0 + 120, 70, C0 + 160, 14); seg(698, C0 + 360, 650, C0 + 400, 14);
    // D: the big jump
    const D0 = 3420;
    seg(22, D0, 160, D0 + 30, 14); seg(22, D0 + 60, 430, D0 + 300, 16);  // launch slope
    seg(470, D0 + 296, 535, D0 + 262, 16, 'kicker');   // gap before the kicker: fast ones jump, slow ones drop
    seg(698, D0 + 440, 230, D0 + 560, 16);   // landing ramp (bounce off right wall, roll left)
    peg(620, D0 + 250, 20, 'bumper');
    // E: trapdoor 1
    const E0 = 4120, doors = [];
    seg(22, E0, 315, E0 + 150, 16); seg(698, E0, 405, E0 + 150, 16);
    function door(x1, x2, y, closedMs, openMs, phase) { const o = seg(x1, y, x2, y, 12, 'door'); o.closedMs = closedMs; o.openMs = openMs; o.phase = phase || 0; o.open = false; doors.push(o); return o; }
    door(300, 420, E0 + 162, 3200, 1400, 0);
    // F: bumper field
    const F0 = 4420;
    [[180, 0], [360, 40], [540, 0], [100, 170], [270, 200], [450, 200], [620, 170], [190, 360], [360, 400], [530, 360]].forEach(([x, dy]) => peg(x, F0 + dy, 24, 'bumper'));
    for (let x = 60; x < 690; x += 90) peg(x, F0 + 520, 7);
    // G: steep zig-zag drops with step shelves
    const G0 = 5040;
    seg(22, G0, 560, G0 + 120, 16); seg(698, G0 + 220, 160, G0 + 340, 16);
    // H: twin trapdoors
    const H0 = 5520;
    seg(22, H0, 200, H0 + 90, 16); seg(698, H0, 520, H0 + 90, 16); seg(300, H0 + 40, 360, H0 + 0, 14); seg(420, H0 + 40, 360, H0 + 0, 14);
    seg(200, H0 + 90, 205, H0 + 92, 4, 'ramp'); seg(520, H0 + 90, 515, H0 + 92, 4, 'ramp');
    door(195, 300, H0 + 100, 2600, 1300, 900); door(420, 525, H0 + 100, 2600, 1300, 2200);
    seg(300, H0 + 40, 300, H0 + 100, 10, 'ramp'); seg(420, H0 + 40, 420, H0 + 100, 10, 'ramp');
    // I: final peg run + funnel to finish
    const I0 = 5760;
    for (let row = 0; row < 5; row++) { const y = I0 + row * 58, off = row % 2 ? 36 : 0; for (let x = 64 + off; x < 680; x += 72) peg(x, y, 7); }
    seg(22, 6080, 270, 6260, 16); seg(698, 6080, 450, 6260, 16);
    // finish basin
    seg(22, 6560, 698, 6560, 30, 'floor');

    // marbles
    const list = (opts && opts.marbles) || [];
    const marbles = [];
    const perRow = Math.min(20, Math.max(1, list.length));
    const order = list.map((m, i) => i).sort(() => rnd() - 0.5);
    order.forEach((idx, k) => {
      const m = list[idx]; const row = Math.floor(k / 20), col = k % 20, n = Math.min(20, list.length - row * 20);
      const span = Math.min(640, n * 32), x0 = 360 - span / 2 + 16;
      const b = Bodies.circle(x0 + col * (span / n) + (rnd() - 0.5) * 4, 160 - row * 32, R, { restitution: 0.45, friction: 0.01, frictionStatic: 0, frictionAir: 0.008, density: 0.002 });
      b.plugin = { marble: true };
      Composite.add(world, b);
      marbles.push({ id: m.id, name: m.name, avatar: m.avatar || null, color: m.color, body: b, finished: false, finishMs: null, place: null, lastY: b.position.y, lastMoveMs: 0, stuckMs: 0, ref: { x: b.position.x, y: b.position.y } });
    });
    // bumper kick
    Events.on(engine, 'collisionStart', ev => {
      for (const p of ev.pairs) {
        const a = p.bodyA, b = p.bodyB; let bump = null, mb = null;
        if (a.plugin && a.plugin.kind === 'bumper') { bump = a; mb = b; } else if (b.plugin && b.plugin.kind === 'bumper') { bump = b; mb = a; }
        if (!bump || !mb.plugin || !mb.plugin.marble) continue;
        const dx = mb.position.x - bump.position.x, dy = mb.position.y - bump.position.y, d = Math.hypot(dx, dy) || 1;
        Body.setVelocity(mb, { x: dx / d * 7.5 + mb.velocity.x * 0.3, y: dy / d * 7.5 + mb.velocity.y * 0.3 });
        bump.plugin.hit = 1;
      }
    });

    const STEP = 1000 / 60;
    let t = 0, started = false, finishedCount = 0, done = false;
    const results = [];
    function start() { started = true; gate.body.collisionFilter.mask = 0; gate.open = true; t = 0; }
    function step() {
      if (started && !done) t += STEP;
      for (const s of spinners) Body.setAngle(s.body, s.body.angle + s.w, true);
      for (const d of doors) { const cyc = d.closedMs + d.openMs, ph = (t + d.phase) % cyc; const open = started && ph > d.closedMs; if (open !== d.open) { d.open = open; d.body.collisionFilter.mask = open ? 0 : 0xFFFFFFFF; } }
      Engine.update(engine, STEP);
      if (!started || done) return;
      for (const m of marbles) {
        if (m.finished) continue;
        const b = m.body, v = b.velocity, sp = Math.hypot(v.x, v.y);
        if (sp > 17) Body.setVelocity(b, { x: v.x / sp * 17, y: v.y / sp * 17 });
        if (b.position.x < 0 || b.position.x > W || b.position.y < -500) { Body.setPosition(b, { x: 360, y: Math.max(200, m.ref.y) }); Body.setVelocity(b, { x: 0, y: 0 }); }
        // anti-stuck: if it hasn't moved 6px in 2.2s, nudge; still stuck after 5s => bigger hop
        const moved = Math.hypot(b.position.x - m.ref.x, b.position.y - m.ref.y);
        if (moved > 6) { m.ref = { x: b.position.x, y: b.position.y }; m.stuckMs = 0; }
        else { m.stuckMs += STEP; const onDoor = doors.some(d => Math.abs(b.position.y - d.y1) < 30 && b.position.x > Math.min(d.x1, d.x2) - 20 && b.position.x < Math.max(d.x1, d.x2) + 20);
          if (!onDoor && m.stuckMs > 2200 && Math.round(m.stuckMs) % 700 < STEP) Body.setVelocity(b, { x: (rnd() - 0.5) * (m.stuckMs > 5000 ? 14 : 7), y: -(m.stuckMs > 5000 ? 7 : 3.5) });
          if (m.stuckMs > 9000) { Body.setPosition(b, { x: 360 + (rnd() - 0.5) * 200, y: b.position.y + 40 }); m.stuckMs = 0; }
        }
        if (b.position.y > FINISH) { m.finished = true; m.finishMs = t; m.place = ++finishedCount; results.push(m); Body.setStatic(b, false); }
      }
      if (finishedCount === marbles.length || t > 75000) finish();
    }
    function finish() {
      if (done) return; done = true;
      const rest = marbles.filter(m => !m.finished).sort((a, b) => b.body.position.y - a.body.position.y);
      for (const m of rest) { m.place = ++finishedCount; m.finishMs = null; results.push(m); }
    }
    function leader() { let best = null; for (const m of marbles) if (!m.finished && (!best || m.body.position.y > best.body.position.y)) best = m; return best; }
    function standings() { const live = marbles.filter(m => !m.finished).sort((a, b) => b.body.position.y - a.body.position.y); return results.filter(m => m.finishMs != null).concat(live); }
    const sections = [['B', 1080], ['C', 2560], ['D', 3420], ['E', 4120], ['F', 4420], ['G', 5040], ['H', 5520], ['I', 5760]];
    return { sections, engine, W, H, R, FINISH, statics, spinners, doors, gate, marbles, results, start, step, finish, leader, standings, get t() { return t; }, get done() { return done; }, get started() { return started; } };
  }
  const api = { createRace, mulberry };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.MarbleCourse = api;
})(this);
