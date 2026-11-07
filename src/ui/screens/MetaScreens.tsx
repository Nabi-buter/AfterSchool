import { useEffect, useState } from 'react';
import { META_UPGRADES, metaCost, ACHIEVEMENTS, MISSION_POOL } from '../../game/data/meta';
import { CHARACTERS, CHARACTER_MAP } from '../../game/data/characters';
import { WEAPONS, WEAPON_MAP } from '../../game/data/weapons';
import { PASSIVES, PASSIVE_MAP } from '../../game/data/passives';
import { ENEMIES, BOSSES } from '../../game/data/enemies';
import { STAGES } from '../../game/data/stages';
import { FIELD_ITEMS } from '../../game/data/misc';
import { iconUrl, silhouetteUrl, spriteUrl } from '../../game/render/sprites';
import { useMeta } from '../../meta/store';
import { useUI } from '../uiStore';
import { Btn, Coin, Pips, Pixel, ScreenHeader, StatRow } from '../components/common';
import { audio } from '../../game/audio/audio';
import { fmtTime } from '../../game/core/Game';

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="absolute inset-0 flex flex-col px-5 md:px-10 screen-enter" style={{ background: 'var(--navy)' }}>
      {children}
    </div>
  );
}

// ───────────────────────── Upgrades ─────────────────────────
const UP_ICON: Record<string, string> = { hp: 'stamina', might: 'focus', speed: 'agility', xp: 'memory', area: 'creativity', luck: 'luck', armor: 'patience', reroll: 'notes', revive: 'lunch' };

