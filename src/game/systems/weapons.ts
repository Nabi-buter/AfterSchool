import type { Game } from '../core/Game';
import { segDist } from '../core/Game';
import type { Enemy, Projectile, WeaponInst, Zone } from '../core/world';
import { audio } from '../audio/audio';

const TAU = Math.PI * 2;

export interface Eff {
  dmg: number;
  cd: number;
  count: number;
  area: number;
  speed: number;
  pierce: number;
  dur: number;
}

/** Effective stats of a firing weapon instance after player stats & synergies. */
export function eff(g: Game, w: WeaponInst): Eff {
  const s = w.stats;
  const P = g.player.stats;
  const k = w.def.kind;
  let count = s.count + P.amount;
  let pierce = s.pierce;
  let area = s.area * P.area;
  if (k === 'compass' && g.synergies.has('draft')) count += 1;
  if (k === 'pencil' && g.synergies.has('draft')) pierce += 2;
  if (k === 'basketball' && g.synergies.has('cheer')) pierce += 3;
  if (k === 'pencil' && w.def.isEvolution) count = 4 + P.amount;
  if (k === 'recorder' || k === 'tape') count = 1; // amount doesn't multiply auras / trails
  if (k === 'ruler') count = Math.min(count, 4);
  if (k === 'highlighter' && g.synergies.has('underline')) area *= 1.5;
  return {
    dmg: s.dmg,
    cd: Math.max(k === 'tape' ? 0.04 : 0.08, s.cd * (k === 'tape' || k === 'recorder' ? Math.max(0.6, P.cooldown) : P.cooldown)),
    count,
    area,
    speed: s.speed * (k === 'compass' ? 1 : P.projSpeed) * (k === 'basketball' && g.synergies.has('cheer') ? 1.2 : 1),
    pierce,
    dur: s.duration * P.duration,
  };
}

/** Every instance that actually fires (union weapons expand into their subs). */
export function firingInsts(g: Game): WeaponInst[] {
  const out: WeaponInst[] = [];
  for (const w of g.weapons) {
    if (w.subs) out.push(...w.subs);
    else out.push(w);
  }
  return out;
}

const targetable = (e: Enemy) => e.alive && e.spawnT <= 0.2 && e.def.behavior !== 'prop' && !(e.def.behavior === 'mimic' && e.state === 0);

export function nearest(g: Game, x: number, y: number, maxR: number, exclude?: Projectile): Enemy | null {
  let best: Enemy | null = null;
  let bd = maxR * maxR;
  const list = g.enemies.items;
  for (let i = 0; i < list.length; i++) {
    const e = list[i];
    if (!targetable(e)) continue;
    const dx = e.x - x;
    const dy = e.y - y;
    const d = dx * dx + dy * dy;
    if (d < bd) {
      if (exclude && hasHit(exclude, e.uid)) continue;
      bd = d;
      best = e;
    }
  }
  return best;
}

function randomEnemyNear(g: Game, x: number, y: number, r: number, avoid?: Set<number>): Enemy | null {
  const cand: Enemy[] = [];
  const r2 = r * r;
  for (const e of g.enemies.items) {
    if (!targetable(e)) continue;
    if (avoid && avoid.has(e.uid)) continue;
    const dx = e.x - x;
    const dy = e.y - y;
    if (dx * dx + dy * dy < r2) cand.push(e);
    if (cand.length > 50) break;
  }
  return cand.length ? cand[Math.floor(Math.random() * cand.length)] : null;
}

function hasHit(p: Projectile, uid: number) {
  const n = Math.min(p.hitN, p.hits.length);
  for (let i = 0; i < n; i++) if (p.hits[i] === uid) return true;
  return false;
}

function addHit(p: Projectile, uid: number) {
  p.hits[p.hitN % p.hits.length] = uid;
  p.hitN++;
}

function spawnProj(g: Game, w: WeaponInst, kind: string, x: number, y: number, vx: number, vy: number, r: number, dmg: number, pierce: number, life: number): Projectile | null {
  const p = g.projectiles.get();
  if (!p) return null;
  p.slot = w.slot;
  p.kind = kind;
  p.x = x;
  p.y = y;
  p.vx = vx;
  p.vy = vy;
  p.r = r;
  p.dmg = dmg;
  p.pierce = pierce;
  p.life = p.maxLife = life;
  p.t = 0;
  p.knock = w.def.knockback;
  p.hitN = 0;
  p.a = 0;
  p.b = 0;
  p.c = 0;
  p.target = -1;
  p.evo = !!w.def.isEvolution;
  return p;
}

function friendlyZone(g: Game, w: WeaponInst, kind: Zone['kind'], x: number, y: number, r: number, life: number, dmg: number): Zone | null {
  const z = g.zones.get();
  if (!z) return null;
  z.kind = kind;
  z.x = x;
  z.y = y;
  z.r = r;
  z.life = z.maxLife = life;
  z.dmg = dmg;
  z.tick = 0;
  z.slot = w.slot;
  z.follow = false;
  z.hostile = false;
  z.a = 0;
  z.b = 0;
  z.evo = !!w.def.isEvolution;
  return z;
}

