import type { Game } from '../core/Game';
import type { Enemy, Projectile, Zone } from '../core/world';
import { drawProp, floorTile } from './stageArt';
import { pickupSprite, enemySprite, type Sprite } from './sprites';
import { PAL } from './pixelmaps';

const TAU = Math.PI * 2;
const PX = 3; // world units per art pixel

export class Renderer {
  g: Game;
  ctx: CanvasRenderingContext2D;
  pattern: CanvasPattern | null = null;
  time = 0;
  vignette: HTMLCanvasElement | null = null;
  vigKey = '';
  bookSprite: HTMLCanvasElement;
  clockSprite: Sprite;

  constructor(g: Game) {
    this.g = g;
    this.ctx = g.canvas.getContext('2d', { alpha: false })!;
    const tile = floorTile(g.stage);
    this.pattern = this.ctx.createPattern(tile, 'repeat');
    this.pattern?.setTransform(new DOMMatrix().scale(PX, PX));
    this.bookSprite = makeBook();
    this.clockSprite = enemySprite('bomb');
  }

  draw(dt: number) {
    this.time += dt;
    const g = this.g;
    const c = this.ctx;
    const v = g.view;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.imageSmoothingEnabled = false;
    c.fillStyle = g.stage.palette.wall;
    c.fillRect(0, 0, v.w, v.h);

    const s = v.scale;
    const camX = g.cam.x + g.cam.sx;
    const camY = g.cam.y + g.cam.sy;
    const tx = Math.round(v.w / 2 - camX * s);
    const ty = Math.round(v.h / 2 - camY * s);
    c.setTransform(s, 0, 0, s, tx, ty);
    const vr = g.viewRect();
    const pad = 80;
    const inView = (x: number, y: number, r: number) => x + r > vr.x - pad && x - r < vr.x + vr.w + pad && y + r > vr.y - pad && y - r < vr.y + vr.h + pad;

    // floor
    const W = g.stage.width;
    const H = g.stage.height;
    if (this.pattern) {
      c.fillStyle = this.pattern;
      c.fillRect(Math.max(0, vr.x - 10), Math.max(0, vr.y - 10), Math.min(W, vr.w + 20), Math.min(H, vr.h + 20));
    }
    // top wall band
    c.fillStyle = g.stage.palette.wall;
    c.fillRect(0, -200, W, 248);
    c.fillStyle = 'rgba(0,0,0,0.25)';
    c.fillRect(0, 48, W, 6);
    // arena edge
    c.strokeStyle = 'rgba(0,0,0,0.35)';
    c.lineWidth = 6;
    c.strokeRect(-3, -3, W + 6, H + 6);

    for (const o of g.layout.decor) if (inView(o.x + o.w / 2, o.y + o.h / 2, Math.max(o.w, o.h))) drawProp(c, o, this.time);

    // zones under everything
    for (const z of g.zones.items) if (z.alive && inView(z.x, z.y, z.r)) this.drawZone(z);
    for (const o of g.layout.obstacles) if (inView(o.x + o.w / 2, o.y + o.h / 2, Math.max(o.w, o.h))) drawProp(c, o, this.time);

    // telegraphs
    for (const t of g.telegraphs.items) {
      if (!t.alive) continue;
      const k = Math.min(1, t.t / t.dur);
      const pulse = 0.5 + Math.sin(this.time * 18) * 0.15;
      if (t.shape === 'circle') {
        c.fillStyle = `rgba(217,100,74,${0.1 + k * 0.18})`;
        c.beginPath();
        c.arc(t.x, t.y, t.r, 0, TAU);
        c.fill();
        c.fillStyle = `rgba(217,100,74,${0.25 * pulse + 0.15})`;
        c.beginPath();
        c.arc(t.x, t.y, t.r * k, 0, TAU);
        c.fill();
        c.strokeStyle = `rgba(241,235,221,${0.35 + k * 0.4})`;
        c.lineWidth = 2;
        c.beginPath();
        c.arc(t.x, t.y, t.r, 0, TAU);
        c.stroke();
      } else if (t.shape === 'line') {
        const a = Math.atan2(t.y2 - t.y, t.x2 - t.x);
        const L = Math.hypot(t.x2 - t.x, t.y2 - t.y);
        c.save();
        c.translate(t.x, t.y);
        c.rotate(a);
        c.fillStyle = `rgba(217,100,74,${0.1 + k * 0.15})`;
        c.fillRect(0, -t.w / 2, L, t.w);
        c.fillStyle = `rgba(217,100,74,${0.3 * pulse})`;
        c.fillRect(0, -t.w / 2, L * k, t.w);
        c.fillStyle = 'rgba(241,235,221,0.5)';
        c.fillRect(0, -t.w / 2, L, 2);
        c.fillRect(0, t.w / 2 - 2, L, 2);
        c.restore();
      }
    }

    // pickups
    for (const pk of g.pickups.items) {
      if (!pk.alive || !inView(pk.x, pk.y, 20)) continue;
      const sp = pickupSprite(pk.kind);
      const bob = pk.kind === 'chest' ? Math.sin(this.time * 3) * 2 : Math.sin(this.time * 5 + pk.x * 0.05) * 1.5;
      const sc = pk.kind === 'chest' ? PX * 1.4 : pk.kind === 'gem3' ? PX * 1.1 : PX * 0.9;
      if (pk.kind === 'chest') {
        c.fillStyle = `rgba(226,185,74,${0.18 + Math.sin(this.time * 4) * 0.08})`;
        c.beginPath();
        c.arc(pk.x, pk.y, 34, 0, TAU);
        c.fill();
      }
      c.drawImage(sp.img, pk.x - (sp.w * sc) / 2, pk.y - (sp.h * sc) / 2 + bob, sp.w * sc, sp.h * sc);
    }

    // enemy shadows
    c.fillStyle = 'rgba(0,0,0,0.22)';
    for (const e of g.enemies.items) {
      if (!e.alive || !inView(e.x, e.y, e.r)) continue;
      c.beginPath();
      c.ellipse(e.x, e.y + e.r * 0.8, e.r * 0.9, e.r * 0.35, 0, 0, TAU);
      c.fill();
    }
    // enemies
    let bossE: Enemy | null = null;
    for (const e of g.enemies.items) {
      if (!e.alive || !inView(e.x, e.y, e.r * 2)) continue;
      if (e.boss) {
        bossE = e;
        continue;
      }
      this.drawEnemy(e);
    }
    if (bossE) this.drawEnemy(bossE);

    // player
    this.drawPlayer();

    // compass blades
    for (const w of g.weapons) {
      if (w.def.kind !== 'compass' || (w.active <= 0 && !w.def.isEvolution)) continue;
      const P = g.player.stats;
      let count = w.stats.count + P.amount;
      if (g.synergies.has('draft')) count++;
      const R = 66 * w.stats.area * P.area;
      for (let i = 0; i < count; i++) {
        const a = w.angle + (i / count) * TAU;
        const bx = g.player.x + Math.cos(a) * R;
        const by = g.player.y + Math.sin(a) * R;
        this.drawCompass(bx, by, a, w.stats.area * P.area, !!w.def.isEvolution);
      }
    }

    // projectiles
    for (const p of g.projectiles.items) if (p.alive && inView(p.x, p.y, 30)) this.drawProjectile(p);

    // enemy bullets
    for (const b of g.bullets.items) {
      if (!b.alive || !inView(b.x, b.y, b.r)) continue;
      const col =
        b.kind === 'acid' ? '#A7C66B' : b.kind === 'ball' ? '#E69A5A' : b.kind === 'note' ? '#C79A4A' : b.kind === 'whistle' ? '#68B6AA' : b.kind === 'paper' ? '#EDE6D3' : '#D8DCE4';
      c.fillStyle = PAL.o;
      if (b.kind === 'paper') {
        c.save();
        c.translate(b.x, b.y);
        c.rotate(b.t * 6);
        c.fillRect(-b.r - 2, -b.r * 0.7 - 2, b.r * 2 + 4, b.r * 1.4 + 4);
        c.fillStyle = col;
        c.fillRect(-b.r, -b.r * 0.7, b.r * 2, b.r * 1.4);
        c.fillStyle = '#C9563C';
        c.fillRect(-b.r + 2, -2, b.r * 1.2, 2);
        c.restore();
      } else {
        c.beginPath();
        c.arc(b.x, b.y, b.r + 2.5, 0, TAU);
        c.fill();
        c.fillStyle = col;
        c.beginPath();
        c.arc(b.x, b.y, b.r, 0, TAU);
        c.fill();
        c.fillStyle = 'rgba(255,255,255,0.55)';
        c.fillRect(b.x - b.r * 0.4, b.y - b.r * 0.5, b.r * 0.5, b.r * 0.4);
      }
    }

    // particles
    for (const pt of g.particles.items) {
      if (!pt.alive) continue;
      c.globalAlpha = Math.min(1, (pt.life / pt.maxLife) * 1.5);
      c.fillStyle = pt.color;
      const sz = pt.size;
      c.fillRect(pt.x - sz / 2, pt.y - sz / 2, sz, sz);
    }
    c.globalAlpha = 1;

    // mop sweep
    if (g.event?.id === 'cleaning') {
      const mx = g.mopX;
      c.fillStyle = 'rgba(104,182,170,0.12)';
      c.fillRect(mx - 40, vr.y - 20, 80, vr.h + 40);
      c.fillStyle = 'rgba(241,235,221,0.35)';
      c.fillRect(mx - 3, vr.y - 20, 6, vr.h + 40);
      for (let y = vr.y; y < vr.y + vr.h; y += 120) {
        c.fillStyle = '#8B5E3C';
        c.fillRect(mx - 3, y, 6, 50);
        c.fillStyle = '#D8DCE4';
        c.fillRect(mx - 18, y + 50, 36, 16);
      }
    }

    // damage numbers
    if (g.cfg.settings.damageNumbers) {
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.lineJoin = 'round';
      for (const t of g.texts.items) {
        if (!t.alive) continue;
        const size = t.crit ? 17 : 12;
        c.font = `700 ${size}px Galmuri11, monospace`;
        c.globalAlpha = Math.min(1, t.life * 3);
        c.lineWidth = 4;
        c.strokeStyle = PAL.o;
        c.strokeText(t.text, t.x, t.y);
        c.fillStyle = t.color;
        c.fillText(t.text, t.x, t.y);
      }
      c.globalAlpha = 1;
    }

    // ── screen space ──
    c.setTransform(1, 0, 0, 1, 0, 0);
    this.drawAtmosphere(tx, ty, s);
    this.drawBossPointer(tx, ty, s, bossE);
    this.drawJoystick();
  }

