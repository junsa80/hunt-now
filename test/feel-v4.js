// v4 손맛·몬스터 AI 검증 (헤드리스 크로미움 + 터치 이벤트). 실제 폰 체감은 검증하지 않음.
const puppeteer = require('puppeteer-core');
const URL = process.env.URL || 'http://127.0.0.1:18923/', OUT = process.env.SHOTS || '/workspace/artifacts/hunt-now-shots-v3';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const results = []; const ok = (n, p, i = '') => { results.push(p); console.log((p ? 'PASS ' : 'FAIL ') + n + (i ? ' — ' + i : '')); };
(async () => {
  const browser = await puppeteer.launch({ headless: 'new', executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const errors = [];
  async function newPage(w, h) { const page = await browser.newPage(); await page.emulate({ viewport: { width: w, height: h, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }, userAgent: 'Mozilla/5.0 (Linux; Android 14) Mobile' });
    page.on('pageerror', e => errors.push(`${w}x${h} ${e.message}`)); page.on('console', m => { if (m.type() === 'error') errors.push(`${w}x${h} console: ${m.text()}`); }); return page; }
  const ev = (page, f, ...a) => page.evaluate(f, ...a);
  const gesture = (page, pts) => page.evaluate((pts) => new Promise(res => { const el = document.getElementById('touch'); let i = 0;
    const fire = () => { const [dt, x, y, type] = pts[i]; const t = new Touch({ identifier: 7, target: el, clientX: x, clientY: y });
      el.dispatchEvent(new TouchEvent(type, { touches: type === 'touchend' ? [] : [t], changedTouches: [t], bubbles: true, cancelable: true })); i++; if (i < pts.length) setTimeout(fire, pts[i][0]); else res(); };
    setTimeout(fire, pts[0][0]); }), pts);
  const tap = (page, x, y) => gesture(page, [[0, x, y, 'touchstart'], [70, x, y, 'touchend']]);
  async function hunt(page, wtype, node = 0, freeze = true) {
    await ev(page, (t) => { const s = HN.save; s.equip.weapon = s.weapons.find(w => w.type === t && w.elem === 'none').id; HN.village(); }, wtype);
    await page.click(`[data-hunt="${node}"]`); await sleep(700);
    await ev(page, (fz) => { const m = HN.G.monsters[0]; if (fz) { m.atkCd = 99; m.ai = 'move'; } HN.G.player.pos.set(m.pos.x, 0, m.pos.z + 3); HN.G.time = 999; }, freeze); await sleep(300);
  }
  for (const [W, H, tag] of [[390, 844, 'port'], [844, 390, 'land']]) {
    const page = await newPage(W, H); await page.goto(URL); await ev(page, () => localStorage.clear()); await page.reload(); await sleep(1500);
    ok(`${tag}: 화질 설정 기본값 auto`, await ev(page, () => HN.save.settings.quality === 'auto'));
    // 조우 포효 → 가까운 헌터는 귀를 막음(cover)
    await hunt(page, 'gs', 0, false);
    await ev(page, () => { const m = HN.G.monsters[0]; m.atkCd = 0; m.roared = false; HN.G.player.pos.set(m.pos.x, 0, m.pos.z + 3); });
    let st = null; for (let i = 0; i < 20 && !(st && st.cover); i++) { await sleep(100); st = await ev(page, () => ({ ai: HN.G.monsters[0].ai, ps: HN.G.player.state, cover: HN.G.stats.covered || 0 })); if (i === 6) await page.screenshot({ path: `${OUT}/${tag}-roar.png` }); }
    ok(`${tag}: 조우 포효 → 헌터 귀막음(행동 불가)`, st.cover >= 1, JSON.stringify(st));
    await sleep(1800);
    // 포효를 구르기 무적으로 피함
    await ev(page, () => { const m = HN.G.monsters[0], p = HN.G.player; m.atkCd = 0; m.pendingRoar = 'rage'; p.state = 'idle'; p.pos.set(m.pos.x, 0, m.pos.z + 3); });
    await ev(page, () => new Promise(res => { const f = () => { const m = HN.G.monsters[0]; if (m.ai === 'roar') { const p = HN.G.player; p.pos.set(m.pos.x, 0, m.pos.z + 3); p.state = 'roll'; p.st = 0; p.rollStart = HN.G.t; p.iframe = 1.2; p.rollDir = 0; res(); } else requestAnimationFrame(f); }; f(); })); await sleep(1200);
    ok(`${tag}: 포효 타이밍 구르기 → 포효 회피`, await ev(page, () => (HN.G.stats.roarDodge || 0) >= 1), JSON.stringify(await ev(page, () => HN.G.stats)));
    await sleep(1500);
    // 분노: 체력 50% 아래 → 분노 상태 + 다음 행동에서 포효
    await ev(page, () => { const m = HN.G.monsters[0]; m.hp = m.maxHp * 0.45; m.enraged = false; m.rageDone = false; m.ai = 'move'; m.atkCd = 0.3; }); await sleep(900);
    const rg = await ev(page, () => { const m = HN.G.monsters[0]; return { en: m.enraged, ai: m.ai, why: m.roarWhy, hud: document.getElementById('mStatus').textContent }; });
    ok(`${tag}: 분노 진입(체력 50%↓) + 분노 포효 + HUD 표시`, rg.en && rg.why === 'rage' && rg.hud.includes('분노'), JSON.stringify(rg));
    await sleep(1600); await page.screenshot({ path: `${OUT}/${tag}-enraged.png` });
    // 부위 파괴 → 다운(topple) + 다운 중 피해 1.3배
    await ev(page, () => { const m = HN.G.monsters[0], p = HN.G.player; m.atkCd = 99; m.ai = 'move'; clearTimeout; m.hp = m.maxHp; m.enraged = true; m.weakened = false; p.state = 'idle'; p.pos.set(m.pos.x, 0, m.pos.z + 2.6); m.parts[0].hp = 1; });
    let tp = null; for (let i = 0; i < 6 && !(tp && tp.ai === 'topple'); i++) { await tap(page, W / 2, H * 0.55); await sleep(450); tp = await ev(page, () => ({ ai: HN.G.monsters[0].ai, br: HN.G.stats.broken, tops: HN.G.stats.topples || 0 })); }
    ok(`${tag}: 부위 파괴 → 다운(넘어짐)`, tp.ai === 'topple' && tp.br >= 1 && tp.tops >= 1, JSON.stringify(tp));
    await sleep(200); await page.screenshot({ path: `${OUT}/${tag}-topple.png` });
    const bonus = await ev(page, () => { const m = HN.G.monsters[0], p = HN.G.player; const r = []; for (const ai of ['topple', 'move']) { m.ai = ai; m.aiT = 3; const h0 = m.hp; HN.G.stats.__ = 0; const rr = Math.random; Math.random = () => 0.5; m.hp = m.maxHp; const b = m.hp; HN.damageMonsterForTest(m, 100, { team: 0 }); r.push(b - m.hp); Math.random = rr; } m.ai = 'move'; return r; });
    ok(`${tag}: 다운 중 피해 증가(×1.3)`, bonus[0] > bonus[1] * 1.25, `다운 ${bonus[0]} vs 평소 ${bonus[1]}`);
    // 약해짐 → 절뚝 + 도주
    await ev(page, () => { const m = HN.G.monsters[0]; m.hp = m.maxHp * 0.18; m.ai = 'move'; m.atkCd = 0.2; m.pendingRoar = null; }); await sleep(700);
    const wk = await ev(page, () => { const m = HN.G.monsters[0]; return { w: m.weakened, ai: m.ai }; });
    ok(`${tag}: 체력 22%↓ 약해짐 → 도주`, wk.w && wk.ai === 'flee', JSON.stringify(wk));
    await ev(page, () => { HN.endHunt(false); }); await sleep(900); await page.click('[data-act="village"]').catch(() => {}); await sleep(300);
    // 무기 무게별 히트스톱: 대검 > 한손검
    const hs = {};
    for (const wt of ['sns', 'gs']) { await hunt(page, wt); await ev(page, () => { HN.G.lastHitstop = 0; HN.G.player.state = 'idle'; });
      await tap(page, W / 2, H * 0.55); await sleep(wt === 'gs' ? 700 : 450); hs[wt] = await ev(page, () => HN.G.lastHitstop || 0);
      if (wt === 'gs') await page.screenshot({ path: `${OUT}/${tag}-gs-hit.png` });
      await ev(page, () => { HN.endHunt(false); }); await sleep(800); await page.click('[data-act="village"]').catch(() => {}); await sleep(300); }
    ok(`${tag}: 히트스톱이 무기 무게에 비례(대검>한손검)`, hs.gs > hs.sns && hs.sns > 0, JSON.stringify(hs));
    // 약점 부위 색 구분 + 타격 이펙트 생성
    await hunt(page, 'ls');
    const cls = await ev(page, async () => { const m = HN.G.monsters[0]; HN.G.player.state = 'idle'; HN.input.tapBuf = performance.now() / 1000; await new Promise(r => setTimeout(r, 120)); const fxn = HN.fx.count; HN.damageMonsterForTest(m, 10, HN.G.player, { part: m.parts[0], at: m.pos.clone().setY(2) }); return { cls: HN.G.dmgCls, fx: HN.fx.count, fx0: fxn }; });
    ok(`${tag}: 약점 부위 타격 = 주황 숫자 + 섬광/X 표시`, cls.cls && cls.cls.wpt >= 1 && cls.fx > cls.fx0, JSON.stringify(cls));
    await sleep(60); await page.screenshot({ path: `${OUT}/${tag}-weakpoint.png` });
    // 회전 한계: 몬스터 등 뒤에 있으면 바로 공격하지 못하고 돌아야 함
    const turn = await ev(page, async () => { const m = HN.G.monsters[0], p = HN.G.player; m.face = 0; p.pos.set(m.pos.x, 0, m.pos.z - 6); m.ai = 'move'; m.atkCd = 99; await new Promise(r => setTimeout(r, 300)); return Math.abs(((m.face % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)); });
    ok(`${tag}: 몬스터 회전 속도 한계(0.3초에 180° 못 돎)`, turn < 2.6 || turn > 3.7 ? true : false, `0.3초 뒤 방향 ${turn.toFixed(2)}rad (목표 ${Math.PI.toFixed(2)})`);
    // 화질 설정
    await ev(page, () => { HN.endHunt(false); }); await sleep(800); await page.click('[data-act="village"]').catch(() => {}); await sleep(300);
    const q = await ev(page, () => { HN.save.settings.quality = 'low'; HN.applyQuality(0); const a = HN.renderer.getPixelRatio(); HN.save.settings.quality = 'high'; HN.applyQuality(2); return [a, HN.renderer.getPixelRatio(), HN.qLevel]; });
    ok(`${tag}: 화질 낮음/높음 전환`, q[0] < q[1] && q[2] === 2, JSON.stringify(q));
    await ev(page, () => { HN.save.settings.quality = 'auto'; });
    await page.close();
  }
  ok('JS 오류 없음', errors.length === 0, errors.slice(0, 5).join(' | '));
  console.log(`\n${results.filter(Boolean).length}/${results.length} 통과`); await browser.close(); process.exit(results.every(Boolean) ? 0 : 1);
})();
