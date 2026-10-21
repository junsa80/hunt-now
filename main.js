import * as THREE from './vendor/three.module.js';
import { buildGirl, animate, setWeapon, toon, ownOutline, ATK_STYLE } from './chars.js';
import { createFx, buildEnv, RIM } from './fx.js';
import { LORE, OPENING, HEROES, BEATS, PURIFY_SCENE, PURIFY_FAIL } from './lore.js';
import { STORIES, STORY_UNLOCK, BARKS } from './story.js';
import { ELEM, STATUS, SPECIES, ROLES, ROLE_DESC, WEAPON_TYPES, WEAPON_ORDER, ELEM_SRC, QUAL, qualOf, NAMES, ACCS } from './data.js';

const $ = (id) => document.getElementById(id);
const rnd = (a, b) => a + Math.random() * (b - a), clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const SAVE_KEY = 'huntnow.save', SAVE_V = 4;

// ───────── 저장 ─────────
function freshSave() {
  return { v: SAVE_V, savedAt: Date.now(), hr: 1, hrXp: 0, mats: {}, weapons: WEAPON_ORDER.map((t, i) => ({ id: 'w' + (i + 1), type: t, elem: 'none', lvl: 1 })),
    armors: [{ id: 'a1', sp: 'none', lvl: 1 }], equip: { weapon: 'w1', armor: 'a1' }, comps: [], party: [], settings: { sound: true, vib: true, shake: true, dodgeBtn: true, hint: true, quality: 'auto', dlg: true },
    stats: { hunts: 0, wins: 0, purified: 0, fails: 0 }, codex: {}, nodes: null, nextId: 20, cgear: [], bond: {}, story: {}, field: null, opened: false, hero: null, beats: [] };
}
function migrate(s) {
  if (!s || typeof s !== 'object') return freshSave();
  if (!s.v || s.v < 2) { // v1: settings·codex·armors 없음
    const f = freshSave(); s = Object.assign(f, s, { weapons: s.weapons || [{ id: 'w1', type: 'sns', elem: 'none', lvl: 1 }, { id: 'w2', type: 'gs', elem: 'none', lvl: 1 }] }); s.settings = Object.assign(f.settings, s.settings || {}); s.codex = s.codex || {}; s.armors = s.armors?.length ? s.armors : f.armors; s.v = 2;
  }
  if (s.v < 3) { // v3: 무기 7종, 동료는 종마다 한 명(중복 정리), 회피 버튼 옵션
    const notes = []; s.nextId = Math.max(s.nextId || 3, 20); s.mats = s.mats || {}; s.comps = (s.comps || []).filter(c => SPECIES[c.species]); s.party = s.party || [];
    const addW = WEAPON_ORDER.filter(t => !s.weapons.some(w => w.type === t));
    for (const t of addW) s.weapons.push({ id: 'w' + (s.nextId++), type: t, elem: 'none', lvl: 1 });
    if (addW.length) notes.push(`새 무기 ${addW.length}종(${addW.map(t => WEAPON_TYPES[t].n).join('·')})이 무기고에 들어왔어요.`);
    const best = {}; for (const c of s.comps) { const sc = (c.level || 1) * 10 + (c.potential || 1) * 15 + (c.xp || 0) / 100; if (!best[c.species] || sc > best[c.species].sc) best[c.species] = { c, sc }; }
    const keep = new Set(Object.values(best).map(b => b.c.id)), extras = s.comps.filter(c => !keep.has(c.id));
    for (const c of extras) { const q = qualOf(c.level || 1), S = SPECIES[c.species]; const k1 = `${c.species}:hide:${q}`, k2 = `${c.species}:${S.parts[0].key}:${q}`; s.mats[k1] = (s.mats[k1] || 0) + 3; s.mats[k2] = (s.mats[k2] || 0) + 2; }
    if (extras.length) notes.push(`같은 종 동료는 이제 한 명만 둘 수 있어요. 중복 ${extras.length}명(${extras.map(c => c.name).join(', ')})은 종마다 가장 강한 한 명만 남기고, 한 명당 가죽 3개·부위 소재 2개로 바꿨어요.`);
    s.comps = s.comps.filter(c => keep.has(c.id)); s.party = s.party.filter(id => keep.has(id));
    s.settings = Object.assign({ dodgeBtn: false, hint: true }, s.settings); s.nodes = null; s.v = 3; if (notes.length) s.notice = notes.join(' ');
  }
  if (s.v < 4) { // v5(저장 v4): 동료 방어구·인연·스토리·필드. 기존 기록은 그대로 두고 빈 칸만 추가
    s.cgear = s.cgear || []; s.bond = s.bond || {}; s.story = s.story || {}; s.field = null; (s.comps || []).forEach(c => { c.gear = c.gear || {}; }); s.v = 4;
    s.notice = (s.notice ? s.notice + ' ' : '') + 'v5 업데이트: 동료 방어구(동료 → 장비), 필드 지도, 동료 개인 스토리가 추가됐어요. 기존 기록은 그대로예요.'; }
  if (s.settings.dlg === undefined) s.settings.dlg = true;
  if (s.opened === undefined) { s.opened = true; s.hero = s.hero || null; s.beats = BEATS.filter(b => b.hr < (s.hr || 1)).map(b => b.hr); } // 기존 플레이어: 오프닝 건너뛰고 주인공만 한 번 고름
  if (!s.settings.quality) s.settings.quality = 'auto'; // v4: 화질 설정 (저장 버전 유지, 기본값만 추가)
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
let actx, noiseBuf;
// 겹친 합성음: 저음 쿵(바디) + 노이즈 타격(크랙) + 금속성 핑(약점) — 무게에 따라 피치/길이 조절
function tone(t, f0, f1, dur, type, vol, dest) { const o = actx.createOscillator(), g = actx.createGain(); o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur); o.connect(g); g.connect(dest); o.start(t); o.stop(t + dur + 0.02); }
function noise(t, dur, vol, freq, q, dest, type = 'bandpass') { if (!noiseBuf) { noiseBuf = actx.createBuffer(1, actx.sampleRate * 0.5, actx.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
  const n = actx.createBufferSource(), f = actx.createBiquadFilter(), g = actx.createGain(); n.buffer = noiseBuf; f.type = type; f.frequency.value = freq; f.Q.value = q; g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur); n.connect(f); f.connect(g); g.connect(dest); n.start(t); n.stop(t + dur + 0.02); }
function sfx(kind, w = 1) {
  if (!save.settings.sound) return;
  try { actx = actx || new (window.AudioContext || window.webkitAudioContext)(); } catch { return; }
  const t = actx.currentTime, D = actx.destination;
  if (kind === 'hit' || kind === 'heavy') { const hv = kind === 'heavy' ? 1.5 : 1, k = w * hv;
    tone(t, 150 / Math.sqrt(k), 45, 0.09 + 0.06 * k, 'sine', 0.22 * Math.min(1.6, k), D); noise(t, 0.05 + 0.04 * k, 0.28, 2200 / Math.sqrt(k), 0.8, D); tone(t, 260, 90, 0.05, 'square', 0.04, D); return; }
  if (kind === 'weak') { tone(t, 1400, 900, 0.12, 'triangle', 0.07, D); tone(t + 0.02, 2100, 1500, 0.1, 'sine', 0.05, D); return; }
  if (kind === 'swing') { noise(t, 0.12 + 0.05 * w, 0.12, 900 + 500 / w, 1.2, D); return; }
  if (kind === 'roar') { tone(t, 160, 70, 1.1, 'sawtooth', 0.12, D); tone(t, 240, 110, 1.0, 'square', 0.05, D); noise(t, 1.0, 0.2, 500, 0.6, D); return; }
  if (kind === 'brk') { tone(t, 110, 30, 0.45, 'sawtooth', 0.2, D); noise(t, 0.35, 0.35, 1400, 0.5, D); tone(t + 0.05, 900, 300, 0.25, 'triangle', 0.06, D); return; }
  if (kind === 'topple') { tone(t, 80, 30, 0.5, 'sine', 0.3, D); noise(t, 0.4, 0.3, 300, 0.7, D, 'lowpass'); return; }
  const P = { roll: [200, 300, 0.1, 'sine', 0.05], perfect: [880, 1760, 0.3, 'sine', 0.12], hurt: [260, 90, 0.2, 'square', 0.1], charge: [400, 800, 0.12, 'sine', 0.06], win: [523, 1046, 0.6, 'triangle', 0.12] }[kind] || [300, 200, 0.1, 'sine', 0.05];
  tone(t, P[0], P[1], P[2], P[3], P[4], D); if (kind === 'roll') noise(t, 0.12, 0.1, 600, 0.7, D);
}
const vib = (ms) => { if (save.settings.vib && navigator.vibrate) navigator.vibrate(ms); };

// ───────── 렌더러/씬 ─────────
const cv = $('cv');
const renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, powerPreference: 'high-performance' });
renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.18; // v5 색 보정 renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene(); scene.fog = new THREE.Fog(0xbcdcff, 30, 95);
const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 240);
scene.add(new THREE.HemisphereLight(0xfff4e8, 0x5a7a4a, 1.45));
const sun = new THREE.DirectionalLight(0xfff2dc, 1.75); sun.position.set(6, 14, 5); sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024); sun.shadow.radius = 4; sun.shadow.bias = -0.0006;
Object.assign(sun.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: 1, far: 40 }); scene.add(sun, sun.target);
const backLight = new THREE.DirectionalLight(0xbfd8ff, 0.55); backLight.position.set(-6, 6, -8); scene.add(backLight); // 역광(림 보조)
const ARENA = 20;
const env = buildEnv(scene, ARENA, toon), fx = createFx(scene, camera);
// ── 적응형 화질: 0=낮음 1=중간 2=높음. 자동이면 프레임이 떨어질 때 단계적으로 낮춤
let qLevel = 2, qAutoT = 0, qAutoAcc = 0, qAutoN = 0, qRaised = false;
function applyQuality(q, auto = false) { qLevel = q; renderer.setPixelRatio(Math.min(devicePixelRatio, [1, 1.5, 2][q])); const sz = [256, 512, 1024][q]; sun.shadow.mapSize.set(sz, sz); if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; }
  // 그림자 켜고 끄기는 셰이더 재컴파일(순간 멈춤)이 생기므로 자동 조절에서는 하지 않고, 사용자가 '낮음'을 고를 때만 끔
  if (!auto) { const sh = save.settings.quality !== 'low'; if (sun.castShadow !== sh) { sun.castShadow = sh; renderer.shadowMap.enabled = sh; scene.traverse(o => { if (o.material && o.material.isMaterial) o.material.needsUpdate = true; }); } }
  env.setQuality(q); resize(); }
function qualityFromSetting() { const v = save.settings.quality; return v === 'low' ? 0 : v === 'mid' ? 1 : v === 'high' ? 2 : (save.qAuto ?? (matchMedia('(pointer:coarse)').matches ? 1 : 2)); } // 자동: 폰은 중간에서 시작해 여유 있으면 올림, 지난번 결과 기억
function autoQuality(dt) { if (save.settings.quality !== 'auto' || !G) return; qAutoT += dt; qAutoAcc += dt; qAutoN++;
  if (qAutoT > 1.5) { const f = qAutoN / qAutoAcc; qAutoT = qAutoAcc = qAutoN = 0; if (f < 42 && qLevel > 0) { applyQuality(Math.max(0, qLevel - (f < 25 ? 2 : 1)), true); save.qAuto = qLevel; console.info('화질 자동 하향 →', qLevel, Math.round(f) + 'fps'); } else if (f > 58 && qLevel < 2 && !qRaised) { qRaised = true; applyQuality(qLevel + 1, true); save.qAuto = qLevel; } } }
function resize() { const w = innerWidth, h = innerHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.fov = w < h ? 62 : 50; camera.updateProjectionMatrix(); }
addEventListener('resize', resize); applyQuality(qualityFromSetting());

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
  el.style.left = ((v3.x + 1) / 2 * innerWidth + rnd(-22, 22)) + 'px'; el.style.top = ((1 - v3.y) / 2 * innerHeight + rnd(-8, 8)) + 'px'; dmgLayer.appendChild(el); setTimeout(() => el.remove(), 900);
  if (cls && G) { G.dmgCls = G.dmgCls || {}; G.dmgCls[cls] = (G.dmgCls[cls] || 0) + 1; }
}
let lineTimer;
function say(txt, who) { const l = $('line'); l.textContent = (who ? who + ': ' : '') + txt; l.classList.add('on'); clearTimeout(lineTimer); lineTimer = setTimeout(() => l.classList.remove('on'), 2600); }
let bannerTimer;
function banner(txt, ms = 1200) { const b = $('banner'); b.textContent = txt; b.classList.add('on'); clearTimeout(bannerTimer); bannerTimer = setTimeout(() => b.classList.remove('on'), ms); }

// ───────── 입력: 몬헌 나우식 제스처 (화면 어디서나) ─────────
// 드래그=이동(손가락 위치에 떠다니는 스틱) · 탭=공격(버퍼 0.35초) · 휙 밀기(플릭)=그 방향 회피 · 길게 누르기=무기별 홀드 동작
// 두 번째 손가락으로 탭/홀드도 가능(이동하면서 공격)
const nowT = () => performance.now() / 1000;
const input = { mx: 0, mz: 0, atkDown: false, atkT: 0, tapBuf: -9, dodgeBuf: null, sp: false, target: false, hx: 0, hy: 0, gest: [] };
const touches = new Map();
const keys = {};
let pollInput = () => {};
{
  const layer = $('touch'), stickEl = $('stick'), knob = $('knob'), R = 55;
  const logG = (k) => { input.gest.push(k); if (input.gest.length > 30) input.gest.shift(); };
  const setMove = () => {
    let mv = null; for (const t of touches.values()) if (t.mode === 'drag' || t.mode === 'holddrag') { mv = t; break; }
    if (!mv) { if (!keys.any) { input.mx = input.mz = 0; } stickEl.style.opacity = 0; return; }
    let dx = mv.x - mv.ox, dy = mv.y - mv.oy; const m = Math.hypot(dx, dy);
    if (m > R) { mv.ox = mv.x - dx / m * R; mv.oy = mv.y - dy / m * R; dx = dx / m * R; dy = dy / m * R; } // 스틱 원점이 손가락을 따라옴
    const k = mv.mode === 'holddrag' ? 0.6 : 1; input.mx = dx / R * k; input.mz = dy / R * k;
    stickEl.style.opacity = 1; stickEl.style.left = mv.ox + 'px'; stickEl.style.top = mv.oy + 'px'; knob.style.transform = `translate(${dx}px,${dy}px)`;
  };
  const setHold = () => {
    let h = null; for (const t of touches.values()) if (t.mode === 'hold' || t.mode === 'holddrag') { h = t; break; }
    if (keys.jHold) h = h || { x: innerWidth / 2, y: innerHeight * 0.7 };
    if (h) { input.hx = h.x; input.hy = h.y; }
    if (h && !input.atkDown) { input.atkDown = true; input.atkT = 0; logG('hold'); }
    if (!h && input.atkDown) { input.atkDown = false; logG('release'); }
  };
  const down = (id, x, y) => { const n = nowT(); touches.set(id, { sx: x, sy: y, x, y, ox: x, oy: y, t0: n, mode: 'pending', hist: [[n, x, y]] }); };
  const move = (id, x, y) => {
    const t = touches.get(id); if (!t) return; t.x = x; t.y = y; const n = nowT(); t.hist.push([n, x, y]); while (t.hist.length > 2 && n - t.hist[0][0] > 0.1) t.hist.shift();
    const d = Math.hypot(x - t.sx, y - t.sy);
    if (t.mode === 'pending' && d > 14) { t.mode = 'drag'; t.ox = t.sx; t.oy = t.sy; }
    else if (t.mode === 'hold' && d > 22) { t.mode = 'holddrag'; t.ox = t.sx; t.oy = t.sy; }
    if (t.mode === 'drag' || t.mode === 'holddrag') { // 빠른 플릭은 손을 떼기 전에 바로 회피(반응성)
      const h0 = t.hist[0], dd = Math.hypot(x - h0[1], y - h0[2]), v = dd / Math.max(0.016, n - h0[0]);
      if (v > 1300 && d > 40 && (n - t.t0 < 0.3 || t.mode === 'holddrag')) { input.dodgeBuf = { dx: x - t.sx, dy: y - t.sy, t: n }; t.mode = 'flicked'; logG('flick'); }
    }
    setMove(); setHold();
  };
  const up = (id) => {
    const t = touches.get(id); if (!t) return; touches.delete(id); const n = nowT(), dur = n - t.t0, d = Math.hypot(t.x - t.sx, t.y - t.sy);
    if (t.mode === 'pending' && dur < 0.22) { input.tapBuf = n; logG('tap'); }
    else if (t.mode === 'drag' && dur < 0.35 && d > 40 && d / dur > 250) { input.dodgeBuf = { dx: t.x - t.sx, dy: t.y - t.sy, t: n }; logG('flick'); }
    setMove(); setHold();
  };
  layer.addEventListener('touchstart', e => { e.preventDefault(); for (const t of e.changedTouches) down(t.identifier, t.clientX, t.clientY); }, { passive: false });
  layer.addEventListener('touchmove', e => { e.preventDefault(); for (const t of e.changedTouches) move(t.identifier, t.clientX, t.clientY); }, { passive: false });
  const end = e => { e.preventDefault(); for (const t of e.changedTouches) up(t.identifier); };
  layer.addEventListener('touchend', end, { passive: false }); layer.addEventListener('touchcancel', end, { passive: false });
  let md = false;
  layer.addEventListener('mousedown', e => { md = true; down('m', e.clientX, e.clientY); });
  addEventListener('mousemove', e => { if (md) move('m', e.clientX, e.clientY); });
  addEventListener('mouseup', () => { if (md) { md = false; up('m'); } });
  pollInput = () => { const n = nowT(); for (const t of touches.values()) if (t.mode === 'pending' && n - t.t0 > 0.2) { t.mode = 'hold'; setHold(); }
    if (keys.KeyJ && !keys.jHold && n - keys.jT > 0.2) { keys.jHold = true; setHold(); } };
  const btn = (id, fn) => { const b = $(id); b.addEventListener('touchstart', e => { e.preventDefault(); e.stopPropagation(); fn(); }, { passive: false }); b.addEventListener('mousedown', e => { e.preventDefault(); e.stopPropagation(); fn(); }); };
  btn('bSp', () => { input.sp = true; }); btn('bTarget', () => { input.target = true; });
  btn('bDodge', () => { input.dodgeBuf = { dx: input.mx * 50, dy: input.mz * 50, t: nowT() }; logG('dodgeBtn'); });
  const kmove = () => { const x = (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0), z = (keys.KeyS ? 1 : 0) - (keys.KeyW ? 1 : 0); keys.any = !!(x || z); if (keys.any || !touches.size) { input.mx = x; input.mz = z; } };
  addEventListener('keydown', e => { if (e.repeat) return; keys[e.code] = 1;
    if (e.code === 'KeyJ') keys.jT = nowT();
    if (e.code === 'KeyK' || e.code === 'Space') input.dodgeBuf = { dx: input.mx * 50, dy: input.mz * 50, t: nowT() };
    if (e.code === 'KeyL') input.target = true; if (e.code === 'KeyU') input.sp = true; kmove(); });
  addEventListener('keyup', e => { keys[e.code] = 0; if (e.code === 'KeyJ') { if (keys.jHold) { keys.jHold = false; setHold(); } else input.tapBuf = nowT(); } kmove(); });
}

