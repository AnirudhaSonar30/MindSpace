// MindSpace — React Three Fiber sky scene
// Faithful port of scene.js. Same shader math, motes, paper planes, shooting stars.
// Manual bloom pipeline replaced with @react-three/postprocessing.
// Window globals kept for Phase 0 app.jsx compatibility; removed in 0.C.19.

import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import * as THREE from 'three'
import { useEffect, useRef } from 'react'
import { sceneEngine } from './scenes'
import { useMindSpaceStore } from './store'

declare global {
  interface Window {
    MindSpaceTriggerLightning: (() => void) | undefined
    MindSpacePlayThunder:      (() => void) | undefined
  }
}

// Internal reference shared between SkyBackground and CameraRig (same module)
let _skyMat: THREE.ShaderMaterial | null = null

// ─── Constants ────────────────────────────────────────────────────────────────
const M   = 420
const BOX = { x: 18, y: 10, z: 11 }
const _v  = new Float32Array(3)  // scratch for flow field (reused each frame)

const MODE_PROGRESS: Record<string, number> = {
  home: 0.0, breathe: 0.30, ground: 0.58, rest: 1.0,
}

// Per-mood sky adjustments (1.B.1) — blended over ~3 s on mood select
const MOOD_SKY: Record<string, { tint: [number,number,number]; star: number; fog: number }> = {
  drained:   { tint: [-0.020, -0.018,  0.045], star: 0.70, fog: 0.38 },
  tense:     { tint: [ 0.070,  0.012, -0.035], star: 0.88, fog: 0.08 },
  scattered: { tint: [ 0.018,  0.018,  0.050], star: 1.08, fog: 0.00 },
  tender:    { tint: [ 0.055,  0.018, -0.012], star: 0.95, fog: 0.12 },
  hopeful:   { tint: [ 0.038,  0.038,  0.018], star: 1.22, fog: 0.00 },
  calm:      { tint: [ 0.000,  0.000,  0.000], star: 1.00, fog: 0.00 },
}
const MOOD_NEUTRAL = { tint: [0, 0, 0] as [number,number,number], star: 1.0, fog: 0.0 }

// Updated by SkyBackground useFrame; read by CameraRig useFrame (same module)
let _moodStarMult = 1.0

// ─── GLSL shaders (identical to scene.js) ────────────────────────────────────
const SKY_VERT = /* glsl */`
  varying vec2 vUv;
  void main(){ vUv=uv; gl_Position=vec4(position,1.0); }
`

const SKY_FRAG = /* glsl */`
  precision highp float;
  varying vec2 vUv;
  uniform float uTime;
  uniform float uAspect;
  uniform float uBreath;
  uniform vec3  uFloor;
  uniform vec3  uHorizon;
  uniform vec3  uMid;
  uniform vec3  uDeep;
  uniform vec3  uBand;
  uniform float uStarBrightness;
  uniform vec3  uMoodTint;
  uniform float uMoodFog;

  float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
  float noise(vec2 p){
    vec2 i=floor(p); vec2 f=fract(p);
    float a=hash(i); float b=hash(i+vec2(1.,0.));
    float c=hash(i+vec2(0.,1.)); float d=hash(i+vec2(1.,1.));
    vec2 u=f*f*(3.-2.*f);
    return mix(mix(a,b,u.x),mix(c,d,u.x),u.y);
  }
  float fbm(vec2 p){
    float v=0.; float a=0.5;
    for(int i=0;i<5;i++){ v+=a*noise(p); p=p*2.04+vec2(11.7,3.1); a*=0.5; }
    return v;
  }
  void main(){
    vec2 uv=vUv; float y=uv.y;
    vec3 col=mix(uFloor,uHorizon,smoothstep(0.,0.32,y));
    col=mix(col,uMid,smoothstep(0.28,0.58,y));
    col=mix(col,uDeep,smoothstep(0.56,1.,y));
    vec2 p1=vec2(uv.x*uAspect,uv.y)*vec2(2.8,1.4)+vec2(uTime*.020,uTime*.006);
    float n=fbm(p1);
    float band=smoothstep(.42,.80,n)*smoothstep(.04,.30,y)*smoothstep(1.,.42,y);
    col+=uBand*band*(0.42+0.55*uBreath);
    vec2 sp=floor(uv*vec2(420.*uAspect,420.));
    float r=hash(sp);
    float star=smoothstep(.9965,1.,r)*smoothstep(.40,1.,y);
    float tw=.65+.35*sin(uTime*1.+r*80.);
    col+=vec3(.85,.92,1.)*star*tw*uStarBrightness*(0.75+0.55*uBreath);
    vec2 vc=(uv-.5)*vec2(uAspect,1.);
    float v=smoothstep(1.10+0.10*uBreath,.35,length(vc));
    col*=mix(.74,1.02+.04*uBreath,v);
    // Mood overlay: fog in lower sky + additive color tint
    float mFog=uMoodFog*(1.0-smoothstep(0.0,0.55,y));
    col=mix(col,col*0.50,mFog*0.70);
    col+=uMoodTint;
    col=max(col,vec3(0.0));
    gl_FragColor=vec4(col,1.);
  }
`

