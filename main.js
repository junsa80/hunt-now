import * as THREE from './vendor/three.module.js';
import { buildGirl, animate, setWeapon, toon } from './chars.js';
import { ELEM, STATUS, SPECIES, ROLES, ROLE_DESC, WEAPON_TYPES, ELEM_SRC, QUAL, qualOf, NAMES, ACCS } from './data.js';

const $ = (id) => document.getElementById(id);
const rnd = (a, b) => a + Math.random() * (b - a), clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const SAVE_KEY = 'huntnow.save', SAVE_V = 2;

// ───────── 저장 ─────────
function freshSave() {
  return { v: SAVE_V, savedAt: Date.now(), hr: 1, hrXp: 0, mats: {}, weapons: [{ id: 'w1', type: 'sns', elem: 'none', lvl: 1 }, { id: 'w2', type: 'gs', elem: 'none', lvl: 1 }],
    armors: [{ id: 'a1', sp: 'none', lvl: 1 }], equip: { weapon: 'w1', armor: 'a1' }, comps: [], party: [], settings: { sound: true, vib: true, shake: true },
    stats: { hunts: 0, wins: 0, purified: 0, fails: 0 }, codex: {}, nodes: null, nextId: 3 };
}
function migrate(s) {
  if (!s || typeof s !== 'object') return freshSave();
  if (!s.v || s.v < 2) { // v1: settings·codex·armors 없음
    const f = freshSave(); s = Object.assign(f, s); s.settings = Object.assign(f.settings, s.settings || {}); s.codex = s.codex || {}; s.armors = s.armors?.length ? s.armors : f.armors; s.v = 2;
  }
  return s;
}
let save;
try { save = migrate(JSON.parse(localStorage.getItem(SAVE_KEY))); } catch { save = freshSave(); }
let saveStatus = '';
function persist() { save.savedAt = Date.now(); try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); saveStatus = '저장됨 ' + new Date().toLocaleTimeString('ko-KR'); } catch (e) { saveStatus = '저장 실패: ' + e.message; } }
persist();
const newId = (p) => p + (save.nextId++);
const mat = (k) => save.mats[k] || 0;
const addMat = (k, n) => { save.mats[k] = mat(k) + n; };
const matName = (k) => { const [sp, kind, q] = k.split(':'); const S = SPECIES[sp]; const pn = kind === 'hide' ? '비늘가죽' : (S.parts.find(p => p.key === kind)?.n || kind) + ' 소재'; return `${S.short}의 ${pn} (${QUAL[q]})`; };
const matPoints = (sp, kind) => [1, 2, 3].reduce((a, q) => a + mat(`${sp}:${kind}:${q}`) * q, 0);
function spendPoints(sp, kind, pts) { for (let q = 1; q <= 3 && pts > 0; q++) { const k = `${sp}:${kind}:${q}`; while (mat(k) > 0 && pts > 0) { save.mats[k]--; pts -= q; } } }
const partPoints = (sp) => SPECIES[sp].parts.reduce((a, p) => a + matPoints(sp, p.key), 0);
function spendPartPoints(sp, pts) { for (const p of SPECIES[sp].parts) { const have = matPoints(sp, p.key); const use = Math.min(have, pts); spendPoints(sp, p.key, use); pts -= use; } }

// ───────── 설정/효과 ─────────
let actx;
function sfx(kind) {
  if (!save.settings.sound) return;
  try { actx = actx || new (window.AudioContext || window.webkitAudioContext)(); } catch { return; }
  const t = actx.currentTime, o = actx.createOscillator(), g = actx.createGain(); o.connect(g); g.connect(actx.destination);
  const P = { swing: [320, 120, 0.08, 'triangle', 0.05], hit: [180, 60, 0.12, 'square', 0.12], heavy: [120, 40, 0.25, 'sawtooth', 0.18], roll: [200, 300, 0.1, 'sine', 0.05],
    perfect: [880, 1760, 0.3, 'sine', 0.12], brk: [90, 30, 0.4, 'sawtooth', 0.2], hurt: [260, 90, 0.2, 'square', 0.1], charge: [400, 800, 0.12, 'sine', 0.06], win: [523, 1046, 0.6, 'triangle', 0.12] }[kind] || [300, 200, 0.1, 'sine', 0.05];
  o.type = P[3]; o.frequency.setValueAtTime(P[0], t); o.frequency.exponentialRampToValueAtTime(P[1], t + P[2]); g.gain.setValueAtTime(P[4], t); g.gain.exponentialRampToValueAtTime(0.001, t + P[2]); o.start(t); o.stop(t + P[2] + 0.02);
}
const vib = (ms) => { if (save.settings.vib && navigator.vibrate) navigator.vibrate(ms); };

// ───────── 렌더러/씬 ─────────
const cv = $('cv');
const renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(2, devicePixelRatio)); renderer.outputColorSpace = THREE.SRGBColorSpace;
const scene = new THREE.Scene(); scene.background = new THREE.Color(0x9fc8ff); scene.fog = new THREE.Fog(0x9fc8ff, 26, 60);
const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 120);
scene.add(new THREE.HemisphereLight(0xfff4e8, 0x5a6a4a, 1.6));
const sun = new THREE.DirectionalLight(0xffffff, 1.6); sun.position.set(6, 12, 4); scene.add(sun);
function resize() { const w = innerWidth, h = innerHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.fov = w < h ? 68 : 55; camera.updateProjectionMatrix(); }
addEventListener('resize', resize); resize();
// 경기장
const ARENA = 20;
{
  const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d'); g.fillStyle = '#6fae5a'; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 900; i++) { g.fillStyle = ['#64a050', '#7cbc64', '#5a9448', '#86c46a'][i % 4]; g.fillRect(Math.random() * 256, Math.random() * 256, 3, 6); }
  const tex = new THREE.CanvasTexture(c); tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(10, 10); tex.colorSpace = THREE.SRGBColorSpace;
  const ground = new THREE.Mesh(new THREE.CircleGeometry(48, 48), new THREE.MeshToonMaterial({ map: tex })); ground.rotation.x = -Math.PI / 2; scene.add(ground);
  const ring = new THREE.Mesh(new THREE.RingGeometry(ARENA - 0.3, ARENA, 64), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.25 })); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.02; scene.add(ring);
  const trunk = new THREE.CylinderGeometry(0.25, 0.35, 1.6, 6), leaf = new THREE.ConeGeometry(1.6, 3.2, 7), rock = new THREE.DodecahedronGeometry(1);
  const tm = toon(0x7a5232), lm = [toon(0x3f8a4a), toon(0x2f7a50), toon(0x5a9a3a)], rm = toon(0x9a9aa8);
  const trunks = new THREE.InstancedMesh(trunk, tm, 46), leaves = new THREE.InstancedMesh(leaf, lm[0], 46), rocks = new THREE.InstancedMesh(rock, rm, 30);
  const d = new THREE.Object3D();
  for (let i = 0; i < 46; i++) { const a = i / 46 * Math.PI * 2 + rnd(-0.05, 0.05), r = rnd(ARENA + 2, ARENA + 14), s = rnd(0.8, 1.6);
    d.position.set(Math.sin(a) * r, 0.8 * s, Math.cos(a) * r); d.scale.setScalar(s); d.rotation.set(0, 0, 0); d.updateMatrix(); trunks.setMatrixAt(i, d.matrix);
    d.position.y = 2.9 * s; d.updateMatrix(); leaves.setMatrixAt(i, d.matrix); leaves.setColorAt(i, new THREE.Color([0x3f8a4a, 0x2f7a50, 0x5a9a3a][i % 3])); }
  for (let i = 0; i < 30; i++) { const a = rnd(0, 7), r = rnd(ARENA + 0.5, ARENA + 6), s = rnd(0.4, 1.3); d.position.set(Math.sin(a) * r, 0.2 * s, Math.cos(a) * r); d.scale.set(s, s * 0.7, s); d.rotation.set(rnd(0, 3), rnd(0, 3), 0); d.updateMatrix(); rocks.setMatrixAt(i, d.matrix); }
  scene.add(trunks, leaves, rocks);
}

// ───────── 효과: 파티클, 베기 궤적, 텔레그래프 ─────────
const pGeo = new THREE.OctahedronGeometry(0.08), particles = [];
const pMats = {};
function burst(pos, color, n = 10, spd = 5, life = 0.5) {
  const m = pMats[color] || (pMats[color] = new THREE.MeshBasicMaterial({ color, transparent: true }));
  for (let i = 0; i < n; i++) { let p = particles.find(q => !q.alive); if (!p) { if (particles.length > 160) return; p = { mesh: new THREE.Mesh(pGeo, m) }; scene.add(p.mesh); particles.push(p); }
    p.mesh.material = m; p.alive = true; p.life = p.max = life * rnd(0.6, 1.2); p.mesh.visible = true; p.mesh.position.copy(pos);
    p.v = new THREE.Vector3(rnd(-1, 1), rnd(0.2, 1.4), rnd(-1, 1)).normalize().multiplyScalar(spd * rnd(0.5, 1.2)); }
}
function updParticles(dt) { for (const p of particles) if (p.alive) { p.life -= dt; if (p.life <= 0) { p.alive = false; p.mesh.visible = false; continue; } p.v.y -= 9 * dt; p.mesh.position.addScaledVector(p.v, dt); p.mesh.scale.setScalar(p.life / p.max * 1.4 + 0.2); } }
const trailGeo = new THREE.RingGeometry(1.2, 2.2, 24, 1, -0.9, 1.8).rotateX(-Math.PI / 2);
const trails = [];
function slashTrail(ent, color, scale, vertical) {
  const m = new THREE.Mesh(trailGeo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }));
  m.position.copy(ent.pos); m.position.y = 1.0; m.rotation.y = ent.face - Math.PI / 2; m.rotation.order = 'YXZ'; if (vertical) m.rotation.z = Math.PI / 2.3; m.scale.setScalar(scale); scene.add(m); trails.push({ m, life: 0.18 });
}
function updTrails(dt) { for (let i = trails.length - 1; i >= 0; i--) { const t = trails[i]; t.life -= dt; t.m.material.opacity = Math.max(0, t.life / 0.18) * 0.85; if (t.life <= 0) { scene.remove(t.m); t.m.material.dispose(); trails.splice(i, 1); } } }
// 텔레그래프: shape {type:'circle'|'cone'|'line'|'ring', x,z, a(방향), r, r2, ang, w, len}
const telegraphs = [];
function makeTele(sh, dur) {
  const grp = new THREE.Group(); grp.position.set(sh.x, 0.03 + telegraphs.length * 0.002, sh.z); grp.rotation.y = sh.a || 0;
  let geo, fillGeo;
  if (sh.type === 'circle') { geo = new THREE.CircleGeometry(sh.r, 40); fillGeo = geo; }
  else if (sh.type === 'cone') { geo = new THREE.CircleGeometry(sh.r, 24, Math.PI / 2 - sh.ang / 2, sh.ang); fillGeo = geo; }
  else if (sh.type === 'line') { geo = new THREE.PlaneGeometry(sh.w, sh.len).translate(0, sh.len / 2, 0); fillGeo = geo; }
  else { geo = new THREE.RingGeometry(sh.r, sh.r2, 48); fillGeo = geo; }
  geo = geo.clone().rotateX(Math.PI / 2);
  const base = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0xff2040, transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false }));
  const fill = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0xff4020, transparent: true, opacity: 0.45, side: THREE.DoubleSide, depthWrite: false }));
  const edge = new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({ color: 0xffd0d0 }));
  fill.position.y = 0.005; grp.add(base, fill, edge); scene.add(grp);
  const t = { sh, grp, fill, t: 0, dur }; telegraphs.push(t); setTeleP(t, 0); return t;
}
function setTeleP(t, p) { const k = Math.max(0.02, p), ty = t.sh.type; if (ty === 'line') t.fill.scale.set(1, 1, k); else if (ty === 'ring') { t.fill.scale.setScalar(1); t.fill.material.opacity = 0.15 + 0.5 * p; } else t.fill.scale.set(k, 1, k);
  t.fill.material.color.setHex(p > 0.85 ? 0xffe040 : 0xff4020); }
