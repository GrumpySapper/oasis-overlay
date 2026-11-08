// Offline tests for the Duck Race logic (no network, no live box). Run: node --test tests/
const test = require('node:test');
const assert = require('node:assert');
const C = require('../duck-race-core.js');
const fs = require('fs'), path = require('path');
const ents = n => Array.from({ length: n }, (_, i) => ({ id: 'user_' + i, name: 'Duck ' + i }));

test('single entrant finishes and wins', () => {
  const r = C.simulate(ents(1), 42);
  assert.deepStrictEqual(r.ids, ['user_0']);
  assert.strictEqual(r.firstCross, 201);
});
test('deterministic: same entries + seed => same order on every client', () => {
  const a = C.simulate(ents(12), 98765), b = C.simulate(ents(12), 98765);
  assert.deepStrictEqual(a.ids, b.ids);
  assert.notDeepStrictEqual(C.simulate(ents(12), 1).ids, C.simulate(ents(12), 2).ids);
});
test('order is a full permutation and the winner is the first duck across', () => {
  for (const n of [2, 5, 17, 40]) {
    const r = C.simulate(ents(n), n * 31);
    assert.strictEqual(r.ids.length, n); assert.strictEqual(new Set(r.ids).size, n);
    const crosses = r.order.map(c => c.cross);
    for (let i = 1; i < n; i++) assert.ok(crosses[i] >= crosses[i - 1]);
    const fastest = r.ds.reduce((a, c) => c.cross < a.cross ? c : a);
    assert.strictEqual(r.ids[0], fastest.id);
  }
});
test('201 s timing: winner crosses EXACTLY at GO+201 s for 1/12/40 entrants; field within the stagger window', () => {
  assert.strictEqual(C.RACE_S, 201); assert.strictEqual(C.RACE_MS, 201000);
  for (const n of [1, 12, 40]) for (const seed of [1, 7, 99, 4242, 123457]) {
    const r = C.simulate(ents(n), seed), w = r.order[0];
    assert.strictEqual(r.firstCross, 201, `n${n} s${seed}`);
    assert.ok(C.yAt(w, 200.95) < C.D && C.yAt(w, 201.02) >= C.D, 'winner is on the line at 201 s, not before');
    for (const c of r.ds) assert.ok(C.yAt(c, 200.9) < C.D, 'nobody crosses before 201 s');
    assert.ok(r.order.every(c => c.cross !== null)); assert.ok(r.lastCross <= C.MAX_FINISH_S, 'last ' + r.lastCross);
    assert.ok(Math.abs(r.k - 1) < .1, 'time warp stays subtle: k=' + r.k);
  }
});
test('no early result: the report trigger (t >= firstCross) never fires before 201 s; old 50 s finish impossible', () => {
  for (let s = 1; s <= 60; s++) { const r = C.simulate(ents(1 + (s % 40)), s * 7919); assert.ok(r.firstCross >= 201); assert.ok(C.yAt(r.order[0], 50) < C.D * .4); }
  const html = fs.readFileSync(path.join(__dirname, '..', 'duck-race.html'), 'utf8');
  assert.match(html, /tt >= sim\.firstCross && mode !== 'finish'/);
});
test('late join / reconnect: same seed + server startAt => same positions at the same elapsed time (clock never restarts)', () => {
  const list = ents(12), a = C.simulate(list, 5150), b = C.simulate(list, 5150);
  const startAt = 1_000_000, joinNow = startAt + 137_500;
  const t = C.elapsedS(startAt, joinNow); assert.strictEqual(t, 137.5);
  for (let i = 0; i < 12; i++) assert.strictEqual(C.yAt(a.ds[i], t), C.yAt(b.ds[i], t));
  assert.deepStrictEqual(a.ids, b.ids);
  const html = fs.readFileSync(path.join(__dirname, '..', 'duck-race.html'), 'utf8');
  assert.match(html, /st\.phase === 'racing'\) \{ if \(raceId !== st\.raceId\)[\s\S]{0,200}sim = C\.simulate\(roster, st\.seed\); startAtLocal = st\.startAt - skew; mode = 'racing'/);
  assert.strictEqual(C.clock(201), '3:21'); assert.strictEqual(C.clock(0), '0:00');
});
test('reporter retries 425 Too Early (server guard) and then succeeds once', async () => {
  let n = 0; const rep = C.createReporter({ post: async () => { n++; return n < 3 ? { status: 425, body: { retryAfterMs: 800 } } : { status: 200, body: {} }; }, sleep: async () => {} });
  const r = await rep('race-425', ['a']); assert.ok(r.ok); assert.strictEqual(n, 3);
});
test('game picker: visible only when duck selected, or in demo', () => {
  assert.strictEqual(C.isActive({ game: 'duck' }), true);
  for (const g of ['camel', 'pod', 'marble', undefined]) assert.strictEqual(C.isActive({ game: g }), false);
  assert.strictEqual(C.isActive({ game: 'camel' }, true), true);
});
test('reporter posts {raceId, order} exactly once per race', async () => {
  const calls = []; const rep = C.createReporter({ post: async b => { calls.push(b); return { status: 200, body: { ok: true } }; }, sleep: async () => {} });
  const r = C.simulate(ents(4), 7);
  const a = await rep('race-1', r.ids), b = await rep('race-1', r.ids);
  assert.ok(a.ok); assert.ok(b.skipped); assert.strictEqual(calls.length, 1);
  assert.deepStrictEqual(calls[0], { raceId: 'race-1', order: r.ids });
});
test('reporter retries network/5xx failures, stops on 409 (already reported elsewhere)', async () => {
  let n = 0; const rep = C.createReporter({ post: async () => { n++; if (n === 1) throw new Error('offline'); if (n === 2) return { status: 502 }; return { status: 200, body: {} }; }, sleep: async () => {} });
  const r = await rep('race-2', ['a', 'b']); assert.ok(r.ok); assert.strictEqual(r.tries, 3);
  let m = 0; const rep2 = C.createReporter({ post: async () => { m++; return { status: 409, body: { ok: false } }; }, sleep: async () => {} });
  const r2 = await rep2('race-3', ['a']); assert.strictEqual(r2.status, 409); assert.strictEqual(m, 1);
  let k = 0; const rep3 = C.createReporter({ post: async () => { k++; throw new Error('down'); }, sleep: async () => {}, maxTries: 4 });
  const r3 = await rep3('race-4', ['a']); assert.ok(r3.gaveUp); assert.strictEqual(k, 4);
});
test('reporter ignores empty/missing race', async () => {
  const rep = C.createReporter({ post: async () => { throw new Error('should not post'); } });
  assert.ok((await rep(null, ['a'])).skipped); assert.ok((await rep('r', [])).skipped);
});
test('page: hidden unless duck picked, demo never posts to the box, inline script parses', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'duck-race.html'), 'utf8');
  const mod = html.split('<script type="module">')[1].split('</script>')[0]; const js = mod.slice(mod.indexOf('(() => {')); new Function(js);
  assert.match(js, /C\.isActive\(st, DEMO\)/);
  assert.match(js, /post: DEMO \? async \(\) =>/);
  assert.match(js, /if \(DEMO\) \{[\s\S]*cycle\(\); requestAnimationFrame\(frame\); return;/);
  assert.doesNotMatch(html, /x-key|nowplaying-key|game-key/i);
});
test('shared control offers the duck race in the game picker', () => {
  const c = fs.readFileSync(path.join(__dirname, '..', 'camel-control.html'), 'utf8');
  assert.match(c, /\['duck', '🦆 Duck Race'\]/);
});
