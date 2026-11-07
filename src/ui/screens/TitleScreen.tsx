import { useEffect, useState } from 'react';
import { TitleBackdrop } from '../components/TitleBackdrop';
import { Coin } from '../components/common';
import { useUI } from '../uiStore';
import { useMeta } from '../../meta/store';
import { MISSION_POOL } from '../../game/data/meta';
import { audio } from '../../game/audio/audio';

const MENU: { id: string; label: string; en: string }[] = [
  { id: 'select', label: '게임 시작', en: 'START' },
  { id: 'chars', label: '캐릭터', en: 'STUDENTS' },
  { id: 'upgrades', label: '영구 성장', en: 'UPGRADES' },
  { id: 'codex', label: '도감', en: 'CODEX' },
  { id: 'records', label: '업적 · 미션', en: 'RECORDS' },
  { id: 'settings', label: '설정', en: 'SETTINGS' },
  { id: 'credits', label: '제작 정보', en: 'CREDITS' },
];

export function TitleScreen() {
  const go = useUI((s) => s.go);
  const openCodex = useUI((s) => s.openCodex);
  const save = useMeta((s) => s.save);
  const [focus, setFocus] = useState(0);

  const activate = (id: string) => {
    audio.unlock();
    audio.play('select');
    if (id === 'chars') openCodex('chars');
    else go(id as Parameters<typeof go>[0]);
  };

  useEffect(() => {
    audio.playMusic('menu');
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'ArrowDown' || e.code === 'KeyS') {
        setFocus((f) => (f + 1) % MENU.length);
        audio.play('hover');
      } else if (e.code === 'ArrowUp' || e.code === 'KeyW') {
        setFocus((f) => (f - 1 + MENU.length) % MENU.length);
        audio.play('hover');
      } else if (e.code === 'Enter' || e.code === 'Space') {
        e.preventDefault();
        setFocus((f) => {
          activate(MENU[f].id);
          return f;
        });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const missionsReady = save.daily.missions.filter((m) => !m.claimed && m.progress >= MISSION_POOL[m.idx].target).length;
  const best = Math.max(0, ...Object.values(save.best).map((b) => b.time));

  return (
    <div className="absolute inset-0 overflow-hidden" onPointerDown={() => audio.unlock()}>
      <TitleBackdrop />
      {/* legibility scrim on the left only */}
      <div className="absolute inset-y-0 left-0 w-full md:w-[56%]" style={{ background: 'linear-gradient(90deg, rgba(17,24,39,0.92) 0%, rgba(17,24,39,0.78) 60%, rgba(17,24,39,0) 100%)' }} />

      <div className="relative h-full flex flex-col justify-between px-6 md:px-14 screen-enter" style={{ paddingTop: 'max(28px, var(--safe-top))', paddingBottom: 'max(24px, var(--safe-bottom))' }}>
        <div className="flex items-start justify-between gap-4">
          <div className="label">Eclipse High School · 17:00</div>
          <div className="flex items-center gap-4 text-sm">
            <Coin value={save.coins} className="font-semibold" />
          </div>
        </div>

        <div className="max-w-[560px]">
          <div className="label mb-3" style={{ color: 'var(--accent)' }}>
            A school-night survival
          </div>
          <h1 className="font-display font-bold leading-[0.88] tracking-[-0.03em] text-[52px] sm:text-[76px] md:text-[96px]">
            AFTER
            <br />
            SCHOOL
          </h1>
          <div className="mt-3 flex items-center gap-3">
            <span className="block h-[2px] w-10" style={{ background: 'var(--accent)' }} />
            <span className="font-display font-bold tracking-[0.32em] text-lg md:text-2xl" style={{ color: 'var(--accent)' }}>
              LAST BELL
            </span>
          </div>
          <p className="mt-5 text-[15px] md:text-base text-ivory/80 leading-relaxed">
            마지막 종이 울린 뒤,
            <br className="sm:hidden" /> 진짜 수업이 시작된다.
          </p>

          <nav className="mt-8 md:mt-10 flex flex-col" aria-label="메인 메뉴">
            {MENU.map((m, i) => {
              const active = i === focus;
              return (
                <button
                  key={m.id}
                  onMouseEnter={() => {
                    setFocus(i);
                    audio.play('hover');
                  }}
                  onClick={() => activate(m.id)}
                  className="group flex items-baseline gap-4 py-[7px] md:py-2 text-left w-fit"
                >
                  <span className="font-display text-xs tnum w-6" style={{ color: active ? 'var(--accent)' : 'var(--mute)' }}>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className={`text-lg md:text-xl font-semibold transition-transform duration-150 ${active ? 'translate-x-1 text-ivory' : 'text-ivory/70'}`}>
                    {m.label}
                  </span>
                  <span className={`label !text-[10px] transition-opacity ${active ? 'opacity-100' : 'opacity-0'}`}>{m.en}</span>
                  {m.id === 'records' && missionsReady > 0 && (
                    <span className="text-[11px] font-bold px-1.5 py-0.5" style={{ background: 'var(--accent)', color: '#1a130c' }}>
                      {missionsReady}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="flex items-end justify-between gap-4 text-xs text-mute">
          <div className="tnum">
            {best > 0 ? (
              <>
                최고 생존 {Math.floor(best / 60)}분 {Math.floor(best % 60)}초 · 누적 처치 {save.stats.totalKills.toLocaleString('ko-KR')}
              </>
            ) : (
              <>WASD · 방향키 · 터치로 이동 / 공격은 자동</>
            )}
          </div>
          <div className="font-display">v1.0</div>
        </div>
      </div>
    </div>
  );
}
