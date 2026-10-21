// 전/후 비교 스크린샷 + 입력 지연·FPS 측정 (헤드리스, 실제 폰 아님)
const puppeteer = require('puppeteer-core');
const URL = process.env.URL || 'http://127.0.0.1:18923/', OUT = process.env.SHOTS || '/workspace/artifacts/hunt-now-v5', TAG = process.env.TAG || 'after';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
(async () => {
  const browser = await puppeteer.launch({ headless: 'new', executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage(); const errors = [];
  await page.emulate({ viewport: { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }, userAgent: 'Mozilla/5.0 (Linux; Android 14) Mobile' });
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(URL); await page.evaluate(() => localStorage.clear()); await page.reload(); await sleep(1500); await page.evaluate(() => HN.skipIntro());
  await page.screenshot({ path: `${OUT}/${TAG}-01-village.png` });
  await page.evaluate(() => { const s = HN.save; HN.village(); });
  await page.evaluate(() => HN.startHuntForTest ? HN.startHuntForTest() : document.querySelector('[data-hunt="0"]').click()); await sleep(1500);
  await page.evaluate(() => { const m = HN.G.monsters[0]; HN.G.player.pos.set(m.pos.x, 0, m.pos.z + 3); m.atkCd = 0.1; }); await sleep(700);
  await page.screenshot({ path: `${OUT}/${TAG}-02-hunt-telegraph.png` });
  // 입력 지연: touchstart→touchend(탭) 후 플레이어 state가 attack이 될 때까지 (rAF 기준)
  const lat = await page.evaluate(() => new Promise(res => { const el = document.getElementById('touch'); const out = []; let n = 0;
    const one = () => { const p = HN.G.player; p.state = 'idle'; p.combo = -1; const t0 = performance.now(); const T = new Touch({ identifier: 3, target: el, clientX: 200, clientY: 500 });
      el.dispatchEvent(new TouchEvent('touchstart', { touches: [T], changedTouches: [T], bubbles: true, cancelable: true }));
      setTimeout(() => { el.dispatchEvent(new TouchEvent('touchend', { touches: [], changedTouches: [T], bubbles: true, cancelable: true }));
        const chk = () => { if (p.state === 'attack') { out.push(performance.now() - t0 - 60); if (++n < 5) setTimeout(one, 900); else res(out); } else requestAnimationFrame(chk); }; chk(); }, 60); };
    one(); }));
  await page.evaluate(() => { HN.G.player.hp = 9999; HN.G.player.maxHp = 9999; }); await sleep(3000);
  const fps = await page.evaluate(() => HN.fps);
  await page.evaluate(() => { const m = HN.G.monsters[0]; m.parts.forEach(pt => HN.damageMonsterForTest(m, pt.hp + 5, HN.G.player, { part: pt })); }); await sleep(250);
  await page.screenshot({ path: `${OUT}/${TAG}-03-hit-break.png` });
  console.log(JSON.stringify({ tag: TAG, tapToAttackMs: lat.map(x => Math.round(x)), fpsHeadless: fps, errors }));
  await browser.close();
})();
