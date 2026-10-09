// About and privacy (phase 10, after ChessIt's): what MathIt is, the version and the day it was built,
// privacy in plain words – everything stays on this phone, no server, no account, no tracking –
// how to keep a backup, credits (our own art, sounds and music; the Rubik font; Preact), sharing
// the app with another family (the phone's share sheet, or copying the link), and "found a
// problem?" (details to copy, sent nowhere). Opened from the settings and from the parents' area;
// the neutral base look; loaded lazily.
import { useEffect, useState } from 'preact/hooks';
import { APP_VERSION, BUILD_TIME, COMMIT, versionLabel } from '../app/version';
import { clearErrorLog, readErrorLog, type ErrorEntry } from '../app/errorLog';
import { listProfiles } from '../profiles/profiles';
import { playSfx } from '../audio/sfx';
import '../ui/phase10.css';

export const SITE_URL = 'https://liorhen9.github.io/MathIt/';
export const REPO_URL = 'https://github.com/LiorHen9/MathIt';

interface Props {
  backLabel: string;
  onBack: () => void;
}

const CREDITS: { name: string; what: string; licence: string; url?: string }[] = [
  { name: 'MathIt', what: 'האפליקציה עצמה, קוד פתוח', licence: 'GPL-3.0', url: REPO_URL },
  { name: 'גיבורים, בוסים, צלילים ומוזיקה', what: 'מקוריים, נוצרו בשביל MathIt (בלי דמויות, קבוצות או שחקנים אמיתיים)', licence: 'GPL-3.0' },
  { name: 'Rubik', what: 'הגופן', licence: 'SIL OFL 1.1', url: 'https://github.com/googlefonts/rubik' },
  { name: 'Preact', what: 'בניית המסכים', licence: 'MIT', url: 'https://preactjs.com' },
  { name: 'ChessIt', what: 'האח הבכור: פרופילים, גיבוי והקראה', licence: 'GPL-3.0', url: 'https://github.com/LiorHen9/ChessIt' }
];

/** The details for a problem report: the app and the phone, and recent errors. No names. */
async function reportText(errors: ErrorEntry[]): Promise<string> {
  // English labels: Hebrew mixed into left-to-right lines comes out scrambled in messages.
  const yn = (b: boolean) => (b ? 'yes' : 'no');
  let installed = false;
  try {
    installed = matchMedia('(display-mode: standalone)').matches;
  } catch {
    // unknown
  }
  const lines = [
    `MathIt ${APP_VERSION}${COMMIT ? ` (${COMMIT})` : ''}${BUILD_TIME ? `, built ${BUILD_TIME.slice(0, 16).replace('T', ' ')}` : ''}`,
    `Device: ${navigator.userAgent}`,
    `Screen: ${screen.width}x${screen.height}, window ${innerWidth}x${innerHeight}, DPR ${devicePixelRatio}`,
    `Installed: ${yn(installed)} · Online: ${yn(navigator.onLine)} · Profiles: ${(await listProfiles()).length}`,
    errors.length ? `Recent errors (${errors.length}):` : 'Recent errors: none'
  ];
  for (const e of errors.slice(-10).reverse()) lines.push(`- ${new Date(e.at).toISOString().slice(5, 16).replace('T', ' ')} ${e.message}${e.where ? ` @ ${e.where}` : ''}${e.count > 1 ? ` x${e.count}` : ''}`);
  return lines.join('\n');
}

async function copy(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.cssText = 'position:fixed;inset-inline-start:-9999px;top:0';
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try {
      ok = document.execCommand('copy');
    } catch {
      ok = false;
    }
    ta.remove();
    return ok;
  }
}