const MOTES_VERT = /* glsl */`
  attribute float aSeed;
  attribute float aSize;
  attribute float aHue;
  uniform float uTime;
  uniform float uPixelRatio;
  varying float vSeed;
  varying float vHue;
  void main(){
    vec4 mv=modelViewMatrix*vec4(position,1.0);
    gl_Position=projectionMatrix*mv;
    float tw=.55+.45*sin(uTime*.8+aSeed*20.);
    gl_PointSize=aSize*tw*(62.*uPixelRatio)/max(-mv.z,.01);
    vSeed=aSeed; vHue=aHue;
  }
`

const MOTES_FRAG = /* glsl */`
  precision mediump float;
  varying float vSeed;
  varying float vHue;
  void main(){
    vec2 c=gl_PointCoord-.5; float d=length(c);
    if(d>.5)discard;
    float core=smoothstep(.5,0.,d); float halo=pow(core,1.35);
    vec3 a=vec3(1.,.94,.82); vec3 b=vec3(.78,.86,1.); vec3 c2=vec3(1.,.78,.72);
    vec3 col=mix(a,b,smoothstep(0.,.55,vHue));
    col=mix(col,c2,smoothstep(.82,1.,vHue));
    float alpha=halo*.78;
    gl_FragColor=vec4(col*alpha,alpha);
  }
`

const TRAIL_VERT = /* glsl */`
  attribute float aA;
  varying float vA;
  void main(){ vA=aA; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }
`

const TRAIL_FRAG = /* glsl */`
  precision mediump float;
  varying float vA;
  uniform vec3 uColor;
  void main(){ gl_FragColor=vec4(uColor,vA*vA*.28); }
`

// ─── Breath cycle ─────────────────────────────────────────────────────────────
function computeBreath(t: number): { value: number; phase: string } {
  const cycle = 12.0
  const x = ((t % cycle) + cycle) % cycle
  if (x < 4) return { value: 0.5 - 0.5 * Math.cos(Math.PI * x / 4), phase: 'inhale' }
  if (x < 6) return { value: 1.0, phase: 'hold' }
  return { value: 0.5 + 0.5 * Math.cos(Math.PI * (x - 6) / 6), phase: 'exhale' }
}

// ─── Curl-noise-like flow field ───────────────────────────────────────────────
function flow(x: number, y: number, z: number, t: number): void {
  const s = 0.16, tt = t * 0.06
  _v[0] = Math.sin(y*s         + tt*1.00) + 0.55 * Math.cos(z*s*1.3  - tt*0.7)
  _v[1] = Math.cos(z*s*0.9     + tt*1.20) + 0.55 * Math.sin(x*s*1.1  + tt*0.5)
  _v[2] = Math.sin(x*s*1.05    - tt*0.60) * 0.45 + 0.30 * Math.cos(y*s + tt*0.3)
  _v[0] += 0.38
}

