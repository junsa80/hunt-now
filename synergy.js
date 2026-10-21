// v5 동료 역할·시너지 (순수 데이터 + 계산. 브라우저·node 시뮬레이션 공용, DOM/Three 의존 없음)
// 종마다 고유 역할(niche)과 약점이 있어 "만능 최강"이 없도록 설계. 수치는 test/sim-comp.mjs로 점검.
export const NICHE = {
  wolf: { n: '부위 파괴', icon: '🪓', d: '파티 부위 피해 +45%', weak: '받는 피해 +15%', fx: { part: 0.45 }, self: { dmgTaken: 1.15 } },
  witch: { n: '빙결 세팅', icon: '❄', d: '상태 이상 중인 몬스터에 헌터 피해 +20%', weak: 'HP -15%', fx: { statusHit: 0.2 }, self: { hp: 0.85 } },
  drake: { n: '탱커', icon: '🛡', d: '도발로 공격을 끌어 헌터 받는 피해 -18%', weak: '공격 -25%', fx: { guardAll: 0.18 }, self: { atk: 0.75 } },
  siren: { n: '회복', icon: '💧', d: '파티 자동 회복(초당 최대 HP 0.4%)', weak: '공격 -20%', fx: { regen: 0.004 }, self: { atk: 0.8 } },
  harpy: { n: '기동', icon: '🪶', d: '완벽 회피 판정 +0.1초 · 완벽 회피 시 특수기 +8', weak: 'HP -20%', fx: { pd: 0.1, pdSp: 8 }, self: { hp: 0.8 } },
  kitsune: { n: '약점 노출', icon: '🦊', d: '약점 부위 피해 +30% · 분노한 몬스터 피해 -50%', weak: '방어 -30%', fx: { weakPart: 0.3, rage: 0.5 }, self: { def: 0.7 } },
};
// 무기 × 동료 조합 (이름 붙은 작은 보너스)
export const WEAPON_SYN = [
  { w: ['gs', 'hammer'], sp: 'witch', n: '얼음 망치질', d: '상태 이상 중 헌터 피해 +15% 추가', fx: { statusHit: 0.15 } },
  { w: ['db', 'sns'], sp: 'drake', n: '번개 연쇄', d: '헌터 공격 +10%', fx: { atk: 0.1 } },
  { w: ['bow'], sp: 'harpy', n: '바람 화살', d: '헌터 공격 +10%', fx: { atk: 0.1 } },
  { w: ['lance'], sp: 'drake', n: '이중 방벽', d: '받는 피해 -10% 추가', fx: { guardAll: 0.1 } },
  { w: ['ls'], sp: 'kitsune', n: '여우 기인', d: '약점 부위 피해 +15% 추가', fx: { weakPart: 0.15 } },
  { w: ['hammer', 'gs'], sp: 'wolf', n: '분쇄', d: '부위 피해 +20% 추가', fx: { part: 0.2 } },
  { w: ['sns', 'lance'], sp: 'siren', n: '물의 방패', d: '회복량 +50%', fx: { regen: 0.003 } },
  { w: ['db', 'ls'], sp: 'harpy', n: '질풍 연격', d: '완벽 회피 판정 +0.06초 추가', fx: { pd: 0.06 } },
];
// 동료 조합 (2~3명). 서로 다른 역할(딜러/탱커/힐러/버퍼/디버퍼)일수록 보너스
export const PAIR_SYN = [
  { sp: ['drake', 'siren'], n: '철벽 성소', d: '받는 피해 -10%', fx: { guardAll: 0.1 } },
  { sp: ['wolf', 'kitsune'], n: '사냥 본능', d: '부위 피해 +15%', fx: { part: 0.15 } },
  { sp: ['witch', 'harpy'], n: '서리 바람', d: '상태 이상 중 피해 +10%', fx: { statusHit: 0.1 } },
  { sp: ['wolf', 'drake'], n: '선봉과 방패', d: '헌터 공격 +6%', fx: { atk: 0.06 } },
  { sp: ['siren', 'kitsune'], n: '달밤의 물가', d: '분노 피해 -15% 추가', fx: { rage: 0.15 } },
];
// 희귀·전설 개체 특성: 흔히 강한 동료가 약해지는 상황을 만든다
export const MODS = {
  hard: { n: '단단한 외피', icon: '🪨', d: '부위 피해 -50%', rec: ['wolf', 'kitsune'] },
  fury: { n: '광폭', icon: '💢', d: '공격력 +35%', rec: ['drake', 'siren'] },
  swift: { n: '신속', icon: '💨', d: '공격 간격 -30%', rec: ['harpy', 'drake'] },
  thick: { n: '거구', icon: '⛰', d: '체력 +35%', rec: ['witch', 'wolf'] },
  rage: { n: '격노', icon: '🔥', d: '바로 분노 · 분노 중 피해 +40%', rec: ['kitsune', 'siren'] },
  ward: { n: '속성 결계', icon: '🔰', d: '속성 피해·상태 이상 -50%', rec: ['wolf', 'drake'] },
};
export const MOD_KEYS = Object.keys(MODS);
export function teamFx(party, wtype) { // party: [{species, role}]
  const fx = { part: 0, statusHit: 0, guardAll: 0, regen: 0, pd: 0, pdSp: 0, weakPart: 0, rage: 0, atk: 0 }, named = [];
  const add = (o) => { for (const k in o) fx[k] += o[k]; };
  for (const c of party) add(NICHE[c.species].fx);
  for (const s of WEAPON_SYN) if (s.w.includes(wtype) && party.some(c => c.species === s.sp)) { add(s.fx); named.push(s.n); }
  const sps = new Set(party.map(c => c.species));
  for (const s of PAIR_SYN) if (s.sp.every(x => sps.has(x))) { add(s.fx); named.push(s.n); }
  const roles = new Set(party.map(c => c.role));
  if (party.length >= 2 && roles.size === party.length) { const t = party.length === 3; add({ atk: t ? 0.08 : 0.05, guardAll: t ? 0.06 : 0 }); named.push(t ? '삼색 진형(역할 3종)' : '호흡(역할 2종)'); }
  fx.guardAll = Math.min(0.45, fx.guardAll); return { fx, named };
}
// 로스터 보너스: Lv5 이상 동료 수
export const ROSTER = [{ n: 2, d: '헌터 HP +5%', fx: { hp: 0.05 } }, { n: 4, d: '헌터 공격 +5%', fx: { atk: 0.05 } }, { n: 6, d: '특수기 게이지 +20%', fx: { sp: 0.2 } }];
export function rosterFx(comps) { const k = comps.filter(c => c.level >= 5).length, fx = { hp: 0, atk: 0, sp: 0 }; for (const r of ROSTER) if (k >= r.n) for (const x in r.fx) fx[x] += r.fx[x]; return { k, fx }; }
// 경험치 보정: 평균보다 많이 높은 동료는 덜, 뒤처진 동료는 더 (따라잡기)
export function xpMul(c, comps) { if (comps.length < 2) return 1; const avg = comps.reduce((a, x) => a + x.level, 0) / comps.length; return c.level > avg + 3 ? 0.5 : c.level < avg - 2 ? 1.5 : 1; }
