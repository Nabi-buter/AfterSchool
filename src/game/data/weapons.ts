import type { WeaponDef, WeaponLevel } from '../types';

const L = (o: Partial<WeaponLevel>): WeaponLevel => ({
  dmg: 10,
  cd: 1,
  count: 1,
  area: 1,
  speed: 400,
  pierce: 1,
  duration: 1,
  ...o,
});

export const WEAPONS: WeaponDef[] = [
  {
    id: 'chalk', kind: 'chalk', name: '분필 투척', short: '가장 가까운 적에게 분필을 던진다.',
    desc: '가장 가까운 적을 향해 분필을 던진다. 단순하지만 믿음직하다.',
    base: L({ dmg: 12, cd: 0.8, count: 1, speed: 480, pierce: 1 }),
    levels: [{ count: 1 }, { dmg: 5 }, { cd: -0.12 }, { count: 1, pierce: 1 }, { dmg: 6 }, { count: 1 }, { dmg: 8, pierce: 1 }],
    evolvesWith: 'focus', evolvesInto: 'chalk_evo', tags: ['projectile'], knockback: 60,
  },
  {
    id: 'textbook', kind: 'textbook', name: '교과서 폭격', short: '주변 적 위로 두꺼운 교과서가 떨어진다.',
    desc: '주변의 적 머리 위로 교과서를 떨어뜨려 범위 피해를 준다.',
    base: L({ dmg: 22, cd: 2.4, count: 2, area: 1 }),
    levels: [{ count: 1 }, { dmg: 10 }, { area: 0.2 }, { count: 1 }, { cd: -0.35 }, { dmg: 14, area: 0.15 }, { count: 2 }],
    evolvesWith: 'memory', evolvesInto: 'textbook_evo', tags: ['area'], knockback: 40,
  },
  {
    id: 'pencil', kind: 'pencil', name: '샤프 펜슬', short: '바라보는 방향으로 샤프심을 관통 발사.',
    desc: '이동 방향으로 샤프심을 빠르게 연사한다. 적을 관통한다.',
    base: L({ dmg: 8, cd: 0.7, count: 1, speed: 720, pierce: 3 }),
    levels: [{ count: 1 }, { dmg: 4 }, { pierce: 2 }, { cd: -0.12 }, { count: 1 }, { dmg: 5, pierce: 2 }, { count: 1, dmg: 4 }],
    evolvesWith: 'timemgmt', evolvesInto: 'pencil_evo', tags: ['projectile'], knockback: 20,
  },
  {
    id: 'compass', kind: 'compass', name: '컴퍼스 회전', short: '컴퍼스가 주변을 돌며 베어낸다.',
    desc: '캐릭터 주변을 회전하는 컴퍼스. 가까이 붙은 적을 정리한다.',
    base: L({ dmg: 10, cd: 2.2, count: 2, area: 1, speed: 3.6, duration: 3.0 }),
    levels: [{ count: 1 }, { dmg: 4, area: 0.15 }, { duration: 0.6 }, { count: 1 }, { dmg: 5 }, { area: 0.2, cd: -0.4 }, { count: 1, dmg: 6 }],
    evolvesWith: 'stamina', evolvesInto: 'compass_evo', tags: ['melee'], knockback: 120,
  },
  {
    id: 'basketball', kind: 'basketball', name: '농구공', short: '적 사이를 튕기며 연쇄 타격.',
    desc: '적에게 맞으면 다음 적에게 튕겨 나간다. 무리 지은 적에게 강하다.',
    base: L({ dmg: 14, cd: 2.0, count: 1, speed: 380, pierce: 4 }),
    levels: [{ pierce: 2 }, { dmg: 6 }, { count: 1 }, { cd: -0.3 }, { pierce: 2, dmg: 6 }, { count: 1 }, { dmg: 10, pierce: 3 }],
    evolvesWith: 'agility', evolvesInto: 'basketball_evo', tags: ['projectile'], knockback: 90,
  },
  {
    id: 'ink', kind: 'ink', name: '잉크 스프레이', short: '바닥에 번지는 잉크로 지속 피해.',
    desc: '적이 몰린 곳에 잉크를 뿌린다. 잉크 위의 적은 계속 피해를 입고 느려진다.',
    base: L({ dmg: 6, cd: 3.0, count: 1, area: 1, duration: 3.0 }),
    levels: [{ area: 0.2 }, { dmg: 3 }, { count: 1 }, { duration: 1 }, { dmg: 3, area: 0.15 }, { cd: -0.5 }, { count: 1, dmg: 4 }],
    evolvesWith: 'creativity', evolvesInto: 'ink_evo', tags: ['dot', 'area'], knockback: 0,
  },
  {
    id: 'paper', kind: 'paper', name: '시험지 폭풍', short: '시험지가 소용돌이치며 퍼져 나간다.',
    desc: '시험지 여러 장이 나선형으로 퍼져 나가며 닿는 적을 벤다.',
    base: L({ dmg: 9, cd: 2.2, count: 4, speed: 210, pierce: 3, duration: 2.0 }),
    levels: [{ count: 2 }, { dmg: 4 }, { pierce: 2 }, { count: 2 }, { cd: -0.35 }, { dmg: 5, duration: 0.5 }, { count: 2, dmg: 4 }],
    evolvesWith: 'luck', evolvesInto: 'paper_evo', tags: ['projectile', 'random'], knockback: 30,
  },
  {
    id: 'magnet', kind: 'magnet', name: '자석 필통', short: '주변 적과 경험치를 끌어당긴다.',
    desc: '강한 자기장을 방출해 주변의 적을 중심으로 끌어당기고 피해를 준다. 경험치 조각도 함께 끌려온다.',
    base: L({ dmg: 12, cd: 4.0, count: 1, area: 1, duration: 0.6 }),
    levels: [{ area: 0.15 }, { dmg: 6 }, { cd: -0.5 }, { area: 0.15 }, { dmg: 8 }, { cd: -0.5 }, { area: 0.2, dmg: 8 }],
    evolvesWith: 'social', evolvesInto: 'magnet_evo', tags: ['area'], knockback: -200,
  },
  {
    id: 'alarm', kind: 'alarm', name: '알람 시계', short: '설치한 시계가 일정 시간 뒤 폭발.',
    desc: '발밑에 알람 시계를 내려놓는다. 잠시 후 요란하게 울리며 폭발한다.',
    base: L({ dmg: 34, cd: 3.4, count: 1, area: 1, duration: 1.4 }),
    levels: [{ dmg: 12 }, { area: 0.2 }, { count: 1 }, { cd: -0.4 }, { dmg: 16 }, { area: 0.2 }, { count: 1, dmg: 18 }],
    evolvesWith: 'patience', evolvesInto: 'alarm_evo', tags: ['area'], knockback: 160,
  },
  {
    id: 'speaker', kind: 'speaker', name: '스피커', short: '원형 음파가 사방으로 퍼진다.',
    desc: '교내 방송용 스피커에서 원형 음파를 내보내 주변 적을 밀어낸다.',
    base: L({ dmg: 10, cd: 2.6, count: 1, area: 1, speed: 340 }),
    levels: [{ dmg: 5 }, { area: 0.15 }, { cd: -0.3 }, { count: 1 }, { dmg: 6, area: 0.15 }, { cd: -0.3 }, { count: 1, dmg: 8 }],
    evolvesWith: 'presentation', evolvesInto: 'speaker_evo', tags: ['area'], knockback: 140,
  },
  {
    id: 'cart', kind: 'cart', name: '급식 카트', short: '육중한 카트가 일직선으로 돌진.',
    desc: '급식 카트를 밀어 일직선 위의 모든 적을 들이받는다. 느리지만 묵직하다.',
    base: L({ dmg: 30, cd: 3.6, count: 1, speed: 520, pierce: 999, area: 1 }),
    levels: [{ dmg: 12 }, { count: 1 }, { area: 0.2 }, { cd: -0.5 }, { dmg: 15 }, { count: 1 }, { dmg: 20, area: 0.2 }],
    evolvesWith: 'grit', evolvesInto: 'cart_evo', tags: ['melee'], knockback: 260,
  },
  {
    id: 'edict', kind: 'edict', name: '전자사전', short: '적을 자동 추적하는 단어 탄환.',
    desc: '전자사전이 단어를 검색해 쏘아 보낸다. 탄환은 가장 가까운 적을 쫓아간다.',
    base: L({ dmg: 9, cd: 1.4, count: 2, speed: 300, pierce: 1, duration: 3 }),
    levels: [{ count: 1 }, { dmg: 4 }, { cd: -0.2 }, { count: 1 }, { dmg: 5 }, { count: 1, speed: 60 }, { dmg: 6, count: 1 }],
    evolvesWith: 'notes', evolvesInto: 'edict_evo', tags: ['projectile'], knockback: 30,
  },

  // ───────────── Evolutions ─────────────
  {
    id: 'chalk_evo', kind: 'chalk', name: '초정밀 분필포', short: '관통하는 분필이 끝없이 쏟아진다.',
    desc: '집중력의 끝. 분필이 일직선으로 꿰뚫으며 연사된다. 치명타 확률 +20%.',
    base: L({ dmg: 30, cd: 0.42, count: 4, speed: 760, pierce: 6 }),
    levels: [], isEvolution: true, tags: ['projectile'], knockback: 80,
  },
  {
    id: 'textbook_evo', kind: 'textbook', name: '지식의 유성우', short: '교과서 유성우가 쏟아진다.',
    desc: '외운 모든 것이 하늘에서 떨어진다. 낙하 지점 주변에 넓은 충격파.',
    base: L({ dmg: 62, cd: 1.3, count: 8, area: 1.6 }),
    levels: [], isEvolution: true, tags: ['area'], knockback: 80,
  },
  {
    id: 'pencil_evo', kind: 'pencil', name: '0.3mm 레일건', short: '화면을 가로지르는 관통 광선.',
    desc: '시간을 아껴 쓴 결과. 사방으로 무한 관통하는 샤프심을 쏜다.',
    base: L({ dmg: 26, cd: 0.32, count: 4, speed: 1100, pierce: 999 }),
    levels: [], isEvolution: true, tags: ['projectile'], knockback: 30,
  },
  {
    id: 'compass_evo', kind: 'compass', name: '철벽 컴퍼스', short: '사라지지 않는 강철 원.',
    desc: '컴퍼스가 멈추지 않고 영원히 회전한다. 적을 벨 때마다 체력을 조금 회복.',
    base: L({ dmg: 22, cd: 0.1, count: 6, area: 1.5, speed: 4.2, duration: 999 }),
    levels: [], isEvolution: true, tags: ['melee'], knockback: 180,
  },
  {
    id: 'basketball_evo', kind: 'basketball', name: '무한 바운스', short: '멈추지 않는 농구공.',
    desc: '공이 지칠 줄 모르고 튕긴다. 튕길 때마다 속도와 피해가 증가.',
    base: L({ dmg: 32, cd: 1.1, count: 3, speed: 520, pierce: 30 }),
    levels: [], isEvolution: true, tags: ['projectile'], knockback: 120,
  },
  {
    id: 'ink_evo', kind: 'ink', name: '블랙잉크 오버로드', short: '모든 것을 삼키는 잉크 웅덩이.',
    desc: '창의력이 폭주한다. 잉크 웅덩이가 플레이어를 따라다니며 적을 녹인다.',
    base: L({ dmg: 18, cd: 1.6, count: 3, area: 1.8, duration: 5 }),
    levels: [], isEvolution: true, tags: ['dot', 'area'], knockback: 0,
  },
  {
    id: 'paper_evo', kind: 'paper', name: '만점 토네이도', short: '100점짜리 답안지의 회오리.',
    desc: '운이 실력이 되는 순간. 시험지가 거대한 회오리가 되어 플레이어 주변을 휩쓴다.',
    base: L({ dmg: 22, cd: 1.2, count: 14, speed: 260, pierce: 8, duration: 2.8 }),
    levels: [], isEvolution: true, tags: ['projectile'], knockback: 50,
  },
  {
    id: 'magnet_evo', kind: 'magnet', name: '블랙홀 필통', short: '모든 것을 빨아들이는 특이점.',
    desc: '필통이 작은 블랙홀이 된다. 적을 한곳에 모아 압축한 뒤 터뜨린다.',
    base: L({ dmg: 40, cd: 2.6, count: 1, area: 1.9, duration: 1.4 }),
    levels: [], isEvolution: true, tags: ['area'], knockback: -320,
  },
  {
    id: 'alarm_evo', kind: 'alarm', name: '종말의 자명종', short: '연쇄 폭발하는 자명종.',
    desc: '인내 끝에 울리는 기상 신호. 폭발이 세 번 연쇄적으로 퍼진다.',
    base: L({ dmg: 80, cd: 2.2, count: 3, area: 1.6, duration: 1.0 }),
    levels: [], isEvolution: true, tags: ['area'], knockback: 220,
  },
  {
    id: 'speaker_evo', kind: 'speaker', name: '전교 방송', short: '학교 전체를 울리는 공명.',
    desc: '전교생 주목. 거대한 음파가 연속으로 퍼지며 적을 기절시킨다.',
    base: L({ dmg: 28, cd: 1.3, count: 3, area: 1.7, speed: 420 }),
    levels: [], isEvolution: true, tags: ['area'], knockback: 200,
  },
  {
    id: 'cart_evo', kind: 'cart', name: '폭주 급식차', short: '사방으로 질주하는 급식차 행렬.',
    desc: '끈기의 상징. 네 방향으로 급식차가 질주하고, 지나간 자리에 회복용 반찬을 흘린다.',
    base: L({ dmg: 70, cd: 2.4, count: 4, speed: 640, pierce: 999, area: 1.5 }),
    levels: [], isEvolution: true, tags: ['melee'], knockback: 300,
  },
  {
    id: 'edict_evo', kind: 'edict', name: '만능 백과사전', short: '끝없이 검색되는 추적 탄환.',
    desc: '필기한 모든 것을 색인한다. 탄환이 명중하면 작은 폭발을 일으킨다.',
    base: L({ dmg: 20, cd: 0.6, count: 5, speed: 420, pierce: 2, duration: 3 }),
    levels: [], isEvolution: true, tags: ['projectile', 'area'], knockback: 40,
  },
];