/** Hit test helper with a per-slot cooldown so continuous sources don't hit every frame. */
function tryHit(g: Game, e: Enemy, slot: number, cd: number): boolean {
  if (g.time - e.hitT[slot] < cd) return false;
  e.hitT[slot] = g.time;
  return true;
}

// ───────────────────────── firing ─────────────────────────
export function updateWeapons(g: Game, dt: number) {
  const pl = g.player;
  for (const w of firingInsts(g)) {
    const e = eff(g, w);
    const kind = w.def.kind;

    // continuous weapons
    if (kind === 'compass') {
      updateCompass(g, w, e, dt);
      continue;
    }
    if (kind === 'ruler') updateRulerSwing(g, w, e, dt);
    if (kind === 'tape') {
      updateTape(g, w, e);
      continue;
    }

    // queued burst shots (chalk / pencil)
    if (w.burst > 0) {
      w.burstT -= dt;
      if (w.burstT <= 0) {
        w.burstT = kind === 'pencil' ? 0.06 : 0.08;
        w.burst--;
        fireOne(g, w, e, w.burst);
      }
    }

    w.timer -= dt;
    if (w.timer > 0) continue;
    w.timer = e.cd;

    switch (kind) {
      case 'chalk':
      case 'pencil':
        if (kind === 'chalk' && !nearest(g, pl.x, pl.y, 520)) {
          w.timer = 0.15;
          break;
        }
        w.burst = e.count;
        w.burstT = 0;
        if (kind === 'pencil' && w.def.isEvolution) {
          w.burst = 0;
          for (let i = 0; i < e.count; i++) fireOne(g, w, e, i);
        }
        break;

      case 'edict': {
        for (let i = 0; i < e.count; i++) {
          const a = Math.random() * TAU;
          const p = spawnProj(g, w, 'edict', pl.x, pl.y, Math.cos(a) * e.speed * 0.6, Math.sin(a) * e.speed * 0.6, 7, e.dmg, e.pierce, e.dur);
          if (p) {
            p.c = e.speed;
            p.a = Math.floor(Math.random() * GLYPH_COUNT);
          }
        }
        audio.play('shoot', { pitch: 1.3 });
        break;
      }

      case 'textbook': {
        for (let i = 0; i < e.count; i++) {
          const t = randomEnemyNear(g, pl.x, pl.y, 420);
          let x: number;
          let y: number;
          if (t) {
            x = t.x + (Math.random() - 0.5) * 20;
            y = t.y + (Math.random() - 0.5) * 20;
          } else {
            const a = Math.random() * TAU;
            const d = 80 + Math.random() * 200;
            x = pl.x + Math.cos(a) * d;
            y = pl.y + Math.sin(a) * d;
          }
          const z = friendlyZone(g, w, 'drop', x, y, 46 * e.area, 0.42 + i * 0.05, e.dmg);
          if (z) z.b = Math.random() * TAU;
        }
        break;
      }

      case 'basketball': {
        for (let i = 0; i < e.count; i++) {
          const t = nearest(g, pl.x, pl.y, 480);
          const a = t ? Math.atan2(t.y - pl.y, t.x - pl.x) + (i ? (Math.random() - 0.5) * 1.2 : 0) : Math.random() * TAU;
          spawnProj(g, w, 'ball', pl.x, pl.y, Math.cos(a) * e.speed, Math.sin(a) * e.speed, 10, e.dmg, e.pierce, 5);
        }
        audio.play('throw', { pitch: 0.7 });
        break;
      }

      case 'ink': {
        // spray: ink droplets arc to the target and burst into a puddle on landing
        for (let i = 0; i < e.count; i++) {
          const t = randomEnemyNear(g, pl.x, pl.y, 360);
          const x = t ? t.x : pl.x + (Math.random() - 0.5) * 220;
          const y = t ? t.y : pl.y + (Math.random() - 0.5) * 220;
          const p = spawnProj(g, w, 'inkdrop', pl.x, pl.y - 10, 0, 0, 4, e.dmg, 0, 0.36 + i * 0.05);
          if (p) {
            p.a = x;
            p.b = y;
            p.c = e.area;
            p.target = Math.round(e.dur * 1000);
          }
        }
        if (w.def.isEvolution) {
          let has = false;
          for (const z of g.zones.items) if (z.alive && z.follow && z.slot === w.slot) has = true;
          if (!has) {
            const z = friendlyZone(g, w, 'ink', pl.x, pl.y, 80 * e.area, 9999, e.dmg);
            if (z) z.follow = true;
          }
        }
        audio.play('throw', { pitch: 0.5 });
        break;
      }

      case 'paper': {
        const base = Math.random() * TAU;
        for (let i = 0; i < e.count; i++) {
          const p = spawnProj(g, w, 'paper', pl.x, pl.y, 0, 0, 9, e.dmg, e.pierce, e.dur);
          if (!p) break;
          p.a = base + (i / e.count) * TAU;
          p.b = 14;
          p.c = e.speed;
        }
        audio.play('throw', { pitch: 1.4 });
        break;
      }

      case 'magnet': {
        const z = friendlyZone(g, w, 'vortex', pl.x, pl.y, 170 * e.area, e.dur, e.dmg);
        if (z) z.follow = true;
        audio.play('wave', { pitch: 0.6 });
        break;
      }

      case 'alarm': {
        for (let i = 0; i < e.count; i++) {
          const a = Math.random() * TAU;
          const d = i === 0 ? 0 : 50 + Math.random() * 60;
          const z = friendlyZone(g, w, 'alarm', pl.x + Math.cos(a) * d, pl.y + Math.sin(a) * d, 82 * e.area, e.dur, e.dmg);
          if (z && g.synergies.has('wakeup')) {
            const v = friendlyZone(g, w, 'vortex', z.x, z.y, 140 * e.area, e.dur * 0.9, 0);
            if (v) v.a = 1; // pull only
          }
        }
        break;
      }

      case 'speaker': {
        for (let i = 0; i < e.count; i++) {
          g.after(() => {
            const z = friendlyZone(g, w, 'wave', g.player.x, g.player.y, 6, (190 * e.area) / e.speed, e.dmg);
            if (z) {
              z.a = e.speed;
              z.b = 190 * e.area;
            }
            audio.play('wave');
          }, i * 260);
        }
        break;
      }

      case 'cart': {
        const dirs: [number, number][] = [];
        const fx = pl.facex;
        const fy = pl.facey;
        if (w.def.isEvolution) dirs.push([fx, fy], [-fx, -fy], [-fy, fx], [fy, -fx]);
        else {
          dirs.push([fx, fy]);
          if (e.count >= 2) dirs.push([-fx, -fy]);
          if (e.count >= 3) dirs.push([-fy, fx]);
          if (e.count >= 4) dirs.push([fy, -fx]);
        }
        for (const [dx, dy] of dirs) spawnProj(g, w, 'cart', pl.x - dx * 30, pl.y - dy * 30, dx * e.speed, dy * e.speed, 20 * e.area, e.dmg, 999, 1.5);
        audio.play('dash');
        break;
      }

      case 'ruler': {
        w.swingIdx = e.count;
        startSwing(g, w, e);
        break;
      }

      case 'eraser': {
        for (let i = 0; i < e.count; i++) {
          const t = nearest(g, pl.x, pl.y, 460);
          const base = t ? Math.atan2(t.y - pl.y, t.x - pl.x) : Math.atan2(pl.facey, pl.facex);
          const a = base + (i - (e.count - 1) / 2) * 0.55;
          const p = spawnProj(g, w, 'eraser', pl.x, pl.y, Math.cos(a) * e.speed, Math.sin(a) * e.speed, 11 * e.area, e.dmg, 999, 6);
          if (p) {
            p.a = 0; // phase: 0 = outward, 1 = returning
            p.c = e.dur; // outward time
            p.b = e.speed;
          }
        }
        audio.play('throw', { pitch: 1.1 });
        break;
      }

      case 'slipper': {
        for (let i = 0; i < e.count; i++) {
          const side = i % 2 === 0 ? 1 : -1;
          const spread = (0.15 + Math.random() * 0.45) * side * (pl.facex >= 0 ? 1 : -1);
          const p = spawnProj(g, w, 'slipper', pl.x, pl.y - 10, spread * e.speed * 0.5, -e.speed * (0.85 + Math.random() * 0.25), 12 * e.area, e.dmg, e.pierce, e.dur);
          if (p) p.c = e.area;
        }
        audio.play('throw', { pitch: 0.8 });
        break;
      }

      case 'recorder': {
        const R = 64 * e.area;
        let hit = 0;
        g.hash.query(pl.x, pl.y, R + 30, g.enemies.items, (en) => {
          if (en.def.behavior === 'prop') return;
          const dx = en.x - pl.x;
          const dy = en.y - pl.y;
          const d = Math.hypot(dx, dy) || 1;
          if (d > R + en.r * 0.5) return;
          g.damageEnemy(en, e.dmg, w.slot, w.def.knockback, dx / d, dy / d);
          if (w.def.isEvolution) en.slow = 0.6;
          hit++;
        });
        if (hit && w.def.isEvolution && pl.hp < pl.stats.maxHp) pl.hp = Math.min(pl.stats.maxHp, pl.hp + 0.5);
        w.angle += 1; // drives the note animation pulse
        break;
      }

      case 'highlighter': {
        const t = nearest(g, pl.x, pl.y, 520);
        const base = t ? Math.atan2(t.y - pl.y, t.x - pl.x) : Math.atan2(pl.facey, pl.facex);
        const evo = !!w.def.isEvolution;
        for (let i = 0; i < e.count; i++) {
          const a = evo ? base + (i / e.count) * TAU : base + (i === 0 ? 0 : (i % 2 ? 1 : -1) * Math.ceil(i / 2) * 0.45);
          const z = friendlyZone(g, w, 'beam', pl.x, pl.y, 430 * (evo ? 1.1 : 1), e.dur, e.dmg);
          if (z) {
            z.a = a;
            z.b = 18 * e.area;
            z.follow = true;
          }
        }
        audio.play('shoot', { pitch: 0.6 });
        break;
      }

      case 'static': {
        const vr = g.viewRect();
        const used = new Set<number>();
        for (let i = 0; i < e.count; i++) {
          const t = randomEnemyNear(g, pl.x, pl.y, Math.max(vr.w, vr.h) * 0.6, used);
          let x: number;
          let y: number;
          if (t) {
            used.add(t.uid);
            x = t.x;
            y = t.y;
          } else {
            x = pl.x + (Math.random() - 0.5) * vr.w * 0.8;
            y = pl.y + (Math.random() - 0.5) * vr.h * 0.8;
          }
          strike(g, w, x, y, 34 * e.area, e.dmg, x + (Math.random() - 0.5) * 60, y - 420);
          if (w.def.isEvolution && t) {
            // chain to two more targets
            let px = x;
            let py = y;
            for (let c = 0; c < 2; c++) {
              const n = randomEnemyNear(g, px, py, 170, used);
              if (!n) break;
              used.add(n.uid);
              strike(g, w, n.x, n.y, 26 * e.area, e.dmg * 0.6, px, py);
              px = n.x;
              py = n.y;
            }
          }
        }
        audio.play('hit', { pitch: 2.2, vol: 1.4 });
        break;
      }

      case 'tacks': {
        for (let i = 0; i < e.count; i++) {
          const a = Math.random() * TAU;
          const d = 30 + Math.random() * 130 * e.area;
          const z = friendlyZone(g, w, 'tack', pl.x + Math.cos(a) * d, pl.y + Math.sin(a) * d, 11 * Math.sqrt(e.area), e.dur, e.dmg);
          if (z) {
            z.a = e.pierce; // remaining pokes
            z.b = Math.floor(Math.random() * 4); // head colour
            z.tick = 0.15 + i * 0.03; // little landing delay
          }
        }
        audio.play('throw', { pitch: 1.9 });
        break;
      }
    }
  }
}