function updateMotes(arr: Float32Array, seeds: Float32Array, dt: number, t: number, breath: number): void {
  const breathPull = (breath - 0.5) * 0.12 * dt
  for (let i = 0; i < M; i++) {
    const ix = 3*i, iy = ix+1, iz = ix+2
    flow(arr[ix], arr[iy], arr[iz], t)
    const sp = 0.25 + seeds[i] * 0.45
    arr[ix] += _v[0] * sp * dt
    arr[iy] += _v[1] * sp * dt
    arr[iz] += _v[2] * sp * dt
    const r = Math.hypot(arr[ix], arr[iy], arr[iz]) + 1e-6
    arr[ix] += (arr[ix] / r) * breathPull
    arr[iy] += (arr[iy] / r) * breathPull
    arr[iz] += (arr[iz] / r) * breathPull
    if (Math.abs(arr[ix]) > BOX.x) arr[ix] = -Math.sign(arr[ix]) * BOX.x
    if (Math.abs(arr[iy]) > BOX.y) arr[iy] = -Math.sign(arr[iy]) * BOX.y
    if (Math.abs(arr[iz]) > BOX.z) arr[iz] = -Math.sign(arr[iz]) * BOX.z
  }
}

// ─── Paper plane mesh factory ─────────────────────────────────────────────────
function makePlaneMesh(): THREE.Mesh {
  const s = 0.55
  // 4 triangles: top-left, top-right, bottom-left, bottom-right wings
  const v = new Float32Array([
    0,       0,       .90*s,   -.55*s, 0,      -.70*s,  0,      .10*s, -.50*s,
    0,       0,       .90*s,   0,      .10*s,  -.50*s,  .55*s,  0,     -.70*s,
    0,      -.02*s,   .90*s,   -.55*s, 0,      -.70*s,  0,     -.06*s, -.50*s,
    0,      -.02*s,   .90*s,   0,     -.06*s,  -.50*s,  .55*s,  0,     -.70*s,
  ])
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(v, 3))
  geo.computeVertexNormals()
  return new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
    color: 0xf4eee0, roughness: 0.62, metalness: 0.04,
    side: THREE.DoubleSide, flatShading: false, transparent: true, opacity: 0.52,
  }))
}

// ─── PaperPlane class ─────────────────────────────────────────────────────────
class PaperPlane {
  curve:    THREE.CatmullRomCurve3
  speed:    number
  t:        number
  mesh:     THREE.Mesh
  trail:    THREE.Line
  trailGeo: THREE.BufferGeometry
  trailPos: Float32Array
  trailN:   number
  private _bank     = 0
  private _a        = new THREE.Vector3()
  private _b        = new THREE.Vector3()
  private _c        = new THREE.Vector3()
  private _right    = new THREE.Vector3()
  private _up       = new THREE.Vector3()
  private _fwd      = new THREE.Vector3()
  private _fwd2     = new THREE.Vector3()
  private _turn     = new THREE.Vector3()
  private _mtx      = new THREE.Matrix4()
  private _bankQ    = new THREE.Quaternion()
  private _worldUp  = new THREE.Vector3(0, 1, 0)

  constructor(seed: number) {
    const N = 7 + ((seed * 11) | 0) % 5
    const baseY = (Math.random() * 2 - 1) * 2.6
    const pts: THREE.Vector3[] = []
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2
      const rx = 7 + Math.random() * 5.5, rz = 5 + Math.random() * 4
      pts.push(new THREE.Vector3(
        Math.cos(a + seed*7)*rx + (Math.random()-.5)*2.5,
        baseY + Math.sin(a*1.5 + seed*3)*(1.6 + Math.random()*1.8),
        Math.sin(a + seed*7)*rz + (Math.random()-.5)*2.5,
      ))
    }
    this.curve = new THREE.CatmullRomCurve3(pts, true, 'catmullrom', 0.6)
    this.speed = 0.010 + Math.random() * 0.005
    this.t     = Math.random()
    this.mesh  = makePlaneMesh()

