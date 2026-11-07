// Procedural audio: synthesized SFX and a small step sequencer for original BGM.

type TrackId = 'menu' | 'battle' | 'boss' | 'none';

const NOTE = (n: number) => 440 * Math.pow(2, (n - 69) / 12);

interface Track {
  bpm: number;
  chords: number[][]; // midi notes per bar
  bass: number[]; // root per bar
  pattern: 'menu' | 'battle' | 'boss';
}

const TRACKS: Record<Exclude<TrackId, 'none'>, Track> = {
  menu: {
    bpm: 82,
    chords: [
      [62, 66, 69, 73],
      [59, 62, 66, 69],
      [55, 59, 62, 66],
      [57, 61, 64, 66],
    ],
    bass: [38, 35, 43, 45],
    pattern: 'menu',
  },
  battle: {
    bpm: 128,
    chords: [
      [57, 60, 64],
      [53, 57, 60],
      [48, 52, 55],
      [55, 59, 62],
      [57, 60, 64],
      [53, 57, 60],
      [50, 53, 57],
      [52, 56, 59],
    ],
    bass: [45, 41, 36, 43, 45, 41, 38, 40],
    pattern: 'battle',
  },
  boss: {
    bpm: 144,
    chords: [
      [50, 53, 57],
      [51, 55, 58],
      [50, 53, 57],
      [48, 52, 55],
    ],
    bass: [38, 39, 38, 36],
    pattern: 'boss',
  },
};

