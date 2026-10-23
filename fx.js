// v4 시각 효과: 하늘·지형·풀·꽃·부유 입자, 타격 섬광, 무기별 베기 궤적, 충격파 링, 림라이트 주입
import * as THREE from './vendor/three.module.js';
const rnd = (a, b) => a + Math.random() * (b - a);

// ── 림라이트: 툰 재질에 프레넬 가장자리 빛을 추가 (재질 단위로 1회 주입)
export const RIM = { value: new THREE.Color(0xfff0d8) }, RIM_K = { value: 0.72 };
export function addRim(m) {
  if (!m || m.userData.rim || !m.isMeshToonMaterial) return; m.userData.rim = true;
  m.onBeforeCompile = (sh) => { sh.uniforms.rimCol = RIM; sh.uniforms.rimK = RIM_K;
    sh.fragmentShader = 'uniform vec3 rimCol; uniform float rimK;\n' + sh.fragmentShader.replace('#include <opaque_fragment>',
      'float rimF = pow(1.0 - clamp(dot(normalize(vNormal), normalize(vViewPosition)), 0.0, 1.0), 2.6);\noutgoingLight += rimCol * smoothstep(0.35, 0.9, rimF) * rimK;\n#include <opaque_fragment>'); };
  m.customProgramCacheKey = () => 'rim'; m.needsUpdate = true;
}

// ── 텍스처 유틸
function canvasTex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }
const starTex = canvasTex(128, 128, (g) => { const r = g.createRadialGradient(64, 64, 0, 64, 64, 64); r.addColorStop(0, '#fff'); r.addColorStop(0.18, '#fffbe8'); r.addColorStop(0.45, 'rgba(255,220,140,0.35)'); r.addColorStop(1, 'rgba(255,200,120,0)');
  g.fillStyle = r; g.fillRect(0, 0, 128, 128); g.globalCompositeOperation = 'lighter'; g.fillStyle = '#fff';
  for (let i = 0; i < 4; i++) { g.save(); g.translate(64, 64); g.rotate(i * Math.PI / 4); g.beginPath(); g.moveTo(-62, 0); g.lineTo(0, i % 2 ? -3 : -5); g.lineTo(62, 0); g.lineTo(0, i % 2 ? 3 : 5); g.fill(); g.restore(); } });
