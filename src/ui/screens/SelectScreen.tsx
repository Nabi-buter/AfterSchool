import { useMemo, useState } from 'react';
import { CHARACTERS, CLUBS, CHARACTER_MAP, CLUB_MAP } from '../../game/data/characters';
import { STAGES } from '../../game/data/stages';
import { WEAPON_MAP } from '../../game/data/weapons';
import { BOSS_MAP } from '../../game/data/enemies';
import { iconUrl, silhouetteUrl, spriteUrl } from '../../game/render/sprites';
import { isClubUnlocked, isStageUnlocked, useMeta } from '../../meta/store';
import { useUI } from '../uiStore';
import { Btn, Coin, Pixel, ScreenHeader } from '../components/common';
import { audio } from '../../game/audio/audio';
import { fmtTime } from '../../game/core/Game';

export function SelectScreen() {
  const save = useMeta((s) => s.save);
  const setLast = useMeta((s) => s.setLast);
  const startRun = useUI((s) => s.startRun);
  const [charId, setChar] = useState(save.unlockedChars.includes(save.last.char) ? save.last.char : 'seoyun');
  const [club, setClub] = useState(isClubUnlocked(save, save.last.club) ? save.last.club : 'none');
  const [stage, setStage] = useState(isStageUnlocked(save, save.last.stage) ? save.last.stage : 'classroom');
  const [tab, setTab] = useState<'char' | 'club' | 'stage'>('char');

  const c = CHARACTER_MAP[charId];
  const unlocked = save.unlockedChars.includes(charId);
  const weapon = WEAPON_MAP[c.startWeapon];
  const st = STAGES.find((s) => s.id === stage)!;
  const affinity = c.club === club;

  const start = () => {
    if (!unlocked || !isStageUnlocked(save, stage) || !isClubUnlocked(save, club)) return;
    audio.unlock();
    audio.play('levelup');
    setLast({ char: charId, club, stage });
    startRun({ char: charId, club, stage });
  };

  const best = save.best[stage];

  const charGrid = (
    <div className="grid grid-cols-4 lg:grid-cols-2 gap-2">
      {CHARACTERS.map((ch) => {
        const ok = save.unlockedChars.includes(ch.id);
        const sel = ch.id === charId;
        return (
          <button
            key={ch.id}
            onMouseEnter={() => audio.play('hover')}
            onClick={() => {
              audio.play('click');
              setChar(ch.id);
            }}
            className="relative aspect-square flex flex-col items-center justify-center border transition-colors"
            style={{ borderColor: sel ? 'var(--accent)' : 'var(--rule)', background: sel ? 'rgba(230,154,90,0.08)' : 'var(--navy2)' }}
            aria-label={ok ? ch.name : '잠긴 캐릭터'}
          >
            <Pixel src={ok ? spriteUrl('char', ch.id, ch, 4) : silhouetteUrl('char', ch.id, ch, 4)} size={44} />
            <span className="text-[11px] mt-1 font-semibold truncate max-w-full px-1" style={{ color: ok ? undefined : 'var(--mute)' }}>
              {ok ? ch.role : '???'}
            </span>
          </button>
        );
      })}
    </div>
  );

  const clubList = (
    <div className="flex flex-col">
      {CLUBS.map((cl) => {
        const ok = isClubUnlocked(save, cl.id);
        const sel = cl.id === club;
        return (
          <button
            key={cl.id}
            disabled={!ok}
            onMouseEnter={() => ok && audio.play('hover')}
            onClick={() => {
              audio.play('click');
              setClub(cl.id);
            }}
            className="text-left py-2.5 px-3 border-l-2 transition-colors disabled:opacity-40"
            style={{ borderLeftColor: sel ? 'var(--accent)' : 'transparent', background: sel ? 'rgba(230,154,90,0.07)' : 'transparent' }}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-[15px]">{cl.name}</span>
              {c.club === cl.id && <span className="label !text-[10px]" style={{ color: 'var(--teal)' }}>궁합</span>}
            </div>
            <div className="text-xs text-mute mt-0.5">{ok ? cl.desc : cl.unlock.type === 'achievement' ? cl.unlock.text : ''}</div>
          </button>
        );
      })}
    </div>
  );

  const stageList = (
    <div className="flex flex-col">
      {STAGES.map((s) => {
        const ok = isStageUnlocked(save, s.id);
        const sel = s.id === stage;
        const cleared = save.clearedStages.includes(s.id);
        return (
          <button
            key={s.id}
            disabled={!ok}
            onMouseEnter={() => ok && audio.play('hover')}
            onClick={() => {
              audio.play('click');
              setStage(s.id);
            }}
            className="text-left py-2.5 px-3 border-l-2 transition-colors disabled:opacity-40"
            style={{ borderLeftColor: sel ? 'var(--accent)' : 'transparent', background: sel ? 'rgba(230,154,90,0.07)' : 'transparent' }}
          >
            <div className="flex items-baseline gap-3">
              <span className="font-display text-xs tnum text-mute">0{s.index}</span>
              <span className="font-semibold text-[15px]">{ok ? s.name : '잠김'}</span>
              {cleared && <span className="label !text-[10px]" style={{ color: 'var(--teal)' }}>CLEAR</span>}
            </div>
            <div className="text-xs text-mute mt-0.5 pl-7">{ok ? `${s.en} · ${Math.round(s.duration / 60)}분` : `STAGE 0${s.index - 1} 클리어 시 해금`}</div>
          </button>
        );
      })}
    </div>
  );

  const detail = useMemo(
    () => (
      <div className="flex flex-col h-full">
        <div className="flex items-end gap-5">
          <div className="shrink-0 w-[112px] h-[112px] md:w-[148px] md:h-[148px] flex items-center justify-center border rule" style={{ background: 'var(--navy2)' }}>
            <Pixel src={unlocked ? spriteUrl('char', c.id, c, 8) : silhouetteUrl('char', c.id, c, 8)} size={unlocked ? 120 : 110} />
          </div>
          <div className="min-w-0 pb-1">
            <div className="label">{unlocked ? c.role : 'LOCKED'}</div>
            <div className="text-3xl md:text-4xl font-bold tracking-tight mt-1">{unlocked ? c.name : '???'}</div>
            <div className="text-sm text-mute mt-1">추천 동아리 · {CLUB_MAP[c.club].name}</div>
          </div>
        </div>
        <p className="mt-5 text-[15px] leading-relaxed text-ivory/85 min-h-[48px]">
          {unlocked ? c.desc : c.unlock.type !== 'default' ? `해금 조건 · ${c.unlock.text}` : ''}
        </p>
        {unlocked && (
          <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-px" style={{ background: 'var(--rule)' }}>
            <div className="p-4" style={{ background: 'var(--navy)' }}>
              <div className="label">고유 패시브</div>
              <div className="font-semibold mt-1.5">{c.passiveName}</div>
              <div className="text-sm text-mute mt-1 leading-snug">{c.passiveDesc}</div>
            </div>
            <div className="p-4 flex gap-3" style={{ background: 'var(--navy)' }}>
              <Pixel src={iconUrl(weapon.id)} size={40} className="shrink-0" />
              <div>
                <div className="label">시작 무기</div>
                <div className="font-semibold mt-1.5">{weapon.name}</div>
                <div className="text-sm text-mute mt-1 leading-snug">{weapon.short}</div>
              </div>
            </div>
          </div>
        )}
        {unlocked && (
          <div className="mt-4 text-sm text-mute">
            체력 <span className="text-ivory tnum font-semibold">{c.hp}</span>
            {affinity && (
              <span className="ml-3" style={{ color: 'var(--teal)' }}>
                동아리 궁합 · 공격력 +8%, 체력 +10
              </span>
            )}
          </div>
        )}
      </div>
    ),
    [c, unlocked, weapon, affinity],
  );

  const canStart = unlocked && isStageUnlocked(save, stage) && isClubUnlocked(save, club);

  const startBar = (
    <div className="flex items-center justify-between gap-4 border-t rule pt-4" style={{ paddingBottom: 'max(16px, var(--safe-bottom))' }}>
      <div className="min-w-0 text-sm">
        <div className="font-semibold truncate">
          STAGE 0{st.index} {st.name} <span className="text-mute font-normal">· 보스 {BOSS_MAP[st.boss].name}</span>
        </div>
        <div className="text-mute text-xs mt-0.5 tnum">{best ? `최고 기록 ${fmtTime(best.time)} · ${best.kills.toLocaleString('ko-KR')}킬${best.cleared ? ' · 클리어' : ''}` : '기록 없음'}</div>
      </div>
      <Btn variant="primary" className="shrink-0 !px-8 !min-h-[48px] text-[15px]" disabled={!canStart} onClick={start}>
        등교하기
      </Btn>
    </div>
  );

  return (
    <div className="absolute inset-0 flex flex-col px-5 md:px-10 screen-enter" style={{ background: 'var(--navy)' }}>
      <ScreenHeader title="학생 · 동아리 · 장소 선택" en="Before the bell" right={<Coin value={save.coins} className="text-sm font-semibold pb-1" />} />

      {/* Desktop: three columns */}
      <div className="hidden lg:grid flex-1 min-h-0 grid-cols-[220px_1fr_300px] gap-8 py-6">
        <div className="scroll-y">
          <div className="label mb-3">학생</div>
          {charGrid}
        </div>
        <div className="min-h-0 scroll-y pr-2">{detail}</div>
        <div className="min-h-0 scroll-y flex flex-col gap-6">
          <div>
            <div className="label mb-2">동아리</div>
            {clubList}
          </div>
          <div>
            <div className="label mb-2">스테이지</div>
            {stageList}
          </div>
        </div>
      </div>

      {/* Mobile / tablet: tabs */}
      <div className="lg:hidden flex-1 min-h-0 flex flex-col">
        <div className="flex gap-1 pt-3">
          {(
            [
              ['char', '학생'],
              ['club', '동아리'],
              ['stage', '스테이지'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              onClick={() => {
                audio.play('click');
                setTab(id);
              }}
              className="flex-1 py-2.5 text-sm font-semibold border-b-2"
              style={{ borderBottomColor: tab === id ? 'var(--accent)' : 'var(--rule)', color: tab === id ? 'var(--ivory)' : 'var(--mute)' }}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex-1 min-h-0 scroll-y py-4">
          {tab === 'char' && (
            <div className="flex flex-col gap-5">
              {detail}
              {charGrid}
            </div>
          )}
          {tab === 'club' && clubList}
          {tab === 'stage' && stageList}
        </div>
      </div>
      {startBar}
    </div>
  );
}