function killTele(t) { scene.remove(t.grp); t.grp.traverse(o => { o.geometry?.dispose(); o.material?.dispose(); }); telegraphs.splice(telegraphs.indexOf(t), 1); }
function inShape(sh, x, z, rad = 0.35) {
  const dx = x - sh.x, dz = z - sh.z, d = Math.hypot(dx, dz);
  if (sh.type === 'circle') return d < sh.r + rad;
  if (sh.type === 'ring') return d > sh.r - rad && d < sh.r2 + rad;
  const fx = Math.sin(sh.a), fz = Math.cos(sh.a), along = dx * fx + dz * fz, perp = Math.abs(dx * fz - dz * fx);
  if (sh.type === 'line') return along > -rad && along < sh.len + rad && perp < sh.w / 2 + rad;
  if (sh.type === 'cone') return d < sh.r + rad && (d < 0.6 || Math.acos(clamp(along / d, -1, 1)) < sh.ang / 2 + 0.1);
}

// ───────── 데미지 숫자/대사/배너 ─────────
const dmgLayer = $('dmgLayer'), v3 = new THREE.Vector3();
function popNum(pos, txt, cls = '') {
  v3.copy(pos); v3.y += 1.8; v3.project(camera); if (v3.z > 1) return;
  const el = document.createElement('div'); el.className = 'dmg ' + cls; el.textContent = txt;
  el.style.left = ((v3.x + 1) / 2 * innerWidth + rnd(-18, 18)) + 'px'; el.style.top = ((1 - v3.y) / 2 * innerHeight) + 'px'; dmgLayer.appendChild(el); setTimeout(() => el.remove(), 800);
}
let lineTimer;
function say(txt, who) { const l = $('line'); l.textContent = (who ? who + ': ' : '') + txt; l.classList.add('on'); clearTimeout(lineTimer); lineTimer = setTimeout(() => l.classList.remove('on'), 2600); }
let bannerTimer;
function banner(txt, ms = 1200) { const b = $('banner'); b.textContent = txt; b.classList.add('on'); clearTimeout(bannerTimer); bannerTimer = setTimeout(() => b.classList.remove('on'), ms); }

// ───────── 입력 ─────────
const input = { mx: 0, mz: 0, atkDown: false, atkT: 0, atkTap: false, atkRelease: false, dodge: false, target: false };
{
  const zone = $('joyzone'), joy = $('joy'), knob = $('knob'); let jid = null, cx = 0, cy = 0;
  const setKnob = (dx, dy) => { const m = Math.hypot(dx, dy), R = 50; if (m > R) { dx *= R / m; dy *= R / m; } knob.style.transform = `translate(${dx}px,${dy}px)`; input.mx = dx / R; input.mz = dy / R; };
  const start = (x, y) => { const r = zone.getBoundingClientRect(); cx = x; cy = y; joy.style.left = (x - r.left - 65) + 'px'; joy.style.bottom = (r.bottom - y - 65) + 'px'; setKnob(0, 0); };
  zone.addEventListener('touchstart', e => { e.preventDefault(); if (jid !== null) return; const t = e.changedTouches[0]; jid = t.identifier; start(t.clientX, t.clientY); }, { passive: false });
  zone.addEventListener('touchmove', e => { e.preventDefault(); for (const t of e.changedTouches) if (t.identifier === jid) setKnob(t.clientX - cx, t.clientY - cy); }, { passive: false });
  const end = e => { for (const t of e.changedTouches) if (t.identifier === jid) { jid = null; setKnob(0, 0); } };
  zone.addEventListener('touchend', end); zone.addEventListener('touchcancel', end);
  let md = false; zone.addEventListener('mousedown', e => { md = true; start(e.clientX, e.clientY); }); addEventListener('mousemove', e => { if (md) setKnob(e.clientX - cx, e.clientY - cy); }); addEventListener('mouseup', () => { if (md) { md = false; setKnob(0, 0); } });
  const btn = (id, down, up) => { const b = $(id); b.addEventListener('touchstart', e => { e.preventDefault(); down(); }, { passive: false }); b.addEventListener('touchend', e => { e.preventDefault(); up && up(); }, { passive: false });
    b.addEventListener('mousedown', e => { e.preventDefault(); down(); }); b.addEventListener('mouseup', () => up && up()); };
  btn('bAtk', () => { input.atkDown = true; input.atkT = 0; }, () => { if (!input.atkDown) return; input.atkDown = false; if (input.atkT < 0.22) input.atkTap = true; else input.atkRelease = true; });
  btn('bDodge', () => { input.dodge = true; }); btn('bTarget', () => { input.target = true; });
  const keys = {}; addEventListener('keydown', e => { if (e.repeat) return; keys[e.code] = 1; if (e.code === 'KeyJ') { input.atkDown = true; input.atkT = 0; } if (e.code === 'KeyK' || e.code === 'Space') input.dodge = true; if (e.code === 'KeyL') input.target = true; kmove(); });
  addEventListener('keyup', e => { keys[e.code] = 0; if (e.code === 'KeyJ' && input.atkDown) { input.atkDown = false; if (input.atkT < 0.22) input.atkTap = true; else input.atkRelease = true; } kmove(); });
  const kmove = () => { if (jid !== null || md) return; input.mx = (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0); input.mz = (keys.KeyS ? 1 : 0) - (keys.KeyW ? 1 : 0); };
}

// ───────── 전투 상태 ─────────
let G = null; // 현재 사냥
const HUNT_TIME = 100;
function weaponById(id) { return save.weapons.find(w => w.id === id); }
function armorById(id) { return save.armors.find(a => a.id === id); }
const weaponAtk = (w) => w ? Math.round(WEAPON_TYPES[w.type].base * (1 + 0.15 * (w.lvl - 1)) * (w.elem === 'none' ? 1 : 1.05)) : 6;
const armorDef = (a) => a ? (a.sp === 'none' ? 8 : 14) + a.lvl * 6 : 0;
const defMul = (def) => 60 / (60 + def);
const elemColor = (e) => ELEM[e]?.col ?? 0xffffff;

function makeEntity(model, o) {
  scene.add(model);
  return Object.assign({ model, pos: model.position, face: 0, vel: new THREE.Vector3(), state: 'idle', st: 0, run: 0, hitFlash: 0, status: {}, build: { fire: 0, ice: 0, thunder: 0 } }, o);
}
function compStats(c) {
  const w = weaponById(c.weapon), a = armorById(c.armor), pm = 1 + 0.1 * (c.potential - 1);
  return { hp: Math.round((70 + c.level * 7) * pm + armorDef(a) * 1.5), atk: Math.round((4 + c.level * 1.1) * pm + weaponAtk(w) * 0.45), def: armorDef(a) * 0.6, elem: w?.elem && w.elem !== 'none' ? w.elem : SPECIES[c.species].elem, wtype: w?.type || 'sns' };
}
function startHunt(node) {
  ui(''); $('hud').classList.remove('hidden');
  const w = weaponById(save.equip.weapon), arm = armorById(save.equip.armor), wt = WEAPON_TYPES[w.type];
  const pm = buildGirl({ skin: 0xffe3d3, hair: 0xf5d36a, eye: '#3a8aff', cloth: 0xf2f2ff, cloth2: 0xd84a6a, accent: 0xffd54a, hairStyle: 'pony', weapon: w.type, weaponColor: w.elem === 'none' ? 0xdfe6ff : elemColor(w.elem), shield: w.type === 'sns' ? 0xb04050 : null });
  const player = makeEntity(pm, { team: 0, name: '헌터', maxHp: 150 + armorDef(arm) * 0.5 | 0, atk: weaponAtk(w), def: armorDef(arm), elem: w.elem, wt, wtype: w.type, combo: -1, comboT: 0, queued: false, charge: 0, chargeLvl: 0, iframe: 0, rollStart: -9, invul: 0, counter: 0, hitsTaken: 0, isPlayer: true });
  player.hp = player.maxHp; player.pos.set(0, 0, 8); player.face = Math.PI;
  const allies = [player];
  for (const cid of save.party) { const c = save.comps.find(x => x.id === cid); if (!c) continue; const S = SPECIES[c.species], st = compStats(c);
    const look = Object.assign({}, S.look, { angry: false, hair: c.hair, accessory: ACCS[c.acc], weapon: S.look.weapon, scale: 0.95 });
    const m = buildGirl(look); const e = makeEntity(m, { team: 0, name: c.name, comp: c, role: c.role, species: c.species, maxHp: st.hp, atk: st.atk, def: st.def, elem: st.elem, cd: rnd(0.5, 1.5), skillCd: rnd(2, 4), guard: 0 });
    e.hp = e.maxHp; e.pos.set(rnd(-3, 3), 0, 9 + rnd(0, 2)); e.face = Math.PI; allies.push(e); }
  const monsters = node.mons.map((mn, i) => { const S = SPECIES[mn.sp], L = mn.lvl;
    const m = buildGirl(Object.assign({}, S.look, { scale: S.scale + L * 0.02 }));
    const hp = Math.round(S.hp * (1 + 0.35 * (L - 1)) * (node.mons.length > 1 ? 0.75 : 1));
    const e = makeEntity(m, { team: 1, sp: mn.sp, S, lvl: L, name: `${S.short} Lv${L}`, maxHp: hp, dmg: S.dmg * (1 + 0.15 * (L - 1)), speed: S.speed * (1 + 0.03 * L), elem: S.elem, weak: S.weak, ai: 'move', aiT: 1.5 + i, atkCd: 1.6 + i * 1.5, cur: null, aggro: null, taunt: 0, defDown: 0, slow: 0,
      parts: S.parts.map(p => ({ ...p, hp: Math.round(hp * 0.22), max: Math.round(hp * 0.22), broken: false })) });
    e.hp = hp; e.pos.set((i - (node.mons.length - 1) / 2) * 5, 0, -6); e.face = 0; return e; });
  G = { node, player, allies, monsters, time: HUNT_TIME, t: 0, hitstop: 0, slowmo: 0, shake: 0, lock: monsters[0], camYaw: Math.PI, camPos: new THREE.Vector3(0, 5, 16), over: false,
    stats: { hits: 0, broken: 0, weakHits: 0, totalHits: 0, dealt: 0, perfect: 0 }, buff: 0, log: [] };
  const first = monsters[0]; say(first.S.lines.meet, first.S.short); sfx('win');
  buildPartyHud(); banner('사냥 시작!', 900);
}
function buildPartyHud() { $('party').innerHTML = G.allies.slice(1).map((a, i) => `<div>${a.name} <span class="tag">${ROLES[a.role]}</span><i id="ph${i}"></i></div>`).join(''); }