const GLYPHS = ['A', '가', 'Z', '水', 'あ', 'Ω', '학', 'B'];
export const GLYPH_COUNT = GLYPHS.length;
export function glyph(i: number) {
  return GLYPHS[Math.abs(Math.floor(i)) % GLYPHS.length];
}

function fireOne(g: Game, w: WeaponInst, e: Eff, idx: number) {
  const pl = g.player;
  if (w.def.kind === 'chalk') {
    const t = nearest(g, pl.x, pl.y, 560);
    let a: number;
    if (t) a = Math.atan2(t.y - pl.y, t.x - pl.x) + (idx % 2 ? 1 : -1) * Math.floor((idx + 1) / 2) * 0.09;
    else a = Math.atan2(pl.facey, pl.facex);
    spawnProj(g, w, 'chalk', pl.x, pl.y - 4, Math.cos(a) * e.speed, Math.sin(a) * e.speed, w.def.isEvolution ? 7 : 6, e.dmg, e.pierce, 1.4);
    audio.play('throw', { pitch: 1.6 });
  } else if (w.def.kind === 'pencil') {
    let a = Math.atan2(pl.facey, pl.facex);
    if (w.def.isEvolution) a += (idx * TAU) / e.count;
    else a += (Math.random() - 0.5) * 0.12;
    spawnProj(g, w, 'pencil', pl.x, pl.y - 4, Math.cos(a) * e.speed, Math.sin(a) * e.speed, 5, e.dmg, e.pierce, w.def.isEvolution ? 1.2 : 0.8);
    audio.play('shoot');
  }
}

