import { useEffect, useRef } from 'react';

// A pixel-art school corridor at sunset, rendered live at 320x180 and upscaled.
const W = 320;
const H = 180;

function drawStatic(g: CanvasRenderingContext2D) {
  const r = (x: number, y: number, w: number, h: number, c: string) => {
    g.fillStyle = c;
    g.fillRect(x, y, w, h);
  };
  // ceiling & wall
  r(0, 0, W, 10, '#0E1422');
  r(0, 10, W, 90, '#1C2840');
  r(0, 96, W, 22, '#162036');
  r(0, 95, W, 1, '#2A3A58');
  r(0, 117, W, 1, '#0E1422');
  // ceiling lights
  for (let x = 30; x < W; x += 90) {
    r(x, 10, 40, 3, '#3A4A66');
    r(x + 2, 13, 36, 1, '#5A6A86');
  }
  // windows
  const wins = [16, 120, 224];
  for (const wx of wins) {
    r(wx - 2, 20, 84, 66, '#0E1422');
    // sky bands (flat, posterized)
    const bands = ['#3B3654', '#5A4060', '#8A4F5A', '#B8644F', '#D9844F', '#E8A060'];
    for (let i = 0; i < bands.length; i++) r(wx, 22 + i * 9, 80, 9, bands[i]);
    r(wx, 76, 80, 8, '#E8A060');
    // sun
    if (wx === 120) {
      r(wx + 46, 58, 14, 14, '#F2C27A');
      r(wx + 44, 60, 18, 10, '#F2C27A');
      r(wx + 48, 56, 10, 18, '#F2C27A');
    }
    // distant city
    const city = [6, 10, 4, 14, 8, 12, 5, 9, 16, 7, 11, 6, 13, 8];
    let cx = wx;
    for (let i = 0; i < city.length && cx < wx + 80; i++) {
      const bw = 4 + (i % 3) * 2;
      r(cx, 84 - city[i], Math.min(bw, wx + 80 - cx), city[i], '#2B2238');
      if (i % 3 === 0) r(cx + 1, 84 - city[i] + 3, 1, 1, '#E8A060');
      cx += bw;
    }
    // mullions
    r(wx + 39, 22, 2, 62, '#0E1422');
    r(wx, 52, 80, 2, '#0E1422');
    // sill
    r(wx - 4, 86, 88, 3, '#2A3A58');
    // radiator
    r(wx + 12, 100, 56, 12, '#25324C');
    for (let i = 0; i < 9; i++) r(wx + 14 + i * 6, 101, 2, 10, '#33425E');
  }
  // notice board between windows
  r(100, 30, 18, 0, '#000');
  // floor
  r(0, 118, W, 62, '#2B3346');
  for (let y = 118; y < H; y += 8) r(0, y, W, 1, '#252C3E');
  for (let x = 0; x < W; x += 24) r(x + ((Math.floor(x / 24) % 2) * 12), 118, 1, 62, '#262D40');
  // window reflections on floor (static base)
  for (const wx of wins) {
    g.fillStyle = 'rgba(232,160,96,0.10)';
    g.beginPath();
    g.moveTo(wx + 10, 118);
    g.lineTo(wx + 80, 118);
    g.lineTo(wx + 140, 180);
    g.lineTo(wx + 40, 180);
    g.closePath();
    g.fill();
  }
  // lockers at far right edge partially visible
  for (let i = 0; i < 2; i++) {
    r(306 + i * 8, 52, 7, 66, '#3F4A5E');
    r(307 + i * 8, 54, 5, 62, '#56627A');
    r(311 + i * 8, 84, 1, 3, '#9CA3AF');
  }
  r(0, 52, 8, 66, '#3F4A5E');
  r(1, 54, 5, 62, '#56627A');
}

