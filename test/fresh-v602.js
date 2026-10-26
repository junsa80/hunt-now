// v6.0.2: 첫 실행(저장 없음)에서 마무리 콤보·사냥이 오류 없이 도는지 (헤드리스, 실제 폰 아님)
// NODE_PATH=... URL=http://127.0.0.1:18923/ node test/fresh-v602.js
const puppeteer = require('puppeteer-core');
const URL = process.env.URL || 'http://127.0.0.1:18923/';
const sleep = (ms) => new Promise(r => setTimeout(r, ms)); let pass = 0, fail = 0; const ok = (n, c, i = '') => { c ? pass++ : fail++; console.log((c ? 'PASS ' : 'FAIL ') + n + (i ? ' — ' + i : '')); };
(async () => {
  const browser = await puppeteer.launch({ headless: 'new', executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  for (const [W, H] of [[390, 844], [360, 800]]) {
    const ctx = await browser.createBrowserContext(), page = await ctx.newPage(), errors = [], vp = `${W}x${H}`;
    page.on('pageerror', e => errors.push(e.message));
    await page.emulate({ viewport: { width: W, height: H, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }, userAgent: 'Mozilla/5.0 (Linux; Android 14) Mobile' });
    await page.goto(URL); await page.waitForFunction(() => window.HN, { timeout: 60000 }); // 새 컨텍스트 = 저장 없음, 새로고침 없이 그대로
    ok(`${vp} 첫 실행 저장에 mUsed·mentor`, await page.evaluate(() => !!HN.save.mUsed && !!HN.save.mentor));
    await page.evaluate(() => HN.skipIntro()); await sleep(300);
    await page.evaluate(() => HN.startHuntNode({ id: 0, lvl: 1, mons: [{ sp: 'wolf', lvl: 1 }] })); await sleep(1500);
    const t0 = Date.now(); while (Date.now() - t0 < 6000) { await page.evaluate(() => { HN.input.tapBuf = performance.now() / 1000; }); await sleep(120); }
    ok(`${vp} 마무리 콤보 기록됨`, await page.evaluate(() => Object.keys(HN.save.mUsed).some(k => k.endsWith(':fin'))), JSON.stringify(await page.evaluate(() => HN.save.mUsed)));
    ok(`${vp} JS 오류 없음`, errors.length === 0, errors.slice(0, 2).join(' | '));
    await ctx.close();
  }
  console.log(`${pass}/${pass + fail} passed`); await browser.close(); process.exit(fail ? 1 : 0);
})();
