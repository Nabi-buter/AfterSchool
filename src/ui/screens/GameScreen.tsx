import { useEffect, useRef, useState } from 'react';
import { Game, fmtTime, type GameEvent, type UpgradeOption } from '../../game/core/Game';
import { CHARACTER_MAP } from '../../game/data/characters';
import { STAGE_MAP } from '../../game/data/stages';
import { WEAPON_MAP } from '../../game/data/weapons';
import { PASSIVE_MAP, STAT_LABEL } from '../../game/data/passives';
import { SYNERGY_MAP } from '../../game/data/misc';
import { iconUrl } from '../../game/render/sprites';
import { metaBonus, useMeta } from '../../meta/store';
import { useUI } from '../uiStore';
import { Btn, Pixel } from '../components/common';
import { audio } from '../../game/audio/audio';
import type { Stats } from '../../game/types';

type Banner = { id: number; title: string; sub: string; tone: string; label?: string };

let bannerId = 1;

export function GameScreen() {
  const run = useUI((s) => s.run)!;
  const go = useUI((s) => s.go);
  const restart = useUI((s) => s.restart);
  const setResult = useUI((s) => s.setResult);
  const applyRun = useMeta((s) => s.applyRun);
  const settings = useMeta((s) => s.save.settings);
  const tutorialSeen = useMeta((s) => s.save.tutorialSeen);
  const markTutorial = useMeta((s) => s.markTutorial);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<Game | null>(null);
  const [levelUp, setLevelUp] = useState<Extract<GameEvent, { type: 'levelup' }> | null>(null);
  const [chest, setChest] = useState<Extract<GameEvent, { type: 'chest' }> | null>(null);
  const [paused, setPaused] = useState(false);
  const [bossIntro, setBossIntro] = useState<Extract<GameEvent, { type: 'bossIntro' }> | null>(null);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [tutorial, setTutorial] = useState(!tutorialSeen);
  const [, force] = useState(0);

  useEffect(() => {
    const save = useMeta.getState().save;
    const character = CHARACTER_MAP[run.char];
    const stage = STAGE_MAP[run.stage];
    audio.unlock();
    audio.playMusic('battle');
    audio.duck(false);
    const game = new Game(
      canvasRef.current!,
      {
        character,
        stage,
        club: run.club,
        meta: metaBonus(save),
        settings: { shake: save.settings.shake, damageNumbers: save.settings.damageNumbers, reducedFlash: save.settings.reducedFlash },
      },
      (e) => {
        switch (e.type) {
          case 'levelup':
            setLevelUp(e);
            break;
          case 'levelupDone':
            setLevelUp(null);
            break;
          case 'chest':
            setChest(e);
            break;
          case 'pause':
            setPaused(true);
            break;
          case 'bossIntro':
            setBossIntro(e);
            window.setTimeout(() => setBossIntro(null), 2700);
            break;
          case 'banner': {
            const b = { id: bannerId++, title: e.title, sub: e.sub, tone: e.tone, label: e.label };
            setBanners((list) => [...list.slice(-2), b]);
            window.setTimeout(() => setBanners((list) => list.filter((x) => x.id !== b.id)), 3300);
            break;
          }
          case 'end': {
            const summary = applyRun(e.result);
            setResult({ run: e.result, summary });
            break;
          }
        }
      },
    );
    gameRef.current = game;
    if (location.search.includes('debug')) (window as unknown as { __game: Game }).__game = game;
    force((n) => n + 1);
    return () => {
      game.destroy();
      gameRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run.nonce]);

  // tutorial: dismiss once the player moves or after a while
  useEffect(() => {
    if (!tutorial) return;
    const t = window.setTimeout(() => {
      setTutorial(false);
      markTutorial();
    }, 9000);
    const onKey = (e: KeyboardEvent) => {
      if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        window.setTimeout(() => {
          setTutorial(false);
          markTutorial();
        }, 2500);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener('keydown', onKey);
    };
  }, [tutorial, markTutorial]);

  const game = gameRef.current;

  const resume = () => {
    setPaused(false);
    game?.resume();
  };

  return (
    <div className="absolute inset-0 overflow-hidden" style={{ background: '#0b0f1a' }}>
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full touch-none" style={{ touchAction: 'none' }} />
      {game && <Hud game={game} showFps={settings.showFps} onPause={() => game.togglePause()} />}

      <div className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 pointer-events-none w-[min(92vw,560px)]" style={{ top: 'calc(max(12px, var(--safe-top)) + 96px)' }}>
        {banners.map((b) => (
          <BannerView key={b.id} b={b} />
        ))}
      </div>

      {tutorial && !levelUp && (
        <div className="absolute left-1/2 -translate-x-1/2 pointer-events-none fade-in text-center" style={{ bottom: 'calc(max(20px, var(--safe-bottom)) + 40px)' }}>
          <div className="panel px-5 py-3.5 text-sm leading-relaxed">
            <div className="font-semibold">
              <span className="hidden md:inline">WASD / 방향키로 이동</span>
              <span className="md:hidden">화면을 누른 채 드래그해서 이동</span>
              <span className="text-mute"> · 공격은 자동</span>
            </div>
            <div className="text-mute text-xs mt-1">경험치 조각을 모아 레벨업하고, 무기와 능력을 조합해 살아남아라. ESC로 일시정지.</div>
          </div>
        </div>
      )}

      {bossIntro && <BossIntro e={bossIntro} />}
      {levelUp && game && (
        <LevelUpView ev={levelUp} game={game} />
      )}
      {chest && game && (
        <ChestView
          ev={chest}
          onClose={() => {
            setChest(null);
            game.closeChest();
          }}
        />
      )}
      {paused && game && (
        <PauseView
          game={game}
          onResume={resume}
          onRestart={() => {
            setPaused(false);
            audio.duck(false);
            restart();
          }}
          onQuit={() => {
            setPaused(false);
            audio.duck(false);
            audio.playMusic('menu');
            go('title');
          }}
        />
      )}
    </div>
  );
}

// ───────────────────────── HUD ─────────────────────────
function Hud({ game, showFps, onPause }: { game: Game; showFps: boolean; onPause: () => void }) {
  const xpRef = useRef<HTMLDivElement>(null);
  const lvRef = useRef<HTMLSpanElement>(null);
  const hpRef = useRef<HTMLDivElement>(null);
  const hpTxt = useRef<HTMLSpanElement>(null);
  const timeRef = useRef<HTMLDivElement>(null);
  const clockRef = useRef<HTMLSpanElement>(null);
  const killRef = useRef<HTMLSpanElement>(null);
  const coinRef = useRef<HTMLSpanElement>(null);
  const fpsRef = useRef<HTMLSpanElement>(null);
  const bossWrap = useRef<HTMLDivElement>(null);
  const bossBar = useRef<HTMLDivElement>(null);
  const bossName = useRef<HTMLSpanElement>(null);
  const bossPhase = useRef<HTMLSpanElement>(null);
  const evWrap = useRef<HTMLDivElement>(null);
  const evTxt = useRef<HTMLSpanElement>(null);
  const [inv, setInv] = useState<{ w: string; p: string }>({ w: '', p: '' });
  const stage = game.stage;

  useEffect(() => {
    let raf = 0;
    let lastInv = '';
    const loop = () => {
      raf = requestAnimationFrame(loop);
      const h = game.hud;
      if (xpRef.current) xpRef.current.style.transform = `scaleX(${Math.min(1, h.xp / h.xpNext)})`;
      if (lvRef.current) lvRef.current.textContent = `Lv ${h.level}`;
      if (hpRef.current) hpRef.current.style.transform = `scaleX(${Math.max(0, h.hp / h.maxHp)})`;
      if (hpTxt.current) hpTxt.current.textContent = `${Math.ceil(h.hp)} / ${Math.round(h.maxHp)}`;
      if (timeRef.current) {
        timeRef.current.textContent = fmtTime(h.time);
        timeRef.current.style.color = h.overtime ? '#E69A5A' : '';
      }
      if (clockRef.current) clockRef.current.textContent = h.overtime ? 'OVERTIME' : h.clock;
      if (killRef.current) killRef.current.textContent = h.kills.toLocaleString('ko-KR');
      if (coinRef.current) coinRef.current.textContent = h.coins.toLocaleString('ko-KR');
      if (fpsRef.current) fpsRef.current.textContent = `${h.fps} FPS`;
      if (bossWrap.current) {
        bossWrap.current.style.display = h.boss ? 'block' : 'none';
        if (h.boss && bossBar.current && bossName.current && bossPhase.current) {
          bossBar.current.style.transform = `scaleX(${Math.max(0, h.boss.hp / h.boss.max)})`;
          bossName.current.textContent = h.boss.name;
          bossPhase.current.textContent = `PHASE ${h.boss.phase}`;
        }
      }
      if (evWrap.current) {
        evWrap.current.style.display = h.event ? 'flex' : 'none';
        if (h.event && evTxt.current) evTxt.current.textContent = `${h.event.name} · ${Math.ceil(h.event.remain)}s`;
      }
      const key = h.weapons.map((w) => w.id + w.level).join() + '|' + h.passives.map((p) => p.id + p.level).join();
      if (key !== lastInv) {
        lastInv = key;
        setInv({ w: key, p: '' });
      }
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [game]);

  void inv;
  const h = game.hud;

  return (
    <div className="absolute inset-0 pointer-events-none select-none">
      {/* XP bar */}
      <div className="absolute left-0 right-0 top-0 h-[5px]" style={{ background: 'rgba(17,24,39,0.8)' }}>
        <div ref={xpRef} className="h-full origin-left" style={{ background: 'var(--teal)', transform: 'scaleX(0)' }} />
      </div>

      <div className="absolute left-0 right-0 flex items-start justify-between gap-3 px-3 md:px-5" style={{ top: 'calc(max(10px, var(--safe-top)) + 4px)', paddingLeft: 'max(12px, var(--safe-left))', paddingRight: 'max(12px, var(--safe-right))' }}>
        {/* left: hp + inventory */}
        <div className="flex flex-col gap-2 min-w-0 w-[42%] max-w-[300px]">
          <div className="flex items-center gap-2">
            <span ref={lvRef} className="font-pixel text-[13px] px-1.5 py-0.5" style={{ background: 'var(--teal)', color: '#0b1512' }}>
              Lv 1
            </span>
            <div className="relative flex-1 h-[12px]" style={{ background: 'rgba(17,24,39,0.85)', outline: '1px solid rgba(241,235,221,0.18)' }}>
              <div ref={hpRef} className="absolute inset-0 origin-left" style={{ background: '#D9644A' }} />
              <span ref={hpTxt} className="absolute inset-0 flex items-center justify-center font-pixel text-[10px] leading-none" style={{ textShadow: '0 1px 0 #14161F' }} />
            </div>
          </div>
          <div className="flex flex-wrap gap-1">
            {h.weapons.map((w) => (
              <div key={w.id} className="relative w-[26px] h-[26px] md:w-[30px] md:h-[30px] flex items-center justify-center" style={{ background: 'rgba(17,24,39,0.8)', outline: `1px solid ${w.evo ? '#E2B94A' : 'rgba(241,235,221,0.16)'}` }}>
                <Pixel src={iconUrl(w.id, w.evo, 3)} size={22} />
                <span className="absolute -bottom-[3px] -right-[3px] font-pixel text-[9px] leading-none px-[2px]" style={{ background: '#14161F', color: w.level >= w.max ? '#E2B94A' : '#F1EBDD' }}>
                  {w.evo ? '★' : w.level}
                </span>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-1">
            {h.passives.map((p) => (
              <div key={p.id} className="relative w-[20px] h-[20px] md:w-[24px] md:h-[24px] flex items-center justify-center" style={{ background: 'rgba(17,24,39,0.7)' }}>
                <Pixel src={iconUrl(p.id, false, 2)} size={18} />
                <span className="absolute -bottom-[3px] -right-[3px] font-pixel text-[8px] leading-none px-[2px]" style={{ background: '#14161F', color: p.level >= p.max ? '#E2B94A' : '#9CA3AF' }}>
                  {p.level}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* center: time */}
        <div className="flex flex-col items-center shrink-0">
          <div ref={timeRef} className="font-display font-bold text-[26px] md:text-[32px] leading-none tnum" style={{ textShadow: '0 2px 0 rgba(0,0,0,0.5)' }}>
            00:00
          </div>
          <div className="label !text-[10px] mt-1 !tracking-[0.14em] whitespace-nowrap">
            <span className="hidden sm:inline">0{stage.index} {stage.name} · </span>
            <span ref={clockRef}>17:00</span>
          </div>
          <div ref={evWrap} className="mt-1.5 items-center gap-1.5 px-2 py-0.5 text-[11px] font-semibold" style={{ display: 'none', background: 'rgba(104,182,170,0.18)', color: '#9FD8CE' }}>
            <span className="inline-block w-1.5 h-1.5" style={{ background: 'var(--teal)' }} />
            <span ref={evTxt} />
          </div>
        </div>

        {/* right: kills, coins, pause */}
        <div className="flex items-start justify-end gap-3 w-[42%] max-w-[300px]">
          <div className="flex flex-col items-end gap-1 text-[13px] font-pixel">
            <div className="flex items-center gap-1.5">
              <svg width="11" height="11" viewBox="0 0 11 11" shapeRendering="crispEdges" aria-hidden>
                <rect x="1" y="1" width="9" height="7" fill="#F1EBDD" />
                <rect x="3" y="3" width="2" height="2" fill="#14161F" />
                <rect x="6" y="3" width="2" height="2" fill="#14161F" />
                <rect x="2" y="8" width="2" height="2" fill="#F1EBDD" />
                <rect x="5" y="8" width="1" height="2" fill="#F1EBDD" />
                <rect x="7" y="8" width="2" height="2" fill="#F1EBDD" />
              </svg>
              <span ref={killRef} className="tnum">0</span>
            </div>
            <div className="flex items-center gap-1.5" style={{ color: '#E2B94A' }}>
              <svg width="11" height="11" viewBox="0 0 7 7" shapeRendering="crispEdges" aria-hidden>
                <rect x="1" y="0" width="5" height="7" fill="#E2B94A" />
                <rect x="0" y="1" width="7" height="5" fill="#E2B94A" />
                <rect x="2" y="2" width="1" height="3" fill="#B08A2E" />
                <rect x="4" y="2" width="1" height="3" fill="#B08A2E" />
              </svg>
              <span ref={coinRef} className="tnum">0</span>
            </div>
            {showFps && <span ref={fpsRef} className="text-[10px] text-mute" />}
          </div>
          <button
            className="pointer-events-auto w-[40px] h-[40px] flex items-center justify-center"
            style={{ background: 'rgba(17,24,39,0.8)', outline: '1px solid rgba(241,235,221,0.18)' }}
            onClick={() => {
              audio.play('click');
              onPause();
            }}
            aria-label="일시정지"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
              <rect x="3" y="2" width="3" height="10" fill="#F1EBDD" />
              <rect x="8" y="2" width="3" height="10" fill="#F1EBDD" />
            </svg>
          </button>
        </div>
      </div>

      {/* boss bar */}
      <div ref={bossWrap} className="absolute left-1/2 -translate-x-1/2 w-[min(88vw,520px)]" style={{ display: 'none', top: 'calc(max(10px, var(--safe-top)) + 70px)' }}>
        <div className="flex items-baseline justify-between mb-1">
          <span ref={bossName} className="text-[13px] font-bold" />
          <span ref={bossPhase} className="label !text-[10px]" style={{ color: 'var(--accent)' }} />
        </div>
        <div className="h-[8px]" style={{ background: 'rgba(17,24,39,0.9)', outline: '1px solid rgba(241,235,221,0.2)' }}>
          <div ref={bossBar} className="h-full origin-left" style={{ background: 'var(--accent)' }} />
        </div>
      </div>
    </div>
  );
}

function BannerView({ b }: { b: Banner }) {
  const color = b.tone === 'boss' || b.tone === 'warn' ? 'var(--accent)' : b.tone === 'evolve' ? '#E2B94A' : b.tone === 'synergy' ? 'var(--teal)' : 'var(--ivory)';
  return (
    <div className="banner-in w-full text-center px-5 py-3" style={{ background: 'rgba(17,24,39,0.88)', borderTop: `2px solid ${color}` }}>
      {b.label && (
        <div className="label !text-[10px]" style={{ color }}>
          {b.label}
        </div>
      )}
      <div className="text-lg md:text-xl font-bold mt-0.5">{b.title}</div>
      <div className="text-xs md:text-sm text-mute mt-0.5">{b.sub}</div>
    </div>
  );
}

function BossIntro({ e }: { e: Extract<GameEvent, { type: 'bossIntro' }> }) {
  return (
    <div className="absolute inset-0 pointer-events-none flex items-center justify-center fade-in" style={{ background: 'rgba(8,10,18,0.45)' }}>
      <div className="boss-intro text-center px-6">
        <div className="label" style={{ color: 'var(--accent)' }}>
          {e.title}
        </div>
        <div className="text-4xl md:text-6xl font-bold tracking-tight mt-2">{e.name}</div>
        <div className="mx-auto mt-4 h-px w-24" style={{ background: 'var(--accent)' }} />
        <div className="text-sm md:text-base text-ivory/75 mt-4 max-w-md mx-auto leading-relaxed">{e.desc}</div>
      </div>
    </div>
  );
}

// ───────────────────────── Level up ─────────────────────────
function LevelUpView({ ev, game }: { ev: Extract<GameEvent, { type: 'levelup' }>; game: Game }) {
  const [picked, setPicked] = useState<number | null>(null);
  const [focus, setFocus] = useState(0);
  const key = ev.options.map((o) => o.kind + o.id).join();

  useEffect(() => {
    setPicked(null);
    setFocus(0);
  }, [key, ev]);

  const choose = (i: number) => {
    if (picked !== null) return;
    setPicked(i);
    const opt = ev.options[i];
    window.setTimeout(() => game.chooseUpgrade(opt), 220);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const n = parseInt(e.key, 10);
      if (n >= 1 && n <= ev.options.length) choose(n - 1);
      else if (e.code === 'ArrowRight' || e.code === 'ArrowDown' || e.code === 'KeyD' || e.code === 'KeyS') setFocus((f) => (f + 1) % ev.options.length);
      else if (e.code === 'ArrowLeft' || e.code === 'ArrowUp' || e.code === 'KeyA' || e.code === 'KeyW') setFocus((f) => (f - 1 + ev.options.length) % ev.options.length);
      else if (e.code === 'Enter' || e.code === 'Space') {
        e.preventDefault();
        choose(focus);
      } else if (e.code === 'KeyR') game.reroll();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <div className="absolute inset-0 flex items-center justify-center fade-in px-4" style={{ background: 'rgba(8,10,18,0.72)', paddingTop: 'var(--safe-top)', paddingBottom: 'var(--safe-bottom)' }}>
      <div className="w-full max-w-[980px] max-h-full flex flex-col py-4">
        <div className="text-center mb-4 md:mb-6">
          <div className="label" style={{ color: 'var(--teal)' }}>
            Level up
          </div>
          <div className="font-display font-bold text-3xl md:text-4xl mt-1 tnum">Lv {ev.level}</div>
        </div>
        <div className={`grid gap-2 md:gap-3 scroll-y min-h-0 ${ev.options.length >= 4 ? 'md:grid-cols-4' : 'md:grid-cols-3'}`}>
          {ev.options.map((o, i) => (
            <OptionCard key={o.kind + o.id + i} o={o} i={i} focused={focus === i} picked={picked === i} dim={picked !== null && picked !== i} onPick={() => choose(i)} onHover={() => setFocus(i)} />
          ))}
        </div>
        <div className="flex items-center justify-center gap-2 mt-4 md:mt-6">
          <Btn disabled={ev.rerolls <= 0 || picked !== null} onClick={() => game.reroll()}>
            다시 뽑기 <span className="tnum text-mute">{ev.rerolls}</span>
          </Btn>
          <Btn
            variant="ghost"
            disabled={ev.skips <= 0 || picked !== null}
            onClick={() => game.skip()}
          >
            건너뛰기 <span className="tnum text-mute">{ev.skips}</span>
          </Btn>
        </div>
        <div className="hidden md:block text-center text-xs text-mute mt-3">숫자 키 1–{ev.options.length}로 선택 · R 다시 뽑기</div>
      </div>
    </div>
  );
}

function OptionCard({ o, i, focused, picked, dim, onPick, onHover }: { o: UpgradeOption; i: number; focused: boolean; picked: boolean; dim: boolean; onPick: () => void; onHover: () => void }) {
  const evo = o.kind === 'evolve';
  const isWeapon = o.kind === 'weapon' || evo;
  const iconId = evo ? WEAPON_MAP[o.id].evolvesInto! : o.id;
  const icon = o.kind === 'heal' ? iconUrl('lunch') : o.kind === 'coin' ? iconUrl('allowance') : iconUrl(iconId, evo, 4);
  const max = isWeapon && !evo ? WEAPON_MAP[o.id].levels.length + 1 : o.kind === 'passive' ? PASSIVE_MAP[o.id].maxLevel : 0;
  const tagColor = evo ? '#E2B94A' : o.isNew ? 'var(--accent)' : 'var(--teal)';
  return (
    <button
      onClick={onPick}
      onMouseEnter={() => {
        onHover();
        audio.play('hover');
      }}
      className={`card-in text-left flex md:flex-col gap-3 md:gap-0 p-3.5 md:p-5 border transition-[border-color,background-color,opacity] duration-150 ${picked ? 'picked' : ''}`}
      style={{
        animationDelay: picked ? '0ms' : `${i * 55}ms`,
        background: focused ? '#1E2E48' : 'var(--navy2)',
        borderColor: evo ? '#E2B94A' : focused ? 'rgba(241,235,221,0.5)' : 'var(--rule)',
        opacity: dim ? 0.3 : 1,
      }}
    >
      <div className="shrink-0 w-[52px] h-[52px] md:w-[64px] md:h-[64px] flex items-center justify-center" style={{ background: 'var(--navy)' }}>
        <Pixel src={icon} size={44} />
      </div>
      <div className="min-w-0 flex-1 md:mt-4">
        <div className="flex items-center justify-between gap-2">
          <span className="label !text-[10px] !tracking-[0.12em]" style={{ color: tagColor }}>
            {o.tag}
          </span>
          <span className="hidden md:inline font-display text-xs text-mute">{i + 1}</span>
        </div>
        <div className="text-[17px] md:text-lg font-bold mt-1 leading-tight">{o.name}</div>
        {(o.kind === 'weapon' || o.kind === 'passive') && (
          <div className="flex items-center gap-2 mt-1.5">
            <span className="font-pixel text-[11px] tnum text-mute">{o.isNew ? 'NEW' : `Lv ${o.level} → ${o.next}`}</span>
            {max > 0 && (
              <span className="inline-flex gap-[2px]">
                {Array.from({ length: max }, (_, k) => (
                  <span key={k} className="inline-block w-[5px] h-[5px]" style={{ background: k < o.level ? '#9CA3AF' : k < o.next ? tagColor : 'rgba(241,235,221,0.14)' }} />
                ))}
              </span>
            )}
          </div>
        )}
        <div className="text-[13px] md:text-sm text-ivory/75 mt-1.5 md:mt-2.5 leading-snug">{o.desc}</div>
        {evo && <div className="text-xs mt-2" style={{ color: '#E2B94A' }}>{WEAPON_MAP[o.id].name} → {o.name}</div>}
      </div>
    </button>
  );
}

// ───────────────────────── Chest ─────────────────────────
function ChestView({ ev, onClose }: { ev: Extract<GameEvent, { type: 'chest' }>; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Enter' || e.code === 'Space' || e.code === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    const t = window.setTimeout(() => window.addEventListener('keydown', onKey), 300);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);
  return (
    <div className="absolute inset-0 flex items-center justify-center fade-in px-4" style={{ background: 'rgba(8,10,18,0.72)' }}>
      <div className="panel w-full max-w-[420px] p-6 card-in">
        <div className="label" style={{ color: '#E2B94A' }}>
          Lost & Found
        </div>
        <div className="text-2xl font-bold mt-1">{ev.title}</div>
        <div className="mt-5 flex flex-col gap-px" style={{ background: 'var(--rule)' }}>
          {ev.items.map((it, i) => (
            <div key={i} className="flex items-center gap-3 p-3 card-in" style={{ background: 'var(--navy)', animationDelay: `${120 + i * 120}ms` }}>
              <Pixel src={iconUrl(it.id, it.evo, 4)} size={36} />
              <div className="flex-1">
                <div className="font-semibold">{it.name}</div>
                <div className="text-xs mt-0.5" style={{ color: it.evo ? '#E2B94A' : 'var(--mute)' }}>
                  {it.text}
                </div>
              </div>
            </div>
          ))}
          <div className="flex items-center justify-between p-3" style={{ background: 'var(--navy)' }}>
            <span className="text-sm text-mute">학교 코인</span>
            <span className="font-pixel tnum" style={{ color: '#E2B94A' }}>
              +{ev.coins}
            </span>
          </div>
        </div>
        <Btn variant="primary" className="w-full mt-5" onClick={onClose}>
          계속하기
        </Btn>
      </div>
    </div>
  );
}

// ───────────────────────── Pause ─────────────────────────
const SHOWN_STATS: (keyof Stats)[] = ['maxHp', 'might', 'area', 'speed', 'cooldown', 'amount', 'armor', 'regen', 'magnet', 'luck', 'crit', 'xpGain'];

function fmtStat(k: keyof Stats, v: number) {
  if (k === 'maxHp') return Math.round(v).toString();
  if (k === 'amount' || k === 'armor') return `+${Math.round(v)}`;
  if (k === 'regen') return `${v.toFixed(1)}/s`;
  if (k === 'crit') return `${Math.round(v * 100)}%`;
  return `${Math.round(v * 100)}%`;
}

function PauseView({ game, onResume, onRestart, onQuit }: { game: Game; onResume: () => void; onRestart: () => void; onQuit: () => void }) {
  const settings = useMeta((s) => s.save.settings);
  const setSettings = useMeta((s) => s.setSettings);
  const [confirm, setConfirm] = useState<'restart' | 'quit' | null>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Escape' || e.code === 'KeyP') {
        e.stopPropagation();
        onResume();
      }
    };
    // capture so the game's own ESC handler doesn't immediately re-pause
    const t = window.setTimeout(() => window.addEventListener('keydown', onKey, true), 50);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener('keydown', onKey, true);
    };
  }, [onResume]);
  const s = game.player.stats;
  return (
    <div className="absolute inset-0 fade-in flex items-center justify-center px-4" style={{ background: 'rgba(8,10,18,0.8)', paddingTop: 'var(--safe-top)', paddingBottom: 'var(--safe-bottom)' }}>
      <div className="w-full max-w-[900px] max-h-full scroll-y py-6 grid md:grid-cols-[1fr_280px] gap-8">
        <div>
          <div className="label">Paused · {fmtTime(game.time)}</div>
          <div className="text-3xl font-bold mt-1">일시정지</div>
          <div className="mt-6">
            <div className="label mb-2">무기</div>
            <div className="flex flex-col gap-px" style={{ background: 'var(--rule)' }}>
              {game.weapons.map((w) => (
                <div key={w.slot} className="flex items-center gap-3 px-3 py-2" style={{ background: 'var(--navy)' }}>
                  <Pixel src={iconUrl(w.def.id, !!w.def.isEvolution, 3)} size={28} />
                  <span className="font-semibold text-sm flex-1">{w.def.name}</span>
                  <span className="font-pixel text-xs text-mute tnum">{w.def.isEvolution ? 'EVO' : `Lv ${w.level}`}</span>
                  <span className="font-pixel text-xs tnum w-20 text-right">{Math.round(w.dealt).toLocaleString('ko-KR')}</span>
                </div>
              ))}
            </div>
          </div>
          {game.passives.length > 0 && (
            <div className="mt-5">
              <div className="label mb-2">능력</div>
              <div className="flex flex-wrap gap-2">
                {game.passives.map((p) => (
                  <div key={p.id} className="flex items-center gap-2 pl-1 pr-2.5 py-1" style={{ background: 'var(--navy2)' }}>
                    <Pixel src={iconUrl(p.id, false, 2)} size={22} />
                    <span className="text-sm">{PASSIVE_MAP[p.id].name}</span>
                    <span className="font-pixel text-[11px] text-mute">{p.level}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {game.synergies.size > 0 && (
            <div className="mt-5">
              <div className="label mb-2" style={{ color: 'var(--teal)' }}>
                시너지
              </div>
              <div className="flex flex-col gap-1">
                {[...game.synergies].map((id) => (
                  <div key={id} className="text-sm">
                    <span className="font-semibold">{SYNERGY_MAP[id].name}</span> <span className="text-mute">· {SYNERGY_MAP[id].desc}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="flex flex-col gap-6">
          <div>
            <div className="label mb-1">능력치</div>
            {SHOWN_STATS.map((k) => (
              <div key={k} className="flex justify-between text-sm py-1 border-b rule">
                <span className="text-mute">{STAT_LABEL[k]}</span>
                <span className="tnum">{fmtStat(k, s[k])}</span>
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-3">
            <label className="text-sm flex items-center gap-3">
              <span className="w-16 text-mute">배경음</span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={settings.bgm}
                onChange={(e) => {
                  setSettings({ bgm: +e.target.value });
                  audio.setVolumes(+e.target.value, settings.sfx);
                }}
              />
            </label>
            <label className="text-sm flex items-center gap-3">
              <span className="w-16 text-mute">효과음</span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={settings.sfx}
                onChange={(e) => {
                  setSettings({ sfx: +e.target.value });
                  audio.setVolumes(settings.bgm, +e.target.value);
                }}
              />
            </label>
          </div>
          {confirm ? (
            <div className="panel p-4">
              <div className="text-sm font-semibold">{confirm === 'restart' ? '처음부터 다시 시작할까요?' : '메인 메뉴로 나갈까요?'}</div>
              <div className="text-xs text-mute mt-1">이번 판의 진행 상황과 보상은 저장되지 않습니다.</div>
              <div className="flex gap-2 mt-3">
                <Btn variant="primary" className="flex-1" onClick={confirm === 'restart' ? onRestart : onQuit}>
                  확인
                </Btn>
                <Btn className="flex-1" onClick={() => setConfirm(null)}>
                  취소
                </Btn>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <Btn variant="primary" onClick={onResume}>
                계속하기
              </Btn>
              <Btn onClick={() => setConfirm('restart')}>다시 시작</Btn>
              <Btn onClick={() => setConfirm('quit')}>메인 메뉴</Btn>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
