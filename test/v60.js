// v6.0: 사냥 Lv 직접 선택 · 긴급 의뢰(보스 사다리) · 곡선 상수 (헤드리스, 실제 폰 아님)
// NODE_PATH=... URL=http://127.0.0.1:18923/ SHOTS=/tmp/shots node test/v60.js
const puppeteer = require('puppeteer-core');
const URL = process.env.URL || 'http://127.0.0.1:18923/', OUT = process.env.SHOTS || '/tmp/hn-v60';
const sleep = (ms) => new Promise(r => setTimeout(r, ms)); let pass = 0, fail = 0; const ok = (n, c, i = '') => { c ? pass++ : fail++; console.log((c ? 'PASS ' : 'FAIL ') + n + (i ? ' — ' + i : '')); };
require('fs').mkdirSync(OUT, { recursive: true });
(async () => {
  const browser = await puppeteer.launch({ headless: 'new', executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  for (const [W, H] of [[390, 844], [360, 780]]) {
    const vp = `${W}x${H}`, page = await browser.newPage(); const errors = [];
    await page.emulate({ viewport: { width: W, height: H, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }, userAgent: 'Mozilla/5.0 (Linux; Android 14) Mobile' });
    page.on('pageerror', e => errors.push(e.message)); const ev = (f, ...a) => page.evaluate(f, ...a);
    const click = (sel) => ev(s => { const b = document.querySelector(s); if (!b) return false; b.click(); return true; }, sel);
    const layout = (sel) => ev(sel => { const root = document.querySelector(sel) || document.getElementById('ui'); let minF = 99, minB = 99, bad = [];
      root.querySelectorAll('*').forEach(e => { const r = e.getBoundingClientRect(); if (!r.width || !r.height || getComputedStyle(e).visibility === 'hidden') return; if ([...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) { const f = parseFloat(getComputedStyle(e).fontSize); if (f < minF) minF = f; if (f < 12) bad.push(e.className + ':' + f); } });
      root.querySelectorAll('button').forEach(b => { const r = b.getBoundingClientRect(); if (r.width && Math.min(r.width, r.height) < minB) minB = Math.min(r.width, r.height); });
      return { minF, minB, bad: bad.slice(0, 4), overflowX: document.documentElement.scrollWidth > innerWidth + 1 }; }, sel);
    await page.goto(URL); await ev(() => localStorage.clear()); await page.reload(); await page.waitForFunction(() => window.HN, { timeout: 60000 }); await ev(() => HN.skipIntro());
    // 1) 예전 저장(huntLv·ladder 없음, HR 5) → 사냥 Lv = HR (이전과 같은 화면)
    await ev(() => { const s = JSON.parse(JSON.stringify(HN.save)); s.hr = 5; delete s.huntLv; delete s.ladder; s.field = null; s.beats = [1, 3, 5, 8, 10]; HN.setSave(s); });
    await sleep(400);
    ok(`${vp} 예전 저장: 사냥 Lv = HR`, await ev(() => HN.huntLv() === 5));
    const lvls0 = await ev(() => HN.save.nodes.map(n => n.lvl)); ok(`${vp} 지도 Lv은 사냥 Lv±편차`, lvls0.every(l => l >= 4 && l <= 8), JSON.stringify(lvls0));
    ok(`${vp} 사냥 Lv 줄 표시`, await ev(() => !!document.querySelector('.hlv') && /사냥 Lv 5/.test(document.querySelector('.hlv').textContent)));
    let L = await layout('.hlv'); ok(`${vp} 사냥 Lv 줄 글자 ≥12px · 버튼 ≥44px`, L.minF >= 12 && L.minB >= 44, JSON.stringify(L));
    ok(`${vp} 가로 넘침 없음(사냥)`, !(await layout('#ui')).overflowX);
    await page.screenshot({ path: `${OUT}/v60-hunt-${vp}.png` });
    // 2) − 두 번 → Lv3, 지도 Lv 내려감, + 는 HR에서 막힘
    await click('[data-hlv="-1"]'); await sleep(150); await click('[data-hlv="-1"]'); await sleep(150);
    ok(`${vp} 사냥 Lv 내리기`, await ev(() => HN.huntLv() === 3 && HN.save.huntLv === 3));
    const lvls1 = await ev(() => HN.save.nodes.map(n => n.lvl)); ok(`${vp} 낮은 Lv 지도`, lvls1.every(l => l >= 2 && l <= 6) && Math.max(...lvls1) < Math.max(...lvls0), JSON.stringify(lvls1));
    for (let i = 0; i < 4; i++) { await click('[data-hlv="1"]'); await sleep(120); }
    ok(`${vp} 최대(HR)에서 멈추고 다시 HR 따라감`, await ev(() => HN.huntLv() === 5 && HN.save.huntLv == null));
    ok(`${vp} + 버튼 HR에서 비활성`, await ev(() => document.querySelector('[data-hlv="1"]').classList.contains('dis')));
    // 3) 긴급 의뢰 화면
    await click('[data-act="ladder"]'); await sleep(300);
    const lad = await ev(() => [...document.querySelectorAll('.ladc')].map(c => c.className + '|' + c.querySelector('button').className));
    ok(`${vp} 의뢰 4단계 · 1단계만 열림`, lad.length === 4 && !/dis/.test(lad[0]) && /dis/.test(lad[1]) && /lock/.test(lad[1]), JSON.stringify(lad));
    L = await layout('#ui'); ok(`${vp} 의뢰 화면 글자 ≥12px · 버튼 ≥44px · 가로 넘침 없음`, L.minF >= 12 && L.minB >= 44 && !L.overflowX, JSON.stringify(L));
    await page.screenshot({ path: `${OUT}/v60-ladder-${vp}.png` });
    // 4) 1단계 도전 → 승리 처리 → 보상
    const w0 = await ev(() => HN.save.weapons.length);
    await click('[data-lad="L1"]'); await sleep(1500);
    ok(`${vp} 의뢰 사냥 시작(루가 Lv4 격노)`, await ev(() => HN.G && HN.G.monsters[0].sp === 'wolf' && HN.G.monsters[0].lvl === 4 && HN.G.monsters[0].enraged));
    await ev(() => { HN.G.monsters.forEach(m => { m.hp = 0; }); HN.endHunt(true); }); await sleep(1200);
    const rw = await ev(() => ({ lad: HN.result.lad, done: HN.save.ladder.done, w: HN.save.weapons.slice(-1)[0], title: HN.save.title }));
    ok(`${vp} 첫 달성 보상(칭호·★무기·기록)`, rw.lad && rw.done.includes('L1') && rw.w.uniq === 'L1' && rw.w.lvl === 4 && rw.w.elem === 'fire' && rw.title === '초원의 사냥꾼' && (await ev(() => HN.save.weapons.length)) === w0 + 1, JSON.stringify(rw));
    ok(`${vp} 결과 화면 보상 줄`, await ev(() => /긴급 의뢰 「초원의 우두머리」 달성/.test(document.body.textContent)));
    await page.screenshot({ path: `${OUT}/v60-ladder-win-${vp}.png` });
    // 다시 깨도 보상 중복 없음
    await click('[data-act="ladder"]'); await sleep(200); await click('[data-lad="L1"]'); await sleep(1200);
    await ev(() => { HN.G.monsters.forEach(m => { m.hp = 0; }); HN.endHunt(true); }); await sleep(1200);
    ok(`${vp} 재도전 보상 중복 없음`, await ev((n) => !HN.result.lad && HN.save.weapons.length === n, w0 + 1));
    // 5) 최종 단계 → 종장
    await ev(() => { HN.save.hr = 10; HN.save.ladder.done = ['L1', 'L2', 'L3']; HN.village(); }); await sleep(300);
    await click('[data-act="ladder"]'); await sleep(200);
    ok(`${vp} 최종 의뢰 열림`, await ev(() => !document.querySelector('[data-lad="L4"]').classList.contains('dis')));
    await click('[data-lad="L4"]'); await sleep(1500);
    ok(`${vp} 최종 = 코하쿠 Lv11 + 마리나 Lv10`, await ev(() => HN.G.monsters.length === 2 && HN.G.monsters[0].lvl === 11 && HN.G.monsters[1].lvl === 10));
    await ev(() => { HN.G.monsters.forEach(m => { m.hp = 0; }); HN.endHunt(true); }); await sleep(1200);
    ok(`${vp} 종장 버튼`, await click('[data-act="ending"]')); await sleep(300);
    ok(`${vp} 종장 화면`, await ev(() => /종장 · 맑아진 맥/.test(document.body.textContent) && HN.save.title === '흐림을 걷은 자'));
    L = await layout('#ui'); ok(`${vp} 종장 글자 ≥12px · 가로 넘침 없음`, L.minF >= 12 && !L.overflowX, JSON.stringify(L));
    await page.screenshot({ path: `${OUT}/v60-ending-${vp}.png` });
    // 6) 대장간 ★ 이름
    await ev(() => HN.village()); await click('[data-tab="forge"]'); await sleep(200);
    ok(`${vp} 대장간에 ★무기`, await ev(() => /★/.test(document.body.textContent)));
    ok(`${vp} JS 오류 없음`, errors.length === 0, errors.slice(0, 3).join(' | '));
    await page.close();
  }
  console.log(`${pass}/${pass + fail} passed`); await browser.close(); process.exit(fail ? 1 : 0);
})();
