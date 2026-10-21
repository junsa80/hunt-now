// 헤드리스 크로미움 터치 에뮬레이션 검증 (실제 폰 손맛은 검증하지 않음)
const puppeteer = require('puppeteer-core');
const URL = process.env.URL || 'http://127.0.0.1:18923/', OUT = process.env.SHOTS || '/workspace/artifacts/hunt-now-shots-v2';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const results = []; const ok = (name, pass, info = '') => { results.push({ name, pass, info }); console.log((pass ? 'PASS ' : 'FAIL ') + name + (info ? ' — ' + info : '')); };
(async () => {
  const browser = await puppeteer.launch({ headless: 'new', executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const errors = [];
  async function newPage(w, h) { const page = await browser.newPage(); await page.emulate({ viewport: { width: w, height: h, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }, userAgent: 'Mozilla/5.0 (Linux; Android 14) Mobile' });
    page.on('pageerror', e => errors.push(`${w}x${h} ${e.message}`)); page.on('console', m => { if (m.type() === 'error') errors.push(`${w}x${h} console: ${m.text()}`); }); return page; }
  const ev = (page, f, ...a) => page.evaluate(f, ...a);
  async function startHunt(page, wtype, node = 0) {
    await ev(page, (t) => { const s = HN.save; s.equip.weapon = s.weapons.find(w => w.type === t && w.elem === 'none').id; HN.village(); }, wtype);
    await page.evaluate((n) => HN.startHuntForTest(n), node); await sleep(700);
    await ev(page, () => { const m = HN.G.monsters[0]; m.atkCd = 99; m.ai = 'move'; HN.G.player.pos.set(m.pos.x, 0, m.pos.z + 2.6); HN.G.time = 999; }); await sleep(300);
  }
  // 헤드리스에서는 CDP 터치 호출 1회에 ~150ms 지연이 생겨 빠른 탭/플릭 타이밍이 깨짐 → 페이지 안에서 정확한 시간 간격으로 TouchEvent를 발생시킴 (같은 입력 핸들러 경로)
  const gesture = (page, pts) => page.evaluate((pts) => new Promise(res => { const el = document.getElementById('touch'); let i = 0;
    const fire = () => { const [dt, x, y, type] = pts[i]; const t = new Touch({ identifier: 7, target: el, clientX: x, clientY: y });
      el.dispatchEvent(new TouchEvent(type, { touches: type === 'touchend' ? [] : [t], changedTouches: [t], bubbles: true, cancelable: true })); i++; if (i < pts.length) setTimeout(fire, pts[i][0]); else res(); };
    setTimeout(fire, pts[0][0]); }), pts);
  const drag = (page, x, y, dx, dy, holdMs) => gesture(page, [[0, x, y, 'touchstart'], ...[1, 2, 3, 4, 5, 6].map(k => [25, x + dx * k / 6, y + dy * k / 6, 'touchmove']), [holdMs, x + dx, y + dy, 'touchmove'], [20, x + dx, y + dy, 'touchend']]);
  const tap = (page, x, y) => gesture(page, [[0, x, y, 'touchstart'], [70, x, y, 'touchend']]);
  const flick = (page, x, y, dx, dy) => gesture(page, [[0, x, y, 'touchstart'], [16, x + dx * 0.4, y + dy * 0.4, 'touchmove'], [16, x + dx, y + dy, 'touchmove'], [16, x + dx, y + dy, 'touchend']]);
  const st = (page) => ev(page, () => { const p = HN.G.player; return { state: p.state, x: p.pos.x, z: p.pos.z, taps: HN.G.stats.taps || 0, dodges: HN.G.stats.dodges || 0, dealt: HN.G.stats.dealt, sp: HN.G.sp, spirit: p.spirit, spiritLvl: p.spiritLvl, chargeLvl: p.chargeLvl, gest: HN.input.gest.slice(-4) }; });

  // ── 세로 390x844 ──
  let page = await newPage(390, 844);
  await page.goto(URL); await ev(page, () => localStorage.clear()); await page.reload(); await sleep(1500); await page.evaluate(() => HN.skipIntro());
  ok('새 저장 v4 + 무기 7종', await ev(page, () => HN.save.v === 4 && HN.save.weapons.length === 7));
  await page.screenshot({ path: OUT + '/port-01-village.png' });
  await page.click('[data-tab="forge"]'); await sleep(200); await page.click('[data-ftype="bow"]'); await sleep(200); await page.screenshot({ path: OUT + '/port-02-forge-bow.png', fullPage: false });
  await page.click('[data-tab="codex"]'); await sleep(600); await page.screenshot({ path: OUT + '/port-03-codex.png' });
  ok('몬스터 6종', await ev(page, () => document.querySelectorAll('#ui .card img').length >= 6));
  await page.click('[data-tab="hunt"]'); await sleep(200);

  // 이동/공격/회피
  await startHunt(page, 'sns');
  let a = await st(page);
  const dp = drag(page, 250, 600, -60, 60, 900); await sleep(750); let b = await st(page); await dp; await sleep(200);
  ok('드래그 이동(화면 아무 곳)', Math.hypot(b.x - a.x, b.z - a.z) > 1.0 && b.state === 'run', `이동 ${Math.hypot(b.x - a.x, b.z - a.z).toFixed(2)}m state=${b.state}`);
  await ev(page, () => { const m = HN.G.monsters[0]; HN.G.player.pos.set(m.pos.x, 0, m.pos.z + 2.4); }); await sleep(100);
  a = await st(page); await tap(page, 200, 500); await sleep(120); const mid = await st(page); await sleep(150); await tap(page, 200, 500); await sleep(150); await tap(page, 200, 500); await sleep(600); b = await st(page);
  ok('탭 공격 + 콤보', b.taps - a.taps >= 2 && mid.state === 'attack' && b.dealt > a.dealt, `탭→${mid.state}, 콤보 ${b.taps - a.taps}, 피해 ${b.dealt - a.dealt}`);
  a = await st(page);
  await flick(page, 150, 600, 90, 0); await sleep(30);
  b = await st(page); ok('휙 밀기 회피', b.dodges > a.dodges && b.state === 'roll', `state=${b.state} gest=${b.gest}`);
  await page.screenshot({ path: OUT + '/port-04-dodge.png' }); await sleep(500);
  // 공격 중 회피 캔슬
  await tap(page, 200, 500); await sleep(110); a = await st(page);
  await flick(page, 150, 600, -90, 0); await sleep(30); b = await st(page);
  ok('공격 → 회피 캔슬', a.state === 'attack' && b.state === 'roll', `${a.state}→${b.state}`);
  await sleep(600);
  await ev(page, () => { HN.G.monsters[0].atkCd = 0.1; HN.G.monsters[0].ai = 'move'; }); await sleep(450);
  await page.screenshot({ path: OUT + '/port-05-telegraph.png' });
  // 이동하면서 두 번째 손가락 탭 공격
  await ev(page, () => { const m = HN.G.monsters[0]; HN.G.player.pos.set(m.pos.x + 3, 0, m.pos.z + 3); }); await sleep(100); a = await st(page);
  await page.evaluate(() => new Promise(res => { const el = document.getElementById('touch'); const T = (id, x, y) => new Touch({ identifier: id, target: el, clientX: x, clientY: y });
    const f = (type, ch, all) => el.dispatchEvent(new TouchEvent(type, { touches: all, changedTouches: ch, bubbles: true, cancelable: true }));
    const m1 = T(1, 100, 650); f('touchstart', [m1], [m1]); [1, 2, 3, 4, 5].forEach(k => setTimeout(() => { const mk = T(1, 100 - k * 8, 650 - k * 8); f('touchmove', [mk], [mk]); }, k * 25)); setTimeout(() => { const m2 = T(1, 60, 610); f('touchmove', [m2], [m2]); setTimeout(() => { const t2 = T(2, 280, 400); f('touchstart', [t2], [m2, t2]); setTimeout(() => { f('touchend', [t2], [m2]); setTimeout(() => { f('touchend', [m2], []); res(); }, 400); }, 60); }, 120); }, 160); }));
  b = await st(page); ok('두 손가락: 이동 중 탭 공격', b.taps > a.taps && Math.hypot(b.x - a.x, b.z - a.z) > 0.3, `콤보 +${b.taps - a.taps}, 이동 ${Math.hypot(b.x - a.x, b.z - a.z).toFixed(2)}m`);
  await ev(page, () => { HN.endHunt(false); }); await sleep(900); await page.click('[data-act="village"]'); await sleep(300);

  // 무기별 탭/홀드/특수기
  const holdState = { sns: 'guard', gs: 'charge', ls: 'charge', db: 'dance', hammer: 'charge', lance: 'guard', bow: 'charge' };
  for (const wt of ['sns', 'gs', 'ls', 'db', 'hammer', 'lance', 'bow']) {
    await startHunt(page, wt);
    if (wt === 'bow') await ev(page, () => { const m = HN.G.monsters[0]; HN.G.player.pos.set(m.pos.x, 0, m.pos.z + 9); });
    a = await st(page); await tap(page, 200, 500); await sleep(wt === 'gs' || wt === 'hammer' ? 700 : 450); b = await st(page);
    const tapOk = b.dealt > a.dealt;
    await page.touchscreen.touchStart(200, 520); await sleep(wt === 'gs' || wt === 'hammer' ? 1500 : 1000); const h = await st(page);
    if (wt === 'ls' || wt === 'gs' || wt === 'bow' || wt === 'db' || wt === 'lance') await page.screenshot({ path: OUT + `/port-hold-${wt}.png` });
    await ev(page, (bow) => { const m = HN.G.monsters[0], p = HN.G.player; const d = bow ? 9 : 2.4, k = Math.atan2(p.pos.x - m.pos.x, p.pos.z - m.pos.z); p.pos.set(m.pos.x + Math.sin(k) * d, 0, m.pos.z + Math.cos(k) * d); }, wt === 'bow'); // 마녀·인어는 거리를 벌리므로 손 떼기 직전 거리 재설정
    a = await st(page); await page.touchscreen.touchEnd(); await sleep(wt === 'bow' ? 700 : wt === 'hammer' || wt === 'gs' || wt === 'ls' ? 1400 : 800); b = await st(page);
    ok(`${wt} 탭 공격`, tapOk, `피해 ${b.dealt}`);
    ok(`${wt} 길게=${holdState[wt]}`, h.state === holdState[wt] && (wt === 'sns' || wt === 'lance' || b.dealt > a.dealt), `홀드 상태 ${h.state} 차지Lv ${h.chargeLvl}, 손 뗀 뒤 추가 피해 ${b.dealt - a.dealt}`);
    if (wt === 'ls') ok('태도 기력 게이지', b.spirit > 0 || b.spiritLvl > 0, `기력 ${b.spirit} 단계 ${b.spiritLvl}`);
    await ev(page, () => { HN.G.sp = 100; }); await sleep(100);
    a = await st(page); const bx = await page.$eval('#bSp', e => { const r = e.getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; });
    await page.touchscreen.tap(bx[0], bx[1]); await sleep(250); const sp = await st(page);
    if (wt === 'gs' || wt === 'db') await page.screenshot({ path: OUT + `/port-special-${wt}.png` });
    await sleep(1700); b = await st(page);
    ok(`${wt} 특수기`, sp.state === 'special' && b.dealt > a.dealt, `피해 ${b.dealt - a.dealt}`);
    await ev(page, () => HN.endHunt(false)); await sleep(900); await page.click('[data-act="village"]'); await sleep(300);
  }
  // 정화 규칙 (전투 결과를 직접 세팅해 판정 로직만 검증)
  async function fakeEnd(page, lvl, broken, sp) {
    await ev(page, (sp) => HN.startHuntNode({ id: 0, lvl: 2, mons: [{ sp, lvl: 2 }] }), sp); await sleep(500);
    await ev(page, (lvl, broken) => { const G = HN.G; G.monsters[0].lvl = lvl; G.stats.broken = broken; G.stats.weakHits = 5; G.player.elem = G.monsters[0].weak; G.time = 90; G.monsters[0].hp = 0; HN.endHunt(true); }, lvl, broken); await sleep(900);
    return ev(page, () => ({ total: HN.result.sc.total, info: HN.result.purInfo, btns: document.querySelectorAll('[data-pur]').length }));
  }
  let r = await fakeEnd(page, 1, 2, 'harpy'); ok('Lv1은 점수가 높아도 정화 불가', !r.info[0].ok && r.btns === 0, `점수 ${r.total}`);
  await page.click('[data-act="village"]'); await sleep(200);
  r = await fakeEnd(page, 3, 0, 'harpy'); ok('부위 파괴 0이면 정화 불가', !r.info[0].ok, `점수 ${r.total}`);
  await page.click('[data-act="village"]'); await sleep(200);
  r = await fakeEnd(page, 3, 2, 'harpy'); ok('조건 충족 시 정화 가능', r.info[0].ok && r.btns > 0, `점수 ${r.total}/70`);
  await page.screenshot({ path: OUT + '/port-06-purify.png' });
  await page.click('[data-pur]'); await sleep(300);
  const n1 = await ev(page, () => HN.save.comps.filter(c => c.species === 'harpy').length);
  await page.click('[data-act="village"]'); await sleep(200);
  r = await fakeEnd(page, 3, 2, 'harpy'); const n2 = await ev(page, () => HN.save.comps.filter(c => c.species === 'harpy').length);
  ok('같은 종 중복 영입 차단', n1 === 1 && n2 === 1 && r.info[0].own && r.btns === 0, `보유 ${n1}→${n2}`);
  await page.screenshot({ path: OUT + '/port-07-already-owned.png' });
  ok('강제 호출로도 중복 불가', await ev(page, () => { const before = HN.save.comps.length; document.querySelector('[data-act="village"]'); return before === HN.save.comps.length; }));
  await page.click('[data-act="village"]'); await sleep(200);

  // 구버전(v2) 저장 이관: 중복 동료 정리
  const old = { v: 2, savedAt: Date.now() - 1000, hr: 4, hrXp: 10, mats: { 'wolf:hide:1': 1 }, weapons: [{ id: 'w1', type: 'sns', elem: 'none', lvl: 3 }, { id: 'w2', type: 'gs', elem: 'fire', lvl: 1 }], armors: [{ id: 'a1', sp: 'none', lvl: 1 }], equip: { weapon: 'w1', armor: 'a1' },
    comps: [{ id: 'c3', name: '루루', species: 'wolf', role: 'dealer', level: 2, potential: 1, hueDeg: 40, hair: 1, acc: 0, xp: 0 }, { id: 'c4', name: '미나', species: 'wolf', role: 'buffer', level: 5, potential: 3, hueDeg: 90, hair: 1, acc: 1, xp: 0 },
      { id: 'c5', name: '하루', species: 'wolf', role: 'dealer', level: 3, potential: 2, hueDeg: 120, hair: 1, acc: 2, xp: 0 }, { id: 'c6', name: '세라', species: 'witch', role: 'healer', level: 2, potential: 1, hueDeg: 200, hair: 1, acc: 3, xp: 0 }],
    party: ['c3', 'c4', 'c6'], settings: { sound: true, vib: true, shake: true }, stats: { hunts: 9, wins: 6, purified: 4, fails: 3 }, codex: {}, nodes: null, nextId: 7 };
  await page.close(); const page2 = await newPage(390, 844); // 새 탭에서 스크립트 실행 전에 구버전 저장을 심음 (기존 탭은 숨김 시 자동 저장해 덮어쓰므로)
  await page2.evaluateOnNewDocument((o) => { if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', 1); localStorage.setItem('huntnow.save', JSON.stringify(o)); } }, old);
  await page2.goto(URL); await sleep(1500); page = page2;
  const mg = await ev(page, () => { const s = HN.save; return { v: s.v, comps: s.comps.map(c => c.name), party: s.party, w: s.weapons.length, hide: s.mats['wolf:hide:1'] || 0, hide2: s.mats['wolf:hide:2'] || 0, notice: s.notice || '', lvl: s.weapons[0].lvl, gsFire: s.weapons.some(w => w.type === 'gs' && w.elem === 'fire') }; });
  ok('v2→v3 이관: 종마다 최강 1명 유지', mg.v === 4 && mg.comps.join() === '미나,세라' && mg.party.join() === 'c4,c6', JSON.stringify(mg.comps) + ' party ' + mg.party);
  ok('v2→v3 이관: 중복분 소재 전환 + 알림 + 기존 무기 유지', mg.hide >= 4 && mg.hide2 >= 3 && mg.notice.includes('루루') && mg.w === 7 && mg.lvl === 3 && mg.gsFire, `wolf 가죽 하급 1→${mg.hide}, 중급 ${mg.hide2}, 무기 ${mg.w}`);
  await page.screenshot({ path: OUT + '/port-08-migration-notice.png' });
  await page.click('[data-act="ack"]'); await sleep(200);
  ok('알림 확인 후 사라짐', await ev(page, () => !HN.save.notice && !document.querySelector('.notice')));
  await ev(page, () => { const s = HN.save; s.party = ['c4', 'c6']; }); await startHunt(page, 'ls');
  await ev(page, () => { HN.G.monsters[0].atkCd = 0.2; }); await tap(page, 200, 500); await sleep(500);
  await page.screenshot({ path: OUT + '/port-09-party-combat.png' });
  await ev(page, () => HN.endHunt(false)); await sleep(900);

  // ── 가로 844x390 ──
  const pl = await newPage(844, 390); await pl.goto(URL); await sleep(1500);
  await pl.screenshot({ path: OUT + '/land-01-village.png' });
  await startHunt(pl, 'hammer');
  a = await st(pl); const dl = drag(pl, 300, 250, 0, -70, 900); await sleep(750); b = await st(pl); await dl;
  ok('가로: 드래그 이동', Math.hypot(b.x - a.x, b.z - a.z) > 1.0);
  await ev(pl, () => { const m = HN.G.monsters[0]; HN.G.player.pos.set(m.pos.x, 0, m.pos.z + 2.4); }); await sleep(100);
  a = await st(pl); await tap(pl, 500, 200); await sleep(700); b = await st(pl); ok('가로: 탭 공격', b.dealt > a.dealt);
  await sleep(400); a = await st(pl); await flick(pl, 400, 250, -90, 0); await sleep(30); b = await st(pl);
  ok('가로: 휙 밀기 회피', b.dodges > a.dodges, `gest=${b.gest} state=${b.state}`);
  await sleep(500); await pl.touchscreen.touchStart(500, 220); await sleep(1500); await pl.screenshot({ path: OUT + '/land-02-hammer-charge.png' }); await pl.touchscreen.touchEnd(); await sleep(400);
  await ev(pl, () => { HN.G.monsters[0].atkCd = 0.1; }); await sleep(500); await pl.screenshot({ path: OUT + '/land-03-combat.png' });
  await ev(pl, () => HN.endHunt(false)); await sleep(900);
  ok('JS 오류 없음', errors.length === 0, errors.slice(0, 5).join(' | '));
  require('fs').writeFileSync(OUT + '/results.json', JSON.stringify({ results, errors }, null, 1));
  console.log(`\n${results.filter(r => r.pass).length}/${results.length} 통과`);
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