export function UpgradesScreen() {
  const save = useMeta((s) => s.save);
  const buy = useMeta((s) => s.buyUpgrade);
  const [flash, setFlash] = useState<string | null>(null);
  return (
    <Shell>
      <ScreenHeader title="영구 성장" en="Permanent upgrades" right={<Coin value={save.coins} className="text-base font-bold pb-1" />} />
      <div className="flex-1 min-h-0 scroll-y py-5" style={{ paddingBottom: 'max(20px, var(--safe-bottom))' }}>
        <p className="text-sm text-mute mb-4 max-w-xl">학교 코인으로 모든 학생에게 적용되는 기초 능력을 올린다. 단계가 오를수록 비용이 커진다.</p>
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-px" style={{ background: 'var(--rule)' }}>
          {META_UPGRADES.map((u) => {
            const lv = save.upgrades[u.id] ?? 0;
            const maxed = lv >= u.maxLevel;
            const cost = metaCost(u, lv);
            const afford = save.coins >= cost;
            return (
              <div key={u.id} className={`p-4 flex gap-4 ${flash === u.id ? 'fade-in' : ''}`} style={{ background: flash === u.id ? 'rgba(104,182,170,0.1)' : 'var(--navy)' }}>
                <div className="w-12 h-12 shrink-0 flex items-center justify-center" style={{ background: 'var(--navy2)' }}>
                  <Pixel src={iconUrl(UP_ICON[u.id])} size={36} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold">{u.name}</span>
                    <Pips value={lv} max={u.maxLevel} color="var(--teal)" />
                  </div>
                  <div className="text-sm text-mute mt-0.5">{u.desc}</div>
                  <div className="text-xs text-mute mt-0.5 tnum">현재 {lv}단계</div>
                  <Btn
                    className="mt-3 w-full !min-h-[38px] text-sm"
                    variant={!maxed && afford ? 'primary' : 'default'}
                    disabled={maxed || !afford}
                    onClick={() => {
                      if (buy(u.id)) {
                        audio.play('levelup');
                        setFlash(u.id);
                        window.setTimeout(() => setFlash(null), 400);
                      }
                    }}
                  >
                    {maxed ? '최대 단계' : <Coin value={cost} />}
                  </Btn>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Shell>
  );
}

// ───────────────────────── Codex ─────────────────────────
export function CodexScreen() {
  const save = useMeta((s) => s.save);
  const tab = useUI((s) => s.codexTab);
  const openCodex = useUI((s) => s.openCodex);
  const tabs = [
    ['chars', '학생'],
    ['weapons', '무기'],
    ['passives', '능력'],
    ['items', '아이템'],
    ['enemies', '적'],
    ['bosses', '보스'],
  ] as const;
  const [sel, setSel] = useState<string | null>(null);
  useEffect(() => setSel(null), [tab]);

  const known = {
    chars: (id: string) => save.unlockedChars.includes(id),
    weapons: (id: string) => save.codex.weapons.includes(id),
    passives: (id: string) => save.codex.passives.includes(id),
    enemies: (id: string) => (save.codex.enemies[id] ?? 0) > 0,
    bosses: (id: string) => (save.codex.bosses[id] ?? 0) > 0,
  };

  const items: { id: string; name: string; img: string; ok: boolean }[] =
    tab === 'chars'
      ? CHARACTERS.map((c) => ({ id: c.id, name: c.name, img: known.chars(c.id) ? spriteUrl('char', c.id, c, 4) : silhouetteUrl('char', c.id, c, 4), ok: known.chars(c.id) }))
      : tab === 'weapons'
        ? WEAPONS.map((w) => ({ id: w.id, name: w.name, img: iconUrl(w.id, !!w.isEvolution), ok: known.weapons(w.id) }))
        : tab === 'passives'
          ? PASSIVES.map((p) => ({ id: p.id, name: p.name, img: iconUrl(p.id), ok: known.passives(p.id) }))
          : tab === 'items'
            ? FIELD_ITEMS.map((f) => ({ id: f.id, name: f.name, img: f.id === 'chest' ? spriteUrl('enemy', 'chest_pickup') : iconUrl(f.id), ok: true }))
            : tab === 'enemies'
            ? ENEMIES.map((e) => ({ id: e.id, name: e.name, img: known.enemies(e.id) ? spriteUrl('enemy', e.sprite === 'mimic' ? 'mimic' : e.sprite) : silhouetteUrl('enemy', e.sprite), ok: known.enemies(e.id) }))
            : BOSSES.map((b) => ({ id: b.id, name: b.name, img: known.bosses(b.id) ? spriteUrl('enemy', b.sprite, undefined, 3) : silhouetteUrl('enemy', b.sprite, undefined, 3), ok: known.bosses(b.id) }));

  const found = items.filter((i) => i.ok).length;
  const cur = sel ?? items[0]?.id;

  return (
    <Shell>
      <ScreenHeader title="도감" en="Codex" right={<span className="text-sm text-mute tnum pb-1">{found} / {items.length}</span>} />
      <div className="flex gap-1 pt-3 overflow-x-auto">
        {tabs.map(([id, label]) => (
          <button
            key={id}
            onClick={() => {
              audio.play('click');
              openCodex(id);
            }}
            className="px-4 py-2.5 text-sm font-semibold border-b-2 shrink-0"
            style={{ borderBottomColor: tab === id ? 'var(--accent)' : 'var(--rule)', color: tab === id ? 'var(--ivory)' : 'var(--mute)' }}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="flex-1 min-h-0 grid md:grid-cols-[1fr_360px] gap-6 py-5" style={{ paddingBottom: 'max(20px, var(--safe-bottom))' }}>
        <div className="scroll-y min-h-0 order-2 md:order-1">
          <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-2">
            {items.map((it) => (
              <button
                key={it.id}
                onMouseEnter={() => audio.play('hover')}
                onClick={() => {
                  audio.play('click');
                  setSel(it.id);
                }}
                className="aspect-square flex flex-col items-center justify-center border p-1"
                style={{ background: 'var(--navy2)', borderColor: cur === it.id ? 'var(--accent)' : 'var(--rule)' }}
              >
                <Pixel src={it.img} size={40} className={it.ok ? '' : 'opacity-70'} />
                <span className="text-[10px] mt-1 truncate max-w-full" style={{ color: it.ok ? undefined : 'var(--mute)' }}>
                  {it.ok ? it.name : '???'}
                </span>
              </button>
            ))}
          </div>
        </div>
        <div className="order-1 md:order-2 min-h-0 scroll-y">{cur && <CodexDetail tab={tab} id={cur} ok={items.find((i) => i.id === cur)?.ok ?? false} img={items.find((i) => i.id === cur)?.img ?? ''} />}</div>
      </div>
    </Shell>
  );
}

function CodexDetail({ tab, id, ok, img }: { tab: string; id: string; ok: boolean; img: string }) {
  const save = useMeta((s) => s.save);
  let title = '???';
  let sub = '';
  let body = '아직 만나지 못했다.';
  const rows: [string, string][] = [];
  if (tab === 'chars') {
    const c = CHARACTER_MAP[id];
    title = ok ? c.name : '???';
    sub = c.role;
    body = ok ? c.desc : c.unlock.type !== 'default' ? `해금 조건 · ${c.unlock.text}` : '';
    if (ok) {
      rows.push(['고유 패시브', c.passiveName], ['시작 무기', WEAPON_MAP[c.startWeapon].name], ['체력', String(c.hp)]);
      const best = Object.values(save.best).filter((b) => b.char === id);
      if (best.length) rows.push(['최고 생존', fmtTime(Math.max(...best.map((b) => b.time)))]);
    }
  } else if (tab === 'weapons') {
    const w = WEAPON_MAP[id];
    title = ok ? w.name : '???';
    sub = w.isEvolution ? '진화 무기' : '무기';
    body = ok ? w.desc : '획득하면 기록된다.';
    if (w.evolvesWith) rows.push(['진화 조건', ok ? `최대 레벨 + ${PASSIVE_MAP[w.evolvesWith].name}` : '???']);
    if (w.isEvolution) {
      const base = WEAPONS.find((x) => x.evolvesInto === id)!;
      rows.push(['진화 전', save.codex.weapons.includes(base.id) ? base.name : '???'], ['필요 능력', ok ? PASSIVE_MAP[base.evolvesWith!].name : '???']);
    }
    if (w.union) {
      const [a, b] = w.union;
      const nm = (x: string) => (save.codex.weapons.includes(x) ? WEAPON_MAP[x].name : '???');
      sub = '조합 무기';
      rows.push(['조합 재료', `${nm(a)} + ${nm(b)}`], ['조건', '두 무기 모두 최대 레벨']);
      if (ok) rows.push(['포함 효과', w.subs!.map((x) => WEAPON_MAP[x].name).join(' · ')]);
    } else if (ok) rows.push(['최대 레벨', w.isEvolution ? '-' : String(w.levels.length + 1)]);
    const unions = WEAPONS.filter((u) => u.union?.includes(id));
    if (ok && unions.length) rows.push(['조합', unions.map((u) => (save.codex.weapons.includes(u.id) ? u.name : '???')).join(', ')]);
  } else if (tab === 'items') {
    const f = FIELD_ITEMS.find((x) => x.id === id)!;
    title = f.name;
    sub = '필드 아이템';
    body = f.desc;
    rows.push(['획득처', f.where]);
  } else if (tab === 'passives') {
    const p = PASSIVE_MAP[id];
    title = ok ? p.name : '???';
    sub = '능력';
    body = ok ? p.desc : '획득하면 기록된다.';
    if (ok) {
      rows.push(['최대 레벨', String(p.maxLevel)]);
      const evo = WEAPONS.filter((w) => w.evolvesWith === id).map((w) => w.name);
      if (evo.length) rows.push(['진화 짝', evo.join(', ')]);
    }
  } else if (tab === 'enemies') {
    const e = ENEMIES.find((x) => x.id === id)!;
    title = ok ? e.name : '???';
    sub = '적';
    body = ok ? e.desc : body;
    if (ok) {
      const kind: Record<string, string> = { chase: '추적형', wobble: '추적형', splitter: '분열형', tank: '방어형', dash: '돌진형', shield: '방어형', ranged: '원거리형', bomber: '자폭형', swarm: '군집형', mimic: '위장형', bouncer: '돌진형', hazard: '장판형', summoner: '소환형', blink: '순간이동형' };
      rows.push(['유형', kind[e.behavior] ?? '-'], ['체력', String(e.hp)], ['처치 수', (save.codex.enemies[id] ?? 0).toLocaleString('ko-KR')]);
      const stages = STAGES.filter((s) => s.waves.some((w) => w.enemy === id)).map((s) => s.name);
      if (stages.length) rows.push(['출현', stages.join(', ')]);
    }
  } else {
    const b = BOSSES.find((x) => x.id === id)!;
    title = ok ? b.name : '???';
    sub = b.title;
    body = ok ? b.desc : '아직 마주친 적이 없다.';
    if (ok) rows.push(['처치 횟수', String(save.codex.bosses[id] ?? 0)], ['출현', STAGES.find((s) => s.boss === id)?.name ?? '-']);
  }
  return (
    <div className="panel p-5 fade-in" key={id}>
      <div className="w-full aspect-[16/9] flex items-center justify-center" style={{ background: 'var(--navy)' }}>
        <Pixel src={img} size={tab === 'bosses' ? 132 : 96} />
      </div>
      <div className="label mt-4">{sub}</div>
      <div className="text-2xl font-bold mt-1">{title}</div>
      <p className="text-sm text-ivory/80 leading-relaxed mt-2">{body}</p>
      <div className="mt-3">
        {rows.map(([k, v]) => (
          <StatRow key={k} k={k} v={v} />
        ))}
      </div>
    </div>
  );
}

// ───────────────────────── Records (achievements + daily) ─────────────────────────
export function RecordsScreen() {
  const save = useMeta((s) => s.save);
  const claim = useMeta((s) => s.claimMission);
  const ensureDaily = useMeta((s) => s.ensureDaily);
  useEffect(() => ensureDaily(), [ensureDaily]);
  const got = ACHIEVEMENTS.filter((a) => save.achievements[a.id]).length;
  const tomorrow = new Date();
  tomorrow.setHours(24, 0, 0, 0);
  const hoursLeft = Math.ceil((tomorrow.getTime() - Date.now()) / 3600000);
  return (
    <Shell>
      <ScreenHeader title="업적 · 미션 · 기록" en="Records" right={<span className="text-sm text-mute tnum pb-1">업적 {got} / {ACHIEVEMENTS.length}</span>} />
      <div className="flex-1 min-h-0 scroll-y py-5 grid lg:grid-cols-[1fr_340px] gap-8 content-start" style={{ paddingBottom: 'max(20px, var(--safe-bottom))' }}>
        <div className="order-2 lg:order-1">
          <div className="label mb-2">업적</div>
          <div className="grid sm:grid-cols-2 gap-px" style={{ background: 'var(--rule)' }}>
            {ACHIEVEMENTS.map((a) => {
              const done = !!save.achievements[a.id];
              return (
                <div key={a.id} className="p-3.5 flex items-start gap-3" style={{ background: 'var(--navy)' }}>
                  <span className="mt-1 w-2.5 h-2.5 shrink-0" style={{ background: done ? 'var(--accent)' : 'transparent', border: `1px solid ${done ? 'var(--accent)' : 'var(--rule2)'}` }} />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm" style={{ color: done ? undefined : 'var(--mute)' }}>
                      {a.name}
                    </div>
                    <div className="text-xs text-mute mt-0.5">{a.desc}</div>
                  </div>
                  <Coin value={a.reward} className={`text-xs ${done ? 'opacity-40' : ''}`} />
                </div>
              );
            })}
          </div>
        </div>
        <div className="order-1 lg:order-2 flex flex-col gap-8">
          <div>
            <div className="flex items-baseline justify-between mb-2">
              <div className="label">오늘의 미션</div>
              <div className="text-xs text-mute tnum">
                {save.daily.date} · {hoursLeft}시간 후 갱신
              </div>
            </div>
            <div className="flex flex-col gap-px" style={{ background: 'var(--rule)' }}>
              {save.daily.missions.map((m, i) => {
                const t = MISSION_POOL[m.idx];
                const done = m.progress >= t.target;
                const name = m.extra ? CHARACTER_MAP[m.extra]?.name : undefined;
                return (
                  <div key={i} className="p-3.5" style={{ background: 'var(--navy)' }}>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-semibold">{t.text(t.target, name)}</span>
                      <Coin value={t.reward} className="text-xs" />
                    </div>
                    <div className="mt-2 h-[4px]" style={{ background: 'var(--navy2)' }}>
                      <div className="h-full" style={{ width: `${Math.min(100, (m.progress / t.target) * 100)}%`, background: done ? 'var(--accent)' : 'var(--teal)' }} />
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-mute tnum">
                        {t.kind === 'survive' ? `${fmtTime(m.progress)} / ${fmtTime(t.target)}` : `${Math.min(m.progress, t.target).toLocaleString('ko-KR')} / ${t.target.toLocaleString('ko-KR')}`}
                      </span>
                      {m.claimed ? (
                        <span className="text-xs text-mute">수령 완료</span>
                      ) : (
                        <Btn
                          variant={done ? 'primary' : 'default'}
                          disabled={!done}
                          className="!min-h-[32px] !px-3 text-xs"
                          onClick={() => {
                            claim(i);
                            audio.play('coin');
                          }}
                        >
                          받기
                        </Btn>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div>
            <div className="label mb-1">누적 기록</div>
            <StatRow k="플레이 횟수" v={save.stats.runs.toLocaleString('ko-KR')} />
            <StatRow k="총 플레이 시간" v={fmtTime(save.stats.playTime)} />
            <StatRow k="최고 생존 시간" v={fmtTime(save.stats.bestTime)} />
            <StatRow k="최고 레벨" v={save.stats.bestLevel} />
            <StatRow k="누적 처치" v={save.stats.totalKills.toLocaleString('ko-KR')} />
            <StatRow k="보스 · 중간 보스 처치" v={save.stats.bossKills} />
            <StatRow k="클리어" v={save.stats.clears} />
            <StatRow k="누적 획득 코인" v={save.stats.coinsEarned.toLocaleString('ko-KR')} />
          </div>
          <div>
            <div className="label mb-1">스테이지 최고 기록</div>
            {STAGES.map((s) => {
              const b = save.best[s.id];
              return <StatRow key={s.id} k={`0${s.index} ${s.name}`} v={b ? `${fmtTime(b.time)} · ${b.kills}킬${b.cleared ? ' · CLEAR' : ''}` : '-'} />;
            })}
          </div>
        </div>
      </div>
    </Shell>
  );
}

// ───────────────────────── Settings ─────────────────────────
export function SettingsScreen() {
  const settings = useMeta((s) => s.save.settings);
  const set = useMeta((s) => s.setSettings);
  const reset = useMeta((s) => s.reset);
  const [confirm, setConfirm] = useState(false);
  const [fs, setFs] = useState(!!document.fullscreenElement);
  useEffect(() => {
    const on = () => setFs(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', on);
    return () => document.removeEventListener('fullscreenchange', on);
  }, []);
  const toggle = (k: 'shake' | 'damageNumbers' | 'showFps' | 'reducedFlash', label: string, desc: string) => (
    <button
      className="w-full flex items-center justify-between gap-4 py-3.5 border-b rule text-left"
      onClick={() => {
        audio.play('click');
        set({ [k]: !settings[k] });
      }}
    >
      <span>
        <span className="block font-semibold">{label}</span>
        <span className="block text-xs text-mute mt-0.5">{desc}</span>
      </span>
      <span className="shrink-0 w-11 h-6 relative transition-colors" style={{ background: settings[k] ? 'var(--teal)' : 'var(--navy4)' }}>
        <span className="absolute top-1 w-4 h-4 transition-[left]" style={{ left: settings[k] ? 24 : 4, background: 'var(--ivory)' }} />
      </span>
    </button>
  );
  return (
    <Shell>
      <ScreenHeader title="설정" en="Settings" />
      <div className="flex-1 min-h-0 scroll-y py-5" style={{ paddingBottom: 'max(20px, var(--safe-bottom))' }}>
        <div className="max-w-[640px] grid gap-10">
          <section>
            <div className="label mb-2">사운드</div>
            {(
              [
                ['bgm', '배경음'],
                ['sfx', '효과음'],
              ] as const
            ).map(([k, label]) => (
              <label key={k} className="flex items-center gap-4 py-3 border-b rule">
                <span className="w-20 font-semibold">{label}</span>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={settings[k]}
                  onChange={(e) => {
                    const v = +e.target.value;
                    set({ [k]: v });
                    audio.unlock();
                    audio.setVolumes(k === 'bgm' ? v : settings.bgm, k === 'sfx' ? v : settings.sfx);
                  }}
                  onPointerUp={() => k === 'sfx' && audio.play('gem')}
                />
                <span className="w-10 text-right tnum text-sm text-mute">{Math.round(settings[k] * 100)}</span>
              </label>
            ))}
          </section>
          <section>
            <div className="label mb-2">화면</div>
            {toggle('shake', '화면 흔들림', '피격 · 폭발 시 화면이 흔들린다.')}
            {toggle('damageNumbers', '피해 숫자 표시', '적에게 준 피해량을 숫자로 띄운다.')}
            {toggle('reducedFlash', '깜빡임 줄이기', '체력 경고 등 번쩍이는 효과를 약하게 한다.')}
            {toggle('showFps', 'FPS 표시', '게임 중 프레임 수를 표시한다.')}
            <button
              className="w-full flex items-center justify-between gap-4 py-3.5 border-b rule text-left"
              onClick={() => {
                audio.play('click');
                if (document.fullscreenElement) void document.exitFullscreen();
                else void document.documentElement.requestFullscreen?.().catch(() => undefined);
              }}
            >
              <span>
                <span className="block font-semibold">전체 화면</span>
                <span className="block text-xs text-mute mt-0.5">브라우저 전체 화면으로 전환한다.</span>
              </span>
              <span className="text-sm text-mute">{fs ? '켜짐' : '꺼짐'}</span>
            </button>
          </section>
          <section>
            <div className="label mb-2">조작</div>
            <div className="grid sm:grid-cols-2 gap-px text-sm" style={{ background: 'var(--rule)' }}>
              <div className="p-4" style={{ background: 'var(--navy)' }}>
                <div className="font-semibold mb-2">키보드</div>
                <div className="text-mute leading-7">
                  WASD · 방향키 — 이동
                  <br />
                  ESC · P — 일시정지
                  <br />
                  1–4 — 레벨업 카드 선택
                  <br />R — 다시 뽑기
                </div>
              </div>
              <div className="p-4" style={{ background: 'var(--navy)' }}>
                <div className="font-semibold mb-2">터치</div>
                <div className="text-mute leading-7">
                  화면 아무 곳이나 누르고 드래그 — 이동
                  <br />
                  우측 상단 버튼 — 일시정지
                  <br />
                  공격은 모두 자동
                </div>
              </div>
            </div>
          </section>
          <section>
            <div className="label mb-2">데이터</div>
            {confirm ? (
              <div className="panel p-4">
                <div className="font-semibold">정말 모든 기록을 지울까요?</div>
                <div className="text-sm text-mute mt-1">코인, 해금, 업적, 기록이 모두 사라지며 되돌릴 수 없습니다.</div>
                <div className="flex gap-2 mt-4">
                  <Btn
                    variant="primary"
                    className="!bg-danger !border-danger"
                    onClick={() => {
                      reset();
                      setConfirm(false);
                      useMeta.getState().pushToast('데이터', '저장 데이터를 초기화했습니다');
                    }}
                  >
                    초기화
                  </Btn>
                  <Btn onClick={() => setConfirm(false)}>취소</Btn>
                </div>
              </div>
            ) : (
              <Btn onClick={() => setConfirm(true)}>저장 데이터 초기화</Btn>
            )}
          </section>
        </div>
      </div>
    </Shell>
  );
}

// ───────────────────────── Credits ─────────────────────────
export function CreditsScreen() {
  return (
    <Shell>
      <ScreenHeader title="제작 정보" en="Credits" />
      <div className="flex-1 min-h-0 scroll-y py-8" style={{ paddingBottom: 'max(20px, var(--safe-bottom))' }}>
        <div className="max-w-[620px]">
          <div className="font-display font-bold text-4xl tracking-tight">AFTER SCHOOL: LAST BELL</div>
          <p className="text-mute mt-3 leading-relaxed">
            이클립스 고등학교, 오후 5시. 마지막 종이 울린 뒤 학교에 남은 학생들의 이야기. 모든 캐릭터, 적, 아이콘, 배경은 코드로 직접 그린 픽셀 아트이며, 음악과 효과음은 Web Audio로 실시간 합성됩니다.
          </p>
          <div className="mt-8">
            <StatRow k="기획 · 개발 · 아트 · 사운드" v="After School Team" />
            <StatRow k="엔진" v="자체 Canvas 2D 엔진 · React · TypeScript" />
            <StatRow k="한글 글꼴" v="Pretendard (SIL OFL 1.1)" />
            <StatRow k="픽셀 글꼴" v="Galmuri11 by Lee Minseo (SIL OFL 1.1)" />
            <StatRow k="영문 글꼴" v="Space Grotesk (SIL OFL 1.1)" />
            <StatRow k="음악 · 효과음" v="절차적 합성 (외부 음원 없음)" />
          </div>
          <p className="text-xs text-mute mt-8 leading-relaxed">
            본 게임의 모든 등장 인물, 학교, 사건은 허구입니다. 진행 상황은 이 브라우저의 로컬 저장소에만 저장됩니다. 온라인 랭킹은 제공하지 않습니다.
          </p>
        </div>
      </div>
    </Shell>
  );
}