    this.trailN   = 36
    this.trailPos = new Float32Array(this.trailN * 3)
    const ta      = new Float32Array(this.trailN)
    for (let i = 0; i < this.trailN; i++) ta[i] = 1 - i / this.trailN
    this.trailGeo = new THREE.BufferGeometry()
    this.trailGeo.setAttribute('position', new THREE.BufferAttribute(this.trailPos, 3))
    this.trailGeo.setAttribute('aA',       new THREE.BufferAttribute(ta,            1))
    this.trail = new THREE.Line(this.trailGeo, new THREE.ShaderMaterial({
      vertexShader: TRAIL_VERT, fragmentShader: TRAIL_FRAG,
      uniforms: { uColor: { value: new THREE.Color(0xf4ead4) } },
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    }))
    // Seed trail to current position so it doesn't snap from origin
    const p0 = this.curve.getPoint(this.t, this._a)
    for (let i = 0; i < this.trailN; i++) {
      this.trailPos[3*i] = p0.x; this.trailPos[3*i+1] = p0.y; this.trailPos[3*i+2] = p0.z
    }
  }

  update(dt: number, breath: number): void {
    this.t = (this.t + dt * this.speed * (0.85 + breath * 0.30)) % 1
    const a = this.curve.getPoint(this.t,            this._a)
    const b = this.curve.getPoint((this.t+0.006)%1,  this._b)
    const c = this.curve.getPoint((this.t+0.030)%1,  this._c)
    this.mesh.position.copy(a)
    this._fwd.copy(b).sub(a).normalize()
    this._fwd2.copy(c).sub(b).normalize()
    this._turn.crossVectors(this._fwd, this._fwd2)
    const targetBank = Math.max(-1.05, Math.min(1.05, this._turn.y * 38))
    this._bank += (targetBank - this._bank) * Math.min(1, dt * 4)
    this._right.crossVectors(this._worldUp, this._fwd).normalize()
    if (this._right.lengthSq() < 1e-4) this._right.set(1, 0, 0)
    this._up.crossVectors(this._fwd, this._right).normalize()
    this._mtx.makeBasis(this._right, this._up, this._fwd)
    this.mesh.quaternion.setFromRotationMatrix(this._mtx)
    this._bankQ.setFromAxisAngle(this._fwd, this._bank)
    this.mesh.quaternion.premultiply(this._bankQ)
    // Shift trail back one slot, write new head
    const tp = this.trailPos
    for (let i = this.trailN - 1; i > 0; i--) {
      tp[3*i] = tp[3*(i-1)]; tp[3*i+1] = tp[3*(i-1)+1]; tp[3*i+2] = tp[3*(i-1)+2]
    }
    tp[0] = a.x; tp[1] = a.y; tp[2] = a.z
    this.trailGeo.attributes['position'].needsUpdate = true
  }

  dispose(): void {
    this.mesh.geometry.dispose()
    ;(this.mesh.material as THREE.Material).dispose()
    this.trail.geometry.dispose()
    ;(this.trail.material as THREE.Material).dispose()
  }
}

// ─── ShootingStar class ───────────────────────────────────────────────────────
class ShootingStar {
  line:   THREE.Line
  mat:    THREE.LineBasicMaterial
  active: boolean
  private geo:     THREE.BufferGeometry
  private pos:     Float32Array
  private life:    number
  private maxLife: number
  private x = 0; private y = 0; private z = 0
  private vx = 0; private vy = 0; private len = 2

