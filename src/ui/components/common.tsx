import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { audio } from '../../game/audio/audio';
import { useMeta } from '../../meta/store';
import { useUI } from '../uiStore';

export function Btn({ children, variant = 'default', className = '', onClick, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'default' | 'primary' | 'ghost' }) {
  return (
    <button
      {...rest}
      className={`btn ${variant === 'primary' ? 'btn-primary' : variant === 'ghost' ? 'btn-ghost' : ''} ${className}`}
      onMouseEnter={() => audio.play('hover')}
      onClick={(e) => {
        audio.unlock();
        audio.play('click');
        onClick?.(e);
      }}
    >
      {children}
    </button>
  );
}

export function Pixel({ src, size, className = '', alt = '' }: { src: string; size: number; className?: string; alt?: string }) {
  return <img src={src} alt={alt} width={size} height={size} draggable={false} className={`pixel ${className}`} style={{ width: size, height: size, objectFit: 'contain' }} />;
}

export function Coin({ value, className = '' }: { value: number; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 tnum ${className}`}>
      <svg width="12" height="12" viewBox="0 0 7 7" shapeRendering="crispEdges" aria-hidden>
        <rect x="1" y="0" width="5" height="7" fill="#E2B94A" />
        <rect x="0" y="1" width="7" height="5" fill="#E2B94A" />
        <rect x="2" y="2" width="1" height="3" fill="#B08A2E" />
        <rect x="4" y="2" width="1" height="3" fill="#B08A2E" />
      </svg>
      {value.toLocaleString('ko-KR')}
    </span>
  );
}

export function ScreenHeader({ title, en, right, onBack }: { title: string; en: string; right?: ReactNode; onBack?: () => void }) {
  const go = useUI((s) => s.go);
  return (
    <header className="flex items-end justify-between gap-4 border-b rule pb-4" style={{ paddingTop: 'max(16px, var(--safe-top))' }}>
      <div className="flex items-end gap-4 min-w-0">
        <Btn variant="ghost" className="!px-2 !min-h-[40px] -ml-2" aria-label="뒤로" onClick={() => (onBack ? onBack() : go('title'))}>
          <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
            <path d="M11 3 5 9l6 6" stroke="currentColor" strokeWidth="1.8" fill="none" />
          </svg>
        </Btn>
        <div className="min-w-0">
          <div className="label">{en}</div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight truncate">{title}</h1>
        </div>
      </div>
      {right}
    </header>
  );
}

export function Toasts() {
  const toasts = useMeta((s) => s.toasts);
  return (
    <div className="fixed z-[90] flex flex-col gap-2 pointer-events-none" style={{ top: 'max(16px, var(--safe-top))', right: 16 }}>
      {toasts.map((t) => (
        <div key={t.id} className="toast-in panel px-4 py-3 min-w-[220px] border-l-2" style={{ borderLeftColor: 'var(--accent)' }}>
          <div className="label !text-[10px]" style={{ color: 'var(--accent)' }}>
            {t.title}
          </div>
          <div className="text-sm font-semibold mt-0.5">{t.body}</div>
        </div>
      ))}
    </div>
  );
}

export function Pips({ value, max, color = 'var(--ivory)' }: { value: number; max: number; color?: string }) {
  return (
    <span className="inline-flex gap-[3px]">
      {Array.from({ length: max }, (_, i) => (
        <span key={i} className="inline-block w-[7px] h-[7px]" style={{ background: i < value ? color : 'transparent', border: `1px solid ${i < value ? color : 'var(--rule2)'}` }} />
      ))}
    </span>
  );
}

export function StatRow({ k, v }: { k: string; v: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5 border-b rule text-sm">
      <span className="text-mute">{k}</span>
      <span className="tnum font-semibold">{v}</span>
    </div>
  );
}
