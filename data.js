// 게임 데이터 (몬스터 종, 무기, 대사)
export const ELEM = { none: { n: '무속성', c: 'none', col: 0xffffff }, fire: { n: '화염', c: 'fire', col: 0xff7a2a }, ice: { n: '빙결', c: 'ice', col: 0x7fd8ff }, thunder: { n: '번개', c: 'thunder', col: 0xffe14a } };
export const STATUS = { fire: { n: '화상', key: 'burn' }, ice: { n: '빙결', key: 'freeze' }, thunder: { n: '마비', key: 'para' } };
export const SPECIES = {
  wolf: { name: '화염 늑대 루가', short: '루가', elem: 'fire', weak: 'thunder', img: 'img/enemy_wolf.webp', hp: 520, dmg: 22, speed: 5.2, scale: 1.5,
    look: { skin: 0xf5d2bd, hair: 0xd8452a, eye: '#ffb02a', cloth: 0x3a2a2a, cloth2: 0x8a2a1a, accent: 0xffb02a, hairStyle: 'long', horns: 0xfff1d0, ears: true, tail: 0xd8452a, weapon: 'claw', weaponColor: 0xfff1d0, angry: true },
    parts: [{ key: 'horn', n: '뿔', anchor: 'horn1' }, { key: 'tail', n: '꼬리', anchor: 'tailTip' }],
    roles: ['dealer', 'buffer'], trait: { n: '야성의 질주', d: '공격 속도 +20%' },
    lines: { meet: '불꽃 냄새가 나는 사냥꾼이네? 따라올 수 있으면 와 봐!', break: '내 뿔을…! 이제 진심이야!', win: '하아… 오늘은 네가 이겼어.', purify: '이 따뜻한 느낌… 너랑 같이 달려도 될까?', lose: '느려, 느려! 다음엔 더 빨리 와.' } },
  witch: { name: '빙결 마녀 셀레스', short: '셀레스', elem: 'ice', weak: 'fire', img: 'img/enemy_celes.webp', hp: 440, dmg: 20, speed: 3.4, scale: 1.45,
    look: { skin: 0xf2e6f0, hair: 0xbfe4ff, eye: '#4ac0ff', cloth: 0x2a3a7a, cloth2: 0x5a7ad8, accent: 0xe0f4ff, hairStyle: 'twin', horns: 0xbfe4ff, wings: 0xa0d8ff, weapon: 'staff', weaponColor: 0x7fd8ff, angry: true },
    parts: [{ key: 'crown', n: '얼음 관', anchor: 'horn1' }, { key: 'wing', n: '날개', anchor: 'wing' }],
    roles: ['healer', 'debuffer'], trait: { n: '서리 손길', d: '공격 시 빙결 축적' },
    lines: { meet: '여긴 내 정원이야. 발밑을 조심하렴.', break: '내 왕관에 금이…! 용서 못 해!', win: '얼음이… 녹아 버렸네.', purify: '차갑지 않은 손은 처음이야. 함께 갈게.', lose: '얼어붙은 채로 잠시 쉬어 가렴.' } },
  drake: { name: '뇌룡 기사 드라카', short: '드라카', elem: 'thunder', weak: 'ice', img: 'img/enemy_drake.webp', hp: 680, dmg: 30, speed: 3.0, scale: 1.8,
    look: { skin: 0xf0cdb5, hair: 0x3a2a5a, eye: '#ffe14a', cloth: 0x4a4a5a, cloth2: 0x6a4ac8, accent: 0xffe14a, hairStyle: 'pony', horns: 0xffe14a, wings: 0x6a4ac8, tail: 0x6a4ac8, weapon: 'hammer', weaponColor: 0xc8c8e0, angry: true },
    parts: [{ key: 'horn', n: '뿔', anchor: 'horn1' }, { key: 'wing', n: '날개', anchor: 'wing' }, { key: 'tail', n: '꼬리', anchor: 'tailTip' }],
    roles: ['tank', 'dealer'], trait: { n: '용린 갑옷', d: '받는 피해 -20%' },
    lines: { meet: '기사의 결투다. 정면으로 받아 봐라!', break: '크윽, 용의 긍지가…! 좋다, 더 와라!', win: '훌륭한 일격이었다. 인정하지.', purify: '이 검, 이제부터 너를 위해 휘두르겠다.', lose: '아직 멀었다. 다시 단련하고 와라.' } },
};
export const ROLES = { dealer: '딜러', tank: '탱커', healer: '힐러', buffer: '버퍼', debuffer: '디버퍼' };
export const ROLE_DESC = { dealer: '몬스터에 붙어 꾸준히 공격', tank: '도발로 공격을 끌고 방어 자세', healer: '체력 낮은 아군 회복', buffer: '주기적으로 파티 공격력 +25%', debuffer: '주기적으로 몬스터 받는 피해 +25%·둔화' };
export const WEAPON_TYPES = {
  sns: { n: '한손검', base: 10, desc: '빠른 4연속 베기 · 차지 2단계', combo: [0.30, 0.30, 0.34, 0.5], mult: [1, 1, 1.2, 1.7], range: 2.0, charge: [1.7, 2.8], chargeStep: 0.5 },
  gs: { n: '대검', base: 15, desc: '묵직한 3연속 · 차지 3단계 큰 한 방', combo: [0.6, 0.66, 0.9], mult: [1.6, 1.8, 2.6], range: 2.7, charge: [2.4, 4.0, 6.4], chargeStep: 0.55 },
};
export const ELEM_SRC = { fire: 'wolf', ice: 'witch', thunder: 'drake' };
export const QUAL = ['', '하급', '중급', '상급'];
export const qualOf = (lvl) => lvl >= 5 ? 3 : lvl >= 3 ? 2 : 1;
export const NAMES = ['루루', '미나', '하루', '세라', '노아', '리아', '유나', '카야', '아린', '솔', '네라', '비비', '모아', '시엘', '에나'];
export const ACCS = [{ n: '리본', color: 0xff6aa0 }, { n: '꽃 장식', color: 0xffe14a }, { n: '별 핀', color: 0x8affd0 }, { n: '은 고리', color: 0xd0d0ff }, { n: '검은 리본', color: 0x302040 }];
