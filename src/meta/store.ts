import { create } from 'zustand';
import { ACHIEVEMENTS, META_UPGRADES, MISSION_POOL, metaCost, type AchievementDef } from '../game/data/meta';
import { CHARACTERS, CLUBS } from '../game/data/characters';
import { STAGES } from '../game/data/stages';
import { defaultSave, loadSave, rollDaily, todayKey, writeSave, type SaveData, type Settings } from './save';
import type { Stats } from '../game/types';

export interface RunResult {
  stage: string;
  char: string;
  club: string;
  time: number;
  kills: number;
  level: number;
  cleared: boolean;
  coins: number; // collected in-run (already multiplied)
  weapons: { id: string; level: number }[];
  passives: { id: string; level: number }[];
  evolutions: string[];
  bossKills: number;
  bossesKilled: string[];
  enemyKills: Record<string, number>;
  synergies: string[];
  maxWeapons: number;
  dmgByWeapon: Record<string, number>;
  coinGain: number;
}

export interface RunSummary {
  coinsEarned: number;
  bonusCoins: number;
  newBest: boolean;
  unlocks: string[];
  achievements: AchievementDef[];
  missions: string[];
}

interface MetaState {
  save: SaveData;
  toasts: { id: number; title: string; body: string }[];
  ensureDaily: () => void;
  buyUpgrade: (id: string) => boolean;
  setSettings: (s: Partial<Settings>) => void;
  setLast: (l: Partial<SaveData['last']>) => void;
  claimMission: (i: number) => void;
  applyRun: (r: RunResult) => RunSummary;
  markTutorial: () => void;
  reset: () => void;
  pushToast: (title: string, body: string) => void;
  dropToast: (id: number) => void;
}

let toastId = 1;

function commit(save: SaveData) {
  writeSave(save);
  return save;
}

export function isStageUnlocked(save: SaveData, stageId: string): boolean {
  const st = STAGES.find((s) => s.id === stageId);
  if (!st) return false;
  return !st.unlockAfter || save.clearedStages.includes(st.unlockAfter);
}

export function isClubUnlocked(save: SaveData, clubId: string): boolean {
  const c = CLUBS.find((x) => x.id === clubId);
  if (!c) return false;
  return c.unlock.type === 'default' || !!save.achievements[c.unlock.id];
}

/** Permanent bonus stats from purchased upgrades. */
export function metaBonus(save: SaveData): { stats: Partial<Stats>; reroll: number; revive: number } {
  const stats: Partial<Stats> = {};
  let reroll = 0;
  let revive = 0;
  for (const u of META_UPGRADES) {
    const lv = save.upgrades[u.id] ?? 0;
    if (!lv) continue;
    for (const [k, v] of Object.entries(u.per)) {
      if (k === 'reroll') reroll += (v as number) * lv;
      else if (k === 'revive') revive += (v as number) * lv;
      else stats[k as keyof Stats] = (stats[k as keyof Stats] ?? 0) + (v as number) * lv;
    }
  }
  return { stats, reroll, revive };
}

function checkUnlocks(s: SaveData): string[] {
  const out: string[] = [];
  for (const c of CHARACTERS) {
    if (s.unlockedChars.includes(c.id)) continue;
    const u = c.unlock;
    let ok = false;
    if (u.type === 'stat') ok = ((s.stats as Record<string, number>)[u.stat] ?? 0) >= u.value;
    else if (u.type === 'clear') ok = s.clearedStages.includes(u.stage);
    if (ok) {
      s.unlockedChars.push(c.id);
      out.push(`캐릭터 해금 · ${c.role} ${c.name}`);
    }
  }
  return out;
}

function grantAchievement(s: SaveData, id: string, list: AchievementDef[]) {
  if (s.achievements[id]) return;
  const a = ACHIEVEMENTS.find((x) => x.id === id);
  if (!a) return;
  s.achievements[id] = Date.now();
  s.coins += a.reward;
  list.push(a);
}

