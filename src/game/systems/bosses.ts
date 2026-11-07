import type { Game } from '../core/Game';
import type { Enemy } from '../core/world';
import { ENEMY_MAP } from '../data/enemies';
import { audio } from '../audio/audio';

const TAU = Math.PI * 2;

/**
 * Boss behaviours. Each boss has 3 phases (hp > 60%, > 28%, below).
 * e.state: 0 walking, -1 phase transition, >0 action specific.
 * e.act: remaining time of the current continuous action. e.pat: attack counter.
 */
export function updateBoss(g: Game, e: Enemy, dt: number) {
  const p = g.player;
  const ratio = e.hp / e.maxHp;
  const want = ratio > 0.6 ? 1 : ratio > 0.28 ? 2 : 3;
  if (want > e.phase) {
    e.phase = want;
    e.state = -1;
    e.act = 1.3;
    e.timer = 1.8;
    for (const b of g.bullets.items) b.alive = false;
    g.shake(10);
    audio.play('boss');
    g.burst(e.x, e.y, '#F1EBDD', 24, 300);
    ring(g, e, 260, 0, 0, 0.6); // knockback ring, gapless but slow & weak
    g.onEvent({ type: 'banner', title: `${e.boss!.name}`, sub: e.phase === 2 ? '분노하기 시작했다' : '마지막 힘을 짜낸다', tone: 'boss', label: `PHASE ${e.phase}` });
    return;
  }
  if (e.state === -1) {
    e.act -= dt;
    e.flash = Math.sin(e.act * 30) > 0 ? 0.04 : 0;
    if (e.act <= 0) e.state = 0;
    return;
  }

  const dx = p.x - e.x;
  const dy = p.y - e.y;
  const dist = Math.hypot(dx, dy) || 1;
  const nx = dx / dist;
  const ny = dy / dist;
  e.t2 += dt;
  if (Math.abs(nx) > 0.2) e.face = nx > 0 ? 1 : -1;

  switch (e.boss!.pattern) {
    case 'proctor':
      proctor(g, e, dt, nx, ny, dist);
      break;
    case 'discipline':
      discipline(g, e, dt, nx, ny, dist);
      break;
    case 'golem':
      golem(g, e, dt, nx, ny, dist);
      break;
    case 'specimen':
      specimen(g, e, dt, nx, ny, dist);
      break;
    case 'lastbell':
      lastbell(g, e, dt, nx, ny, dist);
      break;
  }
}

function walk(e: Enemy, nx: number, ny: number, dt: number, mult = 1) {
  e.x += nx * e.speed * mult * dt;
  e.y += ny * e.speed * mult * dt;
}

function radial(g: Game, e: Enemy, n: number, speed: number, kind: 'paper' | 'note' | 'ball' | 'acid' | 'whistle' | 'dust', offset = 0, dmgMul = 0.6, r = 7) {
  for (let i = 0; i < n; i++) {
    const a = offset + (i / n) * TAU;
    g.enemyBullet(kind, e.x, e.y, Math.cos(a) * speed, Math.sin(a) * speed, e.dmg * dmgMul, r, 6, kind === 'ball' ? 2 : 0);
  }
}

function fan(g: Game, e: Enemy, n: number, spread: number, speed: number, kind: 'paper' | 'note' | 'ball' | 'acid' | 'dust', dmgMul = 0.6) {
  const base = Math.atan2(g.player.y - e.y, g.player.x - e.x);
  for (let i = 0; i < n; i++) {
    const a = base + (n === 1 ? 0 : (i / (n - 1) - 0.5) * spread);
    g.enemyBullet(kind, e.x, e.y, Math.cos(a) * speed, Math.sin(a) * speed, e.dmg * dmgMul, 7, 6, kind === 'ball' ? 3 : 0);
  }
}

/** Expanding ring with an optional safe gap. */
function ring(g: Game, e: Enemy, speed: number, gapAngle: number, gapHalf: number, dmgMul = 0.9, maxR = 620) {
  const z = g.hostileZone('wave', e.x, e.y, e.r, maxR / speed, e.dmg * dmgMul, gapAngle, gapHalf);
  if (z) z.tick = speed;
}

function circleStrike(g: Game, x: number, y: number, r: number, delay: number, dmg: number, after?: () => void) {
  g.telegraph('circle', x, y, 0, 0, r, delay, () => {
    g.areaHit(x, y, r, dmg);
    g.burst(x, y, '#F1EBDD', 10, 180);
    audio.play('boom', { pitch: 1.4, vol: 0.6 });
    after?.();
  });
}