// ───────── 전투 상태 ─────────
let G = null; // 현재 사냥
const HUNT_TIME = 75; // v5: 몬헌 나우식 75초 사냥
const MSCALE = 1.22; // 몬스터를 헌터보다 확실히 크게 (몬헌 나우의 체급 차)
const WEIGHT = { sns: 0.6, db: 0.5, ls: 0.85, bow: 0.5, lance: 0.9, gs: 1.45, hammer: 1.3 }; // 히트스톱·흔들림·타격음 무게
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
// ── v5 동료 방어구: 동료마다 머리·몸통·팔 3칸. 몬스터 가죽 + 부위 파괴 소재로 제작·강화(+1~+5). 동료와 같은 종 세트 2/3부위 보너스
const GSLOTS = { head: { n: '머리', icon: '⛑' }, body: { n: '몸통', icon: '🛡' }, arms: { n: '팔', icon: '🧤' } };
const GPIECE = { wolf: ['불꽃 갈기 투구', '루가 가죽 흉갑', '발톱 건틀릿'], witch: ['서리 관', '빙결 로브', '얼음 손목띠'], drake: ['뇌룡 투구', '용린 갑주', '뇌광 완갑'], siren: ['산호 머리띠', '물결 비늘 조끼', '조개 팔찌'], kitsune: ['여우 방울 머리꽂이', '무녀 하오리', '여우불 팔보호대'], harpy: ['깃털 관', '바람 깃 조끼', '폭풍 깃 장갑'] };
const SETB = { wolf: '공격 +8%', witch: '방어 +8', drake: '방어 +12', siren: 'HP +10%', kitsune: '공격 +8%', harpy: '공격·HP +5%' };
const SETX = { wolf: { atk: 1.08 }, witch: { def: 8 }, drake: { def: 12 }, siren: { hp: 1.1 }, kitsune: { atk: 1.08 }, harpy: { atk: 1.05, hp: 1.05 } };
const gearById = (id) => save.cgear.find(g => g.id === id);
const gearName = (g) => `${GPIECE[g.sp][Object.keys(GSLOTS).indexOf(g.slot)]} +${g.lvl}`;
const gearStat = (g) => g ? { hp: 12 + g.lvl * 8, def: 3 + g.lvl * 2, atk: g.slot === 'arms' ? 1 + g.lvl : g.slot === 'head' ? Math.floor(g.lvl / 2) : 0 } : { hp: 0, def: 0, atk: 0 };
const gearCost = (lvl) => ({ hide: 2 + lvl, part: lvl }); // lvl=0이면 제작 (가죽 2 + 부위 0 → 제작은 아래에서 부위 1 이상)
function setCount(c, gearMap = c.gear || {}) { return Object.values(gearMap).map(gearById).filter(g => g && g.sp === c.species).length; }
function compStats(c, gearMap) {
  const w = weaponById(c.weapon), a = armorById(c.armor), pm = 1 + 0.1 * (c.potential - 1); gearMap = gearMap || c.gear || {};
  const gs = Object.values(gearMap).map(gearById).reduce((t, g) => { const x = gearStat(g); t.hp += x.hp; t.def += x.def; t.atk += x.atk; return t; }, { hp: 0, def: 0, atk: 0 });
  const sc = setCount(c, gearMap), X = sc >= 3 ? SETX[c.species] : {}, sAtk = (sc >= 2 ? 1.1 : 1) * (X.atk || 1), sHp = (sc >= 3 ? 1.15 : 1) * (X.hp || 1);
  return { hp: Math.round(((70 + c.level * 7) * pm + armorDef(a) * 1.5 + gs.hp) * sHp), atk: Math.round(((4 + c.level * 1.1) * pm + weaponAtk(w) * 0.45 + gs.atk) * sAtk), def: armorDef(a) * 0.6 + gs.def + (X.def || 0), set: sc, elem: w?.elem && w.elem !== 'none' ? w.elem : SPECIES[c.species].elem, wtype: w?.type || 'sns' };
}
function startHunt(node) {
  ui(''); $('hud').classList.remove('hidden');
  const w = weaponById(save.equip.weapon), arm = armorById(save.equip.armor), wt = WEAPON_TYPES[w.type];
  const wm = { sns: { weapon: 'sns', shield: 0xb04050 }, gs: { weapon: 'gs' }, ls: { weapon: 'ls' }, db: { weapon: 'db', offhand: 'db' }, hammer: { weapon: 'whammer' }, lance: { weapon: 'lance', bigShield: 0x4a6ab0 }, bow: { weapon: null, offhand: 'bow' } }[w.type];
  const pm = buildGirl(Object.assign({ skin: 0xffe3d3, hair: 0xf5d36a, eye: '#3a8aff', cloth: 0xf2f2ff, cloth2: 0xd84a6a, accent: 0xffd54a, hairStyle: 'pony' }, heroOf().look, { weaponColor: w.elem === 'none' ? 0xdfe6ff : elemColor(w.elem) }, wm));
  const player = makeEntity(pm, { team: 0, name: '헌터', maxHp: 150 + armorDef(arm) * 0.5 | 0, atk: weaponAtk(w), def: armorDef(arm), elem: w.elem, wt, wtype: w.type, combo: -1, comboT: 0, queued: false, charge: 0, chargeLvl: 0, iframe: 0, rollStart: -9, invul: 0, counter: 0, hitsTaken: 0, isPlayer: true, spirit: 0, spiritLvl: 0, spiritT: 0, guardStart: -9, guarded: -9 });
  player.hp = player.maxHp; player.pos.set(0, 0, 8); player.face = Math.PI; player.outl = ownOutline(pm);
  const allies = [player];
  for (const cid of save.party) { const c = save.comps.find(x => x.id === cid); if (!c) continue; const S = SPECIES[c.species], st = compStats(c);
    const look = Object.assign({}, S.look, { angry: false, hair: c.hair, accessory: ACCS[c.acc], weapon: S.look.weapon, scale: 0.95 });
    const m = buildGirl(look); const e = makeEntity(m, { team: 0, name: c.name, comp: c, role: c.role, species: c.species, maxHp: st.hp, atk: st.atk, def: st.def, elem: st.elem, cd: rnd(0.5, 1.5), skillCd: rnd(2, 4), guard: 0 });
    e.hp = e.maxHp; e.pos.set(rnd(-3, 3), 0, 9 + rnd(0, 2)); e.face = Math.PI; allies.push(e); }
  const monsters = node.mons.map((mn, i) => { const S = SPECIES[mn.sp], L = mn.lvl;
    const m = buildGirl(Object.assign({}, S.look, { scale: (S.scale + L * 0.02) * MSCALE }));
    const hp = Math.round(S.hp * (1 + 0.35 * (L - 1)) * (node.mons.length > 1 ? 0.75 : 1));
    const e = makeEntity(m, { team: 1, sp: mn.sp, S, lvl: L, name: `${S.short} Lv${L}`, maxHp: hp, dmg: S.dmg * (1 + 0.15 * (L - 1)), speed: S.speed * (1 + 0.03 * L), elem: S.elem, weak: S.weak, ai: 'move', aiT: 1.5 + i, atkCd: 1.6 + i * 1.5, cur: null, aggro: null, taunt: 0, defDown: 0, slow: 0,
      parts: S.parts.map(p => ({ ...p, hp: Math.round(hp * 0.22), max: Math.round(hp * 0.22), broken: false })) });
    const glow = new THREE.Mesh(new THREE.SphereGeometry(0.75, 16, 12), new THREE.MeshBasicMaterial({ color: 0xff2030, transparent: true, opacity: 0.25, depthWrite: false, blending: THREE.AdditiveBlending })); glow.scale.set(1, 1.6, 1); glow.position.y = 1.0; glow.visible = false; m.add(glow); e.glow = glow;
    armorize(m, S, L); e.outl = ownOutline(m); e.flinch = 0; e.turnRate = 2.4; e.lastK = null;
    e.hp = hp; e.pos.set((i - (node.mons.length - 1) / 2) * 5, 0, -6); e.face = 0; return e; });
  G = { node, player, allies, monsters, time: HUNT_TIME, t: 0, hitstop: 0, slowmo: 0, shake: 0, lock: monsters[0], camYaw: Math.PI, camPos: new THREE.Vector3(0, 5, 16), over: false,
    stats: { hits: 0, broken: 0, weakHits: 0, totalHits: 0, dealt: 0, perfect: 0, guards: 0 }, buff: 0, log: [], sp: 30 };
  const first = monsters[0]; say(first.S.lines.meet, first.S.short); sfx('win');
  if (save.settings.dlg) { const cs = allies.slice(1); if (cs.length) { const c = cs.find(a => monsters.some(m => m.sp === a.species)) || cs[0], B = BARKS[c.species], same = monsters.some(m => m.sp === c.species);
    setTimeout(() => { if (G && !G.over) say(node.rar === 2 ? B.boss : same ? B.same : B.start, c.name); }, 2800); } }
  buildPartyHud(); banner('사냥 시작!', 900); $('holdName').textContent = holdName(w.type); $('spName').textContent = wt.sp.n;
  $('bDodge').classList.toggle('hidden', !save.settings.dodgeBtn); $('ctrlHint').classList.toggle('hidden', !save.settings.hint); $('ctrlHint').style.opacity = 1; setTimeout(() => { $('ctrlHint').style.opacity = 0; }, 7000);
}
// v5: 몬스터 실루엣 강화 — 어깨 갑주·등 가시·팔 보호대(레벨이 높을수록 가시가 늘어남). 공유 지오메트리라 가벼움
const SPIKE = new THREE.ConeGeometry(0.07, 0.26, 6), PLATE = new THREE.SphereGeometry(0.15, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), BRACER = new THREE.CylinderGeometry(0.075, 0.09, 0.2, 8);
function armorize(model, S, L) { const r = model.userData.rig; if (!r) return; const mA = toon(S.look.accent), mC = toon(S.look.cloth2);
  const add = (parent, geo, mat, x, y, z, rx = 0, rz = 0, sc = 1) => { if (!parent) return; const o = new THREE.Mesh(geo, mat); o.position.set(x, y, z); o.rotation.set(rx, 0, rz); o.scale.setScalar(sc); o.castShadow = true; parent.add(o); };
  for (const sd of [-1, 1]) { add(r.torso, PLATE, mC, 0.2 * sd, 0.36, 0, 0, -0.5 * sd); add(r.torso, SPIKE, mA, 0.27 * sd, 0.44, 0, 0, -0.9 * sd); const arm = sd < 0 ? r.armL : r.armR; add(arm?.el, BRACER, mC, 0, -0.12, 0); }
  const n = Math.min(5, 2 + Math.floor(L / 2)); for (let i = 0; i < n; i++) add(r.torso, SPIKE, mA, 0, 0.36 - i * 0.09, -0.14, -0.6, 0, 1 - i * 0.12); }
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
  if (e.build[el] >= th) { e.build[el] = 0; const k = STATUS[el].key; e.status[k] = k === 'burn' ? 4 : k === 'freeze' ? 3.5 : k === 'soak' ? 5 : 2.2; if (k === 'soak' && e.team === 1) e.defDown = Math.max(e.defDown, 5);
    popNum(e.pos, STATUS[el].n + '!', 'info'); burst(e.pos.clone().setY(1.2), elemColor(el), 16, 4);
    if (k === 'para' && e.team === 1) { e.ai = 'stun'; e.aiT = 2.2; clearMonsterTele(e); } }
}
function damageMonster(m, base, src, opt = {}) {
  if (!alive(m)) return;
  let dmg = base, cls = '';
  const weak = src.elem && src.elem === m.weak; if (weak) { dmg *= 1.35; if (src.isPlayer) G.stats.weakHits++; }
  const wpt = !!(opt.part && (HEAD_PARTS.includes(opt.part.key) || opt.part === m.parts[0])); if (wpt) dmg *= 1.2; // 약점 부위
  if (m.ai === 'topple') dmg *= 1.3; // 다운 중 큰 피해 찬스
  cls = wpt && weak ? 'both' : wpt ? 'wpt' : weak ? 'elem' : ''; // 흰색=일반 · 주황=약점 부위 · 속성색=약점 속성 · 빨강=둘 다
  if (m.defDown > 0) dmg *= 1.25; if (G.buff > 0 && src.team === 0) dmg *= 1.25;
  if (m.ai === 'stun') dmg *= 1.15;
  if (opt.crit) { dmg *= 1.6; cls = 'crit'; }
  dmg = Math.round(dmg * rnd(0.92, 1.08));
  m.hp = Math.max(0, m.hp - dmg); m.hitFlash = src.isPlayer ? 0.07 : 0; if (src.isPlayer) { G.stats.dealt += dmg; G.stats.totalHits++; }
  if (opt.crit) cls += ' crit'; if (cls.includes('elem') || cls.includes('both')) cls += ' e-' + src.elem;
  popNum(opt.at || m.pos, String(dmg), cls.trim());
  const hp = (opt.at || m.pos.clone().setY(1.1 * m.S.scale)), w = src.isPlayer ? WEIGHT[src.wtype] || 1 : 0.5;
  burst(hp, src.elem && src.elem !== 'none' ? elemColor(src.elem) : 0xfff2c0, opt.heavy ? 18 : 8, opt.heavy ? 7 : 4);
  if (src.isPlayer) { fx.impact(hp, opt.crit ? 0x9ff8ff : src.elem && src.elem !== 'none' ? elemColor(src.elem) : 0xfff0c0, (0.7 + 0.45 * w) * (opt.heavy ? 1.35 : 1), wpt); if (wpt) sfx('weak'); }
  if (m.ai !== 'topple' && m.ai !== 'roar') m.flinch = Math.max(m.flinch, src.isPlayer ? Math.min(1, 0.45 + 0.35 * w + (opt.heavy ? 0.3 : 0)) : 0.25);
  if (src.elem && src.elem !== 'none') applyStatus(m, src.elem, (opt.heavy ? 34 : 14) * (weak ? 1.3 : 1));
  if (src.comp?.species === 'witch') applyStatus(m, 'ice', 6); if (src.comp?.species === 'kitsune') applyStatus(m, 'fire', 6);
  if (src.isPlayer && G.player.state !== 'special') G.sp = Math.min(100, G.sp + (opt.heavy ? 7 : 3.2));
  // 부위
  if (opt.part && !opt.part.broken) { const p = opt.part; p.hp -= dmg * (opt.heavy ? 1.4 : 1);
    if (p.hp <= 0) { p.broken = true; G.stats.broken++; setPartVisible(m, p, false); breakFx(m, p); topple(m, 3.4);
      banner(`${p.n} 파괴!`); say(p === m.parts[0] ? m.S.lines.break : `크윽… 내 ${p.n}이…!`, m.S.short); sfx('brk'); vib([40, 30, 80]); G.shake = 0.5; G.hitstop = 0.12;
      burst(anchorWorld(m, p), 0xffd24a, 28, 8, 0.8); G.log.push(p.n + ' 파괴'); } }
  if (m.hp <= 0) killMonster(m);
}
function topple(m, dur) { if (!alive(m)) return; clearMonsterTele(m); m.ai = 'topple'; m.aiT = dur; m.topT = 0; m.st = 0; m.flinch = 0; m.model.position.y = 0; G.stats.topples = (G.stats.topples || 0) + 1;
  banner('다운! 공격 찬스!', 1100); popNum(m.pos, '다운!', 'info'); sfx('topple'); fx.shock(m.pos, 0xffe8a0, 4 * m.S.scale, 0.45); G.shake = Math.max(G.shake, 0.35); G.zoomK = 1.08; }