  constructor() {
    this.geo = new THREE.BufferGeometry()
    this.pos = new Float32Array(6)
    this.geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3))
    this.mat = new THREE.LineBasicMaterial({
      color: 0xd8e8ff, transparent: true, opacity: 0,
      depthWrite: false, blending: THREE.AdditiveBlending,
    })
    this.line    = new THREE.Line(this.geo, this.mat)
    this.line.visible = false
    this.active  = false
    this.life    = 0
    this.maxLife = 0.28
  }

  spawn(): void {
    const angle = -0.20 - Math.random() * 0.28
    const speed = 22 + Math.random() * 18
    this.x = (Math.random()-.5)*24; this.y = 3.5+Math.random()*4.5; this.z = -1-Math.random()*6
    this.vx = Math.cos(angle)*speed; this.vy = Math.sin(angle)*speed
    this.len = 1.8 + Math.random()*2.8; this.life = 0
    this.maxLife = 0.22 + Math.random()*0.14; this.active = true; this.line.visible = true
  }

  update(dt: number): void {
    if (!this.active) return
    this.life += dt
    if (this.life >= this.maxLife) {
      this.active = false; this.line.visible = false; this.mat.opacity = 0; return
    }
    const t = this.life / this.maxLife
    this.mat.opacity = Math.sin(Math.PI * t) * 0.88
    const cx = this.x + this.vx * this.life
    const cy = this.y + this.vy * this.life
    this.pos[0] = cx - this.vx*this.len*0.07; this.pos[1] = cy - this.vy*this.len*0.07; this.pos[2] = this.z
    this.pos[3] = cx; this.pos[4] = cy; this.pos[5] = this.z
    this.geo.attributes['position'].needsUpdate = true
  }

  dispose(): void { this.geo.dispose(); this.mat.dispose() }
}

// ─── Sky background ───────────────────────────────────────────────────────────
// Full-screen quad; vertex shader bypasses all matrices (gl_Position=vec4(pos,1))
// so this works in a perspective-camera scene — renderOrder=-1 draws it first.
function SkyBackground() {
  const { scene } = useThree()
  const matRef       = useRef<THREE.ShaderMaterial | null>(null)
  const moodTintCur  = useRef(new THREE.Vector3(0, 0, 0))
  const moodFogCur   = useRef(0)
  const moodStarCur  = useRef(1.0)

  useEffect(() => {
    const mat = new THREE.ShaderMaterial({
      depthTest: false, depthWrite: false,
      uniforms: {
        uTime:           { value: 0 },
        uAspect:         { value: window.innerWidth / window.innerHeight },
        uBreath:         { value: 0 },
        uFloor:          { value: new THREE.Vector3(0.026, 0.030, 0.082) },
        uHorizon:        { value: new THREE.Vector3(0.295, 0.215, 0.255) },
        uMid:            { value: new THREE.Vector3(0.092, 0.098, 0.190) },
        uDeep:           { value: new THREE.Vector3(0.030, 0.038, 0.095) },
        uBand:           { value: new THREE.Vector3(0.200, 0.140, 0.220) },
        uStarBrightness: { value: 0.55 },
        uMoodTint:       { value: new THREE.Vector3(0, 0, 0) },
        uMoodFog:        { value: 0 },
      },
      vertexShader:   SKY_VERT,
      fragmentShader: SKY_FRAG,
    })
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat)
    mesh.renderOrder     = -1
    mesh.frustumCulled   = false
    mesh.matrixAutoUpdate = false
    scene.add(mesh)
    matRef.current = mat
    _skyMat        = mat
    return () => {
      scene.remove(mesh); mesh.geometry.dispose(); mat.dispose()
      _skyMat = null
    }
  }, [scene])

  useFrame(({ clock }, delta) => {
    const mat = matRef.current
    if (!mat) return
    mat.uniforms['uTime'].value   = clock.getElapsedTime()
    mat.uniforms['uBreath'].value = useMindSpaceStore.getState().breath
    mat.uniforms['uAspect'].value = window.innerWidth / window.innerHeight

    const cur  = sceneEngine.getScene()
    const prev = sceneEngine.getPrev()
    const scT  = sceneEngine.getT()
    const eT   = scT < 0.5 ? 2*scT*scT : -1+(4-2*scT)*scT
    const set3 = (key: string, v: [number,number,number]) =>
      mat.uniforms[key].value.set(v[0], v[1], v[2])
    const mix3 = (a: [number,number,number], b: [number,number,number], t: number): [number,number,number] =>
      [a[0]+(b[0]-a[0])*t, a[1]+(b[1]-a[1])*t, a[2]+(b[2]-a[2])*t]

    if (prev && scT < 1) {
      set3('uFloor',   mix3(prev.sky.floor,   cur.sky.floor,   eT))
      set3('uHorizon', mix3(prev.sky.horizon, cur.sky.horizon, eT))
      set3('uMid',     mix3(prev.sky.mid,     cur.sky.mid,     eT))
      set3('uDeep',    mix3(prev.sky.deep,    cur.sky.deep,    eT))
      set3('uBand',    mix3(prev.sky.band,    cur.sky.band,    eT))
    } else {
      set3('uFloor',   cur.sky.floor)
      set3('uHorizon', cur.sky.horizon)
      set3('uMid',     cur.sky.mid)
      set3('uDeep',    cur.sky.deep)
      set3('uBand',    cur.sky.band)
    }

    // Mood sky overlay — lerp over ~3 s (1.B.2)
    const moodId = useMindSpaceStore.getState().mood
    const mT     = MOOD_SKY[moodId] ?? MOOD_NEUTRAL
    const k      = 1 - Math.exp(-Math.min(delta, 0.1))
    const tc     = moodTintCur.current
    tc.x += (mT.tint[0] - tc.x) * k
    tc.y += (mT.tint[1] - tc.y) * k
    tc.z += (mT.tint[2] - tc.z) * k
    moodFogCur.current  += (mT.fog  - moodFogCur.current)  * k
    moodStarCur.current += (mT.star - moodStarCur.current) * k
    _moodStarMult = moodStarCur.current
    mat.uniforms['uMoodTint'].value.copy(tc)
    mat.uniforms['uMoodFog'].value = moodFogCur.current
  })

  return null
}