  private drawEnemy(e: Enemy) {
    const c = this.ctx;
    const sp = e.sprite;
    const sc = PX * e.scale * (e.boss ? 1.6 / 1.6 : 1);
    let w = sp.w * sc;
    let h = sp.h * sc;
    if (e.boss) {
      w = sp.w * PX * 1.6;
      h = sp.h * PX * 1.6;
    }
    // simple squash-walk
    const bob = e.def.behavior === 'swarm' ? 0 : Math.abs(Math.sin(e.t2 * 7 + e.uid)) * 2;
    const sq = 1 + Math.sin(e.t2 * 14 + e.uid) * 0.03;
    const x = e.x - w / 2;
    const y = e.y - h * 0.62 - bob;
    if (e.spawnT > 0) c.globalAlpha = Math.max(0, 1 - e.spawnT / (e.boss ? 1.2 : 0.25));
    if (e.elite || e.boss) {
      c.strokeStyle = e.boss ? 'rgba(230,154,90,0.5)' : 'rgba(226,185,74,0.45)';
      c.lineWidth = 3;
      c.beginPath();
      c.ellipse(e.x, e.y + e.r * 0.8, e.r * 1.2, e.r * 0.5, 0, 0, TAU);
      c.stroke();
    }
    if (e.def.behavior === 'swarm') {
      c.save();
      c.translate(e.x, e.y);
      c.rotate(Math.atan2(e.diry, e.dirx));
      c.drawImage(sp.img, -w / 2, -h / 2, w, h);
      c.restore();
    } else {
      const img = e.face < 0 ? sp.flip : sp.img;
      c.drawImage(img, x, y + h * (1 - sq), w, h * sq);
      if (e.flash > 0) {
        c.globalAlpha = Math.min(1, e.flash * 10) * (c.globalAlpha || 1);
        c.drawImage(sp.flash, x, y + h * (1 - sq), w, h * sq);
      }
    }
    c.globalAlpha = 1;
    // fuse indicator for bombs
    if (e.def.behavior === 'bomber' && e.state === 1) {
      c.strokeStyle = 'rgba(217,100,74,0.7)';
      c.lineWidth = 2;
      c.beginPath();
      c.arc(e.x, e.y, 74 * (1 - e.timer / 0.7), 0, TAU);
      c.stroke();
    }
    // elite hp bar
    if (e.elite && e.hp < e.maxHp) {
      const bw = e.r * 2;
      c.fillStyle = PAL.o;
      c.fillRect(e.x - bw / 2 - 2, y - 12, bw + 4, 7);
      c.fillStyle = '#E2B94A';
      c.fillRect(e.x - bw / 2, y - 10, bw * (e.hp / e.maxHp), 3);
    }
  }

