import type { PassiveDef, Stats } from '../types';

export const PASSIVES: PassiveDef[] = [
  { id: 'focus', name: '집중력', desc: '모든 공격의 피해량 +10%', per: { might: 0.1 }, maxLevel: 5 },
  { id: 'agility', name: '순발력', desc: '이동 속도 +8%', per: { speed: 0.08 }, maxLevel: 5 },
  { id: 'stamina', name: '체력 관리', desc: '최대 체력 +20', per: { maxHp: 20 }, maxLevel: 5 },
  { id: 'memory', name: '암기력', desc: '경험치 획득량 +10%', per: { xpGain: 0.1 }, maxLevel: 5 },
  { id: 'creativity', name: '창의력', desc: '공격 범위 +10%', per: { area: 0.1 }, maxLevel: 5 },
  { id: 'timemgmt', name: '시간 관리', desc: '재사용 대기시간 -7%', per: { cooldown: -0.07 }, maxLevel: 5 },
  { id: 'patience', name: '인내심', desc: '받는 피해 -1 (방어력)', per: { armor: 1 }, maxLevel: 5 },
  { id: 'social', name: '사교성', desc: '아이템 획득 범위 +25%', per: { magnet: 0.25 }, maxLevel: 5 },
  { id: 'luck', name: '운', desc: '치명타 확률 +5%, 행운 +10%', per: { crit: 0.05, luck: 0.1 }, maxLevel: 5 },
  { id: 'nightstudy', name: '야자 보너스', desc: '생존 1분마다 피해 +1.5% (레벨당)', per: {}, maxLevel: 3, special: 'nightstudy' },
  { id: 'grit', name: '끈기', desc: '초당 체력 회복 +0.3', per: { regen: 0.3 }, maxLevel: 5 },
  { id: 'notes', name: '필기 속도', desc: '모든 무기의 투사체 개수 +1', per: { amount: 1 }, maxLevel: 2 },
  { id: 'presentation', name: '발표력', desc: '투사체 속도 +12%, 지속시간 +10%', per: { projSpeed: 0.12, duration: 0.1 }, maxLevel: 5 },
  { id: 'lunch', name: '급식 우선권', desc: '회복량 +30%, 반찬 드롭 증가', per: { healMult: 0.3 }, maxLevel: 3 },
  { id: 'allowance', name: '용돈 관리', desc: '학교 코인 획득량 +15%', per: { coinGain: 0.15 }, maxLevel: 3 },
];

export const PASSIVE_MAP: Record<string, PassiveDef> = Object.fromEntries(PASSIVES.map((p) => [p.id, p]));

export const BASE_STATS: Stats = {
  maxHp: 100,
  might: 1,
  area: 1,
  speed: 1,
  cooldown: 1,
  amount: 0,
  projSpeed: 1,
  duration: 1,
  armor: 0,
  regen: 0,
  magnet: 1,
  luck: 1,
  crit: 0.05,
  critDmg: 1.6,
  xpGain: 1,
  coinGain: 1,
  healMult: 1,
};

export const STAT_LABEL: Record<keyof Stats, string> = {
  maxHp: '최대 체력',
  might: '공격력',
  area: '공격 범위',
  speed: '이동 속도',
  cooldown: '쿨타임',
  amount: '투사체',
  projSpeed: '투사체 속도',
  duration: '지속시간',
  armor: '방어력',
  regen: '회복',
  magnet: '획득 범위',
  luck: '행운',
  crit: '치명타',
  critDmg: '치명 피해',
  xpGain: '경험치',
  coinGain: '코인',
  healMult: '회복량',
};
