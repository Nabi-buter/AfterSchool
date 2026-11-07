import type { BossDef, CharacterDef, EnemyDef, Obstacle, StageDef, Stats, WeaponDef, WeaponLevel } from '../types';
import type { Sprite } from '../render/sprites';

export interface Enemy {
  alive: boolean;
  uid: number;
  def: EnemyDef;
  boss: BossDef | null;
  elite: boolean;
  sprite: Sprite;
  x: number;
  y: number;
  vx: number; // knockback velocity
  vy: number;
  r: number;
  hp: number;
  maxHp: number;
  speed: number;
  dmg: number;
  xp: number;
  armor: number;
  kres: number;
  flash: number;
  state: number;
  timer: number;
  t2: number;
  dirx: number;
  diry: number;
  slow: number;
  stun: number;
  face: number; // -1 / 1
  hitT: Float32Array; // last-hit time per weapon slot
  scale: number;
  phase: number;
  spawnT: number;
  pat: number; // boss pattern counter
  act: number; // boss action timer
  ax: number;
  ay: number;
}

export interface Projectile {
  alive: boolean;
  slot: number;
  kind: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  dmg: number;
  pierce: number;
  life: number;
  maxLife: number;
  t: number;
  knock: number;
  hits: Int32Array;
  hitN: number;
  a: number; // angle / generic
  b: number; // generic
  c: number; // generic
  target: number; // enemy uid
  evo: boolean;
}

export interface EnemyBullet {
  alive: boolean;
  kind: 'dust' | 'ball' | 'paper' | 'acid' | 'note' | 'whistle';
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  dmg: number;
  life: number;
  bounce: number;
  t: number;
}

export interface Zone {
  alive: boolean;
  kind: 'ink' | 'acid' | 'vortex' | 'alarm' | 'drop' | 'wave' | 'mop';
  x: number;
  y: number;
  r: number;
  life: number;
  maxLife: number;
  dmg: number;
  tick: number;
  slot: number;
  follow: boolean;
  a: number;
  b: number;
  evo: boolean;
  hostile: boolean;
}

export interface Pickup {
  alive: boolean;
  kind: 'gem1' | 'gem2' | 'gem3' | 'coin' | 'food' | 'chest' | 'magnet';
  x: number;
  y: number;
  value: number;
  vacuum: boolean;
  t: number;
  vx: number;
  vy: number;
}

export interface Particle {
  alive: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  grav: number;
}

export interface DamageText {
  alive: boolean;
  x: number;
  y: number;
  text: string;
  life: number;
  crit: boolean;
  color: string;
}

export interface Telegraph {
  alive: boolean;
  shape: 'circle' | 'line' | 'ring';
  x: number;
  y: number;
  x2: number;
  y2: number;
  r: number;
  w: number;
  t: number;
  dur: number;
  onDone: (() => void) | null;
}

export interface WeaponInst {
  def: WeaponDef;
  level: number;
  slot: number;
  timer: number;
  stats: WeaponLevel;
  active: number; // compass active time
  angle: number;
  burst: number; // remaining burst shots
  burstT: number;
  dealt: number;
}

export interface PassiveInst {
  id: string;
  level: number;
}

export interface Player {
  def: CharacterDef;
  sprites: Sprite[];
  x: number;
  y: number;
  r: number;
  hp: number;
  facex: number;
  facey: number;
  moving: boolean;
  animT: number;
  invuln: number;
  flash: number;
  stats: Stats;
  revives: number;
  level: number;
  xp: number;
  xpNext: number;
  rerolls: number;
  skips: number;
}

export class Pool<T extends { alive: boolean }> {
  items: T[];
  private cursor = 0;
  count = 0;
  constructor(size: number, make: () => T) {
    this.items = Array.from({ length: size }, make);
  }
  /** Returns a dead item (marked alive) or null when the pool is exhausted. */
  get(): T | null {
    const n = this.items.length;
    for (let i = 0; i < n; i++) {
      const idx = (this.cursor + i) % n;
      const it = this.items[idx];
      if (!it.alive) {
        this.cursor = (idx + 1) % n;
        it.alive = true;
        return it;
      }
    }
    return null;
  }
  clear() {
    for (const it of this.items) it.alive = false;
  }
}

