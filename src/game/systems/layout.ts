import type { Obstacle, StageDef } from '../types';
import type { StageLayout } from '../core/world';

/** Deterministic per-stage obstacle & decoration layout. */
export function buildLayout(stage: StageDef): StageLayout {
  const obstacles: Obstacle[] = [];
  const decor: Obstacle[] = [];
  const W = stage.width;
  const H = stage.height;
  const ob = (x: number, y: number, w: number, h: number, kind: string) => obstacles.push({ x, y, w, h, kind });
  const de = (x: number, y: number, w: number, h: number, kind: string) => decor.push({ x, y, w, h, kind });

  switch (stage.id) {
    case 'classroom': {
      // Blackboard along the top wall and the teacher's podium.
      de(W / 2 - 360, 4, 720, 40, 'blackboard');
      ob(W / 2 - 70, 120, 140, 54, 'podium');
      // Desk clusters (2x2) leaving wide aisles.
      const cols = 5;
      const rows = 3;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const x = 230 + c * ((W - 460) / (cols - 1)) - 60;
          const y = 420 + r * 380 - 40;
          if (r === 1 && c === 2) continue; // center left open for the start
          ob(x, y, 120, 76, 'desks');
        }
      }
      for (let i = 0; i < 10; i++) de(60 + i * ((W - 120) / 10), H - 50, (W - 120) / 10 - 8, 44, 'locker');
      de(40, 300, 30, 160, 'window');
      de(40, 900, 30, 160, 'window');
      de(W - 70, 300, 30, 160, 'board');
      break;
    }
    case 'hallway': {
      for (let x = 120; x < W - 120; x += 340) de(x, 6, 220, 46, 'hallwindow');
      for (let x = 260; x < W - 260; x += 680) de(x, H - 54, 120, 50, 'door');
      for (let x = 120; x < W - 200; x += 680) {
        for (let i = 0; i < 4; i++) de(x + 420 + i * 46, H - 52, 42, 46, 'locker');
      }
      for (let x = 600; x < W - 400; x += 900) {
        ob(x, H / 2 - 26, 52, 52, 'pillar');
      }
      for (let x = 1050; x < W - 400; x += 1800) ob(x, 120, 120, 36, 'bench');
      for (let x = 1950; x < W - 400; x += 1800) ob(x, H - 170, 120, 36, 'bench');
      break;
    }
    case 'gym': {
      de(W / 2 - 2, 60, 4, H - 120, 'courtline');
      de(W / 2 - 180, H / 2 - 180, 360, 360, 'centercircle');
      de(80, 60, W - 160, H - 120, 'courtrect');
      de(80, H / 2 - 300, 500, 600, 'keyL');
      de(W - 580, H / 2 - 300, 500, 600, 'keyR');
      ob(40, H / 2 - 40, 70, 80, 'hoop');
      ob(W - 110, H / 2 - 40, 70, 80, 'hoop');
      ob(W / 2 - 400, 260, 140, 60, 'mats');
      ob(W / 2 + 260, H - 320, 140, 60, 'mats');
      ob(400, H - 300, 70, 70, 'ballcart');
      ob(W - 470, 240, 70, 70, 'ballcart');
      break;
    }
    case 'lab': {
      const benchW = 260;
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          if (r === 1 && c === 1) continue;
          const x = 300 + c * ((W - 600 - benchW) / 2);
          const y = 360 + r * 520;
          ob(x, y, benchW, 70, 'labbench');
        }
      }
      de(W / 2 - 300, 4, 600, 40, 'blackboard');
      for (let i = 0; i < 6; i++) de(80 + i * 90, H - 60, 80, 54, 'shelf');
      for (let i = 0; i < 6; i++) de(W - 620 + i * 90, H - 60, 80, 54, 'shelf');
      de(W - 80, 400, 40, 120, 'eyewash');
      break;
    }
    case 'rooftop': {
      ob(W / 2 + 260, H / 2 - 520, 200, 200, 'tank');
      ob(W / 2 - 520, H / 2 + 320, 160, 90, 'ac');
      ob(W / 2 - 560, H / 2 - 420, 100, 100, 'stairhouse');
      ob(W / 2 + 380, H / 2 + 380, 110, 70, 'ac');
      for (let x = 20; x < W; x += 60) {
        de(x, 0, 50, 18, 'railH');
        de(x, H - 18, 50, 18, 'railH');
      }
      for (let y = 20; y < H; y += 60) {
        de(0, y, 18, 50, 'railV');
        de(W - 18, y, 18, 50, 'railV');
      }
      de(W / 2 - 50, H / 2 - 50, 100, 100, 'bellmark');
      break;
    }
  }
  return { obstacles, decor };
}

/** Resolve a circle against AABB obstacles (in place). */
export function resolveCircle(p: { x: number; y: number }, r: number, obs: Obstacle[]) {
  for (let i = 0; i < obs.length; i++) {
    const o = obs[i];
    if (p.x + r < o.x || p.x - r > o.x + o.w || p.y + r < o.y || p.y - r > o.y + o.h) continue;
    const cx = Math.max(o.x, Math.min(p.x, o.x + o.w));
    const cy = Math.max(o.y, Math.min(p.y, o.y + o.h));
    let dx = p.x - cx;
    let dy = p.y - cy;
    let d2 = dx * dx + dy * dy;
    if (d2 >= r * r) continue;
    if (d2 === 0) {
      // centre inside the box: push out along the shallowest axis
      const l = p.x - o.x;
      const rr = o.x + o.w - p.x;
      const t = p.y - o.y;
      const b = o.y + o.h - p.y;
      const m = Math.min(l, rr, t, b);
      if (m === l) p.x = o.x - r;
      else if (m === rr) p.x = o.x + o.w + r;
      else if (m === t) p.y = o.y - r;
      else p.y = o.y + o.h + r;
      continue;
    }
    const d = Math.sqrt(d2);
    dx /= d;
    dy /= d;
    d2 = r - d;
    p.x += dx * d2;
    p.y += dy * d2;
  }
}

export function pointInObstacles(x: number, y: number, r: number, obs: Obstacle[]): boolean {
  for (const o of obs) if (x + r > o.x && x - r < o.x + o.w && y + r > o.y && y - r < o.y + o.h) return true;
  return false;
}