// 부위 파괴 연출: 금빛 폭발 + 파편 + 남은 부위는 금 간 색(어둡게)으로 바뀜
function breakFx(m, p) { const at = anchorWorld(m, p); fx.impact(at, 0xffd24a, 2.4, false); fx.shock(at.clone().setY(0), 0xffd24a, 3, 0.4); burst(at, 0x6a5a4a, 14, 6, 0.9);
  const u = m.model.userData; if (p.anchor === 'horn1' && u['horn-1']) { u['horn-1'].material = toon(0x8a7a6a); } }
function killMonster(m) { m.ai = 'down'; m.aiT = 0; m.state = 'down'; m.st = 0; clearMonsterTele(m); say(m.S.lines.win, m.S.short); banner('토벌!'); sfx('win'); G.hitstop = 0.2; G.slowmo = 0.6;
  if (G.lock === m) G.lock = nearestMonster(G.player.pos); if (G.monsters.every(x => !alive(x))) setTimeout(() => endHunt(true), 1800); }
function clearMonsterTele(m) { if (m.cur) { m.cur.teles.forEach(killTele); m.cur = null; } }
function hurt(e, raw, el, from) {
  if (!alive(e) || G.over) return;
  if (e.isPlayer && e.iframe > 0) { // 회피 성공
    if (G.t - e.rollStart < 0.3) { if (!e._pd || G.t - e._pd > 0.5) { e._pd = G.t; G.stats.perfect++; e.counter = 1.6; e.goldT = 0.9; G.sp = Math.min(100, G.sp + 12); G.slowmo = 0.35; $('flash').style.opacity = 0.5; setTimeout(() => $('flash').style.opacity = 0, 90); sfx('perfect'); vib(25); popNum(e.pos, '완벽 회피!', 'info'); $('counter').classList.remove('hidden'); } }
    else popNum(e.pos, '회피', 'info'); return; }
  if (e.invul > 0) return;
  if (e.isPlayer && e.state === 'special') { popNum(e.pos, '무적', 'info'); return; }
  let dmg = raw * defMul(e.def || 0);
  if (e.isPlayer && e.status.soak > 0) dmg *= 1.2;
  if (e.isPlayer && e.state === 'guard') { const just = G.t - e.guardStart < 0.25; e.guarded = G.t; G.stats.guards++;
    if (just) { e.counter = 1.6; $('counter').classList.remove('hidden'); popNum(e.pos, '저스트 가드!', 'info'); sfx('perfect'); vib(25); G.sp = Math.min(100, G.sp + 10); G.hitstop = 0.08; return; }
    dmg *= e.wtype === 'lance' ? 0.15 : 0.3; dmg = Math.max(1, Math.round(dmg)); e.hp = Math.max(1, e.hp - dmg); popNum(e.pos, '가드 -' + dmg, 'info'); sfx('hit'); vib(20);
    if (from) e.vel.addScaledVector(fwd(angTo(from.pos, e.pos)), e.wtype === 'lance' ? 1.5 : 4); return; }
  if (e.comp?.species === 'drake') dmg *= 0.8;
  if (e.role === 'tank' && e.guard > 0) { dmg *= 0.3; popNum(e.pos, '가드', 'info'); }
  dmg = Math.round(dmg); e.hp = Math.max(0, e.hp - dmg); popNum(e.pos, '-' + dmg, 'hurt'); e.hitFlash = 0.15;
  if (el) applyStatus(e, el, 30);
  if (e.isPlayer) { G.stats.hits++; e.state = 'hit'; e.st = 0; e.invul = 0.6; e.combo = -1; e.charge = 0; e.chargeLvl = 0; sfx('hurt'); vib(60); G.shake = Math.max(G.shake, 0.35);
    if (from) { const k = fwd(angTo(from.pos, e.pos)); e.vel.addScaledVector(k, 8); } }
  else { e.invul = 0.4; if (e.state !== 'guard') { e.state = 'hit'; e.st = 0; } }
  if (e.hp <= 0) { e.state = 'down'; e.st = 0; if (e.isPlayer) { banner('쓰러졌다…'); setTimeout(() => endHunt(false), 1600); G.over = true; } else popNum(e.pos, '전투 불능', 'info'); }
}
// ───────── 플레이어 무기 액션 ─────────
const HEAD_PARTS = ['horn', 'crown', 'ear', 'crest'];
function playerAttackHit(p, mult, heavy, opt = {}) {
  const wt = p.wt, f = fwd(p.face), rng = wt.ranged ? 2.4 : wt.range * (opt.rangeMul || 1), center = p.pos.clone().addScaledVector(f, rng * 0.6).setY(1.1);
  const crit = p.counter > 0; let any = false;
  if (p.wtype === 'ls') mult *= 1 + 0.1 * p.spiritLvl;
  for (const m of G.monsters) { if (!alive(m)) continue; const d = m.pos.distanceTo(p.pos), rr = rng + 0.6 * m.S.scale;
    const a = Math.abs(lerpAng(0, angTo(p.pos, m.pos) - p.face, 1)); if (d > rr + (heavy ? 0.5 : 0) || (a > (opt.wide ? 3.2 : 1.25) && d > 1.2)) continue;
    let part = null, pd = 1.5 * m.S.scale; for (const pt of m.parts) if (!pt.broken) { const wp = anchorWorld(m, pt); const dd = wp.distanceTo(center); if (dd < pd) { pd = dd; part = pt; } }
    if (!part && heavy) part = m.parts.find(x => !x.broken); // 차지 공격은 부위를 노림
    damageMonster(m, p.atk * mult, p, { crit, heavy, part, at: part ? anchorWorld(m, part) : null });
    if (wt.ko && alive(m)) addKo(m, mult * (heavy ? 6 : 4) * (part && HEAD_PARTS.includes(part.key) ? 1.5 : 1));
    any = true; }
  const W = WEIGHT[p.wtype] || 1;
  if (any) { G.hitstop = Math.max(G.hitstop, (heavy ? 0.075 : 0.032) * W + (opt.special ? 0.02 : 0)); G.lastHitstop = G.hitstop; G.shake = Math.max(G.shake, (heavy ? 0.28 : 0.08) * W); G.shakeDir = p.face; sfx(heavy ? 'heavy' : 'hit', W); vib(Math.round((heavy ? 32 : 10) * W)); if (crit) { p.counter = 0; $('counter').classList.add('hidden'); }
    if (p.wtype === 'ls' && !opt.special) p.spirit = Math.min(100, p.spirit + (heavy ? 4 : 9)); }
  const col = crit ? 0x7ff8ff : (p.wtype === 'ls' && p.spiritLvl ? [0xffffff, 0xffffff, 0xffe066, 0xff5050][p.spiritLvl] : (p.elem !== 'none' ? elemColor(p.elem) : 0xffffff));
  weaponTrail(p, col, rng, heavy, opt.wide);
  return any;
}
// 무기별 궤적: 동작 스타일(가로/역가로/내려찍기/올려베기/회전/찌르기)에 맞춘 호
function weaponTrail(p, col, rng, heavy, wide) {
  const style = p.wtype === 'lance' ? 'thrust' : (ATK_STYLE[p.wtype]?.[(Math.max(0, p.combo)) % 4] || 'over'), W = WEIGHT[p.wtype] || 1, r = Math.max(1.3, rng * 0.95) * (heavy ? 1.15 : 1), w = 0.25 + 0.35 * W;
  const base = { color: col, r, w, dur: 0.16 + 0.08 * W, y: 1.05 };
  if (style === 'thrust') { fx.trail(p, Object.assign(base, { from: -0.12, to: 0.12, r: r * 1.25, w: r * 1.1, y: 1.15 })); return; }
  if (style === 'hor') fx.trail(p, Object.assign(base, { from: 1.7, to: -1.5 }));
  else if (style === 'rev') fx.trail(p, Object.assign(base, { from: -1.7, to: 1.5, y: 1.15 }));
  else if (style === 'spin' || wide) fx.trail(p, Object.assign(base, { from: 0, to: Math.PI * 2 * 0.95, dur: base.dur * 1.4 }));
  else if (style === 'over') fx.trail(p, Object.assign(base, { from: -0.6, to: 2.0, tilt: Math.PI / 2, pitch: 0, y: 0.95 }));
  else fx.trail(p, Object.assign(base, { from: 2.0, to: -0.6, tilt: Math.PI / 2, y: 0.95 }));
}
function addKo(m, v) { m.ko = (m.ko || 0) + v; const need = 100 * (1 + 0.5 * (m.koN || 0));
  if (m.ko >= need && m.ai !== 'down') { m.ko = 0; m.koN = (m.koN || 0) + 1; topple(m, 4.2); banner('기절! 다운!'); popNum(m.pos, '기절!', 'info'); burst(m.pos.clone().setY(2), 0xffe066, 20, 3); sfx('brk'); } }