  private drawPlayer() {
    const g = this.g;
    const p = g.player;
    const c = this.ctx;
    c.fillStyle = 'rgba(0,0,0,0.28)';
    c.beginPath();
    c.ellipse(p.x, p.y + 15, 13, 5, 0, 0, TAU);
    c.fill();
    // pickup radius hint (very subtle)
    const frame = p.moving ? Math.floor(p.animT) % 4 : 0;
    const sp = p.sprites[frame];
    const w = sp.w * PX;
    const h = sp.h * PX;
    const bob = p.moving ? (frame % 2) * 1.5 : Math.sin(this.time * 2.5) * 0.8;
    const x = p.x - w / 2;
    const y = p.y - h * 0.68 - bob;
    if (p.invuln > 0 && Math.floor(this.time * 20) % 2 === 0 && p.flash <= 0) c.globalAlpha = 0.45;
    c.drawImage(p.facex < 0 ? sp.flip : sp.img, x, y, w, h);
    if (p.flash > 0) {
      c.globalAlpha = Math.min(1, p.flash * 6);
      c.drawImage(sp.flash, x, y, w, h);
    }
    c.globalAlpha = 1;
    // facing tick
    c.fillStyle = 'rgba(241,235,221,0.5)';
    c.fillRect(p.x + p.facex * 24 - 2, p.y + p.facey * 24 - 2, 4, 4);
  }

