import type { Obstacle, StageDef } from '../types';
import { PAL } from './pixelmaps';

/** Floor tile pattern (art-pixel resolution) per stage. */
export function floorTile(stage: StageDef): HTMLCanvasElement {
  const c = document.createElement('canvas');
  const pal = stage.palette;
  let size = 32;
  const g = c.getContext('2d')!;
  const px = (x: number, y: number, w: number, h: number, col: string) => {
    g.fillStyle = col;
    g.fillRect(x, y, w, h);
  };
  switch (stage.id) {
    case 'classroom': {
      // wooden planks
      size = 32;
      c.width = c.height = size;
      px(0, 0, 32, 32, pal.floor);
      for (let r = 0; r < 4; r++) {
        px(0, r * 8 + 7, 32, 1, pal.line);
        const off = (r % 2) * 16 + 6;
        px(off, r * 8, 1, 7, pal.line);
        px(0, r * 8 + 2, 32, 1, pal.floor2);
        px((off + 9) % 32, r * 8 + 4, 3, 1, pal.floor2);
      }
      break;
    }
    case 'hallway': {
      // linoleum tiles, alternating
      size = 32;
      c.width = c.height = size;
      px(0, 0, 32, 32, pal.floor);
      px(0, 0, 16, 16, pal.floor2);
      px(16, 16, 16, 16, pal.floor2);
      px(0, 15, 32, 1, pal.line);
      px(15, 0, 1, 32, pal.line);
      px(0, 31, 32, 1, pal.line);
      px(31, 0, 1, 32, pal.line);
      px(5, 6, 1, 1, '#64645E');
      px(22, 25, 1, 1, '#64645E');
      break;
    }
    case 'gym': {
      size = 32;
      c.width = c.height = size;
      px(0, 0, 32, 32, pal.floor);
      for (let i = 0; i < 4; i++) {
        px(i * 8, 0, 1, 32, '#6A4C30');
        px(i * 8 + 3, (i * 11) % 32, 1, 9, pal.floor2);
      }
      px(0, 13, 32, 1, '#86643F');
      break;
    }
    case 'lab': {
      size = 24;
      c.width = c.height = size;
      px(0, 0, 24, 24, pal.floor);
      px(0, 11, 24, 1, pal.line);
      px(11, 0, 1, 24, pal.line);
      px(0, 23, 24, 1, pal.line);
      px(23, 0, 1, 24, pal.line);
      px(3, 3, 6, 6, pal.floor2);
      px(14, 14, 6, 6, pal.floor2);
      break;
    }
    case 'rooftop': {
      size = 32;
      c.width = c.height = size;
      px(0, 0, 32, 32, pal.floor);
      for (let i = 0; i < 18; i++) {
        const x = (i * 13 + 7) % 32;
        const y = (i * 19 + 3) % 32;
        px(x, y, 1, 1, i % 2 ? pal.floor2 : '#524E58');
      }
      px(0, 31, 32, 1, pal.line);
      px(31, 0, 1, 32, pal.line);
      break;
    }
  }
  return c;
}

