// 동료 1명 편성 기준 해석 시뮬레이션: 몬스터 6종 × 특성(없음+6) = 42 상황에서 "정화 점수 기대치"를 비교.
// 실제 전투를 돌리는 게 아니라 synergy.js 수치 + 단순 사냥 모델(DPS·부위·피격)로 계산. 몬스터 고유 내성은 data.js 속성 그대로.
import { NICHE, MODS, MOD_KEYS, teamFx } from '../synergy.js';
import { SPECIES, WEAPON_TYPES, WEAPON_ORDER } from '../data.js';
import { MENTOR, mentorPassive } from '../mentor.js';
const SP = Object.keys(SPECIES), OUT = {};
function hunt(compSp, monSp, mod, wtype = 'sns') {
  const S = SPECIES[monSp], N = NICHE[compSp], { fx } = teamFx([{ species: compSp, role: 'dealer' }], wtype); if (MENTOR[compSp].w === wtype) fx.atk += mentorPassive({ level: 6 }); // 스승 패시브(Lv6, 훈련 전)
  let hp = S.hp * 2 * (mod === 'thick' ? 1.35 : 1); const ward = mod === 'ward' ? 0.5 : 1;
  const compElem = SPECIES[compSp].elem, weak = compElem === S.weak ? 1.35 * (mod === 'ward' ? 0.75 : 1) : 1;
  const hunter = 20 * (1 + fx.atk) * (1 + fx.weakPart * 0.4) /* 약점 부위 타격 비율 40% */ * (1 + fx.statusHit * (mod === 'thick' ? 0.8 : 0.4) * ward); // 상태 이상 유지율 40%(거구는 오래 걸려 있어 80%)
  const comp = 9 * (N.self.atk || 1) * weak;
  const dps = hunter + comp; const t = hp / dps;
  const partRate = (1 + fx.part + fx.weakPart * 0.6) * (mod === 'hard' ? 0.5 : 1);
  const parts = Math.min(1, 0.55 * partRate) * S.parts.length; // 기대 파괴 부위 수
  let mdps = S.dmg * 0.18 * (mod === 'fury' ? 1.35 : 1) * (mod === 'swift' ? 1.3 : 1) * (1 - fx.guardAll);
  const rageT = mod === 'rage' ? 1 : 0.5; mdps *= 1 + rageT * (mod === 'rage' ? 0.4 : 0.15) * (1 - Math.min(1, fx.rage));
  const dodge = 0.45 + fx.pd * (mod === 'swift' ? 2.2 : 0.7); // 회피 성공률
  const taken = Math.max(0, mdps * t * (1 - dodge) - fx.regen * 150 * t);
  const hits = mdps * t * (1 - dodge) / (S.dmg * 0.9); // 피격 횟수는 회복과 무관
  const sc = { time: Math.max(0, 20 * (1 - t / 75)), hp: Math.max(0, 20 * (1 - taken / 150)), parts: 30 * parts / S.parts.length, hits: Math.max(0, 15 - hits * 3), elem: weak > 1 ? 4 : 0 };
  return Math.round(Object.values(sc).reduce((a, b) => a + b, 0) * 10) / 10;
}
console.log('무기 ↔ 동료 매핑:'); console.table(SP.map(c => ({ 동료: SPECIES[c].short, 무기: WEAPON_TYPES[MENTOR[c].w].n, 역할: NICHE[c].n, 약점: NICHE[c].weak, 스승기술: MENTOR[c].tech })).concat([{ 동료: '(없음)', 무기: '해머', 역할: '헌터 전용', 약점: '-', 스승기술: '-' }]));
const wb = {}; SP.forEach(c => wb[c] = 0); let tot = 0;
for (const wt of WEAPON_ORDER) for (const m of SP) for (const mod of ['none', ...MOD_KEYS]) { const sc = SP.map(c => [c, hunt(c, m, mod, wt)]).sort((a, b) => b[1] - a[1]); wb[sc[0][0]]++; tot++; }
console.log(`무기 7종 포함 ${tot} 상황 1위 횟수:`, JSON.stringify(wb), '최대 비율', Math.round(Math.max(...Object.values(wb)) / tot * 100) + '%');
const best = {}; SP.forEach(c => best[c] = 0); const rows = [];
for (const m of SP) for (const mod of ['none', ...MOD_KEYS]) { const sc = SP.map(c => [c, hunt(c, m, mod)]).sort((a, b) => b[1] - a[1]); best[sc[0][0]]++; rows.push({ m, mod, top: sc[0][0], s: sc[0][1], 2: sc[1][0] + ' ' + sc[1][1], low: sc[5][0] + ' ' + sc[5][1] }); }
const avg = {}; for (const c of SP) { let s = 0, n = 0; for (const m of SP) for (const mod of ['none', ...MOD_KEYS]) { s += hunt(c, m, mod); n++; } avg[c] = Math.round(s / n * 10) / 10; }
console.table(rows.map(r => ({ 몬스터: r.m, 특성: r.mod, 최선: r.top, 점수: r.s, 차선: r[2], 최하: r.low })));
console.log('상황별 1위 횟수(42 상황):', JSON.stringify(best)); console.log('전체 평균 점수:', JSON.stringify(avg));
const max = Math.max(...Object.values(best)); console.log(Object.values(best).every(v => v >= 1) && max <= 42 * 0.4 ? 'OK: 모든 동료가 1위 상황이 있고, 한 동료가 40% 넘게 독점하지 않음' : 'NG: 독점 또는 1위 없는 동료 있음');
// v5.1 동료 피해 비중: 3인 파티, 0.5초 단위로 게임과 같은 소프트 상한(누적 비중 25% 초과 시 동료 피해 ×0.2) 적용
{ const CAP = 0.25, shares = [], raws = [];
  for (const wt of WEAPON_ORDER) for (const m of SP) for (let k = 0; k < SP.length; k++) { const party = [SP[k], SP[(k + 2) % 6], SP[(k + 4) % 6]];
    const { fx } = teamFx(party.map(s => ({ species: s, role: 'dealer' })), wt); const H = 20 * (1 + fx.atk) * 1.12;
    const C = party.reduce((a, s) => a + 9 * (NICHE[s].self.atk || 1) * (SPECIES[s].elem === SPECIES[m].weak ? 1.35 : 1), 0);
    let h = 0, c = 0; const hp = SPECIES[m].hp * 4; while (h + c < hp) { h += H * 0.5; let d = C * 0.5; if (h + c > 200 && c / (h + c) > CAP) d *= 0.2; c += d; }
    shares.push(c / (h + c)); raws.push(C / (H + C)); }
  const st = a => { a.sort((x, y) => x - y); return `평균 ${(a.reduce((x, y) => x + y, 0) / a.length * 100).toFixed(1)}% · 최소 ${(a[0] * 100).toFixed(1)}% · 최대 ${(a[a.length - 1] * 100).toFixed(1)}%`; };
  console.log(`동료 피해 비중(3인 파티, ${shares.length} 상황) — 상한 전: ${st(raws)} / 상한 후: ${st(shares)}`); }