  private drawCompass(x: number, y: number, a: number, area: number, evo: boolean) {
    const c = this.ctx;
    c.save();
    c.translate(x, y);
    c.rotate(a + Math.PI / 2);
    const s = 1.1 * Math.sqrt(area);
    c.scale(s, s);
    c.fillStyle = PAL.o;
    c.fillRect(-9, -15, 18, 30);
    c.fillStyle = evo ? '#E2B94A' : '#D8DCE4';
    c.beginPath();
    c.moveTo(-6, -12);
    c.lineTo(-1, 12);
    c.lineTo(-4, 12);
    c.closePath();
    c.fill();
    c.beginPath();
    c.moveTo(6, -12);
    c.lineTo(2, 12);
    c.lineTo(5, 12);
    c.closePath();
    c.fill();
    c.fillStyle = evo ? '#C79A4A' : '#9CA3AF';
    c.fillRect(-6, -15, 12, 6);
    c.restore();
    c.strokeStyle = evo ? 'rgba(226,185,74,0.25)' : 'rgba(216,220,228,0.18)';
    c.lineWidth = 3;
    c.beginPath();
    c.arc(x, y, 16 * area, 0, TAU);
    c.stroke();
  }

  private drawProjectile(p: Projectile) {
    const c = this.ctx;
    const a = Math.atan2(p.vy, p.vx);
    switch (p.kind) {
      case 'chalk': {
        c.save();
        c.translate(p.x, p.y);
        c.rotate(a);
        const L = p.evo ? 22 : 15;
        c.fillStyle = PAL.o;
        c.fillRect(-L / 2 - 2, -5, L + 4, 10);
        c.fillStyle = p.evo ? '#F1EBDD' : '#EDE6D3';
        c.fillRect(-L / 2, -3, L, 6);
        if (p.evo) {
          c.fillStyle = '#68B6AA';
          c.fillRect(-L / 2, -3, 5, 6);
        }
        c.restore();
        c.fillStyle = 'rgba(241,235,221,0.35)';
        c.fillRect(p.x - p.vx * 0.02 - 2, p.y - p.vy * 0.02 - 2, 4, 4);
        break;
      }
      case 'pencil': {
        c.save();
        c.translate(p.x, p.y);
        c.rotate(a);
        const L = p.evo ? 40 : 22;
        c.fillStyle = PAL.o;
        c.fillRect(-L / 2, -3, L, 6);
        c.fillStyle = p.evo ? '#68B6AA' : '#474E5E';
        c.fillRect(-L / 2 + 1, -1.5, L - 2, 3);
        c.restore();
        break;
      }
      case 'ball': {
        const r = p.r;
        c.fillStyle = PAL.o;
        c.beginPath();
        c.arc(p.x, p.y, r + 3, 0, TAU);
        c.fill();
        c.fillStyle = p.evo ? '#E2B94A' : '#E69A5A';
        c.beginPath();
        c.arc(p.x, p.y, r, 0, TAU);
        c.fill();
        c.strokeStyle = '#A8653A';
        c.lineWidth = 2;
        c.save();
        c.translate(p.x, p.y);
        c.rotate(p.t * 10);
        c.beginPath();
        c.moveTo(-r, 0);
        c.lineTo(r, 0);
        c.moveTo(0, -r);
        c.lineTo(0, r);
        c.stroke();
        c.restore();
        break;
      }
      case 'paper': {
        c.save();
        c.translate(p.x, p.y);
        c.rotate(p.a + p.t * 4);
        c.fillStyle = PAL.o;
        c.fillRect(-10, -7, 20, 14);
        c.fillStyle = p.evo ? '#F1EBDD' : '#EDE6D3';
        c.fillRect(-8, -5, 16, 10);
        c.fillStyle = '#9CA3AF';
        c.fillRect(-6, -2, 10, 1.5);
        c.fillRect(-6, 1, 7, 1.5);
        c.fillStyle = '#C9563C';
        c.fillRect(3, -4, 3, 3);
        c.restore();
        break;
      }
      case 'edict': {
        c.save();
        c.translate(p.x, p.y);
        c.rotate(a);
        c.fillStyle = PAL.o;
        c.fillRect(-9, -5, 18, 10);
        c.fillStyle = p.evo ? '#E2B94A' : '#68B6AA';
        c.fillRect(-7, -3, 14, 6);
        c.fillStyle = '#F1EBDD';
        c.fillRect(1, -1, 4, 2);
        c.restore();
        c.fillStyle = 'rgba(104,182,170,0.3)';
        c.fillRect(p.x - p.vx * 0.03 - 2, p.y - p.vy * 0.03 - 2, 4, 4);
        break;
      }
      case 'cart': {
        c.save();
        c.translate(p.x, p.y);
        c.rotate(a);
        const s = p.r / 20;
        c.scale(s, s);
        c.fillStyle = 'rgba(0,0,0,0.25)';
        c.fillRect(-26, 10, 52, 10);
        c.fillStyle = PAL.o;
        c.fillRect(-28, -20, 56, 40);
        c.fillStyle = p.evo ? '#C79A4A' : '#D8DCE4';
        c.fillRect(-25, -17, 50, 34);
        c.fillStyle = '#9CA3AF';
        c.fillRect(-25, -4, 50, 3);
        c.fillStyle = '#F1EBDD';
        c.fillRect(-18, -13, 14, 8);
        c.fillStyle = '#C9563C';
        c.fillRect(0, -13, 10, 8);
        c.fillStyle = '#E2B94A';
        c.fillRect(-16, 3, 22, 9);
        c.restore();
        break;
      }
    }
  }