function strike(g: Game, w: WeaponInst, x: number, y: number, r: number, dmg: number, fromX: number, fromY: number) {
  const z = friendlyZone(g, w, 'bolt', x, y, r, 0.22, 0);
  if (z) {
    z.a = fromX;
    z.b = fromY;
  }
  areaDamage(g, x, y, r, dmg, w.slot, w.def.knockback);
  g.burst(x, y, '#BFE3F2', 6, 140);
}

// ───────────────────────── compass ─────────────────────────
/**
 * A drafting compass plants its needle on the player and sweeps the pencil leg
 * around, drawing a graphite circle. The pencil tip and the freshly drawn line
 * (the last ~0.8 rad of the arc) deal damage. Evolved: the circle stays complete.
 */
export const COMPASS_TRAIL = 0.85;
export function compassRadius(e: Eff) {
  return 70 * e.area;
}

function updateCompass(g: Game, w: WeaponInst, e: Eff, dt: number) {
  const evo = !!w.def.isEvolution;
  const pl = g.player;
  if (w.active > 0 || evo) {
    if (!evo) w.active -= dt;
    w.angle += e.speed * dt;
    const R = compassRadius(e);
    const band = 9 + 4 * e.area;
    const tipR = 15 * e.area;
    g.hash.query(pl.x, pl.y, R + 40, g.enemies.items, (en) => {
      const dx = en.x - pl.x;
      const dy = en.y - pl.y;
      const d = Math.hypot(dx, dy) || 1;
      if (Math.abs(d - R) > band + en.r * 0.6 + tipR) return;
      const ang = Math.atan2(dy, dx);
      let hit = false;
      for (let i = 0; i < e.count; i++) {
        const tip = w.angle + (i / e.count) * TAU;
        // angular distance behind the tip (0 = at tip)
        let behind = (tip - ang) % TAU;
        if (behind < 0) behind += TAU;
        const tx = pl.x + Math.cos(tip) * R;
        const ty = pl.y + Math.sin(tip) * R;
        if ((en.x - tx) ** 2 + (en.y - ty) ** 2 < (tipR + en.r) ** 2) hit = true;
        else if (Math.abs(d - R) < band + en.r * 0.6 && (evo || behind < COMPASS_TRAIL)) hit = true;
        if (hit) break;
      }
      if (!hit || !tryHit(g, en, w.slot, 0.32)) return;
      g.damageEnemy(en, e.dmg, w.slot, w.def.knockback, dx / d, dy / d);
      if (evo && pl.hp < pl.stats.maxHp) pl.hp = Math.min(pl.stats.maxHp, pl.hp + 0.25);
    });
    if (!evo && w.active <= 0) w.timer = e.cd;
  } else {
    w.timer -= dt;
    if (w.timer <= 0) {
      w.active = e.dur;
      audio.play('throw', { pitch: 0.9 });
    }
  }
}