// 화살
const arrows = [], arrowGeo = new THREE.CylinderGeometry(0.035, 0.035, 0.9, 5).rotateX(Math.PI / 2);
function shoot(p, mult, o = {}) {
  const spread = o.spread ? [-0.2, 0, 0.2] : [0];
  for (const off of spread) { const a = p.face + off, col = o.pierce ? 0x7ff8ff : p.elem !== 'none' ? elemColor(p.elem) : 0xfff2c0;
    const m = new THREE.Mesh(arrowGeo, new THREE.MeshBasicMaterial({ color: col })); m.position.copy(p.pos).setY(1.2).addScaledVector(fwd(a), 0.6); m.rotation.y = a; m.scale.setScalar(o.heavy ? 1.6 : 1); scene.add(m);
    arrows.push({ m, a, life: 0.75, mult, heavy: o.heavy, pierce: o.pierce, hit: new Set() }); }
  sfx('swing');
}
function updArrows(dt) {
  for (let i = arrows.length - 1; i >= 0; i--) { const ar = arrows[i]; ar.life -= dt; ar.m.position.addScaledVector(fwd(ar.a), 30 * dt); let dead = ar.life <= 0;
    for (const m of G.monsters) { if (dead || !alive(m) || ar.hit.has(m)) continue; const d = Math.hypot(m.pos.x - ar.m.position.x, m.pos.z - ar.m.position.z); if (d > 0.85 * m.S.scale) continue;
      let part = null, pd = 1.6 * m.S.scale; for (const pt of m.parts) if (!pt.broken) { const dd = anchorWorld(m, pt).distanceTo(ar.m.position); if (dd < pd) { pd = dd; part = pt; } }
      const p = G.player, crit = p.counter > 0; damageMonster(m, p.atk * ar.mult, p, { crit, heavy: ar.heavy, part, at: part ? anchorWorld(m, part) : ar.m.position.clone() }); ar.hit.add(m);
      G.hitstop = Math.max(G.hitstop, ar.heavy ? 0.07 : 0.03); sfx(ar.heavy ? 'heavy' : 'hit'); vib(ar.heavy ? 30 : 10); if (crit) { p.counter = 0; $('counter').classList.add('hidden'); } if (!ar.pierce) dead = true; }
    if (dead) { scene.remove(ar.m); ar.m.material.dispose(); arrows.splice(i, 1); } }
}
function clearArrows() { arrows.forEach(a => { scene.remove(a.m); a.m.material.dispose(); }); arrows.length = 0; }
function moveVec(dx, dy) { const camF = new THREE.Vector3(); camera.getWorldDirection(camF); camF.y = 0; camF.normalize(); const camR = new THREE.Vector3(-camF.z, 0, camF.x); return camR.multiplyScalar(dx).addScaledVector(camF, -dy); }
function cancelable(p) { // 회피로 끊을 수 있는 상태 (공격 후딜 캔슬)
  if (['idle', 'run', 'charge', 'guard', 'dance'].includes(p.state)) return true;
  if (p.state === 'attack') return p.st / p.atkDur >= (p.heavy ? 0.5 : (p.wtype === 'gs' || p.wtype === 'hammer') ? 0.35 : 0.12);
  if (p.state === 'hit') return p.st > 0.3;
  return false;
}
function doRoll(p, dir) { burst(p.pos.clone().setY(0.1), 0xc8b08a, 9, 3, 0.45); p.state = 'roll'; p.st = 0; p.rollStart = G.t; p.iframe = 0.32; p.combo = -1; p.charge = 0; p.chargeLvl = 0; setRing(0); p.rollDir = dir; p.face = dir; p.queued = false; sfx('roll'); G.stats.dodges = (G.stats.dodges || 0) + 1; }
function startSpecial(p) { const sp = p.wt.sp; p.state = 'special'; p.st = 0; p.spIdx = 0; G.sp = 0; G.stats.specials = (G.stats.specials || 0) + 1; banner(sp.n + '!', 1000); G.slowmo = 0.12; $('flash').style.opacity = 0.45; setTimeout(() => $('flash').style.opacity = 0, 120); sfx('perfect'); vib([20, 20, 40]); setRing(0); p.charge = 0; }
function updSpecial(p, dt) {
  const sp = p.wt.sp; p.st += dt; p.run = 0; if (G.lock && alive(G.lock)) p.face = angTo(p.pos, G.lock.pos);
  if (sp.dash) { const dist = G.lock ? G.lock.pos.distanceTo(p.pos) : 9; if (sp.dash < 0 || dist > 1.6 + G.lock?.S.scale * 0.7) p.pos.addScaledVector(fwd(p.face), sp.dash / sp.dur * dt * 1.4); }
  while (p.spIdx < sp.hits.length && p.st >= sp.hits[p.spIdx]) { const last = p.spIdx === sp.hits.length - 1; p.combo = p.spIdx;
    if (p.wt.ranged) shoot(p, sp.mult[p.spIdx], { heavy: true, pierce: sp.pierce }); else playerAttackHit(p, sp.mult[p.spIdx], last, { special: true, rangeMul: 1.3, wide: true });
    if (last) { G.shake = 0.6; burst(p.pos.clone().addScaledVector(fwd(p.face), 1.5).setY(1), 0xffe066, 30, 9, 0.8); } p.spIdx++; }
  if (p.wtype === 'ls' && p.st >= sp.dur) p.spiritLvl = 3;
  if (p.st >= sp.dur) { p.state = 'idle'; p.st = 0; }
}
function holdName(t) { return { guard: '방패 가드', charge: t === 'bow' ? '모아 쏘기' : '모으기', spirit: '기인 베기', dance: '귀인 난무', counter: '가드·카운터' }[WEAPON_TYPES[t].hold]; }
function releaseCharge(p) {
  const wt = p.wt, lvl = Math.max(1, p.chargeLvl); p.charge = 0; p.chargeLvl = 0; setRing(0);
  if (wt.hold === 'spirit') { const full = p.chargeT >= wt.chargeStep; let mult = 1.3;
    if (full && p.spirit >= 25) { p.spirit -= 25; mult = 2.4; p.spiritLvl = Math.min(3, p.spiritLvl + 1); p.spiritT = 25; popNum(p.pos, ['', '기력 백', '기력 황', '기력 적'][p.spiritLvl], 'info'); }
    else if (full) popNum(p.pos, '기력 부족', 'info');
    p.state = 'attack'; p.st = 0; p.heavy = true; p.combo = 3; p.atkDur = 0.55; p.mult = mult; p.hitDone = false; p.wide = true; sfx('swing'); return; }
  if (wt.ranged) { p.state = 'attack'; p.st = 0; p.heavy = true; p.combo = 0; p.atkDur = 0.32; p.mult = wt.charge[lvl - 1]; p.hitDone = false; p.spread = lvl >= 3; return; }
  p.state = 'attack'; p.st = 0; p.heavy = true; p.combo = (wt.ko && lvl >= 3) ? 3 : 0; p.atkDur = wt.combo[0] * (wt.ko && lvl >= 3 ? 1.2 : 1.05); p.mult = wt.charge[lvl - 1]; p.hitDone = false; p.wide = wt.ko && lvl >= 3; sfx('swing');
}
function updPlayer(p, dt) {
  const wt = p.wt, now = nowT(); p.iframe = Math.max(0, p.iframe - dt); p.invul = Math.max(0, p.invul - dt); p.counter = Math.max(0, p.counter - dt); if (p.counter <= 0) $('counter').classList.add('hidden');
  if (p.spiritLvl > 0) { p.spiritT -= dt; if (p.spiritT <= 0) { p.spiritLvl--; p.spiritT = 25; } }
  if (input.atkDown) input.atkT += dt;
  if (input.target) { input.target = false; const live = G.monsters.filter(alive); if (live.length) { const i = live.indexOf(G.lock); G.lock = live[(i + 1) % live.length]; popNum(G.lock.pos, '타겟', 'info'); } }
  if (G.lock && !alive(G.lock)) G.lock = nearestMonster(p.pos);
  if (!G.lock) G.lock = nearestMonster(p.pos);
  const mv = moveVec(input.mx, input.mz), ml = Math.min(1, mv.length());
  const spdMul = p.status.freeze > 0 ? 0.55 : 1;
  if (p.state === 'down') { p.st += dt; return; }
  if (p.state === 'cover') { p.st += dt; p.run = 0; if (p.st >= p.coverDur) p.state = 'idle'; return; } // 포효에 귀 막음 (회피 불가)
  if (p.status.para > 0) { p.state = 'stun'; p.run = 0; input.dodgeBuf = null; input.tapBuf = -9; return; } else if (p.state === 'stun') p.state = 'idle';
  if (input.sp) { input.sp = false; if (G.sp >= 100 && !['special', 'roll'].includes(p.state)) { startSpecial(p); } else if (G.sp < 100) popNum(p.pos, '게이지 부족', 'info'); }
  if (p.state === 'special') { updSpecial(p, dt); return; }
  // 회피 (버퍼 0.3초, 공격 후딜 캔슬 가능)
  if (input.dodgeBuf && now - input.dodgeBuf.t > 0.3) input.dodgeBuf = null;
  if (input.dodgeBuf && cancelable(p)) { const b = input.dodgeBuf; input.dodgeBuf = null; let dir;
    if (Math.hypot(b.dx, b.dy) > 5) { const v = moveVec(b.dx, b.dy); dir = Math.atan2(v.x, v.z); } else if (G.lock) dir = angTo(G.lock.pos, p.pos) + Math.PI / 2 * (Math.random() < 0.5 ? 1 : -1); else dir = p.face + Math.PI;
    doRoll(p, dir); }
  p.st += dt;
  if (p.state === 'roll') { const k = p.st / 0.42; p.pos.addScaledVector(fwd(p.rollDir), 10 * (1 - k * 0.7) * dt * spdMul); if (k >= 1) { p.state = 'idle'; } p.run = 0; return; }
  if (p.state === 'hit') { if (p.st > 0.45) p.state = 'idle'; return; }
  const lockR = wt.ranged ? 22 : 9;
  const aimLock = () => { if (G.lock && G.lock.pos.distanceTo(p.pos) < lockR) p.face = angTo(p.pos, G.lock.pos); else if (ml > 0.2) p.face = Math.atan2(mv.x, mv.z); };
  const tap = now - input.tapBuf < 0.35; // 입력 버퍼
  const free = p.state === 'idle' || p.state === 'run' || (p.state === 'attack' && !p.heavy && p.st / p.atkDur > 0.6);
  // 홀드 시작
  if (input.atkDown && free && !p.holdUsed) { p.holdUsed = true; input.tapBuf = -9;
    if (wt.hold === 'charge' || wt.hold === 'spirit') { p.state = 'charge'; p.charge = 0; p.chargeLvl = 0; p.chargeT = 0; }
    else if (wt.hold === 'guard' || wt.hold === 'counter') { p.state = 'guard'; p.guardStart = G.t; p.guarded = -9; }
    else if (wt.hold === 'dance') { p.state = 'dance'; p.st = 0; p.danceNext = 0; } }
  if (!input.atkDown) p.holdUsed = false;
  if (p.state === 'charge') {
    aimLock(); p.charge += dt; p.chargeT = p.charge;
    const steps = wt.hold === 'spirit' ? 1 : wt.charge.length, lvl = Math.min(steps, Math.floor(p.charge / wt.chargeStep));
    if (lvl > p.chargeLvl) { p.chargeLvl = lvl; sfx('charge'); vib(12); popNum(p.pos, wt.hold === 'spirit' ? '기인!' : '차지 ' + lvl, 'info'); burst(p.pos.clone().setY(1.3), [0xffffff, 0xffffff, 0xffe066, 0xff5050][lvl] || 0xffffff, 8, 2); }
    setRing(Math.min(1, p.charge / (wt.chargeStep * steps)), lvl);
    if (ml > 0.2) p.pos.addScaledVector(mv.clone().normalize(), (wt.ranged ? 3.4 : 1.2) * dt);
    if (!input.atkDown) releaseCharge(p);
    p.run = wt.ranged ? ml * 0.5 : 0; return; }
  if (p.state === 'guard') { aimLock(); p.run = 0; setRing(0);
    if (tap && wt.hold === 'guard') { input.tapBuf = -9; startCombo(p, 3); p.mult = 1.3; p.heavy = false; return; } // 방패 치기
    if (!input.atkDown) { if (wt.hold === 'counter' && G.t - p.guarded < 1.0) { p.state = 'attack'; p.st = 0; p.heavy = true; p.combo = 0; p.atkDur = 0.45; p.mult = 2.8; p.hitDone = false; popNum(p.pos, '카운터!', 'info'); sfx('swing'); } else p.state = 'idle'; }
    if (ml > 0.2 && wt.hold === 'counter') p.pos.addScaledVector(mv.clone().normalize(), 1.6 * dt);
    return; }
  if (p.state === 'dance') { aimLock(); p.run = 0; if (p.st >= p.danceNext) { p.danceNext += 0.12; p.combo = (p.combo + 1) % 2; playerAttackHit(p, 0.42, false, { wide: true }); }
    if (G.lock && G.lock.pos.distanceTo(p.pos) > 2 + G.lock.S.scale * 0.6) p.pos.addScaledVector(fwd(p.face), 3 * dt);
    if (!input.atkDown || p.st > 2.0) { p.state = 'idle'; p.comboT = 0.3; } return; }
  if (tap) { if (p.state === 'attack') { if (!p.heavy && p.st / p.atkDur > 0.25) { p.queued = true; input.tapBuf = -9; } }
    else { input.tapBuf = -9; startCombo(p, p.comboT > 0 ? (p.combo + 1) % wt.combo.length : 0); } }
  if (p.state === 'attack') {
    const pr = p.st / p.atkDur; if (pr < 0.4 && !wt.ranged) { const dl = G.lock ? G.lock.pos.distanceTo(p.pos) : 99, reach = wt.range + 0.6 * (G.lock?.S.scale || 1) - 0.4; // 공격 시 대상 쪽으로 붙는 보정
      if (dl > reach && dl < 7) { p.face = angTo(p.pos, G.lock.pos); p.pos.addScaledVector(fwd(p.face), Math.min(dl - reach, (p.heavy ? 6 : 9) * dt)); } else if (dl > 1.6) p.pos.addScaledVector(fwd(p.face), (p.heavy ? 1 : 1.8) * dt); }
    if (!wt.ranged && !p.lunged && pr > (p.heavy ? 0.45 : wt.hitAt) - 0.12) { p.lunged = true; const dl = G.lock ? G.lock.pos.distanceTo(p.pos) - 0.9 * G.lock.S.scale * MSCALE : 9; if (dl > 0.6) p.vel.addScaledVector(fwd(p.face), Math.min(dl, 0.6 + 0.5 * (WEIGHT[p.wtype] || 1)) * 7); } // 루트 모션 전진
    if (wt.ranged && pr < 0.3) aimLock();
    const hitAt = p.heavy ? 0.45 : wt.hitAt;
    if (!p.hitDone && pr >= hitAt) { p.hitDone = true; if (wt.ranged) shoot(p, p.mult, { heavy: p.heavy, spread: p.spread }); else playerAttackHit(p, p.mult, p.heavy, { wide: p.wide }); }
    if (wt.double && !p.heavy && !p.hit2 && pr >= hitAt + 0.3) { p.hit2 = true; playerAttackHit(p, p.mult, false); }
    if (pr >= (p.queued ? 0.8 : 1)) { p.wide = false; p.spread = false; if (p.queued && !p.heavy) { startCombo(p, (p.combo + 1) % wt.combo.length); } else { p.state = 'idle'; p.comboT = 0.55; } }
    p.run = 0; return; }
  if (p.comboT > 0) { p.comboT -= dt; if (p.comboT <= 0) p.combo = -1; }
  if (ml > 0.12) { const tf = Math.atan2(mv.x, mv.z); p.face = lerpAng(p.face, tf, Math.min(1, dt * 16)); p.pos.addScaledVector(mv.clone().normalize(), 6.4 * Math.min(1, ml * 1.3) * spdMul * dt); p.run = Math.min(1, ml); p.state = 'run'; }
  else { p.run = Math.max(0, p.run - dt * 6); p.state = 'idle'; }
}
function startCombo(p, i) { const wt = p.wt; p.combo = i; p.state = 'attack'; p.st = 0; p.heavy = false; p.atkDur = wt.combo[i] * (p.counter > 0 ? 0.75 : 1); p.mult = wt.mult[i]; p.hitDone = false; p.hit2 = false; p.queued = false; p.spread = false; p.lunged = false;
  if (G.lock && G.lock.pos.distanceTo(p.pos) < (wt.ranged ? 22 : 8)) p.face = angTo(p.pos, G.lock.pos); if (!wt.ranged) sfx('swing'); G.stats.taps = (G.stats.taps || 0) + 1; }
function setRing(k, lvl = 0) { const r = $('holdRing'); if (!k) { r.style.opacity = 0; return; } r.style.opacity = 1; r.style.left = input.hx + 'px'; r.style.top = input.hy + 'px';
  const c = r.querySelector('circle'); c.style.strokeDashoffset = 289 * (1 - k); c.style.stroke = ['#ffffff', '#ffffff', '#ffe066', '#ff5050'][lvl] || '#ffe066'; }

// 몬스터 공격 패턴
// 몬스터 공격 패턴 (레벨이 오를수록 추가)
const PATTERNS = { wolf: [['bite', 1], ['rush', 1], ['breath', 3], ['triple', 5]], witch: [['icicle', 1], ['frost', 1], ['rain', 3], ['nova', 5]], drake: [['slam', 1], ['leap', 1], ['quake', 3], ['bolt', 5]],
  siren: [['wave', 1], ['bubble', 1], ['whirl', 3], ['tide', 5]], kitsune: [['foxfire', 1], ['blink', 1], ['fan', 3], ['pillar', 5]], harpy: [['dive', 1], ['gust', 1], ['feather', 3], ['storm', 5]] };
function patterns(m) { return PATTERNS[m.sp].filter(([, l]) => m.lvl >= l).map(([k]) => k); }
function pickTarget(m) {
  if (m.taunt > 0 && m.aggro && alive(m.aggro)) return m.aggro;
  const live = G.allies.filter(alive); const p = G.player; if (alive(p) && Math.random() < 0.6) return p; return live[Math.floor(Math.random() * live.length)] || p;
}
function beginAttack(m, kind) {
  const tgt = m.tgt || pickTarget(m); m.tgt = tgt; const a = m.face; const L = m.lvl, wu = Math.max(0.6, 1 - 0.05 * (L - 1)) * (m.enraged ? 0.82 : 1), x = m.pos.x, z = m.pos.z; // 방향 = 지금 바라보는 방향 (회전 한계 → 측면·후방이 안전지대)
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
    case 'wave': list = [T({ type: 'line', x, z, a, w: 3.0, len: 12 }, 1.05 * wu)]; anim = 'cast'; el = 'water'; break;
    case 'bubble': list = [0, 1, 2].map(i => { const ra = rnd(0, 7), rr = i ? rnd(1.5, 3.5) : 0; return T({ type: 'circle', x: tgt.pos.x + Math.sin(ra) * rr, z: tgt.pos.z + Math.cos(ra) * rr, r: 1.6 }, 1.1 * wu + i * 0.35); }); anim = 'cast'; el = 'water'; mult = 0.85; break;
    case 'whirl': list = [T({ type: 'ring', x, z, r: 2.2, r2: 6.2 }, 1.3 * wu)]; anim = 'cast'; el = 'water'; mult = 1.1; break;
    case 'tide': list = [T({ type: 'circle', x, z, r: 3.0 }, 0.9 * wu), T({ type: 'circle', x: tgt.pos.x, z: tgt.pos.z, r: 4.2 }, 1.6 * wu)]; anim = 'cast'; el = 'water'; mult = 1.2; break;
    case 'foxfire': list = [0, 1, 2].map(i => T({ type: 'circle', x: tgt.pos.x + rnd(-1.5, 1.5), z: tgt.pos.z + rnd(-1.5, 1.5), r: 1.5 }, 0.95 * wu + i * 0.3)); anim = 'cast'; el = 'fire'; mult = 0.85; break;
    case 'blink': list = [T({ type: 'circle', x: tgt.pos.x, z: tgt.pos.z, r: 2.4 }, 1.1 * wu)]; anim = 'slam'; after = { leap: new THREE.Vector3(tgt.pos.x, 0, tgt.pos.z) }; mult = 1.2; break;
    case 'fan': list = [-2, -1, 0, 1, 2].map(i => T({ type: 'line', x, z, a: a + i * 0.35, w: 1.1, len: 9 }, 1.0 * wu + Math.abs(i) * 0.15)); anim = 'cast'; el = 'fire'; mult = 0.9; break;
    case 'pillar': list = [T({ type: 'circle', x, z, r: 3.0 }, 0.9 * wu), T({ type: 'ring', x, z, r: 4.5, r2: 7.2 }, 1.5 * wu)]; anim = 'cast'; el = 'fire'; break;
    case 'dive': list = [T({ type: 'line', x, z, a, w: 2.0, len: 13 }, 0.95 * wu)]; anim = 'charge'; after = { dash: 13 }; el = 'thunder'; mult = 1.2; break;
    case 'gust': list = [T({ type: 'cone', x, z, a, r: 6.0, ang: 1.2 }, 1.0 * wu)]; anim = 'cast'; mult = 1.0; break;
    case 'feather': list = [0, 1, 2, 3, 4].map(i => { const ra = rnd(0, 7), rr = i ? rnd(2, 5) : 0; return T({ type: 'circle', x: tgt.pos.x + Math.sin(ra) * rr, z: tgt.pos.z + Math.cos(ra) * rr, r: 1.4 }, 1.0 * wu + i * 0.2); }); anim = 'cast'; el = 'thunder'; mult = 0.8; break;
    case 'spin': list = [T({ type: 'circle', x, z, r: 2.9 * m.S.scale / 1.45 }, 1.15 * wu)]; anim = 'swing'; mult = 1.0; break; // 뒤에 붙은 헌터 견제 (꼬리 휘두르기)
    case 'storm': list = [T({ type: 'circle', x, z, r: 3.5 }, 1.0 * wu), T({ type: 'ring', x, z, r: 5, r2: 8 }, 1.55 * wu)]; anim = 'cast'; el = 'thunder'; break;
  }
  m.lastK = kind; m.cur = { kind, anim, after, mult: mult * (m.enraged ? 1.15 : 1), el: el || (Math.random() < 0.4 ? m.elem : null), list, teles: [], t: 0, done: 0, total: Math.max(...list.map(l => l.dur + l.delay)) };
  m.ai = 'windup'; m.state = 'windup';
}
const BIG = new Set(['rush', 'triple', 'nova', 'leap', 'quake', 'bolt', 'tide', 'pillar', 'dive', 'storm', 'fan']); // 큰 공격 뒤엔 긴 빈틈
function startRoar(m, why) { clearMonsterTele(m); m.ai = 'roar'; m.aiT = 0; m.roarHit = false; m.st = 0; m.pendingRoar = null; G.zoomK = 1.18;
  if (why === 'rage') { say(m.S.lines.break.replace(/.*?!/, '') || '이제 진심이야!', m.S.short); }
  sfx('roar'); vib([30, 30, 30]); }
