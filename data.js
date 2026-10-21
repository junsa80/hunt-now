// 게임 데이터 (몬스터 종, 무기, 대사)
export const ELEM = { none: { n: '무속성', c: 'none', col: 0xffffff }, fire: { n: '화염', c: 'fire', col: 0xff7a2a }, ice: { n: '빙결', c: 'ice', col: 0x7fd8ff }, thunder: { n: '번개', c: 'thunder', col: 0xffe14a }, water: { n: '수류', c: 'water', col: 0x3aa0ff } };
export const STATUS = { fire: { n: '화상', key: 'burn' }, ice: { n: '빙결', key: 'freeze' }, thunder: { n: '마비', key: 'para' }, water: { n: '수속성 약화', key: 'soak' } };
export const SPECIES = {
  wolf: { name: '화염 늑대 루가', short: '루가', elem: 'fire', weak: 'thunder', img: 'img/enemy_wolf.webp', hp: 520, dmg: 22, speed: 5.2, scale: 1.5,
    look: { skin: 0xf5d2bd, hair: 0xd8452a, eye: '#ffb02a', cloth: 0x3a2a2a, cloth2: 0x8a2a1a, accent: 0xffb02a, hairStyle: 'long', horns: 0xfff1d0, ears: true, tail: 0xd8452a, weapon: 'claw', weaponColor: 0xfff1d0, angry: true },
    parts: [{ key: 'horn', n: '뿔', anchor: 'horn1' }, { key: 'tail', n: '꼬리', anchor: 'tailTip' }],
    roles: ['dealer', 'buffer'], trait: { n: '야성의 질주', d: '공격 속도 +20%' },
    lines: { meet: '불꽃 냄새가 나는 사냥꾼이네? 따라올 수 있으면 와 봐!', break: '내 뿔을…! 이제 진심이야!', win: '하아… 오늘은 네가 이겼어.', purify: '이 따뜻한 느낌… 너랑 같이 달려도 될까?', lose: '느려, 느려! 다음엔 더 빨리 와.' } },
  witch: { name: '빙결 마녀 셀레스', short: '셀레스', elem: 'ice', weak: 'fire', img: null /* 사람형 그림이라 짐승형 렌더로 대체 (ART_PROMPTS.md) */, hp: 440, dmg: 20, speed: 3.4, scale: 1.45, want: 6,
    look: { skin: 0xf2e6f0, hair: 0xbfe4ff, eye: '#4ac0ff', cloth: 0x2a3a7a, cloth2: 0x5a7ad8, accent: 0xe0f4ff, hairStyle: 'twin', horns: 0xbfe4ff, wings: 0xa0d8ff, weapon: 'staff', weaponColor: 0x7fd8ff, angry: true },
    parts: [{ key: 'crown', n: '얼음 관', anchor: 'horn1' }, { key: 'wing', n: '날개', anchor: 'wing' }],
    roles: ['healer', 'debuffer'], trait: { n: '서리 손길', d: '공격 시 빙결 축적' },
    lines: { meet: '여긴 내 정원이야. 발밑을 조심하렴.', break: '내 왕관에 금이…! 용서 못 해!', win: '얼음이… 녹아 버렸네.', purify: '차갑지 않은 손은 처음이야. 함께 갈게.', lose: '얼어붙은 채로 잠시 쉬어 가렴.' } },
  drake: { name: '뇌룡 기사 드라카', short: '드라카', elem: 'thunder', weak: 'ice', img: 'img/enemy_drake.webp', hp: 680, dmg: 30, speed: 3.0, scale: 1.8,
    look: { skin: 0xf0cdb5, hair: 0x3a2a5a, eye: '#ffe14a', cloth: 0x4a4a5a, cloth2: 0x6a4ac8, accent: 0xffe14a, hairStyle: 'pony', horns: 0xffe14a, wings: 0x6a4ac8, tail: 0x6a4ac8, weapon: 'hammer', weaponColor: 0xc8c8e0, angry: true },
    parts: [{ key: 'horn', n: '뿔', anchor: 'horn1' }, { key: 'wing', n: '날개', anchor: 'wing' }, { key: 'tail', n: '꼬리', anchor: 'tailTip' }],
    roles: ['tank', 'dealer'], trait: { n: '용린 갑옷', d: '받는 피해 -20%' },
    lines: { meet: '기사의 결투다. 정면으로 받아 봐라!', break: '크윽, 용의 긍지가…! 좋다, 더 와라!', win: '훌륭한 일격이었다. 인정하지.', purify: '이 검, 이제부터 너를 위해 휘두르겠다.', lose: '아직 멀었다. 다시 단련하고 와라.' } },
  siren: { name: '수류 인어 마리나', short: '마리나', elem: 'water', weak: 'thunder', img: null, hp: 500, dmg: 21, speed: 3.6, scale: 1.5, want: 5,
    look: { skin: 0xf6e2d6, hair: 0x2a9ad8, eye: '#2ae0ff', cloth: 0x1a5a8a, cloth2: 0x38c8d8, accent: 0xf0f8ff, hairStyle: 'long', horns: 0xbff4ff, tail: 0x38c8d8, weapon: 'staff', weaponColor: 0x3aa0ff, angry: true },
    parts: [{ key: 'crown', n: '산호 관', anchor: 'horn1' }, { key: 'tail', n: '지느러미', anchor: 'tailTip' }],
    roles: ['healer', 'buffer'], trait: { n: '물의 축복', d: '자동 회복(초당 0.5%)' },
    lines: { meet: '파도 소리 들려? 이 물가는 내 무대야!', break: '내 산호가…! 파도가 화를 낼 거야!', win: '물결이… 잔잔해졌네.', purify: '네 곁이라면 노래가 더 멀리 퍼질 것 같아.', lose: '거품처럼 사라져 버렸네. 또 와!' } },
  kitsune: { name: '여우불 무녀 코하쿠', short: '코하쿠', elem: 'fire', weak: 'water', img: null, hp: 560, dmg: 24, speed: 4.4, scale: 1.45, want: 2.8,
    look: { skin: 0xf8e0cc, hair: 0xf0a040, eye: '#ff5a3a', cloth: 0xf4f0ea, cloth2: 0xc8283a, accent: 0xffe14a, hairStyle: 'long', ears: true, tail: 0xf0a040, horns: 0xffffff, weapon: 'staff', weaponColor: 0xff7a2a, angry: true },
    parts: [{ key: 'ear', n: '귀 장식', anchor: 'horn1' }, { key: 'tail', n: '꼬리', anchor: 'tailTip' }],
    roles: ['debuffer', 'dealer'], trait: { n: '여우 홀림', d: '공격 시 화상 축적' },
    lines: { meet: '후후, 길을 잃은 사냥꾼이네. 여우불이 안내해 줄게.', break: '내 방울이…! 장난은 여기까지야.', win: '여우불이 꺼졌어… 대단하네.', purify: '홀린 건 내 쪽이었나 봐. 같이 갈래.', lose: '홀려 버렸지? 다음엔 정신 똑바로 차려.' } },
  harpy: { name: '폭풍 하피 실피', short: '실피', elem: 'thunder', weak: 'ice', img: null, hp: 470, dmg: 23, speed: 5.0, scale: 1.4, want: 3.0,
    look: { skin: 0xf2d8c4, hair: 0x6ad86a, eye: '#e0ff4a', cloth: 0x2a4a3a, cloth2: 0x8ad84a, accent: 0xffe14a, hairStyle: 'twin', horns: 0xffe14a, wings: 0x9ae86a, weapon: 'claw', weaponColor: 0xffe14a, angry: true },
    parts: [{ key: 'wing', n: '날개', anchor: 'wing' }, { key: 'crest', n: '깃털 관', anchor: 'horn1' }],
    roles: ['buffer', 'dealer'], trait: { n: '순풍', d: '이동·공격 속도 +15%' },
    lines: { meet: '하늘에서 보니 다 보여! 피할 수 있으면 피해 봐!', break: '깃털이 빠졌잖아! 이제 화났어!', win: '바람이 멎었네… 내가 졌어.', purify: '너랑 같이라면 더 높이 날 수 있을 것 같아!', lose: '바람보다 느리네~ 다음에 봐!' } },
};
export const ROLES = { dealer: '딜러', tank: '탱커', healer: '힐러', buffer: '버퍼', debuffer: '디버퍼' };
export const ROLE_DESC = { dealer: '몬스터에 붙어 꾸준히 공격', tank: '도발로 공격을 끌고 방어 자세', healer: '체력 낮은 아군 회복', buffer: '주기적으로 파티 공격력 +25%', debuffer: '주기적으로 몬스터 받는 피해 +25%·둔화' };
export const WEAPON_TYPES = {
  // hold: 길게 누를 때 동작 / combo: 각 타 길이(초) / hitAt: 타격 시점(비율) / mult: 배율 / range: 사거리
  sns: { n: '한손검', icon: '🗡', base: 10, hold: 'guard', desc: '빠른 4연속 · 길게=방패 가드(직전 가드 시 반격 찬스) · 가드 중 탭=방패 치기', combo: [0.26, 0.26, 0.3, 0.42], hitAt: 0.3, mult: [1, 1, 1.15, 1.6], range: 2.0,
    sp: { n: '퍼펙트 러시', dur: 1.3, hits: [0.15, 0.3, 0.45, 0.6, 0.78, 1.05], mult: [0.9, 0.9, 1, 1, 1.2, 2.2], dash: 3 } },
  gs: { n: '대검', icon: '⚔', base: 15, hold: 'charge', desc: '묵직한 3연속 · 길게=모아베기 3단계 (흰→노랑→빨강 섬광에서 손 떼기)', combo: [0.55, 0.6, 0.8], hitAt: 0.45, mult: [1.6, 1.8, 2.6], range: 2.7, charge: [2.6, 4.2, 6.6], chargeStep: 0.5,
    sp: { n: '참 모아베기', dur: 1.6, hits: [1.2], mult: [11], dash: 0 } },
  ls: { n: '태도', icon: '🌙', base: 12, hold: 'spirit', desc: '긴 사거리 3연속 · 맞히면 기력 게이지 상승 · 길게=기인 베기(기력 25 소모, 기력 단계 상승: 백→황→적, 공격력 +10%/단계)', combo: [0.34, 0.36, 0.5], hitAt: 0.35, mult: [1.2, 1.3, 1.7], range: 2.9, chargeStep: 0.45,
    sp: { n: '기인 투구 가르기', dur: 1.4, hits: [0.5, 1.1], mult: [2, 6], dash: 4 } },
  db: { n: '쌍검', icon: '✦', base: 7, hold: 'dance', desc: '매우 빠른 5연속(한 번에 2타) · 길게=귀인 난무(누르는 동안 연속 베기, 최대 2초)', combo: [0.2, 0.2, 0.22, 0.22, 0.34], hitAt: 0.3, mult: [0.55, 0.55, 0.6, 0.6, 0.9], double: true, range: 1.8,
    sp: { n: '천상의 칼춤', dur: 1.5, hits: [0.1, 0.22, 0.34, 0.46, 0.58, 0.7, 0.82, 0.94, 1.06, 1.3], mult: [0.7, 0.7, 0.7, 0.7, 0.7, 0.7, 0.7, 0.7, 0.7, 2.5], dash: 2 } },
  hammer: { n: '해머', icon: '🔨', base: 14, hold: 'charge', desc: '3연속 내려치기 · 길게=모으기 3단계(3단계=회전 빅뱅) · 머리(관·뿔) 타격 시 기절 수치 누적', combo: [0.48, 0.5, 0.7], hitAt: 0.45, mult: [1.4, 1.6, 2.4], range: 2.2, charge: [2.2, 3.4, 5.6], chargeStep: 0.45, ko: true,
    sp: { n: '빅뱅 러시', dur: 1.5, hits: [0.25, 0.5, 0.75, 1.25], mult: [1.4, 1.4, 1.6, 5], dash: 1.5 } },
  lance: { n: '랜스', icon: '🛡', base: 11, hold: 'counter', desc: '3연속 찌르기 · 길게=대방패 가드(피해 85% 감소) · 가드 성공 직후 손 떼면 카운터 찌르기 ×2.8', combo: [0.32, 0.32, 0.46], hitAt: 0.35, mult: [1.1, 1.1, 1.5], range: 3.0, thrust: true,
    sp: { n: '돌격 찌르기', dur: 1.5, hits: [0.2, 0.4, 0.6, 0.8, 1.0, 1.35], mult: [0.9, 0.9, 0.9, 0.9, 0.9, 3], dash: 9 } },
  bow: { n: '활', icon: '🏹', base: 9, hold: 'charge', ranged: true, desc: '원거리 · 탭=속사(3연사 콤보) · 길게=모아 쏘기 3단계(3단계는 3갈래 확산) · 회피하며 거리 유지', combo: [0.24, 0.24, 0.36], hitAt: 0.35, mult: [0.8, 0.8, 1.1], range: 16, charge: [1.6, 2.4, 3.2], chargeStep: 0.4,
    sp: { n: '용의 일격', dur: 1.3, hits: [1.0], mult: [9], dash: -1.5, pierce: true } },
};
export const WEAPON_ORDER = ['sns', 'gs', 'ls', 'db', 'hammer', 'lance', 'bow'];
export const ELEM_SRC = { fire: 'wolf', ice: 'witch', thunder: 'drake', water: 'siren' };
export const QUAL = ['', '하급', '중급', '상급'];
export const qualOf = (lvl) => lvl >= 5 ? 3 : lvl >= 3 ? 2 : 1;
export const NAMES = ['루루', '미나', '하루', '세라', '노아', '리아', '유나', '카야', '아린', '솔', '네라', '비비', '모아', '시엘', '에나'];
export const ACCS = [{ n: '리본', color: 0xff6aa0 }, { n: '꽃 장식', color: 0xffe14a }, { n: '별 핀', color: 0x8affd0 }, { n: '은 고리', color: 0xd0d0ff }, { n: '검은 리본', color: 0x302040 }];
