// v5 동료 = 무기 스승. 종마다 전문 무기 1종과 핵심 동작 3개. 사냥 중 시범 알림 + 30~60초 훈련(허수아비).
// key: main.js noteMove()가 기록하는 동작 키. 플레이어가 같은 동작을 FADE_N회 직접 쓰면 그 동작 알림은 더 안 뜸.
export const FADE_N = 5;
export const MENTOR = {
  wolf: { w: 'gs', tech: '홍련 분쇄', moves: [{ k: 'fin', n: '3연 베기', inp: '탭·탭·탭' }, { k: 'charge3', n: '3단 모아베기', inp: '꾹 → 빨간 섬광에서 떼기' }, { k: 'pd', n: '완벽 회피', inp: '공격 직전 휙' }] },
  witch: { w: 'bow', tech: '서리 화살', moves: [{ k: 'fin', n: '3연사', inp: '탭·탭·탭' }, { k: 'charge3', n: '3단 모아 쏘기', inp: '꾹 → 빨간 섬광에서 떼기' }, { k: 'pd', n: '완벽 회피', inp: '공격 직전 휙' }] },
  drake: { w: 'lance', tech: '용린 방벽', moves: [{ k: 'fin', n: '3연 찌르기', inp: '탭·탭·탭' }, { k: 'guard', n: '대방패 가드', inp: '공격 올 때 꾹' }, { k: 'pd', n: '완벽 회피', inp: '공격 직전 휙' }] },
  siren: { w: 'sns', tech: '물결 검무', moves: [{ k: 'fin', n: '4연 마무리', inp: '탭·탭·탭·탭' }, { k: 'guard', n: '방패 가드', inp: '공격 올 때 꾹' }, { k: 'pd', n: '완벽 회피', inp: '공격 직전 휙' }] },
  kitsune: { w: 'ls', tech: '여우 기인', moves: [{ k: 'fin', n: '3연 베기', inp: '탭·탭·탭' }, { k: 'spirit', n: '기인 베기', inp: '기력 모아서 꾹 → 떼기' }, { k: 'pd', n: '완벽 회피', inp: '공격 직전 휙' }] },
  harpy: { w: 'db', tech: '질풍 난무', moves: [{ k: 'fin', n: '5연 마무리', inp: '탭·탭·탭·탭·탭' }, { k: 'dance', n: '귀인 난무', inp: '꾹 누르기(유지)' }, { k: 'pd', n: '완벽 회피', inp: '공격 직전 휙' }] },
};
// v5.1: 동료는 전문 무기 1종만 쓴다(6종 ↔ 7무기, 해머는 헌터 전용). 역할은 무기에서 나온다.
export const HUNTER_ONLY = ['hammer'];
// 스승 보너스: 같은 무기를 든 헌터 + 그 동료가 편성돼 있을 때만.
//  패시브 = 공격 +3% + 동료 Lv당 0.4% (최대 +9%) · 기술 단계: 1단 훈련 완료, 2단 Lv8+인연 10, 3단 Lv12+인연 20
export const TECH_T1 = 0.06;
export const TIER_REQ = [null, { train: true }, { lvl: 8, bond: 10 }, { lvl: 12, bond: 20 }];
export const TECH_STEPS = ['1단(훈련 완료): 헌터 공격 +6%', '2단(Lv8·인연 10): 공격 +4% · 완벽 회피 판정 +0.03초', '3단(Lv12·인연 20): 특수기 게이지 +15%'];
export function mentorPassive(c) { return Math.min(0.09, 0.03 + 0.004 * c.level); }
export function mentorTier(c, save) { const b = save.bond?.[c.species] || 0; let t = 0; if (save.mentor?.[c.species] >= 1) t = 1; if (t >= 1 && c.level >= 8 && b >= 10) t = 2; if (t >= 2 && c.level >= 12 && b >= 20) t = 3; return t; }
