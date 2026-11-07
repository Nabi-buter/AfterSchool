import type { CharacterDef, ClubDef } from '../types';

export const CHARACTERS: CharacterDef[] = [
  {
    id: 'seoyun', name: '한서윤', role: '모범생', club: 'science',
    desc: '전교 1등. 야간 자율학습이 끝나기 직전까지 교실에 남아 있었다.',
    passiveName: '예습의 힘', passiveDesc: '경험치 획득량 +20%. 레벨업 선택지가 항상 4개.',
    startWeapon: 'chalk', hp: 100, base: { xpGain: 0.2 }, special: 'xp',
    palette: { hair: '#2B2433', skin: '#F0C9A8', top: '#E9E3D3', bottom: '#2E3E5E', accent: '#68B6AA' },
    accessory: 'glasses', unlock: { type: 'default' },
  },
  {
    id: 'taeho', name: '강태호', role: '운동부', club: 'sports',
    desc: '농구부 주장. 체육관 열쇠를 반납하러 왔다가 갇혔다.',
    passiveName: '근성', passiveDesc: '공격력 +15%, 이동 속도 +10%, 넉백 저항.',
    startWeapon: 'compass', hp: 115, base: { might: 0.15, speed: 0.1 },
    palette: { hair: '#1C1A1F', skin: '#D9A882', top: '#C9563C', bottom: '#20262F', accent: '#F1EBDD' },
    accessory: 'headband', unlock: { type: 'default' },
  },
  {
    id: 'dohyun', name: '이도현', role: '과학부', club: 'science',
    desc: '실험 보고서를 마무리하던 중이었다. 전자사전은 항상 주머니에.',
    passiveName: '가설 검증', passiveDesc: '모든 무기의 투사체 +1, 투사체 속도 +10%.',
    startWeapon: 'edict', hp: 90, base: { amount: 1, projSpeed: 0.1 },
    palette: { hair: '#3A3046', skin: '#EFC6A2', top: '#F4F2EC', bottom: '#384660', accent: '#68B6AA' },
    accessory: 'goggles', unlock: { type: 'default' },
  },
  {
    id: 'haeun', name: '박하은', role: '방송부', club: 'broadcast',
    desc: '하교 방송을 맡은 방송부 아나운서. 마이크를 끄지 못했다.',
    passiveName: '전파력', passiveDesc: '공격 범위 +25%, 지속시간 +10%.',
    startWeapon: 'speaker', hp: 95, base: { area: 0.25, duration: 0.1 },
    palette: { hair: '#4A2B2B', skin: '#F2CDB0', top: '#2B3A55', bottom: '#2B3A55', accent: '#E69A5A' },
    accessory: 'headset',
    unlock: { type: 'stat', stat: 'bestTime', value: 300, text: '한 판에서 5분 생존' },
  },
  {
    id: 'yuna', name: '최유나', role: '미술부', club: 'art',
    desc: '미술실에서 졸업 작품을 그리던 중. 손끝에 늘 잉크가 묻어 있다.',
    passiveName: '번짐 기법', passiveDesc: '지속 피해 +30%, 장판 지속시간 +30%.',
    startWeapon: 'ink', hp: 95, base: { duration: 0.3 }, special: 'artist',
    palette: { hair: '#1E2433', skin: '#F3D2B8', top: '#6E7F99', bottom: '#2A2F3A', accent: '#E69A5A' },
    accessory: 'beret',
    unlock: { type: 'stat', stat: 'totalKills', value: 1500, text: '누적 처치 1,500' },
  },
  {
    id: 'minjae', name: '정민재', role: '게임부', club: 'gaming',
    desc: '방과 후 컴퓨터실의 터줏대감. 확률은 언제나 자기 편이라고 믿는다.',
    passiveName: '확률 조작', passiveDesc: '행운 +30%, 치명타 +10%. 레벨업 때 리롤 +2.',
    startWeapon: 'paper', hp: 95, base: { luck: 0.3, crit: 0.1 }, special: 'gamer',
    palette: { hair: '#2E2A26', skin: '#E8BE9B', top: '#3C4B3F', bottom: '#22262E', accent: '#68B6AA' },
    accessory: 'cap',
    unlock: { type: 'clear', stage: 'classroom', text: 'STAGE 01 클리어' },
  },
  {
    id: 'jiho', name: '윤지호', role: '학생회장', club: 'sports',
    desc: '마지막까지 학교에 남아 문단속을 하던 학생회장. 책임감이 무기다.',
    passiveName: '솔선수범', passiveDesc: '최대 체력 +40, 방어력 +2, 이동 속도 -8%.',
    startWeapon: 'textbook', hp: 140, base: { armor: 2, speed: -0.08 },
    palette: { hair: '#24202A', skin: '#EDC4A1', top: '#1F2C45', bottom: '#1F2C45', accent: '#C9A65A' },
    accessory: 'sash',
    unlock: { type: 'clear', stage: 'hallway', text: 'STAGE 02 클리어' },
  },
  {
    id: 'sejin', name: '오세진', role: '야간 자율학습러', club: 'gaming',
    desc: '매일 밤 10시까지 남는 야자의 화신. 밤이 깊을수록 눈이 맑아진다.',
    passiveName: '올빼미', passiveDesc: '시작 능력치 -10%. 1분마다 공격력·속도·쿨타임 2%씩 강화.',
    startWeapon: 'pencil', hp: 90, base: { might: -0.1 }, special: 'nightowl',
    palette: { hair: '#2D2B3A', skin: '#E5C1A3', top: '#3E3A52', bottom: '#2B2A36', accent: '#9CA3AF' },
    accessory: 'hood',
    unlock: { type: 'clear', stage: 'gym', text: 'STAGE 03 클리어' },
  },
];

export const CHARACTER_MAP: Record<string, CharacterDef> = Object.fromEntries(CHARACTERS.map((c) => [c.id, c]));

export const CLUBS: ClubDef[] = [
  { id: 'none', name: '귀가부', desc: '동아리 없음. 대신 코인 획득량 +10%.', bonus: { coinGain: 0.1 }, unlock: { type: 'default' } },
  { id: 'science', name: '과학부', desc: '투사체 속도 +15%, 투사체 피해 +10%.', bonus: { projSpeed: 0.15 }, unlock: { type: 'default' } },
  { id: 'sports', name: '운동부', desc: '이동 속도 +8%, 최대 체력 +25.', bonus: { speed: 0.08, maxHp: 25 }, unlock: { type: 'default' } },
  { id: 'broadcast', name: '방송부', desc: '공격 범위 +15%, 범위 공격 피해 +10%.', bonus: { area: 0.15 }, special: 'broadcast', unlock: { type: 'achievement', id: 'survive5', text: '업적 「첫 야자」 달성' } },
  { id: 'art', name: '미술부', desc: '지속시간 +20%, 지속 피해 +25%.', bonus: { duration: 0.2 }, special: 'artist', unlock: { type: 'achievement', id: 'kills1000', text: '업적 「청소 당번」 달성' } },
  { id: 'gaming', name: '게임부', desc: '행운 +20%, 레벨업 리롤 +1, 시간표 이벤트 효과 강화.', bonus: { luck: 0.2 }, special: 'gamer', unlock: { type: 'achievement', id: 'evolve1', text: '업적 「진화론」 달성' } },
];

export const CLUB_MAP: Record<string, ClubDef> = Object.fromEntries(CLUBS.map((c) => [c.id, c]));

/** Matching character affinity with club grants an extra bonus. */
export const AFFINITY_BONUS = { might: 0.08, maxHp: 10 };
