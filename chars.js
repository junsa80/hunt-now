// 절차적 미소녀 캐릭터: 툰 셰이딩 + 인버티드 헐 외곽선 + 관절 계층
import * as THREE from './vendor/three.module.js';
import { addRim } from './fx.js';

const grad = (() => { const d = new Uint8Array([70, 70, 70, 255, 160, 160, 160, 255, 255, 255, 255, 255]);
  const t = new THREE.DataTexture(d, 3, 1, THREE.RGBAFormat); t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true; return t; })();
const matCache = new Map();
export function toon(color, emissive = 0) {
  const k = color + ':' + emissive; if (matCache.has(k)) return matCache.get(k);
  const m = new THREE.MeshToonMaterial({ color, gradientMap: grad, emissive, emissiveIntensity: emissive ? 0.6 : 0 });
  addRim(m); matCache.set(k, m); return m;
}
const outlineMat = new THREE.MeshBasicMaterial({ color: 0x1a1020, side: THREE.BackSide });
// 개체별 외곽선 재질 (몬스터 공격 직전 붉은 빛, 완벽 회피 시 노란 윤곽 — 몬헌 나우 신호)
export function ownOutline(root) { const m = outlineMat.clone(); root.traverse(o => { if (o.isMesh && o.material === outlineMat) o.material = m; }); return m; }
const G = {
  sph: new THREE.SphereGeometry(1, 16, 12), cap: new THREE.CapsuleGeometry(1, 1, 4, 10), cone: new THREE.ConeGeometry(1, 1, 14, 1, true),
  cone8: new THREE.ConeGeometry(1, 1, 8), box: new THREE.BoxGeometry(1, 1, 1), cyl: new THREE.CylinderGeometry(1, 1, 1, 10),
  bang: new THREE.SphereGeometry(1, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), torus: new THREE.TorusGeometry(1, 0.25, 6, 14),
  wing: (() => { const s = new THREE.Shape(); s.moveTo(0, 0); s.quadraticCurveTo(0.6, 0.9, 1.1, 0.7); s.lineTo(0.9, 0.35); s.lineTo(1.0, 0.1); s.lineTo(0.7, -0.05); s.lineTo(0.75, -0.35); s.quadraticCurveTo(0.3, -0.2, 0, 0); return new THREE.ShapeGeometry(s); })(),
};
function part(parent, geo, mat, sx, sy, sz, x = 0, y = 0, z = 0, outline = true) {
  const m = new THREE.Mesh(geo, mat); m.scale.set(sx, sy, sz); m.position.set(x, y, z); parent.add(m);
  m.castShadow = true; if (outline) { const o = new THREE.Mesh(geo, outlineMat); o.scale.setScalar(1.09); m.add(o); }
  return m;
}
function faceTex(eye, angry) {
  // 256x128 고해상도 얼굴: 그라데이션 홍채, 위 속눈썹, 이중 하이라이트, 볼터치, 작은 입
  const c = document.createElement('canvas'); c.width = 256; c.height = 128; const g = c.getContext('2d');
  const drawEye = (x, side) => {
    g.save(); g.beginPath(); g.ellipse(x, 62, 25, 33, 0, 0, 7); g.clip();
    g.fillStyle = '#fff'; g.fillRect(x - 30, 20, 60, 80);
    const ir = g.createLinearGradient(0, 34, 0, 96); ir.addColorStop(0, '#1a0f22'); ir.addColorStop(0.35, eye); ir.addColorStop(1, '#ffffff');
    g.fillStyle = ir; g.beginPath(); g.ellipse(x, 66, 20, 28, 0, 0, 7); g.fill();
    g.fillStyle = '#1a0f22'; g.beginPath(); g.ellipse(x, 66, 9, 15, 0, 0, 7); g.fill();
    g.fillStyle = 'rgba(30,10,40,0.35)'; g.fillRect(x - 30, 20, 60, 22);
    g.restore();
    g.fillStyle = '#fff'; g.beginPath(); g.ellipse(x - 8 * side, 50, 7, 9, 0, 0, 7); g.fill(); g.beginPath(); g.arc(x + 7 * side, 80, 4, 0, 7); g.fill();
    g.strokeStyle = '#1a0f22'; g.lineCap = 'round';
    g.lineWidth = 7; g.beginPath();
    if (angry) { g.moveTo(x - 26 * side, 36 - 6); g.quadraticCurveTo(x, 26, x + 28 * side, 42); }
    else g.ellipse(x, 62, 27, 35, 0, Math.PI * 1.08, Math.PI * 1.92);
    g.stroke();
    g.lineWidth = 4; g.beginPath(); g.moveTo(x + 24 * side, angry ? 40 : 38); g.lineTo(x + 33 * side, angry ? 34 : 30); g.stroke(); // 속눈썹 끝
    g.lineWidth = 2.5; g.beginPath(); g.moveTo(x - 16, 98); g.quadraticCurveTo(x, 102, x + 16, 98); g.stroke(); // 아래 눈꺼풀
    g.lineWidth = 4; g.beginPath(); if (angry) { g.moveTo(x - 22 * side, 10); g.lineTo(x + 20 * side, 22); } else { g.moveTo(x - 20, 14); g.quadraticCurveTo(x, 6, x + 20, 14); } g.stroke(); // 눈썹
  };
  drawEye(72, -1); drawEye(184, 1);
  const bl = (x) => { const r = g.createRadialGradient(x, 108, 0, x, 108, 22); r.addColorStop(0, 'rgba(255,120,150,0.55)'); r.addColorStop(1, 'rgba(255,120,150,0)'); g.fillStyle = r; g.fillRect(x - 24, 86, 48, 42); };
  bl(34); bl(222);
  g.strokeStyle = '#8a2a3a'; g.lineWidth = 4; g.lineCap = 'round'; g.beginPath(); if (angry) { g.moveTo(118, 112); g.lineTo(138, 110); } else g.arc(128, 104, 8, 0.3, Math.PI - 0.3); g.stroke();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}

