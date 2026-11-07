import { useEffect } from 'react';
import { useUI } from './ui/uiStore';
import { useMeta } from './meta/store';
import { audio } from './game/audio/audio';
import { TitleScreen } from './ui/screens/TitleScreen';
import { SelectScreen } from './ui/screens/SelectScreen';
import { GameScreen } from './ui/screens/GameScreen';
import { ResultScreen } from './ui/screens/ResultScreen';
import { CodexScreen, CreditsScreen, RecordsScreen, SettingsScreen, UpgradesScreen } from './ui/screens/MetaScreens';
import { Toasts } from './ui/components/common';

export default function App() {
  const screen = useUI((s) => s.screen);
  const settings = useMeta((s) => s.save.settings);
  const ensureDaily = useMeta((s) => s.ensureDaily);

  useEffect(() => {
    ensureDaily();
    // refresh daily missions when the date rolls over while the tab stays open
    const id = window.setInterval(ensureDaily, 60_000);
    return () => window.clearInterval(id);
  }, [ensureDaily]);

  useEffect(() => {
    audio.setVolumes(settings.bgm, settings.sfx);
  }, [settings.bgm, settings.sfx]);

  useEffect(() => {
    // browsers block autoplay: unlock audio on the first interaction anywhere
    const unlock = () => audio.unlock();
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    const onVis = () => audio.suspend(document.hidden);
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);

  useEffect(() => {
    if (screen !== 'game') audio.playMusic('menu');
  }, [screen]);

  return (
    <div className="fixed inset-0">
      {screen === 'title' && <TitleScreen />}
      {screen === 'select' && <SelectScreen />}
      {screen === 'game' && <GameScreen />}
      {screen === 'result' && <ResultScreen />}
      {screen === 'upgrades' && <UpgradesScreen />}
      {screen === 'codex' && <CodexScreen />}
      {screen === 'records' && <RecordsScreen />}
      {screen === 'settings' && <SettingsScreen />}
      {screen === 'credits' && <CreditsScreen />}
      <Toasts />
    </div>
  );
}
