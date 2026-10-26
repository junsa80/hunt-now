// 성장 곡선 해석 시뮬 (node, 브라우저 없음): 사냥 Lv = HR 로 계속 이기는 플레이어가 긴급 의뢰(HR 3/6/9/10)에 닿을 때
// 헌터 HR·사냥 횟수와 동료 레벨이 몬스터 Lv 을 따라가는지. main.js endHunt 의 경험치 공식 그대로 (승리 share=1).
// node test/growth-v61.mjs [comp=30] [catchup=1.5]
import { LADDER } from '../lore.js';
const COMP_XP = +(process.argv[2] || 30), CATCH = +(process.argv[3] || 1.5);
const xpMul = (c, comps) => { if (comps.length < 2) return 1; const avg = comps.reduce((a, x) => a + x.level, 0) / comps.length; return c.level > avg + 3 ? 0.5 : c.level < avg - 2 ? CATCH : 1; };
function run(policy) {
  let hr = 1, hrXp = 0, hunts = 0; const comps = [], party = [], log = [];
  const join = (lvl) => { const c = { level: lvl, xp: 0, potential: Math.min(5, Math.max(1, Math.ceil(lvl / 2))) , at: hr }; comps.push(c); if (party.length < 3) party.push(c); else if (policy === 'swap') { party.sort((a, b) => a.level - b.level); party[0] = c; } };
  const hunt = (lvl, ladXp = 0) => { hunts++; hrXp += 40 + lvl * 20 + ladXp; while (hrXp >= hr * 100) { hrXp -= hr * 100; hr++; }
    for (const c of party) { c.xp += Math.round(COMP_XP * xpMul(c, comps)); while (c.xp >= c.level * 60 && c.level < 10 + c.potential * 4) { c.xp -= c.level * 60; c.level++; } } };
  const purifyAt = { 2: 2, 4: 4, 6: 6, 8: 8 }; // 그 HR 에 처음 오르면 그 Lv 몬스터 하나 정화 (보통 플레이)
  const done = new Set(); let li = 0;
  while (li < LADDER.length && hunts < 400) {
    if (purifyAt[hr] && !done.has(hr)) { done.add(hr); join(purifyAt[hr]); }
    const L = LADDER[li];
    if (hr >= L.hr) { const ml = Math.max(...L.mons.map(m => m.lvl)); log.push({ 의뢰: L.id, HR: hr, 사냥수: hunts, 몬스터Lv: ml, 동료Lv: party.map(c => c.level).join('/'), 최저차: ml - Math.min(...party.map(c => c.level)) }); hunt(ml, 100 * (li + 1)); li++; continue; }
    hunt(Math.min(hr, 15));
  }
  return log;
}
for (const p of ['keep', 'swap']) { console.log(`\n정책 ${p === 'keep' ? '처음 셋 유지' : '새 동료로 교체(가장 낮은 Lv 빼기)'} · 동료 경험치 ${COMP_XP}/사냥 · 따라잡기 ×${CATCH}`); console.table(run(p)); }
