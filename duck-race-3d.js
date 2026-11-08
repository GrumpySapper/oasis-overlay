/* Oasis Radio Duck Race – HD 3D scene (v3 "broadcast" look).
   Procedural glossy rubber ducks (lathe-turned bodies, clear-coat + environment reflections, race-number decals),
   shader river (multi-octave normals, fresnel sky reflection, sun glints, bank foam, per-duck Kelvin wakes and bow rings),
   displaced natural banks (wet mud / grass vertex colours), rocks, reeds, bulrushes, trees, course rope with floats,
   distance boards, timber start pontoon, steel finish gantry, spray particles, and a deterministic multi-angle camera director.
   No imports: THREE is passed in, so the same file runs in the overlay page, the offline demo and Node tests.
   Visual only – it never decides results (those come from duck-race-core.js + the server). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Duck3D = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const S = 0.1;                 // world units per race unit (C.D = 6000 -> 600 m of river)
  const HALF_W = 28;             // half width of the water channel
  const LANE_W = 21;             // ducks spread across +-LANE_W
  const MAXW = 40;               // max ducks sent to the water shader
  const lerp = (a, b, t) => a + (b - a) * t, clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const smooth = t => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
  function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function laneX(i, n) { const cols = Math.min(Math.max(n, 1), 8), c = i % cols, row = Math.floor(i / cols); return (cols === 1 ? 0 : -LANE_W + 2 * LANE_W * c / (cols - 1)) + (row % 2) * 2.4; }
  function laneBack(i, n) { return Math.floor(i / Math.min(Math.max(n, 1), 8)) * 3.4; }
  function zOf(p) { return -p * S; }
  // value noise (deterministic) for terrain + rock shapes
  function hash2(x, y) { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); }
  function vnoise(x, y) { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    return lerp(lerp(hash2(xi, yi), hash2(xi + 1, yi), u), lerp(hash2(xi, yi + 1), hash2(xi + 1, yi + 1), u), v); }
  function fbm(x, y, o = 4) { let a = 0, f = 1, w = .5; for (let i = 0; i < o; i++) { a += w * vnoise(x * f, y * f); f *= 2.03; w *= .5; } return a; }

  // Camera shot cycle – deterministic from race time so every viewer's overlay cuts at the same moments.
  const SHOT_CYCLE = [['establish', 7], ['chase', 9], ['side', 8], ['front', 7], ['overhead', 7], ['leader', 6], ['pack', 8], ['waterline', 8], ['sideFar', 7], ['front', 6], ['pack', 7], ['leader', 6]];
  const CYCLE_LEN = SHOT_CYCLE.reduce((a, s) => a + s[1], 0);
  function shotAt(t, toFinishM) {
    if (toFinishM !== null && toFinishM < 45) return 'finish';      // final approach: always the finish-line camera
    if (t < 6) return 'establish';
    let u = (t - 6) % CYCLE_LEN; for (const [k, d] of SHOT_CYCLE) { if (u < d) return k; u -= d; } return 'pack';
  }
  const SHOT_NAMES = [...new Set(SHOT_CYCLE.map(s => s[0]).concat(['finish']))];

  function create(THREE, canvas, opts = {}) {
    const D = opts.D || 6000, LOWQ = !!opts.lowq, ZF = zOf(D);
    const doc = opts.doc || (typeof document !== 'undefined' ? document : null);
    const scene = new THREE.Scene();
    const SUN_DIR = new THREE.Vector3(-.45, .62, .64).normalize();
    const FOG_COL = new THREE.Color().setRGB(.52, .66, .76), FOG_DENS = .0034;
    scene.background = FOG_COL.clone();
    scene.fog = new THREE.FogExp2(FOG_COL.getHex(), FOG_DENS);
    const camera = new THREE.PerspectiveCamera(50, 720 / 1280, 0.2, 1400);
    let renderer = null;
    if (!opts.noRender) {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: !LOWQ, alpha: false, powerPreference: 'high-performance' });
      renderer.setPixelRatio(opts.dpr || 1); renderer.setSize(720, 1280, false);
      renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.1;
      renderer.shadowMap.enabled = !LOWQ; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }

    // ---- sky dome (gradient + sun disc and halo, linear HDR) ----
    const SKY_GLSL = `
      vec3 skyCol(vec3 d, vec3 sd){ float h = clamp(d.y, -0.2, 1.0);
        vec3 zen = vec3(.06,.2,.52), hor = vec3(.62,.74,.84), low = vec3(.42,.52,.58);
        vec3 c = h > 0.0 ? mix(hor, zen, pow(h, .55)) : mix(hor, low, clamp(-h*5., 0., 1.));
        float s = max(dot(d, sd), 0.0);
        c += vec3(1.0,.82,.6) * (pow(s, 8.) * .35 + pow(s, 64.) * .6) + vec3(12.,10.,8.) * smoothstep(.9994,.9997,s);
        return c; }`;
    const skyU = { uSun: { value: SUN_DIR } };
    const sky = new THREE.Mesh(new THREE.SphereGeometry(1200, 48, 24), new THREE.ShaderMaterial({ uniforms: skyU, side: THREE.BackSide, depthWrite: false, fog: false,
      vertexShader: `varying vec3 vD; void main(){ vD = normalize(position); vec4 p = projectionMatrix * modelViewMatrix * vec4(position,1.); gl_Position = p.xyww; }`,
      fragmentShader: `uniform vec3 uSun; varying vec3 vD; ${SKY_GLSL}
        void main(){ vec3 d = normalize(vD); vec3 c = skyCol(d, uSun);
          gl_FragColor = vec4(c, 1.);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }` }));
    sky.renderOrder = -1; sky.frustumCulled = false; scene.add(sky);

    // environment map from the sky => real reflections on the glossy ducks and metalwork
    if (renderer) { try { const envScene = new THREE.Scene(); envScene.add(new THREE.Mesh(sky.geometry, sky.material)); const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(envScene, 0.02).texture; pm.dispose(); } catch (e) {} }

    // ---- lights: late-morning sun ----
    const hemi = new THREE.HemisphereLight('#cfe2ff', '#4a5a34', .4); scene.add(hemi);
    const sun = new THREE.DirectionalLight('#fff0dc', 3.1); sun.castShadow = !LOWQ;
    const SM = LOWQ ? 512 : 2048; sun.shadow.mapSize.set(SM, SM); Object.assign(sun.shadow.camera, { left: -55, right: 55, top: 55, bottom: -55, near: 1, far: 260 }); sun.shadow.bias = -0.0006; sun.shadow.normalBias = .03;
    scene.add(sun, sun.target);

    // ---- the river: shader water ----
    const duckU = []; for (let i = 0; i < MAXW; i++) duckU.push(new THREE.Vector4(0, 0, 0, 0));
    const waterU = { uT: { value: 0 }, uSun: { value: SUN_DIR }, uDucks: { value: duckU }, uN: { value: 0 }, uFog: { value: FOG_COL }, uFogD: { value: FOG_DENS }, uHW: { value: HALF_W } };
    const WAKE_N = LOWQ ? 12 : MAXW;
    const waterLen = -ZF + 420;
    const water = new THREE.Mesh(new THREE.PlaneGeometry(HALF_W * 2 + 14, waterLen, LOWQ ? 24 : 48, LOWQ ? 240 : 520), new THREE.ShaderMaterial({
      uniforms: waterU,
      vertexShader: `uniform float uT; varying vec3 vW; varying float vDist;
        void main(){ vec4 w = modelMatrix * vec4(position,1.0);
          w.y += sin(w.x*.31 + uT*1.3)*.05 + sin(w.z*.19 + uT*1.7)*.07 + sin((w.x*.7+w.z*.5) + uT*2.4)*.03;
          vW = w.xyz; vec4 mv = viewMatrix * w; vDist = -mv.z; gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `uniform float uT; uniform vec3 uSun; uniform vec4 uDucks[${MAXW}]; uniform int uN; uniform vec3 uFog; uniform float uFogD; uniform float uHW;
        varying vec3 vW; varying float vDist;
        ${SKY_GLSL}
        float h21(vec2 p){ p = fract(p*vec2(123.34, 456.21)); p += dot(p, p+45.32); return fract(p.x*p.y); }
        float vn(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f*f*(3.-2.*f);
          return mix(mix(h21(i), h21(i+vec2(1,0)), u.x), mix(h21(i+vec2(0,1)), h21(i+vec2(1,1)), u.x), u.y); }
        float hgt(vec2 p){ // flowing river surface: current runs toward -z
          vec2 q = p + vec2(0., uT*2.2);
          float a = vn(q*.35)*.5 + vn(q*.9 + vec2(uT*.3, 0.))*.28 + vn(q*2.3 - vec2(0., uT*1.1))*.14 + vn(q*5.1 + vec2(uT*.7, uT*1.9))*.07;
          return a; }
        void main(){
          vec2 p = vW.xz; float e = .06;
          float h0 = hgt(p); vec3 n = normalize(vec3((h0 - hgt(p+vec2(e,0.)))/e*.55, 1., (h0 - hgt(p+vec2(0.,e)))/e*.55));
          // duck wakes: Kelvin V (~19.5 deg) + bow ring + turbulent stern wash
          float foam = 0.;
          for (int i = 0; i < ${WAKE_N}; i++) { if (i >= uN) break; vec4 d = uDucks[i];
            vec2 r = p - d.xy; if (dot(r, r) > 1600.) continue; float sp = d.z; if (sp < .02) { foam += exp(-pow(length(r)-2.1, 2.)*3.)*.18; continue; }
            float bz = r.y; float ax = abs(r.x);
            float arm = exp(-pow((ax - max(bz,0.)*.36 - 1.1)/(.16 + max(bz,0.)*.05), 2.)) * step(-.5, bz) * exp(-max(bz,0.)/(3. + sp*2.)) * (.6 + .4*vn(p*2.5 + vec2(0., uT*4.)));
            float stern = exp(-ax*ax*1.1) * smoothstep(.5, 2., bz) * exp(-max(bz,0.)/(1.8 + sp*1.4)) * smoothstep(.35, .8, vn(p*4. + vec2(0., uT*6.)));
            float bow = exp(-pow(length(r*vec2(1.,.75)) - 2.2, 2.)*5.) * step(bz, .6) * (.5 + .5*vn(p*5. + uT*3.));
            float k = (arm*.4 + stern*.5 + bow*.45) * clamp(sp, 0., 1.2);
            foam += k; n.xz += (r/(length(r)+.5)) * arm * sp * .25; }
          n = normalize(n);
          vec3 V = normalize(cameraPosition - vW);
          float fres = .02 + .98*pow(1. - max(dot(n, V), 0.), 5.);
          vec3 R = reflect(-V, n); R.y = abs(R.y);
          vec3 refl = skyCol(R, uSun);
          // body colour: deep green-teal in the channel, lighter silty olive near the banks
          float edge = smoothstep(uHW - 7., uHW + 1., abs(vW.x));
          vec3 deep = vec3(.010,.060,.065), shal = vec3(.07,.11,.07);
          vec3 body = mix(deep, shal, edge) * (.8 + .4*max(dot(n, uSun), 0.));
          body += vec3(.02,.05,.045) * pow(max(dot(V, -uSun)*.5+.5, 0.), 4.);   // sub-surface glow
          vec3 c = mix(body, refl, clamp(fres, 0., 1.) * .85);
          vec3 H = normalize(uSun + V); float spec = pow(max(dot(n, H), 0.), 900.) * 40. + pow(max(dot(n, H), 0.), 90.) * .7;
          c += vec3(1., .9, .75) * spec;
          // bank foam line + flowing foam streaks + wakes
          float bank = smoothstep(uHW - 2.6, uHW + .3, abs(vW.x)) * (.45 + .55*vn(p*vec2(1.6,.6) + vec2(0., uT*2.)));
          float streak = smoothstep(.88, .98, vn(p*vec2(.6, .12) + vec2(0., uT*.35))) * .08;
          float f = clamp(bank + streak + min(foam, .75), 0., 1.);
          c = mix(c, vec3(.92,.95,.95) * (.75 + .35*max(dot(n,uSun),0.)), f * .85);
          float fogF = 1. - exp(-pow(uFogD * vDist, 2.)); c = mix(c, uFog, fogF);
          gl_FragColor = vec4(c, 1.);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`
    }));
    water.rotation.x = -Math.PI / 2; water.position.set(0, 0, (ZF + 160) / 2 - 50); scene.add(water);

    // ---- banks: displaced terrain with vertex colours (wet mud -> sandy silt -> mixed grasses) ----
    const L = -ZF + 520, zc = ZF / 2 - 30;
    const mudC = new THREE.Color('#2e261c'), siltC = new THREE.Color('#6a5b40'), g1 = new THREE.Color('#3d6a26'), g2 = new THREE.Color('#5d8b2e'), g3 = new THREE.Color('#2a4a1d'), dry = new THREE.Color('#8a8a4a'), tmp = new THREE.Color();
    function bankHeight(d, z) { if (d < 0) return -1.2; const slope = smooth(d / 7) * 1.6; return -.5 + slope + fbm(d * .05, z * .03) * 3.2 * smooth((d - 4) / 25) + fbm(d * .4, z * .4, 2) * .25; }
    const bankMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .95, metalness: 0 });
    for (const sd of [-1, 1]) {
      const W = 150, geo = new THREE.PlaneGeometry(W, L, LOWQ ? 40 : 110, LOWQ ? 220 : 560); geo.rotateX(-Math.PI / 2);
      const pos = geo.attributes.position, cols = new Float32Array(pos.count * 3);
      for (let i = 0; i < pos.count; i++) {
        const lx = pos.getX(i) + W / 2, z = pos.getZ(i) + zc, d = lx - 1.5;   // d: distance from the waterline
        const y = bankHeight(d, z); pos.setXYZ(i, sd * (HALF_W - 1.5 + lx), y, z);
        const n = fbm(lx * .08 + sd * 9, z * .05, 3), n2 = vnoise(lx * .7, z * .7);
        if (d < 1.5) tmp.copy(mudC); else if (d < 4.5) tmp.copy(siltC).lerp(mudC, clamp((4.5 - d) / 3, 0, 1) * .6);
        else { tmp.copy(g1).lerp(g2, n).lerp(g3, clamp(n2 - .45, 0, 1)); if (n > .66) tmp.lerp(dry, (n - .66) * 1.6); tmp.lerp(siltC, clamp((7 - d) / 3, 0, 1)); }
        tmp.multiplyScalar(.85 + n2 * .3); cols[i * 3] = tmp.r; cols[i * 3 + 1] = tmp.g; cols[i * 3 + 2] = tmp.b;
      }
      geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
      if (sd < 0) { const ix = geo.index.array; for (let i = 0; i < ix.length; i += 3) { const t = ix[i + 1]; ix[i + 1] = ix[i + 2]; ix[i + 2] = t; } }   // mirrored side: keep faces pointing up
      geo.computeVertexNormals();
      const bank = new THREE.Mesh(geo, bankMat); bank.receiveShadow = true; scene.add(bank);
    }
    const bankY = (x, z) => bankHeight(Math.abs(x) - HALF_W, z);

    // ---- scenery: instanced, deterministic placement ----
    const rnd = mulberry(20261108), dummy = new THREE.Object3D(), col = new THREE.Color();
    const zr = () => 120 - rnd() * (L - 60);
    function inst(geo, mat, n, place, shadow = true) { const m = new THREE.InstancedMesh(geo, mat, n); for (let i = 0; i < n; i++) { dummy.position.set(0, 0, 0); dummy.rotation.set(0, 0, 0); dummy.scale.set(1, 1, 1); col.set('#ffffff'); place(i, dummy, col); dummy.updateMatrix(); m.setMatrixAt(i, dummy.matrix); m.setColorAt(i, col); } m.castShadow = shadow && !LOWQ; m.receiveShadow = true; scene.add(m); return m; }
    function jitter(geo, amt, seed) { const p = geo.attributes.position, r = mulberry(seed); const seen = new Map();
      for (let i = 0; i < p.count; i++) { const k = p.getX(i).toFixed(3) + ',' + p.getY(i).toFixed(3) + ',' + p.getZ(i).toFixed(3); let f = seen.get(k); if (f === undefined) { f = 1 + (r() - .5) * amt; seen.set(k, f); } p.setXYZ(i, p.getX(i) * f, p.getY(i) * f, p.getZ(i) * f); }
      geo.computeVertexNormals(); return geo; }
    // rocks (three jittered shapes), some half-submerged along the waterline
    const rockM = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: .88, flatShading: true });
    for (let v = 0; v < 3; v++) inst(jitter(new THREE.IcosahedronGeometry(1, 1), .45, 7 + v), rockM, LOWQ ? 24 : 70, (i, d, c) => { const sd = rnd() < .5 ? -1 : 1, edge = rnd() < .6, x = sd * (HALF_W + (edge ? -1 + rnd() * 3 : 3 + rnd() * 40)), z = zr();
      d.position.set(x, edge ? -.2 : bankY(x, z) - .2, z); d.rotation.set(rnd() * 3, rnd() * 3, rnd() * 3); const s = edge ? .7 + rnd() * 1.6 : .5 + rnd() * 1.4; d.scale.set(s * (1 + rnd() * .6), s * (.5 + rnd() * .4), s); c.setHSL(.08 + rnd() * .04, .06 + rnd() * .08, .32 + rnd() * .18); });
    // reeds (tall thin blades in clumps) + bulrush heads
    const reedN = LOWQ ? 500 : 1800, reedPos = [];
    for (let k = 0; k < reedN / 12; k++) { const sd = rnd() < .5 ? -1 : 1, cx = sd * (HALF_W - .5 + rnd() * 4.5), cz = zr(); for (let j = 0; j < 12; j++) reedPos.push([cx + (rnd() - .5) * 2.4, cz + (rnd() - .5) * 3.2]); }
    const reedGeo = new THREE.ConeGeometry(.06, 1, 4, 1); reedGeo.translate(0, .5, 0);
    inst(reedGeo, new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: .8 }), reedPos.length, (i, d, c) => { const [x, z] = reedPos[i]; d.position.set(x, Math.max(-.3, bankY(x, z)) - .1, z); d.rotation.set((rnd() - .5) * .35, rnd() * 3, (rnd() - .5) * .35); d.scale.set(1, 2.4 + rnd() * 2.6, 1); c.setHSL(.2 + rnd() * .06, .45 + rnd() * .2, .2 + rnd() * .14); }, false);
    const rushGeo = new THREE.CapsuleGeometry(.11, .55, 3, 8);
    inst(rushGeo, new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: .9 }), Math.floor(reedPos.length / 9), (i, d, c) => { const [x, z] = reedPos[i * 9]; d.position.set(x, Math.max(-.3, bankY(x, z)) + 3.3 + rnd() * .8, z); d.rotation.set((rnd() - .5) * .2, 0, (rnd() - .5) * .2); c.setHSL(.07, .5, .14 + rnd() * .05); });
    // lily pads in the slack water by the banks
    const padGeo = new THREE.CircleGeometry(.9, 18, .25, Math.PI * 2 - .5); padGeo.rotateX(-Math.PI / 2);
    inst(padGeo, new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: .55, side: THREE.DoubleSide }), LOWQ ? 60 : 220, (i, d, c) => { const sd = rnd() < .5 ? -1 : 1; d.position.set(sd * (HALF_W - 2 - rnd() * 3.5), .08, zr()); d.rotation.y = rnd() * 6.3; d.scale.setScalar(.6 + rnd() * .9); c.setHSL(.27 + rnd() * .05, .45, .2 + rnd() * .08); }, false);
    // trees: broadleaf (trunk + 3 jittered canopy masses) and conifers, set back from the water
    const treeN = LOWQ ? 60 : 170, trees = [];
    for (let i = 0; i < treeN; i++) { const sd = rnd() < .5 ? -1 : 1, x = sd * (HALF_W + 12 + rnd() * 60), z = zr(); trees.push({ x, z, y: bankY(x, z), s: .8 + rnd() * .9, con: rnd() < .35 }); }
    const broad = trees.filter(t => !t.con), con = trees.filter(t => t.con);
    const barkM = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: .95 });
    const trunkGeo = new THREE.CylinderGeometry(.35, .6, 1, 7); trunkGeo.translate(0, .5, 0);
    inst(trunkGeo, barkM, trees.length, (i, d, c) => { const t = trees[i]; d.position.set(t.x, t.y - .3, t.z); d.scale.set(t.s, (t.con ? 3 : 6) * t.s, t.s); c.setHSL(.07, .25, .18 + rnd() * .06); });
    const leafM = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: .85, flatShading: false });
    const canopyGeo = jitter(new THREE.IcosahedronGeometry(1, 2), .32, 31);
    inst(canopyGeo, leafM, broad.length * 3, (i, d, c) => { const t = broad[Math.floor(i / 3)], k = i % 3; d.position.set(t.x + (k - 1) * 1.6 * t.s, t.y + (6.2 + (k === 1 ? 2 : 0)) * t.s, t.z + (rnd() - .5) * 2 * t.s); d.scale.set(3.4 * t.s, 2.8 * t.s, 3.4 * t.s); d.rotation.set(rnd(), rnd() * 6, rnd()); c.setHSL(.22 + rnd() * .07, .38 + rnd() * .15, .16 + rnd() * .09); });
    const coneGeo = new THREE.ConeGeometry(2.2, 4.5, 9); 
    inst(coneGeo, leafM, con.length * 3, (i, d, c) => { const t = con[Math.floor(i / 3)], k = i % 3; d.position.set(t.x, t.y + (3.6 + k * 2.6) * t.s, t.z); d.scale.setScalar((1.35 - k * .3) * t.s); c.setHSL(.33 + rnd() * .04, .35, .12 + rnd() * .05); });
    // distant ridge line (fog does the depth)
    for (let i = 0; i < 14; i++) { const sd = i % 2 ? 1 : -1, h = new THREE.Mesh(jitter(new THREE.IcosahedronGeometry(1, 2), .25, 100 + i), new THREE.MeshStandardMaterial({ color: '#41573a', roughness: 1, flatShading: true }));
      h.position.set(sd * (200 + rnd() * 120), -8, 160 - i * (L / 12)); h.scale.set(110 + rnd() * 60, 30 + rnd() * 26, 90 + rnd() * 50); scene.add(h); }

    // ---- canvas textures (null in Node tests) ----
    function canvasTex(w, h, draw) { if (!doc) return null; const cv = doc.createElement('canvas'); cv.width = w; cv.height = h; draw(cv.getContext('2d'), w, h); const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; }
    const checkerTex = canvasTex(512, 64, (g) => { for (let i = 0; i < 16; i++) for (let j = 0; j < 2; j++) { g.fillStyle = (i + j) % 2 ? '#141414' : '#f2f2f2'; g.fillRect(i * 32, j * 32, 32, 32); } });
    const bannerTex = (txt, sub) => canvasTex(2048, 320, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#16213a'); gr.addColorStop(1, '#0a1020'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
      g.fillStyle = '#d6a93a'; g.fillRect(0, 0, w, 10); g.fillRect(0, h - 10, w, 10);
      for (let i = 0; i < 64; i++) { g.fillStyle = i % 2 ? '#111' : '#eee'; g.fillRect(i * 32, 16, 32, 16); g.fillRect(i * 32 + (i % 2 ? -32 : 32) * 0, h - 32, 32, 16); }
      g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '800 150px "Montserrat","Arial Black",Arial,sans-serif'; g.fillStyle = '#f4f1e8'; g.fillText(txt, w / 2, h / 2 - (sub ? 18 : 0));
      if (sub) { g.font = '600 46px "Montserrat",Arial,sans-serif'; g.fillStyle = '#d6a93a'; g.fillText(sub, w / 2, h / 2 + 88); } });
    const boardTex = s => canvasTex(512, 256, (g, w, h) => { g.fillStyle = '#f3efe4'; g.fillRect(0, 0, w, h); g.strokeStyle = '#1b2440'; g.lineWidth = 14; g.strokeRect(7, 7, w - 14, h - 14); g.fillStyle = '#1b2440'; g.font = '800 120px "Montserrat",Arial,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(s, w / 2, h / 2 + 6); });
    const numTex = new Map(); function numberTex(n) { if (!numTex.has(n)) numTex.set(n, canvasTex(128, 128, (g) => { g.fillStyle = '#fbfbf7'; g.beginPath(); g.arc(64, 64, 60, 0, 7); g.fill(); g.lineWidth = 6; g.strokeStyle = '#151515'; g.stroke(); g.fillStyle = '#151515'; g.font = `800 ${n > 9 ? 64 : 78}px "Montserrat",Arial,sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(n), 64, 68); })); return numTex.get(n); }
    const softTex = canvasTex(64, 64, (g) => { const r = g.createRadialGradient(32, 32, 1, 32, 32, 31); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(.4, 'rgba(255,255,255,.5)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, 64, 64); });
    const blobTex = canvasTex(64, 64, (g) => { const r = g.createRadialGradient(32, 32, 2, 32, 32, 30); r.addColorStop(0, 'rgba(0,10,10,.55)'); r.addColorStop(1, 'rgba(0,10,10,0)'); g.fillStyle = r; g.fillRect(0, 0, 64, 64); });

    // ---- course furniture: rope lines with floats, distance boards, start pontoon, finish gantry ----
    const ropeM = new THREE.MeshStandardMaterial({ color: '#d8d2c0', roughness: .8 });
    const floatM = new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: .35, clearcoat: .6 });
    const ropeX = HALF_W - 3.2, floatN = Math.floor(-ZF / 4);
    for (const sd of [-1, 1]) { const r = new THREE.Mesh(new THREE.CylinderGeometry(.05, .05, -ZF, 6), ropeM); r.rotation.x = Math.PI / 2; r.position.set(sd * ropeX, .18, ZF / 2); scene.add(r); }
    inst(new THREE.SphereGeometry(.32, 14, 10), floatM, floatN * 2, (i, d, c) => { const sd = i % 2 ? 1 : -1, k = Math.floor(i / 2); d.position.set(sd * ropeX, .14, -k * 4); d.scale.set(1, .8, 1.3); c.set(k % 5 === 0 ? '#c8352b' : k % 2 ? '#f2f0ea' : '#e88a1a'); });
    const postM = new THREE.MeshStandardMaterial({ color: '#4a3b2c', roughness: .9 });
    for (let m = 100; m < D * S; m += 100) { const z = -m, sd = (m / 100) % 2 ? 1 : -1, x = sd * (HALF_W + 3), y = bankY(x, z);
      const p = new THREE.Mesh(new THREE.BoxGeometry(.25, 3.4, .25), postM); p.position.set(x, y + 1.4, z); p.castShadow = !LOWQ; scene.add(p);
      const tx = boardTex((D * S - m) + 'm'); const b = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.6, .12), [postM, postM, postM, postM, new THREE.MeshStandardMaterial({ map: tx, color: tx ? '#ffffff' : '#eeeeee', roughness: .7 }), postM]);
      b.position.set(x - sd * .2, y + 3.3, z); b.rotation.y = sd > 0 ? -.55 : .55; b.castShadow = !LOWQ; scene.add(b); }
    // start pontoon (timber)
    const timberM = new THREE.MeshStandardMaterial({ color: '#7b5a3a', roughness: .85 });
    { const g = new THREE.Group(); g.position.z = 3.6; scene.add(g);
      for (let i = 0; i < 18; i++) { const pl = new THREE.Mesh(new THREE.BoxGeometry(HALF_W * 2 / 18 - .08, .22, 2.4), timberM); pl.position.set(-HALF_W + (i + .5) * HALF_W * 2 / 18, .32, 0); pl.receiveShadow = true; pl.castShadow = !LOWQ; g.add(pl); }
      for (const sd of [-1, 1]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(.35, .35, 6, 10), timberM); p.position.set(sd * (HALF_W + .5), 2.4, 0); p.castShadow = !LOWQ; g.add(p); } }
    // finish gantry (brushed steel truss + dark banner + chequered line)
    const steelM = new THREE.MeshStandardMaterial({ color: '#9aa3ad', roughness: .32, metalness: .9 });
    const finishGate = new THREE.Group(); finishGate.position.z = ZF; scene.add(finishGate);
    { const H = 13, span = HALF_W * 2 + 6;
      for (const sd of [-1, 1]) for (const dz of [-.8, .8]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(.22, .22, H, 10), steelM); p.position.set(sd * span / 2, H / 2 - .5, dz); p.castShadow = !LOWQ; finishGate.add(p);
        for (let k = 0; k < 6; k++) { const br = new THREE.Mesh(new THREE.CylinderGeometry(.07, .07, 2.3, 6), steelM); br.position.set(sd * span / 2, 1 + k * 2, 0); br.rotation.x = k % 2 ? .78 : -.78; finishGate.add(br); } }
      for (const dy of [0, 2.6]) for (const dz of [-.8, .8]) { const b = new THREE.Mesh(new THREE.CylinderGeometry(.16, .16, span, 10), steelM); b.rotation.z = Math.PI / 2; b.position.set(0, H - 1 - dy, dz); finishGate.add(b); }
      const tx = bannerTex('FINISH', 'OASIS RADIO  ·  DUCK RACE'), bm = new THREE.MeshStandardMaterial({ map: tx, color: tx ? '#ffffff' : '#1a2440', roughness: .6, emissive: '#ffffff', emissiveMap: tx, emissiveIntensity: tx ? .35 : 0 });
      const ban = new THREE.Mesh(new THREE.BoxGeometry(span - 2, 2.4, .18), [steelM, steelM, steelM, steelM, bm, bm]); ban.position.y = H - 2.3; ban.castShadow = !LOWQ; finishGate.add(ban);
      const line = new THREE.Mesh(new THREE.PlaneGeometry(HALF_W * 2, 1.6), new THREE.MeshStandardMaterial({ map: checkerTex, color: checkerTex ? '#ffffff' : '#dddddd', roughness: .5, transparent: true, opacity: .92 }));
      if (checkerTex) { checkerTex.wrapS = THREE.RepeatWrapping; checkerTex.repeat.set(3.5, 1); } line.rotation.x = -Math.PI / 2; line.position.y = .2; finishGate.add(line); }

    // ---- procedural rubber duck (lathe-turned body, clear-coat vinyl) ----
    const bodyProfile = []; for (let i = 0; i <= 24; i++) { const a = i / 24 * Math.PI; bodyProfile.push(new THREE.Vector2(Math.sin(a) * (1 - .12 * Math.pow(Math.cos(a), 2)) + 1e-3, -Math.cos(a) * .78)); }
    const G = {
      body: new THREE.LatheGeometry(bodyProfile, LOWQ ? 28 : 56), head: new THREE.SphereGeometry(.64, LOWQ ? 24 : 48, LOWQ ? 18 : 32), cheek: new THREE.SphereGeometry(.3, 20, 14),
      beak: new THREE.SphereGeometry(1, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), eye: new THREE.SphereGeometry(.105, 18, 14), glint: new THREE.SphereGeometry(.035, 8, 6),
      wing: new THREE.SphereGeometry(1, 28, 18), tail: new THREE.ConeGeometry(.5, 1.1, 24, 1, false), band: new THREE.TorusGeometry(.55, .07, 12, 40), plane: new THREE.PlaneGeometry(1, 1), decal: new THREE.CircleGeometry(.26, 28)
    };
    G.body.rotateX(Math.PI / 2); G.body.scale(1, 1, 1.25);   // lathe axis -> along the duck's length
    const M = {
      yellow: new THREE.MeshPhysicalMaterial({ color: '#ffc800', roughness: .24, clearcoat: 1, clearcoatRoughness: .05, envMapIntensity: .75 }),
      wing: new THREE.MeshPhysicalMaterial({ color: '#ffbb00', roughness: .28, clearcoat: 1, clearcoatRoughness: .08, envMapIntensity: .7 }),
      beak: new THREE.MeshPhysicalMaterial({ color: '#e8641a', roughness: .3, clearcoat: 1, clearcoatRoughness: .08 }),
      eye: new THREE.MeshPhysicalMaterial({ color: '#0b0b0b', roughness: .05, clearcoat: 1 }), glint: new THREE.MeshBasicMaterial({ color: '#ffffff' }),
      blob: blobTex ? new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, depthWrite: false }) : new THREE.MeshBasicMaterial({ color: '#001010', transparent: true, opacity: .3, depthWrite: false })
    };
    function makeDuck(color, num) {
      const root = new THREE.Group(), bob = new THREE.Group(); root.add(bob);
      const add = (geo, mat, x, y, z, sx = 1, sy = 1, sz = 1, rx = 0, ry = 0, rz = 0, par = bob) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.scale.set(sx, sy, sz); m.rotation.set(rx, ry, rz); m.castShadow = !LOWQ; par.add(m); return m; };
      add(G.body, M.yellow, 0, .5, .1, 1, .95, 1);
      add(G.cheek, M.yellow, 0, .95, -.72, 1.9, 1.3, 1.6);                     // chest swell
      add(G.tail, M.yellow, 0, 1.0, 1.25, 1, 1, .7, -1.15);                    // upturned tail
      const headG = new THREE.Group(); headG.position.set(0, 1.72, -.72); bob.add(headG);
      add(G.head, M.yellow, 0, 0, 0, 1, .97, 1.02, 0, 0, 0, headG);
      for (const sd of [-1, 1]) add(G.cheek, M.yellow, sd * .32, -.16, -.2, .9, .8, .9, 0, 0, 0, headG);
      add(G.beak, M.beak, 0, -.08, -.6, .36, .13, .44, -.08, 0, 0, headG);   // upper bill
      add(G.beak, M.beak, 0, -.12, -.57, .3, .07, .36, Math.PI + .12, 0, 0, headG);  // lower bill
      for (const sd of [-1, 1]) { add(G.eye, M.eye, sd * .28, .16, -.5, 1, 1.25, .8, 0, 0, 0, headG); add(G.glint, M.glint, sd * .28 + .035, .21, -.585, 1, 1, 1, 0, 0, 0, headG);
        add(G.wing, M.wing, sd * .88, .8, .3, .2, .38, .68, .15, 0, sd * .32); }
      const bandM = new THREE.MeshPhysicalMaterial({ color: color || '#c8352b', roughness: .35, clearcoat: .8 });
      const band = add(G.band, bandM, 0, 1.28, -.68, 1, 1, .9, 1.45);
      const tx = numberTex(num), dm = new THREE.MeshStandardMaterial({ map: tx, color: tx ? '#ffffff' : '#f0f0f0', roughness: .4, polygonOffset: true, polygonOffsetFactor: -2 });
      for (const sd of [-1, 1]) { const dcl = add(G.decal, dm, sd * 1.005, .62, .25, 1, 1, 1, 0, sd * Math.PI / 2, 0); dcl.castShadow = false; }
      const blob = new THREE.Mesh(G.plane, M.blob); blob.rotation.x = -Math.PI / 2; blob.position.set(0, .03, .1); blob.scale.set(3, 3.8, 1); root.add(blob);
      root.scale.setScalar(1.45);
      return { root, bob, head: headG, band, bandM };
    }

    // ---- spray particles (bow spray on surges, splashes) ----
    const SPN = LOWQ ? 160 : 600, spPos = new Float32Array(SPN * 3), spVel = new Float32Array(SPN * 3), spLife = new Float32Array(SPN);
    const spGeo = new THREE.BufferGeometry(); spGeo.setAttribute('position', new THREE.BufferAttribute(spPos, 3));
    const spray = new THREE.Points(spGeo, new THREE.PointsMaterial({ map: softTex, color: '#e9f3f2', size: .45, sizeAttenuation: true, transparent: true, opacity: .85, depthWrite: false }));
    spray.frustumCulled = false; scene.add(spray); let spI = 0; for (let i = 0; i < SPN; i++) spPos[i * 3 + 1] = -50;
    const prnd = mulberry(4242);
    function emit(x, z, n, power) { for (let k = 0; k < n; k++) { const i = spI++ % SPN; spPos[i * 3] = x + (prnd() - .5) * 1.6; spPos[i * 3 + 1] = .3; spPos[i * 3 + 2] = z + (prnd() - .5) * .8;
      spVel[i * 3] = (prnd() - .5) * 3 * power; spVel[i * 3 + 1] = (1.5 + prnd() * 2.5) * power; spVel[i * 3 + 2] = (prnd() - .2) * 2 * power; spLife[i] = .6 + prnd() * .5; } }

    // ---- ducks ----
    let ducks = new Map(), N = 0;
    function setDucks(list) {
      const keep = new Set(list.map(m => String(m.id)));
      for (const [id, d] of ducks) if (!keep.has(id)) { scene.remove(d.root); ducks.delete(id); }
      N = list.length;
      list.forEach((m, i) => { const id = String(m.id); let d = ducks.get(id); if (!d) { d = makeDuck(m.color, i + 1); d.lastSp = 0; d.yaw = 0; d.sx = 0; d.sz = 0; scene.add(d.root); ducks.set(id, d); } d.idx = i; d.bandM.color.set(m.color || '#c8352b'); });
    }

    // ---- camera director ----
    const cam = { pos: new THREE.Vector3(0, 12, 30), look: new THREE.Vector3(0, 1, -6), fov: 50, shot: 'entries', from: null, blendT0: 0, first: true };
    const P = (x, y, z) => new THREE.Vector3(x, y, z);
    function pose(shot, now, t, L_) {
      const { lead, first, last, mid, xmin, xmax, span } = L_, w = Math.max(10, xmax - xmin + 8), osc = Math.sin(now / 4300);
      switch (shot) {
        case 'establish': { const a = clamp(t / 7, 0, 1); return [P(-22 + a * 14, 30 - a * 8, mid + 44 - a * 6), P(0, 0, mid - 30), 48]; }
        case 'chase': return [P(osc * 4, 5.2, last + 13), P(0, 1.2, first - 10), 50];
        case 'waterline': return [P(osc * 3, 1.7, last + 8), P(lead.x * .4, 1.2, first - 12), 56];
        case 'side': return [P(HALF_W + 7, 4.2, lead.z + 3), P(lead.x * .3, 1, lead.z + 7), 44];
        case 'sideFar': return [P(-(HALF_W + 16), 9, mid + 6), P(0, .5, mid - 2), 38];
        case 'front': return [P(lead.x * .6 + osc * 3, 2.4, first - 15), P(lead.x * .5, 1.4, first + 6), 46];
        case 'overhead': { const h = Math.max(34, span * 1.15, w * 1.9); return [P(0, h, mid + h * .18), P(0, 0, mid), 50]; }
        case 'leader': { const a = Math.sin(now / 3500) * .6; return [P(lead.x + Math.sin(a) * 9, 4.4, lead.z - 15 + Math.abs(Math.sin(a)) * 3), P(lead.x, 1.9, lead.z + 1.5), 38]; }   // from ahead: nothing between lens and leader
        case 'pack': { const fitV = (span + 10) / (2 * Math.tan(25 * Math.PI / 180)), fitH = w / (2 * Math.tan(15 * Math.PI / 180)); const dd = Math.max(26, fitV * .62, fitH * .8);
          return [P(0, dd * .78, mid + dd * .72), P(0, 0, mid - 2), 50]; }
        case 'finish': return [P(14, 4.2, ZF - 27), P(-3, 3.2, ZF + 10), 46];
        case 'podium': return [P(Math.sin(now / 3000) * 10, 6, ZF - 22), P(0, 1.6, ZF - 4), 46];
        default: return [P(Math.sin(now / 5000) * 6, 7, 24), P(0, 1, -4), 50];   // entries: start line
      }
    }
    // Pack-safe framing: whatever the shot, pull the lens back (and up a little) along its own axis until the leader and the
    // front of the pack (top 6 by position; leader only for the close-up) sit inside a safe area clear of the HUD panels.
    const probe = new THREE.PerspectiveCamera(50, 720 / 1280, .2, 1400), pv = new THREE.Vector3(), SAFE_X = .86, SAFE_TOP = .74, SAFE_BOT = -.62;
    function inSafe(pts) { probe.updateMatrixWorld(); for (const o of pts) { pv.set(o.x, 1.4, o.z).project(probe); if (!(pv.z < 1 && pv.z > -1 && Math.abs(pv.x) < SAFE_X && pv.y < SAFE_TOP && pv.y > SAFE_BOT)) return false; } return true; }
    function fitPack(shot, tp, tl, fov, list) {
      const byZ = list.slice().sort((a, b) => b.p - a.p), need = shot === 'leader' ? byZ.slice(0, 1) : byZ.slice(0, Math.min(6, byZ.length));
      probe.fov = fov; probe.updateProjectionMatrix();
      for (let i = 0; i < 24; i++) { probe.position.copy(tp); probe.lookAt(tl); if (inSafe(need)) return i;
        pv.subVectors(tp, tl).multiplyScalar(.14); tp.add(pv); tp.y += .6; }
      return 24; }
    function direct(now, view, list, dt) {
      let shot, L_ = null;
      if (view.mode === 'entries' || !list.length) shot = 'entries';
      else if (view.mode === 'podium') shot = 'podium';
      else {
        const zs = list.map(d => d.z), xs = list.map(d => d.x), first = Math.min(...zs), last = Math.max(...zs), lead = list.reduce((a, d) => (d.p > a.p ? d : a));   // race leader by position, not by lane row
        L_ = { lead, first, last, mid: (first + last) / 2, xmin: Math.min(...xs), xmax: Math.max(...xs), span: last - first };
        const toFinish = view.mode === 'race' ? Math.max(0, first - ZF) : null;
        shot = view.forceShot || shotAt(view.t || 0, view.t > 5 ? toFinish : null);
      }
      if (!L_) L_ = { lead: { x: 0, z: ZF }, first: ZF, last: ZF, mid: ZF, xmin: -10, xmax: 10, span: 0 };
      const [tp, tl, fov] = pose(shot, now, view.t || 0, L_);
      tp.z = Math.max(tp.z, ZF - 40); tl.z = Math.max(tl.z, ZF - 40); tp.y = Math.max(tp.y, .8);
      if (list.length && view.mode === 'race') fitPack(shot, tp, tl, fov, list);
      if (shot !== cam.shot) { cam.from = { pos: cam.pos.clone(), look: cam.look.clone(), fov: cam.fov }; cam.blendT0 = now; cam.shot = shot; }
      if (cam.first || view.snap) { cam.pos.copy(tp); cam.look.copy(tl); cam.fov = fov; cam.first = false; cam.from = null; }
      else {
        const k = 1 - Math.exp(-dt * 7); cam.pos.lerp(tp, k); cam.look.lerp(tl, k); cam.fov = lerp(cam.fov, fov, k);
        if (cam.from) { const b = smooth((now - cam.blendT0) / 900); if (b >= 1) cam.from = null; else { cam.pos.lerpVectors(cam.from.pos, tp, b); cam.look.lerpVectors(cam.from.look, tl, b); cam.fov = lerp(cam.from.fov, fov, b); } }
      }
      camera.position.copy(cam.pos); camera.lookAt(cam.look); if (Math.abs(camera.fov - cam.fov) > .01) { camera.fov = cam.fov; camera.updateProjectionMatrix(); }
      sun.position.copy(cam.look).addScaledVector(SUN_DIR, 120); sun.target.position.copy(cam.look);
    }

    // frame: ducks = [{id, p, moving, speed, spin}] -> label anchors in 720x1280 screen space
    const v = new THREE.Vector3(), tmpV = new THREE.Vector3();
    let lastNow = 0;
    function frame(now, duckState, view) {
      const ts = now / 1000, dt = clamp((now - (lastNow || now)) / 1000, 0, .1); lastNow = now; waterU.uT.value = ts;
      const list = []; let wi = 0;
      for (const s of duckState) {
        const d = ducks.get(String(s.id)); if (!d) continue;
        const i = d.idx, x = laneX(i, N) + Math.sin(ts * .45 + i * 1.3) * .8, z = zOf(s.p) + laneBack(i, N);
        d.root.position.set(x, 0, z);
        const sp = clamp((s.speed || 0) / 32, 0, 1.6);            // ~1 at race pace
        const ph = ts * 2.2 + i * .9;
        d.bob.position.y = Math.sin(ph) * .07 + Math.sin(ph * 2.3) * .025;
        d.bob.rotation.z = Math.sin(ph * .8) * .07 + Math.sin(ts * 3.1 + i) * .02 * sp;
        d.bob.rotation.x = Math.sin(ph * 1.1) * .045 - (s.moving ? .04 + .04 * sp : 0);
        d.head.rotation.y = Math.sin(ts * .6 + i * 2) * .18; d.head.rotation.x = Math.sin(ts * 1.3 + i) * .05;
        const yawT = (s.spin || 0) + Math.sin(ts * .4 + i) * .12; d.yaw = lerp(d.yaw, yawT, .08); d.root.rotation.y = d.yaw;
        if (s.moving && sp - d.lastSp > .18 && wi < 40) emit(x, z - 2.4, 14, .6 + sp * .5);
        if (s.moving && prnd() < dt * 3 * sp) emit(x, z - 2.2, 2, .45);
        d.lastSp = lerp(d.lastSp, sp, .05);
        if (wi < MAXW) duckU[wi++].set(x, z, s.moving ? sp : 0, 1);
        list.push({ id: s.id, x, z, p: s.p });
      }
      waterU.uN.value = wi;
      for (let i = 0; i < SPN; i++) { if (spLife[i] <= 0) continue; spLife[i] -= dt; spVel[i * 3 + 1] -= 9.8 * dt; spPos[i * 3] += spVel[i * 3] * dt; spPos[i * 3 + 1] += spVel[i * 3 + 1] * dt; spPos[i * 3 + 2] += spVel[i * 3 + 2] * dt; if (spPos[i * 3 + 1] < 0 || spLife[i] <= 0) { spLife[i] = 0; spPos[i * 3 + 1] = -50; } }
      spGeo.attributes.position.needsUpdate = true;
      direct(now, view, list, dt);
      camera.updateMatrixWorld(); sky.position.copy(camera.position);
      if (renderer) renderer.render(scene, camera);
      const labels = list.map(o => { v.set(o.x, 4.4, o.z).project(camera); tmpV.set(o.x, 0, o.z);
        return { id: o.id, sx: (v.x * .5 + .5) * 720, sy: (-v.y * .5 + .5) * 1280, on: v.z < 1 && v.z > -1 && Math.abs(v.x) < 1.05 && Math.abs(v.y) < 1.05, dist: camera.position.distanceTo(tmpV) }; });
      return { labels, shot: cam.shot };
    }
    function setQuality(q) { if (!renderer) return; if (q.dpr) renderer.setPixelRatio(q.dpr); if (q.shadows === false) { renderer.shadowMap.enabled = false; sun.castShadow = false; } }
    return { setDucks, frame, setQuality, scene, camera, renderer, get duckCount() { return ducks.size; }, ZF };
  }
  return { create, laneX, laneBack, zOf, S, shotAt, SHOT_NAMES, SHOT_CYCLE };
});