// ───────── 전투 로직 ─────────
const fwd = (a) => new THREE.Vector3(Math.sin(a), 0, Math.cos(a));
const angTo = (from, to) => Math.atan2(to.x - from.x, to.z - from.z);
const lerpAng = (a, b, k) => { let d = ((b - a + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI; return a + d * k; };
const alive = (e) => e.hp > 0;
function nearestMonster(p) { let best = null, bd = 1e9; for (const m of G.monsters) if (alive(m)) { const d = m.pos.distanceTo(p); if (d < bd) { bd = d; best = m; } } return best; }
function anchorWorld(m, part) { const u = m.model.userData; const o = part.anchor === 'wing' ? u.rig.wings[0] : u[part.anchor]; const v = new THREE.Vector3(); (o || m.model).getWorldPosition(v); return v; }
function setPartVisible(m, part, vis) { const u = m.model.userData;
  if (part.anchor === 'horn1') { u['horn1'] && (u['horn1'].visible = vis); u['horn-1'] && (u['horn-1'].scale.y = vis ? 0.28 : 0.1); }
  if (part.anchor === 'wing') u.rig.wings.forEach(w => w.scale.setScalar(vis ? 1 : 0.35));
  if (part.anchor === 'tailTip' && u.tailTip) { u.tailTip.visible = vis; u.rig.tail.scale.setScalar(vis ? 1 : 0.6); } }

function applyStatus(e, el, amt) {
  if (!STATUS[el] || amt <= 0) return; e.build[el] = (e.build[el] || 0) + amt;
  const th = e.team === 1 ? 100 : 60;
  if (e.build[el] >= th) { e.build[el] = 0; const k = STATUS[el].key; e.status[k] = k === 'burn' ? 4 : k === 'freeze' ? 3.5 : 2.2;
    popNum(e.pos, STATUS[el].n + '!', 'info'); burst(e.pos.clone().setY(1.2), elemColor(el), 16, 4);
    if (k === 'para' && e.team === 1) { e.ai = 'stun'; e.aiT = 2.2; clearMonsterTele(e); } }
}
function damageMonster(m, base, src, opt = {}) {
  if (!alive(m)) return;
  let dmg = base, cls = '';
  const weak = src.elem && src.elem === m.weak; if (weak) { dmg *= 1.35; cls = 'weak'; if (src.isPlayer) G.stats.weakHits++; }
  if (m.defDown > 0) dmg *= 1.25; if (G.buff > 0 && src.team === 0) dmg *= 1.25;
  if (m.ai === 'stun') dmg *= 1.15;
  if (opt.crit) { dmg *= 1.6; cls = 'crit'; }
  dmg = Math.round(dmg * rnd(0.92, 1.08));
  m.hp = Math.max(0, m.hp - dmg); m.hitFlash = src.isPlayer ? 0.07 : 0; if (src.isPlayer) { G.stats.dealt += dmg; G.stats.totalHits++; }
  popNum(opt.at || m.pos, dmg + (weak ? ' 약점!' : ''), cls);
  burst((opt.at || m.pos.clone().setY(1.1)), src.elem && src.elem !== 'none' ? elemColor(src.elem) : 0xfff2c0, opt.heavy ? 18 : 8, opt.heavy ? 7 : 4);
  if (src.elem && src.elem !== 'none') applyStatus(m, src.elem, (opt.heavy ? 34 : 14) * (weak ? 1.3 : 1));
  if (src.comp?.species === 'witch') applyStatus(m, 'ice', 6);
  // 부위
  if (opt.part && !opt.part.broken) { const p = opt.part; p.hp -= dmg * (opt.heavy ? 1.4 : 1);
    if (p.hp <= 0) { p.broken = true; G.stats.broken++; setPartVisible(m, p, false); m.ai = 'stun'; m.aiT = 2.6; clearMonsterTele(m);
      banner(`${p.n} 파괴!`); say(p === m.parts[0] ? m.S.lines.break : `크윽… 내 ${p.n}이…!`, m.S.short); sfx('brk'); vib([40, 30, 80]); G.shake = 0.5; G.hitstop = 0.12;
      burst(anchorWorld(m, p), 0xffd24a, 28, 8, 0.8); popNum(m.pos, '경직!', 'info'); G.log.push(p.n + ' 파괴'); } }
  if (m.hp <= 0) killMonster(m);
}
function killMonster(m) { m.ai = 'down'; m.aiT = 0; m.state = 'down'; m.st = 0; clearMonsterTele(m); say(m.S.lines.win, m.S.short); banner('토벌!'); sfx('win'); G.hitstop = 0.2; G.slowmo = 0.6;
  if (G.lock === m) G.lock = nearestMonster(G.player.pos); if (G.monsters.every(x => !alive(x))) setTimeout(() => endHunt(true), 1800); }
function clearMonsterTele(m) { if (m.cur) { m.cur.teles.forEach(killTele); m.cur = null; } }
function hurt(e, raw, el, from) {
  if (!alive(e) || G.over) return;
  if (e.isPlayer && e.iframe > 0) { // 회피 성공
    if (G.t - e.rollStart < 0.3) { if (!e._pd || G.t - e._pd > 0.5) { e._pd = G.t; G.stats.perfect++; e.counter = 1.6; G.slowmo = 0.35; $('flash').style.opacity = 0.5; setTimeout(() => $('flash').style.opacity = 0, 90); sfx('perfect'); vib(25); popNum(e.pos, '완벽 회피!', 'info'); $('counter').classList.remove('hidden'); } }
    else popNum(e.pos, '회피', 'info'); return; }
  if (e.invul > 0) return;
  let dmg = raw * defMul(e.def || 0);
  if (e.comp?.species === 'drake') dmg *= 0.8;
  if (e.role === 'tank' && e.guard > 0) { dmg *= 0.3; popNum(e.pos, '가드', 'info'); }
  dmg = Math.round(dmg); e.hp = Math.max(0, e.hp - dmg); popNum(e.pos, '-' + dmg, 'hurt'); e.hitFlash = 0.15;
  if (el) applyStatus(e, el, 30);
  if (e.isPlayer) { G.stats.hits++; e.state = 'hit'; e.st = 0; e.invul = 0.6; e.combo = -1; e.charge = 0; e.chargeLvl = 0; sfx('hurt'); vib(60); G.shake = Math.max(G.shake, 0.35);
    if (from) { const k = fwd(angTo(from.pos, e.pos)); e.vel.addScaledVector(k, 8); } }
  else { e.invul = 0.4; if (e.state !== 'guard') { e.state = 'hit'; e.st = 0; } }
  if (e.hp <= 0) { e.state = 'down'; e.st = 0; if (e.isPlayer) { banner('쓰러졌다…'); setTimeout(() => endHunt(false), 1600); G.over = true; } else popNum(e.pos, '전투 불능', 'info'); }
}
function playerAttackHit(p, mult, heavy) {
  const wt = p.wt, f = fwd(p.face), center = p.pos.clone().addScaledVector(f, wt.range * 0.6).setY(1.1);
  const crit = p.counter > 0; let any = false;
  for (const m of G.monsters) { if (!alive(m)) continue; const d = m.pos.distanceTo(p.pos), rr = wt.range + 0.6 * m.S.scale;
    const a = Math.abs(lerpAng(0, angTo(p.pos, m.pos) - p.face, 1)); if (d > rr + (heavy ? 0.5 : 0) || (a > 1.25 && d > 1.2)) continue;
    let part = null, pd = 1.5 * m.S.scale; for (const pt of m.parts) if (!pt.broken) { const wp = anchorWorld(m, pt); const dd = wp.distanceTo(center); if (dd < pd) { pd = dd; part = pt; } }
    if (!part && heavy) part = m.parts.find(x => !x.broken); // 차지 공격은 부위를 노림
    damageMonster(m, p.atk * mult, p, { crit, heavy, part, at: part ? anchorWorld(m, part) : null }); any = true; }
  if (any) { G.hitstop = heavy ? 0.11 : 0.05; G.shake = Math.max(G.shake, heavy ? 0.4 : 0.12); sfx(heavy ? 'heavy' : 'hit'); vib(heavy ? 45 : 15); if (crit) { p.counter = 0; $('counter').classList.add('hidden'); } }
  slashTrail(p, crit ? 0x7ff8ff : (p.elem !== 'none' ? elemColor(p.elem) : 0xffffff), (wt.range / 2) * (heavy ? 1.3 : 1), p.combo % 2 === 0 && p.combo !== 3);
}
function updPlayer(p, dt) {
  const wt = p.wt; p.iframe = Math.max(0, p.iframe - dt); p.invul = Math.max(0, p.invul - dt); p.counter = Math.max(0, p.counter - dt); if (p.counter <= 0) $('counter').classList.add('hidden');
  if (input.atkDown) input.atkT += dt;
  if (input.target) { input.target = false; const live = G.monsters.filter(alive); if (live.length) { const i = live.indexOf(G.lock); G.lock = live[(i + 1) % live.length]; popNum(G.lock.pos, '타겟', 'info'); } }
  if (G.lock && !alive(G.lock)) G.lock = nearestMonster(p.pos);
  if (!G.lock) G.lock = nearestMonster(p.pos);
  // 카메라 기준 이동
  const camF = new THREE.Vector3(); camera.getWorldDirection(camF); camF.y = 0; camF.normalize(); const camR = new THREE.Vector3(-camF.z, 0, camF.x);
  const mv = camR.clone().multiplyScalar(input.mx).addScaledVector(camF, -input.mz); const ml = Math.min(1, mv.length());
  const stun = p.status.para > 0 || p.status.freeze > 0 && Math.random() < 0;
  const spdMul = p.status.freeze > 0 ? 0.55 : 1;
  if (p.state === 'down') { p.st += dt; return; }
  if (p.status.para > 0) { p.state = 'stun'; p.run = 0; input.atkTap = input.atkRelease = input.dodge = false; return; } else if (p.state === 'stun') p.state = 'idle';
  if (input.dodge && p.state !== 'roll' && p.state !== 'hit') { input.dodge = false; p.state = 'roll'; p.st = 0; p.rollStart = G.t; p.iframe = 0.36; p.combo = -1; p.charge = 0; p.chargeLvl = 0; setRing(0);
    p.rollDir = ml > 0.2 ? Math.atan2(mv.x, mv.z) : p.face + Math.PI * (G.lock ? 1 : 0) * 0 ; if (ml <= 0.2 && G.lock) p.rollDir = angTo(G.lock.pos, p.pos) + Math.PI / 2 * (Math.random() < 0.5 ? 1 : -1); p.face = p.rollDir; sfx('roll'); }
  input.dodge = false;
  p.st += dt;
  if (p.state === 'roll') { const k = p.st / 0.5; p.pos.addScaledVector(fwd(p.rollDir), 9 * (1 - k * 0.6) * dt * spdMul); if (k >= 1) p.state = 'idle'; p.run = 0; return; }
  if (p.state === 'hit') { if (p.st > 0.45) p.state = 'idle'; return; }
  // 공격
  const aimLock = () => { if (G.lock && G.lock.pos.distanceTo(p.pos) < 9) p.face = angTo(p.pos, G.lock.pos); else if (ml > 0.2) p.face = Math.atan2(mv.x, mv.z); };
  if (p.state === 'charge') {
    aimLock(); p.charge += dt; const lvl = Math.min(wt.charge.length, Math.floor(p.charge / wt.chargeStep)); if (lvl > p.chargeLvl) { p.chargeLvl = lvl; sfx('charge'); vib(10); popNum(p.pos, '차지 ' + lvl, 'info'); }
    setRing(Math.min(1, p.charge / (wt.chargeStep * wt.charge.length))); if (ml > 0.2) p.pos.addScaledVector(mv.clone().normalize(), 1.2 * dt);
    if (input.atkRelease || !input.atkDown) { input.atkRelease = false; const lvl2 = Math.max(1, p.chargeLvl); p.state = 'attack'; p.st = 0; p.heavy = true; p.combo = 0; p.atkDur = wt.combo[0] * 1.1; p.mult = wt.charge[lvl2 - 1]; p.hitDone = false; p.chargeLvl = 0; p.charge = 0; setRing(0); sfx('swing'); }
    p.run = 0; return; }
  if (input.atkDown && input.atkT >= 0.22 && p.state !== 'attack') { p.state = 'charge'; p.charge = 0; p.chargeLvl = 0; }
  if (input.atkTap) { input.atkTap = false; if (p.state === 'attack') p.queued = true; else startCombo(p, 0); }
  if (p.state === 'attack') {
    const pr = p.st / p.atkDur; if (pr < 0.35) p.pos.addScaledVector(fwd(p.face), (p.heavy ? 1.5 : 2.6) * dt);
    if (!p.hitDone && pr >= (p.heavy ? 0.5 : 0.42)) { p.hitDone = true; playerAttackHit(p, p.mult, p.heavy); }
    if (pr >= 1) { if (p.queued && !p.heavy) { p.queued = false; startCombo(p, (p.combo + 1) % wt.combo.length); } else if (input.atkDown && input.atkT >= 0.22 && !p.heavy) { p.state = 'charge'; p.charge = 0; } else { p.state = 'idle'; p.comboT = 0.5; } }
    p.run = 0; return; }
  if (p.comboT > 0) { p.comboT -= dt; if (p.comboT <= 0) p.combo = -1; }
  if (ml > 0.15) { const tf = Math.atan2(mv.x, mv.z); p.face = lerpAng(p.face, tf, Math.min(1, dt * 14)); p.pos.addScaledVector(mv, 6.2 * spdMul * dt); p.run = Math.min(1, ml); p.state = 'run'; } else { p.run = Math.max(0, p.run - dt * 6); p.state = 'idle'; }
}
function startCombo(p, i) { const wt = p.wt; p.combo = i; p.state = 'attack'; p.st = 0; p.heavy = false; p.atkDur = wt.combo[i] * (p.counter > 0 ? 0.75 : 1); p.mult = wt.mult[i]; p.hitDone = false; p.queued = false;
  if (G.lock && G.lock.pos.distanceTo(p.pos) < 8) p.face = angTo(p.pos, G.lock.pos); sfx('swing'); }
function setRing(k) { $('chargeRing').firstElementChild.style.strokeDashoffset = 289 * (1 - k); $('atkLbl').textContent = k > 0 ? '차지' : '공격'; }

// 몬스터 공격 패턴
function patterns(m) {
  const L = m.lvl, P = [];
  if (m.sp === 'wolf') { P.push('bite', 'rush'); if (L >= 3) P.push('breath'); if (L >= 5) P.push('triple'); }
  if (m.sp === 'witch') { P.push('icicle', 'frost'); if (L >= 3) P.push('rain'); if (L >= 5) P.push('nova'); }
  if (m.sp === 'drake') { P.push('slam', 'leap'); if (L >= 3) P.push('quake'); if (L >= 5) P.push('bolt'); }
  return P;
}
function pickTarget(m) {
  if (m.taunt > 0 && m.aggro && alive(m.aggro)) return m.aggro;
  const live = G.allies.filter(alive); const p = G.player; if (alive(p) && Math.random() < 0.6) return p; return live[Math.floor(Math.random() * live.length)] || p;
}
function beginAttack(m, kind) {
  const tgt = pickTarget(m); m.tgt = tgt; const a = angTo(m.pos, tgt.pos); m.face = a; const L = m.lvl, wu = Math.max(0.65, 1 - 0.05 * (L - 1)), x = m.pos.x, z = m.pos.z;
  const T = (sh, dur, delay = 0) => ({ sh, dur, delay });
  let list = [], anim = 'swing', after = null, mult = 1, el = null;
  switch (kind) {
    case 'bite': list = [T({ type: 'cone', x, z, a, r: 3.0 * m.S.scale / 1.25, ang: 1.4 }, 0.75 * wu)]; anim = 'swing'; break;
    case 'rush': list = [T({ type: 'line', x, z, a, w: 1.8, len: 11 }, 1.0 * wu)]; anim = 'charge'; after = { dash: 11 }; mult = 1.2; break;
    case 'breath': list = [T({ type: 'cone', x, z, a, r: 6, ang: 0.8 }, 1.15 * wu)]; anim = 'cast'; el = 'fire'; mult = 1.1; break;
    case 'triple': list = [0, 1, 2].map(i => T({ type: 'line', x, z, a: a + (i - 1) * 0.5, w: 1.4, len: 9 }, 0.9 * wu + i * 0.25)); anim = 'charge'; mult = 0.9; break;
    case 'icicle': list = [T({ type: 'circle', x: tgt.pos.x, z: tgt.pos.z, r: 2.0 }, 1.25 * wu)]; anim = 'cast'; el = 'ice'; break;
    case 'frost': list = [T({ type: 'cone', x, z, a, r: 4.2, ang: 1.1 }, 0.95 * wu)]; anim = 'cast'; el = 'ice'; break;
    case 'rain': list = [0, 1, 2, 3].map(i => { const ra = rnd(0, 7), rr = i ? rnd(2, 4.5) : 0; return T({ type: 'circle', x: tgt.pos.x + Math.sin(ra) * rr, z: tgt.pos.z + Math.cos(ra) * rr, r: 1.7 }, 1.1 * wu + i * 0.3); }); anim = 'cast'; el = 'ice'; mult = 0.8; break;
    case 'nova': list = [T({ type: 'circle', x, z, r: 3.2 }, 1.0 * wu), T({ type: 'ring', x, z, r: 4.5, r2: 7 }, 1.6 * wu)]; anim = 'cast'; el = 'ice'; break;
    case 'slam': list = [T({ type: 'circle', x, z, r: 3.6 }, 1.3 * wu)]; anim = 'slam'; el = 'thunder'; mult = 1.1; break;
    case 'leap': list = [T({ type: 'circle', x: tgt.pos.x, z: tgt.pos.z, r: 2.8 }, 1.35 * wu)]; anim = 'slam'; after = { leap: new THREE.Vector3(tgt.pos.x, 0, tgt.pos.z) }; mult = 1.3; break;
    case 'quake': list = [T({ type: 'circle', x, z, r: 2.6 }, 1.0 * wu), T({ type: 'ring', x, z, r: 4, r2: 6.5 }, 1.5 * wu)]; anim = 'slam'; el = 'thunder'; break;
    case 'bolt': list = [0, 1, 2].map(i => T({ type: 'line', x, z, a: a + (i - 1) * 0.7, w: 1.6, len: 12 }, 1.2 * wu)); anim = 'cast'; el = 'thunder'; break;
  }
  m.cur = { kind, anim, after, mult, el: el || (Math.random() < 0.4 ? m.elem : null), list, teles: [], t: 0, done: 0, total: Math.max(...list.map(l => l.dur + l.delay)) };
  m.ai = 'windup'; m.state = 'windup';
}
function updMonster(m, dt) {
  m.taunt = Math.max(0, m.taunt - dt); m.defDown = Math.max(0, m.defDown - dt); m.slow = Math.max(0, m.slow - dt);
  const sMul = (m.status.freeze > 0 ? 0.5 : 1) * (m.slow > 0 ? 0.7 : 1);
  if (m.ai === 'down') { m.state = 'down'; m.st += dt; m.model.position.y = 0; return; }
  if (m.ai === 'stun') { m.state = 'stun'; m.aiT -= dt; m.run = 0; if (m.aiT <= 0) { m.ai = 'move'; m.atkCd = 0.6; } return; }
  if (m.ai === 'move') { const tgt = (m.taunt > 0 && m.aggro && alive(m.aggro)) ? m.aggro : (alive(G.player) ? G.player : pickTarget(m)); const d = m.pos.distanceTo(tgt.pos);
    const want = m.sp === 'witch' ? 6 : 2.6; m.face = lerpAng(m.face, angTo(m.pos, tgt.pos), dt * 5);
    if (Math.abs(d - want) > 0.8) { const dir = d > want ? 1 : -0.6; m.pos.addScaledVector(fwd(m.face), m.speed * 0.6 * sMul * dir * dt); m.run = 0.8; m.state = 'run'; } else { m.run = 0; m.state = 'idle'; }
    m.atkCd -= dt * sMul; if (m.atkCd <= 0) { const P = patterns(m); const near = d < 4; let k = P[Math.floor(Math.random() * P.length)]; if (near && m.sp === 'wolf' && Math.random() < 0.5) k = 'bite'; if (!near && m.sp === 'drake' && Math.random() < 0.6) k = 'leap'; beginAttack(m, k); } return; }
  if (m.ai === 'windup') { const c = m.cur; c.t += dt * sMul; m.state = 'windup'; m.run = 0;
    for (const l of c.list) { if (!l.tele && c.t >= l.delay) { l.tele = makeTele(l.sh, l.dur); c.teles.push(l.tele); }
      if (l.tele && !l.fired) { const p = (c.t - l.delay) / l.dur; setTeleP(l.tele, clamp(p, 0, 1)); if (p >= 1) { l.fired = true; fireShape(m, l.sh, c); killTele(l.tele); c.teles.splice(c.teles.indexOf(l.tele), 1); } } }
    if (c.after?.leap) { const p = clamp(c.t / c.list[0].dur, 0, 1); if (p > 0.55) { m.pos.lerp(c.after.leap, Math.min(1, dt * 7)); m.model.position.y = Math.sin((p - 0.55) / 0.45 * Math.PI) * 2.5; } }
    if (c.list.every(l => l.fired)) { m.model.position.y = 0; m.ai = 'strike'; m.aiT = 0.35; m.state = 'strike'; if (c.after?.dash) { m.dashLeft = c.after.dash; } } return; }
  if (m.ai === 'strike') { m.aiT -= dt; if (m.dashLeft > 0) { const s = Math.min(m.dashLeft, 32 * dt); m.pos.addScaledVector(fwd(m.face), s); m.dashLeft -= s; m.state = 'run'; m.run = 1; }
    if (m.aiT <= 0) { m.ai = 'recover'; m.aiT = Math.max(0.6, 1.4 - 0.08 * m.lvl); m.dashLeft = 0; m.cur = null; } return; }
  if (m.ai === 'recover') { m.state = 'idle'; m.run = 0; m.aiT -= dt; if (m.aiT <= 0) { m.ai = 'move'; m.atkCd = rnd(0.4, 1.4) * Math.max(0.5, 1 - 0.07 * m.lvl); } }
}
function fireShape(m, sh, c) {
  G.shake = Math.max(G.shake, 0.25); burst(new THREE.Vector3(sh.x, 0.3, sh.z), c.el ? elemColor(c.el) : 0xffa080, 14, 6);
  if (sh.type === 'line' && c.after?.dash === undefined) { /* 원거리 선 */ }
  for (const a of G.allies) if (alive(a) && inShape(sh, a.pos.x, a.pos.z)) hurt(a, m.dmg * c.mult, c.el, m);
}
// 동료 AI
function updComp(c, dt) {
  c.invul = Math.max(0, (c.invul || 0) - dt); c.guard = Math.max(0, c.guard - dt); c.st += dt;
  if (c.state === 'down') return; if (c.state === 'hit' && c.st < 0.4) return;
  if (c.status.para > 0) { c.state = 'stun'; return; }
  const tgt = nearestMonster(c.pos); if (!tgt) { c.state = 'cheer'; c.run = 0; return; }
  // 위험 회피: 발동 직전 텔레그래프 안이면 이탈 (탱커는 가드)
  for (const t of telegraphs) { if (t.grp.parent && inShape(t.sh, c.pos.x, c.pos.z, 0.5)) { const left = 1 - t.fill.scale.z;
      if (c.role === 'tank') { c.guard = 0.8; c.state = 'guard'; c.run = 0; return; }
      const away = new THREE.Vector3(c.pos.x - t.sh.x, 0, c.pos.z - t.sh.z); if (t.sh.type === 'line' || t.sh.type === 'cone') away.set(Math.cos(t.sh.a), 0, -Math.sin(t.sh.a)).multiplyScalar(((c.id || 1) % 2) ? 1 : -1);
      away.normalize(); c.pos.addScaledVector(away, 5.5 * dt); c.face = Math.atan2(away.x, away.z); c.run = 1; c.state = 'run'; return; } }
  const spdBoost = c.comp.species === 'wolf' ? 1.2 : 1;
  c.skillCd -= dt; c.cd -= dt * spdBoost;
  if (c.skillCd <= 0) { c.skillCd = { tank: 8, healer: 6, buffer: 11, debuffer: 9, dealer: 7 }[c.role];
    if (c.role === 'tank') { tgt.taunt = 4; tgt.aggro = c; popNum(c.pos, '도발!', 'info'); c.guard = 1.2; }
    if (c.role === 'healer') { const low = G.allies.filter(a => alive(a) && a.hp / a.maxHp < 0.7).sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0]; if (low) { const h = Math.round(low.maxHp * 0.22); low.hp = Math.min(low.maxHp, low.hp + h); popNum(low.pos, '+' + h, 'heal'); burst(low.pos.clone().setY(1), 0x7dff9a, 14, 3); } else c.skillCd = 1.5; }
    if (c.role === 'buffer') { G.buff = 6; popNum(c.pos, '공격 강화!', 'info'); G.allies.forEach(a => alive(a) && burst(a.pos.clone().setY(1.4), 0xffd24a, 6, 2)); }
    if (c.role === 'debuffer') { tgt.defDown = 6; tgt.slow = 6; popNum(tgt.pos, '약화·둔화!', 'info'); burst(tgt.pos.clone().setY(1.4), 0xb070ff, 14, 3); }
    if (c.role === 'dealer') { c.cd = 0; c.burst = 3; popNum(c.pos, '연속 공격!', 'info'); }
    c.state = 'cheer'; c.st = 0; return; }
  if (c.state === 'cheer' && c.st < 0.35) return;
  const want = c.role === 'healer' ? 5 : c.role === 'buffer' || c.role === 'debuffer' ? 3.2 : 2.0;
  const d = c.pos.distanceTo(tgt.pos); c.face = lerpAng(c.face, angTo(c.pos, tgt.pos), dt * 8);
  if (c.state === 'attack') { if (c.st > 0.4) c.state = 'idle'; return; }
  if (Math.abs(d - want) > 0.7) { c.pos.addScaledVector(fwd(c.face), 5 * dt * (d > want ? 1 : -0.6)); c.run = 1; c.state = 'run'; return; }
  c.run = 0; c.state = 'idle';
  if (c.cd <= 0 && d < want + 1.5) { c.cd = c.burst > 0 ? 0.35 : 1.2; if (c.burst > 0) c.burst--; c.state = 'attack'; c.st = 0; c.combo = (c.combo || 0) + 1;
    const part = Math.random() < 0.3 ? tgt.parts.find(p => !p.broken) : null; damageMonster(tgt, c.atk * (c.role === 'dealer' ? 1.3 : c.role === 'tank' ? 0.8 : 0.6), c, { part }); }
}
function updStatus(e, dt) {
  for (const k in e.status) { e.status[k] -= dt; if (e.status[k] <= 0) delete e.status[k]; }
  if (e.status.burn > 0) { e._bt = (e._bt || 0) + dt; if (e._bt > 0.5) { e._bt = 0; const d = Math.max(1, Math.round(e.maxHp * 0.012)); e.hp = Math.max(e.team === 1 ? 0 : 1, e.hp - d); popNum(e.pos, d, 'weak'); burst(e.pos.clone().setY(1), 0xff7a2a, 3, 2); if (e.team === 1 && e.hp <= 0 && e.ai !== 'down') killMonster(e); } }
}
function separate() { const all = [...G.allies, ...G.monsters].filter(e => e.state !== 'down');
  for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) { const a = all[i], b = all[j], r = (a.team ? 0.9 * a.S.scale : 0.45) + (b.team ? 0.9 * b.S.scale : 0.45);
    const dx = b.pos.x - a.pos.x, dz = b.pos.z - a.pos.z, d = Math.hypot(dx, dz); if (d < r && d > 0.001) { const push = (r - d) / 2; a.pos.x -= dx / d * push; a.pos.z -= dz / d * push; b.pos.x += dx / d * push; b.pos.z += dz / d * push; } }
  for (const e of all) { const d = Math.hypot(e.pos.x, e.pos.z); if (d > ARENA - 0.6) { e.pos.x *= (ARENA - 0.6) / d; e.pos.z *= (ARENA - 0.6) / d; } } }
