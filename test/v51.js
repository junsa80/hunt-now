// v5.1: 동료 전문 무기·스승 보너스·동료 6명 한 화면·허수아비 (헤드리스, 실제 폰 아님)
const puppeteer = require('puppeteer-core');
const URL = process.env.URL || 'http://127.0.0.1:18923/', OUT = process.env.SHOTS || '/workspace/artifacts/hunt-now-v51';
const sleep = (ms) => new Promise(r => setTimeout(r, ms)); let pass = 0, fail = 0; const ok = (n, c, i = '') => { c ? pass++ : fail++; console.log((c ? 'PASS ' : 'FAIL ') + n + (i ? ' — ' + i : '')); };
(async () => {
  const browser = await puppeteer.launch({ headless: 'new', executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage(); const errors = [];
  await page.emulate({ viewport: { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }, userAgent: 'Mozilla/5.0 (Linux; Android 14) Mobile' });
  page.on('pageerror', e => errors.push(e.message)); const ev = (f, ...a) => page.evaluate(f, ...a);
  const noScroll = () => ev(() => { const u = document.getElementById('ui'); return u.scrollHeight <= u.clientHeight + 2; });
  await page.goto(URL); await ev(() => localStorage.clear()); await page.reload(); await sleep(1500); await ev(() => HN.skipIntro());
  await ev(() => { const S = HN.save, sps = ['wolf', 'witch', 'drake', 'siren', 'kitsune', 'harpy'], roles = ['dealer', 'healer', 'tank', 'healer', 'debuffer', 'buffer'];
    S.comps = sps.map((sp, i) => ({ id: 'k' + i, name: ['루루', '미나', '노아', '리아', '에나', '솔'][i], species: sp, role: roles[i], level: 3 + i * 2, potential: 2, hueDeg: 0, hair: 0xffffff, acc: 0, weapon: null, armor: null, xp: 0, gear: {} }));
    S.party = ['k0', 'k1', 'k2']; S.notice = '테스트 알림: 동료 6명 + 알림이 한 화면에 들어가는지 확인'; S.equip.weapon = S.weapons.find(w => w.type === 'gs' && w.elem === 'none').id; HN.village(); document.querySelector('[data-tab="party"]').click(); }); await sleep(500);
  ok('동료 6명 + 알림 한 화면(스크롤 없음)', await noScroll(), await ev(() => { const u = document.getElementById('ui'); return u.scrollHeight + '/' + u.clientHeight; }));
  ok('전문 무기·현재 보너스·다음 해금 표시', await ev(() => /홍련 분쇄/.test(document.body.textContent) && /적용 중/.test(document.body.textContent) && /다음:/.test(document.body.textContent)));
  ok('안 써 본 무기 써 보기 힌트', await ev(() => document.querySelectorAll('.try').length >= 5));
  ok('해머 헌터 전용 안내', await ev(() => /해머는 헌터 전용/.test(document.body.textContent)));
  await page.screenshot({ path: OUT + '/v51-01-party6.png' });
  await ev(() => HN.startHuntForTest(0)); await sleep(1200);
  const info = await ev(() => ({ ws: HN.G.allies.slice(1).map(a => a.wtype), named: HN.G.synNames, atk: HN.G.player.atk }));
  ok('동료가 전문 무기로 싸움(대검·활·랜스)', info.ws.join() === 'gs,bow,lance', info.ws.join());
  ok('같은 무기 스승 보너스(루가·대검)', info.named.some(n => n.startsWith('스승 루루')), info.named.join(' / '));
  await ev(() => { const m = HN.G.monsters[0]; HN.G.time = 999; HN.G.allies.slice(1).forEach((a, i) => a.pos.set(m.pos.x + (i - 1) * 2.5, 0, m.pos.z + 2.5)); }); await sleep(2500);
  ok('동료 공격 동작(전문 무기 타이밍)', await ev(() => HN.G.allies.slice(1).some(a => a.atkDur > 0)));
  await page.screenshot({ path: OUT + '/v51-02-companions-weapons.png' });
  await ev(() => HN.endHunt(false)); await sleep(900); await ev(() => document.querySelector('[data-act="village"]')?.click()); await sleep(200);
  await ev(() => HN.startTraining('k2')); await sleep(1000);
  ok('허수아비: 이름·대사 수정', await ev(() => document.getElementById('mName').textContent.includes('허수아비') && !document.getElementById('line').classList.contains('on')));
  ok('훈련은 전문 무기(랜스)', await ev(() => HN.G.player.wtype === 'lance'));
  await page.screenshot({ path: OUT + '/v51-03-training-dummy.png' });
  // 동료 피해 비중: 헌터가 0.5초마다 공격(기본 피해 25), 동료는 AI로 싸움, 14초 측정
  await ev(() => HN.startHuntForTest(0)); await sleep(800);
  await ev(() => { const G = HN.G, m = G.monsters[0]; m.hp = m.maxHp = 1e6; G.player.hp = G.player.maxHp = 1e6; G.allies.forEach(a => { a.hp = a.maxHp = 1e6; }); G.allies.slice(1).forEach((a, i) => a.pos.set(m.pos.x + (i - 1) * 2.5, 0, m.pos.z + 2.5));
    window.__t = setInterval(() => { if (HN.G && HN.G.monsters[0]) HN.damageMonsterForTest(HN.G.monsters[0], 25, HN.G.player, {}); }, 500); });
  await page.screenshot({ path: OUT + '/v51-05-beast-hunt.png' }); await sleep(14000);
  const sh = await ev(() => { clearInterval(window.__t); const s = HN.G.stats; return { h: s.dealt, c: s.compDealt || 0 }; }); const share = sh.c / (sh.h + sh.c);
  console.log('동료 피해 비중(헤드리스 14초):', (share * 100).toFixed(1) + '%', JSON.stringify(sh));
  ok('동료 피해 비중 20~30% 이하(조력자)', share <= 0.3 && sh.c > 0, (share * 100).toFixed(1) + '%');
  // 정화 변신 장면
  await ev(() => { HN.G.monsters[0].hp = 0; HN.endHunt(true); }); await sleep(2500);
  await ev(() => { const r = HN.result, c = HN.save.comps[0]; r.purified = c.name; r.purSp = c.species; r.purId = c.id; r.canPurify = false; HN.showResult(); }); await sleep(1250);
  await page.screenshot({ path: OUT + '/v51-06-purify-mid.png' }); await sleep(1800);
  await page.screenshot({ path: OUT + '/v51-07-purify-human.png' });
  ok('정화 변신 장면(짐승→빛·파편→사람)', await ev(() => !!document.querySelector('.xform .xb') && !!document.querySelector('.xform .xg') && document.querySelectorAll('.xform .sh').length === 12 && /거대한 늑대/.test(document.body.textContent)));
  ok('JS 오류 없음', errors.length === 0, errors.slice(0, 3).join(' | '));
  console.log(`${pass}/${pass + fail} 통과`); await browser.close();
})();
