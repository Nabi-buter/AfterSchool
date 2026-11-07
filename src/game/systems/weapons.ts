import type { Game } from '../core/Game';
import type { Enemy, Projectile, WeaponInst, Zone } from '../core/world';
import { audio } from '../audio/audio';

const TAU = Math.PI * 2;

interface Eff {
  dmg: number;
  cd: number;
  count: number;
  area: number;
  speed: number;
  pierce: number;
  dur: number;
}

function eff(g: Game, w: WeaponInst): Eff {
  const s = w.stats;
  const P = g.player.stats;
  let count = s.count + P.amount;
  let pierce = s.pierce;
  const k = w.def.kind;
  if (k === 'compass' && g.synergies.has('draft')) count += 1;
  if (k === 'pencil' && g.synergies.has('draft')) pierce += 2;
  if (k === 'basketball' && g.synergies.has('cheer')) pierce += 3;
  if (k === 'pencil' && w.def.isEvolution) count = 4 + P.amount;
  return {
    dmg: s.dmg,
    cd: Math.max(0.08, s.cd * P.cooldown),
    count,
    area: s.area * P.area,
    speed: s.speed * P.projSpeed * (k === 'basketball' && g.synergies.has('cheer') ? 1.2 : 1),
    pierce,
    dur: s.duration * P.duration,
  };
}

