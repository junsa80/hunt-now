// v5 기능 검증: 동료 방어구 · 필드 · 개인 스토리 · 저장 이관 (헤드리스, 실제 폰 아님)
const puppeteer = require('puppeteer-core');
const URL = process.env.URL || 'http://127.0.0.1:18923/', OUT = process.env.SHOTS || '/workspace/artifacts/hunt-now-v5';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
let pass = 0, fail = 0; const ok = (n, c, i = '') => { c ? pass++ : fail++; console.log((c ? 'PASS ' : 'FAIL ') + n + (i ? ' — ' + i : '')); };
(async () => {
  const browser = await puppeteer.launch({ headless: 'new', executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage(); const errors = [];
  await page.emulate({ viewport: { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }, userAgent: 'Mozilla/5.0 (Linux; Android 14) Mobile' });
  page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  const ev = (f, ...a) => page.evaluate(f, ...a);
  const noScroll = () => ev(() => { const u = document.getElementById('ui'); const inner = [...u.querySelectorAll('.glist,.flist,.slist')]; return u.scrollHeight <= u.clientHeight + 2; });
  // 새 게임: 오프닝 → 주인공 선택
  await page.goto(URL); await ev(() => localStorage.clear()); await page.reload(); await sleep(1500);
  ok('첫 실행 오프닝 표시', await ev(() => !!document.querySelector('[data-op="next"]'))); ok('오프닝 한 화면', await noScroll());
  await page.screenshot({ path: OUT + '/v5-05-opening.png' });
  for (let i = 0; i < 2; i++) { await page.click('[data-op="next"]'); await sleep(150); }
  await page.click('[data-op="skip"]'); await sleep(300);
  ok('건너뛰기 → 주인공 선택', await ev(() => document.querySelectorAll('[data-hero]').length === 3));
  await page.click('[data-hero="hana"]'); await sleep(200); ok('주인공 선택 한 화면', await noScroll()); await page.screenshot({ path: OUT + '/v5-06-hero.png' });
  await page.click('[data-act="heroOk"]'); await sleep(300);
  ok('HR1 메인 스토리 1장', await ev(() => /1장/.test(document.body.textContent) && !!document.querySelector('[data-beat="1"]'))); await page.screenshot({ path: OUT + '/v5-07-beat.png' });
  await page.click('[data-beat="1"]'); await sleep(300); ok('주인공 저장(하나) → 마을', await ev(() => HN.save.hero === 'hana' && !!document.querySelector('#fieldMap')));
  await ev(() => { document.querySelector('[data-tab="set"]').click(); }); await sleep(200); await page.click('[data-act="lore"]'); await sleep(200);
  ok('세계관 화면(흐림·정화 설명)', await ev(() => /흐림/.test(document.body.textContent) && /정화/.test(document.body.textContent))); ok('세계관 한 화면', await noScroll()); await page.screenshot({ path: OUT + '/v5-08-lore.png' });
  await page.click('[data-act="village"]'); await sleep(200); await ev(() => document.querySelector('[data-tab="set"]').click()); await sleep(200); await page.click('[data-act="replayOp"]'); await sleep(200);
  ok('설정에서 오프닝 다시 보기', await ev(() => !!document.querySelector('[data-op="skip"]'))); await page.click('[data-op="skip"]'); await sleep(200);
  // v3 저장 이관
  await sleep(300); await ev(() => HN.setSave({ v: 3, hr: 3, hrXp: 10, mats: { 'wolf:hide:2': 5 }, weapons: [{ id: 'w1', type: 'sns', elem: 'none', lvl: 2 }], armors: [{ id: 'a1', sp: 'none', lvl: 1 }], equip: { weapon: 'w1', armor: 'a1' }, comps: [{ id: 'c1', name: '루루', species: 'wolf', role: 'dealer', level: 3, potential: 2, hueDeg: 40, hair: 0xff0000, acc: 0, weapon: null, armor: null, xp: 0 }], party: ['c1'], settings: { sound: true, vib: true, shake: true, dodgeBtn: false, hint: true, quality: 'auto' }, stats: { hunts: 4, wins: 3, purified: 1, fails: 1 }, codex: { wolf: { seen: 2, won: 2, maxLvl: 3 } }, nodes: null, nextId: 30 }));
  await sleep(500);
  ok('기존 플레이어: 오프닝 없이 주인공 1회 선택', await ev(() => HN.save.opened && !HN.save.hero && document.querySelectorAll('[data-hero]').length === 3));
  await page.click('[data-hero="rin"]'); await page.click('[data-act="heroOk"]'); await sleep(300);
  while (await ev(() => !!document.querySelector('[data-beat]'))) { await ev(() => document.querySelector('[data-beat]').click()); await sleep(150); }
  ok('v3 → v4 저장 이관(동료·소재 유지)', await ev(() => HN.save.v === 4 && HN.save.comps[0].name === '루루' && HN.save.mats['wolf:hide:2'] === 5 && Array.isArray(HN.save.cgear) && HN.save.comps[0].gear));
  // 필드 → 사냥 → 보상
  if (await ev(() => !!document.querySelector('[data-act="ack"]'))) { await page.click('[data-act="ack"]'); await sleep(200); }
  await ev(() => document.querySelector('[data-tab="hunt"]')?.click()); await sleep(200);
  const hasField = await ev(() => !!document.querySelector('#fieldMap')); if (!hasField) console.log('SCREEN', await ev(() => document.getElementById('ui').textContent.slice(0, 200)));
  if (hasField) { await page.screenshot({ path: OUT + '/v5-01-field.png' }); ok('필드 한 화면(스크롤 없음)', await noScroll());
    ok('필드: 몬스터 Lv·희귀도 표시', await ev(() => document.querySelectorAll('[data-fmon]').length >= 3 && /Lv\d/.test(document.querySelector('[data-fmon]').textContent)));
    const before = await ev(() => Object.values(HN.save.mats).reduce((a, b) => a + b, 0));
    const gp = await ev(() => !!document.querySelector('[data-fgath]')); if (gp) { await page.click('[data-fgath]'); await sleep(300); }
    ok('채집 포인트 소재 획득', gp && await ev((b) => Object.values(HN.save.mats).reduce((a, x) => a + x, 0) > b, before));
    await page.click('[data-fmon]'); await sleep(400); if (await ev(() => !!document.querySelector('[data-fgo]'))) { await page.click('[data-fgo]'); }
  } else { await page.click('[data-hunt="0"]'); }
  await sleep(1500); ok('몬스터 탭 → 사냥 시작', await ev(() => !!HN.G));
  await ev(() => { const m = HN.G.monsters[0]; m.lvl = Math.max(2, m.lvl); m.parts.forEach(pt => HN.damageMonsterForTest(m, pt.hp + 5, HN.G.player, { part: pt })); HN.G.monsters.forEach(x => { x.hp = 1; HN.damageMonsterForTest(x, 50, HN.G.player); }); }); await sleep(2500);
  ok('토벌 → 결과·보상', await ev(() => !HN.G && HN.result && HN.result.win && Object.keys(HN.result.drops).length > 0));
  await page.screenshot({ path: OUT + '/v5-02-result.png' });
  if (await ev(() => !!document.querySelector('[data-pur]'))) { await page.click('[data-pur]'); await sleep(300); await page.screenshot({ path: OUT + '/v5-09-purify-scene.png' }); }
  ok('결과: 정화 성공 장면 또는 실패 이유 대사', await ev(() => /계승자|앙금|혈통/.test(document.getElementById('ui').textContent)));
  // 방어구 제작
  await ev(() => { HN.save.mats['wolf:hide:3'] = 10; HN.save.mats['wolf:horn:3'] = 6; HN.save.codex.wolf.won = 3; HN.village(); });
  await page.click('[data-act="village"]').catch(() => {}); await sleep(200);
  await ev(() => document.querySelector('[data-tab="party"]').click()); await sleep(300);
  await page.click('[data-cgear="c1"]'); await sleep(300);
  const hp0 = await ev(() => +document.querySelector('.gearhd b:nth-of-type(2)').textContent);
  await page.click('[data-gcraft="wolf"]'); await sleep(300);
  const hp1 = await ev(() => +document.querySelector('.gearhd b:nth-of-type(2)').textContent);
  ok('동료 방어구 제작·장착 → HP 상승', hp1 > hp0, `${hp0}→${hp1}`);
  await page.click('[data-gslot="head"]'); await sleep(200); await page.click('[data-gcraft="wolf"]'); await sleep(200);
  ok('같은 종 2부위 세트 보너스', await ev(() => /세트 2\/3/.test(document.querySelector('.gearhd').textContent)));
  const id = await ev(() => HN.save.cgear[HN.save.cgear.length - 1].id); await page.click(`[data-gup="${id}"]`).catch(() => {}); await sleep(200);
  ok('방어구 강화', await ev(() => HN.save.cgear.some(g => g.lvl >= 2)));
  ok('장비 화면 스크롤 없음', await noScroll()); await page.screenshot({ path: OUT + '/v5-03-gear.png' });
  // 스토리
  await ev(() => { HN.save.comps[0].level = 10; HN.save.bond = { wolf: 99 }; document.querySelector('[data-act="gback"]').click(); }); await sleep(200);
  const st = await ev(() => !!document.querySelector('[data-story="c1"]'));
  if (st) { await page.click('[data-story="c1"]'); await sleep(300); await page.click('[data-chap="0"]'); await sleep(300);
    ok('개인 스토리 열림(한국어 본문)', await ev(() => (document.querySelector('.storytext')?.textContent || '').match(/[가-힣]/g)?.length > 200 && !/루루은|루루이 /.test(document.querySelector('.storytext').textContent)));
    ok('스토리 화면 스크롤 없음', await noScroll()); await page.screenshot({ path: OUT + '/v5-04-story.png' }); }
  else ok('개인 스토리 버튼', false);
  ok('JS 오류 없음', errors.length === 0, errors.slice(0, 3).join(' | '));
  console.log(`${pass}/${pass + fail} 통과`); await browser.close();
})();
