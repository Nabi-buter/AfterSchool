import { create } from 'zustand';
import type { RunResult, RunSummary } from '../meta/store';

export type Screen = 'title' | 'select' | 'upgrades' | 'codex' | 'records' | 'settings' | 'credits' | 'game' | 'result';

export interface RunSetup {
  char: string;
  stage: string;
  club: string;
  nonce: number;
}

interface UIState {
  screen: Screen;
  codexTab: 'chars' | 'weapons' | 'passives' | 'items' | 'enemies' | 'bosses';
  run: RunSetup | null;
  result: { run: RunResult; summary: RunSummary } | null;
  go: (s: Screen) => void;
  openCodex: (tab: UIState['codexTab']) => void;
  startRun: (r: Omit<RunSetup, 'nonce'>) => void;
  restart: () => void;
  setResult: (r: UIState['result']) => void;
}

export const useUI = create<UIState>((set, get) => ({
  screen: 'title',
  codexTab: 'chars',
  run: null,
  result: null,
  go: (screen) => set({ screen }),
  openCodex: (codexTab) => set({ codexTab, screen: 'codex' }),
  startRun: (r) => set({ run: { ...r, nonce: Date.now() }, screen: 'game' }),
  restart: () => {
    const r = get().run;
    if (r) set({ run: { ...r, nonce: Date.now() }, screen: 'game' });
  },
  setResult: (result) => set({ result, screen: 'result' }),
}));