class AudioEngine {
  ctx: AudioContext | null = null;
  private master!: GainNode;
  private bgm!: GainNode;
  private sfx!: GainNode;
  private noiseBuf!: AudioBuffer;
  private bgmVol = 0.55;
  private sfxVol = 0.7;
  private current: TrackId = 'none';
  private wanted: TrackId = 'none';
  private step = 0;
  private nextTime = 0;
  private timer: number | null = null;
  private lastPlay = new Map<string, number>();
  private voices = 0;
  private musicBus!: GainNode;

  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    this.ctx = ctx;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16;
    comp.ratio.value = 4;
    comp.attack.value = 0.004;
    comp.release.value = 0.18;
    this.master = ctx.createGain();
    this.master.gain.value = 0.9;
    this.bgm = ctx.createGain();
    this.sfx = ctx.createGain();
    this.musicBus = ctx.createGain();
    this.musicBus.gain.value = 1;
    this.musicBus.connect(this.bgm);
    this.bgm.connect(this.master);
    this.sfx.connect(this.master);
    this.master.connect(comp);
    comp.connect(ctx.destination);
    this.applyVolumes();
    const len = ctx.sampleRate;
    this.noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    if (this.wanted !== 'none') this.playMusic(this.wanted);
  }

  setVolumes(bgm: number, sfx: number) {
    this.bgmVol = bgm;
    this.sfxVol = sfx;
    this.applyVolumes();
  }
  private applyVolumes() {
    if (!this.ctx) return;
    this.bgm.gain.setTargetAtTime(this.bgmVol * 0.5, this.ctx.currentTime, 0.05);
    this.sfx.gain.setTargetAtTime(this.sfxVol * 0.6, this.ctx.currentTime, 0.05);
  }

  suspend(on: boolean) {
    if (!this.ctx) return;
    if (on) void this.ctx.suspend();
    else void this.ctx.resume();
  }

  /** Duck music during pause menus. */
  duck(on: boolean) {
    if (!this.ctx) return;
    this.musicBus.gain.setTargetAtTime(on ? 0.35 : 1, this.ctx.currentTime, 0.12);
  }

  // ───────────── Music ─────────────
  playMusic(id: TrackId) {
    this.wanted = id;
    if (!this.ctx) return;
    if (this.current === id) return;
    this.current = id;
    this.step = 0;
    this.nextTime = this.ctx.currentTime + 0.08;
    if (this.timer !== null) window.clearInterval(this.timer);
    this.timer = null;
    if (id === 'none') return;
    this.timer = window.setInterval(() => this.schedule(), 30);
  }

  private schedule() {
    const ctx = this.ctx;
    if (!ctx || this.current === 'none') return;
    const tr = TRACKS[this.current];
    const stepDur = 60 / tr.bpm / 4; // 16ths
    while (this.nextTime < ctx.currentTime + 0.14) {
      this.playStep(tr, this.step, this.nextTime, stepDur);
      this.step++;
      this.nextTime += stepDur;
    }
  }

  private playStep(tr: Track, step: number, t: number, sd: number) {
    const bar = Math.floor(step / 16) % tr.chords.length;
    const s = step % 16;
    const chord = tr.chords[bar];
    const root = tr.bass[bar];
    if (tr.pattern === 'menu') {
      if (s === 0) for (const n of chord) this.pad(NOTE(n), t, sd * 16, 0.035);
      if (s % 4 === 0) this.ep(NOTE(chord[(s / 4 + bar) % chord.length] + 12), t, 0.05);
      if (s === 0 || s === 10) this.bassNote(NOTE(root), t, sd * 5, 0.11, 'sine');
      if (s % 4 === 2) this.hat(t, 0.012);
      if (s === 8 && bar % 2 === 1) this.ep(NOTE(chord[0] + 24), t, 0.03);
    } else if (tr.pattern === 'battle') {
      if (s === 0) for (const n of chord) this.pad(NOTE(n), t, sd * 16, 0.022);
      if (s % 2 === 0) this.bassNote(NOTE(root + (s === 6 || s === 14 ? 12 : 0)), t, sd * 1.8, 0.1, 'sawtooth');
      if (s === 0 || s === 8 || s === 11) this.kick(t, 0.32);
      if (s === 4 || s === 12) this.snare(t, 0.12);
      if (s % 2 === 1) this.hat(t, 0.02);
      const arp = [0, 1, 2, 1, 2, 0, 1, 2];
      if (step % 64 >= 32) this.lead(NOTE(chord[arp[s % 8]] + 12), t, sd * 0.9, 0.018);
      if (s === 0 && bar % 4 === 3) this.ep(NOTE(chord[2] + 24), t, 0.03);
    } else {
      if (s === 0) for (const n of chord) this.pad(NOTE(n), t, sd * 16, 0.026);
      this.bassNote(NOTE(root + (s % 4 === 3 ? 12 : 0)), t, sd * 0.9, 0.09, 'sawtooth');
      if (s % 4 === 0) this.kick(t, 0.34);
      if (s === 4 || s === 12) this.snare(t, 0.14);
      if (s === 14 || s === 15) this.snare(t, 0.06);
      this.hat(t, s % 2 ? 0.012 : 0.022);
      const arp = [0, 2, 1, 2, 0, 2, 1, 0];
      this.lead(NOTE(chord[arp[s % 8]] + 24), t, sd * 0.8, 0.012);
      if (s === 0 && bar === 0) this.bell(NOTE(chord[0] + 12), t, 0.05);
    }
  }

  private env(g: GainNode, t: number, a: number, peak: number, dec: number) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + dec);
  }

  private osc(type: OscillatorType, f: number, t: number, dur: number, peak: number, dest: AudioNode, a = 0.005, cutoff = 0) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f, t);
    const g = ctx.createGain();
    this.env(g, t, a, peak, dur);
    if (cutoff) {
      const f2 = ctx.createBiquadFilter();
      f2.type = 'lowpass';
      f2.frequency.value = cutoff;
      o.connect(f2);
      f2.connect(g);
    } else o.connect(g);
    g.connect(dest);
    o.start(t);
    o.stop(t + a + dur + 0.05);
    return o;
  }

  private pad(f: number, t: number, dur: number, v: number) {
    for (const det of [-6, 6]) {
      const o = this.osc('sawtooth', f, t, dur, v, this.musicBus, 0.25, 900);
      o.detune.value = det;
    }
  }
  private ep(f: number, t: number, v: number) {
    this.osc('sine', f, t, 0.7, v, this.musicBus, 0.004);
    this.osc('triangle', f * 2, t, 0.25, v * 0.35, this.musicBus, 0.004);
  }
  private bell(f: number, t: number, v: number) {
    this.osc('sine', f, t, 1.6, v, this.musicBus, 0.003);
    this.osc('sine', f * 2.76, t, 0.6, v * 0.4, this.musicBus, 0.003);
  }
  private bassNote(f: number, t: number, dur: number, v: number, type: OscillatorType) {
    this.osc(type, f, t, dur, v, this.musicBus, 0.006, type === 'sine' ? 0 : 520);
  }
  private lead(f: number, t: number, dur: number, v: number) {
    this.osc('square', f, t, dur, v, this.musicBus, 0.004, 2400);
  }
  private kick(t: number, v: number) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.setValueAtTime(140, t);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
    this.env(g, t, 0.002, v, 0.22);
    o.connect(g);
    g.connect(this.musicBus);
    o.start(t);
    o.stop(t + 0.3);
  }
  private noise(t: number, dur: number, v: number, type: BiquadFilterType, freq: number, dest: AudioNode, q = 1) {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    const g = ctx.createGain();
    this.env(g, t, 0.002, v, dur);
    src.connect(f);
    f.connect(g);
    g.connect(dest);
    src.start(t, Math.random() * 0.5);
    src.stop(t + dur + 0.05);
  }
  private snare(t: number, v: number) {
    this.noise(t, 0.14, v, 'bandpass', 1800, this.musicBus, 0.8);
    this.osc('triangle', 190, t, 0.08, v * 0.6, this.musicBus, 0.002);
  }
  private hat(t: number, v: number) {
    this.noise(t, 0.04, v, 'highpass', 7000, this.musicBus);
  }

  // ───────────── SFX ─────────────
  play(name: SfxName, opts: { pitch?: number; vol?: number } = {}) {
    const ctx = this.ctx;
    if (!ctx || ctx.state !== 'running' || this.sfxVol <= 0) return;
    const now = ctx.currentTime;
    const minGap = SFX_GAP[name] ?? 0.03;
    const last = this.lastPlay.get(name) ?? -1;
    if (now - last < minGap) return;
    if (this.voices > 24) return;
    this.lastPlay.set(name, now);
    this.voices++;
    window.setTimeout(() => this.voices--, 250);
    const p = opts.pitch ?? 1;
    const v = opts.vol ?? 1;
    const d = this.sfx;
    const t = now + 0.001;
    switch (name) {
      case 'click':
        this.osc('triangle', 880 * p, t, 0.05, 0.12 * v, d, 0.002);
        break;
      case 'hover':
        this.osc('sine', 1320 * p, t, 0.03, 0.04 * v, d, 0.002);
        break;
      case 'shoot':
        this.osc('square', 620 * p + Math.random() * 60, t, 0.05, 0.03 * v, d, 0.002, 2400);
        break;
      case 'throw':
        this.noise(t, 0.08, 0.06 * v, 'bandpass', 1400 * p, d, 1.2);
        break;
      case 'hit':
        this.noise(t, 0.05, 0.07 * v, 'bandpass', 900 * p + Math.random() * 300, d, 1.5);
        break;
      case 'kill':
        this.osc('triangle', 300 * p, t, 0.08, 0.06 * v, d, 0.002);
        this.noise(t, 0.06, 0.04 * v, 'lowpass', 1200, d);
        break;
      case 'gem': {
        const f = 1046 * p;
        this.osc('sine', f, t, 0.06, 0.05 * v, d, 0.002);
        this.osc('sine', f * 1.5, t + 0.03, 0.06, 0.035 * v, d, 0.002);
        break;
      }
      case 'coin':
        this.osc('square', 1318, t, 0.05, 0.03 * v, d, 0.002, 4000);
        this.osc('square', 1975, t + 0.05, 0.12, 0.03 * v, d, 0.002, 4000);
        break;
      case 'heal':
        [523, 659, 784].forEach((f, i) => this.osc('sine', f, t + i * 0.05, 0.15, 0.06 * v, d, 0.004));
        break;
      case 'hurt':
        this.osc('sawtooth', 160, t, 0.16, 0.12 * v, d, 0.003, 900);
        this.noise(t, 0.1, 0.08 * v, 'lowpass', 800, d);
        break;
      case 'levelup':
        [523, 659, 784, 1046].forEach((f, i) => this.osc('triangle', f, t + i * 0.06, 0.25, 0.09 * v, d, 0.004));
        this.osc('sine', 2093, t + 0.24, 0.5, 0.04 * v, d, 0.004);
        break;
      case 'select':
        this.osc('triangle', 660, t, 0.08, 0.1 * v, d, 0.002);
        this.osc('triangle', 990, t + 0.06, 0.18, 0.09 * v, d, 0.002);
        break;
      case 'evolve':
        [392, 523, 659, 784, 1046, 1318].forEach((f, i) => {
          this.osc('triangle', f, t + i * 0.07, 0.4, 0.08 * v, d, 0.004);
          this.osc('sine', f * 2, t + i * 0.07, 0.3, 0.03 * v, d, 0.004);
        });
        this.noise(t, 0.9, 0.05 * v, 'highpass', 5000, d);
        break;
      case 'boom':
        this.osc('sine', 110 * p, t, 0.35, 0.22 * v, d, 0.002);
        this.noise(t, 0.3, 0.16 * v, 'lowpass', 900 * p, d);
        break;
      case 'wave':
        this.osc('sine', 220 * p, t, 0.25, 0.08 * v, d, 0.01);
        this.osc('sine', 330 * p, t, 0.2, 0.05 * v, d, 0.01);
        break;
      case 'bell':
        this.osc('sine', 784, t, 1.8, 0.12 * v, d, 0.002);
        this.osc('sine', 784 * 2.76, t, 0.9, 0.04 * v, d, 0.002);
        this.osc('sine', 587, t + 0.55, 1.8, 0.1 * v, d, 0.002);
        this.osc('sine', 587 * 2.76, t + 0.55, 0.8, 0.03 * v, d, 0.002);
        break;
      case 'boss':
        this.osc('sawtooth', 55, t, 1.4, 0.16 * v, d, 0.05, 400);
        this.osc('sawtooth', 58, t, 1.4, 0.12 * v, d, 0.05, 400);
        this.osc('sine', 392, t + 0.1, 1.2, 0.08 * v, d, 0.002);
        this.osc('sine', 370, t + 0.6, 1.2, 0.08 * v, d, 0.002);
        break;
      case 'warn':
        this.osc('square', 880, t, 0.06, 0.04 * v, d, 0.002, 3000);
        break;
      case 'chest':
        [659, 784, 988, 1318].forEach((f, i) => this.osc('square', f, t + i * 0.08, 0.12, 0.035 * v, d, 0.002, 3000));
        break;
      case 'clear':
        [523, 659, 784, 1046, 784, 1046, 1318].forEach((f, i) => this.osc('triangle', f, t + i * 0.11, 0.35, 0.1 * v, d, 0.004));
        this.bell(1046, t + 0.8, 0.06);
        break;
      case 'gameover':
        [392, 349, 311, 262].forEach((f, i) => this.osc('triangle', f, t + i * 0.22, 0.5, 0.1 * v, d, 0.004));
        break;
      case 'dash':
        this.noise(t, 0.2, 0.08 * v, 'bandpass', 500, d, 0.7);
        break;
      case 'enemyShot':
        this.osc('sine', 520 * p, t, 0.06, 0.03 * v, d, 0.002);
        break;
    }
  }
}

export type SfxName =
  | 'click' | 'hover' | 'shoot' | 'throw' | 'hit' | 'kill' | 'gem' | 'coin' | 'heal' | 'hurt' | 'levelup' | 'select'
  | 'evolve' | 'boom' | 'wave' | 'bell' | 'boss' | 'warn' | 'chest' | 'clear' | 'gameover' | 'dash' | 'enemyShot';

const SFX_GAP: Partial<Record<SfxName, number>> = {
  hit: 0.045, kill: 0.04, gem: 0.035, shoot: 0.06, throw: 0.07, boom: 0.08, wave: 0.12, hover: 0.05, enemyShot: 0.08, coin: 0.05,
};

export const audio = new AudioEngine();
