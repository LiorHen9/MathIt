// The opening screen: the name, a short entrance animation (transform/opacity only) and
// "בואו נתחיל". The first sound plays on that tap – browsers allow audio only after a touch.
import { useEffect, useRef, useState } from 'preact/hooks';
import { playSfx } from '../audio/sfx';
import { reducedMotion } from '../fx/motion';
import { SpeakButton } from '../components/Speak';

/** The floating symbols around the title: what, where (% of the stage) and which colour. */
const BITS: { t: string; x: number; y: number; c: 1 | 2 | 3 | 4; r: number }[] = [
  { t: '1', x: 10, y: 14, c: 1, r: -12 },
  { t: '+', x: 80, y: 8, c: 2, r: 8 },
  { t: '3', x: 86, y: 58, c: 3, r: 10 },
  { t: '=', x: 6, y: 64, c: 4, r: -6 },
  { t: '2', x: 48, y: 2, c: 4, r: 4 },
  { t: '★', x: 30, y: 84, c: 1, r: 0 },
  { t: '5', x: 66, y: 86, c: 2, r: -10 }
];

const TITLE = 'MathIt';
const SUBTITLE = 'מסע בעולם החשבון';

export function Splash({ onStart }: { onStart: () => void }) {
  const [leaving, setLeaving] = useState(false);
  const timer = useRef<number>();
  useEffect(() => () => clearTimeout(timer.current), []);

  const start = () => {
    if (leaving) return;
    playSfx('start');
    setLeaving(true);
    // Let the button pop and the chime begin before the next screen (no wait with reduced motion).
    timer.current = window.setTimeout(onStart, reducedMotion() ? 0 : 520);
  };

  return (
    <main class={`screen splash ${leaving ? 'is-leaving' : ''}`}>
      <div class="splash-stage" aria-hidden="true">
        {BITS.map((b, i) => (
          <span
            key={i}
            class={`splash-bit num-${b.c}`}
            style={`--x:${b.x}%;--y:${b.y}%;--r:${b.r}deg;--d:${120 + i * 90}ms`}
          >
            <span class="splash-bit-float" style={`--f:${2.6 + (i % 3) * 0.5}s`}>
              {b.t}
            </span>
          </span>
        ))}
        <h1 class="splash-title" dir="ltr">
          {[...TITLE].map((ch, i) => (
            <span key={i} class={`splash-letter num-${(i % 4) + 1}`} style={`--d:${300 + i * 70}ms`}>
              {ch}
            </span>
          ))}
        </h1>
      </div>
      {/* The title is decorative letters; this is what screen readers hear. */}
      <h1 class="visually-hidden">MathIt – {SUBTITLE}</h1>
      <p class="splash-sub">
        {SUBTITLE} <SpeakButton text={`${SUBTITLE}. בואו נתחיל!`} class="speak-inline" />
      </p>
      <button type="button" class="btn btn-primary btn-big splash-go" onClick={start}>
        בואו נתחיל
      </button>
    </main>
  );
}