const ringTex = canvasTex(128, 128, (g) => { const r = g.createRadialGradient(64, 64, 40, 64, 64, 64); r.addColorStop(0, 'rgba(255,255,255,0)'); r.addColorStop(0.7, 'rgba(255,255,255,0.9)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, 128, 128); });
const xTex = canvasTex(64, 64, (g) => { g.strokeStyle = '#fff'; g.lineCap = 'round'; g.lineWidth = 9; g.beginPath(); g.moveTo(14, 14); g.lineTo(50, 50); g.moveTo(50, 14); g.lineTo(14, 50); g.stroke(); });
const trailTex = canvasTex(256, 32, (g, w, h) => { const a = g.createLinearGradient(0, 0, w, 0); a.addColorStop(0, 'rgba(255,255,255,0)'); a.addColorStop(0.7, 'rgba(255,255,255,0.55)'); a.addColorStop(1, 'rgba(255,255,255,1)'); g.fillStyle = a; g.fillRect(0, 0, w, h);
  g.globalCompositeOperation = 'destination-in'; const b = g.createLinearGradient(0, 0, 0, h); b.addColorStop(0, 'rgba(0,0,0,0)'); b.addColorStop(0.55, 'rgba(0,0,0,0.6)'); b.addColorStop(0.92, 'rgba(0,0,0,1)'); b.addColorStop(1, 'rgba(0,0,0,0.2)'); g.fillStyle = b; g.fillRect(0, 0, w, h); });
trailTex.colorSpace = THREE.NoColorSpace;
// v5.5: 타격 줄기(가늘고 긴 섬광)와 공격 예고 '!' 표시
const streakTex = canvasTex(256, 32, (g, w, h) => { const a = g.createLinearGradient(0, 0, w, 0); a.addColorStop(0, 'rgba(255,255,255,0)'); a.addColorStop(0.5, 'rgba(255,255,255,1)'); a.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = a; g.beginPath(); g.moveTo(0, h / 2); g.quadraticCurveTo(w / 2, -2, w, h / 2); g.quadraticCurveTo(w / 2, h + 2, 0, h / 2); g.fill(); });
export const warnTex = canvasTex(128, 128, (g) => { g.fillStyle = '#ff3b2f'; g.strokeStyle = '#fff'; g.lineWidth = 8; g.beginPath(); g.moveTo(64, 10); g.lineTo(120, 112); g.lineTo(8, 112); g.closePath(); g.fill(); g.stroke(); g.fillStyle = '#fff'; g.font = 'bold 70px sans-serif'; g.textAlign = 'center'; g.fillText('!', 64, 100); });

export function createFx(scene, camera) {
  const live = [];
  const spr = (tex, color, add = true) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color, transparent: true, depthWrite: false, depthTest: false, blending: add ? THREE.AdditiveBlending : THREE.NormalBlending })); s.renderOrder = 20; scene.add(s); return s; };
  // 타격 섬광: 별 + 링 (크기는 무기 무게/강타에 비례)
  function impact(pos, color = 0xfff2c0, size = 1, weak = false) {
    const s = spr(starTex, color); s.position.copy(pos); s.material.rotation = rnd(0, 3); live.push({ o: s, t: 0, d: 0.14 + 0.08 * Math.min(size, 2.2), s0: 0.55 * size, s1: 2.15 * size });
    const r = spr(ringTex, color); r.position.copy(pos); live.push({ o: r, t: 0, d: 0.2 + 0.1 * Math.min(size, 2.2), s0: 0.28 * size, s1: 2.7 * size });
    if (weak) { const x = spr(xTex, 0xff8a1a, false); x.position.copy(pos); x.material.depthTest = false; live.push({ o: x, t: 0, d: 0.35, s0: 0.75 * size, s1: 0.55 * size, hold: true }); }
  }
  // 바닥 충격파 (포효·내려찍기)
  const shockGeo = new THREE.RingGeometry(0.85, 1, 48).rotateX(-Math.PI / 2);
  function shock(pos, color = 0xffffff, r = 6, d = 0.5) { const m = new THREE.Mesh(shockGeo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
    m.position.set(pos.x, 0.08, pos.z); scene.add(m); live.push({ o: m, t: 0, d, s0: 0.5, s1: r, mesh: true }); }
  // 무기별 베기 궤적: 호(arc) 리본, 머리는 밝고 꼬리는 사라짐, 휘두르는 동안 펼쳐짐
  function trail(ent, o) { // o: {color, r, w, from, to, tilt, y, dur}
    const seg = 28, pos = [], uv = [], idx = [];
    for (let i = 0; i <= seg; i++) { const k = i / seg, a = o.from + (o.to - o.from) * k; for (const [rr, v] of [[o.r - o.w, 0], [o.r, 1]]) { pos.push(Math.sin(a) * rr, 0, Math.cos(a) * rr); uv.push(k, v); } }
    for (let i = 0; i < seg; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.setDrawRange(0, 0);
    const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: o.color, map: trailTex, transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }));
    const grp = new THREE.Group(); grp.position.copy(ent.pos); grp.position.y = o.y ?? 1.0; grp.rotation.order = 'YXZ'; grp.rotation.y = ent.face; grp.rotation.z = o.tilt || 0; grp.rotation.x = o.pitch || 0; grp.add(m); scene.add(grp);
    live.push({ o: grp, t: 0, d: o.dur || 0.24, trail: m, seg });
  }
  function slash(pos, color = 0xffffff, heavy = false) { const n = heavy ? 3 : 2, a0 = rnd(0, Math.PI);
    for (let i = 0; i < n; i++) { const st = spr(streakTex, i ? color : 0xffffff); st.position.copy(pos); st.material.rotation = a0 + (i - (n - 1) / 2) * 0.5 + rnd(-0.15, 0.15); live.push({ o: st, t: 0, d: heavy ? 0.28 : 0.15, s0: 0.45, s1: (heavy ? 5.0 : 2.9) * (1 - i * 0.18), streak: true }); } }
  function update(dt) {
    for (let i = live.length - 1; i >= 0; i--) { const L = live[i]; L.t += dt; const k = Math.min(1, L.t / L.d);
      if (L.trail) { const g = L.trail.geometry; g.setDrawRange(0, Math.ceil(Math.min(1, k * 2.6) * L.seg) * 6); L.trail.material.opacity = k < 0.4 ? 1 : 1 - (k - 0.4) / 0.6; }
      else { const e = 1 - Math.pow(1 - k, 3), s = L.s0 + (L.s1 - L.s0) * e; if (L.streak) L.o.scale.set(s, s * 0.16 * (1 - k * 0.6), 1); else L.o.scale.set(s, L.mesh ? 1 : s, s); L.o.material.opacity = L.hold ? (k < 0.6 ? 1 : 1 - (k - 0.6) / 0.4) : 1 - k; if (L.mesh) L.o.scale.y = 1; }
      if (k >= 1) { scene.remove(L.o); L.o.traverse(x => { if (x.isMesh || x.isSprite) { if (x.geometry && x.geometry !== shockGeo && !x.isSprite) x.geometry.dispose(); x.material.dispose(); } }); live.splice(i, 1); } }
  }
  return { impact, shock, trail, slash, update, get count() { return live.length; } };
}