// ─── Drifting motes ───────────────────────────────────────────────────────────
function DriftingMotes() {
  const { scene } = useThree()
  const geoRef       = useRef<THREE.BufferGeometry | null>(null)
  const matRef       = useRef<THREE.ShaderMaterial | null>(null)
  const dataRef      = useRef<{ mPos: Float32Array; mSeed: Float32Array } | null>(null)
  const liteFrame    = useRef(0)

  useEffect(() => {
    const dpr   = Math.min(window.devicePixelRatio || 1, 2)
    const mPos  = new Float32Array(M * 3)
    const mSeed = new Float32Array(M)
    const mSize = new Float32Array(M)
    const mHue  = new Float32Array(M)
    for (let i = 0; i < M; i++) {
      mPos[3*i]   = (Math.random()*2-1)*BOX.x
      mPos[3*i+1] = (Math.random()*2-1)*BOX.y
      mPos[3*i+2] = (Math.random()*2-1)*BOX.z
      mSeed[i] = Math.random()
      mSize[i] = 0.55 + Math.random()*1.7
      mHue[i]  = Math.random()
    }
    dataRef.current = { mPos, mSeed }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(mPos,  3))
    geo.setAttribute('aSeed',    new THREE.BufferAttribute(mSeed, 1))
    geo.setAttribute('aSize',    new THREE.BufferAttribute(mSize, 1))
    geo.setAttribute('aHue',     new THREE.BufferAttribute(mHue,  1))
    const mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uTime: { value: 0 }, uPixelRatio: { value: dpr } },
      vertexShader:   MOTES_VERT,
      fragmentShader: MOTES_FRAG,
    })
    const points = new THREE.Points(geo, mat)
    scene.add(points)
    geoRef.current = geo; matRef.current = mat
    return () => { scene.remove(points); geo.dispose(); mat.dispose() }
  }, [scene])

  useFrame(({ clock }, delta) => {
    const geo = geoRef.current; const mat = matRef.current; const data = dataRef.current
    if (!geo || !mat || !data) return
    const dt = Math.min(0.05, delta), t = clock.getElapsedTime()
    const breath = useMindSpaceStore.getState().breath
    const body   = document.body
    const lite   = document.hidden ||
                   body.classList.contains('breath-focus') ||
                   body.classList.contains('has-journey-open') ||
                   body.classList.contains('amb-sleep')
    liteFrame.current++
    if (!lite || (liteFrame.current & 1) === 0) {
      updateMotes(data.mPos, data.mSeed, dt * (lite ? 2 : 1), t, breath)
      geo.attributes['position'].needsUpdate = true
    }
    mat.uniforms['uTime'].value = t
  })

  return null
}

