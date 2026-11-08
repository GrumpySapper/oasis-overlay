// 3D scene smoke tests in Node (no WebGL: builds the scene graph and runs the camera/animation without rendering).
// Needs three r169: set THREE_MODULE=/path/to/three.module.js (skipped otherwise).
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs'), path = require('path');
const D3 = require('../duck-race-3d.js'), C = require('../duck-race-core.js');
const TP = process.env.THREE_MODULE;
const ents = n => Array.from({ length: n }, (_, i) => ({ id: 'u' + i, name: 'Duck ' + i, color: '#ff3d8b' }));

test('3D scene builds, ducks animate, camera cycles shots, labels project on screen', { skip: !TP && 'THREE_MODULE not set' }, async () => {
  const THREE = await import(require('url').pathToFileURL(TP).href);
  for (const n of [1, 6, 40]) {
    const R = D3.create(THREE, null, { D: C.D, noRender: true });
    R.setDucks(ents(n)); assert.strictEqual(R.duckCount, n);
    const sim = C.simulate(ents(n), 99);
    const shots = new Set(); let onScreen = 0;
    for (let ms = 0; ms < 206000; ms += 500) {
      const t = ms / 1000, st = sim.ds.map(c => ({ id: c.id, p: C.yAt(c, t), moving: true, speed: 31, spin: 0 }));
      const out = R.frame(ms, st, { mode: 'race', t });
      shots.add(out.shot); for (const l of out.labels) { assert.ok(Number.isFinite(l.sx) && Number.isFinite(l.sy)); if (l.on) onScreen++; }
      assert.ok(Number.isFinite(R.camera.position.z));
    }
    for (const k of D3.SHOT_NAMES) assert.ok(shots.has(k), 'missing shot ' + k + ' in ' + [...shots].join());
    assert.ok(shots.size >= 10, 'at least 10 distinct camera angles over one 201 s race');
    assert.ok(onScreen > 0);
    R.setDucks(ents(Math.max(1, n - 1))); assert.strictEqual(R.duckCount, Math.max(1, n - 1));     // roster change removes a duck
  }
});
test('duck geometry is volumetric 3D (spheres/cones/torus), not flat sprites', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'duck-race-3d.js'), 'utf8');
  for (const k of ['LatheGeometry', 'SphereGeometry', 'ConeGeometry', 'TorusGeometry', 'MeshPhysicalMaterial', 'clearcoat', 'PMREMGenerator', 'castShadow', 'ShaderMaterial', 'PerspectiveCamera', 'InstancedMesh', 'vertexColors']) assert.ok(src.includes(k), k);
});
test('page: 3D failure shows an honest message; logic and report still run without WebGL', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'duck-race.html'), 'utf8');
  assert.match(html, /3D view not available on this screen/);
  assert.match(html, /three@0\.169\.0\/build\/three\.module\.min\.js/);
  const body = html.split('<script type="module">')[1].split('</script>')[0]; const iife = body.slice(body.indexOf('(() => {')); new Function(iife);
  assert.ok(iife.indexOf('reportOnce(raceId, sim.ids)') > iife.indexOf('if (!R) {'), 'report happens after (independent of) 3D render');
});
test('offline demo build: three inlined, DEMO forced, no box URL used for data', { skip: !fs.existsSync('/workspace/duck-demo-hd-201s.html') && 'demo not built' }, () => {
  const s = fs.readFileSync('/workspace/duck-demo-hd-201s.html', 'utf8');
  assert.ok(s.includes('const DEMO = true')); assert.ok(s.includes('__DUCK_THREE_URL = URL.createObjectURL'));
  assert.doesNotMatch(s, /x-key|nowplaying-key|game-key/i);
});
test('demo builder embeds three.js byte-identical (regression: String.replace expanded "$&" and broke the module)', { skip: !TP && 'THREE_MODULE not set' }, () => {
  const out = require('os').tmpdir() + '/duck-demo-test.html';
  require('child_process').execFileSync('node', [path.join(__dirname, '..', 'tools', 'build-duck-demo.js'), TP, out]);
  const s = fs.readFileSync(out, 'utf8'), three = fs.readFileSync(TP, 'utf8');
  assert.ok(three.includes('$&'), 'fixture really contains $&');
  const i = s.indexOf('id="three-src">') + 'id="three-src">'.length, j = s.indexOf('</script>', i);
  assert.strictEqual(s.slice(i, j), three);
  assert.strictEqual((s.match(/<script src=/g) || []).length, 0, 'no stray external script tags');
  for (const m of s.matchAll(/<script>([\s\S]*?)<\/script>/g)) new Function(m[1]);
});

test('shot schedule is deterministic from race time (all viewers cut together) and the finish camera takes the final approach', () => {
  assert.strictEqual(D3.shotAt(3, null), 'establish'); assert.strictEqual(D3.shotAt(120, 30), 'finish');
  const seq = []; for (let t = 0; t < 200; t += 1) seq.push(D3.shotAt(t, 300)); assert.ok(new Set(seq).size >= 9);
  for (let t = 0; t < 200; t += 7) assert.strictEqual(D3.shotAt(t, 300), D3.shotAt(t, 300));
});
test('cutesy v1 props removed (balloons / bunting / pastel flowers)', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'duck-race-3d.js'), 'utf8');
  assert.doesNotMatch(src, /balloon|bunting|flCols|leafCols|#ff80ab/i);
});
test('demo QA helpers (speed/seek/shot/snap) are gated on DEMO only', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'duck-race.html'), 'utf8');
  assert.match(html, /const SPEED = DEMO \?/); assert.match(html, /SEEK = DEMO \?/); assert.match(html, /forceShot: DEMO \?/); assert.match(html, /snap: DEMO &&/);
  assert.match(html, /nowMs = \(\) => DEMO \? [^:]+ : Date\.now\(\)/);
});
