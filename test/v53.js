// v5.3: 실패(시간 초과) 위로 보상 — 부위 파괴 소재 확정 + 경험치 10~30% (헤드리스, 실제 폰 아님)
const puppeteer = require('puppeteer-core');
const URL = process.env.URL || 'http://127.0.0.1:18923/', OUT = process.env.SHOTS || '/workspace/artifacts/hunt-now-v53';
const sleep = (ms) => new Promise(r => setTimeout(r, ms)); let pass = 0, fail = 0; const ok = (n, c, i = '') => { c ? pass++ : fail++; console.log((c ? 'PASS ' : 'FAIL ') + n + (i ? ' — ' + i : '')); };
(async () => {
  const browser = await puppeteer.launch({ headless: 'new', executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage(); const errors = [];
  await page.emulate({ viewport: { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }, userAgent: 'Mozilla/5.0 (Linux; Android 14) Mobile' });
  page.on('pageerror', e => errors.push(e.message)); const ev = (f, ...a) => page.evaluate(f, ...a);
  const noScroll = () => ev(() => { const u = document.getElementById('ui'); return u.scrollHeight <= u.clientHeight + 2 && document.documentElement.scrollHeight <= innerHeight + 2; });
  await page.goto(URL); await ev(() => localStorage.clear()); await page.reload(); await sleep(1500); await ev(() => HN.skipIntro());
  const winXp = 40 + 4 * 20;
  // 1) 부위 파괴 후 시간 초과
  await ev(() => HN.startHuntNode({ id: 0, lvl: 4, mons: [{ sp: 'drake', lvl: 4 }] })); await sleep(2000);
  const pre = await ev(() => { const m = HN.G.monsters[0], p = m.parts[0]; HN.G.player.invul = 999; HN.damageMonsterForTest(m, p.hp + 5, HN.G.player, { part: p }); return { key: `drake:${p.key}:`, hr: HN.save.hrXp, mats: { ...HN.save.mats }, broken: p.broken }; });
  ok('부위 파괴됨', pre.broken);
  await ev(() => { HN.G.time = 0.05; }); await sleep(2600);
  let r = await ev(() => { const r = HN.result; return r && { win: r.win, drops: r.drops, xp: r.xp, share: r.share, timeout: r.timeout }; });
  const pk = Object.keys(r.drops).find(k => k.startsWith(pre.key));
  ok('시간 초과 판정', r && !r.win && r.timeout);
  ok('파괴 부위 소재 확정 지급', pk && r.drops[pk] >= 1, JSON.stringify(r.drops));
  ok('소재가 저장(제작 재료)에 반영', await ev((k, b) => (HN.save.mats[k] || 0) > b, pk, pre.mats[pk] || 0));
  ok('부분 경험치 10~30%', r.xp > 0 && r.xp <= winXp * 0.3 && r.xp >= winXp * 0.1, `xp ${r.xp}/${winXp} share ${r.share}`);
  const txt = await ev(() => document.body.textContent);
  ok('실패 화면 문구', /사냥 실패 \(시간 초과\)/.test(txt) && /\(부위 파괴\)/.test(txt) && /획득:/.test(txt));
  ok('실패 결과 한 화면', await noScroll()); await page.screenshot({ path: OUT + '/v53-fail-result-broken.png' });
  // 2) 파괴 없이 시간 초과
  await ev(() => HN.village()); await ev(() => HN.startHuntNode({ id: 0, lvl: 4, mons: [{ sp: 'drake', lvl: 4 }] })); await sleep(2000);
  await ev(() => { HN.G.player.invul = 999; HN.G.time = 0.05; }); await sleep(2600);
  r = await ev(() => { const r = HN.result; return { drops: r.drops, xp: r.xp, share: r.share }; });
  ok('파괴 없음 → 소재 없음', Object.keys(r.drops).length === 0, JSON.stringify(r.drops));
  ok('파괴 없음 → 작은 경험치만(≤30%)', r.xp > 0 && r.xp <= winXp * 0.3, `xp ${r.xp}`);
  ok('소재 없음 안내', /소재 없음/.test(await ev(() => document.body.textContent)));
  ok('한 화면', await noScroll()); await page.screenshot({ path: OUT + '/v53-fail-result-nobreak.png' });
  ok('JS 오류 없음', !errors.length, errors.slice(0, 2).join(' | '));
  console.log(`${pass}/${pass + fail} 통과`); await browser.close(); process.exit(fail ? 1 : 0);
})();