  private drawZone(z: Zone) {
    const c = this.ctx;
    const k = z.life / z.maxLife;
    switch (z.kind) {
      case 'ink': {
        const alpha = Math.min(1, z.life * 2, (z.maxLife - z.life) * 6 + 0.2);
        c.globalAlpha = alpha * 0.85;
        c.fillStyle = z.evo ? '#141020' : '#1E2433';
        blob(c, z.x, z.y, z.r, z.slot * 7 + (z.follow ? this.time * 0.5 : 0));
        c.fillStyle = z.evo ? 'rgba(138,111,176,0.35)' : 'rgba(91,127,176,0.3)';
        blob(c, z.x, z.y, z.r * 0.6, z.slot * 7 + 2);
        c.globalAlpha = 1;
        break;
      }
      case 'acid': {
        const alpha = Math.min(1, z.life * 2) * (z.life > z.maxLife - 0.3 ? 0.5 : 1);
        c.globalAlpha = alpha * 0.55;
        c.fillStyle = '#6E8E3E';
        blob(c, z.x, z.y, z.r, z.x * 0.01);
        c.globalAlpha = alpha * 0.6;
        c.fillStyle = '#A7C66B';
        blob(c, z.x, z.y, z.r * 0.55, z.y * 0.01);
        if (Math.sin(this.time * 6 + z.x) > 0.9) {
          c.fillStyle = '#DDEBB0';
          c.fillRect(z.x + Math.sin(z.y) * z.r * 0.4, z.y + Math.cos(z.x) * z.r * 0.3, 4, 4);
        }
        c.globalAlpha = 1;
        break;
      }
      case 'vortex': {
        if (z.a === 1) break;
        c.strokeStyle = z.evo ? 'rgba(138,111,176,0.45)' : 'rgba(201,86,60,0.35)';
        c.lineWidth = 3;
        for (let i = 0; i < 3; i++) {
          const r = z.r * ((k * 1.5 + i / 3) % 1);
          c.beginPath();
          c.arc(z.x, z.y, r, this.time * 3 + i, this.time * 3 + i + 4);
          c.stroke();
        }
        c.fillStyle = z.evo ? 'rgba(20,16,32,0.35)' : 'rgba(201,86,60,0.08)';
        c.beginPath();
        c.arc(z.x, z.y, z.r, 0, TAU);
        c.fill();
        break;
      }
      case 'alarm': {
        const sp = this.clockSprite;
        const shake = z.life < 0.4 ? (Math.random() - 0.5) * 3 : 0;
        c.strokeStyle = `rgba(230,154,90,${0.25 + (1 - k) * 0.4})`;
        c.lineWidth = 2;
        c.beginPath();
        c.arc(z.x, z.y, z.r, 0, TAU);
        c.stroke();
        c.beginPath();
        c.arc(z.x, z.y, z.r * (1 - k), 0, TAU);
        c.stroke();
        if (z.b === 0) c.drawImage(sp.img, z.x - 16 + shake, z.y - 18, 33, 33);
        break;
      }
      case 'drop': {
        const prog = 1 - k;
        c.fillStyle = `rgba(0,0,0,${0.15 + prog * 0.25})`;
        c.beginPath();
        c.ellipse(z.x, z.y, z.r * (0.4 + prog * 0.6), z.r * 0.45 * (0.4 + prog * 0.6), 0, 0, TAU);
        c.fill();
        const fall = (1 - prog) * 260;
        const s = z.evo ? 1.5 : 1;
        c.save();
        c.translate(z.x, z.y - fall);
        c.rotate(z.b + prog * 2);
        c.drawImage(this.bookSprite, -12 * s, -9 * s, 24 * s, 18 * s);
        c.restore();
        break;
      }
      case 'wave': {
        if (z.hostile) {
          // boss ring with a safe gap
          c.lineWidth = 14;
          c.strokeStyle = 'rgba(217,100,74,0.55)';
          c.beginPath();
          if (z.b > 0) c.arc(z.x, z.y, z.r, z.a + z.b, z.a - z.b + TAU);
          else c.arc(z.x, z.y, z.r, 0, TAU);
          c.stroke();
          c.lineWidth = 3;
          c.strokeStyle = 'rgba(241,235,221,0.8)';
          c.stroke();
        } else {
          const fade = 1 - z.r / Math.max(1, z.b);
          c.lineWidth = z.evo ? 6 : 4;
          c.strokeStyle = z.evo ? `rgba(226,185,74,${fade * 0.8})` : `rgba(104,182,170,${fade * 0.75})`;
          c.beginPath();
          c.arc(z.x, z.y, z.r, 0, TAU);
          c.stroke();
          c.lineWidth = 2;
          c.strokeStyle = `rgba(241,235,221,${fade * 0.5})`;
          c.beginPath();
          c.arc(z.x, z.y, Math.max(1, z.r - 8), 0, TAU);
          c.stroke();
        }
        break;
      }
    }
  }