function updCamera(dt) {
  const p = G.player, port = innerWidth < innerHeight; let yaw, look;
  if (G.lock && alive(G.lock)) { yaw = angTo(p.pos, G.lock.pos); const mid = p.pos.clone().lerp(G.lock.pos, 0.45); look = mid.setY(1.3); }
  else { yaw = p.face; look = p.pos.clone().setY(1.3); }
  G.camYaw = lerpAng(G.camYaw, yaw, Math.min(1, dt * 3));
  const dist = port ? 9.5 : 7.8, h = port ? 5.6 : 4.8, want = p.pos.clone().addScaledVector(fwd(G.camYaw), -dist).setY(h);
  G.camPos.lerp(want, Math.min(1, dt * 6)); camera.position.copy(G.camPos);
  if (G.shake > 0 && save.settings.shake) { camera.position.x += rnd(-1, 1) * G.shake * 0.4; camera.position.y += rnd(-1, 1) * G.shake * 0.3; }
  camera.lookAt(look);
}
// 락온 표시 & 약점 강조
const lockMark = new THREE.Mesh(new THREE.RingGeometry(1.1, 1.3, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffe066, transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false })); lockMark.position.y = 0.04; scene.add(lockMark); lockMark.visible = false;
const weakMark = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffd24a, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending })); scene.add(weakMark); weakMark.visible = false;

