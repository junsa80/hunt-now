// v5 동료 = 무기 스승. 종마다 전문 무기 1종과 핵심 동작 3개. 사냥 중 시범 알림 + 30~60초 훈련(허수아비).
// key: main.js noteMove()가 기록하는 동작 키. 플레이어가 같은 동작을 FADE_N회 직접 쓰면 그 동작 알림은 더 안 뜸.
export const FADE_N = 5;
export const MENTOR = {
  wolf: { w: 'db', tech: '질풍 난무', moves: [{ k: 'fin', n: '5연 마무리', inp: '탭·탭·탭·탭·탭' }, { k: 'dance', n: '귀인 난무', inp: '꾹 누르기(유지)' }, { k: 'pd', n: '완벽 회피', inp: '공격 직전 휙' }] },
  witch: { w: 'bow', tech: '서리 화살', moves: [{ k: 'fin', n: '3연사', inp: '탭·탭·탭' }, { k: 'charge3', n: '3단 모아 쏘기', inp: '꾹 → 빨간 섬광에서 떼기' }, { k: 'pd', n: '완벽 회피', inp: '공격 직전 휙' }] },
  drake: { w: 'lance', tech: '용린 방벽', moves: [{ k: 'fin', n: '3연 찌르기', inp: '탭·탭·탭' }, { k: 'guard', n: '대방패 가드', inp: '공격 올 때 꾹' }, { k: 'pd', n: '완벽 회피', inp: '공격 직전 휙' }] },
  siren: { w: 'sns', tech: '물결 검무', moves: [{ k: 'fin', n: '4연 마무리', inp: '탭·탭·탭·탭' }, { k: 'guard', n: '방패 가드', inp: '공격 올 때 꾹' }, { k: 'pd', n: '완벽 회피', inp: '공격 직전 휙' }] },
  kitsune: { w: 'ls', tech: '여우 기인', moves: [{ k: 'fin', n: '3연 베기', inp: '탭·탭·탭' }, { k: 'spirit', n: '기인 베기', inp: '기력 모아서 꾹 → 떼기' }, { k: 'pd', n: '완벽 회피', inp: '공격 직전 휙' }] },
  harpy: { w: 'gs', tech: '폭풍 내려베기', moves: [{ k: 'fin', n: '3연 베기', inp: '탭·탭·탭' }, { k: 'charge3', n: '3단 모아베기', inp: '꾹 → 빨간 섬광에서 떼기' }, { k: 'pd', n: '완벽 회피', inp: '공격 직전 휙' }] },
};
// 스승 기술 1단: 훈련 완료 후, 그 동료를 편성하고 전문 무기를 들면 헌터 공격 +6%
export const TECH_T1 = 0.06;