// ───────────────────────── ruler ─────────────────────────
export function rulerLength(e: Eff) {
  return 105 * e.area;
}
const RULER_ARC = 2.3;

function startSwing(g: Game, w: WeaponInst, e: Eff) {
  if (w.swingIdx <= 0) return;
  const pl = g.player;
  const n = e.count - w.swingIdx; // swing number in this volley
  const face = Math.atan2(pl.facey, pl.facex);
  const evo = !!w.def.isEvolution;
  w.burstT = evo ? face : face + (n % 2 ? Math.PI : 0); // centre angle
  w.swingDir = n % 2 ? -1 : 1;
  w.swing = e.dur;
  w.swingIdx--;
  w.angle = w.burstT - (w.swingDir * (evo ? Math.PI : RULER_ARC)) / 2;
  audio.play('dash');
}

function updateRulerSwing(g: Game, w: WeaponInst, e: Eff, dt: number) {
  if (w.swing <= 0) return;
  const evo = !!w.def.isEvolution;
  const arc = evo ? TAU : RULER_ARC;
  const prev = w.angle;
  w.swing -= dt;
  const prog = 1 - Math.max(0, w.swing) / e.dur;
  // ease-out sweep
  const k = 1 - (1 - prog) * (1 - prog);
  w.angle = w.burstT - (w.swingDir * arc) / 2 + w.swingDir * arc * k;
  const pl = g.player;
  const L = rulerLength(e);
  const lo = Math.min(prev, w.angle) - 0.18;
  const hi = Math.max(prev, w.angle) + 0.18;
  g.hash.query(pl.x, pl.y, L + 30, g.enemies.items, (en) => {
    const dx = en.x - pl.x;
    const dy = en.y - pl.y;
    const d = Math.hypot(dx, dy) || 1;
    if (d > L + en.r || d < 8) return;
    let a = Math.atan2(dy, dx);
    // bring a into [lo, lo + TAU)
    while (a < lo) a += TAU;
    while (a >= lo + TAU) a -= TAU;
    if (a > hi) return;
    if (!tryHit(g, en, w.slot, e.dur * 0.9)) return;
    g.damageEnemy(en, e.dmg, w.slot, w.def.knockback, dx / d, dy / d);
  });
  if (w.swing <= 0 && w.swingIdx > 0) startSwing(g, w, e);
}

// ───────────────────────── tape ─────────────────────────
function updateTape(g: Game, w: WeaponInst, e: Eff) {
  const pl = g.player;
  const dx = pl.x - w.lastX;
  const dy = pl.y - w.lastY;
  const d = Math.hypot(dx, dy);
  if (d > 60) {
    // teleport / revive: restart the strip
    w.lastX = pl.x;
    w.lastY = pl.y;
    return;
  }
  if (d < 14) return;
  const z = friendlyZone(g, w, 'tape', (pl.x + w.lastX) / 2, (pl.y + w.lastY) / 2, d / 2 + 2, e.dur, e.dmg);
  if (z) {
    z.a = Math.atan2(dy, dx);
    z.b = 11 * e.area; // half width ×2 = width
  }
  w.lastX = pl.x;
  w.lastY = pl.y;
}