export function TitleBackdrop() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext('2d')!;
    const base = document.createElement('canvas');
    base.width = W;
    base.height = H;
    drawStatic(base.getContext('2d')!);
    const frame = document.createElement('canvas');
    frame.width = W;
    frame.height = H;
    const f = frame.getContext('2d')!;
    const dust = Array.from({ length: 46 }, () => ({ x: Math.random() * W, y: 20 + Math.random() * 150, s: 0.5 + Math.random() * 1.5, p: Math.random() * 6 }));
    let raf = 0;
    let last = 0;
    let t = 0;
    let flicker = 0;
    const paper = { x: -20, y: 150 };
    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(canvas.clientWidth * dpr);
      canvas.height = Math.round(canvas.clientHeight * dpr);
    };
    resize();
    window.addEventListener('resize', resize);
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      if (now - last < 33) return;
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      t += dt;
      f.drawImage(base, 0, 0);
      // breathing light shafts
      const a = 0.05 + Math.sin(t * 0.5) * 0.02;
      for (const wx of [16, 120, 224]) {
        f.fillStyle = `rgba(242,180,110,${a})`;
        f.beginPath();
        f.moveTo(wx + 4, 84);
        f.lineTo(wx + 80, 84);
        f.lineTo(wx + 150, 180);
        f.lineTo(wx + 30, 180);
        f.closePath();
        f.fill();
      }
      // clock (between windows 1 and 2) — always just past five
      const cx = 110;
      const cy = 40;
      f.fillStyle = '#0E1422';
      f.fillRect(cx - 7, cy - 7, 14, 14);
      f.fillStyle = '#E9E3D3';
      f.fillRect(cx - 6, cy - 6, 12, 12);
      f.fillStyle = '#0E1422';
      for (let i = 0; i < 12; i += 3) {
        const aa = (i / 12) * Math.PI * 2;
        f.fillRect(Math.round(cx + Math.sin(aa) * 5), Math.round(cy - Math.cos(aa) * 5), 1, 1);
      }
      const now2 = new Date();
      const sec = now2.getSeconds();
      const minA = ((now2.getMinutes() % 60) / 60) * Math.PI * 2;
      const hrA = ((5 + now2.getMinutes() / 60) / 12) * Math.PI * 2;
      const hand = (ang: number, len: number, col: string) => {
        f.strokeStyle = col;
        f.lineWidth = 1;
        f.beginPath();
        f.moveTo(cx + 0.5, cy + 0.5);
        f.lineTo(cx + 0.5 + Math.sin(ang) * len, cy + 0.5 - Math.cos(ang) * len);
        f.stroke();
      };
      hand(hrA, 3, '#0E1422');
      hand(minA, 4.5, '#0E1422');
      hand((sec / 60) * Math.PI * 2, 5, '#C9563C');
      // dust motes
      for (const d of dust) {
        d.y -= d.s * dt * 3;
        d.x += Math.sin(t * 0.6 + d.p) * dt * 2;
        if (d.y < 14) {
          d.y = 175;
          d.x = Math.random() * W;
        }
        const inLight = d.y > 80;
        f.fillStyle = inLight ? 'rgba(242,200,150,0.7)' : 'rgba(241,235,221,0.25)';
        f.fillRect(Math.round(d.x), Math.round(d.y), 1, 1);
      }
      // a single exam sheet drifting across the floor
      paper.x += dt * 9;
      if (paper.x > W + 30) paper.x = -30;
      const py = paper.y + Math.sin(t * 1.4) * 2;
      f.fillStyle = 'rgba(0,0,0,0.25)';
      f.fillRect(Math.round(paper.x) + 2, 166, 10, 2);
      f.fillStyle = '#EDE6D3';
      f.fillRect(Math.round(paper.x), Math.round(py), 10, 7);
      f.fillStyle = '#C9563C';
      f.fillRect(Math.round(paper.x) + 2, Math.round(py) + 2, 4, 1);
      f.fillStyle = '#9CA3AF';
      f.fillRect(Math.round(paper.x) + 2, Math.round(py) + 4, 6, 1);
      // rare fluorescent flicker
      if (flicker <= 0 && Math.random() < 0.004) flicker = 0.25;
      if (flicker > 0) {
        flicker -= dt;
        if (Math.random() < 0.5) {
          f.fillStyle = 'rgba(8,10,18,0.25)';
          f.fillRect(0, 0, W, H);
        }
      }
      // draw to screen, covering
      ctx.imageSmoothingEnabled = false;
      const s = Math.max(canvas.width / W, canvas.height / H);
      const dw = W * s;
      const dh = H * s;
      ctx.fillStyle = '#111827';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(frame, Math.round((canvas.width - dw) / 2), Math.round((canvas.height - dh) * 0.6), Math.round(dw), Math.round(dh));
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, []);
  return <canvas ref={ref} className="absolute inset-0 w-full h-full pixel" aria-hidden />;
}
