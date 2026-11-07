import { Input } from './input';
import {
  Pool, SpatialHash, makeBullet, makeEnemy, makeParticle, makePickup, makeProjectile, makeTelegraph, makeText, makeZone,
  type DamageText, type Enemy, type EnemyBullet, type Particle, type PassiveInst, type Pickup, type Player, type Projectile,
  type RunConfig, type StageLayout, type Telegraph, type WeaponInst, type Zone,
} from './world';
import { BASE_STATS, PASSIVES, PASSIVE_MAP } from '../data/passives';
import { BASE_WEAPONS, MAX_PASSIVE_SLOTS, MAX_WEAPON_SLOTS, WEAPON_MAP, describeDelta, weaponMaxLevel, weaponStatsAt } from '../data/weapons';
import { ENEMY_MAP, BOSS_MAP } from '../data/enemies';
import { AFFINITY_BONUS, CLUB_MAP } from '../data/characters';
import { SCHEDULE_EVENTS, SYNERGIES, EVENT_MAP } from '../data/misc';
import type { EnemyDef, EventKind, StageDef, Stats } from '../types';
import { buildLayout, pointInObstacles, resolveCircle } from '../systems/layout';
import { characterSprites, enemySprite } from '../render/sprites';
import { updateWeapons, updateProjectiles, updateFriendlyZones } from '../systems/weapons';
import { updateEnemy } from '../systems/enemies';
import { updateBoss } from '../systems/bosses';
import { Renderer } from '../render/renderer';
import { audio, type SfxName } from '../audio/audio';
import type { RunResult } from '../../meta/store';

export interface UpgradeOption {
  kind: 'weapon' | 'passive' | 'evolve' | 'heal' | 'coin';
  id: string;
  name: string;
  desc: string;
  level: number; // current level (0 = new)
  next: number;
  isNew: boolean;
  tag: string;
}

export type GameEvent =
  | { type: 'levelup'; options: UpgradeOption[]; rerolls: number; skips: number; level: number }
  | { type: 'chest'; title: string; items: { id: string; name: string; text: string; evo: boolean }[]; coins: number }
  | { type: 'banner'; title: string; sub: string; tone: 'event' | 'boss' | 'warn' | 'synergy' | 'evolve' | 'info'; label?: string }
  | { type: 'bossIntro'; name: string; title: string; desc: string }
  | { type: 'end'; result: RunResult }
  | { type: 'pause' }
  | { type: 'levelupDone' }
  | { type: 'tutorial' };

export interface Hud {
  time: number;
  duration: number;
  level: number;
  xp: number;
  xpNext: number;
  hp: number;
  maxHp: number;
  kills: number;
  coins: number;
  boss: { name: string; hp: number; max: number; phase: number } | null;
  weapons: { id: string; level: number; evo: boolean; max: number }[];
  passives: { id: string; level: number; max: number }[];
  event: { name: string; remain: number; id: EventKind } | null;
  fps: number;
  clock: string;
  overtime: boolean;
  synergies: string[];
}

const PLAYER_SPEED = 165;
const MAGNET_BASE = 72;

export class Game {
  canvas: HTMLCanvasElement;
  input: Input;
  cfg: RunConfig;
  stage: StageDef;
  layout: StageLayout;
  renderer: Renderer;
  onEvent: (e: GameEvent) => void;

  player!: Player;
  enemies = new Pool<Enemy>(520, makeEnemy);
  projectiles = new Pool<Projectile>(800, makeProjectile);
  bullets = new Pool<EnemyBullet>(600, makeBullet);
  zones = new Pool<Zone>(220, makeZone);
  pickups = new Pool<Pickup>(1000, makePickup);
  particles = new Pool<Particle>(900, makeParticle);
  texts = new Pool<DamageText>(180, makeText);
  telegraphs = new Pool<Telegraph>(80, makeTelegraph);
  hash: SpatialHash;

  weapons: WeaponInst[] = [];
  passives: PassiveInst[] = [];
  synergies = new Set<string>();
  evolutions: string[] = [];

  time = 0;
  state: 'play' | 'levelup' | 'chest' | 'paused' | 'over' = 'play';
  kills = 0;
  coins = 0;
  enemyKills: Record<string, number> = {};
  bossKills = 0;
  bossesKilled: string[] = [];
  boss: Enemy | null = null;
  bossSpawned = false;
  bossDefeated = false;
  midBossSpawned = false;
  overtime = false;
  uid = 1;
  pendingLevels = 0;
  lastOffered = new Set<string>();
  waveAcc: number[];
  maxWeapons = 1;

  event: { id: EventKind; remain: number } | null = null;
  nextEventAt = 55;
  lastEvent: EventKind | null = null;
  hazardTimer = 12;

  cam = { x: 0, y: 0, shake: 0, sx: 0, sy: 0 };
  view = { w: 1, h: 1, scale: 1, dpr: 1, cssW: 1, cssH: 1 };

  hud: Hud;
  private raf = 0;
  private last = 0;
  private fpsAcc = 0;
  private fpsFrames = 0;
  private statTimer = 0;
  private separationFlip = 0;
  private destroyed = false;
  private resizeObs: ResizeObserver;
  mopX = 0;
  private timers: { t: number; fn: () => void }[] = [];

  /** Schedule a callback in game time (pauses with the game). Same arg order as setTimeout. */
  after(fn: () => void, ms: number) {
    this.timers.push({ t: this.time + ms / 1000, fn });
  }

