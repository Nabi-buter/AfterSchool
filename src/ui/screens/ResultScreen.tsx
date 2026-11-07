import { useEffect } from 'react';
import { useUI } from '../uiStore';
import { CHARACTER_MAP, CLUB_MAP } from '../../game/data/characters';
import { STAGE_MAP } from '../../game/data/stages';
import { WEAPON_MAP } from '../../game/data/weapons';
import { PASSIVE_MAP } from '../../game/data/passives';
import { SYNERGY_MAP } from '../../game/data/misc';
import { iconUrl, spriteUrl } from '../../game/render/sprites';
import { fmtTime } from '../../game/core/Game';
import { Btn, Coin, Pixel } from '../components/common';
import { audio } from '../../game/audio/audio';
import { useMeta } from '../../meta/store';

export function ResultScreen() {
  const result = useUI((s) => s.result);
  const restart = useUI((s) => s.restart);
  const go = useUI((s) => s.go);
  const coins = useMeta((s) => s.save.coins);
  useEffect(() => {
    audio.playMusic('menu');
  }, []);
  if (!result) return null;
  const { run, summary } = result;
  const ch = CHARACTER_MAP[run.char];
  const st = STAGE_MAP[run.stage];
  const maxDmg = Math.max(1, ...Object.values(run.dmgByWeapon));
  const totalDmg = Object.values(run.dmgByWeapon).reduce((a, b) => a + b, 0);

  return (
    <div className="absolute inset-0 scroll-y screen-enter" style={{ background: 'var(--navy)' }}>
      <div className="max-w-[1040px] mx-auto px-5 md:px-10" style={{ paddingTop: 'max(28px, var(--safe-top))', paddingBottom: 'max(28px, var(--safe-bottom))' }}>
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <div className="label" style={{ color: run.cleared ? 'var(--teal)' : 'var(--accent)' }}>
              {run.cleared ? 'Dismissed · 하교 완료' : 'Detention · 생존 실패'}
            </div>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight mt-2">{run.cleared ? '방과 후를 끝냈다' : '오늘은 여기까지'}</h1>
            <div className="text-mute mt-2">
              STAGE 0{st.index} {st.name} · {ch.role} {ch.name} · {CLUB_MAP[run.club]?.name}
            </div>
          </div>
          {summary.newBest && (
            <div className="px-3 py-1.5 text-sm font-bold" style={{ background: 'var(--accent)', color: '#1a130c' }}>
              최고 기록 갱신
            </div>
          )}
        </div>

        <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-px" style={{ background: 'var(--rule)' }}>
          {[
            ['생존 시간', fmtTime(run.time)],
            ['처치', run.kills.toLocaleString('ko-KR')],
            ['최종 레벨', `Lv ${run.level}`],
            ['총 피해', totalDmg.toLocaleString('ko-KR')],
          ].map(([k, v]) => (
            <div key={k} className="p-4 md:p-5" style={{ background: 'var(--navy)' }}>
              <div className="label">{k}</div>
              <div className="font-display font-bold text-2xl md:text-3xl mt-1 tnum">{v}</div>
            </div>
          ))}
        </div>

        <div className="mt-8 grid md:grid-cols-[1fr_320px] gap-8">
          <div>
            <div className="flex items-center gap-4">
              <Pixel src={spriteUrl('char', ch.id, ch, 4)} size={48} />
              <div className="label">최종 빌드</div>
            </div>
            <div className="mt-3 flex flex-col gap-px" style={{ background: 'var(--rule)' }}>
              {run.weapons.map((w) => {
                const d = WEAPON_MAP[w.id];
                const dmg = run.dmgByWeapon[w.id] ?? 0;
                return (
                  <div key={w.id} className="flex items-center gap-3 px-3 py-2.5" style={{ background: 'var(--navy)' }}>
                    <Pixel src={iconUrl(w.id, !!d.isEvolution, 3)} size={30} />
                    <div className="w-32 md:w-40 shrink-0">
                      <div className="text-sm font-semibold truncate">{d.name}</div>
                      <div className="font-pixel text-[11px] text-mute">{d.isEvolution ? 'EVOLVED' : `Lv ${w.level}`}</div>
                    </div>
                    <div className="flex-1 h-[6px]" style={{ background: 'var(--navy2)' }}>
                      <div className="h-full" style={{ width: `${(dmg / maxDmg) * 100}%`, background: d.isEvolution ? '#E2B94A' : 'var(--teal)' }} />
                    </div>
                    <div className="font-pixel text-xs tnum w-20 text-right">{dmg.toLocaleString('ko-KR')}</div>
                  </div>
                );
              })}
            </div>
            {run.passives.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {run.passives.map((p) => (
                  <div key={p.id} className="flex items-center gap-2 pl-1 pr-2.5 py-1" style={{ background: 'var(--navy2)' }}>
                    <Pixel src={iconUrl(p.id, false, 2)} size={22} />
                    <span className="text-sm">{PASSIVE_MAP[p.id].name}</span>
                    <span className="font-pixel text-[11px] text-mute">{p.level}</span>
                  </div>
                ))}
              </div>
            )}
            {run.synergies.length > 0 && (
              <div className="mt-4 text-sm">
                <span className="label mr-2" style={{ color: 'var(--teal)' }}>
                  시너지
                </span>
                {run.synergies.map((s) => SYNERGY_MAP[s].name).join(' · ')}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-6">
            <div>
              <div className="label mb-2">보상</div>
              <div className="flex justify-between text-sm py-2 border-b rule">
                <span className="text-mute">수집한 코인</span>
                <Coin value={run.coins} />
              </div>
              <div className="flex justify-between text-sm py-2 border-b rule">
                <span className="text-mute">생존 · 클리어 보너스</span>
                <Coin value={summary.bonusCoins} />
              </div>
              <div className="flex justify-between py-2.5 font-bold">
                <span>합계</span>
                <Coin value={summary.coinsEarned} className="text-lg" />
              </div>
              <div className="text-xs text-mute">보유 코인 {coins.toLocaleString('ko-KR')}</div>
            </div>
            {(summary.unlocks.length > 0 || summary.achievements.length > 0 || summary.missions.length > 0) && (
              <div className="flex flex-col gap-2">
                {summary.unlocks.map((u) => (
                  <div key={u} className="text-sm px-3 py-2 card-in" style={{ background: 'rgba(104,182,170,0.12)', borderLeft: '2px solid var(--teal)' }}>
                    {u}
                  </div>
                ))}
                {summary.achievements.map((a) => (
                  <div key={a.id} className="text-sm px-3 py-2 card-in" style={{ background: 'rgba(230,154,90,0.1)', borderLeft: '2px solid var(--accent)' }}>
                    업적 · <b>{a.name}</b> <span className="text-mute">+{a.reward}</span>
                  </div>
                ))}
                {summary.missions.map((m) => (
                  <div key={m} className="text-sm px-3 py-2 card-in" style={{ background: 'rgba(226,185,74,0.1)', borderLeft: '2px solid #E2B94A' }}>
                    일일 미션 완료 · {m} <span className="text-mute">(업적 화면에서 수령)</span>
                  </div>
                ))}
              </div>
            )}
            <div className="flex flex-col gap-2">
              <Btn variant="primary" onClick={restart}>
                다시 등교하기
              </Btn>
              <Btn onClick={() => go('select')}>캐릭터 · 스테이지 변경</Btn>
              <Btn variant="ghost" onClick={() => go('title')}>
                메인 메뉴
              </Btn>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