// ───────────── STAGE 1: 교무실의 감독관 ─────────────
function proctor(g: Game, e: Enemy, dt: number, nx: number, ny: number, dist: number) {
  if (e.state === 4) {
    // spiral of exam sheets
    e.act -= dt;
    e.ax -= dt;
    if (e.ax <= 0) {
      e.ax = 0.12;
      e.ay += 0.42;
      for (let k = 0; k < 3; k++) {
        const a = e.ay + (k * TAU) / 3;
        g.enemyBullet('paper', e.x, e.y, Math.cos(a) * 150, Math.sin(a) * 150, e.dmg * 0.5, 7, 6);
      }
    }
    if (e.act <= 0) e.state = 0;
    return;
  }
  if (dist > 160) walk(e, nx, ny, dt);
  e.timer -= dt;
  if (e.timer > 0) return;
  const list = e.phase === 1 ? ['ring', 'aim', 'grade'] : e.phase === 2 ? ['ring', 'summon', 'aim', 'grade'] : ['spiral', 'grade', 'ring', 'summon', 'aim'];
  const act = list[e.pat++ % list.length];
  e.timer = (e.phase === 3 ? 1.6 : 2.3) + Math.random() * 0.4;
  switch (act) {
    case 'ring':
      radial(g, e, 14 + e.phase * 2, 140, 'paper', Math.random());
      if (e.phase >= 2) g.after(() => e.alive && radial(g, e, 14 + e.phase * 2, 140, 'paper', Math.random()), 380);
      audio.play('throw');
      break;
    case 'aim':
      fan(g, e, e.phase === 1 ? 3 : 5, 0.6, 230, 'paper');
      break;
    case 'grade': {
      // red-pen marks around the player
      const n = 2 + e.phase;
      for (let i = 0; i < n; i++) {
        const a = Math.random() * TAU;
        const r = i === 0 ? 0 : 60 + Math.random() * 90;
        circleStrike(g, g.player.x + Math.cos(a) * r, g.player.y + Math.sin(a) * r, 54, 0.95, e.dmg);
      }
      break;
    }
    case 'summon':
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * TAU;
        g.spawnEnemy(ENEMY_MAP.ghost, e.x + Math.cos(a) * 60, e.y + Math.sin(a) * 60);
      }
      audio.play('warn');
      break;
    case 'spiral':
      e.state = 4;
      e.act = 3;
      e.ax = 0;
      e.ay = Math.random() * TAU;
      break;
  }
}

// ───────────── STAGE 2: 복도의 생활지도부장 ─────────────
function discipline(g: Game, e: Enemy, dt: number, nx: number, ny: number, dist: number) {
  if (e.state === 2) {
    // telegraphed wind-up
    e.act -= dt;
    if (e.act <= 0) {
      e.state = 3;
      e.act = 0.75;
      audio.play('dash');
    }
    return;
  }
  if (e.state === 3) {
    e.x += e.dirx * 920 * dt;
    e.y += e.diry * 920 * dt;
    e.act -= dt;
    if (e.t2 % 0.06 < dt) g.burst(e.x, e.y, '#2E4466', 2, 60);
    const hitWall = e.x < 40 || e.x > g.stage.width - 40 || e.y < 60 || e.y > g.stage.height - 40;
    if (e.act <= 0 || hitWall) {
      e.x = Math.max(40, Math.min(g.stage.width - 40, e.x));
      e.y = Math.max(60, Math.min(g.stage.height - 40, e.y));
      if (hitWall) {
        g.shake(6);
        radial(g, e, 10, 160, 'whistle', Math.random());
      }
      if (e.ax > 0) {
        e.ax--;
        startCharge(g, e, 0.45);
      } else {
        e.state = 0;
        e.timer = 1.4;
      }
    }
    return;
  }
  walk(e, nx, ny, dt, dist > 200 ? 1.2 : 0.6);
  e.timer -= dt;
  if (e.timer > 0) return;
  const list = e.phase === 1 ? ['charge', 'whistle', 'rulers'] : e.phase === 2 ? ['charge', 'whistle', 'charge', 'summon'] : ['charge', 'whistle', 'rulers', 'charge', 'summon'];
  const act = list[e.pat++ % list.length];
  e.timer = e.phase === 3 ? 1.7 : 2.4;
  switch (act) {
    case 'charge':
      e.ax = e.phase - 1; // extra chained charges
      startCharge(g, e, 0.85);
      break;
    case 'whistle': {
      const gap = Math.atan2(g.player.y - e.y, g.player.x - e.x) + (Math.random() - 0.5) * 2.4;
      ring(g, e, 230, gap, 0.42);
      if (e.phase >= 2) g.after(() => e.alive && ring(g, e, 230, gap + Math.PI, 0.42), 700);
      audio.play('warn');
      break;
    }
    case 'rulers':
      fan(g, e, 7, 1.2, 260, 'dust', 0.6);
      g.after(() => e.alive && fan(g, e, 7, 1.2, 260, 'dust', 0.6), 300);
      break;
    case 'summon':
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * TAU;
        g.spawnEnemy(ENEMY_MAP.worm, e.x + Math.cos(a) * 50, e.y + Math.sin(a) * 50);
      }
      break;
  }
}