function updHud() {
  const p = G.player, m = G.lock || G.monsters[0];
  $('pHp').style.width = (p.hp / p.maxHp * 100) + '%'; $('pName').textContent = `헌터 · ${WEAPON_TYPES[p.wtype].n} ${ELEM[p.elem].n}`;
  $('pStatus').innerHTML = Object.keys(p.status).map(k => `<b>${{ burn: '🔥화상', freeze: '❄빙결', para: '⚡마비' }[k]}</b>`).join('') + (G.buff > 0 ? '<b>공격↑</b>' : '');
  $('timer').textContent = Math.ceil(G.time); $('timer').style.color = G.time < 20 ? '#ff6a6a' : '#fff';
  if (m) { $('mName').innerHTML = `<span class="${ELEM[m.elem].c}">${m.name}</span> <span class="tag">약점 ${ELEM[m.weak].n}</span>`; $('mHp').style.width = (m.hp / m.maxHp * 100) + '%';
    $('mParts').innerHTML = m.parts.map(pt => `<span class="${pt.broken ? 'broken' : ''}">${pt.n} ${pt.broken ? '파괴' : Math.ceil(pt.hp / pt.max * 100) + '%'}</span>`).join('');
    $('mStatus').innerHTML = Object.keys(m.status).map(k => `<b>${{ burn: '🔥화상', freeze: '❄빙결', para: '⚡마비' }[k]}</b>`).join('') + (m.ai === 'stun' ? '<b>경직</b>' : '') + (m.ai === 'recover' ? '<b>틈!</b>' : '') + (m.defDown > 0 ? '<b>방어↓</b>' : '') + (m.taunt > 0 ? '<b>도발됨</b>' : ''); }
  G.allies.slice(1).forEach((a, i) => { const el = $('ph' + i); if (el) el.style.width = (a.hp / a.maxHp * 100) + '%'; });
  $('bTarget').style.opacity = G.monsters.filter(alive).length > 1 ? 1 : 0.45;
}
function animEnt(e, T) {
  const s = e.state, a = { state: s, time: T, run: e.run, p: 0, combo: e.combo, heavy: e.heavy };
  if (s === 'attack') a.p = clamp(e.st / (e.atkDur || 0.4), 0, 1); if (s === 'roll') a.p = clamp(e.st / 0.5, 0, 1); if (s === 'hit') a.p = clamp(e.st / 0.45, 0, 1); if (s === 'down') a.p = e.st;
  if (s === 'charge') a.lvl = e.chargeLvl + 1;
  if (s === 'windup' && e.cur) { a.kind = e.cur.anim; a.p = clamp(e.cur.t / e.cur.list[0].dur, 0, 1); }
  if (e.team === 0 && !e.isPlayer && s === 'attack') a.p = clamp(e.st / 0.4, 0, 1);
  animate(e.model, a); e.model.rotation.y = e.face;
  const flash = e.hitFlash > 0; if (flash !== e._fl) { e._fl = flash; e.model.traverse(o => { if (o.isMesh && (o.userData.om || o.material.isMeshToonMaterial)) { if (!o.userData.om) o.userData.om = o.material; o.material = flash ? hitMat : o.userData.om; } }); }
  if (e.status.freeze > 0 && !e._ice) { e._ice = true; } e.model.userData.rig.body.position.x = e.status.para > 0 ? Math.sin(T * 50) * 0.03 : 0;
}
const hitMat = new THREE.MeshBasicMaterial({ color: 0xffc8c8 });
let last = performance.now(), fpsAcc = 0, fpsN = 0, fps = 60;
function loop(now) {
  requestAnimationFrame(loop); let dt = Math.min(0.05, (now - last) / 1000); last = now; fpsAcc += dt; fpsN++; if (fpsAcc > 1) { fps = Math.round(fpsN / fpsAcc); fpsAcc = 0; fpsN = 0; }
  if (G) step(dt); else idleScene(dt, now / 1000);
  updParticles(dt); updTrails(dt); renderer.render(scene, camera);
}
function step(rdt) {
  const T = performance.now() / 1000;
  if (G.hitstop > 0) { G.hitstop -= rdt; G.allies.concat(G.monsters).forEach(e => animEnt(e, T)); updCamera(rdt); return; }
  let dt = rdt; if (G.slowmo > 0) { G.slowmo -= rdt; dt *= 0.3; }
  G.t += dt; G.shake = Math.max(0, G.shake - rdt * 1.6); G.buff = Math.max(0, G.buff - dt);
  if (!G.over) { G.time -= dt; if (G.time <= 0) { G.time = 0; G.over = true; banner('시간 초과'); setTimeout(() => endHunt(false), 1400); } }
  const p = G.player;
  if (!G.over || alive(p)) updPlayer(p, dt);
  p.pos.addScaledVector(p.vel, dt); p.vel.multiplyScalar(Math.max(0, 1 - dt * 8));
  for (const c of G.allies) { if (c !== p && alive(c)) updComp(c, dt); updStatus(c, dt); c.hitFlash -= dt; }
  for (const m of G.monsters) { if (!G.over || m.ai !== 'down') updMonster(m, dt); updStatus(m, dt); m.hitFlash -= dt; }
  separate();
  for (const e of [...G.allies, ...G.monsters]) { e.st += e.isPlayer || e.team === 1 ? 0 : 0; if (e.team === 1) e.st += dt; animEnt(e, T); }
  if (G.lock && alive(G.lock)) { lockMark.visible = true; lockMark.position.x = G.lock.pos.x; lockMark.position.z = G.lock.pos.z; lockMark.scale.setScalar(G.lock.S.scale * (1 + Math.sin(T * 6) * 0.05)); } else lockMark.visible = false;
  const lp = G.lock && alive(G.lock) && G.lock.parts.find(x => !x.broken);
  if (lp) { weakMark.visible = true; weakMark.position.copy(anchorWorld(G.lock, lp)); const k = G.lock.ai === 'stun' || G.lock.ai === 'recover' ? 1.6 : 1; weakMark.scale.setScalar(k * (1 + Math.sin(T * 8) * 0.25)); weakMark.material.opacity = G.lock.ai === 'recover' || G.lock.ai === 'stun' ? 0.8 : 0.4; } else weakMark.visible = false;
  updCamera(rdt); updHud();
}
// 마을 배경 연출용 캐릭터
let idleChars = [];
function idleScene(dt, T) {
  if (!idleChars.length) { const S = SPECIES; idleChars = [buildGirl({ skin: 0xffe3d3, hair: 0xf5d36a, eye: '#3a8aff', cloth: 0xf2f2ff, cloth2: 0xd84a6a, accent: 0xffd54a, hairStyle: 'pony', weapon: 'sns', shield: 0xb04050 }), buildGirl(Object.assign({}, S.wolf.look, { scale: 1.1 })), buildGirl(Object.assign({}, S.witch.look, { scale: 1.05 })), buildGirl(Object.assign({}, S.drake.look, { scale: 1.2 }))];
    idleChars.forEach((c, i) => { c.position.set((i - 1.5) * 1.5, 0, i % 2 ? -0.8 : 0); scene.add(c); }); }
  idleChars.forEach((c, i) => { animate(c, { state: i ? 'idle' : 'idle', time: T + i, run: 0 }); c.rotation.y = Math.sin(T * 0.4 + i) * 0.3; });
  const land = innerWidth > innerHeight; camera.position.set(Math.sin(T * 0.1) * 1.0 + (land ? -3.0 : 0), land ? 1.7 : 1.2, land ? 6.2 : 7.5); camera.lookAt(land ? -3.0 : 0, land ? 1.0 : -0.6, 0);
}
function clearIdle() { idleChars.forEach(c => scene.remove(c)); idleChars = []; }
requestAnimationFrame(loop);

