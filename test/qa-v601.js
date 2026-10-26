// v6.0.1 QA: 저장·불러오기·이관, 승리·실패·재도전, 핵심 루프(소재→강화), 부위 고르기, 모바일 3화면 (헤드리스 브라우저 에뮬레이션, 실제 폰 아님)
// NODE_PATH=... URL=http://127.0.0.1:18923/ SHOTS=/tmp/shots node test/qa-v601.js
const puppeteer = require('puppeteer-core');
const URL = process.env.URL || 'http://127.0.0.1:18923/', OUT = process.env.SHOTS || '/tmp/hn-qa';
const sleep = (ms) => new Promise(r => setTimeout(r, ms)); let pass = 0, fail = 0; const ok = (n, c, i = '') => { c ? pass++ : fail++; console.log((c ? 'PASS ' : 'FAIL ') + n + (i ? ' — ' + i : '')); };
require('fs').mkdirSync(OUT, { recursive: true });
(async () => {
  const browser = await puppeteer.launch({ headless: 'new', executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const errors = [];
  const open = async (W, H, fresh) => { const ctx = fresh ? await (browser.createBrowserContext ? browser.createBrowserContext() : browser.createIncognitoBrowserContext()) : browser; const page = await ctx.newPage(); await page.emulate({ viewport: { width: W, height: H, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }, userAgent: 'Mozilla/5.0 (Linux; Android 14) Mobile' });
    page.on('pageerror', e => errors.push(`${W}x${H} ${e.message}`)); return page; };
  const boot = async (page, clear = true) => { await page.goto(URL); if (clear) { await page.evaluate(() => localStorage.clear()); await page.reload(); } await page.waitForFunction(() => window.HN, { timeout: 60000 }); };
  // ── 1) 저장·불러오기 ──
  let page = await open(390, 844); const ev = (f, ...a) => page.evaluate(f, ...a);
  await boot(page); await ev(() => HN.skipIntro());
  await ev(() => { const s = HN.save; s.hr = 4; s.huntLv = 2; s.mats['wolf:hide:1'] = 9; s.ladder = { done: ['L1'] }; s.title = '초원의 사냥꾼'; HN.village(); });
  await ev(() => { document.dispatchEvent(new Event('visibilitychange')); }); await sleep(200);
  await boot(page, false); await sleep(300);
  const ld = await ev(() => ({ hr: HN.save.hr, lv: HN.huntLv(), m: HN.save.mats['wolf:hide:1'], lad: HN.save.ladder?.done, t: HN.save.title }));
  ok('저장 → 새로고침 후 그대로(HR·사냥 Lv·소재·의뢰·칭호)', ld.hr === 4 && ld.lv === 2 && ld.m === 9 && ld.lad?.[0] === 'L1' && ld.t === '초원의 사냥꾼', JSON.stringify(ld));
  // ── 2) 예전 저장 이관 (v1: 무기 2개만, v 없음 / v4: huntLv·ladder 없음) ──
  const v1 = await ev(() => { HN.setSave({ hr: 3, hrXp: 50, mats: { 'drake:hide:1': 4 }, weapons: [{ id: 'w1', type: 'sns', elem: 'none', lvl: 3 }], equip: { weapon: 'w1' }, comps: [], party: [] });
    const s = HN.save; return { v: s.v, hr: s.hr, wt: new Set(s.weapons.map(w => w.type)).size, keep: s.weapons.find(w => w.id === 'w1')?.lvl, mats: s.mats['drake:hide:1'], lv: HN.huntLv(), ui: /주인공 선택/.test(document.body.textContent) }; });
  ok('v1 저장 이관: 형식 v4·무기 7종·기존 무기·소재 유지·사냥 Lv=HR·주인공 한 번 고르기 화면', v1.v === 4 && v1.wt === 7 && v1.keep === 3 && v1.mats === 4 && v1.lv === 3 && v1.ui, JSON.stringify(v1));
  const v4 = await ev(() => { const s = JSON.parse(JSON.stringify(HN.save)); s.hr = 7; delete s.huntLv; delete s.ladder; delete s.title; s.opened = true; s.hero = 'aria'; s.beats = [1, 3, 5]; HN.setSave(s); return { lv: HN.huntLv(), lad: HN.save.ladder, err: null }; });
  ok('v4(v6.0 이전) 저장: 사냥 Lv=HR, 의뢰 기록 없음으로 시작', v4.lv === 7 && !v4.lad, JSON.stringify(v4));
  // ── 3) 승리·실패·재도전 ──
  await ev(() => { const s = HN.save; s.hr = 3; s.beats = [1, 3, 5, 8, 10]; s.party = []; HN.village(); });
  const st0 = await ev(() => ({ ...HN.save.stats }));
  await ev(() => HN.startHuntNode({ id: 0, lvl: 2, mons: [{ sp: 'wolf', lvl: 2 }] })); await sleep(1200);
  await ev(() => { HN.G.monsters.forEach(m => { m.hp = 0; }); HN.endHunt(true); }); await sleep(1200);
  const w = await ev(() => ({ win: HN.result.win, wins: HN.save.stats.wins, drops: Object.keys(HN.result.drops).length, txt: /토벌 성공/.test(document.body.textContent) }));
  ok('승리: 결과 화면·승리 수·소재', w.win && w.wins === st0.wins + 1 && w.drops > 0 && w.txt, JSON.stringify(w));
  await page.screenshot({ path: `${OUT}/qa-win-390x844.png` });
  await ev(() => HN.startHuntNode({ id: 0, lvl: 2, mons: [{ sp: 'wolf', lvl: 2 }] })); await sleep(1200);
  await ev(() => { HN.G.player.hp = 0; HN.endHunt(false); }); await sleep(1200);
  const l = await ev(() => ({ win: HN.result.win, fails: HN.save.stats.fails, xp: HN.result.xp, txt: /사냥 실패/.test(document.body.textContent) }));
  ok('실패: 결과 화면·실패 수·위로 경험치', !l.win && l.fails === st0.fails + 1 && l.xp > 0 && l.txt, JSON.stringify(l));
  await page.screenshot({ path: `${OUT}/qa-lose-390x844.png` });
  await ev(() => { const b = document.querySelector('[data-act="village"]'); b && b.click(); }); await sleep(300);
  await ev(() => { const b = document.querySelector('[data-fmon="0"]'); b && b.click(); }); await sleep(200);
  const go = await ev(() => { const b = document.querySelector('[data-fgo]'); if (!b) return false; b.click(); return true; }); await sleep(1200);
  ok('재도전: 마을 → 지도 몬스터 → 사냥 시작', go && await ev(() => !!HN.G && HN.G.monsters.length >= 1));
  await ev(() => { HN.G.over = true; HN.endHunt(false); }); await sleep(900); await ev(() => HN.village());
  // ── 4) 핵심 루프: 소재 → 무기 강화 ──
  const up = await ev(async () => { const s = HN.save; s.mats['wolf:hide:1'] = 30; const w = s.weapons.find(x => x.id === s.equip.weapon), l0 = w.lvl; HN.village();
    document.querySelector('[data-tab="forge"]').click(); await new Promise(r => setTimeout(r, 200)); const b = document.querySelector(`[data-upw="${w.id}"]`); if (!b || b.classList.contains('dis')) return { l0, l1: l0, why: 'no btn' }; b.click(); return { l0, l1: s.weapons.find(x => x.id === w.id).lvl }; });
  ok('대장간 강화: 소재로 무기 +1', up.l1 === up.l0 + 1, JSON.stringify(up));
  // ── 5) 부위 고르기 (v6.0.1) ──
  const parts = {};
  for (const sp of ['witch', 'drake', 'kitsune']) { await ev(sp => { HN.village(); HN.startHuntNode({ id: 0, lvl: 2, mons: [{ sp, lvl: 2 }] }); }, sp); await sleep(900);
    parts[sp] = await ev(() => { const m = HN.G.monsters[0], p = HN.G.player; m.atkCd = 99; m.ai = 'move'; HN.G.time = 999; const r = { light: {}, heavy: {}, anchor: !!m.model.userData.horn1 };
      for (const hv of [false, true]) for (const a of [0, 0.6, 1.2, -0.6, -1.2]) { p.pos.set(m.pos.x + Math.sin(a) * 2.2, 0, m.pos.z + Math.cos(a) * 2.2); p.face = a + Math.PI; m.model.updateMatrixWorld(true); m.parts.forEach(x => { x.hp = x.max; x.broken = false; }); HN.hitForTest(p, 1, hv); m.parts.forEach(x => { if (x.hp < x.max) { const o = hv ? r.heavy : r.light; o[x.key] = (o[x.key] || 0) + 1; } }); m.hp = m.maxHp; }
      return r; });
    await ev(() => { HN.G.over = true; HN.endHunt(false); }); await sleep(700); }
  ok('셀레스·드라카: 정면 근처에서 머리 부위도 맞음(예전엔 날개만)', parts.witch.light.crown >= 1 && parts.drake.light.horn >= 1 && parts.witch.heavy.crown >= parts.witch.light.crown, JSON.stringify({ w: parts.witch, d: parts.drake }));
  ok('코하쿠 귀 장식에 앵커(예전엔 발밑)', parts.kitsune.anchor && parts.kitsune.light.ear >= 1, JSON.stringify(parts.kitsune));
  await page.close();
  // ── 6) 모바일 3화면: 사냥 탭 한 화면·탭 44px·글자 12px ──
  for (const [W, H] of [[360, 800], [390, 844], [412, 915], [360, 780]]) {
    page = await open(W, H, true); await boot(page); await page.evaluate(() => HN.skipIntro()); await sleep(400);
    const m = await page.evaluate(() => { const u = document.getElementById('ui'); let minF = 99, minB = 99; u.querySelectorAll('*').forEach(e => { const r = e.getBoundingClientRect(); if (!r.width || !r.height) return; if ([...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) minF = Math.min(minF, parseFloat(getComputedStyle(e).fontSize)); });
      u.querySelectorAll('.tabs .btn, .hlv .btn, .finfo .btn, .row .btn').forEach(b => { const r = b.getBoundingClientRect(); if (r.width) minB = Math.min(minB, r.height, r.width); });
      return { over: u.scrollHeight - u.clientHeight, ox: document.documentElement.scrollWidth > innerWidth + 1, minF, minB }; });
    ok(`${W}x${H} 사냥 탭 한 화면·가로 넘침 없음·탭 ≥44px·글자 ≥12px`, m.over <= 1 && !m.ox && m.minB >= 44 && m.minF >= 12, JSON.stringify(m));
    await page.screenshot({ path: `${OUT}/qa-hunt-${W}x${H}.png` }); await page.close();
  }
  ok('JS 오류 없음', errors.length === 0, errors.slice(0, 3).join(' | '));
  console.log(`${pass}/${pass + fail} passed`); await browser.close(); process.exit(fail ? 1 : 0);
})();
