# פרומפט לשלב 0 — תשתית והעברה מ-ChessIt

```
אנחנו בונים את MathIt — אפליקציית ווב למובייל (PWA, עברית) ללימוד מתמטיקה לילדים
כמסע עם חידות ומיני-משחקים, בעולמות פיות / כדורגל / כדורסל / נינג׳ה, עם דגש חזק
על אנימציות וצלילים בתהליך הלמידה.
קרא את CLAUDE.md, docs/ARCHITECTURE.md ו-docs/ROADMAP.md לפני שאתה מתחיל.

הסטאק זהה ל-ChessIt (https://github.com/LiorHen9/ChessIt). שכפל אותו לקריאה
ועיין ב-CLAUDE.md שלו: שם מתועדים המבנה, המוסכמות ודרך הבדיקה כשה-npm חסום.

בצע את שלב 0 — תשתית והעברה מ-ChessIt, בריפו LiorHen9/MathIt:
1. Vite + TypeScript strict + Preact, אותן גרסאות כמו ב-ChessIt.
2. GitHub Actions שבונה ופורס ל-GitHub Pages (base path של MathIt).
3. PWA: manifest בעברית, אייקון זמני, עבודה אופליין. גופן Rubik מ-public/fonts.
4. העבר והתאם מ-ChessIt: src/app (App כמכונת מצבים, lazy, version, errorLog),
   src/storage/db.ts (עם SCHEMA_VERSION משלנו ומאגרים ריקים: meta, profiles),
   src/audio/speech.ts, src/components/Speak.tsx, ומנגנון ערכות הנושא
   (applyTheme + משתני CSS) כבסיס ל-src/worlds/.
5. dir="rtl", קובץ tokens ב-CSS, תמיכה ב-prefers-reduced-motion.
6. מסך פתיחה: שם האפליקציה, אנימציית כניסה קצרה (transform/opacity בלבד)
   וכפתור "בואו נתחיל" עם צליל קצר אחרי הנגיעה הראשונה.
7. תשתית בדיקות כמו ChessIt: tests/core/check.ts (bun) ו-tests/e2e/phase0.cjs
   (Playwright בגודל טלפון).
8. docs/ARCHITECTURE.md, docs/ROADMAP.md, CLAUDE.md בשורש, docs/prompts/.

תנאי סיום: הבנייה ובדיקת הטיפוסים עוברות, הפריסה ב-Actions הצליחה, הטעינה
הראשונה מתחת ל-300KB, והאתר עובד בדפדפן בגודל טלפון.
בסיום: עדכן את ROADMAP.md, תן לי את כתובת ה-Pages, כתוב פרומפט מפורט לשלב 1
(גם ב-docs/prompts/phase-1.md), והמלץ לנקות סשן.
```
