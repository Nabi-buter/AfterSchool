// Shared type definitions for game content and runtime.

export type StatKey =
  | 'maxHp'
  | 'might'
  | 'area'
  | 'speed'
  | 'cooldown'
  | 'amount'
  | 'projSpeed'
  | 'duration'
  | 'armor'
  | 'regen'
  | 'magnet'
  | 'luck'
  | 'crit'
  | 'critDmg'
  | 'xpGain'
  | 'coinGain'
  | 'healMult'
  | 'knock'
  | 'iframe'
  | 'drop';

export type Stats = Record<StatKey, number>;

export type WeaponKind =
  | 'chalk'
  | 'textbook'
  | 'pencil'
  | 'compass'
  | 'basketball'
  | 'ink'
  | 'paper'
  | 'magnet'
  | 'alarm'
  | 'speaker'
  | 'cart'
  | 'edict'
  | 'ruler'
  | 'eraser'
  | 'slipper'
  | 'recorder'
  | 'highlighter'
  | 'static'
  | 'tacks'
  | 'tape'
  | 'union';

export interface WeaponLevel {
  dmg: number;
  cd: number; // seconds
  count: number;
  area: number; // multiplier on base radius / size
  speed: number; // projectile speed px/s
  pierce: number;
  duration: number; // seconds
}

export type WeaponDelta = Partial<WeaponLevel>;

export interface WeaponDef {
  id: string;
  kind: WeaponKind;
  name: string;
  short: string; // short flavor line
  desc: string;
  base: WeaponLevel;
  levels: WeaponDelta[]; // index 0 = upgrade to Lv2 ... length = maxLevel - 1
  evolvesWith?: string; // passive id
  evolvesInto?: string; // weapon id
  isEvolution?: boolean;
  /** Union weapon: built from two max-level base weapons, runs both sub weapons. */
  union?: [string, string];
  subs?: string[];
  /** Internal definitions not shown in level-up pools. */
  hidden?: boolean;
  tags: Array<'projectile' | 'area' | 'dot' | 'melee' | 'random' | 'summon'>;
  knockback: number;
}

export interface PassiveDef {
  id: string;
  name: string;
  desc: string;
  per: Partial<Stats>; // per level
  maxLevel: number;
  special?: 'nightstudy' | 'friendship' | 'diligence';
}

export type EnemyBehavior =
  | 'chase'
  | 'wobble'
  | 'dash'
  | 'ranged'
  | 'bomber'
  | 'splitter'
  | 'tank'
  | 'swarm'
  | 'mimic'
  | 'bouncer'
  | 'hazard'
  | 'summoner'
  | 'blink'
  | 'shield'
  | 'prop';

export interface EnemyDef {
  id: string;
  name: string;
  desc: string;
  behavior: EnemyBehavior;
  hp: number;
  speed: number;
  dmg: number;
  radius: number;
  xp: number;
  sprite: string;
  knockResist?: number; // 0..1
  armor?: number;
  splitInto?: string;
  splitCount?: number;
  summon?: string;
}

export type BossPattern = 'proctor' | 'discipline' | 'golem' | 'specimen' | 'lastbell';

export interface BossDef {
  id: string;
  name: string;
  title: string;
  desc: string;
  hp: number;
  speed: number;
  dmg: number;
  radius: number;
  sprite: string;
  pattern: BossPattern;
}

export interface WaveEntry {
  from: number; // seconds
  to: number;
  enemy: string;
  rate: number; // spawns per second (base)
  group?: number; // spawn this many together
}

export interface Obstacle {
  x: number;
  y: number;
  w: number;
  h: number;
  kind: string;
}

export interface StageDef {
  id: string;
  index: number;
  name: string;
  en: string;
  desc: string;
  width: number;
  height: number;
  duration: number; // seconds until the last bell
  midBossAt: number;
  bossAt: number;
  midBoss: string; // enemy id used as elite
  boss: string;
  waves: WaveEntry[];
  hpScale: number;
  dmgScale: number;
  densityScale: number;
  palette: { floor: string; floor2: string; line: string; wall: string; ambient: string };
  hazards?: boolean;
  unlockAfter?: string;
  coinMult: number;
}

export interface CharacterDef {
  id: string;
  name: string;
  role: string;
  club: string; // affinity club id
  desc: string;
  passiveName: string;
  passiveDesc: string;
  startWeapon: string;
  base: Partial<Stats>;
  hp: number;
  palette: { hair: string; skin: string; top: string; bottom: string; accent: string };
  accessory: 'glasses' | 'headband' | 'goggles' | 'headset' | 'beret' | 'cap' | 'sash' | 'hood';
  unlock: { type: 'default' } | { type: 'stat'; stat: string; value: number; text: string } | { type: 'clear'; stage: string; text: string };
  special?: 'xp' | 'nightowl' | 'gamer' | 'artist';
}

export interface ClubDef {
  id: string;
  name: string;
  desc: string;
  bonus: Partial<Stats>;
  special?: 'gamer' | 'artist' | 'broadcast';
  unlock: { type: 'default' } | { type: 'achievement'; id: string; text: string };
}

export type EventKind = 'break' | 'lunch' | 'night' | 'exam' | 'cleaning';

export interface ScheduleEventDef {
  id: EventKind;
  name: string;
  period: string;
  desc: string;
  duration: number;
}

export interface SynergyDef {
  id: string;
  name: string;
  desc: string;
  needs: string[]; // weapon or passive ids (base forms; evolutions count)
}