// opt: {skin, hair, eye, cloth, cloth2, accent, hairStyle, horns, tail, wings, ears, weapon, scale, angry, accessory}
export function buildGirl(opt) {
  const root = new THREE.Group(); const body = new THREE.Group(); root.add(body);
  const S = toon(opt.skin ?? 0xffe0cf), H = toon(opt.hair), C = toon(opt.cloth), C2 = toon(opt.cloth2 ?? opt.cloth), A = toon(opt.accent ?? 0xffd54a);
  const hips = new THREE.Group(); hips.position.y = 0.82; body.add(hips);
  part(hips, G.sph, C2, 0.2, 0.13, 0.15);
  const skirt = part(hips, G.cone, C2, 0.32, 0.36, 0.28, 0, -0.08, 0); skirt.material = C2;
  const torso = new THREE.Group(); torso.position.y = 0.05; hips.add(torso);
  part(torso, G.cap, C, 0.16, 0.16, 0.12, 0, 0.2, 0);
  part(torso, G.box, A, 0.3, 0.05, 0.22, 0, 0.06, 0, false); // 벨트
  part(torso, G.sph, C2, 0.06, 0.06, 0.03, 0, 0.32, 0.12, false); // 리본
  const neck = new THREE.Group(); neck.position.y = 0.44; torso.add(neck);
  part(neck, G.cyl, S, 0.05, 0.08, 0.05, 0, 0.02, 0, false);
  const head = new THREE.Group(); head.position.y = 0.24; neck.add(head);
  part(head, G.sph, S, 0.25, 0.26, 0.24);
  const face = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.17), new THREE.MeshBasicMaterial({ map: faceTex(opt.eye ?? '#5a7aff', opt.angry), transparent: true }));
  face.position.set(0, -0.03, 0.235); head.add(face);
  part(head, G.sph, H, 0.28, 0.28, 0.27, 0, 0.03, -0.03);
  part(head, G.bang, H, 0.27, 0.22, 0.27, 0, 0.06, 0.02, false).rotation.x = 0.35;
  // 머리카락 결: 앞머리 가닥 + 옆머리 + 뒤 레이어 (단순 구 대신 층진 실루엣)
  for (let i = -2; i <= 2; i++) { const b = part(head, G.cone8, H, 0.06, 0.2, 0.05, i * 0.085, 0.07 - Math.abs(i) * 0.015, 0.215 - Math.abs(i) * 0.02); b.rotation.x = Math.PI - 0.35; b.rotation.z = i * 0.12; }
  for (const sd of [-1, 1]) { const l = part(head, G.cone8, H, 0.06, 0.34, 0.05, sd * 0.235, -0.12, 0.08); l.rotation.x = Math.PI; l.rotation.z = -sd * 0.08; }
  for (let i = -2; i <= 2; i++) { const b = part(head, G.cone8, H, 0.09, 0.32, 0.06, i * 0.1, -0.1, -0.2); b.rotation.x = Math.PI + 0.35; b.rotation.z = i * 0.1; }
  const style = opt.hairStyle ?? 'long';
  if (style === 'long') part(head, G.cap, H, 0.22, 0.32, 0.12, 0, -0.32, -0.12);
  if (style === 'twin') for (const s of [-1, 1]) { const t = part(head, G.cap, H, 0.08, 0.3, 0.08, s * 0.3, -0.25, -0.05); t.rotation.z = s * 0.25; }
  if (style === 'pony') { const t = part(head, G.cap, H, 0.09, 0.32, 0.09, 0, -0.18, -0.32); t.rotation.x = 0.5; }
  if (style === 'bob') part(head, G.sph, H, 0.31, 0.22, 0.29, 0, -0.1, -0.02);
  if (opt.horns) for (const s of [-1, 1]) { const h = part(head, G.cone8, toon(opt.horns), 0.05, 0.28, 0.05, s * 0.15, 0.3, 0.02); h.rotation.z = -s * 0.5; h.rotation.x = -0.3; root.userData['horn' + s] = h; }
  if (opt.ears) for (const s of [-1, 1]) { const e = part(head, G.cone8, H, 0.07, 0.16, 0.04, s * 0.17, 0.3, 0); e.rotation.z = -s * 0.35; }
  if (opt.accessory) { const ac = part(head, G.torus, toon(opt.accessory.color), 0.07, 0.07, 0.07, 0.16, 0.18, 0.12, false); ac.rotation.y = 0.7; root.userData.acc = ac; }
  const mkLimb = (parent, x, y, len, w, matU, matL, isArm) => {
    const sh = new THREE.Group(); sh.position.set(x, y, 0); parent.add(sh);
    part(sh, G.cap, matU, w, len * 0.35, w, 0, -len * 0.25, 0);
    const el = new THREE.Group(); el.position.y = -len * 0.5; sh.add(el);
    part(el, G.cap, matL, w * 0.9, len * 0.35, w * 0.9, 0, -len * 0.25, 0);
    const end = new THREE.Group(); end.position.y = -len * 0.52; el.add(end);
    if (isArm) part(end, G.sph, S, w * 1.1, w * 1.1, w * 1.1); else part(end, G.box, A, w * 2, w * 1.2, w * 3, 0, 0, w * 0.7);
    return { sh, el, end };
  };
  const armL = mkLimb(torso, -0.21, 0.36, 0.5, 0.05, C, S, true), armR = mkLimb(torso, 0.21, 0.36, 0.5, 0.05, C, S, true);
  const legL = mkLimb(hips, -0.09, -0.02, 0.78, 0.065, S, C2, false), legR = mkLimb(hips, 0.09, -0.02, 0.78, 0.065, S, C2, false);
  legL.sh.position.y = legR.sh.position.y = 0;
  const tail = new THREE.Group(); tail.position.set(0, 0, -0.15); hips.add(tail);
  if (opt.tail) { let p = tail; for (let i = 0; i < 4; i++) { const g = new THREE.Group(); g.position.z = i ? -0.17 : 0; p.add(g); part(g, G.sph, toon(opt.tail), 0.07 - i * 0.008, 0.07 - i * 0.008, 0.11, 0, 0, -0.08); p = g; }
    const tip = part(p, G.cone8, toon(opt.horns ?? opt.tail), 0.07, 0.16, 0.07, 0, 0, -0.22); tip.rotation.x = -Math.PI / 2; root.userData.tailTip = tip; }
  const wings = [];
  if (opt.wings) for (const s of [-1, 1]) { const w = new THREE.Group(); w.position.set(s * 0.08, 0.32, -0.12); torso.add(w);
    const m = new THREE.Mesh(G.wing, new THREE.MeshToonMaterial({ color: opt.wings, gradientMap: grad, side: THREE.DoubleSide })); m.scale.set(s * 0.7, 0.7, 0.7); w.add(m); w.rotation.y = s * 0.5; wings.push(w); }
  // 무기
  const weapon = new THREE.Group(); armR.end.add(weapon);
  setWeapon(weapon, opt.weapon, opt.weaponColor);
  if (opt.offhand) { const w2 = new THREE.Group(); armL.end.add(w2); setWeapon(w2, opt.offhand, opt.weaponColor); }
  if (opt.bigShield) { const sh = part(armL.end, G.box, toon(opt.bigShield), 0.04, 0.6, 0.36, 0.06, 0.05, 0.05); part(armL.end, G.box, toon(0xffd54a), 0.045, 0.1, 0.1, 0.07, 0.05, 0.05, false); }
  if (opt.shield) { const sh = part(armL.end, G.cyl, toon(opt.shield), 0.17, 0.03, 0.17, 0.04, 0, 0.02); sh.rotation.z = Math.PI / 2; }
  // 블롭 그림자
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.4, 16), new THREE.MeshBasicMaterial({ color: 0x1a2a10, transparent: true, opacity: 0.28, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.015; root.add(shadow);
  root.scale.setScalar(opt.scale ?? 1);
  root.userData.rig = { body, hips, torso, neck, head, armL, armR, legL, legR, tail, wings, weapon, shadow, skirt };
  return root;
}
export function setWeapon(g, type, color = 0xd8e0ff) {
  while (g.children.length) g.remove(g.children[0]);
  const M = toon(color), Hd = toon(0x5a3a2a);
  if (type === 'sns') { part(g, G.box, Hd, 0.04, 0.12, 0.04, 0, 0, 0); part(g, G.box, toon(0xffd54a), 0.16, 0.03, 0.05, 0, 0.07, 0);
    part(g, G.box, M, 0.06, 0.6, 0.02, 0, 0.38, 0); }
  else if (type === 'gs') { part(g, G.box, Hd, 0.05, 0.25, 0.05, 0, 0.02, 0); part(g, G.box, toon(0xffd54a), 0.3, 0.05, 0.08, 0, 0.16, 0);
    part(g, G.box, M, 0.17, 1.15, 0.04, 0, 0.75, 0); }
  else if (type === 'staff') { part(g, G.cyl, Hd, 0.025, 1.0, 0.025, 0, 0.2, 0); part(g, G.sph, toon(color, color), 0.08, 0.08, 0.08, 0, 0.72, 0); }
  else if (type === 'claw') { for (const x of [-0.04, 0, 0.04]) { const c = part(g, G.cone8, M, 0.02, 0.18, 0.02, x, 0.1, 0.03); c.rotation.x = 0.4; } }
  else if (type === 'ls') { part(g, G.box, Hd, 0.035, 0.22, 0.035, 0, 0.02, 0); part(g, G.cyl, toon(0xffd54a), 0.07, 0.015, 0.07, 0, 0.14, 0);
    const b = part(g, G.box, M, 0.035, 1.05, 0.012, 0, 0.68, 0); b.rotation.z = 0.04; part(g, G.cone8, M, 0.02, 0.1, 0.008, 0.015, 1.24, 0); }
  else if (type === 'db') { part(g, G.box, Hd, 0.035, 0.1, 0.035, 0, 0, 0); part(g, G.box, M, 0.05, 0.42, 0.015, 0, 0.26, 0); part(g, G.cone8, M, 0.026, 0.1, 0.01, 0, 0.52, 0); }
  else if (type === 'lance') { part(g, G.cyl, Hd, 0.03, 0.3, 0.03, 0, 0, 0); part(g, G.cyl, toon(0xffd54a), 0.09, 0.04, 0.09, 0, 0.17, 0); part(g, G.cone8, M, 0.075, 1.2, 0.075, 0, 0.8, 0); }
  else if (type === 'bow') { const arc = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.025, 6, 18, Math.PI * 0.9), M); arc.rotation.z = Math.PI / 2 - Math.PI * 0.45; arc.position.x = -0.3; g.add(arc);
    const str = part(g, G.cyl, toon(0xffffff), 0.006, 0.8, 0.006, 0.01, 0, 0, false); g.rotation.x = 0; g.userData.bow = true; return; }
  else if (type === 'whammer') { part(g, G.cyl, Hd, 0.03, 0.85, 0.03, 0, 0.3, 0); const h = part(g, G.box, M, 0.24, 0.24, 0.42, 0, 0.75, 0); part(g, G.box, toon(0xffd54a), 0.26, 0.05, 0.44, 0, 0.75, 0, false); }
  else if (type === 'hammer') { part(g, G.cyl, Hd, 0.03, 0.8, 0.03, 0, 0.3, 0); const h = part(g, G.cyl, M, 0.14, 0.34, 0.14, 0, 0.72, 0); h.rotation.z = Math.PI / 2; }
  g.rotation.x = Math.PI / 2; // 손에서 앞쪽으로
}

