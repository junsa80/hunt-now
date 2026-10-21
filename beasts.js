// v5.1 수호자의 "흐림" 형태: 사족 짐승형 몬스터 (늑대·서리 와이번·용·바다뱀·여우·그리핀). 정화되면 사람(동료) 모습으로 돌아온다.
// rig는 main.js가 쓰는 이름(body, torso, head, wings, tail, shadow, legs)을 맞추고, 부위 앵커 horn1 / tailTip / wings[0]을 제공한다.
import * as THREE from './vendor/three.module.js';
import { toon, bodyPart as part, GEO as G } from './chars.js';
const SHAPE = {
  wolf: { len: 1.5, h: 0.78, neck: 0.35, snout: 0.55, ears: true, tailN: 5, tailW: 0.16, bushy: true, horns: 'short', spikes: 4 },
  witch: { len: 1.4, h: 0.8, neck: 0.6, snout: 0.35, wings: 1.5, tailN: 6, tailW: 0.1, horns: 'crown', spikes: 6 },
  drake: { len: 1.8, h: 0.85, neck: 0.55, snout: 0.5, wings: 1.9, tailN: 7, tailW: 0.16, horns: 'long', spikes: 7, plates: true },
  siren: { len: 1.9, h: 0.55, neck: 0.75, snout: 0.45, fins: true, tailN: 8, tailW: 0.18, horns: 'crown', spikes: 0 },
  kitsune: { len: 1.35, h: 0.75, neck: 0.4, snout: 0.5, ears: true, tailN: 4, tailW: 0.2, bushy: true, tails: 3, horns: 'none', spikes: 0 },
  harpy: { len: 1.3, h: 0.82, neck: 0.45, snout: 0.38, beak: true, wings: 2.1, tailN: 3, tailW: 0.14, horns: 'crest', spikes: 0 },
};
export function buildBeast(sp, look, scale = 1) {
  const S = SHAPE[sp], root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const mB = toon(look.cloth2), mH = toon(look.hair), mA = toon(look.accent), mD = toon(look.cloth), mHorn = toon(look.horns ?? look.accent);
  const hips = new THREE.Group(); hips.position.set(0, S.h, -S.len * 0.32); body.add(hips);
  const torso = new THREE.Group(); torso.position.set(0, S.h + 0.05, S.len * 0.18); body.add(torso);
  part(hips, G.sph, mB, 0.42, 0.4, 0.5); part(torso, G.sph, mB, 0.48, 0.48, 0.58, 0, 0.02, 0); part(torso, G.sph, mD, 0.36, 0.3, 0.5, 0, -0.18, 0.05); // 몸통 2분절 + 배
  part(body, G.cap, mB, 0.3, S.len * 0.32, 0.32, 0, S.h + 0.02, -0.08).rotation.x = Math.PI / 2;
  // 목·머리
  const neck = new THREE.Group(); neck.position.set(0, 0.25, 0.42); torso.add(neck); neck.rotation.x = -0.6;
  part(neck, G.cap, mB, 0.17, S.neck * 0.6, 0.17, 0, S.neck * 0.4, 0);
  const head = new THREE.Group(); head.position.set(0, S.neck * 0.85, 0.05); neck.add(head);
  const hd = new THREE.Group(); hd.rotation.x = 0.6; hd.scale.setScalar(1.25); head.add(hd);
  part(hd, G.sph, mH, 0.32, 0.28, 0.34); part(hd, S.beak ? G.cone8 : G.box, S.beak ? mA : mB, S.beak ? 0.1 : 0.2, S.beak ? 0.3 : 0.14, S.beak ? 0.1 : S.snout * 0.7, 0, -0.04, 0.26).rotation.x = S.beak ? Math.PI / 2 : 0;
  const jaw = part(hd, G.box, mD, 0.17, 0.05, S.snout * 0.55, 0, -0.12, 0.22);
  for (const s of [-1, 1]) { const e = part(hd, G.sph, new THREE.MeshBasicMaterial({ color: new THREE.Color(look.eye) }), 0.045, 0.035, 0.03, s * 0.13, 0.06, 0.2, false); e.rotation.y = s * 0.4; }
  const u = root.userData;
  if (S.ears) for (const s of [-1, 1]) part(hd, G.cone8, mH, 0.07, 0.22, 0.05, s * 0.13, 0.22, -0.05).rotation.z = -s * 0.25;
  if (S.horns !== 'none') for (const s of [-1, 1]) { const len = S.horns === 'long' ? 0.42 : S.horns === 'crown' ? 0.28 : S.horns === 'crest' ? 0.3 : 0.2;
    const g = new THREE.Group(); g.position.set(s * (S.horns === 'crest' ? 0.04 : 0.12), 0.18, -0.06); hd.add(g); g.rotation.set(-0.7, 0, -s * (S.horns === 'crest' ? 0.05 : 0.35));
    part(g, G.cone8, mHorn, 0.055, len, 0.055, 0, len / 2, 0); if (S.horns === 'crown') part(g, G.cone8, mHorn, 0.04, len * 0.7, 0.04, s * 0.08, len * 0.3, 0.06);
    u['horn' + s] = g; }
  // 다리 4개 (어깨-팔꿈치 2관절)
  const leg = (parent, x, z, len, mat) => { const sh = new THREE.Group(); sh.position.set(x, -0.15, z); parent.add(sh); part(sh, G.cap, mat, 0.17, len * 0.32, 0.19, 0, -len * 0.28, 0);
    const el = new THREE.Group(); el.position.y = -len * 0.6; sh.add(el); part(el, G.cap, mat, 0.12, len * 0.28, 0.12, 0, -len * 0.22, 0); part(el, G.sph, mD, 0.16, 0.08, 0.2, 0, -len * 0.42, 0.06); return { sh, el, end: el }; };
  const LH = S.h - 0.1; const legFL = leg(torso, -0.27, 0.12, LH, mB), legFR = leg(torso, 0.27, 0.12, LH, mB), legBL = leg(hips, -0.27, 0, LH, mB), legBR = leg(hips, 0.27, 0, LH, mB);
  // 꼬리 (분절)
  const tail = new THREE.Group(); tail.position.set(0, 0.1, -0.42); hips.add(tail); let seg = tail; const segs = [];
  const tails = S.tails || 1;
  for (let t = 0; t < tails; t++) { let sgp = t === 0 ? tail : (() => { const g = new THREE.Group(); g.rotation.y = (t - 1 ? 1 : -1) * 0.5; tail.add(g); return g; })(); seg = sgp;
    for (let i = 0; i < S.tailN; i++) { const g = new THREE.Group(); g.position.z = i ? -S.tailW * 1.9 : 0; seg.add(g); const w = S.tailW * (S.bushy ? 1.3 + Math.sin(i / S.tailN * Math.PI) * 0.8 : 1 - i / S.tailN * 0.6);
      part(g, G.sph, i === S.tailN - 1 && S.bushy ? mA : mB, w, w, S.tailW * 1.3); if (S.fins && i % 2) part(g, G.cone8, mA, 0.02, 0.25, 0.16, 0, 0.18, 0); seg = g; if (t === 0) segs.push(g); } }
  const tip = part(seg, G.cone8, mHorn, 0.07, 0.2, 0.07, 0, 0, -0.16); tip.rotation.x = -Math.PI / 2; u.tailTip = tip;
  // 날개·지느러미
  const wings = [];
  if (S.wings) for (const s of [-1, 1]) { const w = new THREE.Group(); w.position.set(s * 0.3, 0.32, 0); torso.add(w);
    const m = new THREE.Mesh(G.wing, new THREE.MeshToonMaterial({ color: look.wings ?? look.cloth2, side: THREE.DoubleSide })); m.scale.set(s * S.wings, S.wings * 0.85, 1); m.castShadow = true; w.add(m); w.rotation.y = s * 0.3; wings.push(w); }
  if (S.fins) for (const s of [-1, 1]) { const w = new THREE.Group(); w.position.set(s * 0.38, 0.05, 0.1); torso.add(w); part(w, G.cone8, mA, 0.05, 0.5, 0.3, s * 0.2, 0, 0).rotation.z = -s * 1.2; wings.push(w); }
  if (!wings.length) { const w = new THREE.Group(); torso.add(w); wings.push(w); }
  // 등 가시·갑판
  for (let i = 0; i < S.spikes; i++) part(body, G.cone8, mHorn, 0.06, 0.22 - i * 0.012, 0.06, 0, S.h + 0.42 - Math.abs(i - 2) * 0.03, 0.45 - i * 0.16).rotation.x = -0.3;
  if (S.plates) for (const s of [-1, 1]) part(torso, G.sph, mA, 0.2, 0.12, 0.3, s * 0.34, 0.2, 0.05, true);
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.9, 18), new THREE.MeshBasicMaterial({ color: 0x1a2a10, transparent: true, opacity: 0.3, depthWrite: false })); shadow.rotation.x = -Math.PI / 2; shadow.scale.set(0.8, 1.4, 1); shadow.position.y = 0.015; root.add(shadow);
  root.scale.setScalar(scale * 0.72); // 짐승형은 길이가 있어 사람형보다 조금 낮게
  u.rig = { body, hips, torso, neck, head, legFL, legFR, legBL, legBR, tail, tailSegs: segs, jaw, wings, shadow, beast: true,
    armL: legFL, armR: legFR, legL: legBL, legR: legBR, skirt: new THREE.Group(), weapon: new THREE.Group() };
  return root;
}
const REAR = new Set(['slam', 'leap', 'quake', 'nova', 'pillar', 'dive', 'storm', 'rain', 'tide', 'bolt']);
export function animateBeast(root, a) {
  const r = root.userData.rig, T = a.time, s = a.state, p = a.p || 0;
  for (const g of [r.body, r.torso, r.neck, r.head, r.hips, r.tail, r.jaw, r.legFL.sh, r.legFR.sh, r.legBL.sh, r.legBR.sh, r.legFL.el, r.legFR.el, r.legBL.el, r.legBR.el, ...r.tailSegs]) g.rotation.set(0, 0, 0);
  r.body.position.set(0, 0, 0); r.neck.rotation.x = -0.6; r.jaw.rotation.x = 0;
  const breath = Math.sin(T * 2.2); r.torso.scale.y = 1 + 0.03 * breath; r.neck.rotation.x += 0.04 * breath;
  r.tailSegs.forEach((g, i) => { g.rotation.y = Math.sin(T * 2 - i * 0.6) * 0.12; g.rotation.x = -0.05; });
  r.wings.forEach((w, i) => { w.rotation.z = (i ? -1 : 1) * (0.15 + 0.1 * Math.sin(T * 1.8)); });
  const gait = (spd, amp) => { const ph = T * spd; [[r.legFL, 0], [r.legBR, 0], [r.legFR, Math.PI], [r.legBL, Math.PI]].forEach(([l, o]) => { l.sh.rotation.x = Math.sin(ph + o) * amp; l.el.rotation.x = Math.max(0, -Math.sin(ph + o)) * amp * 0.9; });
    r.body.position.y = Math.abs(Math.cos(ph)) * 0.06; r.tailSegs.forEach((g, i) => { g.rotation.y = Math.sin(ph - i * 0.5) * 0.2; }); r.head.rotation.x = Math.sin(ph * 2) * 0.05; };
  if (s === 'run') { gait(9, 0.7 * Math.max(0.4, a.run)); if (a.limp) r.legBR.sh.rotation.x *= 0.3; r.wings.forEach((w, i) => { w.rotation.z = (i ? -1 : 1) * (0.5 + 0.3 * Math.sin(T * 9)); }); }
  else if (s === 'windup') { if (REAR.has(a.kind)) { r.body.rotation.x = -0.45 * p; r.body.position.y = 0.25 * p; r.legFL.sh.rotation.x = r.legFR.sh.rotation.x = -0.9 * p; r.wings.forEach((w, i) => { w.rotation.z = (i ? -1 : 1) * (0.2 + 0.9 * p); }); r.jaw.rotation.x = 0.4 * p; }
    else { r.body.position.y = -0.12 * p; r.body.position.z = -0.2 * p; r.neck.rotation.x = -0.6 + 0.35 * p; r.legBL.sh.rotation.x = r.legBR.sh.rotation.x = 0.5 * p; r.legFL.sh.rotation.x = r.legFR.sh.rotation.x = -0.4 * p; r.jaw.rotation.x = 0.5 * p; r.tailSegs.forEach((g) => { g.rotation.x = 0.12 * p; }); } }
  else if (s === 'attack' || s === 'strike') { r.body.position.z = 0.35; r.neck.rotation.x = -0.2; r.jaw.rotation.x = 0.1; r.legFL.sh.rotation.x = r.legFR.sh.rotation.x = 0.6; r.body.rotation.x = 0.12; r.wings.forEach((w, i) => { w.rotation.z = (i ? 1 : -1) * 0.3; }); }
  else if (s === 'roar') { const k = Math.sin(Math.min(1, p * 1.4) * Math.PI); r.body.rotation.x = -0.35 * k; r.neck.rotation.x = -0.6 - 0.5 * k; r.jaw.rotation.x = 0.7 * k; r.head.rotation.z = Math.sin(T * 30) * 0.05 * k; r.wings.forEach((w, i) => { w.rotation.z = (i ? -1 : 1) * (0.2 + 1.1 * k); }); }
  else if (s === 'hit') { r.body.rotation.z = 0.25 * Math.sin(p * Math.PI); r.neck.rotation.x = -0.3; }
  else if (s === 'down' || s === 'topple') { const k = s === 'down' ? Math.min(1, p * 2) : 1; r.body.rotation.z = 1.35 * k; r.body.position.y = -0.2 * k; r.legFL.sh.rotation.x = Math.sin(T * 6) * 0.3 * (s === 'topple' ? 1 : 0); }
  else if (s === 'stun') { r.head.rotation.y = Math.sin(T * 5) * 0.3; r.neck.rotation.x = -0.2; r.body.position.y = -0.08; }
  if (a.flinch) { r.body.rotation.z += Math.sin(T * 40) * 0.05 * a.flinch; }
}
