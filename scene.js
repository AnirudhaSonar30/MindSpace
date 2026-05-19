/* MindSpace — Inner Sky
   --------------------------------------------------------------
   A quiet pre-dawn sky with drifting motes carried by an invisible
   curl-noise flow, plus a small flock of folded paper planes that glide
   along smooth Catmull-Rom paths, banking as they turn and leaving soft
   fading trails. The whole scene inhales and exhales with the breath
   cycle (exposed on window.__mindspaceBreath / .__mindspacePhase).
*/

(function () {
  const canvas = document.getElementById('scene');
  if (!canvas || typeof THREE === 'undefined') return;

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(dpr);
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.autoClear = false;

  /* ============================================================
     Sky background — full-bleed shader quad
     ============================================================ */
  const skyScene = new THREE.Scene();
  const skyCam   = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const skyMat = new THREE.ShaderMaterial({
    depthTest: false,
    depthWrite: false,
    uniforms: {
      uTime:   { value: 0 },
      uAspect: { value: 1 },
      uBreath: { value: 0 },
    },
    vertexShader: /* glsl */`
      varying vec2 vUv;
      void main(){
        vUv = uv;
        gl_Position = vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */`
      precision highp float;
      varying vec2 vUv;
      uniform float uTime;
      uniform float uAspect;
      uniform float uBreath;

      float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float noise(vec2 p){
        vec2 i = floor(p);
        vec2 f = fract(p);
        float a = hash(i);
        float b = hash(i + vec2(1.0, 0.0));
        float c = hash(i + vec2(0.0, 1.0));
        float d = hash(i + vec2(1.0, 1.0));
        vec2 u = f*f*(3.0 - 2.0*f);
        return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
      }
      float fbm(vec2 p){
        float v = 0.0; float a = 0.5;
        for(int i = 0; i < 5; i++){
          v += a * noise(p);
          p = p * 2.04 + vec2(11.7, 3.1);
          a *= 0.5;
        }
        return v;
      }

      void main(){
        vec2 uv = vUv;
        float y = uv.y;

        /* vertical sky gradient — quiet hour before dawn */
        vec3 floorBand = vec3(0.026, 0.030, 0.082); // ground hint
        vec3 horizon   = vec3(0.295, 0.215, 0.255); // warm dusk band
        vec3 indigo    = vec3(0.092, 0.098, 0.190); // mid sky
        vec3 deep      = vec3(0.030, 0.038, 0.095); // top

        vec3 col = mix(floorBand, horizon, smoothstep(0.0, 0.32, y));
        col = mix(col, indigo,  smoothstep(0.28, 0.58, y));
        col = mix(col, deep,    smoothstep(0.56, 1.0, y));

        /* slow aurora / cloud wisps near the horizon band */
        vec2 p1 = vec2(uv.x * uAspect, uv.y) * vec2(2.8, 1.4)
                + vec2(uTime * 0.020, uTime * 0.006);
        float n = fbm(p1);
        float band = smoothstep(0.42, 0.80, n)
                   * smoothstep(0.04, 0.30, y)
                   * smoothstep(1.00, 0.42, y);
        col += vec3(0.20, 0.14, 0.22) * band * (0.45 + 0.25 * uBreath);

        /* faint stars in the upper half */
        vec2 sp = floor(uv * vec2(420.0 * uAspect, 420.0));
        float r = hash(sp);
        float star = step(0.9965, r) * smoothstep(0.40, 1.0, y);
        float tw = 0.5 + 0.5 * sin(uTime * 1.6 + r * 80.0);
        col += vec3(0.85, 0.92, 1.0) * star * tw * 0.55;

        /* soft vignette */
        vec2 vc = (uv - 0.5) * vec2(uAspect, 1.0);
        float v = smoothstep(1.10, 0.35, length(vc));
        col *= mix(0.74, 1.02, v);

        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
  skyScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), skyMat));

  /* ============================================================
     World scene + camera
     ============================================================ */
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, window.innerWidth/window.innerHeight, 0.1, 200);
  camera.position.set(0, 0, 22);

  /* Soft lighting for the paper planes */
  scene.add(new THREE.AmbientLight(0xfff0d8, 0.55));
  const key = new THREE.DirectionalLight(0xfff0d0, 1.15);
  key.position.set(4, 6, 5);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0x99aaff, 0.45);
  fill.position.set(-6, -2, 4);
  scene.add(fill);

  /* ============================================================
     Drifting motes — soft points moved by a smooth flow field
     ============================================================ */
  const M = 800;
  const BOX = { x: 18, y: 10, z: 11 };

  const mPos  = new Float32Array(M * 3);
  const mSeed = new Float32Array(M);
  const mSize = new Float32Array(M);
  const mHue  = new Float32Array(M);
  for (let i = 0; i < M; i++) {
    mPos[3*i]   = (Math.random()*2 - 1) * BOX.x;
    mPos[3*i+1] = (Math.random()*2 - 1) * BOX.y;
    mPos[3*i+2] = (Math.random()*2 - 1) * BOX.z;
    mSeed[i] = Math.random();
    mSize[i] = 0.55 + Math.random() * 1.7;
    mHue[i]  = Math.random();
  }
  const mGeo = new THREE.BufferGeometry();
  mGeo.setAttribute('position', new THREE.BufferAttribute(mPos,  3));
  mGeo.setAttribute('aSeed',    new THREE.BufferAttribute(mSeed, 1));
  mGeo.setAttribute('aSize',    new THREE.BufferAttribute(mSize, 1));
  mGeo.setAttribute('aHue',     new THREE.BufferAttribute(mHue,  1));

  const motesMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime:       { value: 0 },
      uPixelRatio: { value: dpr },
    },
    vertexShader: /* glsl */`
      attribute float aSeed;
      attribute float aSize;
      attribute float aHue;
      uniform float uTime;
      uniform float uPixelRatio;
      varying float vSeed;
      varying float vHue;
      void main(){
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mv;
        float tw = 0.55 + 0.45 * sin(uTime * 0.8 + aSeed * 20.0);
        gl_PointSize = aSize * tw * (62.0 * uPixelRatio) / max(-mv.z, 0.01);
        vSeed = aSeed;
        vHue  = aHue;
      }
    `,
    fragmentShader: /* glsl */`
      precision mediump float;
      varying float vSeed;
      varying float vHue;
      void main(){
        vec2 c = gl_PointCoord - 0.5;
        float d = length(c);
        if (d > 0.5) discard;
        float core = smoothstep(0.5, 0.0, d);
        float halo = pow(core, 1.35);
        // palette — warm white, cool moonlight, muted ember
        vec3 a = vec3(1.00, 0.94, 0.82);
        vec3 b = vec3(0.78, 0.86, 1.00);
        vec3 c2 = vec3(1.00, 0.78, 0.72);
        vec3 col = mix(a, b, smoothstep(0.0, 0.55, vHue));
        col = mix(col, c2, smoothstep(0.82, 1.0, vHue));
        float alpha = halo * 0.78;
        gl_FragColor = vec4(col * alpha, alpha);
      }
    `,
  });
  const motes = new THREE.Points(mGeo, motesMat);
  scene.add(motes);

  /* Smooth pseudo-curl flow — divergence-free enough to look fluid */
  const _v = [0, 0, 0];
  function flow(x, y, z, t, out) {
    const s = 0.16;
    const tt = t * 0.06;
    out[0] =  Math.sin(y*s         + tt*1.00) + 0.55 * Math.cos(z*s*1.3 - tt*0.7);
    out[1] =  Math.cos(z*s*0.9     + tt*1.20) + 0.55 * Math.sin(x*s*1.1 + tt*0.5);
    out[2] =  Math.sin(x*s*1.05    - tt*0.60) * 0.45 + 0.30 * Math.cos(y*s + tt*0.3);
    out[0] += 0.38; // gentle prevailing wind to the right
  }
  function updateMotes(dt, t, breath) {
    const arr = mGeo.attributes.position.array;
    const breathPull = (breath - 0.5) * 0.12 * dt;
    for (let i = 0; i < M; i++) {
      const ix = 3*i, iy = ix+1, iz = ix+2;
      flow(arr[ix], arr[iy], arr[iz], t, _v);
      const sp = 0.25 + mSeed[i] * 0.45;
      arr[ix] += _v[0] * sp * dt;
      arr[iy] += _v[1] * sp * dt;
      arr[iz] += _v[2] * sp * dt;
      // breath: tiny outward push on inhale, inward on exhale
      const r = Math.hypot(arr[ix], arr[iy], arr[iz]) + 1e-6;
      arr[ix] += (arr[ix] / r) * breathPull;
      arr[iy] += (arr[iy] / r) * breathPull;
      arr[iz] += (arr[iz] / r) * breathPull;
      // wrap when out of box
      if (Math.abs(arr[ix]) > BOX.x) arr[ix] = -Math.sign(arr[ix]) * BOX.x;
      if (Math.abs(arr[iy]) > BOX.y) arr[iy] = -Math.sign(arr[iy]) * BOX.y;
      if (Math.abs(arr[iz]) > BOX.z) arr[iz] = -Math.sign(arr[iz]) * BOX.z;
    }
    mGeo.attributes.position.needsUpdate = true;
  }

  /* ============================================================
     Paper planes — folded mesh + Catmull-Rom path + trail
     ============================================================ */
  function makePlaneMesh() {
    /* Local frame: +X right wing, +Y up (fold), +Z nose-forward */
    const geo = new THREE.BufferGeometry();
    const v = new Float32Array([
      // top — left half
      0.00,  0.00,  0.90,
     -0.55,  0.00, -0.70,
      0.00,  0.10, -0.50,
      // top — right half
      0.00,  0.00,  0.90,
      0.00,  0.10, -0.50,
      0.55,  0.00, -0.70,
      // bottom — left half (slight V downward)
      0.00, -0.02,  0.90,
     -0.55,  0.00, -0.70,
      0.00, -0.06, -0.50,
      // bottom — right half
      0.00, -0.02,  0.90,
      0.00, -0.06, -0.50,
      0.55,  0.00, -0.70,
    ]);
    geo.setAttribute('position', new THREE.BufferAttribute(v, 3));
    geo.computeVertexNormals();
    const mat = new THREE.MeshStandardMaterial({
      color: 0xeee5cf,
      roughness: 0.78,
      metalness: 0.0,
      side: THREE.DoubleSide,
      flatShading: true,
    });
    return new THREE.Mesh(geo, mat);
  }

  const trailVS = /* glsl */`
    attribute float aA;
    varying float vA;
    void main(){
      vA = aA;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;
  const trailFS = /* glsl */`
    precision mediump float;
    varying float vA;
    uniform vec3 uColor;
    void main(){
      gl_FragColor = vec4(uColor, vA * vA * 0.55);
    }
  `;

  class PaperPlane {
    constructor(seed) {
      this.seed = seed;
      const N = 7 + ((seed * 11) | 0) % 5;
      const baseY = (Math.random() * 2 - 1) * 2.6;
      const pts = [];
      for (let i = 0; i < N; i++) {
        const a = (i / N) * Math.PI * 2;
        const rx = 7 + Math.random() * 5.5;
        const rz = 5 + Math.random() * 4.0;
        pts.push(new THREE.Vector3(
          Math.cos(a + seed * 7) * rx + (Math.random() - 0.5) * 2.5,
          baseY + Math.sin(a * 1.5 + seed * 3) * (1.6 + Math.random() * 1.8),
          Math.sin(a + seed * 7) * rz + (Math.random() - 0.5) * 2.5,
        ));
      }
      this.curve = new THREE.CatmullRomCurve3(pts, true, 'catmullrom', 0.6);
      this.speed = 0.010 + Math.random() * 0.005;
      this.t = Math.random();

      this.mesh = makePlaneMesh();

      // Trail
      this.trailN = 36;
      const tp = new Float32Array(this.trailN * 3);
      const ta = new Float32Array(this.trailN);
      for (let i = 0; i < this.trailN; i++) ta[i] = 1.0 - i / this.trailN;
      const tg = new THREE.BufferGeometry();
      tg.setAttribute('position', new THREE.BufferAttribute(tp, 3));
      tg.setAttribute('aA',       new THREE.BufferAttribute(ta, 1));
      const tm = new THREE.ShaderMaterial({
        vertexShader: trailVS,
        fragmentShader: trailFS,
        uniforms: { uColor: { value: new THREE.Color(0xf4ead4) } },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      this.trail = new THREE.Line(tg, tm);
      this.trailGeo = tg;
      this.trailPos = tp;
      // seed trail to current position so it doesn't snap from origin
      const p0 = this.curve.getPoint(this.t);
      for (let i = 0; i < this.trailN; i++) {
        tp[3*i] = p0.x; tp[3*i+1] = p0.y; tp[3*i+2] = p0.z;
      }

      scene.add(this.mesh);
      scene.add(this.trail);

      this._a = new THREE.Vector3();
      this._b = new THREE.Vector3();
      this._c = new THREE.Vector3();
      this._right = new THREE.Vector3();
      this._up    = new THREE.Vector3();
      this._fwd   = new THREE.Vector3();
      this._fwd2  = new THREE.Vector3();
      this._turn  = new THREE.Vector3();
      this._mtx   = new THREE.Matrix4();
      this._bankQ = new THREE.Quaternion();
      this._worldUp = new THREE.Vector3(0, 1, 0);
      this._bank = 0;
    }
    update(dt, breath) {
      this.t = (this.t + dt * this.speed * (0.85 + breath * 0.30)) % 1;
      const a = this.curve.getPoint(this.t,                            this._a);
      const b = this.curve.getPoint((this.t + 0.006) % 1,              this._b);
      const c = this.curve.getPoint((this.t + 0.030) % 1,              this._c);

      this.mesh.position.copy(a);

      // forward = a → b
      this._fwd.copy(b).sub(a).normalize();
      // next-forward (for turn detection)
      this._fwd2.copy(c).sub(b).normalize();
      this._turn.crossVectors(this._fwd, this._fwd2);
      const yaw = this._turn.y;
      const targetBank = Math.max(-1.05, Math.min(1.05, yaw * 38.0));
      this._bank += (targetBank - this._bank) * Math.min(1, dt * 4.0);

      // Build orientation: nose points down +Z forward
      this._right.crossVectors(this._worldUp, this._fwd).normalize();
      if (this._right.lengthSq() < 1e-4) this._right.set(1, 0, 0);
      this._up.crossVectors(this._fwd, this._right).normalize();
      this._mtx.makeBasis(this._right, this._up, this._fwd);
      this.mesh.quaternion.setFromRotationMatrix(this._mtx);
      // bank around forward
      this._bankQ.setFromAxisAngle(this._fwd, this._bank);
      this.mesh.quaternion.premultiply(this._bankQ);

      // Shift trail back one slot, write current head
      const tp = this.trailPos;
      for (let i = this.trailN - 1; i > 0; i--) {
        tp[3*i]   = tp[3*(i-1)];
        tp[3*i+1] = tp[3*(i-1)+1];
        tp[3*i+2] = tp[3*(i-1)+2];
      }
      tp[0] = a.x; tp[1] = a.y; tp[2] = a.z;
      this.trailGeo.attributes.position.needsUpdate = true;
    }
  }

  const planes = [];
  for (let i = 0; i < 5; i++) planes.push(new PaperPlane(Math.random()));

  /* ============================================================
     Interaction
     ============================================================ */
  const mouse = { tx: 0, ty: 0, x: 0, y: 0 };
  window.addEventListener('mousemove', (e) => {
    mouse.tx = (e.clientX / window.innerWidth  - 0.5) *  2;
    mouse.ty = (e.clientY / window.innerHeight - 0.5) * -2;
  }, { passive: true });
  window.addEventListener('touchmove', (e) => {
    if (!e.touches.length) return;
    mouse.tx = (e.touches[0].clientX / window.innerWidth  - 0.5) *  2;
    mouse.ty = (e.touches[0].clientY / window.innerHeight - 0.5) * -2;
  }, { passive: true });

  let scrollT = 0, scrollTarget = 0;
  window.addEventListener('scroll', () => {
    const max = Math.max(1, document.body.scrollHeight - window.innerHeight);
    scrollTarget = Math.min(1, window.scrollY / max);
  }, { passive: true });

  function resize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    skyMat.uniforms.uAspect.value = window.innerWidth / window.innerHeight;
  }
  skyMat.uniforms.uAspect.value = window.innerWidth / window.innerHeight;
  window.addEventListener('resize', resize);

  /* ============================================================
     Breath cycle (kept identical to before for app.jsx readout)
     ============================================================ */
  window.__mindspaceBreath = 0;
  window.__mindspacePhase  = 'inhale';
  window.__mindspaceOverride = false;
  function breathAt(t) {
    const cycle = 12.0;
    const x = ((t % cycle) + cycle) % cycle;
    if (x < 4) {
      window.__mindspacePhase = 'inhale';
      const u = x / 4;
      return 0.5 - 0.5 * Math.cos(Math.PI * u);
    } else if (x < 6) {
      window.__mindspacePhase = 'hold';
      return 1.0;
    } else {
      window.__mindspacePhase = 'exhale';
      const u = (x - 6) / 6;
      return 0.5 + 0.5 * Math.cos(Math.PI * u);
    }
  }

  /* ============================================================
     Render loop
     ============================================================ */
  let prev = performance.now();
  const start = prev;
  function animate(now) {
    const dt = Math.min(0.05, (now - prev) / 1000);
    prev = now;
    const t = (now - start) / 1000;

    mouse.x += (mouse.tx - mouse.x) * 0.04;
    mouse.y += (mouse.ty - mouse.y) * 0.04;
    scrollT += (scrollTarget - scrollT) * 0.06;

    const computedBreath = breathAt(t);
    // If a UI component (breathing lab / right-now) is driving breath, defer.
    if (!window.__mindspaceOverride) {
      window.__mindspaceBreath = computedBreath;
    }
    const breath = window.__mindspaceBreath;

    skyMat.uniforms.uTime.value   = t;
    skyMat.uniforms.uBreath.value = breath;
    motesMat.uniforms.uTime.value = t;

    updateMotes(dt, t, breath);
    for (let i = 0; i < planes.length; i++) planes[i].update(dt, breath);

    // Camera parallax — mouse drift + slow scroll dolly
    camera.position.x = mouse.x * 1.6;
    camera.position.y = mouse.y * 1.0 + scrollT * 4.0;
    camera.position.z = 22 - scrollT * 4.0;
    camera.lookAt(0, scrollT * 1.4, 0);

    // Render: sky first (depth-less full quad), then world on top
    renderer.clear(true, true, true);
    renderer.render(skyScene, skyCam);
    renderer.clearDepth();
    renderer.render(scene, camera);

    requestAnimationFrame(animate);
  }
  requestAnimationFrame(animate);
})();
