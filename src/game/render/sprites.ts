import { BOSS_MAPS, ENEMY_MAPS, ICON_MAPS, PAL, PICKUP_MAPS, characterFrames, type PixelMap } from './pixelmaps';
import type { CharacterDef } from '../types';

export interface Sprite {
  img: HTMLCanvasElement;
  flip: HTMLCanvasElement;
  flash: HTMLCanvasElement;
  w: number;
  h: number;
}

function makeCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = Math.max(1, w);
  c.height = Math.max(1, h);
  return c;
}

function normalize(rows: string[]): string[] {
  const w = Math.max(...rows.map((r) => r.length));
  return rows.map((r) => r.padEnd(w, '.'));
}

function rasterize(rows: string[], pal: Record<string, string>, solid?: string): HTMLCanvasElement {
  const r = normalize(rows);
  const c = makeCanvas(r[0].length, r.length);
  const g = c.getContext('2d')!;
  for (let y = 0; y < r.length; y++) {
    for (let x = 0; x < r[y].length; x++) {
      const ch = r[y][x];
      if (ch === '.' || ch === ' ') continue;
      const col = solid ?? pal[ch] ?? PAL[ch];
      if (!col) continue;
      g.fillStyle = col;
      g.fillRect(x, y, 1, 1);
    }
  }
  return c;
}

function flipped(src: HTMLCanvasElement): HTMLCanvasElement {
  const c = makeCanvas(src.width, src.height);
  const g = c.getContext('2d')!;
  g.translate(src.width, 0);
  g.scale(-1, 1);
  g.drawImage(src, 0, 0);
  return c;
}

function build(map: PixelMap, extra?: Record<string, string>): Sprite {
  const pal = { ...PAL, ...(map.pal ?? {}), ...(extra ?? {}) };
  const img = rasterize(map.rows, pal);
  return { img, flip: flipped(img), flash: rasterize(map.rows, pal, '#FFFFFF'), w: img.width, h: img.height };
}

const cache = new Map<string, Sprite>();

export function enemySprite(id: string): Sprite {
  let s = cache.get('e:' + id);
  if (!s) {
    const m = ENEMY_MAPS[id] ?? BOSS_MAPS[id] ?? ENEMY_MAPS.slime;
    s = build(m);
    cache.set('e:' + id, s);
  }
  return s;
}

export function pickupSprite(id: string): Sprite {
  let s = cache.get('p:' + id);
  if (!s) {
    s = build(PICKUP_MAPS[id]);
    cache.set('p:' + id, s);
  }
  return s;
}

export function characterSprites(def: CharacterDef): Sprite[] {
  const key = 'c:' + def.id;
  const existing = cache.get(key + ':0');
  if (existing) return [0, 1, 2, 3].map((i) => cache.get(key + ':' + i)!);
  const pal: Record<string, string> = {
    h: def.palette.hair,
    s: def.palette.skin,
    t: def.palette.top,
    b: def.palette.bottom,
    a: def.palette.accent,
    d: '#2A2D3A',
  };
  return characterFrames(def.accessory).map((rows, i) => {
    const sp = build({ rows }, pal);
    cache.set(key + ':' + i, sp);
    return sp;
  });
}

// ── Icons as data URLs for the DOM UI ──
const iconUrlCache = new Map<string, string>();

/** Draws a pixel map icon upscaled; evolved icons get a bronze halo outline. */
export function iconUrl(id: string, evolved = false, scale = 4): string {
  const key = `${id}:${evolved}:${scale}`;
  const hit = iconUrlCache.get(key);
  if (hit) return hit;
  const baseId = id.replace(/_evo$/, '');
  const map = ICON_MAPS[baseId] ?? ICON_MAPS.chalk;
  const pal = evolved ? { ...PAL, o: '#2A1E10' } : PAL;
  const src = rasterize(map.rows, pal);
  const pad = 1;
  const c = makeCanvas((src.width + pad * 2) * scale, (src.height + pad * 2) * scale);
  const g = c.getContext('2d')!;
  g.imageSmoothingEnabled = false;
  if (evolved) {
    const halo = rasterize(map.rows, pal, '#E2B94A');
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
      g.drawImage(halo, (pad + dx) * scale, (pad + dy) * scale, src.width * scale, src.height * scale);
    }
  }
  g.drawImage(src, pad * scale, pad * scale, src.width * scale, src.height * scale);
  const url = c.toDataURL();
  iconUrlCache.set(key, url);
  return url;
}

export function spriteUrl(kind: 'enemy' | 'char', id: string, def?: CharacterDef, scale = 4): string {
  const key = `${kind}:${id}:${scale}`;
  const hit = iconUrlCache.get(key);
  if (hit) return hit;
  const sp = kind === 'char' && def ? characterSprites(def)[0] : enemySprite(id);
  const c = makeCanvas(sp.w * scale, sp.h * scale);
  const g = c.getContext('2d')!;
  g.imageSmoothingEnabled = false;
  g.drawImage(sp.img, 0, 0, sp.w * scale, sp.h * scale);
  const url = c.toDataURL();
  iconUrlCache.set(key, url);
  return url;
}

export function silhouetteUrl(kind: 'enemy' | 'char', id: string, def?: CharacterDef, scale = 4): string {
  const key = `sil:${kind}:${id}:${scale}`;
  const hit = iconUrlCache.get(key);
  if (hit) return hit;
  const sp = kind === 'char' && def ? characterSprites(def)[0] : enemySprite(id);
  const c = makeCanvas(sp.w * scale, sp.h * scale);
  const g = c.getContext('2d')!;
  g.imageSmoothingEnabled = false;
  g.drawImage(sp.img, 0, 0, sp.w * scale, sp.h * scale);
  g.globalCompositeOperation = 'source-in';
  g.fillStyle = '#2A3D5C';
  g.fillRect(0, 0, c.width, c.height);
  const url = c.toDataURL();
  iconUrlCache.set(key, url);
  return url;
}
