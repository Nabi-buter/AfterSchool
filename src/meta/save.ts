// Versioned save system backed by localStorage.
import { CHARACTERS } from '../game/data/characters';
import { MISSION_POOL } from '../game/data/meta';

export const SAVE_KEY = 'lastbell.save';
export const SAVE_VERSION = 2;

export interface Settings {
  bgm: number;
  sfx: number;
  shake: boolean;
  damageNumbers: boolean;
  showFps: boolean;
  reducedFlash: boolean;
}

export interface BestRecord {
  time: number;
  kills: number;
  level: number;
  char: string;
  cleared: boolean;
}

export interface DailyMission {
  idx: number; // index into MISSION_POOL
  extra?: string; // char id for 'char' missions
  progress: number;
  claimed: boolean;
}

export interface SaveData {
  version: number;
  coins: number;
  upgrades: Record<string, number>;
  unlockedChars: string[];
  clearedStages: string[];
  achievements: Record<string, number>;
  stats: {
    totalKills: number;
    runs: number;
    playTime: number;
    bestTime: number;
    bestLevel: number;
    bossKills: number;
    coinsEarned: number;
    clears: number;
    dailyDone: number;
  };
  best: Record<string, BestRecord>;
  codex: {
    enemies: Record<string, number>;
    bosses: Record<string, number>;
    weapons: string[];
    passives: string[];
    evolutions: string[];
  };
  settings: Settings;
  daily: { date: string; missions: DailyMission[] };
  last: { char: string; stage: string; club: string };
  tutorialSeen: boolean;
}

export function defaultSave(): SaveData {
  return {
    version: SAVE_VERSION,
    coins: 0,
    upgrades: {},
    unlockedChars: CHARACTERS.filter((c) => c.unlock.type === 'default').map((c) => c.id),
    clearedStages: [],
    achievements: {},
    stats: { totalKills: 0, runs: 0, playTime: 0, bestTime: 0, bestLevel: 0, bossKills: 0, coinsEarned: 0, clears: 0, dailyDone: 0 },
    best: {},
    codex: { enemies: {}, bosses: {}, weapons: [], passives: [], evolutions: [] },
    settings: { bgm: 0.55, sfx: 0.7, shake: true, damageNumbers: true, showFps: false, reducedFlash: false },
    daily: { date: '', missions: [] },
    last: { char: 'seoyun', stage: 'classroom', club: 'none' },
    tutorialSeen: false,
  };
}

/** Upgrade older save structures to the current version without losing progress. */
function migrate(raw: Record<string, unknown>): SaveData {
  const base = defaultSave();
  const v = typeof raw.version === 'number' ? raw.version : 1;
  const merged = deepMerge(base, raw) as SaveData;
  if (v < 2) {
    // v1 stored settings.volume as a single value
    const old = (raw.settings ?? {}) as { volume?: number };
    if (typeof old.volume === 'number') {
      merged.settings.bgm = old.volume;
      merged.settings.sfx = old.volume;
    }
  }
  merged.version = SAVE_VERSION;
  return merged;
}

function deepMerge(target: unknown, src: unknown): unknown {
  if (Array.isArray(target)) return Array.isArray(src) ? src : target;
  if (target && typeof target === 'object') {
    const out: Record<string, unknown> = { ...(target as Record<string, unknown>) };
    if (src && typeof src === 'object' && !Array.isArray(src)) {
      for (const [k, v] of Object.entries(src as Record<string, unknown>)) {
        const t = (target as Record<string, unknown>)[k];
        out[k] = t !== undefined && t !== null && typeof t === 'object' && !Array.isArray(t) ? deepMerge(t, v) : v ?? t;
      }
    }
    return out;
  }
  return src ?? target;
}

export function loadSave(): SaveData {
  try {
    const txt = localStorage.getItem(SAVE_KEY);
    if (!txt) return defaultSave();
    const parsed = JSON.parse(txt);
    if (!parsed || typeof parsed !== 'object') return defaultSave();
    return migrate(parsed);
  } catch {
    return defaultSave();
  }
}

export function writeSave(data: SaveData): void {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch {
    /* storage unavailable (private mode / quota) – keep running in memory */
  }
}

export function todayKey(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Deterministic 3 missions per calendar day. */
export function rollDaily(date: string, unlockedChars: string[]): DailyMission[] {
  let seed = hashStr('lastbell-' + date);
  const rnd = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const picked: DailyMission[] = [];
  const usedKinds = new Set<string>();
  let guard = 0;
  while (picked.length < 3 && guard++ < 100) {
    const idx = Math.floor(rnd() * MISSION_POOL.length);
    const t = MISSION_POOL[idx];
    if (usedKinds.has(t.kind)) continue;
    usedKinds.add(t.kind);
    const m: DailyMission = { idx, progress: 0, claimed: false };
    if (t.kind === 'char') m.extra = unlockedChars[Math.floor(rnd() * unlockedChars.length)] ?? 'seoyun';
    picked.push(m);
  }
  return picked;
}
