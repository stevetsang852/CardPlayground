import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';

export function PackSeal({ tone, title, onOpen }: { tone: string; title: string; onOpen: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const origin = useRef<number | null>(null);
  const armed = useRef(false);
  const done = useRef(false);
  const [progress, setProgress] = useState(0);
  const [fromLeft, setFromLeft] = useState(true);
  const [open, setOpen] = useState(false);

  const finish = () => {
    if (done.current) return;
    done.current = true;
    setProgress(1);
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    const id = window.setTimeout(onOpen, 280);
    return () => window.clearTimeout(id);
  }, [open, onOpen]);

  const down = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (done.current) return;
    const el = ref.current;
    if (!el) return;
    const box = el.getBoundingClientRect();
    if ((event.clientY - box.top) / box.height > 0.42) return;
    armed.current = true;
    origin.current = event.clientX;
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      /* ignore */
    }
  };

  const move = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!armed.current || origin.current == null || done.current) return;
    const el = ref.current;
    if (!el) return;
    const delta = event.clientX - origin.current;
    const travel = Math.min(1, Math.abs(delta) / el.getBoundingClientRect().width);
    setFromLeft(delta >= 0);
    setProgress(travel);
    if (travel >= 0.72) finish();
  };

  const up = () => {
    armed.current = false;
    if (!done.current) setProgress(0);
  };

  const clip = fromLeft ? `inset(0 0 0 ${progress * 100}%)` : `inset(0 ${progress * 100}% 0 0)`;

  return (
    <div className="flex flex-col items-center gap-3 py-2">
      <p className="text-sm text-white">按住頂部，打橫掃開</p>
      <div
        ref={ref}
        className={`seal-pack ${tone} ${open ? 'is-open' : ''} ${progress > 0 ? 'is-hot' : ''}`}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        role="slider"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress * 100)}
        aria-label="打橫掃開卡包頂部"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            finish();
          }
        }}
      >
        <div className="seal-core" />
        <div
          className="seal-slit"
          style={{
            width: `${progress * 84}%`,
            left: fromLeft ? '8%' : 'auto',
            right: fromLeft ? 'auto' : '8%',
          }}
        />
        <div
          className="seal-flap"
          style={open ? undefined : { clipPath: clip, transform: `translateY(${-progress * 12}px)` }}
        />
        <div className="seal-line" />
        <span className="seal-mark">{title}</span>
        <span className="seal-finger" aria-hidden="true" />
      </div>
      <p className="text-xs text-atelier-muted">由左掃到右，或由右掃到左。掃夠頂部封條就會撕開。</p>
    </div>
  );
}