export function makeEnemy(): Enemy {
  return {
    alive: false, uid: 0, def: null as unknown as EnemyDef, boss: null, elite: false, sprite: null as unknown as Sprite,
    x: 0, y: 0, vx: 0, vy: 0, r: 10, hp: 1, maxHp: 1, speed: 0, dmg: 0, xp: 0, armor: 0, kres: 0, flash: 0,
    state: 0, timer: 0, t2: 0, dirx: 0, diry: 0, slow: 0, stun: 0, face: 1, hitT: new Float32Array(10).fill(-99),
    scale: 1, phase: 0, spawnT: 0, pat: 0, act: 0, ax: 0, ay: 0,
  };
}

export function makeProjectile(): Projectile {
  return {
    alive: false, slot: 0, kind: '', x: 0, y: 0, vx: 0, vy: 0, r: 4, dmg: 0, pierce: 1, life: 0, maxLife: 0, t: 0,
    knock: 0, hits: new Int32Array(24), hitN: 0, a: 0, b: 0, c: 0, target: -1, evo: false,
  };
}

export const makeBullet = (): EnemyBullet => ({ alive: false, kind: 'dust', x: 0, y: 0, vx: 0, vy: 0, r: 6, dmg: 0, life: 0, bounce: 0, t: 0 });
export const makeZone = (): Zone => ({ alive: false, kind: 'ink', x: 0, y: 0, r: 0, life: 0, maxLife: 0, dmg: 0, tick: 0, slot: 0, follow: false, a: 0, b: 0, evo: false, hostile: false });
export const makePickup = (): Pickup => ({ alive: false, kind: 'gem1', x: 0, y: 0, value: 0, vacuum: false, t: 0, vx: 0, vy: 0 });
export const makeParticle = (): Particle => ({ alive: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 1, size: 2, color: '#fff', grav: 0 });
export const makeText = (): DamageText => ({ alive: false, x: 0, y: 0, text: '', life: 0, crit: false, color: '#fff' });
export const makeTelegraph = (): Telegraph => ({ alive: false, shape: 'circle', x: 0, y: 0, x2: 0, y2: 0, r: 0, w: 0, t: 0, dur: 1, onDone: null });

/** Uniform grid spatial hash for enemies, rebuilt every frame. */
export class SpatialHash {
  cell: number;
  cols: number;
  rows: number;
  head: Int32Array;
  next: Int32Array;
  constructor(width: number, height: number, cell: number, capacity: number) {
    this.cell = cell;
    this.cols = Math.ceil(width / cell) + 2;
    this.rows = Math.ceil(height / cell) + 2;
    this.head = new Int32Array(this.cols * this.rows);
    this.next = new Int32Array(capacity).fill(-1);
    this.head.fill(-1);
  }
  rebuild(list: Enemy[]) {
    this.head.fill(-1);
    for (let i = 0; i < list.length; i++) {
      const e = list[i];
      if (!e.alive) continue;
      const c = this.idx(e.x, e.y);
      this.next[i] = this.head[c];
      this.head[c] = i;
    }
  }
  idx(x: number, y: number) {
    let cx = Math.floor(x / this.cell) + 1;
    let cy = Math.floor(y / this.cell) + 1;
    if (cx < 0) cx = 0;
    else if (cx >= this.cols) cx = this.cols - 1;
    if (cy < 0) cy = 0;
    else if (cy >= this.rows) cy = this.rows - 1;
    return cy * this.cols + cx;
  }
  /** Calls fn for each enemy index in cells overlapping the circle. Return true from fn to stop. */
  query(x: number, y: number, r: number, list: Enemy[], fn: (e: Enemy, i: number) => boolean | void) {
    const c = this.cell;
    const x0 = Math.max(0, Math.floor((x - r) / c) + 1);
    const x1 = Math.min(this.cols - 1, Math.floor((x + r) / c) + 1);
    const y0 = Math.max(0, Math.floor((y - r) / c) + 1);
    const y1 = Math.min(this.rows - 1, Math.floor((y + r) / c) + 1);
    for (let cy = y0; cy <= y1; cy++) {
      for (let cx = x0; cx <= x1; cx++) {
        let i = this.head[cy * this.cols + cx];
        while (i !== -1) {
          const e = list[i];
          if (e.alive && fn(e, i)) return;
          i = this.next[i];
        }
      }
    }
  }
}

export interface StageLayout {
  obstacles: Obstacle[];
  decor: Obstacle[];
}

export interface RunConfig {
  character: CharacterDef;
  stage: StageDef;
  club: string;
  meta: { stats: Partial<Stats>; reroll: number; revive: number };
  settings: { shake: boolean; damageNumbers: boolean; reducedFlash: boolean };
}