// ───────────────────────── projectiles ─────────────────────────
export function updateProjectiles(g: Game, dt: number) {
  const W = g.stage.width;
  const H = g.stage.height;
  const pl = g.player;
  for (const p of g.projectiles.items) {
    if (!p.alive) continue;
    p.t += dt;
    p.life -= dt;
    if (p.kind === 'inkdrop') {
      // arc from launch point to target; on landing becomes a puddle
      const k = Math.min(1, p.t / p.maxLife);
      if (p.vx === 0 && p.vy === 0) {
        p.vx = p.x; // remember origin
        p.vy = p.y;
      }
      p.x = p.vx + (p.a - p.vx) * k;
      p.y = p.vy + (p.b - p.vy) * k;
      if (p.life <= 0) {
        p.alive = false;
        const w = g.slotInst[p.slot];
        if (w) friendlyZone(g, w, 'ink', p.a, p.b, 54 * p.c, p.target / 1000, p.dmg);
        g.burst(p.a, p.b, '#1E2433', 8, 120);
      }
      continue;
    }
    if (p.life <= 0) {
      p.alive = false;
      continue;
    }
    switch (p.kind) {
      case 'paper': {
        if (p.evo) {
          p.b = Math.min(230, p.b + p.c * 0.6 * dt);
          p.a += 3.4 * dt;
        } else {
          p.b += p.c * dt;
          p.a += (2.6 - Math.min(1.8, p.b / 120)) * dt;
        }
        p.x = pl.x + Math.cos(p.a) * p.b;
        p.y = pl.y + Math.sin(p.a) * p.b;
        break;
      }
      case 'edict': {
        let t: Enemy | null = null;
        if (p.target >= 0) {
          for (const e of g.enemies.items) if (e.alive && e.uid === p.target) {
            t = e;
            break;
          }
        }
        if (!t) {
          t = nearest(g, p.x, p.y, 600, p);
          p.target = t ? t.uid : -1;
        }
        const sp = p.c;
        if (t) {
          const want = Math.atan2(t.y - p.y, t.x - p.x);
          const cur = Math.atan2(p.vy, p.vx);
          let diff = want - cur;
          while (diff > Math.PI) diff -= TAU;
          while (diff < -Math.PI) diff += TAU;
          const turn = Math.max(-7 * dt, Math.min(7 * dt, diff));
          const na = cur + turn;
          const cs = Math.min(sp, Math.hypot(p.vx, p.vy) + sp * 2 * dt);
          p.vx = Math.cos(na) * cs;
          p.vy = Math.sin(na) * cs;
        }
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        break;
      }
      case 'eraser': {
        if (p.a === 0) {
          // decelerate on the way out
          p.c -= dt;
          const f = Math.max(0, Math.min(1, p.c / 0.25));
          if (p.c <= 0) {
            p.a = 1;
            p.hitN = 0;
          }
          p.x += p.vx * dt * (0.35 + 0.65 * f);
          p.y += p.vy * dt * (0.35 + 0.65 * f);
        } else {
          // home back to the player, accelerating
          const dx = pl.x - p.x;
          const dy = pl.y - p.y;
          const d = Math.hypot(dx, dy) || 1;
          const sp = Math.min(p.b * 1.6, (p.t - 0.3) * p.b * 1.2 + 120);
          p.x += (dx / d) * sp * dt;
          p.y += (dy / d) * sp * dt;
          if (d < 18) {
            p.alive = false;
            continue;
          }
        }
        if (g.synergies.has('correction') && Math.random() < dt * 6) {
          const w = g.slotInst[p.slot];
          if (w) {
            const z = friendlyZone(g, w, 'tape', p.x, p.y, 10, 1.4, p.dmg * 0.3);
            if (z) {
              z.a = Math.atan2(p.vy, p.vx);
              z.b = 10;
            }
          }
        }
        break;
      }
      case 'slipper': {
        p.vy += 980 * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        break;
      }
      default:
        p.x += p.vx * dt;
        p.y += p.vy * dt;
    }
    if (p.kind === 'ball') {
      if (p.x < 15 || p.x > W - 15) {
        p.vx *= -1;
        p.x = Math.max(15, Math.min(W - 15, p.x));
      }
      if (p.y < 35 || p.y > H - 15) {
        p.vy *= -1;
        p.y = Math.max(35, Math.min(H - 15, p.y));
      }
    }
    if (p.x < -60 || p.y < -200 || p.x > W + 60 || p.y > H + 120) {
      p.alive = false;
      continue;
    }
    collideProjectile(g, p);
  }
}

function collideProjectile(g: Game, p: Projectile) {
  const infinite = p.pierce >= 999;
  const cd = p.kind === 'eraser' ? 0.3 : 0.45;
  g.hash.query(p.x, p.y, p.r + 40, g.enemies.items, (e) => {
    if (!p.alive) return true;
    if (e.def.behavior === 'mimic' && e.state === 0) return;
    const dx = e.x - p.x;
    const dy = e.y - p.y;
    const rr = p.r + e.r;
    if (dx * dx + dy * dy > rr * rr) return;
    if (infinite) {
      if (!tryHit(g, e, p.slot, cd)) return;
    } else {
      if (hasHit(p, e.uid)) return;
      addHit(p, e.uid);
    }
    const sp = Math.hypot(p.vx, p.vy) || 1;
    let kx = p.vx / sp;
    let ky = p.vy / sp;
    if (p.kind === 'paper') {
      const d = Math.hypot(e.x - g.player.x, e.y - g.player.y) || 1;
      kx = (e.x - g.player.x) / d;
      ky = (e.y - g.player.y) / d;
    }
    const critBonus = p.kind === 'chalk' && p.evo ? 0.2 : 0;
    g.damageEnemy(e, p.dmg, p.slot, p.knock, kx, ky, critBonus);
    onProjectileHit(g, p, e);
    if (!infinite) {
      p.pierce--;
      if (p.pierce <= 0) {
        p.alive = false;
        return true;
      }
    }
  });
}

