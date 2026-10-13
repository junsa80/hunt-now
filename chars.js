// 절차적 미소녀 캐릭터: 툰 셰이딩 + 인버티드 헐 외곽선 + 관절 계층
import * as THREE from './vendor/three.module.js';

const grad = (() => { const d = new Uint8Array([70, 70, 70, 255, 160, 160, 160, 255, 255, 255, 255, 255]);
  const t = new THREE.DataTexture(d, 3, 1, THREE.RGBAFormat); t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true; return t; })();
const matCache = new Map();
export function toon(color, emissive = 0) {
  const k = color + ':' + emissive; if (matCache.has(k)) return matCache.get(k);
  const m = new THREE.MeshToonMaterial({ color, gradientMap: grad, emissive, emissiveIntensity: emissive ? 0.6 : 0 });
  matCache.set(k, m); return m;
}
const outlineMat = new THREE.MeshBasicMaterial({ color: 0x1a1020, side: THREE.BackSide });
const G = {
  sph: new THREE.SphereGeometry(1, 16, 12), cap: new THREE.CapsuleGeometry(1, 1, 4, 10), cone: new THREE.ConeGeometry(1, 1, 14, 1, true),
  cone8: new THREE.ConeGeometry(1, 1, 8), box: new THREE.BoxGeometry(1, 1, 1), cyl: new THREE.CylinderGeometry(1, 1, 1, 10),
  bang: new THREE.SphereGeometry(1, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), torus: new THREE.TorusGeometry(1, 0.25, 6, 14),
  wing: (() => { const s = new THREE.Shape(); s.moveTo(0, 0); s.quadraticCurveTo(0.6, 0.9, 1.1, 0.7); s.lineTo(0.9, 0.35); s.lineTo(1.0, 0.1); s.lineTo(0.7, -0.05); s.lineTo(0.75, -0.35); s.quadraticCurveTo(0.3, -0.2, 0, 0); return new THREE.ShapeGeometry(s); })(),
};
function part(parent, geo, mat, sx, sy, sz, x = 0, y = 0, z = 0, outline = true) {
  const m = new THREE.Mesh(geo, mat); m.scale.set(sx, sy, sz); m.position.set(x, y, z); parent.add(m);
  if (outline) { const o = new THREE.Mesh(geo, outlineMat); o.scale.setScalar(1.09); m.add(o); }
  return m;
}
function faceTex(eye, angry) {
  const c = document.createElement('canvas'); c.width = 128; c.height = 64; const g = c.getContext('2d');
  const drawEye = (x) => {
    g.fillStyle = '#fff'; g.beginPath(); g.ellipse(x, 30, 13, 17, 0, 0, 7); g.fill();
    g.fillStyle = eye; g.beginPath(); g.ellipse(x, 32, 10, 14, 0, 0, 7); g.fill();
    g.fillStyle = '#1a0f22'; g.beginPath(); g.ellipse(x, 34, 5, 8, 0, 0, 7); g.fill();
    g.fillStyle = '#fff'; g.beginPath(); g.arc(x - 4, 25, 4, 0, 7); g.fill(); g.beginPath(); g.arc(x + 4, 38, 2, 0, 7); g.fill();
    g.strokeStyle = '#1a0f22'; g.lineWidth = 4; g.beginPath();
    if (angry) { g.moveTo(x - 15, x < 64 ? 10 : 16); g.lineTo(x + 15, x < 64 ? 16 : 10); } else g.ellipse(x, 30, 14, 18, 0, Math.PI * 1.1, Math.PI * 1.9);
    g.stroke();
  };
  drawEye(36); drawEye(92);
  g.fillStyle = '#ff8fb0aa'; g.beginPath(); g.ellipse(18, 52, 9, 4, 0, 0, 7); g.ellipse(110, 52, 9, 4, 0, 0, 7); g.fill();
  g.strokeStyle = '#7a2a3a'; g.lineWidth = 3; g.beginPath(); g.arc(64, 50, 5, 0.2, Math.PI - 0.2); g.stroke();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
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
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.4, 16), new THREE.MeshBasicMaterial({ color: 0, transparent: true, opacity: 0.35, depthWrite: false }));
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
  const breath = Math.sin(T * 2.4);
  r.torso.rotation.x = 0.03 * breath; r.armL.sh.rotation.z = -0.18 - 0.03 * breath; r.armR.sh.rotation.z = 0.18 + 0.03 * breath;
  r.armL.el.rotation.x = r.armR.el.rotation.x = -0.25; r.body.position.y = 0.01 * breath;
  const run = a.run || 0;
  if (run > 0.05) { const ph = T * 11 * (a.speedMul || 1), s = Math.sin(ph) * run;
    r.legL.sh.rotation.x = s * 0.9; r.legR.sh.rotation.x = -s * 0.9; r.legL.el.rotation.x = Math.max(0, -s) * 1.1 + 0.1; r.legR.el.rotation.x = Math.max(0, s) * 1.1 + 0.1;
    r.armL.sh.rotation.x = -s * 0.8; r.armR.sh.rotation.x = s * 0.8; r.torso.rotation.x = 0.18 * run; r.body.position.y = Math.abs(Math.cos(ph)) * 0.07 * run;
    r.torso.rotation.y = s * 0.15; r.skirt.rotation.x = -0.15 * run; } else r.skirt.rotation.x = 0;
  const p = a.p ?? 0, ease = (x) => 1 - Math.pow(1 - x, 3);
  switch (a.state) {
    case 'attack': if (a.wtype === 'bow') { r.armL.sh.rotation.x = -1.55; r.armL.el.rotation.x = 0; r.armR.sh.rotation.x = -1.5; r.armR.sh.rotation.z = -0.5; r.armR.el.rotation.x = -1.6 * (1 - p); r.torso.rotation.y = 0.5; r.legL.sh.rotation.x = -0.3; r.legR.sh.rotation.x = 0.3; break; }
      if (a.wtype === 'lance') { const k = p < 0.3 ? -p / 0.3 : Math.min(1, (p - 0.3) / 0.25); r.armR.sh.rotation.x = -1.5; r.armR.el.rotation.x = 0; r.armR.sh.rotation.z = 0.1; r.body.position.z = 0.25 * k; r.torso.rotation.x = 0.2 * k; r.armL.sh.rotation.x = -1.3; r.armL.sh.rotation.z = 0.5; r.legL.sh.rotation.x = -0.6; r.legR.sh.rotation.x = 0.5; break; }
      if (a.wtype === 'db') { const c2 = (a.combo || 0) % 2, e2 = ease(p); r.armR.sh.rotation.x = -1.4; r.armL.sh.rotation.x = -1.4; r.armR.sh.rotation.z = c2 ? 1.4 - 2.6 * e2 : -1.2 + 2.6 * e2; r.armL.sh.rotation.z = c2 ? 1.2 - 2.6 * e2 : -1.4 + 2.6 * e2; r.torso.rotation.y = (c2 ? 0.5 : -0.5) * (1 - 2 * e2); r.legL.sh.rotation.x = -0.5; r.legR.sh.rotation.x = 0.4; break; }
    { const c = a.combo % 4, heavy = a.heavy;
      const wind = heavy ? 0.45 : 0.3, e = p < wind ? p / wind : ease((p - wind) / (1 - wind)), up = p < wind;
      if (c === 1) { // 가로 베기
        r.armR.sh.rotation.x = -1.4; r.armR.sh.rotation.z = up ? 1.4 * e : 1.4 - 2.8 * e; r.torso.rotation.y = up ? 0.6 * e : 0.6 - 1.4 * e; }
      else if (c === 3) { // 회전 마무리
        r.body.rotation.y = up ? -0.5 * e : -0.5 + Math.PI * 2 * e; r.armR.sh.rotation.x = -1.5; r.armR.sh.rotation.z = 0.6; }
      else { r.armR.sh.rotation.x = up ? -2.8 * e : -2.8 + 3.6 * e; r.torso.rotation.x = up ? -0.2 * e : -0.2 + 0.6 * e; r.armL.sh.rotation.x = up ? -0.5 : 0.3; }
      r.legL.sh.rotation.x = -0.5; r.legR.sh.rotation.x = 0.4; r.legL.el.rotation.x = 0.4; r.body.position.y = -0.04; break; }
    case 'dance': { r.body.rotation.y = T * 16; r.armL.sh.rotation.z = -1.5; r.armR.sh.rotation.z = 1.5; r.armL.sh.rotation.x = r.armR.sh.rotation.x = -0.4; r.body.position.y = 0.05 + Math.abs(Math.sin(T * 16)) * 0.08; break; }
    case 'special': { r.body.rotation.y = p * Math.PI * 4; r.armR.sh.rotation.x = -2.6 + Math.sin(p * 30) * 1.2; r.armL.sh.rotation.x = -1.8; r.body.position.y = 0.25 * Math.sin(p * Math.PI); break; }
    case 'charge': if (a.wtype === 'bow') { r.armL.sh.rotation.x = -1.55; r.armL.el.rotation.x = 0; r.armR.sh.rotation.x = -1.5; r.armR.sh.rotation.z = -0.5; r.armR.el.rotation.x = -1.8; r.torso.rotation.y = 0.5; break; } { const sh = Math.sin(T * 60) * 0.02 * (a.lvl || 1);
      r.armR.sh.rotation.x = -2.6 + sh; r.armL.sh.rotation.x = -2.4; r.torso.rotation.x = -0.25; r.torso.rotation.y = 0.4; r.legL.sh.rotation.x = -0.6; r.legR.sh.rotation.x = 0.5; r.legL.el.rotation.x = 0.6; r.body.position.y = -0.1; break; }
    case 'roll': { r.body.rotation.x = p * Math.PI * 2; r.body.position.y = 0.35 * Math.sin(p * Math.PI) - 0.2; r.legL.sh.rotation.x = r.legR.sh.rotation.x = -1.6; r.legL.el.rotation.x = r.legR.el.rotation.x = 2;
      r.armL.sh.rotation.x = r.armR.sh.rotation.x = -1.2; r.torso.rotation.x = 0.8; break; }
    case 'hit': { r.torso.rotation.x = -0.5 * (1 - p); r.head.rotation.x = -0.4 * (1 - p); r.armL.sh.rotation.z = -0.9; r.armR.sh.rotation.z = 0.9; break; }
    case 'stun': { r.head.rotation.z = Math.sin(T * 6) * 0.3; r.torso.rotation.x = 0.4; r.armL.sh.rotation.x = r.armR.sh.rotation.x = 0.3; r.body.position.y = -0.1; break; }
    case 'down': { r.body.rotation.x = -Math.PI / 2 * Math.min(1, p * 3); r.body.position.y = 0.15; break; }
    case 'windup': { const k = a.kind; // 몬스터 예비 동작
      if (k === 'slam') { r.armL.sh.rotation.x = r.armR.sh.rotation.x = -3 * ease(p); r.torso.rotation.x = -0.3 * p; r.body.position.y = 0.15 * p; }
      else if (k === 'charge') { r.torso.rotation.x = 0.6 * p; r.body.position.y = -0.15 * p; r.legL.sh.rotation.x = -0.8; r.legR.sh.rotation.x = 0.7; r.armL.sh.rotation.x = r.armR.sh.rotation.x = 1.1; }
      else if (k === 'cast') { r.armR.sh.rotation.x = -2.9; r.armL.sh.rotation.x = -2.0; r.armL.sh.rotation.z = -0.6; r.body.position.y = 0.05 * Math.sin(T * 8); }
      else { r.armR.sh.rotation.x = -2.2 * p; r.torso.rotation.y = 0.6 * p; }
      break; }
    case 'strike': { r.armL.sh.rotation.x = r.armR.sh.rotation.x = 0.8; r.torso.rotation.x = 0.5; r.body.position.y = -0.08; break; }
    case 'guard': if (a.wtype === 'lance') { r.armL.sh.rotation.x = -1.3; r.armL.sh.rotation.z = 0.5; r.armR.sh.rotation.x = -1.3; r.torso.rotation.x = 0.25; r.legL.sh.rotation.x = -0.6; r.legR.sh.rotation.x = 0.6; r.body.position.y = -0.08; break; } { r.armL.sh.rotation.x = -1.4; r.armL.sh.rotation.z = 0.6; r.torso.rotation.x = 0.15; r.legL.sh.rotation.x = -0.4; r.legR.sh.rotation.x = 0.4; break; }
    case 'cheer': { r.armL.sh.rotation.z = -2.6; r.armR.sh.rotation.z = 2.6; r.body.position.y = Math.abs(Math.sin(T * 8)) * 0.12; break; }
  }
  if (r.tail.children.length) { let g = r.tail.children[0], i = 0; r.tail.rotation.x = 0.4; while (g) { g.rotation.y = Math.sin(T * 3 - i) * 0.25; g.rotation.x = -0.12; g = g.children.find(c => c.isGroup); i++; } }
  r.wings.forEach((w, i) => { w.rotation.y = (i ? 1 : -1) * (0.5 + Math.sin(T * 5) * 0.25); });
}