/** Draw a decoration / obstacle in world units (1 art px = 3 world units). */
export function drawProp(g: CanvasRenderingContext2D, o: Obstacle, time: number) {
  const { x, y, w, h } = o;
  const P = 3;
  const rect = (rx: number, ry: number, rw: number, rh: number, col: string) => {
    g.fillStyle = col;
    g.fillRect(Math.round(rx), Math.round(ry), Math.round(rw), Math.round(rh));
  };
  const outline = (col = PAL.o) => {
    rect(x - P, y - P, w + P * 2, h + P * 2, col);
  };
  switch (o.kind) {
    case 'desks': {
      // shadow
      rect(x + 4, y + h - 4, w, 10, 'rgba(0,0,0,0.22)');
      outline();
      const half = w / 2;
      for (let i = 0; i < 2; i++) {
        const dx = x + i * half;
        rect(dx, y, half - P, h, '#B88A5A');
        rect(dx, y, half - P, P * 2, '#D2A673');
        rect(dx, y + h / 2 - 1, half - P, P, '#8B6340');
        // books / pencil cases
        rect(dx + 8, y + 10, 18, 12, i ? '#5B7FB0' : '#C9563C');
        rect(dx + 30, y + 14, 14, 4, '#E2B94A');
      }
      rect(x + half - P, y, P, h, PAL.o);
      // chairs
      rect(x + 10, y + h + 6, 32, 10, '#6C7486');
      rect(x + half + 10, y + h + 6, 32, 10, '#6C7486');
      break;
    }
    case 'podium':
      rect(x + 4, y + h - 2, w, 10, 'rgba(0,0,0,0.25)');
      outline();
      rect(x, y, w, h, '#7A5638');
      rect(x, y, w, P * 2, '#9A7048');
      rect(x + 12, y + 14, 34, 22, '#EDE6D3');
      rect(x + 16, y + 18, 26, 2, '#9CA3AF');
      rect(x + 16, y + 24, 20, 2, '#9CA3AF');
      rect(x + w - 30, y + 12, 6, 26, '#E2B94A');
      break;
    case 'blackboard':
      rect(x - P * 2, y - P, w + P * 4, h + P * 3, '#5E3D26');
      rect(x, y, w, h, '#2F4A3E');
      rect(x + 40, y + 12, 120, P, 'rgba(241,235,221,0.5)');
      rect(x + 40, y + 22, 80, P, 'rgba(241,235,221,0.4)');
      rect(x + w - 200, y + 14, 140, P, 'rgba(241,235,221,0.35)');
      rect(x + w / 2 - 30, y + 10, 60, P, 'rgba(230,154,90,0.5)');
      rect(x + 10, y + h, w - 20, P, '#8B5E3C');
      break;
    case 'locker': {
      rect(x, y, w, h, '#3F4A5E');
      rect(x + P, y + P, w - P * 2, h - P * 2, '#56627A');
      rect(x + w / 2 - 1, y + P, P, h - P * 2, '#3F4A5E');
      for (let i = 0; i < 3; i++) rect(x + 6, y + 8 + i * 5, w / 2 - 12, 2, '#3F4A5E');
      rect(x + w - 10, y + h / 2, 4, 6, '#9CA3AF');
      break;
    }
    case 'window':
    case 'hallwindow': {
      rect(x, y, w, h, '#2A3446');
      rect(x + P, y + P, w - P * 2, h - P * 2, '#3B4E6E');
      const glow = 0.12 + Math.sin(time * 0.4) * 0.03;
      rect(x + P, y + P, w - P * 2, h - P * 2, `rgba(230,154,90,${glow})`);
      if (o.kind === 'hallwindow') for (let i = 1; i < 4; i++) rect(x + (w / 4) * i, y, P, h, '#2A3446');
      else rect(x, y + h / 2, w, P, '#2A3446');
      break;
    }
    case 'board':
      rect(x, y, w, h, '#5E3D26');
      rect(x + P, y + P, w - P * 2, h - P * 2, '#8B6340');
      rect(x + 5, y + 14, w - 10, 20, '#EDE6D3');
      rect(x + 5, y + 50, w - 10, 26, '#E2B94A');
      rect(x + 5, y + 90, w - 10, 18, '#68B6AA');
      break;
    case 'door':
      rect(x, y, w, h, '#2B2622');
      rect(x + P, y + P, w - P * 2, h, '#7A5638');
      rect(x + P * 2, y + P * 3, w / 2 - P * 3, h / 2, '#3B4E6E');
      rect(x + w - 16, y + h / 2, 6, 6, '#C79A4A');
      rect(x + w / 2 - 20, y - 14, 40, 10, '#F1EBDD');
      break;
    case 'pillar':
      rect(x + 6, y + h - 4, w, 12, 'rgba(0,0,0,0.25)');
      outline();
      rect(x, y, w, h, '#8A8A84');
      rect(x, y, w, P * 2, '#A3A39C');
      rect(x + w - P * 2, y, P * 2, h, '#6E6E68');
      break;
    case 'bench':
      rect(x + 4, y + h - 2, w, 8, 'rgba(0,0,0,0.25)');
      outline();
      rect(x, y, w, h, '#4E6A8A');
      rect(x, y, w, P * 2, '#6E8AAA');
      break;
    case 'courtline':
      rect(x, y, w, h, 'rgba(232,220,192,0.75)');
      break;
    case 'centercircle':
    case 'courtrect':
    case 'keyL':
    case 'keyR': {
      g.strokeStyle = 'rgba(232,220,192,0.7)';
      g.lineWidth = 4;
      if (o.kind === 'centercircle') {
        g.beginPath();
        g.arc(x + w / 2, y + h / 2, w / 2, 0, Math.PI * 2);
        g.stroke();
      } else {
        g.strokeRect(x, y, w, h);
        if (o.kind !== 'courtrect') {
          g.fillStyle = 'rgba(201,86,60,0.18)';
          g.fillRect(x + (o.kind === 'keyL' ? 0 : w * 0.45), y + h * 0.3, w * 0.55, h * 0.4);
        }
      }
      break;
    }
    case 'hoop':
      rect(x + 6, y + h, w, 10, 'rgba(0,0,0,0.25)');
      outline();
      rect(x, y, w, h, '#2E3440');
      rect(x + 6, y + 6, w - 12, h - 12, '#F1EBDD');
      rect(x + 18, y + 22, w - 36, h - 44, '#C9563C');
      break;
    case 'mats':
      rect(x + 6, y + h - 2, w, 10, 'rgba(0,0,0,0.25)');
      outline();
      rect(x, y, w, h, '#3E6E8A');
      rect(x, y, w, P * 2, '#5A8EAA');
      rect(x + w / 2 - 2, y, 4, h, '#2E5670');
      break;
    case 'ballcart':
      rect(x + 4, y + h - 2, w, 8, 'rgba(0,0,0,0.25)');
      outline();
      rect(x, y, w, h, '#9CA3AF');
      for (let i = 0; i < 4; i++) {
        g.fillStyle = i % 2 ? '#E69A5A' : '#A8653A';
        g.beginPath();
        g.arc(x + 18 + (i % 2) * 34, y + 18 + Math.floor(i / 2) * 34, 14, 0, Math.PI * 2);
        g.fill();
      }
      break;
    case 'labbench': {
      rect(x + 6, y + h - 2, w, 12, 'rgba(0,0,0,0.3)');
      outline();
      rect(x, y, w, h, '#22303A');
      rect(x, y, w, P * 2, '#33454F');
      rect(x + 20, y + 16, 34, 22, '#5C6C74');
      rect(x + 26, y + 20, 22, 14, '#2A3A42');
      // flasks
      const fl = [
        [w - 70, '#A7C66B'],
        [w - 46, '#68B6AA'],
        [w - 100, '#D9788A'],
      ] as const;
      for (const [fx, col] of fl) {
        rect(x + fx, y + 14, 12, 26, 'rgba(216,220,228,0.6)');
        rect(x + fx, y + 28, 12, 12, col);
        rect(x + fx + 3, y + 8, 6, 6, 'rgba(216,220,228,0.6)');
      }
      rect(x + w / 2 - 6, y + 20, 12, 16, '#9CA3AF');
      break;
    }
    case 'shelf':
      rect(x, y, w, h, '#2B3640');
      rect(x + P, y + P, w - P * 2, h - P * 2, '#3B4852');
      for (let i = 0; i < 3; i++) rect(x + 8 + i * 22, y + 10, 10, 18, ['#A7C66B', '#68B6AA', '#E69A5A'][i]);
      break;
    case 'eyewash':
      rect(x, y, w, h, '#2B3640');
      rect(x + 8, y + 10, w - 16, 24, '#68B6AA');
      rect(x + 8, y + 60, w - 16, 10, '#E2B94A');
      break;
    case 'tank':
      rect(x + 10, y + h - 4, w, 16, 'rgba(0,0,0,0.3)');
      g.fillStyle = PAL.o;
      g.beginPath();
      g.arc(x + w / 2, y + h / 2, w / 2 + 3, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#7C8796';
      g.beginPath();
      g.arc(x + w / 2, y + h / 2, w / 2, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#95A0AE';
      g.beginPath();
      g.arc(x + w / 2 - 14, y + h / 2 - 14, w / 2 - 30, 0, Math.PI * 2);
      g.fill();
      rect(x + w / 2 - 10, y + h / 2 - 10, 20, 20, '#5E6876');
      break;
    case 'ac':
      rect(x + 6, y + h - 2, w, 10, 'rgba(0,0,0,0.3)');
      outline();
      rect(x, y, w, h, '#A3A9B2');
      g.fillStyle = '#5E6876';
      g.beginPath();
      g.arc(x + w * 0.35, y + h / 2, h * 0.32, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = '#A3A9B2';
      g.lineWidth = 3;
      g.beginPath();
      const a = time * 6;
      g.moveTo(x + w * 0.35 + Math.cos(a) * h * 0.28, y + h / 2 + Math.sin(a) * h * 0.28);
      g.lineTo(x + w * 0.35 - Math.cos(a) * h * 0.28, y + h / 2 - Math.sin(a) * h * 0.28);
      g.stroke();
      for (let i = 0; i < 4; i++) rect(x + w * 0.65, y + 14 + i * 12, w * 0.25, 4, '#7C8796');
      break;
    case 'stairhouse':
      rect(x + 8, y + h - 2, w, 14, 'rgba(0,0,0,0.3)');
      outline();
      rect(x, y, w, h, '#5A5662');
      rect(x, y, w, P * 3, '#6E6A76');
      rect(x + w / 2 - 18, y + h - 50, 36, 50, '#2B2733');
      rect(x + w / 2 - 14, y + h - 46, 28, 6, 'rgba(230,154,90,0.4)');
      break;
    case 'railH':
      rect(x, y + 6, w, 6, '#8E96A3');
      rect(x + w - 6, y, 6, h, '#6E7683');
      break;
    case 'railV':
      rect(x + 6, y, 6, h, '#8E96A3');
      rect(x, y + h - 6, w, 6, '#6E7683');
      break;
    case 'bellmark':
      g.strokeStyle = 'rgba(230,154,90,0.25)';
      g.lineWidth = 4;
      g.beginPath();
      g.arc(x + w / 2, y + h / 2, w / 2, 0, Math.PI * 2);
      g.stroke();
      g.beginPath();
      g.arc(x + w / 2, y + h / 2, w / 2 + 40, 0, Math.PI * 2);
      g.stroke();
      break;
  }
}
