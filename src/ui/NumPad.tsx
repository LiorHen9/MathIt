// A big number pad of our own (docs/ARCHITECTURE.md §11): the phone's keyboard is small, covers
// the screen and is different on every phone. Keys are at least 56px, laid out left to right
// like a calculator (dir="ltr" inside the RTL app), with delete and "check".
// Every key gives touch feedback through the Feedback Director (a click that rises a little
// with the digit, and a pop); a physical keyboard works too (digits, Backspace, Enter).
import { useEffect, useRef } from 'preact/hooks';
import { emit } from '../fx/director';

interface Props {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  maxLength?: number;
  disabled?: boolean;
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'del', '0', 'ok'] as const;

export function NumPad({ value, onChange, onSubmit, maxLength = 2, disabled = false }: Props) {
  const root = useRef<HTMLDivElement>(null);
  // The latest props, for the keyboard listener.
  const latest = useRef({ value, onChange, onSubmit, maxLength, disabled });
  latest.current = { value, onChange, onSubmit, maxLength, disabled };

  function press(k: (typeof KEYS)[number], el: Element | null) {
    const { value: v, onChange: change, onSubmit: submit, maxLength: max, disabled: off } = latest.current;
    if (off) return;
    if (k === 'ok') {
      if (v) submit();
      return;
    }
    if (k === 'del') {
      emit({ type: 'tap' }, { el });
      change(v.slice(0, -1));
      return;
    }
    emit({ type: 'tap', key: Number(k) }, { el });
    // A leading zero is replaced ("0" then "7" → "7").
    const next = v === '0' ? k : v + k;
    change(next.length > max ? v : next);
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      const k = /^[0-9]$/.test(e.key) ? e.key : e.key === 'Backspace' ? 'del' : e.key === 'Enter' ? 'ok' : null;
      if (!k) return;
      e.preventDefault();
      press(k as (typeof KEYS)[number], root.current?.querySelector(`[data-key="${k}"]`) ?? null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div class="numpad" dir="ltr" ref={root} role="group" aria-label="מקלדת מספרים">
      {KEYS.map((k) => (
        <button
          type="button"
          key={k}
          class={`numpad-key ${k === 'ok' ? 'is-ok' : k === 'del' ? 'is-del' : ''}`}
          data-key={k}
          aria-label={k === 'del' ? 'מחיקה' : undefined}
          disabled={disabled || (k === 'ok' && !value) || (k === 'del' && !value)}
          onClick={(e) => press(k, e.currentTarget)}
        >
          {k === 'del' ? '⌫' : k === 'ok' ? 'בדוק ✓' : k}
        </button>
      ))}
    </div>
  );
}