  private drawAtmosphere(tx: number, ty: number, s: number) {
    const g = this.g;
    const c = this.ctx;
    const v = g.view;
    const px = g.player.x * s + tx;
    const py = g.player.y * s + ty;
    // stage tint
    c.fillStyle = g.stage.palette.ambient;
    c.fillRect(0, 0, v.w, v.h);
    // rooftop: sunset to night progression
    if (g.stage.id === 'rooftop') {
      const k = Math.min(1, g.time / (g.stage.duration * 0.85));
      c.fillStyle = `rgba(230,120,70,${0.12 * (1 - k)})`;
      c.fillRect(0, 0, v.w, v.h);
      c.fillStyle = `rgba(10,16,34,${0.38 * k})`;
      c.fillRect(0, 0, v.w, v.h);
    }
    // night study / final boss phase 3: limited vision
    const boss = g.boss;
    const dark = g.event?.id === 'night' || (boss && boss.alive && boss.boss?.pattern === 'lastbell' && boss.phase === 3);
    if (dark) {
      const r = Math.min(v.w, v.h) * 0.55;
      const grd = c.createRadialGradient(px, py, r * 0.25, px, py, r);
      grd.addColorStop(0, 'rgba(8,12,24,0)');
      grd.addColorStop(1, 'rgba(8,12,24,0.72)');
      c.fillStyle = grd;
      c.fillRect(0, 0, v.w, v.h);
    }
    // vignette (cached)
    const key = `${v.w}x${v.h}`;
    if (this.vigKey !== key) {
      this.vigKey = key;
      const vc = document.createElement('canvas');
      vc.width = v.w;
      vc.height = v.h;
      const vg = vc.getContext('2d')!;
      const grd = vg.createRadialGradient(v.w / 2, v.h / 2, Math.min(v.w, v.h) * 0.35, v.w / 2, v.h / 2, Math.max(v.w, v.h) * 0.75);
      grd.addColorStop(0, 'rgba(10,14,24,0)');
      grd.addColorStop(1, 'rgba(10,14,24,0.55)');
      vg.fillStyle = grd;
      vg.fillRect(0, 0, v.w, v.h);
      this.vignette = vc;
    }
    if (this.vignette) c.drawImage(this.vignette, 0, 0);
    // low hp warning
    const p = g.player;
    if (p.hp / p.stats.maxHp < 0.3 && g.state === 'play') {
      const a = (0.18 + Math.sin(this.time * 6) * 0.08) * (g.cfg.settings.reducedFlash ? 0.5 : 1);
      const grd = c.createRadialGradient(v.w / 2, v.h / 2, Math.min(v.w, v.h) * 0.3, v.w / 2, v.h / 2, Math.max(v.w, v.h) * 0.7);
      grd.addColorStop(0, 'rgba(217,100,74,0)');
      grd.addColorStop(1, `rgba(217,100,74,${a})`);
      c.fillStyle = grd;
      c.fillRect(0, 0, v.w, v.h);
    }
  }