function checkGlobalAchievements(s: SaveData, list: AchievementDef[]) {
  if (s.stats.totalKills >= 1000) grantAchievement(s, 'kills1000', list);
  if (s.stats.totalKills >= 10000) grantAchievement(s, 'kills10000', list);
  if (s.codex.evolutions.length >= 1) grantAchievement(s, 'evolve1', list);
  if (s.codex.evolutions.length >= 5) grantAchievement(s, 'evolve5', list);
  if (s.unlockedChars.length >= CHARACTERS.length) grantAchievement(s, 'all_chars', list);
  if (s.stats.dailyDone >= 3) grantAchievement(s, 'daily3', list);
  if (s.coins >= 3000) grantAchievement(s, 'rich', list);
}

export const useMeta = create<MetaState>((set, get) => ({
  save: loadSave(),
  toasts: [],

  ensureDaily: () => {
    const s = structuredClone(get().save);
    const today = todayKey();
    if (s.daily.date !== today) {
      s.daily = { date: today, missions: rollDaily(today, s.unlockedChars) };
      set({ save: commit(s) });
    }
  },

  buyUpgrade: (id) => {
    const s = structuredClone(get().save);
    const def = META_UPGRADES.find((u) => u.id === id);
    if (!def) return false;
    const lv = s.upgrades[id] ?? 0;
    if (lv >= def.maxLevel) return false;
    const cost = metaCost(def, lv);
    if (s.coins < cost) return false;
    s.coins -= cost;
    s.upgrades[id] = lv + 1;
    set({ save: commit(s) });
    return true;
  },

  setSettings: (p) => {
    const s = structuredClone(get().save);
    s.settings = { ...s.settings, ...p };
    set({ save: commit(s) });
  },

  setLast: (p) => {
    const s = structuredClone(get().save);
    s.last = { ...s.last, ...p };
    set({ save: commit(s) });
  },

  markTutorial: () => {
    const s = structuredClone(get().save);
    s.tutorialSeen = true;
    set({ save: commit(s) });
  },

  claimMission: (i) => {
    const s = structuredClone(get().save);
    const m = s.daily.missions[i];
    if (!m || m.claimed) return;
    const t = MISSION_POOL[m.idx];
    if (m.progress < t.target) return;
    m.claimed = true;
    s.coins += t.reward;
    s.stats.dailyDone += 1;
    const list: AchievementDef[] = [];
    checkGlobalAchievements(s, list);
    set({ save: commit(s) });
    for (const a of list) get().pushToast('업적 달성', `${a.name} · +${a.reward} 코인`);
  },

  applyRun: (r) => {
    const s = structuredClone(get().save);
    const achievements: AchievementDef[] = [];
    const stageDef = STAGES.find((x) => x.id === r.stage)!;

    // ── coins ──
    const bonus = Math.round(
      (r.time / 60) * 6 * stageDef.coinMult * r.coinGain + (r.cleared ? 120 * stageDef.coinMult * r.coinGain : 0),
    );
    const coinsEarned = r.coins + bonus;
    s.coins += coinsEarned;
    s.stats.coinsEarned += coinsEarned;

    // ── stats ──
    s.stats.runs += 1;
    s.stats.totalKills += r.kills;
    s.stats.playTime += r.time;
    s.stats.bestTime = Math.max(s.stats.bestTime, r.time);
    s.stats.bestLevel = Math.max(s.stats.bestLevel, r.level);
    s.stats.bossKills += r.bossKills;
    if (r.cleared) s.stats.clears += 1;

    // ── best record ──
    const prev = s.best[r.stage];
    const score = (b: { time: number; kills: number; cleared: boolean }) => (b.cleared ? 1e9 : 0) + b.time * 1000 + b.kills;
    const newBest = !prev || score(r) > score(prev);
    if (newBest) s.best[r.stage] = { time: r.time, kills: r.kills, level: r.level, char: r.char, cleared: r.cleared };

    // ── codex ──
    for (const [id, n] of Object.entries(r.enemyKills)) s.codex.enemies[id] = (s.codex.enemies[id] ?? 0) + n;
    for (const id of r.bossesKilled) s.codex.bosses[id] = (s.codex.bosses[id] ?? 0) + 1;
    for (const w of r.weapons) if (!s.codex.weapons.includes(w.id)) s.codex.weapons.push(w.id);
    for (const p of r.passives) if (!s.codex.passives.includes(p.id)) s.codex.passives.push(p.id);
    for (const e of r.evolutions) {
      if (!s.codex.evolutions.includes(e)) s.codex.evolutions.push(e);
      if (!s.codex.weapons.includes(e)) s.codex.weapons.push(e);
    }

    // ── stage clear ──
    const unlocks: string[] = [];
    if (r.cleared && !s.clearedStages.includes(r.stage)) {
      s.clearedStages.push(r.stage);
      const next = STAGES.find((x) => x.unlockAfter === r.stage);
      if (next) unlocks.push(`스테이지 해금 · STAGE 0${next.index} ${next.name}`);
    }

    // ── achievements ──
    grantAchievement(s, 'first_run', achievements);
    if (r.time >= 300) grantAchievement(s, 'survive5', achievements);
    if (r.time >= 600) grantAchievement(s, 'survive10', achievements);
    if (r.kills >= 800) grantAchievement(s, 'run_kills', achievements);
    if (r.level >= 30) grantAchievement(s, 'level30', achievements);
    if (r.synergies.length > 0) grantAchievement(s, 'synergy1', achievements);
    if (r.maxWeapons >= 6) grantAchievement(s, 'fullbuild', achievements);
    if (r.bossesKilled.length > 0) grantAchievement(s, 'boss1', achievements);
    if (r.cleared) grantAchievement(s, `clear_${r.stage}`, achievements);

    unlocks.push(...checkUnlocks(s));
    checkGlobalAchievements(s, achievements);
    // clubs unlocked by achievements
    for (const c of CLUBS) {
      if (c.unlock.type === 'achievement' && achievements.some((a) => a.id === (c.unlock as { id: string }).id)) {
        unlocks.push(`동아리 해금 · ${c.name}`);
      }
    }

    // ── daily missions ──
    const missions: string[] = [];
    if (s.daily.date === todayKey()) {
      for (const m of s.daily.missions) {
        const t = MISSION_POOL[m.idx];
        if (m.claimed || m.progress >= t.target) continue;
        switch (t.kind) {
          case 'kills': m.progress += r.kills; break;
          case 'survive': m.progress = Math.max(m.progress, Math.floor(r.time)); break;
          case 'level': m.progress = Math.max(m.progress, r.level); break;
          case 'boss': m.progress += r.bossKills; break;
          case 'evolve': m.progress += r.evolutions.length; break;
          case 'coins': m.progress += coinsEarned; break;
          case 'char': if (r.char === m.extra && r.time >= 180) m.progress = 1; break;
        }
        m.progress = Math.min(m.progress, t.target);
        if (m.progress >= t.target) {
          const name = CHARACTERS.find((c) => c.id === m.extra)?.name;
          missions.push(t.text(t.target, name));
        }
      }
    }

    set({ save: commit(s) });
    return { coinsEarned, bonusCoins: bonus, newBest, unlocks, achievements, missions };
  },

  reset: () => {
    localStorage.removeItem('lastbell.save');
    const s = defaultSave();
    s.daily = { date: todayKey(), missions: rollDaily(todayKey(), s.unlockedChars) };
    set({ save: commit(s) });
  },

  pushToast: (title, body) => {
    const id = toastId++;
    set({ toasts: [...get().toasts, { id, title, body }] });
    setTimeout(() => get().dropToast(id), 3800);
  },
  dropToast: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
}));