function onProjectileHit(g: Game, p: Projectile, e: Enemy) {
  const w = g.slotInst[p.slot];
  switch (p.kind) {
    case 'ball': {
      const next = nearest(g, e.x, e.y, 320, p);
      const sp = Math.hypot(p.vx, p.vy) * (p.evo ? 1.05 : 1);
      if (p.evo) p.dmg *= 1.08;
      const a = next ? Math.atan2(next.y - p.y, next.x - p.x) : Math.random() * TAU;
      p.vx = Math.cos(a) * sp;
      p.vy = Math.sin(a) * sp;
      p.life = Math.max(p.life, 1.5);
      break;
    }
    case 'edict':
      p.target = -1;
      if (p.evo && w) splash(g, p.x, p.y, 46, p.dmg * 0.6, p.slot, '#68B6AA');
      break;
    case 'chalk':
      g.burst(p.x, p.y, '#F1EBDD', 3, 70);
      if (g.synergies.has('lecture') && Math.random() < 0.2) splash(g, p.x, p.y, 44, p.dmg * 0.6, p.slot, '#F1EBDD');
      break;
    case 'paper':
      if (g.synergies.has('smudge') && Math.random() < 0.12 && w) friendlyZone(g, w, 'ink', e.x, e.y, 26, 1.6, p.dmg * 0.4);
      break;
    case 'cart':
      if ((p.evo && Math.random() < 0.03) || (g.synergies.has('meal') && Math.random() < 0.025)) g.dropPickup('food', e.x, e.y, 0);
      break;
    case 'eraser':
      if (Math.random() < 0.3) g.burst(e.x, e.y, '#D9788A', 2, 60);
      break;
    case 'slipper':
      g.burst(e.x, e.y, '#F1EBDD', 2, 80);
      break;
  }
}

function splash(g: Game, x: number, y: number, r: number, dmg: number, slot: number, color: string) {
  areaDamage(g, x, y, r, dmg, slot, 30);
  g.burst(x, y, color, 6, 120);
}

