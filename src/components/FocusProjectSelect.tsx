import { useEffect, useRef, useState } from 'react';

interface Props {
  options: string[];
  value: string | null;
  onChange: (value: string | null) => void;
  allLabel: string;
  ariaLabel: string;
}

export default function FocusProjectSelect({ options, value, onChange, allLabel, ariaLabel }: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent): void => {
      if (!rootRef.current) return;
      const target = event.target as Node | null;
      if (target && !rootRef.current.contains(target)) {
        setOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('keydown', handleEscape);
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  const selectValue = (nextValue: string | null): void => {
    onChange(nextValue);
    setOpen(false);
  };

  const currentLabel = value ?? allLabel;

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((previous) => !previous)}
        className="flex w-full items-center justify-between gap-2 rounded-xl border border-cyan-300/20 bg-white/[0.04] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none transition hover:border-primary-400/70"
      >
        <span className="truncate">{currentLabel}</span>
        <span
          className={`text-xs text-[var(--color-text-secondary)] transition-transform ${
            open ? 'rotate-180' : ''
          }`}
        >
          ▼
        </span>
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-50 overflow-hidden rounded-xl border border-cyan-300/20 bg-[linear-gradient(160deg,rgba(15,23,42,0.92),rgba(8,47,73,0.52))] shadow-[0_20px_50px_rgba(2,6,23,0.6)] backdrop-blur-xl">
          <button
            type="button"
            role="option"
            aria-selected={value === null}
            onClick={() => selectValue(null)}
            className={`w-full border-b border-cyan-300/10 px-3 py-2 text-left text-sm transition ${
              value === null
                ? 'bg-primary-400/20 text-primary-300'
                : 'text-[var(--color-text-secondary)] hover:bg-white/[0.08] hover:text-[var(--color-text-primary)]'
            }`}
          >
            {allLabel}
          </button>
          <div role="listbox" className="ui-scrollbar max-h-60 overflow-y-auto">
            {options.map((option) => {
              const selected = value === option;
              return (
                <button
                  key={option}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => selectValue(option)}
                  className={`w-full px-3 py-2 text-left text-sm transition ${
                    selected
                      ? 'bg-primary-400/20 text-primary-300'
                      : 'text-[var(--color-text-secondary)] hover:bg-white/[0.08] hover:text-[var(--color-text-primary)]'
                  }`}
                >
                  {option}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