// ─── Paper plane system ───────────────────────────────────────────────────────
function PaperPlaneSystem() {
  const { scene } = useThree()
  const planes = useRef<PaperPlane[]>([])

  useEffect(() => {
    planes.current = [0, 1, 2].map(() => new PaperPlane(Math.random()))
    planes.current.forEach(p => { scene.add(p.mesh); scene.add(p.trail) })
    return () => {
      planes.current.forEach(p => { scene.remove(p.mesh); scene.remove(p.trail); p.dispose() })
    }
  }, [scene])

  useFrame((_, delta) => {
    const dt     = Math.min(0.05, delta)
    const breath = useMindSpaceStore.getState().breath
    const body   = document.body
    const lite   = document.hidden ||
                   body.classList.contains('breath-focus') ||
                   body.classList.contains('has-journey-open') ||
                   body.classList.contains('amb-sleep')
    const curScene   = sceneEngine.getScene()
    const hidePlanes = body.classList.contains('amb-sleep') ||
                       body.classList.contains('amb-nothing') ||
                       curScene.id === 'forest-temple'
    for (const p of planes.current) {
      p.mesh.visible = !hidePlanes; p.trail.visible = !hidePlanes
    }
    if (!lite) for (const p of planes.current) p.update(dt, breath)
  })

  return null
}

// ─── Shooting star system ─────────────────────────────────────────────────────
function ShootingStarSystem() {
  const { scene } = useThree()
  const stars    = useRef<ShootingStar[]>([])
  const nextStar = useRef(18 + Math.random() * 30)

  useEffect(() => {
    stars.current = [0, 1, 2, 3].map(() => new ShootingStar())
    stars.current.forEach(s => scene.add(s.line))
    return () => { stars.current.forEach(s => { scene.remove(s.line); s.dispose() }) }
  }, [scene])

  useFrame((_, delta) => {
    const dt   = Math.min(0.05, delta)
    const body = document.body
    const lite = document.hidden ||
                 body.classList.contains('breath-focus') ||
                 body.classList.contains('has-journey-open') ||
                 body.classList.contains('amb-sleep')
    for (const s of stars.current) s.update(dt)
    if (!lite) {
      nextStar.current -= dt
      if (nextStar.current <= 0) {
        const ss = stars.current.find(s => !s.active)
        if (ss) ss.spawn()
        nextStar.current = 22 + Math.random() * 45
      }
    }
  })

  return null
}