// ───────────────────────── friendly zones ─────────────────────────
export function updateFriendlyZones(g: Game, dt: number) {
  const pl = g.player;
  for (const z of g.zones.items) {
    if (!z.alive || z.hostile) continue;
    z.life -= dt;
    if (z.follow) {
      z.x = pl.x;
      z.y = pl.y;
    }
    const w = g.slotInst[z.slot];
    switch (z.kind) {
      case 'drop': {
        if (z.life <= 0) {
          areaDamage(g, z.x, z.y, z.r, z.dmg, z.slot, w?.def.knockback ?? 40);
          g.burst(z.x, z.y, '#5B7FB0', 6, 160);
          g.burst(z.x, z.y, '#EDE6D3', 8, 130); // loose pages
          audio.play('boom', { pitch: 1.8, vol: 0.5 });
          if (z.evo) g.shake(2);
          if (g.synergies.has('review') && w) {
            for (let i = 0; i < 2; i++) {
              const a = Math.random() * TAU;
              const p = spawnProj(g, w, 'edict', z.x, z.y, Math.cos(a) * 150, Math.sin(a) * 150, 6, z.dmg * 0.35, 1, 2.2);
              if (p) {
                p.c = 320;
                p.a = Math.floor(Math.random() * GLYPH_COUNT);
              }
            }
          }
          z.alive = false;
        }
        break;
      }
      case 'ink': {
        z.tick -= dt;
        if (z.tick <= 0) {
          z.tick = 0.4;
          g.hash.query(z.x, z.y, z.r + 30, g.enemies.items, (e) => {
            const dx = e.x - z.x;
            const dy = e.y - z.y;
            if (dx * dx + dy * dy < (z.r + e.r * 0.5) ** 2) {
              e.slow = 0.6;
              g.damageEnemy(e, z.dmg, z.slot, 0, 0, 0);
            }
          });
        }
        if (z.life <= 0) z.alive = false;
        break;
      }
      case 'vortex': {
        const pullOnly = z.a === 1;
        const strength = (z.evo ? 300 : 190) * dt;
        g.hash.query(z.x, z.y, z.r + 30, g.enemies.items, (e) => {
          if (e.boss || e.def.behavior === 'prop') return;
          const dx = z.x - e.x;
          const dy = z.y - e.y;
          const d = Math.hypot(dx, dy) || 1;
          if (d < z.r && d > 12) {
            const k = strength * (1 - e.kres * 0.8);
            e.x += (dx / d) * k;
            e.y += (dy / d) * k;
          }
        });
        if (!pullOnly) {
          for (const pk of g.pickups.items) {
            if (!pk.alive || !pk.kind.startsWith('gem')) continue;
            const dx = pk.x - z.x;
            const dy = pk.y - z.y;
            if (dx * dx + dy * dy < z.r * z.r * 1.4) pk.vacuum = true;
          }
        }
        if (z.life <= 0) {
          if (!pullOnly) {
            areaDamage(g, z.x, z.y, z.r * (z.evo ? 0.8 : 0.6), z.dmg, z.slot, 120);
            g.burst(z.x, z.y, '#C9563C', z.evo ? 22 : 10, z.evo ? 280 : 160);
            audio.play('boom', { pitch: 1.1, vol: 0.6 });
          }
          z.alive = false;
        }
        break;
      }
      case 'alarm': {
        if (z.life <= 0) {
          areaDamage(g, z.x, z.y, z.r, z.dmg, z.slot, w?.def.knockback ?? 150);
          g.burst(z.x, z.y, '#E69A5A', 14, 260);
          g.burst(z.x, z.y, '#68B6AA', 8, 180);
          g.shake(3);
          audio.play('boom');
          if (z.evo && z.b < 2 && w) {
            const n = friendlyZone(g, w, 'alarm', z.x, z.y, z.r * 1.35, 0.28, z.dmg * 0.8);
            if (n) n.b = z.b + 1;
          }
          z.alive = false;
        }
        break;
      }
      case 'wave': {
        z.r += z.a * dt;
        const stun = z.evo;
        g.hash.query(z.x, z.y, z.r + 40, g.enemies.items, (e) => {
          const dx = e.x - z.x;
          const dy = e.y - z.y;
          const d = Math.hypot(dx, dy) || 1;
          if (Math.abs(d - z.r) > 18 + e.r * 0.5) return;
          if (!tryHit(g, e, z.slot, 0.22)) return;
          g.damageEnemy(e, z.dmg, z.slot, w?.def.knockback ?? 120, dx / d, dy / d);
          if (stun && !e.boss) e.stun = 0.5;
        });
        if (z.r >= z.b || z.life <= 0) z.alive = false;
        break;
      }
      case 'beam': {
        // highlighter stroke: grows quickly from the player, ticks damage along its length
        if (z.evo) z.a += 1.1 * dt;
        const grow = Math.min(1, (z.maxLife - z.life) / 0.12);
        const L = z.r * grow;
        const x2 = z.x + Math.cos(z.a) * L;
        const y2 = z.y + Math.sin(z.a) * L;
        z.tick -= dt;
        if (z.tick <= 0) {
          z.tick = 0.1;
          const cx = (z.x + x2) / 2;
          const cy = (z.y + y2) / 2;
          g.hash.query(cx, cy, L / 2 + 40, g.enemies.items, (e) => {
            if (segDist(e.x, e.y, z.x, z.y, x2, y2) > z.b / 2 + e.r * 0.7) return;
            g.damageEnemy(e, z.dmg, z.slot, w?.def.knockback ?? 10, Math.cos(z.a), Math.sin(z.a));
          });
        }
        if (z.life <= 0) z.alive = false;
        break;
      }
      case 'tack': {
        if (z.tick > 0) {
          z.tick -= dt;
          break;
        }
        g.hash.query(z.x, z.y, z.r + 30, g.enemies.items, (e) => {
          if (z.a <= 0 || e.def.behavior === 'prop') return;
          const dx = e.x - z.x;
          const dy = e.y - z.y;
          if (dx * dx + dy * dy > (z.r + e.r * 0.7) ** 2) return;
          if (!tryHit(g, e, z.slot, 0.5)) return;
          g.damageEnemy(e, z.dmg, z.slot, 0, 0, 0);
          e.slow = 0.3;
          z.a--;
        });
        if (z.a <= 0 || z.life <= 0) {
          if (z.evo && z.a <= 0) {
            areaDamage(g, z.x, z.y, 48, z.dmg * 1.5, z.slot, 60);
            g.burst(z.x, z.y, '#C9563C', 8, 160);
            audio.play('boom', { pitch: 2, vol: 0.4 });
          }
          z.alive = false;
        }
        break;
      }
      case 'tape': {
        z.tick -= dt;
        if (z.tick <= 0) {
          z.tick = 0.1;
          const hx = Math.cos(z.a) * z.r;
          const hy = Math.sin(z.a) * z.r;
          g.hash.query(z.x, z.y, z.r + 30, g.enemies.items, (e) => {
            if (e.def.behavior === 'prop') return;
            if (segDist(e.x, e.y, z.x - hx, z.y - hy, z.x + hx, z.y + hy) > z.b / 2 + e.r * 0.6) return;
            e.slow = z.evo ? 0.9 : 0.5;
            if (!tryHit(g, e, z.slot, 0.4)) return;
            g.damageEnemy(e, z.dmg, z.slot, 0, 0, 0);
          });
        }
        if (z.life <= 0) z.alive = false;
        break;
      }
      default:
        if (z.life <= 0) z.alive = false;
    }
  }
}

function areaDamage(g: Game, x: number, y: number, r: number, dmg: number, slot: number, knock: number) {
  g.hash.query(x, y, r + 40, g.enemies.items, (e) => {
    const dx = e.x - x;
    const dy = e.y - y;
    const d2 = dx * dx + dy * dy;
    if (d2 < (r + e.r * 0.6) ** 2) {
      const d = Math.sqrt(d2) || 1;
      g.damageEnemy(e, dmg, slot, knock, dx / d, dy / d);
    }
  });
}