// ───────── 사냥 종료/결과 ─────────
let lastResult = null;
function endHunt(win) {
  if (!G || G.done) return; G.done = true; G.over = true;
  const st = G.stats, p = G.player, node = G.node, mons = G.monsters;
  // 정화 점수 (전투 결과만으로 산정)
  const timeR = G.time / HUNT_TIME, hpR = p.hp / p.maxHp, totalParts = mons.reduce((a, m) => a + m.parts.length, 0);
  const elemAdv = mons.some(m => m.weak === p.elem) && st.weakHits >= 3;
  const sc = { time: Math.round(20 * timeR), hp: Math.round(20 * hpR), parts: Math.round(30 * st.broken / Math.max(1, totalParts)), hits: Math.max(0, 15 - st.hits * 3), elem: elemAdv ? 15 : 0 };
  sc.total = sc.time + sc.hp + sc.parts + sc.hits + sc.elem;
  const PURIFY_NEED = 55;
  // 보상
  const drops = {}; const add = (k, n) => { drops[k] = (drops[k] || 0) + n; };
  for (const m of mons) { const q = qualOf(m.lvl), dmgR = 1 - m.hp / m.maxHp;
    if (win) { add(`${m.sp}:hide:${q}`, 2 + Math.floor(m.lvl / 2)); for (const pt of m.parts) if (pt.broken) add(`${m.sp}:${pt.key}:${q}`, 1 + (Math.random() < 0.4 ? 1 : 0)); if (Math.random() < 0.5) add(`${m.sp}:${m.parts[0].key}:${q}`, 1); }
    else { if (dmgR > 0.3) add(`${m.sp}:hide:${q}`, 1); for (const pt of m.parts) if (pt.broken) add(`${m.sp}:${pt.key}:${q}`, 1); } }
  for (const k in drops) addMat(k, drops[k]);
  const xp = win ? 40 + node.lvl * 20 : 15 + node.lvl * 5 + st.broken * 5;
  save.hrXp += xp; let ranked = false; while (save.hrXp >= save.hr * 100) { save.hrXp -= save.hr * 100; save.hr++; ranked = true; }
  const compXp = win ? 30 : 12; save.party.forEach(id => { const c = save.comps.find(x => x.id === id); if (c) { c.xp = (c.xp || 0) + compXp; while (c.xp >= c.level * 60 && c.level < 10 + c.potential * 4) { c.xp -= c.level * 60; c.level++; } } });
  save.stats.hunts++; if (win) save.stats.wins++; else save.stats.fails++;
  for (const m of mons) { const cd = save.codex[m.sp] = save.codex[m.sp] || { seen: 0, won: 0, maxLvl: 0 }; cd.seen++; if (win) { cd.won++; cd.maxLvl = Math.max(cd.maxLvl, m.lvl); } }
  save.nodes = null; persist();
  lastResult = { win, sc, need: PURIFY_NEED, canPurify: win && sc.total >= PURIFY_NEED && save.comps.length < 12, drops, xp, ranked, mons: mons.map(m => ({ sp: m.sp, lvl: m.lvl })), st, purified: false };
  setTimeout(() => { teardown(); showResult(); }, 400);
}
function teardown() { if (!G) return; [...G.allies, ...G.monsters].forEach(e => scene.remove(e.model)); [...telegraphs].forEach(killTele); G = null; $('hud').classList.add('hidden'); lockMark.visible = weakMark.visible = false; setRing(0); input.atkDown = false; }