function startCharge(g: Game, e: Enemy, windup: number) {
  const dx = g.player.x - e.x;
  const dy = g.player.y - e.y;
  const d = Math.hypot(dx, dy) || 1;
  e.dirx = dx / d;
  e.diry = dy / d;
  e.state = 2;
  e.act = windup;
  const len = 920 * 0.75;
  g.telegraph('line', e.x, e.y, e.x + e.dirx * len, e.y + e.diry * len, 0, windup, null, e.r * 2.2);
}

// ───────────── STAGE 3: 체육관의 농구 골렘 ─────────────
function golem(g: Game, e: Enemy, dt: number, nx: number, ny: number, _dist: number) {
  if (e.state === 3) {
    // airborne: interpolate toward slam point
    e.act -= dt;
    const k = Math.min(1, dt * 3.2);
    e.x += (e.dirx - e.x) * k;
    e.y += (e.diry - e.y) * k;
    e.spawnT = 0.5; // untouchable mid-air
    if (e.act <= 0) {
      e.spawnT = 0;
      e.x = e.dirx;
      e.y = e.diry;
      g.areaHit(e.x, e.y, 120, e.dmg * 1.2);
      g.shake(12);
      audio.play('boom', { pitch: 0.7 });
      g.burst(e.x, e.y, '#E69A5A', 24, 300);
      radial(g, e, 8 + e.phase * 2, 170, 'ball', Math.random(), 0.5, 9);
      if (e.phase === 3) ring(g, e, 260, Math.random() * TAU, 0.5);
      e.state = 0;
    }
    return;
  }
  walk(e, nx, ny, dt);
  e.timer -= dt;
  if (e.timer > 0) return;
  const list = e.phase === 1 ? ['slam', 'balls', 'balls'] : e.phase === 2 ? ['slam', 'balls', 'slam', 'quake'] : ['slam', 'quake', 'balls', 'slam'];
  const act = list[e.pat++ % list.length];
  e.timer = e.phase === 3 ? 1.9 : 2.6;
  switch (act) {
    case 'slam': {
      const tx = g.player.x;
      const ty = g.player.y;
      e.dirx = tx;
      e.diry = ty;
      e.state = 3;
      e.act = 1.05;
      g.telegraph('circle', tx, ty, 0, 0, 120, 1.05, null);
      audio.play('dash');
      break;
    }
    case 'balls':
      fan(g, e, 3 + e.phase, 1.0, 280, 'ball', 0.6);
      break;
    case 'quake': {
      const base = Math.random() * TAU;
      for (let i = 0; i < 3; i++) g.after(() => e.alive && ring(g, e, 210, base + i * 1.3, 0.48), i * 520);
      break;
    }
  }
}

