// v5.2 봇 검증: "버티며 때리고 물약만" 봇 vs "예고 보고 회피 + 빈틈에 약점 공격" 봇. 솔로(동료 없음), 몬스터 Lv4·Lv6, 6종 × 무기 2종.
const puppeteer = require('puppeteer-core');
const URL = process.env.URL || 'http://127.0.0.1:18923/', SPEED = +process.env.SPEED || 4;
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await b.newPage(); await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto(URL); await page.evaluate(() => localStorage.clear()); await page.reload(); await sleep(1500); await page.evaluate(() => HN.skipIntro());
  const out = []; const SPS = ['wolf', 'witch', 'drake', 'siren', 'kitsune', 'harpy'], LV = (process.env.LV || '4,6').split(',').map(Number), WS = (process.env.WS || 'sns,gs').split(',');
  for (const bot of ['tank', 'skill']) for (const lv of LV) for (const wt of WS) for (const sp of SPS) {
    await page.evaluate((bot, lv, wt, sp, SPEED) => {
      const S = HN.save; S.party = []; S.weapons.forEach(w => { w.lvl = lv; }); S.equip.weapon = S.weapons.find(w => w.type === wt).id; S.notice = null;
      HN.startHuntNode({ id: 0, lvl: lv, mons: [{ sp, lvl: lv }] }); window.__simSpeed = SPEED;
      const fwd = (a) => ({ x: Math.sin(a), z: Math.cos(a) }), ang = (a, b) => Math.atan2(b.x - a.x, b.z - a.z);
      const threats = (m, x, z, horizon) => { const c = m.cur; if (!c || m.ai !== 'windup') return false; return c.list.some(l => { if (l.fired) return false; const rem = l.delay + l.dur * (1 + (l.hold || 0) / l.dur) - c.t; return rem < horizon && HN.inShape(l.sh, x, z); }); };
      window.__bot = (dt) => { const G = HN.G; if (!G || G.over) return; const p = G.player, m = G.monsters.find(x => x.hp > 0); if (!m || p.hp <= 0) return; const now = HN.nowT();
        const d = Math.hypot(m.pos.x - p.pos.x, m.pos.z - p.pos.z), toM = ang(p.pos, m.pos);
        if (bot === 'tank') { // 정면에 버티며 계속 공격, 피 45% 아래면 물약
          if (p.hp < p.maxHp * 0.45 && G.potions > 0) { HN.drink(); return; }
          const spot = { x: m.pos.x + fwd(m.face).x * 2.4, z: m.pos.z + fwd(m.face).z * 2.4 }; const ds = Math.hypot(spot.x - p.pos.x, spot.z - p.pos.z);
          if (ds > 1.2 && d > 2.6) { HN.input.botDir = ang(p.pos, spot); } else { HN.input.botDir = null; p.face = toM; HN.input.tapBuf = now; } return; }
        // skill: 곧 맞을 공격이면 안전한 방향으로 회피
        if (threats(m, p.pos.x, p.pos.z, 0.26)) { let best = null; for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2, e = { x: p.pos.x + Math.sin(a) * 3.4, z: p.pos.z + Math.cos(a) * 3.4 }; if (!threats(m, e.x, e.z, 1.5)) { best = a; break; } } if (HN.roll(best ?? toM + Math.PI)) return; }
        const heavyW = wt === 'gs' || wt === 'hammer'; const window_ = m.ai === 'recover' || m.ai === 'stun' || m.ai === 'topple' || (!heavyW && m.ai === 'move' && d < 3.5); // 무거운 무기는 빈틈에만 휘두름
        if (p.hp < p.maxHp * 0.4 && G.potions > 0 && (m.ai === 'recover' || m.ai === 'topple' || d > 6) ) { HN.input.botDir = null; HN.drink(); return; }
        if (window_ || m.ai === 'move') { // 빈틈: 측면(머리 쪽 대각)에서 공격
          const spot = { x: m.pos.x + fwd(m.face + 0.9).x * 2.3, z: m.pos.z + fwd(m.face + 0.9).z * 2.3 }; const ds = Math.hypot(spot.x - p.pos.x, spot.z - p.pos.z);
          if (ds > 1.0 && !(window_ && d < 2.8)) HN.input.botDir = ang(p.pos, spot); else { HN.input.botDir = null; p.face = toM; if (window_) HN.input.tapBuf = now; } }
        else { // 공격 중: 위험 범위 밖에서 대기
          if (threats(m, p.pos.x, p.pos.z, 9)) { let best = null; for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2, e = { x: p.pos.x + Math.sin(a) * 1.5, z: p.pos.z + Math.cos(a) * 1.5 }; if (!threats(m, e.x, e.z, 9)) { best = a; break; } } HN.input.botDir = best; } else HN.input.botDir = null; } };
    }, bot, lv, wt, sp, SPEED);
    const t0 = Date.now(); let r = null; while (Date.now() - t0 < 140000) { await sleep(500); r = await page.evaluate(() => HN.G && HN.G.over ? 'over' : (!HN.G ? 'done' : null)); if (r === 'done') break; }
    await sleep(600);
    const res = await page.evaluate(() => { const r = HN.result; window.__bot = null; window.__simSpeed = 1; HN.input.botDir = null; return r ? { win: r.win, hits: r.st.hits, perfect: r.st.perfect, potions: r.st.potions, broken: r.st.broken, win_: r.st.winDealt, out: r.st.outDealt, dealt: r.st.dealt, inter: r.st.interrupts || 0, tip: r.tip?.k, atkN: r.st.atkN, bigN: r.st.bigN, winT: +(r.st.winT || 0).toFixed(1), bigPct: r.st.bigPct || [], t: +(r.st.dur || 0).toFixed(1), left: Math.round(r.sc.time / 20 * 75) } : null; });
    out.push({ bot, lv, wt, sp, ...res }); console.log(JSON.stringify(out[out.length - 1]));
    await page.evaluate(() => HN.village());
  }
  const allBig = out.flatMap(o => o.bigPct || []); if (allBig.length) console.log(`큰 기술 피격 평균 ${(allBig.reduce((a, b) => a + b, 0) / allBig.length * 100).toFixed(0)}% (최소 ${(Math.min(...allBig) * 100).toFixed(0)}% · 최대 ${(Math.max(...allBig) * 100).toFixed(0)}%) n=${allBig.length}`);
  { const n = out.reduce((a, o) => a + (o.atkN || 0), 0), T = out.reduce((a, o) => a + (o.t || 0), 0), wt = out.reduce((a, o) => a + (o.winT || 0), 0); console.log(`평균 주고받기 주기(몬스터 공격 간격) ${(T / Math.max(1, n)).toFixed(2)}초 · 몬스터 공격 수 ${n} · 빈틈 총 ${wt.toFixed(0)}초`); }
  const agg = {}; for (const o of out) { const k = `${o.bot} Lv${o.lv}`; const a = agg[k] = agg[k] || { n: 0, win: 0, win_: 0, dealt: 0, hits: 0, pot: 0 }; a.n++; a.win += o.win ? 1 : 0; a.win_ += o.win_ || 0; a.dealt += o.dealt || 0; a.hits += o.hits || 0; a.pot += o.potions || 0; }
  for (const [k, a] of Object.entries(agg)) console.log(`${k}: 승률 ${Math.round(a.win / a.n * 100)}% (${a.win}/${a.n}) · 빈틈 피해 비율 ${Math.round(a.win_ / Math.max(1, a.dealt) * 100)}% · 평균 피격 ${(a.hits / a.n).toFixed(1)} · 평균 물약 ${(a.pot / a.n).toFixed(1)}`);
  console.log('JS 오류:', errors.length ? errors.slice(0, 3).join(' | ') : '없음'); await b.close();
})();
