// Offline tests for the Duck Race logic (no network, no live box). Run: node --test tests/
const test = require('node:test');
const assert = require('node:assert');
const C = require('../duck-race-core.js');
const fs = require('fs'), path = require('path');
const ents = n => Array.from({ length: n }, (_, i) => ({ id: 'user_' + i, name: 'Duck ' + i }));

test('single entrant finishes and wins', () => {
  const r = C.simulate(ents(1), 42);
  assert.deepStrictEqual(r.ids, ['user_0']);
  assert.ok(Number.isFinite(r.firstCross) && r.firstCross > 10);
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
test('every duck finishes well inside the server 95s race timeout (no no-winner races)', () => {
  let worst = 0;
  for (let s = 1; s <= 400; s++) { const r = C.simulate(ents(1 + (s % 40)), s * 7919); assert.ok(r.order.every(c => c.cross !== null)); worst = Math.max(worst, r.lastCross); }
  assert.ok(worst < C.MAX_FINISH_S, 'worst ' + worst);
  assert.ok(worst + 4 /* countdown */ < 95);
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
  const js = html.split('<script>')[1].split('</script>')[0]; new Function(js);
  assert.match(js, /C\.isActive\(st, DEMO\)/);
  assert.match(js, /post: DEMO \? async \(\) =>/);
  assert.match(js, /if \(DEMO\) \{[\s\S]*cycle\(\); requestAnimationFrame\(frame\); return;/);
  assert.doesNotMatch(html, /x-key|nowplaying-key|game-key/i);
});
test('shared control offers the duck race in the game picker', () => {
  const c = fs.readFileSync(path.join(__dirname, '..', 'camel-control.html'), 'utf8');
  assert.match(c, /\['duck', '🦆 Duck Race'\]/);
});