// 절차적 애니메이션. a: {state, t(상태경과), p(진행도0~1), run(0~1), combo, time}
export function animate(root, a) {
  const r = root.userData.rig, T = a.time, L = (o, k) => o; // eslint
  const reset = (g) => g.rotation.set(0, 0, 0);
  [r.body, r.hips, r.torso, r.neck, r.head, r.armL.sh, r.armL.el, r.armR.sh, r.armR.el, r.legL.sh, r.legL.el, r.legR.sh, r.legR.el].forEach(reset);
  r.body.position.set(0, 0, 0);
  const breath = Math.sin(T * 2.4), shift = Math.sin(T * 1.1);
  r.torso.rotation.x = 0.03 * breath; r.armL.sh.rotation.z = -0.18 - 0.03 * breath; r.armR.sh.rotation.z = 0.18 + 0.03 * breath;
  r.armL.el.rotation.x = r.armR.el.rotation.x = -0.25; r.body.position.y = 0.01 * breath; r.hips.rotation.z = 0.03 * shift; r.torso.rotation.z = -0.025 * shift; r.head.rotation.z = 0.04 * shift; r.head.rotation.y = 0.08 * Math.sin(T * 0.5);
  const run = a.run || 0;
  if (run > 0.05) { const ph = T * 11.5 * (a.speedMul || 1), s = Math.sin(ph) * run, lp = a.limp ? 0.5 : 1;
    r.legL.sh.rotation.x = s * 0.95; r.legR.sh.rotation.x = -s * 0.95 * lp; r.legL.el.rotation.x = Math.max(0, -s) * 1.3 + 0.15; r.legR.el.rotation.x = Math.max(0, s) * 1.3 * lp + 0.15;
    r.armL.sh.rotation.x = -s * 0.9; r.armR.sh.rotation.x = s * 0.9; r.armL.el.rotation.x = r.armR.el.rotation.x = -0.9 * run; r.torso.rotation.x = 0.28 * run; r.head.rotation.x = -0.15 * run;
    r.body.position.y = Math.abs(Math.cos(ph)) * 0.08 * run - (a.limp ? Math.max(0, Math.sin(ph)) * 0.08 : 0); r.hips.rotation.y = -s * 0.18; r.torso.rotation.y = s * 0.22; r.skirt.rotation.x = -0.2 * run;
    if (a.limp) r.torso.rotation.z = 0.14 + Math.sin(ph) * 0.06; } else r.skirt.rotation.x = 0;
  let p = a.p ?? 0; const ease = (x) => 1 - Math.pow(1 - x, 3);
  switch (a.state) {
    case 'attack': if (a.wtype === 'bow') { r.armL.sh.rotation.x = -1.55; r.armL.el.rotation.x = 0; r.armR.sh.rotation.x = -1.5; r.armR.sh.rotation.z = -0.5; r.armR.el.rotation.x = -1.6 * (1 - p); r.torso.rotation.y = 0.5; r.legL.sh.rotation.x = -0.3; r.legR.sh.rotation.x = 0.3; break; }
      if (a.wtype === 'lance') { const k = p < 0.3 ? -p / 0.3 : Math.min(1, (p - 0.3) / 0.25); r.armR.sh.rotation.x = -1.5; r.armR.el.rotation.x = 0; r.armR.sh.rotation.z = 0.1; r.body.position.z = 0.25 * k; r.torso.rotation.x = 0.2 * k; r.armL.sh.rotation.x = -1.3; r.armL.sh.rotation.z = 0.5; r.legL.sh.rotation.x = -0.6; r.legR.sh.rotation.x = 0.5; break; }
      if (a.wtype === 'db') { const c2 = (a.combo || 0) % 2, e2 = ease(p); r.armR.sh.rotation.x = -1.4; r.armL.sh.rotation.x = -1.4; r.armR.sh.rotation.z = c2 ? 1.4 - 2.6 * e2 : -1.2 + 2.6 * e2; r.armL.sh.rotation.z = c2 ? 1.2 - 2.6 * e2 : -1.4 + 2.6 * e2; r.torso.rotation.y = (c2 ? 0.5 : -0.5) * (1 - 2 * e2); r.legL.sh.rotation.x = -0.5; r.legR.sh.rotation.x = 0.4; break; }
    { const style = ATK_STYLE[a.wtype]?.[(a.combo ?? 0) % 4] || 'over'; swingPose(r, style, p, a.heavy ? 0.42 : Math.max(0.15, (a.hitAt ?? 0.3) - 0.08), a.heavy, a.wtype); break; }
    case 'dance': { r.body.rotation.y = T * 16; r.armL.sh.rotation.z = -1.5; r.armR.sh.rotation.z = 1.5; r.armL.sh.rotation.x = r.armR.sh.rotation.x = -0.4; r.body.position.y = 0.05 + Math.abs(Math.sin(T * 16)) * 0.08; break; }
    case 'special': { r.body.rotation.y = p * Math.PI * 4; r.armR.sh.rotation.x = -2.6 + Math.sin(p * 30) * 1.2; r.armL.sh.rotation.x = -1.8; r.body.position.y = 0.25 * Math.sin(p * Math.PI); break; }
    case 'charge': if (a.wtype === 'bow') { r.armL.sh.rotation.x = -1.55; r.armL.el.rotation.x = 0; r.armR.sh.rotation.x = -1.5; r.armR.sh.rotation.z = -0.5; r.armR.el.rotation.x = -1.8; r.torso.rotation.y = 0.5; break; } { const sh = Math.sin(T * 60) * 0.02 * (a.lvl || 1);
      r.armR.sh.rotation.x = -2.6 + sh; r.armL.sh.rotation.x = -2.4; r.torso.rotation.x = -0.25; r.torso.rotation.y = 0.4; r.legL.sh.rotation.x = -0.6; r.legR.sh.rotation.x = 0.5; r.legL.el.rotation.x = 0.6; r.body.position.y = -0.1; break; }
    case 'roll': { const e = p < 0.75 ? easeIO(p / 0.75) : 1, tuck = Math.sin(Math.min(1, p / 0.8) * Math.PI); // 앞구르기: 웅크림→회전→일어서기
      r.body.rotation.x = e * Math.PI * 2; r.body.position.y = 0.42 * tuck - 0.3 * tuck; r.legL.sh.rotation.x = r.legR.sh.rotation.x = -1.7 * tuck; r.legL.el.rotation.x = r.legR.el.rotation.x = 2.1 * tuck;
      r.armL.sh.rotation.x = r.armR.sh.rotation.x = -1.3 * tuck; r.torso.rotation.x = 0.9 * tuck; r.head.rotation.x = 0.5 * tuck; if (p > 0.75) { const k = (p - 0.75) / 0.25; r.legL.sh.rotation.x = -0.6 * (1 - k); r.legL.el.rotation.x = 0.8 * (1 - k); } break; }
    case 'roar': { const k = Math.min(1, p * 5), sh = p > 0.15 && p < 0.85 ? Math.sin(T * 70) * 0.03 : 0; // 몬스터 포효
      r.torso.rotation.x = -0.55 * k + sh; r.head.rotation.x = -0.6 * k; r.armL.sh.rotation.z = -1.7 * k; r.armR.sh.rotation.z = 1.7 * k; r.armL.sh.rotation.x = r.armR.sh.rotation.x = -0.5 * k; r.armL.el.rotation.x = r.armR.el.rotation.x = -1.0 * k;
      r.legL.sh.rotation.z = -0.25 * k; r.legR.sh.rotation.z = 0.25 * k; r.body.position.y = 0.06 * k; break; }
    case 'cover': { r.armL.sh.rotation.z = -2.5; r.armR.sh.rotation.z = 2.5; r.armL.sh.rotation.x = r.armR.sh.rotation.x = -0.4; r.armL.el.rotation.x = r.armR.el.rotation.x = -2.3; r.torso.rotation.x = 0.45; r.head.rotation.x = 0.3; r.body.position.y = -0.14; r.legL.el.rotation.x = r.legR.el.rotation.x = 0.6; r.legL.sh.rotation.x = r.legR.sh.rotation.x = -0.3; break; }
    case 'topple': { const k = Math.min(1, p * 4), kick = Math.sin(T * 13); // 다운: 옆으로 넘어져 버둥거림
      r.body.rotation.z = 1.45 * easeIO(k); r.body.position.y = 0.22 * k; r.body.position.x = -0.15 * k; r.legL.sh.rotation.x = 0.6 * kick * k; r.legR.sh.rotation.x = -0.6 * kick * k; r.armL.sh.rotation.x = -0.8 + 0.5 * kick; r.armR.sh.rotation.x = -0.6 - 0.5 * kick; r.head.rotation.z = -0.3 * k; break; }
    case 'hit': { r.torso.rotation.x = -0.5 * (1 - p); r.head.rotation.x = -0.4 * (1 - p); r.armL.sh.rotation.z = -0.9; r.armR.sh.rotation.z = 0.9; break; }
    case 'stun': { r.head.rotation.z = Math.sin(T * 6) * 0.3; r.torso.rotation.x = 0.4; r.armL.sh.rotation.x = r.armR.sh.rotation.x = 0.3; r.body.position.y = -0.1; break; }
    case 'down': { r.body.rotation.x = -Math.PI / 2 * Math.min(1, p * 3); r.body.position.y = 0.15; break; }
    case 'windup': { const k = a.kind; p = easeIO(p); // 몬스터 예비 동작 (가속 없이 천천히 모으는 텔)
      if (k === 'slam') { r.armL.sh.rotation.x = r.armR.sh.rotation.x = -3 * ease(p); r.torso.rotation.x = -0.3 * p; r.body.position.y = 0.15 * p; }
      else if (k === 'charge') { r.torso.rotation.x = 0.6 * p; r.body.position.y = -0.15 * p; r.legL.sh.rotation.x = -0.8; r.legR.sh.rotation.x = 0.7; r.armL.sh.rotation.x = r.armR.sh.rotation.x = 1.1; }
      else if (k === 'cast') { r.armR.sh.rotation.x = -2.9; r.armL.sh.rotation.x = -2.0; r.armL.sh.rotation.z = -0.6; r.body.position.y = 0.05 * Math.sin(T * 8); }
      else { r.armR.sh.rotation.x = -2.2 * p; r.torso.rotation.y = 0.6 * p; }
      break; }
    case 'strike': { r.armL.sh.rotation.x = r.armR.sh.rotation.x = 0.8; r.torso.rotation.x = 0.5; r.body.position.y = -0.08; break; }
    case 'guard': if (a.wtype === 'lance') { r.armL.sh.rotation.x = -1.3; r.armL.sh.rotation.z = 0.5; r.armR.sh.rotation.x = -1.3; r.torso.rotation.x = 0.25; r.legL.sh.rotation.x = -0.6; r.legR.sh.rotation.x = 0.6; r.body.position.y = -0.08; break; } { r.armL.sh.rotation.x = -1.4; r.armL.sh.rotation.z = 0.6; r.torso.rotation.x = 0.15; r.legL.sh.rotation.x = -0.4; r.legR.sh.rotation.x = 0.4; break; }
    case 'cheer': { r.armL.sh.rotation.z = -2.6; r.armR.sh.rotation.z = 2.6; r.body.position.y = Math.abs(Math.sin(T * 8)) * 0.12; break; }
  }
  if (a.flinch > 0) { const f = a.flinch; r.torso.rotation.x -= 0.45 * f; r.head.rotation.x -= 0.35 * f; r.body.position.z -= 0.1 * f; r.armL.sh.rotation.z -= 0.4 * f; r.armR.sh.rotation.z += 0.4 * f; }
  if (a.enraged && (a.state === 'idle' || a.state === 'run')) { r.torso.rotation.x += 0.12; r.head.rotation.x -= 0.1; }
  if (r.tail.children.length) { let g = r.tail.children[0], i = 0; r.tail.rotation.x = 0.4; while (g) { g.rotation.y = Math.sin(T * 3 - i) * 0.25; g.rotation.x = -0.12; g = g.children.find(c => c.isGroup); i++; } }
  r.wings.forEach((w, i) => { w.rotation.y = (i ? 1 : -1) * (0.5 + Math.sin(T * 5) * 0.25); });
}