function updRoar(m, dt) { m.aiT += dt; m.state = 'roar'; m.run = 0;
  if (!m.roarHit && m.aiT > 0.45) { m.roarHit = true; const R = 7 * m.S.scale / 1.45; fx.shock(m.pos, 0xffffff, R, 0.55); fx.shock(m.pos, 0xff9a7a, R * 0.7, 0.4); G.shake = Math.max(G.shake, 0.45);
    banner(m.enraged && m.roarWhy === 'rage' ? `${m.S.short} 분노!` : '포효!', 900);
    for (const a of G.allies) { if (!alive(a) || a.pos.distanceTo(m.pos) > R) continue;
      if (a.isPlayer && (a.iframe > 0 || a.state === 'special')) { popNum(a.pos, '포효 회피!', 'info'); G.stats.roarDodge = (G.stats.roarDodge || 0) + 1; continue; }
      if (a.isPlayer && a.state === 'guard') { popNum(a.pos, '가드', 'info'); continue; }
      a.state = 'cover'; a.st = 0; a.coverDur = a.isPlayer ? 1.0 : 0.8; a.combo = -1; a.charge = 0; if (a.isPlayer) { G.stats.covered = (G.stats.covered || 0) + 1; setRing(0); } } }
  if (m.aiT >= 1.7) { m.ai = 'move'; m.atkCd = rnd(0.2, 0.6); G.zoomK = 1; } }
function updMonster(m, dt) {
  m.taunt = Math.max(0, m.taunt - dt); m.defDown = Math.max(0, m.defDown - dt); m.slow = Math.max(0, m.slow - dt); m.flinch = Math.max(0, m.flinch - dt * 4.5);
  // 분노(체력 50%↓)·약해짐(22%↓, 절뚝이며 한 번 도주) — 다음 행동 시점에 발동해서 공격 도중 끊기지 않음
  if (!m.enraged && !m.rageDone && m.hp < m.maxHp * 0.5 && alive(m)) { m.enraged = true; m.rageDone = true; m.pendingRoar = 'rage'; m.speed *= 1.15; m.turnRate = 3.1; G.log.push(m.S.short + ' 분노'); }
  if (!m.weakened && m.hp < m.maxHp * 0.22 && alive(m)) { m.weakened = true; m.pendingFlee = true; m.enraged = false; m.turnRate = 2.0; }
  if (m.enraged && alive(m)) { m._rt = (m._rt || 0) + dt; if (m._rt > 0.25) { m._rt = 0; const h = m.model.userData.rig.head, v = new THREE.Vector3(); h.getWorldPosition(v); burst(v, 0xff5a3a, 2, 1.4, 0.6); } }
  const sMul = (m.status.freeze > 0 ? 0.5 : 1) * (m.slow > 0 ? 0.7 : 1) * (m.weakened ? 0.7 : 1);
  if (m.ai === 'down') { m.state = 'down'; m.st += dt; m.model.position.y = 0; return; }
  if (m.ai === 'topple') { m.state = 'topple'; m.topT += dt; m.aiT -= dt; m.run = 0; if (m.aiT <= 0) { m.ai = 'recover'; m.aiT = 0.6; } return; }
  if (m.ai === 'roar') { updRoar(m, dt); return; }
  if (m.ai === 'stun') { m.state = 'stun'; m.aiT -= dt; m.run = 0; if (m.aiT <= 0) { m.ai = 'move'; m.atkCd = 0.6; } return; }
  if (m.ai === 'flee') { m.aiT -= dt; const away = angTo(G.player.pos, m.pos); m.face = lerpAng(m.face, away, dt * 4); m.pos.addScaledVector(fwd(m.face), m.speed * 0.75 * dt); m.run = 1; m.state = 'run';
    if (m.aiT <= 0) { m.ai = 'move'; m.atkCd = 0.8; } return; }
  if (m.ai === 'move') { const tgt = (m.taunt > 0 && m.aggro && alive(m.aggro)) ? m.aggro : (alive(G.player) ? G.player : pickTarget(m)); m.tgt = tgt; const d = m.pos.distanceTo(tgt.pos);
    const want = (m.S.want || 2.6) * (MSCALE * 0.9), wantA = angTo(m.pos, tgt.pos), diff = lerpAng(0, wantA - m.face, 1);
    m.face += clamp(diff, -m.turnRate * dt * sMul, m.turnRate * dt * sMul); // 회전 속도 한계
    if (Math.abs(d - want) > 0.8 && Math.abs(diff) < 1.2) { const dir = d > want ? 1 : (want >= 5 ? -0.6 : 0); if (!dir) { m.run = 0; m.state = 'idle'; } else { m.pos.addScaledVector(fwd(m.face), m.speed * 0.6 * sMul * dir * dt); m.run = 0.8; m.state = 'run'; } } else { m.run = Math.abs(diff) > 0.3 ? 0.4 : 0; m.state = m.run ? 'run' : 'idle'; }
    m.atkCd -= dt * sMul;
    if (m.atkCd <= 0) {
      if (!m.roared) { m.roared = true; m.roarWhy = 'meet'; startRoar(m, 'meet'); return; } // 조우 포효
      if (m.pendingRoar) { m.roarWhy = m.pendingRoar; startRoar(m, m.pendingRoar); return; }
      if (m.pendingFlee) { m.pendingFlee = false; m.ai = 'flee'; m.aiT = 2.4; banner(`${m.S.short}가 약해졌다! 절뚝거린다`, 1400); say('하아… 하아…', m.S.short); return; }
      const behind = Math.abs(diff) > 2.0 && d < 4.5;
      if (behind && Math.random() < 0.55 && m.lastK !== 'spin') { beginAttack(m, 'spin'); return; }
      if (Math.abs(diff) > 0.55) { m.atkCd = 0.05; return; } // 정면을 맞출 때까지 돌기만 함
      const P = patterns(m).filter(k => k !== m.lastK || Math.random() < 0.25); const near = d < 4 * MSCALE; let k = P[Math.floor(Math.random() * P.length)] || patterns(m)[0];
      if (near && m.sp === 'wolf' && Math.random() < 0.5) k = 'bite'; if (!near && m.sp === 'drake' && Math.random() < 0.6) k = 'leap'; if (!near && m.sp === 'harpy' && Math.random() < 0.5) k = 'dive'; beginAttack(m, k); } return; }
  if (m.ai === 'windup') { const c = m.cur; c.t += dt * sMul; m.state = 'windup'; m.run = 0;
    for (const l of c.list) { if (!l.tele && c.t >= l.delay) { l.tele = makeTele(l.sh, l.dur); c.teles.push(l.tele); }
      if (l.tele && !l.fired) { const p = (c.t - l.delay) / l.dur; setTeleP(l.tele, clamp(p, 0, 1)); if (p >= 1) { l.fired = true; fireShape(m, l.sh, c); killTele(l.tele); c.teles.splice(c.teles.indexOf(l.tele), 1); } } }
    if (c.after?.leap) { const p = clamp(c.t / c.list[0].dur, 0, 1); if (p > 0.55) { m.pos.lerp(c.after.leap, Math.min(1, dt * 7)); m.model.position.y = Math.sin((p - 0.55) / 0.45 * Math.PI) * 2.5; } }
    if (c.list.every(l => l.fired)) { m.model.position.y = 0; m.ai = 'strike'; m.aiT = 0.35; m.state = 'strike'; if (c.after?.dash) { m.dashLeft = c.after.dash; } } return; }
  if (m.ai === 'strike') { m.aiT -= dt; if (m.dashLeft > 0) { const s = Math.min(m.dashLeft, 32 * dt); m.pos.addScaledVector(fwd(m.face), s); m.dashLeft -= s; m.state = 'run'; m.run = 1; }
    if (m.aiT <= 0) { const big = BIG.has(m.cur?.kind); m.ai = 'recover'; m.aiT = (big ? 1.9 : Math.max(0.7, 1.3 - 0.06 * m.lvl)) * (m.enraged ? 0.8 : 1) * (m.weakened ? 1.3 : 1); m.bigOpen = big; m.dashLeft = 0; m.cur = null; if (big) popNum(m.pos, '빈틈!', 'info'); } return; }
  if (m.ai === 'recover') { m.state = m.bigOpen ? 'stun' : 'idle'; m.run = 0; m.aiT -= dt; if (m.aiT <= 0) { m.bigOpen = false; m.ai = 'move'; m.atkCd = rnd(0.4, 1.2) * Math.max(0.5, 1 - 0.07 * m.lvl) * (m.enraged ? 0.7 : 1); } }
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
  if (c.state === 'cover') { if (c.st < c.coverDur) return; c.state = 'idle'; }
  if (c.status.para > 0) { c.state = 'stun'; return; }
  const tgt = nearestMonster(c.pos); if (!tgt) { c.state = 'cheer'; c.run = 0; return; }
  // 위험 회피: 발동 직전 텔레그래프 안이면 이탈 (탱커는 가드)
  for (const t of telegraphs) { if (t.grp.parent && inShape(t.sh, c.pos.x, c.pos.z, 0.5)) { const left = 1 - t.fill.scale.z;
      if (c.role === 'tank') { c.guard = 0.8; c.state = 'guard'; c.run = 0; return; }
      const away = new THREE.Vector3(c.pos.x - t.sh.x, 0, c.pos.z - t.sh.z); if (t.sh.type === 'line' || t.sh.type === 'cone') away.set(Math.cos(t.sh.a), 0, -Math.sin(t.sh.a)).multiplyScalar(((c.id || 1) % 2) ? 1 : -1);
      away.normalize(); c.pos.addScaledVector(away, 5.5 * dt); c.face = Math.atan2(away.x, away.z); c.run = 1; c.state = 'run'; return; } }
  const spdBoost = c.comp.species === 'wolf' ? 1.2 : c.comp.species === 'harpy' ? 1.15 : 1; if (c.comp.species === 'siren') c.hp = Math.min(c.maxHp, c.hp + c.maxHp * 0.005 * dt);
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
// 카메라: 몬헌 나우식 세로 구도 — 헌터 뒤 위쪽에서 몬스터를 화면 중앙 위로, 헌터는 아래쪽. 부드러운 추적, 큰 공격·포효 때 줌아웃
const _cv = new THREE.Vector3(), _lk = new THREE.Vector3();
function updCamera(dt) {
  const p = G.player, port = innerWidth < innerHeight, L = G.lock && alive(G.lock) ? G.lock : null;
  let yaw = p.face, d = 0, big = 1;
  if (L) { yaw = angTo(p.pos, L.pos); d = L.pos.distanceTo(p.pos); big = L.S.scale * MSCALE / 1.8; }
  G.camYaw = lerpAng(G.camYaw, yaw, Math.min(1, dt * (L ? 2.6 : 2.0)));
  const wantZoom = (G.zoomK || 1) * (L && L.ai === 'windup' && BIG.has(L.cur?.kind) ? 1.12 : 1); G.zoom = (G.zoom || 1) + (wantZoom - (G.zoom || 1)) * Math.min(1, dt * 3);
  const dist = (port ? 6.8 : 6.0) + Math.min(5, d * 0.28) + big * 1.2, h = (port ? 5.3 : 3.8) + big * 0.8 + Math.min(2, d * 0.12);
  _cv.copy(p.pos).addScaledVector(fwd(G.camYaw), -dist * G.zoom); _cv.y = h * G.zoom;
  const r = Math.hypot(_cv.x, _cv.z), lim = ARENA + 1.5; if (r > lim) { _cv.x *= lim / r; _cv.z *= lim / r; _cv.y += (r - lim) * 0.6; } // 나무 사이로 들어가지 않게
  G.camPos.lerp(_cv, Math.min(1, dt * 5)); G.camPos.y = Math.max(1.6, G.camPos.y); camera.position.copy(G.camPos);
  if (L) _lk.copy(p.pos).lerp(L.pos, port ? 0.62 : 0.55).setY(0.9 + L.S.scale * MSCALE * (port ? 0.55 : 0.45)); else _lk.copy(p.pos).addScaledVector(fwd(p.face), 2).setY(1.2);
  G.camLook = G.camLook || _lk.clone(); G.camLook.lerp(_lk, Math.min(1, dt * 6)); camera.lookAt(G.camLook);
  if (G.shake > 0 && save.settings.shake) { const k = G.shake * G.shake, t = G.t * 60; camera.rotateZ(Math.sin(t * 1.3) * 0.012 * k); camera.rotateX(Math.sin(t * 1.7 + 1) * 0.02 * k); camera.translateX(Math.sin(t * 2.1) * 0.12 * k); }
  sun.position.set(p.pos.x + 6, 14, p.pos.z + 5); sun.target.position.set(p.pos.x, 0, p.pos.z); // 그림자는 헌터 주변만 (저렴)
}
// 락온 표시 & 약점 강조
const lockMark = new THREE.Mesh(new THREE.RingGeometry(1.1, 1.3, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffe066, transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false })); lockMark.position.y = 0.04; scene.add(lockMark); lockMark.visible = false;
const weakMark = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffd24a, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending })); scene.add(weakMark); weakMark.visible = false;