// ── 환경: 하늘 돔, 언덕, 2단 나무, 풀숲, 꽃, 바위, 부유 꽃가루
export function buildEnv(scene, ARENA, toon) {
  const sky = new THREE.Mesh(new THREE.SphereGeometry(110, 32, 16), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: new THREE.Color(0x4f8fe8) }, mid: { value: new THREE.Color(0xa9d4ff) }, bot: { value: new THREE.Color(0xfbe6c8) } },
    vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: 'uniform vec3 top, mid, bot; varying vec3 vP; void main(){ float h = normalize(vP).y; vec3 c = h > 0.08 ? mix(mid, top, smoothstep(0.08, 0.6, h)) : mix(bot, mid, smoothstep(-0.05, 0.08, h)); gl_FragColor = vec4(c, 1.0); }' }));
  scene.add(sky);
  // 바닥: 잔디 텍스처 + 중앙이 약간 밝은 흙길 느낌
  const c = document.createElement('canvas'); c.width = c.height = 512; const g = c.getContext('2d'); g.fillStyle = '#74b45c'; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 4200; i++) { g.fillStyle = ['#66a650', '#80c266', '#5c9a4a', '#8dcc70', '#6fae58'][i % 5]; const x = Math.random() * 512, y = Math.random() * 512; g.fillRect(x, y, 2, 5 + Math.random() * 4); }
  for (let i = 0; i < 40; i++) { g.fillStyle = 'rgba(160,140,90,0.10)'; g.beginPath(); g.ellipse(Math.random() * 512, Math.random() * 512, 20 + Math.random() * 40, 10 + Math.random() * 20, Math.random() * 3, 0, 7); g.fill(); }
  const tex = new THREE.CanvasTexture(c); tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(9, 9); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const ground = new THREE.Mesh(new THREE.CircleGeometry(70, 64), new THREE.MeshToonMaterial({ map: tex })); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
  const ring = new THREE.Mesh(new THREE.RingGeometry(ARENA - 0.15, ARENA, 96), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.18 })); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.02; scene.add(ring);
  const d = new THREE.Object3D(), col = new THREE.Color();
  // 언덕 (멀리 둘러싼 초록 능선)
  const hill = new THREE.SphereGeometry(1, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), hills = new THREE.InstancedMesh(hill, toon(0x5f9e58), 26);
  for (let i = 0; i < 26; i++) { const a = i / 26 * Math.PI * 2, r = rnd(52, 64); d.position.set(Math.sin(a) * r, -1, Math.cos(a) * r); d.scale.set(rnd(10, 18), rnd(5, 12), rnd(8, 12)); d.rotation.set(0, a, 0); d.updateMatrix(); hills.setMatrixAt(i, d.matrix); hills.setColorAt(i, col.setHex([0x5f9e58, 0x6aa862, 0x4f8c56][i % 3])); }
  scene.add(hills);
  // 나무: 줄기 + 잎 2단 + 둥근 수관 (침엽/활엽 섞기)
  const N = 54, trunk = new THREE.CylinderGeometry(0.22, 0.34, 1.8, 6), leafA = new THREE.ConeGeometry(1.7, 2.6, 8), leafB = new THREE.ConeGeometry(1.25, 2.1, 8), blob = new THREE.IcosahedronGeometry(1.5, 1);
  const tT = new THREE.InstancedMesh(trunk, toon(0x7a5232), N), tA = new THREE.InstancedMesh(leafA, toon(0xffffff), N), tB = new THREE.InstancedMesh(leafB, toon(0xffffff), N), tC = new THREE.InstancedMesh(blob, toon(0xffffff), N);
  let ia = 0, ic = 0;
  for (let i = 0; i < N; i++) { const a = i / N * Math.PI * 2 + rnd(-0.04, 0.04), r = rnd(ARENA + 3, ARENA + 22), s = rnd(0.9, 1.8), x = Math.sin(a) * r, z = Math.cos(a) * r;
    d.rotation.set(0, rnd(0, 6), 0); d.position.set(x, 0.9 * s, z); d.scale.setScalar(s); d.updateMatrix(); tT.setMatrixAt(i, d.matrix);
    if (i % 3) { d.position.y = 2.6 * s; d.updateMatrix(); tA.setMatrixAt(ia, d.matrix); tA.setColorAt(ia, col.setHex([0x3f8a4a, 0x2f7a50, 0x4a9a48][i % 3])); d.position.y = 3.9 * s; d.updateMatrix(); tB.setMatrixAt(ia, d.matrix); tB.setColorAt(ia, col.setHex([0x4fa058, 0x3f9060, 0x5aaa52][i % 3])); ia++; }
    else { d.position.y = 3.0 * s; d.scale.set(s * 1.2, s, s * 1.2); d.updateMatrix(); tC.setMatrixAt(ic, d.matrix); tC.setColorAt(ic, col.setHex([0x6ab04a, 0x8ac050, 0x5aa048][i % 3])); ic++; } }
  tA.count = tB.count = ia; tC.count = ic; scene.add(tT, tA, tB, tC);
  // 바위
  const rock = new THREE.DodecahedronGeometry(1, 0), rocks = new THREE.InstancedMesh(rock, toon(0xa4a2ae), 40);
  for (let i = 0; i < 40; i++) { const a = rnd(0, 7), r = i < 8 ? rnd(ARENA - 1, ARENA + 1.5) : rnd(ARENA + 0.5, ARENA + 10), s = rnd(0.4, 1.5); d.position.set(Math.sin(a) * r, 0.2 * s, Math.cos(a) * r); d.scale.set(s, s * rnd(0.5, 0.9), s * rnd(0.8, 1.2)); d.rotation.set(rnd(0, 3), rnd(0, 3), 0); d.updateMatrix(); rocks.setMatrixAt(i, d.matrix); }
  scene.add(rocks);
  // 풀숲 (흔들림은 버텍스 셰이더 대신 그룹 회전으로 저렴하게) + 꽃
  const blade = new THREE.ConeGeometry(0.045, 0.36, 3).translate(0, 0.18, 0), GN = 1400;
  const grass = new THREE.InstancedMesh(blade, new THREE.MeshLambertMaterial({ color: 0xffffff }), GN);
  for (let i = 0; i < GN; i++) { const a = rnd(0, 7), r = Math.sqrt(Math.random()) * (ARENA + 8); d.position.set(Math.sin(a) * r, 0, Math.cos(a) * r); const s = rnd(0.6, 1.4); d.scale.set(s, s * rnd(0.7, 1.5), s); d.rotation.set(rnd(-0.25, 0.25), rnd(0, 6), rnd(-0.25, 0.25)); d.updateMatrix(); grass.setMatrixAt(i, d.matrix); grass.setColorAt(i, col.setHex([0x7cc060, 0x68ac52, 0x90d070, 0x5a9a48][i % 4])); }
  scene.add(grass);
  const FN = 220, flowers = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.08, 0), new THREE.MeshBasicMaterial({ color: 0xffffff }), FN);
  for (let i = 0; i < FN; i++) { const a = rnd(0, 7), r = Math.sqrt(Math.random()) * (ARENA + 6); d.position.set(Math.sin(a) * r, 0.18, Math.cos(a) * r); d.scale.setScalar(rnd(0.7, 1.3)); d.rotation.set(0, 0, 0); d.updateMatrix(); flowers.setMatrixAt(i, d.matrix); flowers.setColorAt(i, col.setHex([0xfff4a0, 0xffb0d0, 0xffffff, 0xb0d8ff][i % 4])); }
  scene.add(flowers);
  // 부유 꽃가루
  const PN = 160, pp = new Float32Array(PN * 3); for (let i = 0; i < PN; i++) { pp[i * 3] = rnd(-24, 24); pp[i * 3 + 1] = rnd(0.3, 6); pp[i * 3 + 2] = rnd(-24, 24); }
  const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pp, 3));
  const pollen = new THREE.Points(pg, new THREE.PointsMaterial({ color: 0xfff6c8, size: 0.09, transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending })); scene.add(pollen);
  return {
    update(dt, T) { const a = pg.attributes.position.array; for (let i = 0; i < PN; i++) { a[i * 3] += Math.sin(T * 0.4 + i) * dt * 0.3; a[i * 3 + 1] += Math.sin(T * 0.7 + i * 1.7) * dt * 0.15; } pg.attributes.position.needsUpdate = true; },
    setQuality(q) { grass.count = q >= 2 ? GN : q === 1 ? 600 : 0; flowers.count = q >= 1 ? FN : 80; pollen.visible = q >= 1; hills.castShadow = false; },
    ground,
  };
}