// ───────────── STAGE 4: 과학실의 실패한 실험체 ─────────────
function specimen(g: Game, e: Enemy, dt: number, nx: number, ny: number, _dist: number) {
  walk(e, nx, ny, dt, 0.9);
  // leaves a trail
  e.ax -= dt;
  if (e.ax <= 0) {
    e.ax = 0.9;
    g.hostileZone('acid', e.x, e.y, 34, 4.5, e.dmg * 0.35);
  }
  e.timer -= dt;
  if (e.timer > 0) return;
  const list = e.phase === 1 ? ['spill', 'spit', 'ring'] : e.phase === 2 ? ['spill', 'split', 'spit', 'ring'] : ['spill', 'ring', 'split', 'spit', 'spill'];
  const act = list[e.pat++ % list.length];
  e.timer = e.phase === 3 ? 1.8 : 2.5;
  switch (act) {
    case 'spill': {
      const n = 4 + e.phase;
      for (let i = 0; i < n; i++) {
        const a = Math.random() * TAU;
        const r = i === 0 ? 0 : 70 + Math.random() * 140;
        const x = g.player.x + Math.cos(a) * r;
        const y = g.player.y + Math.sin(a) * r;
        g.telegraph('circle', x, y, 0, 0, 52, 1.0, () => {
          g.areaHit(x, y, 52, e.dmg * 0.8);
          g.hostileZone('acid', x, y, 52, 5, e.dmg * 0.4);
        });
      }
      break;
    }
    case 'spit':
      fan(g, e, 5 + e.phase, 1.1, 200, 'acid', 0.5);
      break;
    case 'ring':
      ring(g, e, 200, Math.atan2(g.player.y - e.y, g.player.x - e.x) + Math.PI * (Math.random() > 0.5 ? 0.5 : -0.5), 0.5);
      break;
    case 'split': {
      let clones = 0;
      for (const o of g.enemies.items) if (o.alive && o.elite && o.def.id === 'specimen') clones++;
      if (clones < 3) {
        for (let i = 0; i < 2; i++) {
          const c = g.spawnEnemy(ENEMY_MAP.specimen, e.x + (i ? 50 : -50), e.y, { elite: true, hpMul: 0.5 });
          if (c) c.phase = 2;
        }
        g.burst(e.x, e.y, '#A7C66B', 20, 260);
        audio.play('warn');
      }
      break;
    }
  }
}

// ───────────── STAGE 5: 옥상의 마지막 종 ─────────────
function lastbell(g: Game, e: Enemy, dt: number, nx: number, ny: number, dist: number) {
  if (e.state === 4) {
    e.act -= dt;
    e.ax -= dt;
    if (e.ax <= 0) {
      e.ax = e.phase === 3 ? 0.09 : 0.13;
      e.ay += 0.33;
      const arms = e.phase === 1 ? 3 : 4;
      for (let k = 0; k < arms; k++) {
        const a = e.ay + (k * TAU) / arms;
        g.enemyBullet('note', e.x, e.y, Math.cos(a) * 155, Math.sin(a) * 155, e.dmg * 0.45, 7, 6);
        if (e.phase === 3) g.enemyBullet('note', e.x, e.y, Math.cos(-a) * 120, Math.sin(-a) * 120, e.dmg * 0.45, 7, 6);
      }
    }
    if (e.act <= 0) e.state = 0;
    return;
  }
  if (dist > 220) walk(e, nx, ny, dt);
  else walk(e, -ny, nx, dt, 0.6);
  e.timer -= dt;
  if (e.timer > 0) return;
  const list =
    e.phase === 1 ? ['toll', 'spiral', 'clapper'] : e.phase === 2 ? ['toll', 'summon', 'spiral', 'clapper'] : ['toll', 'spiral', 'clapper', 'summon', 'toll'];
  const act = list[e.pat++ % list.length];
  e.timer = e.phase === 3 ? 1.5 : 2.2;
  switch (act) {
    case 'toll': {
      const n = 2 + e.phase;
      const base = Math.random() * TAU;
      for (let i = 0; i < n; i++) {
        g.after(() => {
          if (!e.alive) return;
          ring(g, e, 200 + e.phase * 15, base + i * 0.9, 0.45);
          audio.play('bell', { vol: 0.5 });
        }, i * 600);
      }
      break;
    }
    case 'spiral':
      e.state = 4;
      e.act = 2.8;
      e.ax = 0;
      e.ay = Math.random() * TAU;
      break;
    case 'clapper': {
      // cross of lines through the player position
      const x = g.player.x;
      const y = g.player.y;
      const L = 900;
      const rot = Math.random() * Math.PI;
      const lines = e.phase === 3 ? 3 : 2;
      for (let i = 0; i < lines; i++) {
        const a = rot + (i * Math.PI) / lines;
        const x1 = x - Math.cos(a) * L;
        const y1 = y - Math.sin(a) * L;
        const x2 = x + Math.cos(a) * L;
        const y2 = y + Math.sin(a) * L;
        g.telegraph('line', x1, y1, x2, y2, 0, 1.0, () => {
          g.lineHit(x1, y1, x2, y2, 44, e.dmg);
          g.shake(5);
        }, 44);
      }
      audio.play('warn');
      break;
    }
    case 'summon':
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * TAU + Math.random();
        g.spawnEnemy(ENEMY_MAP.nightwraith, e.x + Math.cos(a) * 90, e.y + Math.sin(a) * 90);
      }
      break;
  }
}