// ───────── UI 화면 ─────────
const uiEl = $('ui');
function ui(html, cls = '') { uiEl.innerHTML = html; uiEl.className = cls; }
const S_ = SPECIES;
let tab = 'hunt';
function genNodes() { const hr = save.hr, nodes = []; const sps = Object.keys(S_);
  for (let i = 0; i < 4; i++) { const lvl = Math.max(1, hr + [-1, 0, 0, 1][i] + (i === 3 ? Math.floor(hr / 3) : 0)); const multi = lvl >= 3 && i === 3;
    const mons = [{ sp: sps[(i + hr) % 3], lvl }]; if (multi) mons.push({ sp: sps[(i + hr + 1) % 3], lvl: Math.max(1, lvl - 1) }); nodes.push({ id: i, lvl, mons }); }
  return nodes; }
function village() {
  clearIdle(); if (!G) idleScene(0, 0);
  if (!save.nodes) { save.nodes = genNodes(); persist(); }
  const w = weaponById(save.equip.weapon), a = armorById(save.equip.armor);
  const tabs = [['hunt', '사냥'], ['forge', '대장간'], ['party', '동료'], ['codex', '도감'], ['set', '설정']].map(([k, n]) => `<button class="btn sm ${tab === k ? '' : 'alt'}" data-tab="${k}">${n}</button>`).join('');
  let body = '';
  if (tab === 'hunt') {
    body = `<div class="note">헌터 랭크 <b>HR ${save.hr}</b> · 경험치 ${save.hrXp}/${save.hr * 100} · 장비: ${WEAPON_TYPES[w.type].n}(${ELEM[w.elem].n}) +${w.lvl} / 방어 ${armorDef(a)}</div><h2>필드 — 다음 사냥감 선택</h2>` +
      save.nodes.map(n => `<div class="card"><img src="${S_[n.mons[0].sp].img}" alt=""><div class="t"><b>${n.mons.map(m => `<span class="${ELEM[S_[m.sp].elem].c}">${S_[m.sp].name}</span> Lv${m.lvl}`).join(' + ')}</b><br>
      <span class="tag">약점 ${n.mons.map(m => ELEM[S_[m.sp].weak].n).join('/')}</span><span class="tag">소재 ${QUAL[qualOf(n.lvl)]}</span>${n.mons.length > 1 ? '<span class="tag">2마리 · 타겟 전환</span>' : ''}<br><span class="note">${n.mons.map(m => patterns({ sp: m.sp, lvl: m.lvl }).length).join('/')}가지 공격 패턴</span></div>
      <button class="btn" data-hunt="${n.id}">출발</button></div>`).join('') +
      `<div class="row"><button class="btn alt sm" data-act="reroll">사냥감 새로 찾기</button></div><p class="note">조작: 왼쪽 드래그 이동 · 공격 탭=연속 공격, 길게=차지(링이 차오름) · 회피는 무적 시간이 있고, 공격 직전에 피하면 <b>완벽 회피 → 반격 찬스(치명타)</b>. 바닥의 붉은 범위가 노랗게 차면 공격이 들어와요. 몬스터가 공격 후 <b>틈!</b>을 보이면 노란 약점(부위)을 노리세요.</p>`;
  } else if (tab === 'forge') {
    body = `<h2>무기</h2>` + save.weapons.map(x => { const cost = 2 + x.lvl, sp = x.elem === 'none' ? null : ELEM_SRC[x.elem];
      const can = sp ? matPoints(sp, 'hide') >= cost : Object.keys(S_).some(s => matPoints(s, 'hide') >= cost);
      return `<div class="card"><div class="t"><b>${WEAPON_TYPES[x.type].n} · <span class="${ELEM[x.elem].c}">${ELEM[x.elem].n}</span> +${x.lvl}</b> ${save.equip.weapon === x.id ? '<span class="tag">장착 중</span>' : ''}<br>공격력 ${weaponAtk(x)} → ${weaponAtk({ ...x, lvl: x.lvl + 1 })}<br><span class="note">${WEAPON_TYPES[x.type].desc} · 강화: ${sp ? S_[sp].short : '아무'} 가죽 ${cost}점</span></div>
      <div class="row" style="flex-direction:column"><button class="btn sm ${save.equip.weapon === x.id ? 'dis' : ''}" data-eqw="${x.id}">장착</button><button class="btn sm alt ${can && x.lvl < 15 ? '' : 'dis'}" data-upw="${x.id}">강화</button></div></div>`; }).join('') +
      `<h2>속성 무기 제작</h2>` + Object.entries(ELEM_SRC).map(([el, sp]) => ['sns', 'gs'].map(t => { const have = save.weapons.some(x => x.type === t && x.elem === el); const can = matPoints(sp, 'hide') >= 3 && partPoints(sp) >= 1;
        return `<div class="card"><div class="t"><b class="${ELEM[el].c}">${ELEM[el].n} ${WEAPON_TYPES[t].n}</b><br><span class="note">${S_[sp].short} 가죽 3점 + 부위 소재 1점 · ${ELEM[el].n} 약점 몬스터에 피해 +35%, ${STATUS[el].n} 부여</span></div><button class="btn sm ${have || !can ? 'dis' : ''}" data-craft="${t}:${el}">${have ? '보유' : '제작'}</button></div>`; }).join('')).join('') +
      `<h2>방어구</h2>` + save.armors.map(x => { const sp = x.sp === 'none' ? null : x.sp, cost = 2 + x.lvl; const can = sp ? matPoints(sp, 'hide') >= cost : Object.keys(S_).some(s => matPoints(s, 'hide') >= cost);
        return `<div class="card"><div class="t"><b>${sp ? S_[sp].short + '의 갑옷' : '견습 헌터복'} +${x.lvl}</b> ${save.equip.armor === x.id ? '<span class="tag">장착 중</span>' : ''}<br>방어 ${armorDef(x)} → ${armorDef({ ...x, lvl: x.lvl + 1 })} (받는 피해 ${Math.round((1 - defMul(armorDef(x))) * 100)}% 감소)</div>
        <div class="row" style="flex-direction:column"><button class="btn sm ${save.equip.armor === x.id ? 'dis' : ''}" data-eqa="${x.id}">장착</button><button class="btn sm alt ${can && x.lvl < 15 ? '' : 'dis'}" data-upa="${x.id}">강화</button></div></div>`; }).join('') +
      Object.keys(S_).filter(sp => !save.armors.some(x => x.sp === sp)).map(sp => `<div class="card"><div class="t"><b>${S_[sp].short}의 갑옷 제작</b><br><span class="note">가죽 4점 + 부위 소재 2점</span></div><button class="btn sm ${matPoints(sp, 'hide') >= 4 && partPoints(sp) >= 2 ? '' : 'dis'}" data-crafta="${sp}">제작</button></div>`).join('') +
      `<h2>소재함</h2><div class="note">${Object.entries(save.mats).filter(([, n]) => n > 0).map(([k, n]) => `${matName(k)} ×${n}`).join('<br>') || '아직 소재가 없어요. 사냥을 떠나 보세요!'}</div><p class="note">품질 점수: 하급 1 · 중급 2 · 상급 3 (Lv3+ 몬스터는 중급, Lv5+는 상급 소재)</p>`;
  } else if (tab === 'party') {
    body = `<p class="note">사냥에 최대 3명 동행. 정화한 몬스터 소녀가 동료가 됩니다. 내가 만든 장비를 동료에게도 장착할 수 있어요(공유).</p>` + (save.comps.length ? save.comps.map(c => { const st = compStats(c), inP = save.party.includes(c.id), w = weaponById(c.weapon), S = S_[c.species];
      return `<div class="card"><img src="${S.img}" style="filter:hue-rotate(${c.hueDeg}deg)" alt=""><div class="t"><b>${c.name}</b> <span class="tag">${ROLES[c.role]}</span><span class="tag">${S.short} 계열</span><br>Lv${c.level} · 잠재력 ${'★'.repeat(c.potential)} · HP ${st.hp} 공격 ${st.atk}<br><span class="note">특성: ${S.trait.n}(${S.trait.d}) · ${ROLE_DESC[c.role]} · 장식: ${ACCS[c.acc].n}<br>무기: ${w ? WEAPON_TYPES[w.type].n + ' ' + ELEM[w.elem].n + ' +' + w.lvl : '없음'}</span></div>
      <div class="row" style="flex-direction:column"><button class="btn sm ${inP ? '' : 'alt'}" data-party="${c.id}">${inP ? '편성 해제' : '편성'}</button><button class="btn sm alt" data-cw="${c.id}">무기 변경</button></div></div>`; }).join('') : '<p>아직 동료가 없어요. 결과 화면에서 정화 점수가 기준을 넘으면 몬스터 소녀를 정화해 동료로 맞이할 수 있어요.</p>');
  } else if (tab === 'codex') {
    body = Object.entries(S_).map(([k, S]) => { const c = save.codex[k]; return `<div class="card"><img src="${S.img}" alt=""><div class="t"><b class="${ELEM[S.elem].c}">${S.name}</b><br>${c ? `조우 ${c.seen} · 토벌 ${c.won} · 최고 Lv${c.maxLvl}<br><span class="note">약점 ${ELEM[S.weak].n} · 부위: ${S.parts.map(p => p.n).join(', ')} · 역할 후보: ${S.roles.map(r => ROLES[r]).join('/')}</span>` : '<span class="note">미조우</span>'}</div></div>`; }).join('') +
      `<p class="note">사냥 ${save.stats.hunts} · 성공 ${save.stats.wins} · 실패 ${save.stats.fails} · 정화 ${save.stats.purified}</p>`;
  } else {
    const t = (k, n) => `<button class="btn sm ${save.settings[k] ? '' : 'alt'}" data-tog="${k}">${n}: ${save.settings[k] ? '켬' : '끔'}</button>`;
    body = `<h2>효과</h2><div class="row">${t('sound', '효과음')}${t('vib', '진동')}${t('shake', '화면 흔들림')}</div>
      <h2>저장</h2><p class="note"><b>이 기기에만 저장 · 클라우드 동기화 없음.</b> 플레이 중 자동 저장돼요. 다른 기기로 옮기려면 백업 파일을 내보낸 뒤 그 기기에서 가져오세요.<br>저장 형식 v${save.v} · ${saveStatus}</p>
      <div class="row"><button class="btn sm" data-act="export">백업 내보내기</button><button class="btn sm alt" data-act="import">백업 가져오기</button><button class="btn sm alt" data-act="reset">기록 초기화</button></div><input type="file" id="impFile" accept="application/json,.json" class="hidden">
      <p class="note">설치: 브라우저 메뉴의 "홈 화면에 추가"로 앱처럼 실행할 수 있어요 (오프라인 지원).</p>`;
  }
  ui(`<img class="hero" src="img/gallery_g_party.webp" alt="" style="max-height:110px"><h1>헌트 나우 <span class="note">정화의 사냥꾼</span></h1><div class="tabs">${tabs}</div>${body}`, 'village');
}
function showResult() {
  const r = lastResult, sc = r.sc, m0 = r.mons[0], S = S_[m0.sp];
  const rows = [['남은 시간', sc.time, 20], ['남은 체력', sc.hp, 20], ['부위 파괴', sc.parts, 30], ['피격 횟수 (' + r.st.hits + '회)', sc.hits, 15], ['속성 상성', sc.elem, 15]];
  const purifyBlock = !r.win ? `<p>사냥 실패. 그래도 <b>경험치 +${r.xp}</b>${Object.keys(r.drops).length ? '와 일부 소재' : ''}를 얻었어요. 다음엔 붉은 범위가 노랗게 차오를 때 회피해 보세요.</p>` :
    r.purified ? `<p class="big">✨ ${r.purified} 정화 성공! 동료로 합류했어요.</p><p>"${S.lines.purify}"</p>` :
    r.canPurify ? `<p class="big">정화 가능!</p><p class="note">같은 모습이지만 이름·색·장식이 다른 개체로 합류해요. 역할을 고르세요.</p><div class="row">${r.mons.map((m, i) => S_[m.sp].roles.map(ro => `<button class="btn" data-pur="${i}:${ro}">${S_[m.sp].short} → ${ROLES[ro]}</button>`).join('')).join('')}</div>` :
    `<p>정화 불가 — 점수 ${sc.total}/${r.need}. 부위 파괴·약점 속성·피격 줄이기로 점수를 올릴 수 있어요.</p>`;
  ui(`<div class="card"><img src="${S.img}" alt="" style="width:90px;height:120px"><div class="t"><h1>${r.win ? '토벌 성공!' : '사냥 실패'}</h1>"${r.win ? S.lines.win : S.lines.lose}"</div></div>
    <h2>정화 판정 (전투 결과 기준)</h2><table class="score">${rows.map(([n, v, mx]) => `<tr><td>${n}</td><td><b>${v}</b> / ${mx}</td></tr>`).join('')}<tr><td><b>합계</b></td><td class="big">${sc.total} <span class="note">/ 기준 ${r.need}</span></td></tr></table>
    ${purifyBlock}
    <h2>획득</h2><div class="note">${Object.entries(r.drops).map(([k, n]) => `${matName(k)} ×${n}`).join('<br>') || '소재 없음'}<br>헌터 경험치 +${r.xp}${r.ranked ? ` · <b>HR ${save.hr} 달성!</b>` : ''} · 완벽 회피 ${r.st.perfect}회 · 부위 파괴 ${r.st.broken}</div>
    <div class="row" style="margin-top:12px"><button class="btn" data-act="village">마을로</button></div>`);
}
function purify(i, role) {
  const r = lastResult; if (!r.canPurify || r.purified) return; const m = r.mons[i], S = S_[m.sp];
  const used = new Set(save.comps.map(c => c.name)); const name = NAMES.find(n => !used.has(n)) || '이름없는 ' + S.short;
  const potential = clamp(Math.ceil(m.lvl / 2) + (r.sc.total >= 85 ? 1 : 0), 1, 5); const hueDeg = Math.round(rnd(30, 300));
  const hair = new THREE.Color(S.look.hair).offsetHSL(hueDeg / 360, 0, 0).getHex();
  const c = { id: newId('c'), name, species: m.sp, role, level: m.lvl, potential, hueDeg, hair, acc: save.comps.length % ACCS.length, weapon: null, armor: null, xp: 0 };
  save.comps.push(c); if (save.party.length < 3) save.party.push(c.id); save.stats.purified++; r.purified = name; r.canPurify = false; persist(); sfx('win'); showResult();
}
uiEl.addEventListener('click', (e) => {
  const b = e.target.closest('button'); if (!b) return; const d = b.dataset;
  if (b.classList.contains('dis')) return;
  if (d.tab) { tab = d.tab; village(); return; }
  if (d.hunt !== undefined) { clearIdle(); startHunt(save.nodes[+d.hunt]); return; }
  if (d.pur) { const [i, ro] = d.pur.split(':'); purify(+i, ro); return; }
  if (d.eqw) { save.equip.weapon = d.eqw; }
  if (d.eqa) { save.equip.armor = d.eqa; }
  if (d.upw) { const x = weaponById(d.upw), cost = 2 + x.lvl, sp = x.elem === 'none' ? Object.keys(S_).find(s => matPoints(s, 'hide') >= cost) : ELEM_SRC[x.elem]; spendPoints(sp, 'hide', cost); x.lvl++; sfx('brk'); }
  if (d.upa) { const x = armorById(d.upa), cost = 2 + x.lvl, sp = x.sp === 'none' ? Object.keys(S_).find(s => matPoints(s, 'hide') >= cost) : x.sp; spendPoints(sp, 'hide', cost); x.lvl++; sfx('brk'); }
  if (d.craft) { const [t, el] = d.craft.split(':'), sp = ELEM_SRC[el]; spendPoints(sp, 'hide', 3); spendPartPoints(sp, 1); const id = newId('w'); save.weapons.push({ id, type: t, elem: el, lvl: 1 }); sfx('win'); }
  if (d.crafta) { const sp = d.crafta; spendPoints(sp, 'hide', 4); spendPartPoints(sp, 2); save.armors.push({ id: newId('a'), sp, lvl: 1 }); sfx('win'); }
  if (d.party) { const i = save.party.indexOf(d.party); if (i >= 0) save.party.splice(i, 1); else if (save.party.length < 3) save.party.push(d.party); else alert('동료는 최대 3명까지 편성할 수 있어요.'); }
  if (d.cw) { const c = save.comps.find(x => x.id === d.cw); const opts = [null, ...save.weapons.map(w => w.id)]; c.weapon = opts[(opts.indexOf(c.weapon) + 1) % opts.length]; }
  if (d.tog) { save.settings[d.tog] = !save.settings[d.tog]; }
  if (d.act === 'reroll') { save.nodes = genNodes(); }
  if (d.act === 'village') { tab = 'hunt'; }
  if (d.act === 'export') { const blob = new Blob([JSON.stringify(save, null, 1)], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `hunt-now-backup-${new Date().toISOString().slice(0, 10)}.json`; a.click(); return; }
  if (d.act === 'import') { $('impFile').click(); return; }
  if (d.act === 'reset') { if (confirm('정말 모든 기록을 지울까요? 되돌릴 수 없어요. (먼저 백업을 권장해요)')) { save = freshSave(); } }
  persist(); village();
});
uiEl.addEventListener('change', async (e) => {
  if (e.target.id !== 'impFile' || !e.target.files[0]) return;
  try { const s = JSON.parse(await e.target.files[0].text()); if (!s.weapons || !s.mats) throw new Error('헌트 나우 백업 파일이 아니에요');
    const newer = (save.savedAt || 0) > (s.savedAt || 0);
    const msg = `백업(${new Date(s.savedAt || 0).toLocaleString('ko-KR')}, HR ${s.hr})으로 현재 기록(HR ${save.hr})을 덮어씁니다.` + (newer ? '\n⚠ 지금 기기의 기록이 백업보다 최신이에요! 최신 기록이 사라집니다.' : '') + '\n계속할까요?';
    if (confirm(msg)) { save = migrate(s); persist(); alert('가져오기 완료'); village(); } } catch (err) { alert('가져오기 실패: ' + err.message); }
});
addEventListener('visibilitychange', () => { if (document.hidden) persist(); });
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js');
window.HN = { get G() { return G; }, get save() { return save; }, get fps() { return fps; }, input, endHunt, village, get result() { return lastResult; } };
village();
