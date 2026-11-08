/* Oasis Radio Duck Race – 3D scene (procedural rubber ducks, animated river, banks, finish gate, camera director).
   No imports: THREE is passed in, so the same file runs in the overlay page, the offline demo and Node tests.
   Visual only – it never decides results (those come from duck-race-core.js + the server). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Duck3D = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const S = 0.1;                 // world units per race unit (C.D = 6000 -> 600 m of river)
  const HALF_W = 28;             // half width of the water
  const LANE_W = 22;             // ducks spread across +-LANE_W
  const lerp = (a, b, t) => a + (b - a) * t, clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function laneX(i, n) { const cols = Math.min(Math.max(n, 1), 8), c = i % cols, row = Math.floor(i / cols); return (cols === 1 ? 0 : -LANE_W + 2 * LANE_W * c / (cols - 1)) + (row % 2) * 2.2; }
  function laneBack(i, n) { return Math.floor(i / Math.min(Math.max(n, 1), 8)) * 3.2; }
  function zOf(p) { return -p * S; }

  function create(THREE, canvas, opts = {}) {
    const D = opts.D || 6000, LOWQ = !!opts.lowq, ZF = zOf(D);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#8fe3ff');
    scene.fog = new THREE.Fog('#bdf2ff', 140, 420);
    const camera = new THREE.PerspectiveCamera(52, 720 / 1280, 0.3, 900);
    let renderer = null;
    if (!opts.noRender) {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: !LOWQ, alpha: false, powerPreference: 'high-performance' });
      renderer.setPixelRatio(opts.dpr || 1); renderer.setSize(720, 1280, false);
      renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.15;
      renderer.shadowMap.enabled = !LOWQ; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }
    // ---- lights: bright sunny day ----
    scene.add(new THREE.HemisphereLight('#e8fbff', '#7be06b', 1.35));
    const sun = new THREE.DirectionalLight('#fff4d6', 2.2); sun.castShadow = !LOWQ;
    sun.shadow.mapSize.set(LOWQ ? 512 : 1024, LOWQ ? 512 : 1024); Object.assign(sun.shadow.camera, { left: -45, right: 45, top: 45, bottom: -45, near: 1, far: 160 }); sun.shadow.bias = -0.0008;
    scene.add(sun, sun.target);

    // ---- animated water (shader: waves, flowing streaks, foam at edges, sparkles) ----
    const waterU = { uT: { value: 0 } };
    const water = new THREE.Mesh(new THREE.PlaneGeometry(HALF_W * 2 + 6, -ZF + 260, LOWQ ? 30 : 60, LOWQ ? 180 : 360), new THREE.ShaderMaterial({
      uniforms: waterU,
      vertexShader: `uniform float uT; varying vec3 vW; void main(){ vec3 p = position; vec4 w = modelMatrix * vec4(p,1.0);
        w.y += sin(w.x*.35 + uT*1.6)*.12 + sin(w.z*.22 - uT*2.1)*.16 + sin((w.x+w.z)*.6 + uT*3.)*.05; vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
      fragmentShader: `uniform float uT; varying vec3 vW;
        float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
        void main(){
          float edge = smoothstep(${(HALF_W - 4).toFixed(1)}, ${(HALF_W + 1).toFixed(1)}, abs(vW.x));
          vec3 deep = vec3(0.0, .62, .86), mid = vec3(.13, .86, .93), lite = vec3(.62, .98, 1.);
          float band = .5 + .5*sin(vW.x*.18 + sin(vW.z*.05 + uT*.4)*2.);
          vec3 c = mix(deep, mid, band*.8 + .2);
          float flow = sin((vW.z + uT*7.)*.9 + sin(vW.x*.45 + uT)*2.2);
          c = mix(c, lite, smoothstep(.86, .99, flow)*.55);
          vec2 g = floor(vec2(vW.x*2., vW.z*2. + uT*8.)); float sp = step(.995, h(g)) * (.5+.5*sin(uT*9. + h(g)*40.));
          c += vec3(sp);
          float foam = edge * (.6 + .4*sin(vW.z*1.3 + uT*5.));
          c = mix(c, vec3(1.), clamp(foam,0.,1.)*.8);
          gl_FragColor = vec4(c, 1.); }`
    }));
    water.rotation.x = -Math.PI / 2; water.position.set(0, 0, (ZF - 120 + 140) / 2); scene.add(water);

    // ---- banks, sand edges, scenery (deterministic placement) ----
    const L = -ZF + 300, zc = ZF / 2;
    const grassM = new THREE.MeshLambertMaterial({ color: '#58e05a' }), sandM = new THREE.MeshLambertMaterial({ color: '#ffe08a' });
    for (const sd of [-1, 1]) {
      const bank = new THREE.Mesh(new THREE.BoxGeometry(70, 2, L), grassM); bank.position.set(sd * (HALF_W + 2 + 35), 0.2, zc); bank.receiveShadow = true; scene.add(bank);
      const sand = new THREE.Mesh(new THREE.BoxGeometry(5, 1, L), sandM); sand.position.set(sd * (HALF_W + 1.5), 0.05, zc); sand.receiveShadow = true; scene.add(sand);
    }
    const rnd = mulberry(20261108), dummy = new THREE.Object3D(), col = new THREE.Color();
    function inst(geo, mat, n, place) { const m = new THREE.InstancedMesh(geo, mat, n); for (let i = 0; i < n; i++) { place(i, dummy, col); dummy.updateMatrix(); m.setMatrixAt(i, dummy.matrix); if (m.instanceColor || mat.vertexColors === false) m.setColorAt(i, col); } m.castShadow = !LOWQ; m.receiveShadow = true; scene.add(m); return m; }
    const treeN = LOWQ ? 70 : 160, sideX = () => (rnd() < .5 ? -1 : 1) * (HALF_W + 8 + rnd() * 50), zr = () => 60 - rnd() * (L - 40);
    const trees = []; for (let i = 0; i < treeN; i++) trees.push([sideX(), zr(), .8 + rnd() * .9]);
    inst(new THREE.CylinderGeometry(.5, .7, 4, 8), new THREE.MeshLambertMaterial({ color: '#a0602f' }), treeN, (i, d, c) => { const [x, z, s] = trees[i]; d.position.set(x, 2.8 * s, z); d.scale.setScalar(s); c.set('#a0602f'); });
    const leafCols = ['#2ecc40', '#7dff5a', '#00c853', '#b2ff59', '#ff80ab'];
    inst(new THREE.IcosahedronGeometry(3, 1), new THREE.MeshLambertMaterial({ color: '#ffffff' }), treeN, (i, d, c) => { const [x, z, s] = trees[i]; d.position.set(x, 6.5 * s, z); d.scale.set(s * 1.1, s, s * 1.1); c.set(leafCols[i % leafCols.length]); });
    const flN = LOWQ ? 300 : 900, flCols = ['#ff3d8b', '#ffd43b', '#ff8a3d', '#b46bff', '#ffffff', '#00e5ff'];
    inst(new THREE.SphereGeometry(.45, 8, 6), new THREE.MeshLambertMaterial({ color: '#ffffff' }), flN, (i, d, c) => { const sd = rnd() < .5 ? -1 : 1; d.position.set(sd * (HALF_W + 4 + rnd() * 30), 1.45, zr()); d.scale.setScalar(.8 + rnd() * .7); c.set(flCols[i % flCols.length]); });
    inst(new THREE.DodecahedronGeometry(1.4, 0), new THREE.MeshLambertMaterial({ color: '#ffffff' }), LOWQ ? 30 : 70, (i, d, c) => { const sd = rnd() < .5 ? -1 : 1; d.position.set(sd * (HALF_W + 1 + rnd() * 3), .5, zr()); d.rotation.set(rnd() * 3, rnd() * 3, 0); d.scale.set(1 + rnd(), .6 + rnd() * .5, 1 + rnd()); c.set(rnd() < .5 ? '#c7c7d1' : '#e8e2d0'); });
    inst(new THREE.CylinderGeometry(.08, .1, 3.2, 5), new THREE.MeshLambertMaterial({ color: '#ffffff' }), LOWQ ? 120 : 360, (i, d, c) => { const sd = rnd() < .5 ? -1 : 1; d.position.set(sd * (HALF_W - .5 + rnd() * 3), 1.4, zr()); d.rotation.set((rnd() - .5) * .4, 0, (rnd() - .5) * .4); c.set(rnd() < .8 ? '#3fae3a' : '#8d5a2b'); });
    inst(new THREE.CircleGeometry(1.3, 14), new THREE.MeshLambertMaterial({ color: '#ffffff', side: THREE.DoubleSide }), LOWQ ? 40 : 110, (i, d, c) => { const sd = rnd() < .5 ? -1 : 1; d.position.set(sd * (HALF_W - 3 - rnd() * 3), .14, zr()); d.rotation.set(-Math.PI / 2, 0, rnd() * 6); c.set('#43c047'); });
    for (let i = 0; i < 10; i++) { const h = new THREE.Mesh(new THREE.ConeGeometry(60 + rnd() * 50, 40 + rnd() * 40, 20), new THREE.MeshLambertMaterial({ color: ['#9be7a0', '#b9f0a8', '#a6e3ff'][i % 3] })); h.position.set((i % 2 ? 1 : -1) * (160 + rnd() * 80), 10, 40 - i * (L / 10)); scene.add(h); }

    // ---- canvas textures ----
    function canvasTex(w, h, draw) { const c = (opts.doc || (typeof document !== 'undefined' ? document : null)); if (!c) return null; const cv = c.createElement('canvas'); cv.width = w; cv.height = h; draw(cv.getContext('2d'), w, h); const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; }
    const checkerTex = canvasTex(256, 32, (g, w, h) => { for (let i = 0; i < 16; i++) for (let j = 0; j < 2; j++) { g.fillStyle = (i + j) % 2 ? '#111' : '#fff'; g.fillRect(i * 16, j * 16, 16, 16); } });
    const bannerTex = (txt, bg) => canvasTex(1024, 160, (g, w, h) => { const gr = g.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, bg[0]); gr.addColorStop(1, bg[1]); g.fillStyle = gr; g.fillRect(0, 0, w, h); for (let i = 0; i < 32; i++) { g.fillStyle = i % 2 ? '#111' : '#fff'; g.fillRect(i * 32, 0, 32, 14); g.fillRect(i * 32 + 16, h - 14, 32, 14); } g.font = '900 96px "Arial Black",sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineWidth = 10; g.strokeStyle = 'rgba(0,0,0,.45)'; g.strokeText(txt, w / 2, h / 2 + 4); g.fillStyle = '#fff'; g.fillText(txt, w / 2, h / 2 + 4); });
    const foamTex = canvasTex(128, 128, (g, w, h) => { g.clearRect(0, 0, w, h); g.strokeStyle = 'rgba(255,255,255,.95)'; g.lineCap = 'round'; for (let k = 0; k < 3; k++) { g.lineWidth = 7 - k * 2; g.beginPath(); g.moveTo(64 - 8, 10 + k * 8); g.lineTo(10 + k * 6, 120); g.moveTo(64 + 8, 10 + k * 8); g.lineTo(118 - k * 6, 120); g.stroke(); } });
    const blobTex = canvasTex(64, 64, (g, w, h) => { const r = g.createRadialGradient(32, 32, 2, 32, 32, 30); r.addColorStop(0, 'rgba(0,40,70,.45)'); r.addColorStop(1, 'rgba(0,40,70,0)'); g.fillStyle = r; g.fillRect(0, 0, 64, 64); });

    // ---- start line + finish gate with bunting and balloons ----
    function lineOnWater(z, tex, colr) { const m = new THREE.Mesh(new THREE.PlaneGeometry(HALF_W * 2, 2.4), new THREE.MeshBasicMaterial({ map: tex || null, color: tex ? '#ffffff' : colr, transparent: true, opacity: .95 })); if (tex) { tex.wrapS = THREE.RepeatWrapping; tex.repeat.set(4, 1); } m.rotation.x = -Math.PI / 2; m.position.set(0, .35, z); scene.add(m); return m; }
    function gate(z, label, bg, big) {
      const g = new THREE.Group(); g.position.z = z; scene.add(g);
      const postM = new THREE.MeshStandardMaterial({ color: '#ff3d8b', roughness: .5 }), postM2 = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: .5 });
      for (const sd of [-1, 1]) for (let k = 0; k < 6; k++) { const s = new THREE.Mesh(new THREE.CylinderGeometry(.9, .9, 2.4, 14), k % 2 ? postM2 : postM); s.position.set(sd * (HALF_W + 2), 1.2 + k * 2.4, 0); s.castShadow = true; g.add(s); }
      const ban = new THREE.Mesh(new THREE.BoxGeometry(HALF_W * 2 + 8, big ? 6 : 4.5, .8), [postM, postM, postM, postM, new THREE.MeshBasicMaterial({ map: bannerTex(label, bg) }), new THREE.MeshBasicMaterial({ map: bannerTex(label, bg) })]);
      ban.position.y = 15.5; ban.castShadow = true; g.add(ban);
      if (big) {
        const flagCols = ['#ff3d8b', '#ffd43b', '#00d9ff', '#3ddc84', '#ff8a3d', '#b46bff'], tri = new THREE.ConeGeometry(.9, 1.8, 3);
        for (let i = 0; i < 26; i++) { const x = -HALF_W - 1 + i * (2 * HALF_W + 2) / 25, f = new THREE.Mesh(tri, new THREE.MeshLambertMaterial({ color: flagCols[i % 6] })); f.position.set(x, 11.8 - Math.sin(i / 25 * Math.PI) * 1.6, .2); f.rotation.x = Math.PI; g.add(f); }
        const ballG = new THREE.SphereGeometry(1.3, 16, 12);
        for (const sd of [-1, 1]) for (let i = 0; i < 7; i++) { const b = new THREE.Mesh(ballG, new THREE.MeshPhysicalMaterial({ color: flagCols[(i + (sd > 0 ? 3 : 0)) % 6], roughness: .25, clearcoat: 1 })); b.position.set(sd * (HALF_W + 2 + (i % 3 - 1) * 1.6), 18.5 + Math.floor(i / 3) * 2 + (i % 2), (i % 2 - .5) * 1.4); b.scale.y = 1.15; b.castShadow = true; g.add(b); }
      }
      return g;
    }
    lineOnWater(0, null, '#ffffff'); gate(0, 'START', ['#00b4e6', '#7c4dff'], false);
    lineOnWater(ZF, checkerTex, '#ffffff'); const finishGate = gate(ZF, '🏁 FINISH 🏁', ['#ff3d8b', '#ff8a3d'], true);

    // ---- procedural rubber duck ----
    const G = {
      body: new THREE.SphereGeometry(1, 28, 20), head: new THREE.SphereGeometry(.62, 24, 18), beak: new THREE.SphereGeometry(1, 16, 10),
      eye: new THREE.SphereGeometry(.12, 12, 10), glint: new THREE.SphereGeometry(.045, 8, 6), wing: new THREE.SphereGeometry(1, 16, 12),
      tail: new THREE.ConeGeometry(.42, 1, 16), band: new THREE.TorusGeometry(.56, .085, 10, 28), plane: new THREE.PlaneGeometry(1, 1), ring: new THREE.RingGeometry(.85, 1, 40)
    };
    const M = {
      yellow: new THREE.MeshPhysicalMaterial({ color: '#ffd60a', roughness: .32, clearcoat: 1, clearcoatRoughness: .18, emissive: '#3d2a00', emissiveIntensity: .35 }),
      wing: new THREE.MeshPhysicalMaterial({ color: '#ffc300', roughness: .35, clearcoat: .8, clearcoatRoughness: .2 }),
      beak: new THREE.MeshPhysicalMaterial({ color: '#ff7b00', roughness: .3, clearcoat: 1 }),
      eye: new THREE.MeshPhysicalMaterial({ color: '#111111', roughness: .1, clearcoat: 1 }), glint: new THREE.MeshBasicMaterial({ color: '#ffffff' }),
      wake: foamTex ? new THREE.MeshBasicMaterial({ map: foamTex, transparent: true, depthWrite: false, opacity: .9 }) : new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: .4, depthWrite: false }),
      blob: blobTex ? new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, depthWrite: false }) : new THREE.MeshBasicMaterial({ color: '#003050', transparent: true, opacity: .25, depthWrite: false })
    };
    function makeDuck(color) {
      const root = new THREE.Group(), bob = new THREE.Group(); root.add(bob);
      const add = (geo, mat, x, y, z, sx = 1, sy = 1, sz = 1, rx = 0, ry = 0, rz = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.scale.set(sx, sy, sz); m.rotation.set(rx, ry, rz); m.castShadow = true; bob.add(m); return m; };
      add(G.body, M.yellow, 0, .55, .05, 1.0, .74, 1.28);
      add(G.body, M.yellow, 0, .85, -.55, .7, .6, .6);                 // chest
      add(G.tail, M.yellow, 0, 1.05, 1.15, 1, 1, 1, -1.05);           // perky tail
      add(G.head, M.yellow, 0, 1.62, -.78);
      add(G.beak, M.beak, 0, 1.5, -1.38, .4, .15, .42);
      add(G.beak, M.beak, 0, 1.38, -1.3, .32, .1, .34);
      for (const sd of [-1, 1]) { add(G.eye, M.eye, sd * .3, 1.8, -1.22); add(G.glint, M.glint, sd * .3 + .04, 1.85, -1.32); add(G.wing, M.wing, sd * .86, .8, .15, .24, .42, .72, 0, 0, sd * .35); }
      const band = add(G.band, new THREE.MeshPhysicalMaterial({ color: color || '#ff3d8b', roughness: .3, clearcoat: 1 }), 0, 1.15, -.6, 1, 1, 1, 1.35);
      const wake = new THREE.Mesh(G.plane, M.wake); wake.rotation.x = -Math.PI / 2; wake.position.set(0, .22, 2.6); wake.scale.set(3.4, 4.6, 1); root.add(wake);
      const blob = new THREE.Mesh(G.plane, M.blob); blob.rotation.x = -Math.PI / 2; blob.position.set(0, .2, .1); blob.scale.set(3.4, 4, 1); root.add(blob);
      root.scale.setScalar(1.5);
      return { root, bob, band, wake };
    }
    // ripple rings pool
    const ripples = []; const ripM = []; for (let i = 0; i < (LOWQ ? 30 : 80); i++) { const m = new THREE.Mesh(G.ring, new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0, depthWrite: false })); m.rotation.x = -Math.PI / 2; m.visible = false; scene.add(m); ripples.push({ m, t0: -1 }); }
    let ripI = 0; function ripple(x, z, now) { const r = ripples[ripI++ % ripples.length]; r.m.position.set(x, .25, z); r.t0 = now; r.m.visible = true; }

    // ---- ducks ----
    let ducks = new Map(), N = 0;
    function setDucks(list) {
      const keep = new Set(list.map(m => String(m.id)));
      for (const [id, d] of ducks) if (!keep.has(id)) { scene.remove(d.root); ducks.delete(id); }
      N = list.length;
      list.forEach((m, i) => { const id = String(m.id); let d = ducks.get(id); if (!d) { d = makeDuck(m.color); d.lastRip = 0; d.yaw = 0; scene.add(d.root); ducks.set(id, d); } d.idx = i; d.band.material.color.set(m.color || '#ff3d8b'); });
    }

    // ---- camera director ----
    const cam = { pos: new THREE.Vector3(0, 10, 24), look: new THREE.Vector3(0, 1, -6), shot: 'follow', nextCut: 0, first: true };
    const SHOTS = ['follow', 'wide', 'follow', 'close'];
    let shotI = 0;
    function direct(now, view, list) {
      let tp, tl;
      if (view.mode === 'entries' || !list.length) { tp = new THREE.Vector3(Math.sin(now / 4000) * 5, 9, 26); tl = new THREE.Vector3(0, 1, -4); cam.shot = 'entries'; }
      else if (view.mode === 'podium') { const z = ZF + 6; tp = new THREE.Vector3(Math.sin(now / 3000) * 8, 7, z + 20); tl = new THREE.Vector3(0, 2, z - 2); cam.shot = 'podium'; }
      else {
        if (now > cam.nextCut) { shotI = (shotI + 1) % SHOTS.length; cam.shot = SHOTS[shotI]; cam.nextCut = now + (cam.shot === 'follow' ? 8000 : cam.shot === 'wide' ? 3800 : 3200); }
        const zs = list.map(d => d.z).sort((a, b) => a - b), lead = list.reduce((a, d) => (d.z < a.z ? d : a)), last = zs[zs.length - 1], first = zs[0];
        const top = zs.slice(0, Math.min(3, zs.length)), zt = top.reduce((a, b) => a + b, 0) / top.length;
        if (cam.shot === 'wide' || view.t < 2.5) { const span = Math.max(20, last - first + 16), mid = (last + first) / 2; tp = new THREE.Vector3(0, 14 + span * .62, mid + 12 + span * .55); tl = new THREE.Vector3(0, 0, mid - 4); }
        else if (cam.shot === 'close') { tp = new THREE.Vector3(lead.x + 6, 4.2, lead.z + 9); tl = new THREE.Vector3(lead.x, 1.8, lead.z - 2); }
        else { tp = new THREE.Vector3(Math.sin(now / 5200) * 7, 13, zt + 24); tl = new THREE.Vector3(0, 0, zt - 12); }
        tp.z = Math.max(tp.z, ZF - 10); tl.z = Math.max(tl.z, ZF - 30);
      }
      const k = cam.first ? 1 : .055; cam.first = false; cam.pos.lerp(tp, k); cam.look.lerp(tl, k * 1.2);
      camera.position.copy(cam.pos); camera.lookAt(cam.look);
      sun.position.set(cam.look.x + 25, 50, cam.look.z + 20); sun.target.position.copy(cam.look);
    }

    // frame: ducks = [{id, p, moving, speed, spin, place}], returns label anchors in 720x1280 screen space
    const v = new THREE.Vector3();
    function frame(now, duckState, view) {
      const ts = now / 1000; waterU.uT.value = ts;
      const list = [];
      for (const s of duckState) {
        const d = ducks.get(String(s.id)); if (!d) continue;
        const i = d.idx, x = laneX(i, N) + Math.sin(ts * .7 + i * 1.3) * .9, z = zOf(s.p) + laneBack(i, N);
        d.root.position.set(x, 0, z);
        const ph = ts * 2.6 + i * .9;
        d.bob.position.y = Math.sin(ph) * .12 + .05;                         // bob
        d.bob.rotation.z = Math.sin(ph * .8) * .09;                          // rock side to side
        d.bob.rotation.x = Math.sin(ph * 1.1) * .06 - (s.moving ? .05 : 0);  // pitch, nose down when swimming
        const yawT = (s.spin || 0) + Math.sin(ts * .5 + i) * .18; d.yaw = lerp(d.yaw, yawT, .1); d.root.rotation.y = d.yaw;
        const sp = clamp((s.speed || 0) / 140, 0, 1.4); d.wake.material = M.wake; d.wake.visible = s.moving && sp > .1; d.wake.scale.set(3 + sp * 1.5, 3 + sp * 3, 1);
        if (s.moving && now - d.lastRip > 650 - sp * 250) { d.lastRip = now; ripple(x, z + 1.2, now); }
        list.push({ id: s.id, x, z, place: s.place });
      }
      for (const r of ripples) if (r.t0 >= 0) { const a = (now - r.t0) / 1700; if (a >= 1) { r.m.visible = false; r.t0 = -1; continue; } r.m.scale.setScalar(1.2 + a * 4.5); r.m.material.opacity = .55 * (1 - a); }
      finishGate.children.forEach((c, k) => { if (c.geometry && c.geometry.type === 'SphereGeometry') c.position.y += Math.sin(ts * 1.6 + k) * .01; });
      direct(now, view, list);
      if (renderer) renderer.render(scene, camera);
      const labels = list.map(o => { v.set(o.x, 4.6, o.z).project(camera); return { id: o.id, sx: (v.x * .5 + .5) * 720, sy: (-v.y * .5 + .5) * 1280, on: v.z < 1 && Math.abs(v.x) < 1.1 && Math.abs(v.y) < 1.1, dist: camera.position.distanceTo(new THREE.Vector3(o.x, 0, o.z)) }; });
      return { labels, shot: cam.shot };
    }
    return { setDucks, frame, scene, camera, renderer, get duckCount() { return ducks.size; }, ZF };
  }
  return { create, laneX, laneBack, zOf, S };
});