// ─── Camera rig ───────────────────────────────────────────────────────────────
// Also owns: breath cycle → window globals, mode progress, star brightness update.
function CameraRig() {
  const { camera } = useThree()
  const mouse      = useRef({ tx: 0, ty: 0, x: 0, y: 0 })
  const scroll     = useRef({ val: 0, target: 0 })
  const modeT      = useRef(0)
  const modeTarget = useRef(0)

  useEffect(() => {
    camera.position.set(0, 0, 22)

    const onMove = (e: MouseEvent) => {
      mouse.current.tx = (e.clientX / window.innerWidth  - 0.5) *  2
      mouse.current.ty = (e.clientY / window.innerHeight - 0.5) * -2
    }
    const onTouch = (e: TouchEvent) => {
      if (!e.touches.length) return
      mouse.current.tx = (e.touches[0].clientX / window.innerWidth  - 0.5) *  2
      mouse.current.ty = (e.touches[0].clientY / window.innerHeight - 0.5) * -2
    }
    const onScroll = () => {
      const max = Math.max(1, document.body.scrollHeight - window.innerHeight)
      scroll.current.target = Math.min(1, window.scrollY / max)
    }
    window.addEventListener('mousemove', onMove,   { passive: true })
    window.addEventListener('touchmove', onTouch,  { passive: true })
    window.addEventListener('scroll',    onScroll, { passive: true })

    // Lightning trigger (called by atmosphere.jsx so visual + sound fire together)
    const flashEl = document.querySelector('.scene-veil-flash')
    window.MindSpaceTriggerLightning = () => {
      if (!flashEl) return
      flashEl.classList.remove('lightning-active')
      void (flashEl as HTMLElement).offsetWidth   // force reflow to restart animation
      flashEl.classList.add('lightning-active')
      setTimeout(() => flashEl.classList.remove('lightning-active'), 700)
      setTimeout(() => { if (window.MindSpacePlayThunder) window.MindSpacePlayThunder() }, 180)
    }

    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('touchmove', onTouch)
      window.removeEventListener('scroll',    onScroll)
      window.MindSpaceTriggerLightning = undefined
    }
  }, [camera])

  useFrame(({ clock }, delta) => {
    const t = clock.getElapsedTime()

    // Natural breath cycle — suppressed when a practice component takes override
    const br    = computeBreath(t)
    const store = useMindSpaceStore.getState()
    if (!store.override) store.setBreath(br.value, br.phase)

    // Animate scene transition T (0 → 1 over ~1.5 s)
    const scT = sceneEngine.getT()
    if (scT < 1) sceneEngine.setT(Math.min(1, scT + delta * 0.65))

    // Lerp mouse, scroll, mode
    mouse.current.x    += (mouse.current.tx                                - mouse.current.x)    * 0.10
    mouse.current.y    += (mouse.current.ty                                - mouse.current.y)    * 0.10
    scroll.current.val += (scroll.current.target                           - scroll.current.val) * 0.06
    modeTarget.current  = MODE_PROGRESS[store.mode] ?? 0
    modeT.current      += (modeTarget.current                              - modeT.current)      * 0.025

    // Star brightness rises as user goes deeper into a practice mode
    if (_skyMat) _skyMat.uniforms['uStarBrightness'].value = (0.55 + modeT.current * 0.38) * _moodStarMult

    // Camera parallax + scroll dolly + mode intimacy
    const cam = camera as THREE.PerspectiveCamera
    cam.fov = 40 - modeT.current * 4
    cam.updateProjectionMatrix()
    cam.position.x = mouse.current.x * 1.6
    cam.position.y = mouse.current.y * 1.0 + scroll.current.val * 4 + modeT.current * 0.8
    cam.position.z = 22 - scroll.current.val * 4 - modeT.current * 1.5
    cam.lookAt(0, scroll.current.val * 1.4 + modeT.current * 0.5, 0)
  })

  return null
}

// ─── Scene lighting ───────────────────────────────────────────────────────────
function SceneLighting() {
  return (
    <>
      <ambientLight color={0xfff8f0} intensity={1.10} />
      <directionalLight color={0xfff4e8} intensity={0.60} position={[4, 8, 8]} />
      <directionalLight color={0xaabfff} intensity={0.35} position={[-6, -2, 4]} />
    </>
  )
}

// ─── Export ───────────────────────────────────────────────────────────────────
export function SkyScene() {
  return (
    <Canvas
      style={{ position: 'fixed', inset: 0, zIndex: 0 }}
      gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
      camera={{ fov: 40, near: 0.1, far: 200 }}
      dpr={[1, 2]}
    >
      <SkyBackground />
      <SceneLighting />
      <DriftingMotes />
      <PaperPlaneSystem />
      <ShootingStarSystem />
      <CameraRig />
      <EffectComposer>
        <Bloom luminanceThreshold={0.42} intensity={0.35} mipmapBlur />
      </EffectComposer>
    </Canvas>
  )
}