const STAT_LBL = { burn: '🔥화상', freeze: '❄빙결', para: '⚡마비', soak: '💧약화' };
const lagV = {};
function lagBar(id, v, key) { const el = $(id); if (!el) return; if (lagV[id + 'k'] !== key) { lagV[id] = v; lagV[id + 'k'] = key; } lagV[id] = lagV[id] === undefined || lagV[id] < v ? v : lagV[id] - Math.max(0.002, (lagV[id] - v) * 0.04); el.style.width = (lagV[id] * 100) + '%'; }
function updHud() {
  const p = G.player, m = G.lock || G.monsters[0];
  $('pHp').style.width = (p.hp / p.maxHp * 100) + '%';
  { let g = 0, col = '#ffd54a', lbl = '';
    if (p.wtype === 'ls') { g = p.spirit; col = ['#ddd', '#fff', '#ffe066', '#ff5050'][p.spiritLvl]; lbl = '기력 ' + ['-', '백', '황', '적'][p.spiritLvl]; }
    else if (p.wt.hold === 'charge') { g = (p.chargeLvl || 0) / 3 * 100; col = ['#ffd54a', '#fff', '#ffe066', '#ff5050'][p.chargeLvl || 0]; lbl = p.chargeLvl ? '모으기 ' + p.chargeLvl + '단계' : '모으기'; }
    else if (p.wtype === 'hammer' || p.wtype === 'db') { g = 0; }
    else { g = p.state === 'guard' ? 100 : 0; col = '#7fd8ff'; lbl = p.state === 'guard' ? '가드 중' : '가드'; }
    $('pCharge').style.width = g + '%'; $('pCharge').style.background = col; const gl = $('gLbl'); if (gl && gl._t !== lbl) { gl.textContent = lbl; gl._t = lbl; } }
  $('spRing').firstElementChild.style.strokeDashoffset = 289 * (1 - G.sp / 100); $('bSp').classList.toggle('ready', G.sp >= 100); $('spLbl').textContent = G.sp >= 100 ? '발동!' : Math.floor(G.sp) + '%'; $('pName').textContent = `${heroOf().name} · ${WEAPON_TYPES[p.wtype].n} ${ELEM[p.elem].n}`;
  $('pStatus').innerHTML = Object.keys(p.status).map(k => `<b>${STAT_LBL[k]}</b>`).join('') + (G.buff > 0 ? '<b>공격↑</b>' : '') + (p.wtype === 'ls' ? `<b>기력 ${['-', '백', '황', '적'][p.spiritLvl]}</b>` : '');
  $('timerN').textContent = Math.ceil(G.time); $('timer').style.color = G.time < 20 ? '#ff6a6a' : '#fff';
  lagBar('pHpLag', p.hp / p.maxHp);
  if (m) { const nm = `<span class="lv">Lv${m.lvl}</span><span class="${ELEM[m.elem].c}">${m.S.name}</span> <span class="tag">약점 ${ELEM[m.weak].n}</span>`; if ($('mName')._h !== nm) { $('mName').innerHTML = nm; $('mName')._h = nm; } $('mHp').style.width = (m.hp / m.maxHp * 100) + '%'; lagBar('mHpLag', m.hp / m.maxHp, m);
    $('mParts').innerHTML = m.parts.map(pt => `<span class="${pt.broken ? 'broken' : ''}">${pt.n} ${pt.broken ? '파괴' : Math.ceil(pt.hp / pt.max * 100) + '%'}</span>`).join('');
    $('mStatus').innerHTML = Object.keys(m.status).map(k => `<b>${STAT_LBL[k]}</b>`).join('') + (m.ko > 0 ? `<b>기절 ${Math.round(m.ko / (100 * (1 + 0.5 * (m.koN || 0))) * 100)}%</b>` : '') + (m.ai === 'stun' ? '<b>경직</b>' : '') + (m.ai === 'topple' ? '<b class="hot">다운</b>' : '') + (m.ai === 'recover' ? '<b>틈!</b>' : '') + (m.enraged ? '<b class="rage">분노</b>' : '') + (m.weakened ? '<b>약해짐</b>' : '') + (m.defDown > 0 ? '<b>방어↓</b>' : '') + (m.taunt > 0 ? '<b>도발됨</b>' : ''); }
  G.allies.slice(1).forEach((a, i) => { const el = $('ph' + i); if (el) el.style.width = (a.hp / a.maxHp * 100) + '%'; });
  $('bTarget').style.opacity = G.monsters.filter(alive).length > 1 ? 1 : 0.45;
}
function animEnt(e, T) {
  const s = e.state, a = { state: s, time: T, run: e.run, p: 0, combo: e.combo, heavy: e.heavy, wtype: e.wtype };
  if (s === 'attack') a.p = clamp(e.st / (e.atkDur || 0.4), 0, 1); if (s === 'roll') a.p = clamp(e.st / 0.42, 0, 1); if (s === 'special') a.p = clamp(e.st / e.wt.sp.dur, 0, 1); if (s === 'hit') a.p = clamp(e.st / 0.45, 0, 1); if (s === 'down') a.p = e.st;
  if (s === 'charge') a.lvl = e.chargeLvl + 1;
  if (s === 'roar') a.p = clamp(e.aiT / 1.7, 0, 1); if (s === 'topple') a.p = e.topT || 0; a.flinch = e.flinch || 0; a.limp = !!e.weakened; a.enraged = !!e.enraged; a.hitAt = e.wt?.hitAt;
  if (e.outl) { const wind = s === 'windup', gold = e.goldT > 0; // 몬헌 나우: 공격 직전 붉게 빛남 / 완벽 회피 노란 윤곽
    e.outl.color.setHex(wind ? (Math.sin(T * 20) > 0 ? 0xff1a1a : 0xff6040) : gold ? 0xffd84a : e.enraged ? 0x5a0a10 : 0x1a1020); }
  if (e.glow) { const on = s === 'windup'; e.glow.visible = on; if (on) { e.glow.material.opacity = 0.1 + 0.08 * Math.sin(T * 18); } }
  if (s === 'windup' && e.cur) { a.kind = e.cur.anim; a.p = clamp(e.cur.t / e.cur.list[0].dur, 0, 1); }
  if (e.team === 0 && !e.isPlayer && s === 'attack') a.p = clamp(e.st / 0.4, 0, 1);
  animate(e.model, a); e.model.rotation.y = e.face;
  const flash = e.hitFlash > 0; if (flash !== e._fl) { e._fl = flash; e.model.traverse(o => { if (o.isMesh && (o.userData.om || o.material.isMeshToonMaterial)) { if (!o.userData.om) o.userData.om = o.material; o.material = flash ? hitMat : o.userData.om; } }); }
  if (e.status.freeze > 0 && !e._ice) { e._ice = true; } e.model.userData.rig.body.position.x = e.status.para > 0 ? Math.sin(T * 50) * 0.03 : 0;
}
const hitMat = new THREE.MeshBasicMaterial({ color: 0xffc8c8 });
let last = performance.now(), fpsAcc = 0, fpsN = 0, fps = 60;
function loop(now) {
  requestAnimationFrame(loop); const rawDt = (now - last) / 1000; let dt = Math.min(0.05, rawDt); last = now; fpsAcc += rawDt; fpsN++; if (fpsAcc > 1) { fps = Math.round(fpsN / fpsAcc); fpsAcc = 0; fpsN = 0; }
  if (G) step(dt); else idleScene(dt, now / 1000);
  updParticles(dt); updTrails(dt); fx.update(dt); env.update(dt, now / 1000); autoQuality(rawDt); renderer.render(scene, camera);
}
function step(rdt) {
  const T = performance.now() / 1000; pollInput();
  G.player.goldT = Math.max(0, (G.player.goldT || 0) - rdt);
  if (G.hitstop > 0) { G.hitstop -= rdt; G.allies.concat(G.monsters).forEach(e => animEnt(e, T)); updCamera(rdt); return; }
  let dt = rdt; if (G.slowmo > 0) { G.slowmo -= rdt; dt *= 0.3; }
  G.t += dt; G.shake = Math.max(0, G.shake - rdt * 1.6); G.buff = Math.max(0, G.buff - dt);
  if (!G.over) { G.time -= dt; if (G.time <= 0) { G.time = 0; G.over = true; banner('시간 초과'); setTimeout(() => endHunt(false), 1400); } }
  const p = G.player;
  if (!G.over || alive(p)) updPlayer(p, dt);
  p.pos.addScaledVector(p.vel, dt); p.vel.multiplyScalar(Math.max(0, 1 - dt * 8));
  for (const c of G.allies) { if (c !== p && alive(c)) updComp(c, dt); updStatus(c, dt); c.hitFlash -= dt; }
  for (const m of G.monsters) { if (!G.over || m.ai !== 'down') updMonster(m, dt); updStatus(m, dt); m.hitFlash -= dt; }
  updArrows(dt); separate();
  for (const e of [...G.allies, ...G.monsters]) { e.st += e.isPlayer || e.team === 1 ? 0 : 0; if (e.team === 1) e.st += dt; animEnt(e, T); }
  if (G.lock && alive(G.lock)) { lockMark.visible = true; lockMark.position.x = G.lock.pos.x; lockMark.position.z = G.lock.pos.z; lockMark.scale.setScalar(G.lock.S.scale * (1 + Math.sin(T * 6) * 0.05)); } else lockMark.visible = false;
  const lp = G.lock && alive(G.lock) && G.lock.parts.find(x => !x.broken);
  if (lp) { weakMark.visible = true; weakMark.position.copy(anchorWorld(G.lock, lp)); const k = G.lock.ai === 'stun' || G.lock.ai === 'recover' ? 1.6 : 1; weakMark.scale.setScalar(k * (1 + Math.sin(T * 8) * 0.25)); weakMark.material.opacity = G.lock.ai === 'recover' || G.lock.ai === 'stun' ? 0.8 : 0.4; } else weakMark.visible = false;
  for (const m of G.monsters) if (m.run > 0.6 && Math.random() < 0.18) burst(m.pos.clone().setY(0.08), 0xb89c78, 2, 1.6, 0.4); // 발걸음 먼지
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
  // 보상
  const drops = {}; const add = (k, n) => { drops[k] = (drops[k] || 0) + n; };
  for (const m of mons) { const q = qualOf(m.lvl), dmgR = 1 - m.hp / m.maxHp;
    if (win) { add(`${m.sp}:hide:${q}`, 2 + Math.floor(m.lvl / 2)); for (const pt of m.parts) if (pt.broken) add(`${m.sp}:${pt.key}:${q}`, 1 + (Math.random() < 0.4 ? 1 : 0)); if (Math.random() < 0.5) add(`${m.sp}:${m.parts[0].key}:${q}`, 1); }
    else { if (dmgR > 0.3) add(`${m.sp}:hide:${q}`, 1); for (const pt of m.parts) if (pt.broken) add(`${m.sp}:${pt.key}:${q}`, 1); } }
  // 이미 동료인 종은 정화 대신 보너스 소재
  const purInfo = mons.map(m => { const own = owned(m.sp), q = qualOf(m.lvl);
    if (win && own) { add(`${m.sp}:hide:${q}`, 2); add(`${m.sp}:${m.parts[0].key}:${q}`, sc.total >= PURIFY_NEED ? 2 : 1); }
    return { own, lvlOk: m.lvl >= PURIFY_MIN_LVL, ok: win && !own && sc.total >= PURIFY_NEED && m.lvl >= PURIFY_MIN_LVL && st.broken >= 1 }; });
  const rm = RARITY[node.rar || 0]?.drop || 1; if (win && rm > 1) for (const k in drops) drops[k] = Math.ceil(drops[k] * rm);
  if (win && node.fid && save.field) save.field.cleared.push(node.fid);
  for (const k in drops) addMat(k, drops[k]);
  const xp = win ? 40 + node.lvl * 20 : 15 + node.lvl * 5 + st.broken * 5;
  save.hrXp += xp; let ranked = false; while (save.hrXp >= save.hr * 100) { save.hrXp -= save.hr * 100; save.hr++; ranked = true; }
  const compXp = win ? 30 : 12; save.party.forEach(id => { const c = save.comps.find(x => x.id === id); if (c) { c.xp = (c.xp || 0) + compXp; while (c.xp >= c.level * 60 && c.level < 10 + c.potential * 4) { c.xp -= c.level * 60; c.level++; } } });
  save.party.forEach(id => { const c = save.comps.find(x => x.id === id); if (c) save.bond[c.species] = (save.bond[c.species] || 0) + (win ? 2 : 1); });
  save.stats.hunts++; if (win) save.stats.wins++; else save.stats.fails++;
  for (const m of mons) { const cd = save.codex[m.sp] = save.codex[m.sp] || { seen: 0, won: 0, maxLvl: 0 }; cd.seen++; if (win) { cd.won++; cd.maxLvl = Math.max(cd.maxLvl, m.lvl); } }
  persist();
  lastResult = { win, sc, need: PURIFY_NEED, canPurify: purInfo.some(x => x.ok), purInfo, drops, xp, ranked, mons: mons.map(m => ({ sp: m.sp, lvl: m.lvl })), st, purified: false };
  setTimeout(() => { teardown(); showResult(); }, 400);
}
function teardown() { if (!G) return; clearArrows(); touches.clear(); input.mx = input.mz = 0; input.dodgeBuf = null; input.tapBuf = -9; $('stick').style.opacity = 0; [...G.allies, ...G.monsters].forEach(e => scene.remove(e.model)); [...telegraphs].forEach(killTele); G = null; $('hud').classList.add('hidden'); lockMark.visible = weakMark.visible = false; setRing(0); input.atkDown = false; }

// ───────── UI 화면 ─────────
const uiEl = $('ui');
function ui(html, cls = '') { uiEl.innerHTML = html; uiEl.className = cls; }
const S_ = SPECIES;
// 2D 그림이 없는 종은 3D 모델을 찍어 초상화로 사용
const portraitCache = {}; let pRend = null;
function spImg(sp) { const S = S_[sp]; if (S.img) return S.img; if (portraitCache[sp]) return portraitCache[sp];
  try { pRend = pRend || new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true }); pRend.setSize(180, 240, false); pRend.outputColorSpace = THREE.SRGBColorSpace;
    const sc = new THREE.Scene(); sc.background = new THREE.Color(new THREE.Color(ELEM[S.elem].col).multiplyScalar(0.35)); sc.add(new THREE.HemisphereLight(0xfff4e8, 0x5a6a4a, 1.8)); const dl = new THREE.DirectionalLight(0xffffff, 1.4); dl.position.set(2, 3, 4); sc.add(dl);
    const g = buildGirl(Object.assign({}, S.look, { scale: 1 })); sc.add(g); animate(g, { state: 'idle', time: 1, run: 0 }); g.rotation.y = 0.35;
    const cam = new THREE.PerspectiveCamera(32, 0.75, 0.1, 20); cam.position.set(0, 1.35, 2.7); cam.lookAt(0, 1.15, 0); pRend.render(sc, cam); portraitCache[sp] = pRend.domElement.toDataURL('image/jpeg', 0.85);
  } catch { portraitCache[sp] = 'icon-192.png'; } return portraitCache[sp]; }
const owned = (sp) => save.comps.some(c => c.species === sp);
const PURIFY_NEED = 70, PURIFY_MIN_LVL = 2;
let forgeType = 'sns';
let tab = 'hunt';
function genNodes() { const hr = save.hr, nodes = []; const sps = Object.keys(S_);
  for (let i = 0; i < 4; i++) { const lvl = Math.max(1, hr + [-1, 0, 0, 1][i] + (i === 3 ? Math.floor(hr / 3) : 0)); const multi = lvl >= 3 && i === 3;
    const off = Math.floor(Math.random() * sps.length), mons = [{ sp: sps[(i + off) % sps.length], lvl }]; if (multi) mons.push({ sp: sps[(i + off + 1) % sps.length], lvl: Math.max(1, lvl - 1) }); nodes.push({ id: i, lvl, mons }); }
  return nodes; }
// ── v5 필드: 지역 3곳 × 하루 단위 출현(+새로 찾기 3회), 몬스터 Lv·희귀도, 채집 포인트. DOM 지도라 3D 부하 없음
const REGIONS = { meadow: { n: '바람 초원', sp: ['wolf', 'harpy', 'kitsune', 'drake'], bg: 'meadow' }, snow: { n: '서리 고원', sp: ['witch', 'drake', 'harpy', 'wolf'], bg: 'snow' }, coast: { n: '산호 해안', sp: ['siren', 'kitsune', 'witch', 'wolf'], bg: 'coast' } };
const RARITY = [{ n: '일반', c: 'r0', lv: 0, drop: 1 }, { n: '희귀', c: 'r1', lv: 1, drop: 1.5 }, { n: '전설', c: 'r2', lv: 2, drop: 2 }];
const GATHER = { meadow: ['약초 덤불', '광맥', '뼈 무더기'], snow: ['얼음 결정', '광맥', '서리꽃'], coast: ['조개 무더기', '산호초', '유목'] };
const MAX_REFRESH = 3;
function seeded(str) { let h = 1779033703 ^ str.length; for (let i = 0; i < str.length; i++) { h = Math.imul(h ^ str.charCodeAt(i), 3432918353); h = h << 13 | h >>> 19; } return () => { h = Math.imul(h ^ h >>> 16, 2246822507); h = Math.imul(h ^ h >>> 13, 3266489909); return ((h ^= h >>> 16) >>> 0) / 4294967296; }; }
const today = () => { const d = new Date(); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; };
function fieldState() { const f = save.field; if (!f || f.day !== today()) save.field = { day: today(), region: f?.region || 'meadow', refresh: 0, cleared: [], gathered: [] }; return save.field; }
function genField(reg) { const f = fieldState(), R = seeded(`${f.day}|${reg}|${f.refresh}`), hr = save.hr, out = [], pos = [[22, 24], [70, 20], [48, 46], [18, 66], [76, 62]];
  for (let i = 0; i < 5; i++) { const rr = R(), rar = rr > 0.93 ? 2 : rr > 0.7 ? 1 : 0, sp = REGIONS[reg].sp[Math.floor(R() * 4)];
    const lvl = Math.max(1, hr + [-1, 0, 0, 1, 1][i] + RARITY[rar].lv); const mons = [{ sp, lvl }]; if (rar === 2 && lvl >= 3) mons.push({ sp: REGIONS[reg].sp[(REGIONS[reg].sp.indexOf(sp) + 1) % 4], lvl: lvl - 1 });
    out.push({ id: i, fid: `${reg}:${f.refresh}:${i}`, lvl, mons, rar, x: pos[i][0] + (R() * 8 - 4), y: pos[i][1] + (R() * 8 - 4) }); }
  const gp = GATHER[reg].map((n, i) => ({ gid: `${reg}:${f.refresh}:g${i}`, n, x: [40, 86, 10][i], y: [80, 40, 40][i] }));
  return { mons: out.filter(n => !f.cleared.includes(n.fid)), gp: gp.filter(g => !f.gathered.includes(g.gid)) }; }