export const WEAPON_MAP: Record<string, WeaponDef> = Object.fromEntries(WEAPONS.map((w) => [w.id, w]));
export const BASE_WEAPONS = WEAPONS.filter((w) => !w.isEvolution);
export const MAX_WEAPON_SLOTS = 6;
export const MAX_PASSIVE_SLOTS = 6;

export function weaponMaxLevel(def: WeaponDef): number {
  return def.levels.length + 1;
}

export function weaponStatsAt(def: WeaponDef, level: number): WeaponLevel {
  const s = { ...def.base };
  for (let i = 0; i < level - 1 && i < def.levels.length; i++) {
    const d = def.levels[i];
    for (const k in d) {
      const key = k as keyof WeaponLevel;
      s[key] += d[key] as number;
    }
  }
  return s;
}

const DELTA_LABEL: Record<keyof WeaponLevel, (v: number) => string> = {
  dmg: (v) => `피해 +${v}`,
  cd: (v) => `쿨타임 ${v.toFixed(2).replace(/0$/, '')}초`,
  count: (v) => `개수 +${v}`,
  area: (v) => `범위 +${Math.round(v * 100)}%`,
  speed: (v) => `속도 +${v}`,
  pierce: (v) => `관통 +${v}`,
  duration: (v) => `지속 +${v}초`,
};

export function describeDelta(def: WeaponDef, nextLevel: number): string {
  const d = def.levels[nextLevel - 2];
  if (!d) return '';
  return (Object.keys(d) as (keyof WeaponLevel)[])
    .map((k) => {
      if (def.kind === 'compass' && k === 'speed') return '회전 속도 증가';
      return DELTA_LABEL[k](d[k] as number);
    })
    .join(' · ');
}