  constructor(canvas: HTMLCanvasElement, cfg: RunConfig, onEvent: (e: GameEvent) => void) {
    this.canvas = canvas;
    this.cfg = cfg;
    this.stage = cfg.stage;
    this.onEvent = onEvent;
    this.layout = buildLayout(this.stage);
    this.input = new Input(canvas);
    this.input.onPause = () => this.togglePause();
    this.hash = new SpatialHash(this.stage.width, this.stage.height, 64, this.enemies.items.length);
    this.waveAcc = this.stage.waves.map(() => 0);
    this.renderer = new Renderer(this);
    this.initPlayer();
    this.hud = this.makeHud();
    this.resizeObs = new ResizeObserver(() => this.resize());
    this.resizeObs.observe(canvas);
    this.resize();
    document.addEventListener('visibilitychange', this.onVis);
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.frame);
  }

  // ───────────────────────── lifecycle ─────────────────────────
  destroy() {
    this.destroyed = true;
    cancelAnimationFrame(this.raf);
    this.input.destroy();
    this.resizeObs.disconnect();
    document.removeEventListener('visibilitychange', this.onVis);
  }

  private onVis = () => {
    if (document.hidden && this.state === 'play') this.togglePause();
  };

  togglePause() {
    if (this.state === 'play') {
      this.state = 'paused';
      this.input.clear();
      audio.duck(true);
      this.onEvent({ type: 'pause' });
    } else if (this.state === 'paused') {
      this.resume();
    }
  }

  resume() {
    if (this.state === 'paused' || this.state === 'chest') {
      this.state = 'play';
      audio.duck(false);
      this.last = performance.now();
      this.input.clear();
    }
  }

  resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const cssW = this.canvas.clientWidth || window.innerWidth;
    const cssH = this.canvas.clientHeight || window.innerHeight;
    this.canvas.width = Math.round(cssW * dpr);
    this.canvas.height = Math.round(cssH * dpr);
    const minDim = Math.min(this.canvas.width, this.canvas.height);
    const artPx = Math.max(2, Math.min(9, Math.round(minDim / 215)));
    this.view = { w: this.canvas.width, h: this.canvas.height, scale: artPx / 3, dpr, cssW, cssH };
  }

  // ───────────────────────── setup ─────────────────────────
  private initPlayer() {
    const def = this.cfg.character;
    const start = this.findStart();
    this.player = {
      def, sprites: characterSprites(def), x: start.x, y: start.y, r: 11, hp: 100, facex: 1, facey: 0, moving: false,
      animT: 0, invuln: 1.2, flash: 0, stats: { ...BASE_STATS }, revives: this.cfg.meta.revive, level: 1, xp: 0,
      xpNext: this.xpFor(1),
      rerolls: this.cfg.meta.reroll + (def.special === 'gamer' ? 2 : 0) + (CLUB_MAP[this.cfg.club]?.special === 'gamer' ? 1 : 0),
      skips: 2,
    };
    this.recalcStats();
    this.player.hp = this.player.stats.maxHp;
    this.addWeapon(def.startWeapon);
    this.cam.x = this.player.x;
    this.cam.y = this.player.y;
  }

  private findStart() {
    const x = this.stage.width / 2;
    let y = this.stage.height / 2;
    if (this.stage.id === 'classroom') y = this.stage.height / 2 + 40;
    return { x, y };
  }

  private makeHud(): Hud {
    return {
      time: 0, duration: this.stage.duration, level: 1, xp: 0, xpNext: 1, hp: 1, maxHp: 1, kills: 0, coins: 0, boss: null,
      weapons: [], passives: [], event: null, fps: 60, clock: '17:00', overtime: false, synergies: [],
    };
  }

  xpFor(level: number): number {
    return Math.floor(6 + (level - 1) * 7.5 + Math.max(0, level - 20) * 7 + Math.max(0, level - 40) * 10);
  }

  // ───────────────────────── stats ─────────────────────────
  recalcStats() {
    const p = this.player;
    const def = this.cfg.character;
    const s: Stats = { ...BASE_STATS, maxHp: def.hp };
    const add = (o: Partial<Stats>, mult = 1) => {
      for (const k in o) s[k as keyof Stats] += (o[k as keyof Stats] as number) * mult;
    };
    add(def.base);
    const club = CLUB_MAP[this.cfg.club];
    if (club) add(club.bonus);
    if (club && def.club === club.id) add(AFFINITY_BONUS);
    add(this.cfg.meta.stats);
    for (const pi of this.passives) add(PASSIVE_MAP[pi.id].per, pi.level);
    if (this.synergies.has('insider')) add({ magnet: 0.3, speed: 0.05 });
    if (this.synergies.has('flow')) add({ critDmg: 0.5 });
    const min = this.time / 60;
    if (def.special === 'nightowl') add({ might: 0.02, speed: 0.01, cooldown: -0.01 }, Math.min(30, Math.floor(min)));
    const ns = this.passives.find((x) => x.id === 'nightstudy');
    if (ns) s.might += Math.min(0.6, 0.015 * ns.level * Math.floor(min));
    if (this.event?.id === 'break') add({ speed: 0.3, cooldown: -0.1 });
    if (this.event?.id === 'night' && this.synergies.has('allnighter')) s.might += 0.25;
    s.cooldown = Math.max(0.35, s.cooldown);
    s.speed = Math.max(0.5, s.speed);
    const prevMax = p.stats.maxHp;
    p.stats = s;
    if (s.maxHp > prevMax && this.time > 0) p.hp += s.maxHp - prevMax;
    p.hp = Math.min(p.hp, s.maxHp);
    for (const w of this.weapons) w.stats = weaponStatsAt(w.def, w.level);
  }

  // ───────────────────────── main loop ─────────────────────────
  private frame = (now: number) => {
    if (this.destroyed) return;
    this.raf = requestAnimationFrame(this.frame);
    let dt = (now - this.last) / 1000;
    this.last = now;
    if (dt > 0.05) dt = 0.05;
    if (dt < 0) dt = 0;
    this.fpsAcc += dt;
    this.fpsFrames++;
    if (this.fpsAcc >= 0.5) {
      this.hud.fps = Math.round(this.fpsFrames / this.fpsAcc);
      this.fpsAcc = 0;
      this.fpsFrames = 0;
    }
    if (this.state === 'play') this.update(dt);
    else this.updateCosmetic(dt * 0.25);
    this.renderer.draw(dt);
    this.writeHud();
  };

  private updateCosmetic(dt: number) {
    for (const t of this.texts.items) if (t.alive) {
      t.life -= dt;
      if (t.life <= 0) t.alive = false;
    }
  }

  update(dt: number) {
    this.time += dt;
    const p = this.player;
    if (this.timers.length) {
      const due = this.timers.filter((t) => t.t <= this.time);
      if (due.length) {
        this.timers = this.timers.filter((t) => t.t > this.time);
        for (const d of due) d.fn();
      }
    }

    // stats tick (time based scaling)
    this.statTimer -= dt;
    if (this.statTimer <= 0) {
      this.statTimer = 1;
      this.recalcStats();
    }

    this.updatePlayer(dt);
    this.hash.rebuild(this.enemies.items);
    this.director(dt);
    this.updateSchedule(dt);
    this.updateEnemies(dt);
    updateWeapons(this, dt);
    this.hash.rebuild(this.enemies.items);
    updateProjectiles(this, dt);
    updateFriendlyZones(this, dt);
    this.updateHostile(dt);
    this.updatePickups(dt);
    this.updateFx(dt);
    this.updateCamera(dt);

    if (p.hp <= 0) this.onDeath();
    this.checkTimeline();
  }

  private updatePlayer(dt: number) {
    const p = this.player;
    const ax = this.input.axis();
    const sp = PLAYER_SPEED * p.stats.speed;
    p.moving = ax.x !== 0 || ax.y !== 0;
    if (p.moving) {
      p.x += ax.x * sp * dt;
      p.y += ax.y * sp * dt;
      const l = Math.hypot(ax.x, ax.y);
      p.facex = ax.x / l;
      p.facey = ax.y / l;
      p.animT += dt * (6 + 4 * p.stats.speed);
    }
    resolveCircle(p, p.r, this.layout.obstacles);
    const m = 24;
    p.x = Math.max(m, Math.min(this.stage.width - m, p.x));
    p.y = Math.max(m + 30, Math.min(this.stage.height - m, p.y));
    if (p.invuln > 0) p.invuln -= dt;
    if (p.flash > 0) p.flash -= dt;
    // regen
    let regen = p.stats.regen;
    if (this.event?.id === 'lunch') regen += 0.8;
    if (regen > 0 && p.hp < p.stats.maxHp) p.hp = Math.min(p.stats.maxHp, p.hp + regen * dt);
    // contact damage
    this.hash.query(p.x, p.y, 70, this.enemies.items, (e) => {
      const rr = e.r + p.r - 3;
      const dx = e.x - p.x;
      const dy = e.y - p.y;
      if (dx * dx + dy * dy < rr * rr && e.spawnT <= 0) {
        if (e.def.behavior === 'mimic' && e.state === 0) return;
        this.hurtPlayer(e.dmg);
        return true;
      }
    });
  }

  enemyDmgMult(): number {
    let m = this.stage.dmgScale * (1 + (this.time / 60) * 0.045);
    if (this.event?.id === 'exam') m *= 1.35;
    if (this.overtime) m *= 1.3;
    return m;
  }

  hurtPlayer(raw: number) {
    const p = this.player;
    if (p.invuln > 0 || this.state !== 'play') return;
    const dmg = Math.max(1, raw - p.stats.armor);
    p.hp -= dmg;
    p.invuln = 0.6;
    p.flash = 0.2;
    this.shake(5);
    audio.play('hurt');
    this.burst(p.x, p.y, '#D9644A', 6, 120);
  }

  shake(amount: number) {
    if (!this.cfg.settings.shake) return;
    this.cam.shake = Math.min(14, Math.max(this.cam.shake, amount));
  }

  private updateCamera(dt: number) {
    const p = this.player;
    const vw = this.view.w / this.view.scale;
    const vh = this.view.h / this.view.scale;
    const k = 1 - Math.pow(0.0005, dt);
    this.cam.x += (p.x - this.cam.x) * k;
    this.cam.y += (p.y - this.cam.y) * k;
    const W = this.stage.width;
    const H = this.stage.height;
    this.cam.x = vw >= W ? W / 2 : Math.max(vw / 2, Math.min(W - vw / 2, this.cam.x));
    this.cam.y = vh >= H ? H / 2 : Math.max(vh / 2, Math.min(H - vh / 2, this.cam.y));
    if (this.cam.shake > 0) {
      this.cam.sx = (Math.random() * 2 - 1) * this.cam.shake;
      this.cam.sy = (Math.random() * 2 - 1) * this.cam.shake;
      this.cam.shake = Math.max(0, this.cam.shake - dt * 40);
    } else {
      this.cam.sx = this.cam.sy = 0;
    }
  }

  viewRect() {
    const vw = this.view.w / this.view.scale;
    const vh = this.view.h / this.view.scale;
    return { x: this.cam.x - vw / 2, y: this.cam.y - vh / 2, w: vw, h: vh };
  }

  // ───────────────────────── spawning ─────────────────────────
  private director(dt: number) {
    const t = this.time;
    const st = this.stage;
    let alive = 0;
    for (const e of this.enemies.items) if (e.alive) alive++;
    const cap = Math.min(460, Math.round(200 + t * 0.5));
    let rateMul = st.densityScale * (1.05 + (t / 60) * 0.24);
    if (this.event?.id === 'exam') rateMul *= 1.4;
    if (this.boss && this.boss.alive) rateMul *= 0.45;
    if (this.overtime) rateMul *= 1.4;
    if (this.bossDefeated && !this.overtime) rateMul *= 1.15;
    for (let i = 0; i < st.waves.length; i++) {
      const w = st.waves[i];
      if (t < w.from || t > w.to) continue;
      this.waveAcc[i] += w.rate * rateMul * dt;
      while (this.waveAcc[i] >= 1) {
        this.waveAcc[i] -= 1;
        if (alive >= cap) break;
        const n = w.group ?? 1;
        alive += this.spawnGroup(ENEMY_MAP[w.enemy], n);
      }
    }
    // lab hazard spills
    if (st.hazards) {
      this.hazardTimer -= dt;
      if (this.hazardTimer <= 0) {
        this.hazardTimer = Math.max(4, 11 - t / 90);
        const n = 2 + Math.floor(t / 180);
        for (let i = 0; i < n; i++) {
          const a = Math.random() * Math.PI * 2;
          const d = 80 + Math.random() * 260;
          const x = this.player.x + Math.cos(a) * d;
          const y = this.player.y + Math.sin(a) * d;
          this.telegraph('circle', x, y, 0, 0, 56, 1.2, () => this.hostileZone('acid', x, y, 56, 6, 9));
        }
      }
    }
  }

  spawnGroup(def: EnemyDef, n: number): number {
    const p = this.player;
    const vr = this.viewRect();
    const margin = 60;
    const baseA = Math.random() * Math.PI * 2;
    const dist = Math.hypot(vr.w, vr.h) / 2 + margin;
    let sx = 0;
    let sy = 0;
    let found = false;
    for (let tries = 0; tries < 8 && !found; tries++) {
      const a = baseA + tries * 0.8;
      sx = p.x + Math.cos(a) * dist;
      sy = p.y + Math.sin(a) * dist;
      if (sx < 30 || sy < 60 || sx > this.stage.width - 30 || sy > this.stage.height - 30) continue;
      if (pointInObstacles(sx, sy, def.radius, this.layout.obstacles)) continue;
      found = true;
    }
    if (!found) {
      // arena edge fallback: spawn along the farthest edge strip outside the view
      sx = Math.max(30, Math.min(this.stage.width - 30, sx));
      sy = Math.max(60, Math.min(this.stage.height - 30, sy));
      if (sx > vr.x && sx < vr.x + vr.w && sy > vr.y && sy < vr.y + vr.h) {
        sx = p.x < this.stage.width / 2 ? Math.min(this.stage.width - 30, vr.x + vr.w + margin) : Math.max(30, vr.x - margin);
      }
    }
    let spawned = 0;
    const dirA = Math.atan2(p.y - sy, p.x - sx);
    for (let i = 0; i < n; i++) {
      const ox = n > 1 ? (Math.random() - 0.5) * 40 * Math.sqrt(n) : 0;
      const oy = n > 1 ? (Math.random() - 0.5) * 40 * Math.sqrt(n) : 0;
      const e = this.spawnEnemy(def, sx + ox, sy + oy);
      if (!e) break;
      if (def.behavior === 'swarm') {
        e.dirx = Math.cos(dirA);
        e.diry = Math.sin(dirA);
        e.face = e.dirx < 0 ? -1 : 1;
      }
      spawned++;
    }
    return spawned;
  }

  spawnEnemy(def: EnemyDef, x: number, y: number, opts: { elite?: boolean; hpMul?: number } = {}): Enemy | null {
    const e = this.enemies.get();
    if (!e) return null;
    const t = this.time;
    const hpMul = this.stage.hpScale * (1 + (t / 60) * 0.16) * (opts.hpMul ?? 1);
    e.uid = this.uid++;
    e.def = def;
    e.boss = null;
    e.elite = !!opts.elite;
    e.sprite = enemySprite(def.behavior === 'mimic' ? 'mimic_hide' : def.sprite);
    e.x = x;
    e.y = y;
    e.vx = e.vy = 0;
    e.scale = e.elite ? 2 : 1;
    e.r = def.radius * e.scale;
    e.maxHp = e.hp = def.hp * hpMul * (e.elite ? 12 : 1);
    e.speed = def.speed * (e.elite ? 0.9 : 1) * (0.92 + Math.random() * 0.16);
    e.dmg = def.dmg * (e.elite ? 1.2 : 1);
    e.xp = def.xp;
    e.armor = (def.armor ?? 0) * (1 + t / 600);
    e.kres = e.elite ? 0.9 : def.knockResist ?? 0;
    e.flash = 0;
    e.state = 0;
    e.timer = 1 + Math.random() * 2;
    e.t2 = Math.random() * 10;
    e.dirx = 0;
    e.diry = 0;
    e.slow = 0;
    e.stun = 0;
    e.face = 1;
    e.phase = 1;
    e.spawnT = 0.25;
    e.pat = 0;
    e.act = 0;
    e.ax = 0;
    e.ay = 0;
    e.hitT.fill(-99);
    if (!this.enemyKills[def.id]) this.enemyKills[def.id] = 0;
    return e;
  }

  spawnBoss(id: string) {
    const def = BOSS_MAP[id];
    const p = this.player;
    const vr = this.viewRect();
    const x = Math.max(80, Math.min(this.stage.width - 80, p.x + (p.x < this.stage.width / 2 ? 1 : -1) * Math.min(vr.w * 0.38, 360)));
    const y = Math.max(120, Math.min(this.stage.height - 80, p.y - 40));
    const pseudo: EnemyDef = { id: def.id, name: def.name, desc: def.desc, behavior: 'chase', hp: def.hp, speed: def.speed, dmg: def.dmg, radius: def.radius, xp: 0, sprite: def.sprite };
    const e = this.spawnEnemy(pseudo, x, y, { hpMul: 1 });
    if (!e) return;
    e.boss = def;
    e.sprite = enemySprite(def.sprite);
    e.scale = 1.6;
    e.r = def.radius;
    // bosses scale lightly with time of arrival rather than the regular ramp
    e.maxHp = e.hp = def.hp * (1 + (this.time / 60) * 0.04);
    e.dmg = def.dmg;
    e.speed = def.speed;
    e.kres = 1;
    e.armor = 0;
    e.timer = 2.2;
    e.state = 0;
    e.spawnT = 1.2;
    this.boss = e;
    this.bossSpawned = true;
    audio.play('boss');
    audio.playMusic('boss');
    this.shake(10);
    this.onEvent({ type: 'bossIntro', name: def.name, title: def.title, desc: def.desc });
    // clear space: push nearby enemies away
    for (const o of this.enemies.items) {
      if (!o.alive || o === e) continue;
      const dx = o.x - e.x;
      const dy = o.y - e.y;
      const d = Math.hypot(dx, dy) || 1;
      if (d < 200) {
        o.vx += (dx / d) * 400;
        o.vy += (dy / d) * 400;
      }
    }
  }

  private checkTimeline() {
    const st = this.stage;
    if (!this.midBossSpawned && this.time >= st.midBossAt) {
      this.midBossSpawned = true;
      const def = ENEMY_MAP[st.midBoss];
      const vr = this.viewRect();
      const a = Math.random() * Math.PI * 2;
      const x = Math.max(60, Math.min(st.width - 60, this.player.x + Math.cos(a) * vr.w * 0.45));
      const y = Math.max(80, Math.min(st.height - 60, this.player.y + Math.sin(a) * vr.h * 0.45));
      const e = this.spawnEnemy(def, x, y, { elite: true });
      if (e) {
        e.sprite = enemySprite(def.behavior === 'mimic' ? 'mimic' : def.sprite);
        this.onEvent({ type: 'banner', title: `중간 보스 · ${def.name}`, sub: '처치하면 분실물 상자를 떨어뜨린다', tone: 'warn', label: 'ELITE' });
        audio.play('warn');
      }
    }
    if (!this.bossSpawned && this.time >= st.bossAt) this.spawnBoss(st.boss);
    if (this.time >= st.duration && !this.overtime) {
      if (this.bossDefeated) this.finish(true);
      else {
        this.overtime = true;
        if (this.boss) this.boss.speed *= 1.3;
        this.onEvent({ type: 'banner', title: '마지막 종이 울렸다', sub: '보스를 처치해야 방과 후가 끝난다', tone: 'boss', label: 'OVERTIME' });
        audio.play('bell');
      }
    }
    if (this.overtime && this.bossDefeated) this.finish(true);
  }

  // ───────────────────────── enemies ─────────────────────────
  private updateEnemies(dt: number) {
    const p = this.player;
    const list = this.enemies.items;
    this.separationFlip ^= 1;
    for (let i = 0; i < list.length; i++) {
      const e = list[i];
      if (!e.alive) continue;
      if (e.spawnT > 0) e.spawnT -= dt;
      if (e.flash > 0) e.flash -= dt;
      if (e.slow > 0) e.slow -= dt;
      // knockback decay
      if (e.vx || e.vy) {
        e.x += e.vx * dt;
        e.y += e.vy * dt;
        const f = Math.pow(0.002, dt);
        e.vx *= f;
        e.vy *= f;
        if (Math.abs(e.vx) < 2) e.vx = 0;
        if (Math.abs(e.vy) < 2) e.vy = 0;
      }
      if (e.stun > 0) {
        e.stun -= dt;
      } else if (e.boss) updateBoss(this, e, dt);
      else updateEnemy(this, e, dt);

      // separation (half of the enemies each frame)
      if ((i & 1) === this.separationFlip && !e.boss) {
        let pushx = 0;
        let pushy = 0;
        let n = 0;
        this.hash.query(e.x, e.y, e.r * 2, list, (o) => {
          if (o === e) return;
          const dx = e.x - o.x;
          const dy = e.y - o.y;
          const rr = e.r + o.r;
          const d2 = dx * dx + dy * dy;
          if (d2 < rr * rr && d2 > 0.01) {
            const d = Math.sqrt(d2);
            const ov = (rr - d) / rr;
            pushx += (dx / d) * ov;
            pushy += (dy / d) * ov;
            if (++n > 6) return true;
          }
        });
        if (n) {
          e.x += pushx * 60 * dt * 2;
          e.y += pushy * 60 * dt * 2;
        }
      }
      if (e.def.behavior !== 'swarm') resolveCircle(e, e.r * 0.8, this.layout.obstacles);
      if (e.x < 10) e.x = 10;
      if (e.y < 30) e.y = 30;
      if (e.x > this.stage.width - 10) e.x = this.stage.width - 10;
      if (e.y > this.stage.height - 10) e.y = this.stage.height - 10;
      // despawn far stragglers (they respawn closer via the director)
      if (!e.boss && !e.elite) {
        const dx = e.x - p.x;
        const dy = e.y - p.y;
        if (dx * dx + dy * dy > 1600 * 1600) e.alive = false;
      }
    }
  }

  /** Apply damage from a player source. Returns damage dealt. */
  damageEnemy(e: Enemy, base: number, slot: number, knock: number, kx: number, ky: number, critBonus = 0): number {
    if (!e.alive || e.spawnT > 0.15) return 0;
    const s = this.player.stats;
    let dmg = base * s.might;
    const w = this.weapons[slot];
    if (w) {
      const club = CLUB_MAP[this.cfg.club]?.id;
      if (club === 'science' && w.def.tags.includes('projectile')) dmg *= 1.1;
      if (club === 'broadcast' && w.def.tags.includes('area')) dmg *= 1.1;
      if ((club === 'art' || this.cfg.character.special === 'artist') && w.def.tags.includes('dot')) dmg *= club === 'art' && this.cfg.character.special === 'artist' ? 1.6 : 1.3;
    }
    let crit = false;
    if (Math.random() < s.crit + critBonus) {
      dmg *= s.critDmg;
      crit = true;
    }
    if (e.boss && e.state === -1) dmg *= 0.2; // phase transition armor
    const final = Math.max(dmg * 0.2, dmg - e.armor);
    e.hp -= final;
    e.flash = 0.09;
    if (knock && e.kres < 1) {
      const k = knock * (1 - e.kres);
      e.vx += kx * k;
      e.vy += ky * k;
    }
    if (w) w.dealt += final;
    if (this.cfg.settings.damageNumbers) this.text(e.x + (Math.random() - 0.5) * 10, e.y - e.r, final, crit);
    audio.play('hit', { pitch: crit ? 1.4 : 1 });
    if (e.hp <= 0) this.killEnemy(e);
    return final;
  }

  killEnemy(e: Enemy, silent = false) {
    if (!e.alive) return;
    e.alive = false;
    const def = e.def;
    if (e.boss) {
      this.onBossKilled(e);
      return;
    }
    this.kills++;
    this.enemyKills[def.id] = (this.enemyKills[def.id] ?? 0) + 1;
    if (!silent) {
      this.burst(e.x, e.y, enemyColor(def.sprite), e.elite ? 24 : 6, e.elite ? 260 : 140);
      audio.play('kill', { pitch: 0.8 + Math.random() * 0.4 });
    }
    if (e.elite) {
      this.dropPickup('chest', e.x, e.y, 0);
      for (let i = 0; i < 6; i++) this.dropPickup('gem3', e.x + (Math.random() - 0.5) * 60, e.y + (Math.random() - 0.5) * 60, 20);
      this.bossKills++;
      this.shake(8);
      audio.play('boom');
      return;
    }
    // xp gem
    const v = e.xp;
    const kind = v >= 10 ? 'gem3' : v >= 3 ? 'gem2' : 'gem1';
    this.dropPickup(kind, e.x, e.y, v);
    const luck = this.player.stats.luck;
    if (Math.random() < 0.035 * luck * (def.behavior === 'mimic' ? 6 : 1)) this.dropPickup('coin', e.x + 6, e.y, 1);
    let food = 0.006 * this.player.stats.healMult;
    if (this.event?.id === 'lunch') food *= 4;
    if (Math.random() < food) this.dropPickup('food', e.x, e.y - 6, 0);
    if (Math.random() < 0.0012 * luck) this.dropPickup('magnet', e.x, e.y, 0);
    // split
    if (def.splitInto && def.splitCount) {
      const child = ENEMY_MAP[def.splitInto];
      for (let i = 0; i < def.splitCount; i++) {
        const c = this.spawnEnemy(child, e.x + (i - 0.5) * 14, e.y + (Math.random() - 0.5) * 10);
        if (c) {
          c.spawnT = 0;
          c.vx = (i - 0.5) * 220;
          c.vy = (Math.random() - 0.5) * 120;
        }
      }
    }
  }

  private onBossKilled(e: Enemy) {
    const def = e.boss!;
    this.bossKills++;
    this.bossesKilled.push(def.id);
    this.bossDefeated = true;
    this.boss = null;
    this.shake(14);
    audio.play('boom');
    audio.play('bell');
    audio.playMusic('battle');
    for (let i = 0; i < 5; i++) this.burst(e.x + (Math.random() - 0.5) * 60, e.y + (Math.random() - 0.5) * 60, i % 2 ? '#E2B94A' : '#F1EBDD', 18, 320);
    this.dropPickup('chest', e.x, e.y, 0);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      this.dropPickup('coin', e.x + Math.cos(a) * 50, e.y + Math.sin(a) * 50, 3);
    }
    for (let i = 0; i < 10; i++) this.dropPickup('gem3', e.x + (Math.random() - 0.5) * 90, e.y + (Math.random() - 0.5) * 90, 25);
    for (const b of this.bullets.items) b.alive = false;
    for (const z of this.zones.items) if (z.hostile) z.alive = false;
    for (const t of this.telegraphs.items) t.alive = false;
    const remain = Math.max(0, this.stage.duration - this.time);
    this.onEvent({
      type: 'banner', title: `${def.name} 처치`, tone: 'boss', label: 'BOSS DEFEATED',
      sub: remain > 1 && !this.overtime ? `마지막 종까지 ${fmtTime(remain)} · 끝까지 살아남아라` : '방과 후가 끝났다',
    });
  }

  private onDeath() {
    const p = this.player;
    if (p.revives > 0) {
      p.revives--;
      p.hp = p.stats.maxHp * 0.5;
      p.invuln = 2.5;
      // shockwave clears nearby
      for (const e of this.enemies.items) {
        if (!e.alive || e.boss) continue;
        const dx = e.x - p.x;
        const dy = e.y - p.y;
        const d = Math.hypot(dx, dy) || 1;
        if (d < 260) {
          if (!e.elite) this.killEnemy(e);
          else {
            e.vx += (dx / d) * 600;
            e.vy += (dy / d) * 600;
          }
        }
      }
      for (const b of this.bullets.items) b.alive = false;
      audio.play('heal');
      this.onEvent({ type: 'banner', title: '보건실 이용권 사용', sub: '체력 50%로 다시 일어났다', tone: 'info', label: 'REVIVE' });
      return;
    }
    this.finish(false);
  }

  finish(cleared: boolean) {
    if (this.state === 'over') return;
    this.state = 'over';
    audio.playMusic('none');
    audio.play(cleared ? 'clear' : 'gameover');
    const result: RunResult = {
      stage: this.stage.id,
      char: this.cfg.character.id,
      club: this.cfg.club,
      time: Math.min(this.time, this.stage.duration + 600),
      kills: this.kills,
      level: this.player.level,
      cleared,
      coins: Math.round(this.coins),
      weapons: this.weapons.map((w) => ({ id: w.def.id, level: w.level })),
      passives: this.passives.map((p) => ({ id: p.id, level: p.level })),
      evolutions: [...this.evolutions],
      bossKills: this.bossKills,
      bossesKilled: [...this.bossesKilled],
      enemyKills: { ...this.enemyKills },
      synergies: [...this.synergies],
      maxWeapons: this.maxWeapons,
      dmgByWeapon: Object.fromEntries(this.weapons.map((w) => [w.def.id, Math.round(w.dealt)])),
      coinGain: this.player.stats.coinGain,
    };
    window.setTimeout(() => this.onEvent({ type: 'end', result }), cleared ? 1400 : 1100);
  }

  // ───────────────────────── hostile objects ─────────────────────────
  enemyBullet(kind: EnemyBullet['kind'], x: number, y: number, vx: number, vy: number, dmg: number, r = 6, life = 5, bounce = 0) {
    const b = this.bullets.get();
    if (!b) return;
    b.kind = kind;
    b.x = x;
    b.y = y;
    b.vx = vx;
    b.vy = vy;
    b.dmg = dmg * this.enemyDmgMult();
    b.r = r;
    b.life = life;
    b.bounce = bounce;
    b.t = 0;
  }

  hostileZone(kind: Zone['kind'], x: number, y: number, r: number, life: number, dmg: number, a = 0, b = 0) {
    const z = this.zones.get();
    if (!z) return null;
    z.kind = kind;
    z.x = x;
    z.y = y;
    z.r = r;
    z.life = z.maxLife = life;
    z.dmg = dmg * this.enemyDmgMult();
    z.tick = 0;
    z.hostile = true;
    z.follow = false;
    z.a = a;
    z.b = b;
    z.slot = -1;
    z.evo = false;
    return z;
  }

  telegraph(shape: Telegraph['shape'], x: number, y: number, x2: number, y2: number, r: number, dur: number, onDone: (() => void) | null, w = 0) {
    const t = this.telegraphs.get();
    if (!t) {
      onDone?.();
      return;
    }
    t.shape = shape;
    t.x = x;
    t.y = y;
    t.x2 = x2;
    t.y2 = y2;
    t.r = r;
    t.w = w;
    t.t = 0;
    t.dur = dur;
    t.onDone = onDone;
  }

  /** Damage the player if within a circle. */
  areaHit(x: number, y: number, r: number, dmg: number) {
    const p = this.player;
    const dx = p.x - x;
    const dy = p.y - y;
    if (dx * dx + dy * dy < (r + p.r) * (r + p.r)) this.hurtPlayer(dmg * this.enemyDmgMult());
  }

  lineHit(x1: number, y1: number, x2: number, y2: number, w: number, dmg: number) {
    const p = this.player;
    const d = segDist(p.x, p.y, x1, y1, x2, y2);
    if (d < w / 2 + p.r) this.hurtPlayer(dmg * this.enemyDmgMult());
  }

  private updateHostile(dt: number) {
    const p = this.player;
    const W = this.stage.width;
    const H = this.stage.height;
    for (const b of this.bullets.items) {
      if (!b.alive) continue;
      b.t += dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
      if (b.bounce > 0) {
        if (b.x < 20 || b.x > W - 20) {
          b.vx *= -1;
          b.bounce--;
          b.x = Math.max(20, Math.min(W - 20, b.x));
        }
        if (b.y < 40 || b.y > H - 20) {
          b.vy *= -1;
          b.bounce--;
          b.y = Math.max(40, Math.min(H - 20, b.y));
        }
      }
      if (b.life <= 0 || b.x < -50 || b.y < -50 || b.x > W + 50 || b.y > H + 50) {
        if (b.kind === 'acid' && b.life <= 0) this.hostileZone('acid', b.x, b.y, 30, 3.5, 7);
        b.alive = false;
        continue;
      }
      const dx = b.x - p.x;
      const dy = b.y - p.y;
      const rr = b.r + p.r - 2;
      if (dx * dx + dy * dy < rr * rr) {
        this.hurtPlayer(b.dmg);
        if (b.kind === 'acid') this.hostileZone('acid', b.x, b.y, 30, 3.5, 7);
        b.alive = false;
      }
    }
    for (const z of this.zones.items) {
      if (!z.alive || !z.hostile) continue;
      z.life -= dt;
      if (z.life <= 0) {
        z.alive = false;
        continue;
      }
      const dx = p.x - z.x;
      const dy = p.y - z.y;
      const d = Math.hypot(dx, dy);
      if (z.kind === 'acid') {
        z.tick -= dt;
        if (d < z.r + p.r * 0.5 && z.tick <= 0 && z.life < z.maxLife - 0.3) {
          z.tick = 0.45;
          this.hurtPlayer(z.dmg);
        }
      } else if (z.kind === 'wave') {
        // expanding ring; z.a = gap angle, z.b = gap half-width (rad), z.tick = ring speed, z.r = current radius
        z.r += z.tick * dt;
        if (z.slot !== 1 && Math.abs(d - z.r) < 12 + p.r) {
          let inGap = false;
          if (z.b > 0) {
            const ang = Math.atan2(dy, dx);
            let diff = Math.abs(ang - z.a) % (Math.PI * 2);
            if (diff > Math.PI) diff = Math.PI * 2 - diff;
            inGap = diff < z.b;
          }
          if (!inGap) {
            this.hurtPlayer(z.dmg);
            z.slot = 1; // one hit per ring
          }
        }
      }
    }
    for (const t of this.telegraphs.items) {
      if (!t.alive) continue;
      t.t += dt;
      if (t.t >= t.dur) {
        t.alive = false;
        const cb = t.onDone;
        t.onDone = null;
        cb?.();
      }
    }
  }

  // ───────────────────────── pickups ─────────────────────────
  dropPickup(kind: Pickup['kind'], x: number, y: number, value: number) {
    let pk = this.pickups.get();
    if (!pk) {
      if (kind.startsWith('gem')) {
        // pool exhausted: fold into an existing gem
        for (const o of this.pickups.items) if (o.kind.startsWith('gem')) {
          o.value += value;
          o.kind = o.value >= 10 ? 'gem3' : o.value >= 3 ? 'gem2' : 'gem1';
          return;
        }
      }
      return;
    }
    pk.kind = kind;
    pk.x = x;
    pk.y = y;
    pk.value = value;
    pk.vacuum = false;
    pk.t = 0;
    pk.vx = (Math.random() - 0.5) * 60;
    pk.vy = (Math.random() - 0.5) * 60;
  }

  private updatePickups(dt: number) {
    const p = this.player;
    const mag = MAGNET_BASE * p.stats.magnet;
    const mag2 = mag * mag;
    for (const pk of this.pickups.items) {
      if (!pk.alive) continue;
      pk.t += dt;
      if (pk.vx || pk.vy) {
        pk.x += pk.vx * dt;
        pk.y += pk.vy * dt;
        pk.vx *= 0.9;
        pk.vy *= 0.9;
        if (Math.abs(pk.vx) < 1) pk.vx = 0;
        if (Math.abs(pk.vy) < 1) pk.vy = 0;
      }
      const dx = p.x - pk.x;
      const dy = p.y - pk.y;
      const d2 = dx * dx + dy * dy;
      if (!pk.vacuum && d2 < mag2 && pk.kind !== 'chest') pk.vacuum = true;
      if (pk.kind === 'chest' && d2 < 40 * 40) pk.vacuum = true;
      if (pk.vacuum) {
        const d = Math.sqrt(d2) || 1;
        const sp = 320 + pk.t * 120;
        pk.x += (dx / d) * sp * dt;
        pk.y += (dy / d) * sp * dt;
        if (d < p.r + 8) this.collect(pk);
      }
    }
  }

  private collect(pk: Pickup) {
    pk.alive = false;
    const p = this.player;
    switch (pk.kind) {
      case 'gem1':
      case 'gem2':
      case 'gem3': {
        let mult = p.stats.xpGain;
        if (this.event?.id === 'night') mult *= 1.6;
        if (this.event?.id === 'exam') mult *= 1.5;
        this.gainXp(pk.value * mult);
        audio.play('gem', { pitch: 1 + Math.min(0.6, p.xp / p.xpNext) * 0.5 });
        break;
      }
      case 'coin': {
        let v = pk.value * p.stats.coinGain;
        if (this.event?.id === 'exam') v *= 1.5;
        this.coins += v;
        audio.play('coin');
        break;
      }
      case 'food': {
        const h = 25 * p.stats.healMult * (this.synergies.has('meal') ? 1.5 : 1);
        p.hp = Math.min(p.stats.maxHp, p.hp + h);
        this.text(p.x, p.y - 20, h, false, '#68B6AA', '+');
        audio.play('heal');
        break;
      }
      case 'magnet':
        for (const o of this.pickups.items) if (o.alive && o.kind.startsWith('gem')) o.vacuum = true;
        audio.play('chest');
        break;
      case 'chest':
        this.openChest();
        break;
    }
  }

  gainXp(v: number) {
    const p = this.player;
    p.xp += v;
    while (p.xp >= p.xpNext) {
      p.xp -= p.xpNext;
      p.level++;
      p.xpNext = this.xpFor(p.level);
      this.pendingLevels++;
    }
    if (this.pendingLevels > 0 && this.state === 'play') this.openLevelUp();
  }

  // ───────────────────────── level up ─────────────────────────
  private openLevelUp() {
    this.state = 'levelup';
    this.input.clear();
    audio.play('levelup');
    audio.duck(true);
    this.burst(this.player.x, this.player.y, '#E2B94A', 16, 200);
    this.onEvent({ type: 'levelup', options: this.rollOptions(), rerolls: this.player.rerolls, skips: this.player.skips, level: this.player.level - this.pendingLevels + 1 });
  }

  rollOptions(): UpgradeOption[] {
    const cands: { opt: UpgradeOption; w: number }[] = [];
    const club = CLUB_MAP[this.cfg.club];
    // evolutions first
    for (const w of this.weapons) {
      const evo = this.canEvolve(w);
      if (evo) {
        const ed = WEAPON_MAP[evo];
        cands.push({ opt: { kind: 'evolve', id: w.def.id, name: ed.name, desc: ed.desc, level: w.level, next: 1, isNew: false, tag: '진화' }, w: 30 });
      }
    }
    for (const w of this.weapons) {
      const max = weaponMaxLevel(w.def);
      if (w.level < max) {
        cands.push({ opt: { kind: 'weapon', id: w.def.id, name: w.def.name, desc: describeDelta(w.def, w.level + 1), level: w.level, next: w.level + 1, isNew: false, tag: '무기 강화' }, w: 3.2 });
      }
    }
    if (this.weapons.length < MAX_WEAPON_SLOTS) {
      for (const d of BASE_WEAPONS) {
        if (this.weapons.some((w) => w.def.id === d.id || w.def.id === d.evolvesInto)) continue;
        let wt = 1.4;
        if (club?.id === 'science' && d.tags.includes('projectile')) wt *= 1.4;
        if (club?.id === 'broadcast' && d.tags.includes('area')) wt *= 1.4;
        if (club?.id === 'art' && d.tags.includes('dot')) wt *= 1.6;
        if (club?.id === 'sports' && d.tags.includes('melee')) wt *= 1.5;
        if (this.passives.some((p) => p.id === d.evolvesWith)) wt *= 1.5;
        cands.push({ opt: { kind: 'weapon', id: d.id, name: d.name, desc: d.desc, level: 0, next: 1, isNew: true, tag: '새 무기' }, w: wt });
      }
    }
    for (const pi of this.passives) {
      const d = PASSIVE_MAP[pi.id];
      if (pi.level < d.maxLevel) cands.push({ opt: { kind: 'passive', id: d.id, name: d.name, desc: d.desc, level: pi.level, next: pi.level + 1, isNew: false, tag: '능력 강화' }, w: 2.4 });
    }
    if (this.passives.length < MAX_PASSIVE_SLOTS) {
      for (const d of PASSIVES) {
        if (this.passives.some((p) => p.id === d.id)) continue;
        let wt = 1.2;
        if (this.weapons.some((w) => w.def.evolvesWith === d.id)) wt *= 2;
        cands.push({ opt: { kind: 'passive', id: d.id, name: d.name, desc: d.desc, level: 0, next: 1, isNew: true, tag: '새 능력' }, w: wt });
      }
    }
    // reduce weight of options offered last time but not taken (variety)
    for (const c of cands) if (this.lastOffered.has(c.opt.kind + c.opt.id)) c.w *= 0.55;

    const p = this.player;
    let count = 3;
    if (this.cfg.character.special === 'xp') count = 4;
    else if (Math.random() < Math.min(0.5, 0.08 + (p.stats.luck - 1) * 0.6)) count = 4;
    const picked: UpgradeOption[] = [];
    while (picked.length < count && cands.length) {
      const total = cands.reduce((a, c) => a + c.w, 0);
      let r = Math.random() * total;
      let idx = 0;
      for (; idx < cands.length; idx++) {
        r -= cands[idx].w;
        if (r <= 0) break;
      }
      idx = Math.min(idx, cands.length - 1);
      const c = cands.splice(idx, 1)[0];
      // never offer the same item twice (e.g. evolve + upgrade of same weapon)
      if (picked.some((x) => x.id === c.opt.id && x.kind !== 'evolve' && c.opt.kind !== 'evolve')) continue;
      picked.push(c.opt);
    }
    if (picked.length === 0) {
      picked.push({ kind: 'heal', id: 'heal', name: '보건실 휴식', desc: '체력을 40% 회복한다.', level: 0, next: 0, isNew: false, tag: '회복' });
      picked.push({ kind: 'coin', id: 'coin', name: '매점 쿠폰', desc: '학교 코인 +30', level: 0, next: 0, isNew: false, tag: '보상' });
    } else if (picked.length < 3) {
      picked.push({ kind: 'heal', id: 'heal', name: '보건실 휴식', desc: '체력을 40% 회복한다.', level: 0, next: 0, isNew: false, tag: '회복' });
    }
    this.lastOffered = new Set(picked.map((o) => o.kind + o.id));
    return picked;
  }

  chooseUpgrade(opt: UpgradeOption) {
    if (this.state !== 'levelup') return;
    audio.play('select');
    switch (opt.kind) {
      case 'weapon':
        if (opt.isNew) this.addWeapon(opt.id);
        else {
          const w = this.weapons.find((x) => x.def.id === opt.id);
          if (w) {
            w.level++;
            w.stats = weaponStatsAt(w.def, w.level);
          }
        }
        break;
      case 'passive':
        this.addPassive(opt.id);
        break;
      case 'evolve': {
        const w = this.weapons.find((x) => x.def.id === opt.id);
        if (w) this.evolve(w);
        break;
      }
      case 'heal':
        this.player.hp = Math.min(this.player.stats.maxHp, this.player.hp + this.player.stats.maxHp * 0.4);
        audio.play('heal');
        break;
      case 'coin':
        this.coins += 30;
        break;
    }
    this.lastOffered.delete(opt.kind + opt.id);
    this.afterLevelChoice();
  }

  reroll() {
    if (this.state !== 'levelup' || this.player.rerolls <= 0) return;
    this.player.rerolls--;
    audio.play('click');
    this.onEvent({ type: 'levelup', options: this.rollOptions(), rerolls: this.player.rerolls, skips: this.player.skips, level: this.player.level - this.pendingLevels + 1 });
  }

  skip() {
    if (this.state !== 'levelup' || this.player.skips <= 0) return;
    this.player.skips--;
    this.coins += 10;
    audio.play('click');
    this.afterLevelChoice();
  }

  private afterLevelChoice() {
    this.pendingLevels = Math.max(0, this.pendingLevels - 1);
    this.recalcStats();
    this.checkSynergies();
    if (this.pendingLevels > 0) {
      this.onEvent({ type: 'levelup', options: this.rollOptions(), rerolls: this.player.rerolls, skips: this.player.skips, level: this.player.level - this.pendingLevels + 1 });
    } else {
      this.state = 'play';
      audio.duck(false);
      this.last = performance.now();
      this.player.invuln = Math.max(this.player.invuln, 0.6);
      this.onEvent({ type: 'levelupDone' });
    }
  }

  addWeapon(id: string) {
    const def = WEAPON_MAP[id];
    if (!def || this.weapons.length >= MAX_WEAPON_SLOTS) return;
    this.weapons.push({ def, level: 1, slot: this.weapons.length, timer: 0.4, stats: weaponStatsAt(def, 1), active: 0, angle: 0, burst: 0, burstT: 0, dealt: 0 });
    this.maxWeapons = Math.max(this.maxWeapons, this.weapons.length);
  }

  addPassive(id: string) {
    const ex = this.passives.find((p) => p.id === id);
    if (ex) ex.level = Math.min(PASSIVE_MAP[id].maxLevel, ex.level + 1);
    else if (this.passives.length < MAX_PASSIVE_SLOTS) this.passives.push({ id, level: 1 });
  }

  canEvolve(w: WeaponInst): string | null {
    const d = w.def;
    if (!d.evolvesInto || !d.evolvesWith) return null;
    if (w.level < weaponMaxLevel(d)) return null;
    if (!this.passives.some((p) => p.id === d.evolvesWith)) return null;
    return d.evolvesInto;
  }

  evolve(w: WeaponInst) {
    const into = w.def.evolvesInto;
    if (!into) return;
    const nd = WEAPON_MAP[into];
    w.def = nd;
    w.level = 1;
    w.stats = weaponStatsAt(nd, 1);
    w.timer = 0.2;
    w.active = 0;
    this.evolutions.push(nd.id);
    audio.play('evolve');
    this.shake(8);
    for (let i = 0; i < 3; i++) this.burst(this.player.x, this.player.y, i === 0 ? '#E2B94A' : '#F1EBDD', 20, 260 + i * 80);
    this.onEvent({ type: 'banner', title: nd.name, sub: nd.short, tone: 'evolve', label: 'EVOLUTION' });
  }

  private openChest() {
    this.state = 'chest';
    this.input.clear();
    audio.play('chest');
    const items: { id: string; name: string; text: string; evo: boolean }[] = [];
    // evolution has priority
    const evoW = this.weapons.find((w) => this.canEvolve(w));
    if (evoW) {
      const into = WEAPON_MAP[evoW.def.evolvesInto!];
      this.evolve(evoW);
      items.push({ id: into.id, name: into.name, text: '무기 진화', evo: true });
    }
    const rolls = evoW ? 1 : 1 + (Math.random() < 0.35 * this.player.stats.luck ? 2 : 0);
    for (let i = 0; i < rolls; i++) {
      const ups = this.weapons.filter((w) => !w.def.isEvolution && w.level < weaponMaxLevel(w.def));
      const pups = this.passives.filter((p) => p.level < PASSIVE_MAP[p.id].maxLevel);
      if (ups.length && (Math.random() < 0.65 || !pups.length)) {
        const w = ups[Math.floor(Math.random() * ups.length)];
        w.level++;
        w.stats = weaponStatsAt(w.def, w.level);
        items.push({ id: w.def.id, name: w.def.name, text: `Lv ${w.level}`, evo: false });
      } else if (pups.length) {
        const p = pups[Math.floor(Math.random() * pups.length)];
        p.level++;
        items.push({ id: p.id, name: PASSIVE_MAP[p.id].name, text: `Lv ${p.level}`, evo: false });
      }
    }
    const coins = Math.round((20 + Math.random() * 30) * this.player.stats.coinGain * this.stage.coinMult);
    this.coins += coins;
    this.recalcStats();
    this.checkSynergies();
    this.onEvent({ type: 'chest', title: '분실물 상자', items, coins });
  }

  closeChest() {
    if (this.state !== 'chest') return;
    this.resume();
    if (this.pendingLevels > 0) this.openLevelUp();
  }

  // ───────────────────────── synergies ─────────────────────────
  hasItem(id: string): boolean {
    if (this.passives.some((p) => p.id === id)) return true;
    return this.weapons.some((w) => w.def.id === id || w.def.id === id + '_evo');
  }

  checkSynergies() {
    for (const s of SYNERGIES) {
      if (this.synergies.has(s.id)) continue;
      if (s.needs.every((n) => this.hasItem(n))) {
        this.synergies.add(s.id);
        this.recalcStats();
        audio.play('chest');
        this.onEvent({ type: 'banner', title: s.name, sub: s.desc, tone: 'synergy', label: 'SYNERGY' });
      }
    }
  }

  // ───────────────────────── schedule events ─────────────────────────
  private updateSchedule(dt: number) {
    if (this.event) {
      this.event.remain -= dt;
      if (this.event.id === 'cleaning') this.updateMop(dt);
      if (this.event.remain <= 0) {
        this.event = null;
        this.recalcStats();
      }
      return;
    }
    if (this.boss && this.boss.alive) return;
    if (this.time >= this.nextEventAt && this.time < this.stage.duration - 20) {
      const opts = SCHEDULE_EVENTS.filter((e) => e.id !== this.lastEvent);
      const ev = opts[Math.floor(Math.random() * opts.length)];
      const gamerBoost = CLUB_MAP[this.cfg.club]?.special === 'gamer' ? 1.3 : 1;
      this.event = { id: ev.id, remain: ev.duration * gamerBoost };
      this.lastEvent = ev.id;
      this.nextEventAt = this.time + ev.duration * gamerBoost + 70 + Math.random() * 35;
      if (ev.id === 'cleaning') this.mopX = this.viewRect().x - 60;
      this.recalcStats();
      audio.play('bell');
      this.onEvent({ type: 'banner', title: ev.name, sub: ev.desc, tone: 'event', label: `${this.clockString()} · ${ev.period}` });
    }
  }

  private updateMop(dt: number) {
    const vr = this.viewRect();
    const total = EVENT_MAP.cleaning.duration;
    const speed = (vr.w + 200) / (total * 0.6);
    this.mopX += speed * dt;
    if (this.mopX > vr.x + vr.w + 120) this.mopX = vr.x - 120;
    for (const e of this.enemies.items) {
      if (!e.alive || e.boss || e.elite) continue;
      if (Math.abs(e.x - this.mopX) < 36 && e.y > vr.y - 40 && e.y < vr.y + vr.h + 40) this.killEnemy(e);
    }
  }

  clockString(): string {
    const frac = Math.min(1, this.time / this.stage.duration);
    const mins = 17 * 60 + Math.floor(frac * 300);
    return `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;
  }

  // ───────────────────────── fx ─────────────────────────
  burst(x: number, y: number, color: string, n: number, speed: number) {
    for (let i = 0; i < n; i++) {
      const pt = this.particles.get();
      if (!pt) return;
      const a = Math.random() * Math.PI * 2;
      const s = speed * (0.3 + Math.random() * 0.7);
      pt.x = x;
      pt.y = y;
      pt.vx = Math.cos(a) * s;
      pt.vy = Math.sin(a) * s;
      pt.life = pt.maxLife = 0.3 + Math.random() * 0.35;
      pt.size = 3 + Math.random() * 3;
      pt.color = color;
      pt.grav = 0;
    }
  }

  text(x: number, y: number, v: number, crit: boolean, color?: string, prefix = '') {
    const t = this.texts.get();
    if (!t) return;
    t.x = x;
    t.y = y;
    t.text = prefix + Math.max(1, Math.round(v));
    t.life = crit ? 0.8 : 0.6;
    t.crit = crit;
    t.color = color ?? (crit ? '#E69A5A' : '#F1EBDD');
  }

  private updateFx(dt: number) {
    for (const pt of this.particles.items) {
      if (!pt.alive) continue;
      pt.life -= dt;
      if (pt.life <= 0) {
        pt.alive = false;
        continue;
      }
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      pt.vx *= 0.9;
      pt.vy = pt.vy * 0.9 + pt.grav * dt;
    }
    for (const t of this.texts.items) {
      if (!t.alive) continue;
      t.life -= dt;
      t.y -= 26 * dt;
      if (t.life <= 0) t.alive = false;
    }
  }

  play(name: SfxName) {
    audio.play(name);
  }

  // ───────────────────────── HUD bridge ─────────────────────────
  private writeHud() {
    const h = this.hud;
    const p = this.player;
    h.time = this.time;
    h.level = p.level;
    h.xp = p.xp;
    h.xpNext = p.xpNext;
    h.hp = Math.max(0, p.hp);
    h.maxHp = p.stats.maxHp;
    h.kills = this.kills;
    h.coins = Math.floor(this.coins);
    h.overtime = this.overtime;
    h.clock = this.clockString();
    h.boss = this.boss && this.boss.alive ? { name: this.boss.boss!.name, hp: this.boss.hp, max: this.boss.maxHp, phase: this.boss.phase } : null;
    if (h.weapons.length !== this.weapons.length || this.weapons.some((w, i) => h.weapons[i].level !== w.level || h.weapons[i].id !== w.def.id)) {
      h.weapons = this.weapons.map((w) => ({ id: w.def.id, level: w.level, evo: !!w.def.isEvolution, max: weaponMaxLevel(w.def) }));
    }
    if (h.passives.length !== this.passives.length || this.passives.some((x, i) => h.passives[i].level !== x.level)) {
      h.passives = this.passives.map((x) => ({ id: x.id, level: x.level, max: PASSIVE_MAP[x.id].maxLevel }));
    }
    h.event = this.event ? { name: EVENT_MAP[this.event.id].name, remain: this.event.remain, id: this.event.id } : null;
    if (h.synergies.length !== this.synergies.size) h.synergies = [...this.synergies];
  }
}

export function fmtTime(s: number): string {
  const m = Math.floor(s / 60);
  const ss = Math.floor(s % 60);
  return `${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
}

export function segDist(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
  const vx = x2 - x1;
  const vy = y2 - y1;
  const l2 = vx * vx + vy * vy || 1;
  let t = ((px - x1) * vx + (py - y1) * vy) / l2;
  t = Math.max(0, Math.min(1, t));
  const cx = x1 + vx * t;
  const cy = y1 + vy * t;
  return Math.hypot(px - cx, py - cy);
}

const ENEMY_COLOR: Record<string, string> = {
  slime: '#5B7FB0', slime_mini: '#EDE6D3', ghost: '#EDE6D3', worm: '#F1EBDD', eraser: '#D9788A', locker: '#6C7486',
  knight: '#E2B94A', zombie: '#2E4466', mimic: '#D8DCE4', plane: '#EDE6D3', wraith: '#46685A', bomb: '#C9563C',
  ball: '#E69A5A', specimen: '#A7C66B', monitor: '#2E4466', nightwraith: '#8A6FB0', dodgeball: '#C9563C',
};
export function enemyColor(sprite: string) {
  return ENEMY_COLOR[sprite] ?? '#F1EBDD';
}
