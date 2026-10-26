// 성능 프로파일 (헤드리스 + swiftshader 소프트웨어 GL — 실제 폰 GPU 아님, 상대 비교용)
// NODE_PATH=... URL=http://127.0.0.1:18923/ CPU=4 node test/perf.js
const puppeteer = require('puppeteer-core');
const URL = process.env.URL || 'http://127.0.0.1:18923/', CPU = Number(process.env.CPU || 4);
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
(async () => {
  const browser = await puppeteer.launch({ headless: 'new', executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await browser.createBrowserContext(); const page = await ctx.newPage(); const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.emulate({ viewport: { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }, userAgent: 'Mozilla/5.0 (Linux; Android 14) Mobile' });
  const cdp = await page.createCDPSession(); await cdp.send('Network.enable'); await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU });
  const bytes = {}, types = {};
  cdp.on('Network.responseReceived', e => { types[e.requestId] = e.response.url.split('?')[0].split('/').pop(); });
  cdp.on('Network.loadingFinished', e => { const t = types[e.requestId] || '?'; bytes[t] = (bytes[t] || 0) + e.encodedDataLength; });
  await page.evaluateOnNewDocument(() => { window.__lt = []; new PerformanceObserver(l => l.getEntries().forEach(e => window.__lt.push(e.duration))).observe({ type: 'longtask', buffered: true }); });
  const t0 = Date.now(); await page.goto(URL, { waitUntil: 'load' }); await page.waitForFunction(() => window.HN, { timeout: 120000 }); const ready = Date.now() - t0;
  const total = Object.values(bytes).reduce((a, b) => a + b, 0);
  const lt0 = await page.evaluate(() => ({ n: window.__lt.length, max: Math.max(0, ...window.__lt), sum: window.__lt.reduce((a, b) => a + b, 0) }));
  console.log(`CPU x${CPU} | 첫 로드 ${Math.round(total / 1024)}KB | HN 준비 ${ready}ms | 로드 중 long task ${lt0.n}개 합 ${Math.round(lt0.sum)}ms 최대 ${Math.round(lt0.max)}ms`);
  Object.entries(bytes).sort((a, b) => b[1] - a[1]).slice(0, 6).forEach(([k, v]) => console.log(`  ${k} ${Math.round(v / 1024)}KB`));
  await page.evaluate(() => { localStorage.clear(); HN.skipIntro(); }); await sleep(300);
  await page.evaluate(() => HN.startHuntNode({ id: 0, lvl: 3, mons: [{ sp: 'wolf', lvl: 3 }, { sp: 'harpy', lvl: 3 }, { sp: 'witch', lvl: 3 }] })); await sleep(1500);
  await page.evaluate(() => { window.__lt = []; window.__fr = []; let last = performance.now(); const tick = (t) => { window.__fr.push(t - last); last = t; if (window.__fr.length < 1e5) requestAnimationFrame(tick); }; requestAnimationFrame(tick); });
  const t1 = Date.now(); while (Date.now() - t1 < 8000) { await page.evaluate(() => { HN.input.tapBuf = performance.now() / 1000; }); await sleep(180); }
  const r = await page.evaluate(() => { const f = window.__fr.slice(2).sort((a, b) => a - b); const q = p => f[Math.min(f.length - 1, Math.floor(f.length * p))]; return { n: f.length, p50: q(.5), p95: q(.95), max: f[f.length - 1], slow: f.filter(x => x > 50).length, lt: window.__lt.length, ltMax: Math.max(0, ...window.__lt), heap: performance.memory ? performance.memory.usedJSHeapSize : 0, q: HN.qLevel, fps: HN.fps, calls: HN.renderer.info.render.calls, tris: HN.renderer.info.render.triangles, geo: HN.renderer.info.memory.geometries, tex: HN.renderer.info.memory.textures, fx: HN.fx.count }; });
  console.log(`사냥 8초 (몬스터 3) 프레임 ${r.n} | p50 ${r.p50.toFixed(1)} p95 ${r.p95.toFixed(1)} 최대 ${r.max.toFixed(0)}ms | >50ms ${r.slow} | long task ${r.lt} (최대 ${Math.round(r.ltMax)}ms) | 힙 ${(r.heap / 1048576).toFixed(1)}MB | 품질 ${r.q} fps ${r.fps} | draw ${r.calls} tris ${r.tris} geo ${r.geo} tex ${r.tex} fx ${r.fx}`);
  console.log(errors.length ? 'JS 오류 ' + errors.join(' | ') : 'JS 오류 없음');
  await browser.close();
})();