export function nearest(g: Game, x: number, y: number, maxR: number, exclude?: Projectile): Enemy | null {
  let best: Enemy | null = null;
  let bd = maxR * maxR;
  const list = g.enemies.items;
  for (let i = 0; i < list.length; i++) {
    const e = list[i];
    if (!e.alive || e.spawnT > 0.2) continue;
    if (e.def.behavior === 'mimic' && e.state === 0) continue;
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

function randomEnemyNear(g: Game, x: number, y: number, r: number): Enemy | null {
  const cand: Enemy[] = [];
  const r2 = r * r;
  for (const e of g.enemies.items) {
    if (!e.alive) continue;
    const dx = e.x - x;
    const dy = e.y - y;
    if (dx * dx + dy * dy < r2) cand.push(e);
    if (cand.length > 40) break;
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

// ───────────────────────── firing ─────────────────────────
export function updateWeapons(g: Game, dt: number) {
  const pl = g.player;
  for (const w of g.weapons) {
    const e = eff(g, w);
    const kind = w.def.kind;

    if (kind === 'compass') {
      updateCompass(g, w, e, dt);
      continue;
    }

    // queued burst shots (chalk / pencil / edict)
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
          if (p) p.c = e.speed;
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
        const n = e.count;
        for (let i = 0; i < n; i++) {
          const t = randomEnemyNear(g, pl.x, pl.y, 360);
          const x = t ? t.x : pl.x + (Math.random() - 0.5) * 200;
          const y = t ? t.y : pl.y + (Math.random() - 0.5) * 200;
          friendlyZone(g, w, 'ink', x, y, 54 * e.area, e.dur, e.dmg);
        }
        if (w.def.isEvolution) {
          // keep one puddle glued to the player
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
          if (z) z.b = 0;
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
              z.follow = false;
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
        for (const [dx, dy] of dirs) {
          spawnProj(g, w, 'cart', pl.x - dx * 30, pl.y - dy * 30, dx * e.speed, dy * e.speed, 20 * e.area, e.dmg, 999, 1.5);
        }
        audio.play('dash');
        break;
      }
    }
  }
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

function updateCompass(g: Game, w: WeaponInst, e: Eff, dt: number) {
  const evo = !!w.def.isEvolution;
  if (w.active > 0 || evo) {
    w.active -= dt;
    w.angle += w.stats.speed * dt;
    const R = 66 * e.area;
    const br = 18 * e.area;
    const pl = g.player;
    for (let i = 0; i < e.count; i++) {
      const a = w.angle + (i / e.count) * TAU;
      const bx = pl.x + Math.cos(a) * R;
      const by = pl.y + Math.sin(a) * R;
      g.hash.query(bx, by, br + 30, g.enemies.items, (en) => {
        const dx = en.x - bx;
        const dy = en.y - by;
        const rr = br + en.r;
        if (dx * dx + dy * dy > rr * rr) return;
        if (g.time - en.hitT[w.slot] < 0.32) return;
        en.hitT[w.slot] = g.time;
        const d = Math.hypot(en.x - pl.x, en.y - pl.y) || 1;
        g.damageEnemy(en, e.dmg, w.slot, w.def.knockback, (en.x - pl.x) / d, (en.y - pl.y) / d);
        if (evo && pl.hp < pl.stats.maxHp) pl.hp = Math.min(pl.stats.maxHp, pl.hp + 0.25);
      });
    }
    if (!evo && w.active <= 0) w.timer = e.cd;
  } else {
    w.timer -= dt;
    if (w.timer <= 0) {
      w.active = e.dur;
      audio.play('throw', { pitch: 0.9 });
    }
  }
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
    if (p.life <= 0) {
      p.alive = false;
      continue;
    }
    switch (p.kind) {
      case 'paper': {
        if (p.evo) {
          p.b = Math.min(230, p.b + p.c * 0.6 * dt);
          p.a += 3.4 * dt;
          p.x = pl.x + Math.cos(p.a) * p.b;
          p.y = pl.y + Math.sin(p.a) * p.b;
        } else {
          p.b += p.c * dt;
          p.a += (2.6 - Math.min(1.8, p.b / 120)) * dt;
          p.x = pl.x + Math.cos(p.a) * p.b;
          p.y = pl.y + Math.sin(p.a) * p.b;
        }
        break;
      }
      case 'edict': {
        // home on the nearest enemy
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
    if (p.x < -60 || p.y < -60 || p.x > W + 60 || p.y > H + 60) {
      p.alive = false;
      continue;
    }
    collideProjectile(g, p);
  }
}

function collideProjectile(g: Game, p: Projectile) {
  const infinite = p.pierce >= 999;
  g.hash.query(p.x, p.y, p.r + 40, g.enemies.items, (e) => {
    if (!p.alive) return true;
    if (e.def.behavior === 'mimic' && e.state === 0) return;
    const dx = e.x - p.x;
    const dy = e.y - p.y;
    const rr = p.r + e.r;
    if (dx * dx + dy * dy > rr * rr) return;
    if (infinite) {
      if (g.time - e.hitT[p.slot] < 0.45) return;
      e.hitT[p.slot] = g.time;
    } else {
      if (hasHit(p, e.uid)) return;
      addHit(p, e.uid);
    }
    const sp = Math.hypot(p.vx, p.vy) || 1;
    let kx = p.vx / sp;
    let ky = p.vy / sp;
    if (p.kind === 'paper') {
      const d = Math.hypot(dx, dy) || 1;
      kx = -dx / d;
      ky = -dy / d;
      kx = (e.x - g.player.x) / (Math.hypot(e.x - g.player.x, e.y - g.player.y) || 1);
      ky = (e.y - g.player.y) / (Math.hypot(e.x - g.player.x, e.y - g.player.y) || 1);
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
  const w = g.weapons[p.slot];
  switch (p.kind) {
    case 'ball': {
      // bounce to the next enemy
      const next = nearest(g, e.x, e.y, 320, p);
      const sp = Math.hypot(p.vx, p.vy) * (p.evo ? 1.05 : 1);
      if (p.evo) p.dmg *= 1.08;
      if (next) {
        const a = Math.atan2(next.y - p.y, next.x - p.x);
        p.vx = Math.cos(a) * sp;
        p.vy = Math.sin(a) * sp;
      } else {
        const a = Math.random() * TAU;
        p.vx = Math.cos(a) * sp;
        p.vy = Math.sin(a) * sp;
      }
      p.life = Math.max(p.life, 1.5);
      break;
    }
    case 'edict':
      p.target = -1;
      if (p.evo && w) splash(g, p.x, p.y, 46, p.dmg * 0.6, p.slot, '#68B6AA');
      break;
    case 'chalk':
      if (g.synergies.has('lecture') && Math.random() < 0.2) splash(g, p.x, p.y, 44, p.dmg * 0.6, p.slot, '#F1EBDD');
      break;
    case 'paper':
      if (g.synergies.has('smudge') && Math.random() < 0.12 && w) {
        const z = friendlyZone(g, w, 'ink', e.x, e.y, 26, 1.6, p.dmg * 0.4);
        if (z) z.a = 1;
      }
      break;
    case 'cart':
      if ((p.evo && Math.random() < 0.03) || (g.synergies.has('meal') && Math.random() < 0.025)) g.dropPickup('food', e.x, e.y, 0);
      break;
  }
}

function splash(g: Game, x: number, y: number, r: number, dmg: number, slot: number, color: string) {
  g.hash.query(x, y, r + 30, g.enemies.items, (e) => {
    const dx = e.x - x;
    const dy = e.y - y;
    if (dx * dx + dy * dy < (r + e.r) * (r + e.r)) g.damageEnemy(e, dmg, slot, 30, 0, 0);
  });
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
    const w = g.weapons[z.slot];
    switch (z.kind) {
      case 'drop': {
        if (z.life <= 0) {
          areaDamage(g, z.x, z.y, z.r, z.dmg, z.slot, w?.def.knockback ?? 40);
          g.burst(z.x, z.y, '#5B7FB0', 8, 160);
          g.burst(z.x, z.y, '#EDE6D3', 6, 120);
          audio.play('boom', { pitch: 1.8, vol: 0.5 });
          if (z.evo) g.shake(2);
          if (g.synergies.has('review') && w) {
            for (let i = 0; i < 2; i++) {
              const a = Math.random() * TAU;
              const p = spawnProj(g, w, 'edict', z.x, z.y, Math.cos(a) * 150, Math.sin(a) * 150, 6, z.dmg * 0.35, 1, 2.2);
              if (p) p.c = 320;
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
          if (e.boss) return;
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
          g.burst(z.x, z.y, '#E2B94A', 8, 180);
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
          if (g.time - e.hitT[z.slot] < 0.22) return;
          e.hitT[z.slot] = g.time;
          g.damageEnemy(e, z.dmg, z.slot, w?.def.knockback ?? 120, dx / d, dy / d);
          if (stun && !e.boss) e.stun = 0.5;
        });
        if (z.r >= z.b || z.life <= 0) z.alive = false;
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
