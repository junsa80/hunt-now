// 타격감 전후 스크린샷 (헤드리스 swiftshader = 브라우저 에뮬레이션, 실제 폰 아님)
// NODE_PATH=... URL=http://127.0.0.1:18923/ TAG=after OUT=/tmp/hn-hitfeel node test/shot-hitfeel.js
const puppeteer = require('puppeteer-core');
const URL = process.env.URL || 'http://127.0.0.1:18923/', TAG = process.env.TAG || 'now', OUT = process.env.OUT || '/tmp/hn-hitfeel';
require('fs').mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await puppeteer.launch({ headless: 'new', executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await b.createBrowserContext(), page = await ctx.newPage();
  await page.emulate({ viewport: { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 1 }, userAgent: 'Mozilla/5.0 (Linux; Android 14) Mobile' });
  await page.goto(URL); await page.waitForFunction(() => window.HN, { timeout: 60000 });
  await page.evaluate(() => { HN.skipIntro(); const S = HN.save; S.equip.weapon = S.weapons.find(w => w.type === 'gs').id; S.settings.tips = false; S.settings.dlg = false; });
  await page.evaluate(() => HN.startHuntNode({ id: 0, lvl: 1, mons: [{ sp: 'wolf', lvl: 1 }] })); await sleep(2500);
  const shots = [];
  for (let tries = 0; tries < 12 && !shots.length; tries++) {
    await page.evaluate(() => { const G = HN.G, p = G.player, m = G.monsters[0]; m.ai = 'recover'; m.aiT = 3; const a = Math.atan2(p.pos.x - m.pos.x, p.pos.z - m.pos.z); p.pos.x = m.pos.x + Math.sin(a) * 2.2; p.pos.z = m.pos.z + Math.cos(a) * 2.2; p.face = Math.atan2(m.pos.x - p.pos.x, m.pos.z - p.pos.z); window.__hp0 = m.hp; HN.input.tapBuf = performance.now() / 1000; });
    const t0 = Date.now();
    while (Date.now() - t0 < 2500) { const hit = await page.evaluate(() => HN.G.monsters[0].hp < window.__hp0); if (hit) { for (const [ms, n] of [[0, '0ms'], [45, '45ms'], [75, '120ms']]) { if (ms) await sleep(ms); await page.screenshot({ path: `${OUT}/${TAG}-${n}.png`, clip: { x: 0, y: 160, width: 390, height: 460 } }); shots.push(n); } break; } await sleep(10); }
  }
  console.log(TAG, shots.length ? 'ok ' + shots.join(',') : 'NO HIT'); await b.close();
})();