let fieldSel = null;
function fieldBody(w, a) { const f = fieldState(), reg = f.region, F = genField(reg); save.nodes = F.mons;
  const regs = Object.entries(REGIONS).map(([k, r]) => `<button class="btn sm ${reg === k ? '' : 'alt'}" data-freg="${k}">${r.n}</button>`).join('');
  const mk = F.mons.map((n, i) => { const m = n.mons[0], S = S_[m.sp]; return `<button class="fmon ${RARITY[n.rar].c} ${fieldSel === i ? 'sel' : ''}" data-fmon="${i}" style="left:${n.x}%;top:${n.y}%"><img src="${spImg(m.sp)}" alt=""><span>Lv${n.lvl}${n.rar ? ' ' + '★'.repeat(n.rar) : ''}</span></button>`; }).join('');
  const gp = F.gp.map(g => `<button class="fgath" data-fgath="${g.gid}" style="left:${g.x}%;top:${g.y}%">✦<span>${g.n}</span></button>`).join('');
  const sel = fieldSel != null && F.mons[fieldSel]; let info = `<div class="finfo note">몬스터를 탭하면 사냥 정보가 떠요. ✦ 채집 포인트는 탭하면 소재를 얻어요. 출현은 매일 바뀌어요(새로 찾기 ${MAX_REFRESH - f.refresh}회 남음).</div>`;
  if (sel) { const n = sel; info = `<div class="finfo"><div><b>${n.mons.map(m => `<span class="${ELEM[S_[m.sp].elem].c}">${S_[m.sp].name}</span> Lv${m.lvl}`).join(' + ')}</b><br><span class="tag ${RARITY[n.rar].c}">${RARITY[n.rar].n}${n.rar ? ' · 소재 ×' + RARITY[n.rar].drop : ''}</span><span class="tag">약점 ${n.mons.map(m => ELEM[S_[m.sp].weak].n).join('/')}</span>${n.mons.map(m => owned(m.sp) ? '<span class="tag">동료 보유</span>' : m.lvl >= PURIFY_MIN_LVL ? '<span class="tag pur">정화 가능 Lv</span>' : '<span class="tag">Lv1 정화 불가</span>').join('')}</div><button class="btn" data-fgo="${fieldSel}">사냥 시작</button></div>`; }
  return `<div class="note">HR <b>${save.hr}</b> · ${save.hrXp}/${save.hr * 100} · ${WEAPON_TYPES[w.type].n}(${ELEM[w.elem].n}) +${w.lvl} · 방어 ${armorDef(a)}</div><div class="tabs">${regs}</div>
    <div id="fieldMap" class="fmap ${REGIONS[reg].bg}">${gp}${mk}<div class="fme">🧭</div></div>${info}
    <div class="row"><button class="btn alt sm ${f.refresh >= MAX_REFRESH ? 'dis' : ''}" data-act="reroll">새로 찾기</button><span class="note">조작: 드래그=이동 · 탭=공격 · 휙=회피 · 길게=${holdName(w.type)}</span></div>`; }
const heroOf = () => HEROES.find(h => h.id === save.hero) || HEROES[0];
const hName = (t) => t.replaceAll('{h}', heroOf().name);
let opIdx = 0, opReplay = false;
function openingScreen() { const o = OPENING[opIdx];
  ui(`<div class="op"><div class="opdots">${OPENING.map((_, i) => `<i class="${i === opIdx ? 'on' : ''}"></i>`).join('')}</div><h1>${o.t}</h1><p>${o.s}</p>
    <div class="row"><button class="btn alt sm" data-op="skip">건너뛰기</button><button class="btn" data-op="next">${opIdx < OPENING.length - 1 ? '다음' : '시작하기'}</button></div></div>`, 'village gear op-wrap'); }
let heroSel = null;
function heroScreen() { const h = HEROES.find(x => x.id === heroSel);
  ui(`<h1>주인공 선택</h1><p class="note">${save.stats.hunts ? '기존 기록은 그대로예요. 이야기를 함께할 사냥꾼을 한 번만 골라 주세요.' : '정화의 사냥꾼이 될 사람을 골라 주세요.'} 능력치 차이는 없어요.</p>
    <div class="herolist">${HEROES.map(x => `<button class="hero-c ${heroSel === x.id ? 'on' : ''}" data-hero="${x.id}"><span class="hdot" style="background:#${x.look.hair.toString(16).padStart(6, '0')};border-color:#${x.look.cloth2.toString(16).padStart(6, '0')}"></span><span><b>${x.name}</b> <span class="note">${x.age}세 · ${x.tag}</span><br><span class="note">${x.motive}</span></span></button>`).join('')}</div>
    <div class="finfo">${h ? `<span>"${h.line}"</span>` : '<span class="note">카드를 탭하면 한마디를 들을 수 있어요.</span>'}<button class="btn ${h ? '' : 'dis'}" data-act="heroOk">결정</button></div>`, 'village gear'); }
function beatScreen(b) { ui(`<div class="op"><div class="note">메인 스토리 · HR ${b.hr}</div><h1>${b.t}</h1><p>${hName(b.s)}</p><div class="row"><button class="btn" data-beat="${b.hr}">확인</button></div></div>`, 'village gear op-wrap'); }
function loreScreen() { ui(`<h1>${LORE.title}</h1><div class="storytext">${LORE.body.map(p => `<p>${p}</p>`).join('')}</div><div class="row"><button class="btn sm alt" data-act="village">← 돌아가기</button></div>`, 'village gear'); }
function village() {
  if (!save.opened) { openingScreen(); return; }
  if (!save.hero) { heroScreen(); return; }
  const beat = BEATS.find(b => save.hr >= b.hr && !(save.beats || []).includes(b.hr)); if (beat && !G) { beatScreen(beat); return; }
  clearIdle(); if (!G) idleScene(0, 0);
  if (!save.nodes) { save.nodes = genNodes(); persist(); }
  const w = weaponById(save.equip.weapon), a = armorById(save.equip.armor);
  const tabs = [['hunt', '사냥'], ['forge', '대장간'], ['party', '동료'], ['codex', '도감'], ['set', '설정']].map(([k, n]) => `<button class="btn sm ${tab === k ? '' : 'alt'}" data-tab="${k}">${n}</button>`).join('');
  let body = '';
  if (tab === 'hunt') { body = fieldBody(w, a);
  } else if (tab === 'forge') {
    const types = WEAPON_ORDER.map(t => `<button class="btn sm ${forgeType === t ? '' : 'alt'}" data-ftype="${t}">${WEAPON_TYPES[t].icon} ${WEAPON_TYPES[t].n}</button>`).join('');
    const WT = WEAPON_TYPES[forgeType];
    body = `<h2>무기 (7종)</h2><div class="tabs">${types}</div><div class="note"><b>${WT.n}</b> · ${WT.desc}<br>특수기: <b>${WT.sp.n}</b></div>` + save.weapons.filter(x => x.type === forgeType).map(x => { const cost = 2 + x.lvl, sp = x.elem === 'none' ? null : ELEM_SRC[x.elem];
      const can = sp ? matPoints(sp, 'hide') >= cost : Object.keys(S_).some(s => matPoints(s, 'hide') >= cost);
      return `<div class="card"><div class="t"><b>${WEAPON_TYPES[x.type].n} · <span class="${ELEM[x.elem].c}">${ELEM[x.elem].n}</span> +${x.lvl}</b> ${save.equip.weapon === x.id ? '<span class="tag">장착 중</span>' : ''}<br>공격력 ${weaponAtk(x)} → ${weaponAtk({ ...x, lvl: x.lvl + 1 })}<br><span class="note">강화: ${sp ? S_[sp].short : '아무'} 가죽 ${cost}점</span></div>
      <div class="row" style="flex-direction:column"><button class="btn sm ${save.equip.weapon === x.id ? 'dis' : ''}" data-eqw="${x.id}">장착</button><button class="btn sm alt ${can && x.lvl < 15 ? '' : 'dis'}" data-upw="${x.id}">강화</button></div></div>`; }).join('') +
      `<h2>속성 ${WT.n} 제작</h2>` + Object.entries(ELEM_SRC).map(([el, sp]) => { const t = forgeType; const have = save.weapons.some(x => x.type === t && x.elem === el); const can = matPoints(sp, 'hide') >= 3 && partPoints(sp) >= 1;
        return `<div class="card"><div class="t"><b class="${ELEM[el].c}">${ELEM[el].n} ${WEAPON_TYPES[t].n}</b><br><span class="note">${S_[sp].short} 가죽 3점 + 부위 소재 1점 · ${ELEM[el].n} 약점 몬스터에 피해 +35%, ${STATUS[el].n} 부여</span></div><button class="btn sm ${have || !can ? 'dis' : ''}" data-craft="${t}:${el}">${have ? '보유' : '제작'}</button></div>`; }).join('') +
      `<h2>방어구</h2>` + save.armors.map(x => { const sp = x.sp === 'none' ? null : x.sp, cost = 2 + x.lvl; const can = sp ? matPoints(sp, 'hide') >= cost : Object.keys(S_).some(s => matPoints(s, 'hide') >= cost);
        return `<div class="card"><div class="t"><b>${sp ? S_[sp].short + '의 갑옷' : '견습 헌터복'} +${x.lvl}</b> ${save.equip.armor === x.id ? '<span class="tag">장착 중</span>' : ''}<br>방어 ${armorDef(x)} → ${armorDef({ ...x, lvl: x.lvl + 1 })} (받는 피해 ${Math.round((1 - defMul(armorDef(x))) * 100)}% 감소)</div>
        <div class="row" style="flex-direction:column"><button class="btn sm ${save.equip.armor === x.id ? 'dis' : ''}" data-eqa="${x.id}">장착</button><button class="btn sm alt ${can && x.lvl < 15 ? '' : 'dis'}" data-upa="${x.id}">강화</button></div></div>`; }).join('') +
      Object.keys(S_).filter(sp => !save.armors.some(x => x.sp === sp)).map(sp => `<div class="card"><div class="t"><b>${S_[sp].short}의 갑옷 제작</b><br><span class="note">가죽 4점 + 부위 소재 2점</span></div><button class="btn sm ${matPoints(sp, 'hide') >= 4 && partPoints(sp) >= 2 ? '' : 'dis'}" data-crafta="${sp}">제작</button></div>`).join('') +
      `<h2>소재함</h2><div class="note">${Object.entries(save.mats).filter(([, n]) => n > 0).map(([k, n]) => `${matName(k)} ×${n}`).join('<br>') || '아직 소재가 없어요. 사냥을 떠나 보세요!'}</div><p class="note">품질 점수: 하급 1 · 중급 2 · 상급 3 (Lv3+ 몬스터는 중급, Lv5+는 상급 소재)</p>`;
  } else if (tab === 'party') {
    body = `<p class="note">사냥에 최대 3명 동행. 정화한 몬스터 소녀가 동료가 됩니다. 내가 만든 장비를 동료에게도 장착할 수 있어요(공유).</p>` + `<p class="note">동료 수집 <b>${save.comps.length}/${Object.keys(S_).length}종</b> · 같은 종은 한 명만 영입할 수 있어요.</p>` + (save.comps.length ? save.comps.map(c => { const st = compStats(c), inP = save.party.includes(c.id), w = weaponById(c.weapon), S = S_[c.species];
      return `<div class="card"><img src="${spImg(c.species)}" style="filter:hue-rotate(${c.hueDeg}deg)" alt=""><div class="t"><b>${c.name}</b> <span class="tag">${ROLES[c.role]}</span><span class="tag">${S.short} 계열</span><br>Lv${c.level} · 잠재력 ${'★'.repeat(c.potential)} · HP ${st.hp} 공격 ${st.atk}<br><span class="note">특성: ${S.trait.n}(${S.trait.d}) · ${ROLE_DESC[c.role]} · 장식: ${ACCS[c.acc].n}<br>무기: ${w ? WEAPON_TYPES[w.type].n + ' ' + ELEM[w.elem].n + ' +' + w.lvl : '없음'}</span></div>
      <div class="row" style="flex-direction:column"><button class="btn sm ${inP ? '' : 'alt'}" data-party="${c.id}">${inP ? '편성 해제' : '편성'}</button><button class="btn sm alt" data-cw="${c.id}">무기 변경</button><button class="btn sm" data-cgear="${c.id}">장비</button><button class="btn sm alt" data-story="${c.id}">스토리</button></div></div>`; }).join('') : '<p>아직 동료가 없어요. 결과 화면에서 정화 점수가 기준을 넘으면 몬스터 소녀를 정화해 동료로 맞이할 수 있어요.</p>');
  } else if (tab === 'codex') {
    body = Object.entries(S_).map(([k, S]) => { const c = save.codex[k]; return `<div class="card"><img src="${spImg(k)}" alt=""><div class="t"><b class="${ELEM[S.elem].c}">${S.name}</b> ${owned(k) ? '<span class="tag pur">동료</span>' : ''}<br>${c ? `조우 ${c.seen} · 토벌 ${c.won} · 최고 Lv${c.maxLvl}<br><span class="note">약점 ${ELEM[S.weak].n} · 부위: ${S.parts.map(p => p.n).join(', ')} · 역할 후보: ${S.roles.map(r => ROLES[r]).join('/')}</span>` : '<span class="note">미조우</span>'}</div></div>`; }).join('') +
      `<p class="note">사냥 ${save.stats.hunts} · 성공 ${save.stats.wins} · 실패 ${save.stats.fails} · 정화 ${save.stats.purified}</p>`;
  } else {
    const t = (k, n) => `<button class="btn sm ${save.settings[k] ? '' : 'alt'}" data-tog="${k}">${n}: ${save.settings[k] ? '켬' : '끔'}</button>`;
    body = `<h2>효과</h2><div class="row">${t('sound', '효과음')}${t('vib', '진동')}${t('shake', '화면 흔들림')}</div><h2>화질</h2><div class="row">${[['auto', '자동'], ['high', '높음'], ['mid', '중간'], ['low', '낮음']].map(([k, n]) => `<button class="btn sm ${save.settings.quality === k ? '' : 'alt'}" data-q="${k}">${n}</button>`).join('')}</div><p class="note">자동: 사냥 중 프레임이 떨어지면 해상도·그림자·풀숲을 단계적으로 줄여요. 지금 단계: ${['낮음', '중간', '높음'][qLevel]}</p><h2>조작</h2><div class="row">${t('dodgeBtn', '회피 버튼 표시')}${t('hint', '조작 안내')}${t('dlg', '동료 대사')}</div><p class="note">회피는 기본적으로 화면을 휙 밀어서 해요. 버튼이 편하면 회피 버튼을 켜세요(왼쪽 아래).</p>
      <h2>이야기</h2><div class="row"><button class="btn sm alt" data-act="replayOp">오프닝 다시 보기</button><button class="btn sm alt" data-act="lore">세계관</button></div><p class="note">주인공: ${heroOf().name} — ${heroOf().motive}</p><h2>저장</h2><p class="note"><b>이 기기에만 저장 · 클라우드 동기화 없음.</b> 플레이 중 자동 저장돼요. 다른 기기로 옮기려면 백업 파일을 내보낸 뒤 그 기기에서 가져오세요.<br>저장 형식 v${save.v} · ${saveStatus}</p>
      <div class="row"><button class="btn sm" data-act="export">백업 내보내기</button><button class="btn sm alt" data-act="import">백업 가져오기</button><button class="btn sm alt" data-act="reset">기록 초기화</button></div><input type="file" id="impFile" accept="application/json,.json" class="hidden">
      <p class="note">설치: 브라우저 메뉴의 "홈 화면에 추가"로 앱처럼 실행할 수 있어요 (오프라인 지원).</p>`;
  }
  const notice = save.notice ? `<div class="card notice"><div class="t"><b>알림</b><br>${save.notice}</div><button class="btn sm" data-act="ack">확인</button></div>` : '';
  ui(`<img class="hero" src="img/gallery_g_party.webp" alt="" style="max-height:110px"><h1>헌트 나우 <span class="note">정화의 사냥꾼</span></h1>${notice}<div class="tabs">${tabs}</div>${body}`, 'village');
}
let gearComp = null, gearSlot = 'body';
function gearScreen() {
  const c = save.comps.find(x => x.id === gearComp); if (!c) { tab = 'party'; village(); return; } c.gear = c.gear || {};
  const cur = compStats(c), S = S_[c.species], sc = setCount(c);
  const slots = Object.entries(GSLOTS).map(([k, o]) => { const g = gearById(c.gear[k]); return `<button class="gslot ${gearSlot === k ? 'on' : ''}" data-gslot="${k}"><span>${o.icon} ${o.n}</span><b>${g ? gearName(g) : '비어 있음'}</b></button>`; }).join('');
  const diff = (a, b) => b === a ? `${a}` : `${a} → <b class="${b > a ? 'up' : 'down'}">${b}</b>`;
  const opts = Object.keys(S_).map(sp => { const g = save.cgear.find(x => x.sp === sp && x.slot === gearSlot); const eq = g && c.gear[gearSlot] === g.id;
    const usedBy = g && save.comps.find(o => o.id !== c.id && o.gear && o.gear[gearSlot] === g.id);
    const nm = GPIECE[sp][Object.keys(GSLOTS).indexOf(gearSlot)];
    if (!g) { const can = matPoints(sp, 'hide') >= 3 && partPoints(sp) >= 1; const known = save.codex[sp]?.won;
      return known ? `<div class="grow"><span><b>${nm}</b><br><span class="note">${S_[sp].short} 가죽 3 + 부위 1</span></span><button class="btn sm ${can ? '' : 'dis'}" data-gcraft="${sp}">제작</button></div>` : ''; }
    const tryMap = Object.assign({}, c.gear, { [gearSlot]: g.id }), nx = compStats(c, tryMap), cost = gearCost(g.lvl);
    const canUp = g.lvl < 5 && matPoints(sp, 'hide') >= cost.hide && partPoints(sp) >= cost.part; const up = gearStat({ ...g, lvl: g.lvl + 1 }), now = gearStat(g);
    return `<div class="grow ${eq ? 'eq' : ''}"><span><b>${gearName(g)}</b>${sp === c.species ? ' <span class="tag pur">세트</span>' : ''}${usedBy ? ` <span class="tag">${usedBy.name} 착용</span>` : ''}<br><span class="note">${eq ? '장착 중' : `HP ${diff(cur.hp, nx.hp)} · 공격 ${diff(cur.atk, nx.atk)} · 방어 ${diff(Math.round(cur.def), Math.round(nx.def))}`}${g.lvl < 5 ? `<br>강화 +${g.lvl + 1}: HP +${up.hp - now.hp} 방어 +${up.def - now.def} (가죽 ${cost.hide}·부위 ${cost.part})` : '<br>최대 강화'}</span></span>
      <span class="col"><button class="btn sm ${eq ? 'alt' : ''}" data-gequip="${g.id}">${eq ? '해제' : '장착'}</button><button class="btn sm alt ${canUp ? '' : 'dis'}" data-gup="${g.id}">강화</button></span></div>`; }).join('') || '<p class="note">아직 토벌한 몬스터가 없어 만들 수 있는 방어구가 없어요.</p>';
  ui(`<div class="gearhd"><img src="${spImg(c.species)}" style="filter:hue-rotate(${c.hueDeg}deg)" alt=""><div><b>${c.name}</b> <span class="tag">${S.short} 계열</span><br>HP <b>${cur.hp}</b> · 공격 <b>${cur.atk}</b> · 방어 <b>${Math.round(cur.def)}</b><br><span class="note">${S.short} 세트 ${sc}/3 · 2부위 공격 +10%${sc >= 2 ? '✔' : ''} · 3부위 HP +15%·${SETB[c.species]}${sc >= 3 ? '✔' : ''}</span></div></div>
    <div class="gslots">${slots}</div><div class="glist">${opts}</div>
    <div class="row"><button class="btn sm alt" data-act="gback">← 동료</button></div>`, 'village gear');
}
let storyComp = null, storyChap = null;
// 이름 뒤 조사를 받침에 맞춤: {n}은/는, 이/가, 을/를, 과/와
function josaName(txt, nm) { const code = nm.charCodeAt(nm.length - 1) - 0xac00, jong = code >= 0 && code <= 11171 && code % 28 > 0;
  const P = { 은: ['은', '는'], 는: ['은', '는'], 이: ['이', '가'], 가: ['이', '가'], 을: ['을', '를'], 를: ['을', '를'], 과: ['과', '와'], 와: ['과', '와'] };
  return txt.replace(/\{n\}(은|는|이|가|을|를|과|와)?/g, (_, j) => nm + (j ? P[j][jong ? 0 : 1] : '')); }
