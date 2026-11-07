import type { Game } from '../core/Game';
import type { Enemy } from '../core/world';
import { ENEMY_MAP } from '../data/enemies';
import { enemySprite } from '../render/sprites';
import { audio } from '../audio/audio';

/** Per-enemy behaviour. Movement speed is in px/s. */
export function updateEnemy(g: Game, e: Enemy, dt: number) {
  const p = g.player;
  const dx = p.x - e.x;
  const dy = p.y - e.y;
  const dist = Math.hypot(dx, dy) || 1;
  const nx = dx / dist;
  const ny = dy / dist;
  const slowMul = e.slow > 0 ? 0.55 : 1;
  const sp = e.speed * slowMul;
  e.t2 += dt;
  e.timer -= dt;

  const move = (mx: number, my: number, s: number) => {
    e.x += mx * s * dt;
    e.y += my * s * dt;
    if (mx > 0.1) e.face = 1;
    else if (mx < -0.1) e.face = -1;
  };

  switch (e.def.behavior) {
    case 'chase':
    case 'splitter':
    case 'tank':
      move(nx, ny, sp);
      break;

    case 'wobble': {
      const w = Math.sin(e.t2 * 3.2 + e.uid) * 0.75;
      move(nx - ny * w, ny + nx * w, sp);
      break;
    }

    case 'dash':
    case 'shield': {
      const isKnight = e.def.behavior === 'shield';
      const trigger = isKnight ? 130 : 280;
      if (e.state === 0) {
        move(nx, ny, sp);
        if (dist < trigger && e.timer <= 0) {
          e.state = 1;
          e.timer = isKnight ? 0.38 : 0.65;
          e.dirx = nx;
          e.diry = ny;
          if (!isKnight) g.telegraph('line', e.x, e.y, e.x + nx * 330, e.y + ny * 330, 0, e.timer, null, e.r * 2);
        }
      } else if (e.state === 1) {
        // wind-up: shiver in place
        e.x += (Math.random() - 0.5) * 2;
        if (e.timer <= 0) {
          e.state = 2;
          e.timer = isKnight ? 0.22 : 0.42;
          audio.play('dash');
        }
      } else if (e.state === 2) {
        move(e.dirx, e.diry, isKnight ? 520 : 760);
        if (e.timer <= 0) {
          e.state = 0;
          e.timer = isKnight ? 1.4 : 2.2;
        }
      }
      break;
    }

    case 'ranged': {
      const keep = 240;
      if (dist > keep + 50) move(nx, ny, sp);
      else if (dist < keep - 40) move(-nx, -ny, sp * 0.8);
      else move(-ny * 0.5, nx * 0.5, sp * 0.5);
      if (e.timer <= 0 && dist < 520) {
        e.timer = 2.3 + Math.random() * 0.8;
        const ball = e.def.id === 'dodgeball';
        const s = ball ? 240 : 170;
        g.enemyBullet(ball ? 'ball' : 'dust', e.x, e.y, nx * s, ny * s, e.dmg * 0.9, ball ? 8 : 6, 4, ball ? 2 : 0);
        audio.play('enemyShot');
      }
      break;
    }

    case 'bomber': {
      if (e.state === 0) {
        move(nx, ny, sp);
        if (dist < 56) {
          e.state = 1;
          e.timer = 0.7;
        }
      } else {
        e.flash = Math.sin(e.timer * 40) > 0 ? 0.05 : 0;
        if (e.timer <= 0) {
          explode(g, e);
        }
      }
      break;
    }

    case 'swarm': {
      move(e.dirx, e.diry, sp);
      if (e.t2 > 14) e.alive = false;
      if (e.x < -40 || e.y < -40 || e.x > g.stage.width + 40 || e.y > g.stage.height + 40) e.alive = false;
      break;
    }

    case 'mimic': {
      if (e.state === 0) {
        if (dist < 120) {
          e.state = 1;
          e.sprite = enemySprite('mimic');
          e.flash = 0.15;
          audio.play('warn');
        }
      } else move(nx, ny, sp);
      break;
    }

    case 'bouncer': {
      if (e.state === 0 || e.timer <= 0) {
        e.state = 1;
        e.timer = 2.6;
        const jitter = (Math.random() - 0.5) * 0.6;
        const c = Math.cos(jitter);
        const s = Math.sin(jitter);
        e.dirx = nx * c - ny * s;
        e.diry = nx * s + ny * c;
      }
      move(e.dirx, e.diry, sp);
      if (e.x < 20 || e.x > g.stage.width - 20) e.dirx *= -1;
      if (e.y < 40 || e.y > g.stage.height - 20) e.diry *= -1;
      break;
    }

    case 'hazard': {
      move(nx, ny, sp);
      if (e.timer <= 0) {
        e.timer = 1.6;
        let n = 0;
        for (const z of g.zones.items) if (z.alive && z.hostile && z.kind === 'acid') n++;
        if (n < 40) g.hostileZone('acid', e.x, e.y, 22 * e.scale, 4, e.dmg * 0.5);
      }
      break;
    }

    case 'summoner': {
      if (dist > 300) move(nx, ny, sp);
      else if (dist < 220) move(-nx, -ny, sp * 0.7);
      if (e.timer <= 0) {
        e.timer = e.elite ? 3.5 : 5.5;
        const sum = ENEMY_MAP[e.def.summon ?? 'worm'];
        const n = e.elite ? 6 : 4;
        for (let i = 0; i < n; i++) {
          const a = (i / n) * Math.PI * 2;
          g.spawnEnemy(sum, e.x + Math.cos(a) * 30, e.y + Math.sin(a) * 30);
        }
        audio.play('warn');
        if (e.elite) {
          // whistle ring
          for (let i = 0; i < 12; i++) {
            const a = (i / 12) * Math.PI * 2;
            g.enemyBullet('whistle', e.x, e.y, Math.cos(a) * 150, Math.sin(a) * 150, e.dmg * 0.6, 7, 3);
          }
        }
      }
      break;
    }

    case 'blink': {
      if (e.state === 0) {
        move(nx, ny, sp);
        if (e.timer <= 0 && dist > 120) {
          e.state = 1;
          e.timer = 0.6;
          const a = Math.random() * Math.PI * 2;
          const r = 90 + Math.random() * 60;
          e.dirx = Math.max(30, Math.min(g.stage.width - 30, p.x + Math.cos(a) * r));
          e.diry = Math.max(50, Math.min(g.stage.height - 30, p.y + Math.sin(a) * r));
          g.telegraph('circle', e.dirx, e.diry, 0, 0, e.r + 6, 0.6, null);
        }
      } else if (e.state === 1) {
        if (e.timer <= 0) {
          g.burst(e.x, e.y, '#4B3A6B', 8, 120);
          e.x = e.dirx;
          e.y = e.diry;
          g.burst(e.x, e.y, '#8A6FB0', 8, 120);
          e.state = 0;
          e.timer = e.elite ? 2.2 : 4 + Math.random() * 2;
          if (e.elite) {
            for (let i = 0; i < 10; i++) {
              const a = (i / 10) * Math.PI * 2;
              g.enemyBullet('note', e.x, e.y, Math.cos(a) * 140, Math.sin(a) * 140, e.dmg * 0.6, 7, 3.5);
            }
          }
        }
      }
      break;
    }
  }

  // Elite extras: periodic slam so mid-bosses are an actual fight.
  if (e.elite && e.def.behavior !== 'summoner' && e.def.behavior !== 'blink') {
    e.phase -= dt * 0.25;
    if (e.phase <= 0) {
      e.phase = 1;
      const tx = p.x;
      const ty = p.y;
      g.telegraph('circle', tx, ty, 0, 0, 80, 1.0, () => {
        g.areaHit(tx, ty, 80, e.def.dmg * 1.4);
        g.burst(tx, ty, '#F1EBDD', 12, 200);
        g.shake(5);
        audio.play('boom', { pitch: 1.3 });
      });
    }
  }
}

function explode(g: Game, e: Enemy) {
  const R = 74;
  g.areaHit(e.x, e.y, R, e.def.dmg);
  // friendly fire: bombs hurt nearby enemies too
  g.hash.query(e.x, e.y, R, g.enemies.items, (o) => {
    if (o === e || o.boss) return;
    const d = Math.hypot(o.x - e.x, o.y - e.y);
    if (d < R) {
      o.hp -= 30;
      o.flash = 0.1;
      if (o.hp <= 0) g.killEnemy(o);
    }
  });
  g.burst(e.x, e.y, '#E69A5A', 16, 240);
  g.burst(e.x, e.y, '#F1EBDD', 8, 160);
  g.shake(4);
  audio.play('boom', { pitch: 1.2 });
  g.killEnemy(e, true);
}