const easeIO = (x) => x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2, easeOutExpo = (x) => x >= 1 ? 1 : 1 - Math.pow(2, -10 * x), easeOutBack = (x) => 1 + 2.2 * Math.pow(x - 1, 3) + 1.2 * Math.pow(x - 1, 2);
// 무기별 콤보 동작: 예비동작(anticipation) → 빠른 타격(strike) → 여운(follow-through)
export const ATK_STYLE = { sns: ['hor', 'rev', 'over', 'spin'], gs: ['over', 'hor', 'upper', 'over'], ls: ['over', 'hor', 'upper', 'spin'], hammer: ['hor', 'upper', 'over', 'spin'], db: ['hor', 'rev', 'hor', 'rev'] };
const POSES = {
  hor:   { w: { arx: -1.4, arz: 1.6, ty: 0.85, by: -0.02 }, s: { arx: -1.35, arz: -1.4, ty: -0.75, bz: 0.22, by: -0.06 }, e: { arx: -1.1, arz: -1.0, ty: -0.45, bz: 0.14, by: -0.04 } },
  rev:   { w: { arx: -1.5, arz: -1.3, ty: -0.7 }, s: { arx: -1.35, arz: 1.5, ty: 0.75, bz: 0.22, by: -0.06 }, e: { arx: -1.1, arz: 1.0, ty: 0.45, bz: 0.14, by: -0.04 } },
  over:  { w: { arx: -3.0, tx: -0.3, ty: 0.25, by: 0.03, alx: -0.6 }, s: { arx: 0.55, tx: 0.5, bz: 0.26, by: -0.12, alx: 0.4 }, e: { arx: 0.25, tx: 0.25, bz: 0.16, by: -0.07, alx: 0.2 } },
  upper: { w: { arx: 0.7, tx: 0.35, by: -0.12, ty: -0.3 }, s: { arx: -2.8, tx: -0.3, by: 0.05, bz: 0.18, ty: 0.3 }, e: { arx: -2.2, tx: -0.15, by: 0.02, bz: 0.12, ty: 0.2 } },
  spin:  { w: { arx: -1.5, arz: 0.6, rot: -0.6, by: -0.05 }, s: { arx: -1.5, arz: 0.6, rot: Math.PI * 2, bz: 0.15, by: -0.08 }, e: { arx: -1.3, arz: 0.4, rot: Math.PI * 2, bz: 0.1 } },
};
function swingPose(r, style, p, wind, heavy, wtype) {
  const P = POSES[style], strikeEnd = wind + (1 - wind) * (heavy ? 0.22 : 0.3);
  let A, B, k;
  if (p < wind) { A = {}; B = P.w; k = easeIO(p / wind); }
  else if (p < strikeEnd) { A = P.w; B = P.s; k = easeOutExpo((p - wind) / (strikeEnd - wind)); }
  else { A = P.s; B = P.e; k = easeOutBack(Math.min(1, (p - strikeEnd) / (1 - strikeEnd))) ; k = Math.min(1.05, k); }
  const v = (key) => (A[key] || 0) + ((B[key] || 0) - (A[key] || 0)) * k;
  const crouch = heavy || wtype === 'gs' || wtype === 'hammer' ? 1.6 : 1;
  r.armR.sh.rotation.x = v('arx') || -0.2; r.armR.sh.rotation.z = (v('arz') || 0) + 0.18; r.torso.rotation.y = v('ty'); r.torso.rotation.x = v('tx');
  r.body.position.z = v('bz') * crouch; r.body.position.y = v('by') * crouch; r.body.rotation.y = v('rot'); r.armL.sh.rotation.x = v('alx') || -0.3;
  r.armR.el.rotation.x = p < wind ? -0.6 : -0.15;
  const st = p >= wind ? 1 : easeIO(p / wind); r.legL.sh.rotation.x = -0.75 * st; r.legR.sh.rotation.x = 0.5 * st; r.legL.el.rotation.x = 0.6 * st; r.legR.el.rotation.x = 0.25 * st;
  if (wtype === 'db') { r.armL.sh.rotation.x = r.armR.sh.rotation.x; r.armL.sh.rotation.z = -r.armR.sh.rotation.z; }
}
export { part as bodyPart, G as GEO };