const chapOpen = (c, i) => { const u = STORY_UNLOCK[i], b = save.bond[c.species] || 0; return b >= u.bond || c.level >= u.lvl; };
function storyScreen() { const c = save.comps.find(x => x.id === storyComp); if (!c) { tab = 'party'; village(); return; } const S = S_[c.species], ch = STORIES[c.species], b = save.bond[c.species] || 0;
  const list = ch.map((x, i) => { const open = chapOpen(c, i), u = STORY_UNLOCK[i]; return `<button class="btn sm ${storyChap === i ? '' : 'alt'} ${open ? '' : 'dis'}" data-chap="${i}">${i + 1}장 ${open ? x.t : '🔒 인연 ' + u.bond + ' 또는 Lv' + u.lvl}</button>`; }).join('');
  const body = storyChap != null && chapOpen(c, storyChap) ? `<div class="storytext"><h2>${storyChap + 1}장 · ${ch[storyChap].t}</h2>${josaName(ch[storyChap].b, c.name).split('\n').map(l => `<p>${l}</p>`).join('')}</div>` : `<div class="storytext note">장을 골라 주세요. 인연은 ${josaName('{n}과', c.name)} 함께 사냥할 때마다 올라가요(성공 +2, 실패 +1).</div>`;
  ui(`<div class="gearhd"><img src="${spImg(c.species)}" style="filter:hue-rotate(${c.hueDeg}deg)" alt=""><div><b>${c.name}의 이야기</b><br><span class="note">${S.short} 계열 · Lv${c.level} · 인연 ${b}</span></div></div><div class="tabs schap">${list}</div>${body}<div class="row"><button class="btn sm alt" data-act="gback">← 동료</button></div>`, 'village gear story');
}
function showResult() {
  const r = lastResult, sc = r.sc, m0 = r.mons[0], S = S_[m0.sp]; S.img2 = spImg(m0.sp);
  const rows = [['남은 시간', sc.time, 20], ['남은 체력', sc.hp, 20], ['부위 파괴', sc.parts, 30], ['피격 횟수 (' + r.st.hits + '회)', sc.hits, 15], ['속성 상성', sc.elem, 15]];
  const purifyBlock = !r.win ? `<p>사냥 실패. 그래도 <b>경험치 +${r.xp}</b>${Object.keys(r.drops).length ? '와 일부 소재' : ''}를 얻었어요. 다음엔 붉은 범위가 노랗게 차오를 때 회피해 보세요.</p>` :
    r.purified ? `<p class="big">✨ ${r.purified} 정화 성공!</p><p class="note">${PURIFY_SCENE[r.purSp]}</p><p>${r.purified}: "${S_[r.purSp].lines.purify}"</p>` :
    (r.mons.map((m, i) => { const pi = r.purInfo[i], Sm = S_[m.sp];
      if (pi.own) return `<p>✔ <b>${Sm.short}</b>는 이미 동료예요. 정화 대신 <b>보너스 소재</b>를 받았어요.</p><p class="note">${PURIFY_FAIL.own}</p>`;
      if (pi.ok) return `<p class="big">${Sm.short} 정화 가능!</p><p class="note">종마다 단 한 명만 영입할 수 있어요. 역할을 고르세요.</p><div class="row">${Sm.roles.map(ro => `<button class="btn" data-pur="${i}:${ro}">${Sm.short} → ${ROLES[ro]}</button>`).join('')}</div>`;
      const why = [sc.total < r.need ? `점수 ${sc.total}/${r.need}` : '', !pi.lvlOk ? `Lv${PURIFY_MIN_LVL} 이상 필요(지금 Lv${m.lvl})` : '', r.st.broken < 1 ? '부위 파괴 1곳 이상 필요' : ''].filter(Boolean).join(' · ');
      const fl = !pi.lvlOk ? PURIFY_FAIL.lvl : r.st.broken < 1 ? PURIFY_FAIL.part : PURIFY_FAIL.score; return `<p>${Sm.short} 정화 불가 — ${why}.</p><p class="note">${heroOf().name}: "${fl}"</p>`; }).join(''));
  ui(`<div class="card"><img src="${S.img2}" alt="" style="width:90px;height:120px"><div class="t"><h1>${r.win ? '토벌 성공!' : '사냥 실패'}</h1>"${r.win ? S.lines.win : S.lines.lose}"</div></div>
    <h2>정화 판정 (전투 결과 기준)</h2><table class="score">${rows.map(([n, v, mx]) => `<tr><td>${n}</td><td><b>${v}</b> / ${mx}</td></tr>`).join('')}<tr><td><b>합계</b></td><td class="big">${sc.total} <span class="note">/ 기준 ${r.need}</span></td></tr></table><p class="note">정화 조건: 점수 ${r.need}점 이상 + 몬스터 Lv${PURIFY_MIN_LVL} 이상 + 부위 파괴 1곳 이상 + 아직 없는 종</p>
    ${purifyBlock}
    <h2>획득</h2><div class="note">${Object.entries(r.drops).map(([k, n]) => `${matName(k)} ×${n}`).join('<br>') || '소재 없음'}<br>헌터 경험치 +${r.xp}${r.ranked ? ` · <b>HR ${save.hr} 달성!</b>` : ''} · 완벽 회피 ${r.st.perfect}회 · 부위 파괴 ${r.st.broken}</div>
    <div class="row" style="margin-top:12px"><button class="btn" data-act="village">마을로</button></div>`);
}
function purify(i, role) {
  const r = lastResult; if (!r.canPurify || r.purified || !r.purInfo[i]?.ok) return; const m = r.mons[i], S = S_[m.sp];
  if (owned(m.sp)) { r.canPurify = false; showResult(); return; } // 중복 영입 방지
  const used = new Set(save.comps.map(c => c.name)), free = NAMES.filter(n => !used.has(n)); const name = free[Math.floor(Math.random() * free.length)] || '이름없는 ' + S.short;
  const potential = clamp(Math.ceil(m.lvl / 2) + (r.sc.total >= 85 ? 1 : 0), 1, 5); const hueDeg = Math.round(rnd(30, 300));
  const hair = new THREE.Color(S.look.hair).offsetHSL(hueDeg / 360, 0, 0).getHex();
  const c = { id: newId('c'), name, species: m.sp, role, level: m.lvl, potential, hueDeg, hair, acc: save.comps.length % ACCS.length, weapon: null, armor: null, xp: 0 };
  save.comps.push(c); if (save.party.length < 3) save.party.push(c.id); save.stats.purified++; r.purified = name; r.purSp = m.sp; r.canPurify = false; persist(); sfx('win'); showResult();
}
uiEl.addEventListener('click', (e) => {
  const b = e.target.closest('button'); if (!b) return; const d = b.dataset;
  if (b.classList.contains('dis')) return;
  if (d.tab) { tab = d.tab; village(); return; }
  if (d.op) { if (d.op === 'next' && opIdx < OPENING.length - 1) { opIdx++; openingScreen(); return; } opIdx = 0; save.opened = true; persist(); village(); return; }
  if (d.hero) { heroSel = d.hero; heroScreen(); return; }
  if (d.act === 'heroOk') { if (!heroSel) return; save.hero = heroSel; persist(); village(); return; }
  if (d.beat) { save.beats = save.beats || []; save.beats.push(+d.beat); persist(); village(); return; }
  if (d.act === 'replayOp') { opIdx = 0; save.opened = false; village(); return; }
  if (d.act === 'lore') { loreScreen(); return; }
  if (d.story) { storyComp = d.story; storyChap = null; storyScreen(); return; }
  if (d.chap !== undefined) { storyChap = +d.chap; storyScreen(); return; }
  if (d.cgear) { gearComp = d.cgear; gearScreen(); return; }
  if (d.gslot) { gearSlot = d.gslot; gearScreen(); return; }
  if (d.act === 'gback') { tab = 'party'; village(); return; }
  if (d.gcraft || d.gequip || d.gup) { const c = save.comps.find(x => x.id === gearComp); c.gear = c.gear || {};
    if (d.gcraft) { const sp = d.gcraft; spendPoints(sp, 'hide', 3); spendPartPoints(sp, 1); const g = { id: newId('g'), sp, slot: gearSlot, lvl: 1 }; save.cgear.push(g); c.gear[gearSlot] = g.id; sfx('win'); }
    if (d.gequip) { if (c.gear[gearSlot] === d.gequip) delete c.gear[gearSlot]; else { save.comps.forEach(o => { if (o.gear && o.gear[gearSlot] === d.gequip) delete o.gear[gearSlot]; }); c.gear[gearSlot] = d.gequip; } }
    if (d.gup) { const g = gearById(d.gup), cost = gearCost(g.lvl); spendPoints(g.sp, 'hide', cost.hide); spendPartPoints(g.sp, cost.part); g.lvl++; sfx('brk'); }
    persist(); gearScreen(); return; }
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
  if (d.q) { save.settings.quality = d.q; qRaised = false; delete save.qAuto; applyQuality(qualityFromSetting()); }
  if (d.act === 'reroll') { const f = fieldState(); if (f.refresh < MAX_REFRESH) { f.refresh++; fieldSel = null; } }
  if (d.freg) { fieldState().region = d.freg; fieldSel = null; }
  if (d.fmon !== undefined) { fieldSel = +d.fmon; }
  if (d.fgo !== undefined) { const n = save.nodes[+d.fgo]; fieldSel = null; clearIdle(); startHunt(n); return; }
  if (d.fgath) { const f = fieldState(); if (!f.gathered.includes(d.fgath)) { f.gathered.push(d.fgath); const sps = REGIONS[f.region].sp, sp = sps[Math.floor(Math.random() * 4)], q = save.hr >= 5 ? 2 : 1; addMat(`${sp}:hide:${q}`, 1 + (Math.random() < 0.4 ? 1 : 0)); if (Math.random() < 0.35) addMat(`${sp}:${S_[sp].parts[0].key}:${q}`, 1); banner('채집!', 700); sfx('brk'); } }
  if (d.act === 'village') { tab = 'hunt'; }
  if (d.act === 'ack') { delete save.notice; }
  if (d.ftype) { forgeType = d.ftype; }
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
window.HN = { skipIntro: () => { save.opened = true; save.hero = save.hero || 'aria'; save.beats = BEATS.map(b => b.hr); persist(); village(); }, startHuntForTest: (i = 0) => { village(); clearIdle(); startHunt(save.nodes[i]); }, startHuntNode: (n) => { clearIdle(); startHunt(n); }, damageMonsterForTest: (m, b, src, o) => damageMonster(m, b, src, o), get G() { return G; }, get qLevel() { return qLevel; }, applyQuality, get fx() { return fx; }, renderer, topple, get save() { return save; }, get fps() { return fps; }, input, endHunt, village, migrate, get result() { return lastResult; }, setSave(s) { save = migrate(s); persist(); village(); }, showResult };
village();