  private drawBossPointer(tx: number, ty: number, s: number, bossOnScreen: Enemy | null) {
    const g = this.g;
    const b = g.boss;
    if (!b || !b.alive || bossOnScreen) return;
    const v = g.view;
    const bx = b.x * s + tx;
    const by = b.y * s + ty;
    const cx = v.w / 2;
    const cy = v.h / 2;
    const a = Math.atan2(by - cy, bx - cx);
    const m = 40 * v.dpr;
    const ex = Math.max(m, Math.min(v.w - m, cx + Math.cos(a) * v.w));
    const ey = Math.max(m, Math.min(v.h - m, cy + Math.sin(a) * v.h));
    const c = this.ctx;
    c.save();
    c.translate(ex, ey);
    c.rotate(a);
    const sz = 10 * v.dpr;
    c.fillStyle = '#E69A5A';
    c.beginPath();
    c.moveTo(sz, 0);
    c.lineTo(-sz, -sz * 0.8);
    c.lineTo(-sz * 0.5, 0);
    c.lineTo(-sz, sz * 0.8);
    c.closePath();
    c.fill();
    c.restore();
  }

  private drawJoystick() {
    const g = this.g;
    const j = g.input.joy;
    if (!j.active || g.state !== 'play') return;
    const c = this.ctx;
    const d = g.view.dpr;
    const R = g.input.joyRadius * d;
    c.strokeStyle = 'rgba(241,235,221,0.35)';
    c.lineWidth = 2 * d;
    c.beginPath();
    c.arc(j.bx * d, j.by * d, R, 0, TAU);
    c.stroke();
    c.fillStyle = 'rgba(241,235,221,0.08)';
    c.fill();
    let dx = j.x - j.bx;
    let dy = j.y - j.by;
    const l = Math.hypot(dx, dy);
    if (l > g.input.joyRadius) {
      dx = (dx / l) * g.input.joyRadius;
      dy = (dy / l) * g.input.joyRadius;
    }
    c.fillStyle = 'rgba(241,235,221,0.55)';
    c.beginPath();
    c.arc((j.bx + dx) * d, (j.by + dy) * d, R * 0.42, 0, TAU);
    c.fill();
  }
}

function blob(c: CanvasRenderingContext2D, x: number, y: number, r: number, seed: number) {
  c.beginPath();
  const n = 10;
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * TAU;
    const rr = r * (0.82 + 0.18 * Math.sin(a * 3 + seed) * Math.cos(a * 2 + seed * 1.3));
    const px = x + Math.cos(a) * rr;
    const py = y + Math.sin(a) * rr * 0.8;
    if (i === 0) c.moveTo(px, py);
    else c.lineTo(px, py);
  }
  c.closePath();
  c.fill();
}

function makeBook(): HTMLCanvasElement {
  const rows = ['oooooooo', 'obbbbbbo', 'obwwwwbo', 'obbbbbbo', 'oBBBBBBo', 'oppppppo', 'oooooooo'];
  const pal: Record<string, string> = { o: PAL.o, b: PAL.b, B: PAL.B, w: PAL.w, p: PAL.p };
  const c = document.createElement('canvas');
  c.width = 8;
  c.height = 7;
  const g = c.getContext('2d')!;
  rows.forEach((r, y) => [...r].forEach((ch, x) => {
    if (ch === '.') return;
    g.fillStyle = pal[ch];
    g.fillRect(x, y, 1, 1);
  }));
  return c;
}