export function About({ backLabel, onBack }: Props) {
  const [errors, setErrors] = useState<ErrorEntry[]>([]);
  const [report, setReport] = useState('');
  const [note, setNote] = useState<{ what: 'share' | 'report'; ok: boolean } | null>(null);

  async function refresh() {
    const errs = await readErrorLog();
    setErrors(errs);
    setReport(await reportText(errs));
  }
  useEffect(() => {
    void refresh();
  }, []);

  const canShare = typeof navigator.share === 'function';
  async function shareApp() {
    playSfx('tap');
    const text = 'MathIt – לומדים חשבון בעברית כמסע עם משחקים, חידות ובוסים. בלי פרסומות ובלי הרשמה:';
    if (canShare) {
      try {
        await navigator.share({ title: 'MathIt – מסע בעולם החשבון', text, url: SITE_URL });
        setNote({ what: 'share', ok: true });
      } catch {
        // Cancelled: nothing to say.
      }
    } else setNote({ what: 'share', ok: await copy(SITE_URL) });
  }

  return (
    <main class="screen about" data-testid="about">
      <header class="topbar">
        <button
          type="button"
          class="btn btn-ghost btn-back"
          data-testid="about-back"
          onClick={() => {
            playSfx('tap');
            onBack();
          }}
        >
          <span aria-hidden="true">→</span> {backLabel}
        </button>
        <h1 class="topbar-title">אודות ופרטיות</h1>
        <span />
      </header>

      <section class="about-hero">
        <img class="about-logo" src="favicon.svg" alt="" width="72" height="72" />
        <p class="about-name">MathIt</p>
        <p class="about-lead">מסע בעולם החשבון, בעברית.</p>
        <p class="settings-note">
          לומדים ומתרגלים חשבון מהמנייה הראשונה (גן חובה) ועד שברים, עשרוניים ושטח (כיתה ו׳): שיעורים מונפשים, משחקים, חידות ובוסים, בשישה עולמות. כל ילד בקצב שלו.
        </p>
        <p class="about-version" data-testid="about-version">
          גרסה <bdi dir="ltr">{versionLabel()}</bdi>
          {COMMIT && (
            <>
              {' '}
              · <bdi dir="ltr">{COMMIT}</bdi>
            </>
          )}
        </p>
        <button type="button" class="btn btn-primary" data-testid="share-app" onClick={() => void shareApp()}>
          📤 {canShare ? 'שיתוף האפליקציה' : 'העתקת הקישור לאפליקציה'}
        </button>
        <p class={`feedback ${note?.what === 'share' ? (note.ok ? 'is-good' : 'is-bad') : ''}`} role="status" data-testid="share-note">
          {note?.what === 'share' ? (note.ok ? (canShare ? '✓ שותף. תודה!' : '✓ הקישור הועתק.') : `אפשר להעתיק את הקישור: ${SITE_URL}`) : ''}
        </p>
      </section>

      <section class="settings-section" aria-labelledby="privacy-title" data-testid="about-privacy">
        <h2 class="section-title" id="privacy-title">
          🔒 פרטיות, בקצרה
        </h2>
        <ul class="about-list">
          <li>
            <strong>הכול נשמר רק בטלפון הזה:</strong> פרופילים, כוכבים, מטבעות, הישגים והגדרות. אין הרשמה, אין חשבון ואין שרת שאוסף נתונים.
          </li>
          <li>
            <strong>בלי פרסומות, בלי מעקב ובלי אנליטיקס.</strong> האפליקציה לא שולחת לאף אחד מה עושים בה.
          </li>
          <li>
            <strong>הקוד, הגופן והצלילים</strong> נטענים מהאתר של MathIt עצמו (GitHub Pages) ולא משירותים אחרים. אחרי הפעם הראשונה הכול עובד גם בלי אינטרנט.
          </li>
          <li>
            <strong>יומן שגיאות קטן</strong> נשמר בטלפון כדי לעזור בדיווח על בעיה. הוא לא נשלח לשום מקום, אלא אם מעתיקים אותו בעצמכם.
          </li>
        </ul>
      </section>

      <section class="settings-section" aria-labelledby="backup-title">
        <h2 class="section-title" id="backup-title">
          💾 איך מגבים
        </h2>
        <p class="settings-note">
          כי הכול נשמר רק בטלפון, ניקוי של הדפדפן או טלפון חדש מוחקים את ההתקדמות. לכן כדאי לגבות מדי פעם: <strong>אזור ההורים ← גיבוי ← שמירת קובץ גיבוי</strong>. בטלפון החדש בוחרים את הקובץ באותו מקום (או ב"יש לנו גיבוי" בפתיחה הראשונה), וכל המשפחה חוזרת.
        </p>
      </section>

      <section class="settings-section" aria-labelledby="credits-title">
        <h2 class="section-title" id="credits-title">
          🙏 תודות ורישיונות
        </h2>
        <ul class="credits">
          {CREDITS.map((c) => {
            const body = (
              <>
                <span class="credit-name">{c.name}</span>
                <span class="credit-what">{c.what}</span>
                <span class="credit-licence">
                  <bdi dir="ltr">{c.licence}</bdi>
                </span>
              </>
            );
            return (
              <li key={c.name}>
                {c.url ? (
                  <a href={c.url} target="_blank" rel="noopener" class="credit">
                    {body}
                  </a>
                ) : (
                  <span class="credit">{body}</span>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <section class="settings-section" aria-labelledby="report-title" data-testid="about-report">
        <h2 class="section-title" id="report-title">
          🐞 מצאתם בעיה?
        </h2>
        <p class="settings-note">נשמח לשמוע מה עשיתם, מה קרה ומה ציפיתם שיקרה. לדיווח מצרפים את פרטי הגרסה והמכשיר (בלי שמות ובלי נתונים אישיים):</p>
        <pre class="report-box" dir="ltr" tabIndex={0} aria-label="פרטי הגרסה והמכשיר" data-testid="report-text">
          {report}
        </pre>
        <div class="row">
          <button
            type="button"
            class="btn btn-secondary"
            data-testid="report-copy"
            onClick={async () => {
              playSfx('tap');
              setNote({ what: 'report', ok: await copy(report) });
            }}
          >
            📋 העתקת הפרטים
          </button>
          {errors.length > 0 && (
            <button
              type="button"
              class="btn btn-ghost"
              onClick={async () => {
                await clearErrorLog();
                await refresh();
              }}
            >
              ניקוי יומן השגיאות
            </button>
          )}
        </div>
        <p class={`feedback ${note?.what === 'report' ? (note.ok ? 'is-good' : 'is-bad') : ''}`} role="status">
          {note?.what === 'report' ? (note.ok ? '✓ הועתק. עכשיו מדביקים בהודעה.' : 'לא הצלחנו להעתיק. אפשר לסמן את הטקסט ולהעתיק ידנית.') : ''}
        </p>
        <p class="settings-note">
          לאן לשלוח: למי ששלח לכם את הקישור, או{' '}
          <a href={`${REPO_URL}/issues/new`} target="_blank" rel="noopener" class="inline-link">
            דיווח ב-GitHub
          </a>
          .
        </p>
      </section>
    </main>
  );
}
