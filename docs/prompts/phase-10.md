אנחנו ממשיכים לבנות את MathIt — אפליקציית ווב למובייל (PWA, עברית) ללימוד מתמטיקה
לילדים כמסע עם חידות ומיני-משחקים, בעולמות פיות / כדורגל / כדורסל / נינג׳ה / קוביות / כוכבות הבמה, עם דגש
חזק על אנימציות וצלילים. ריפו: https://github.com/LiorHen9/MathIt
אתר: https://liorhen9.github.io/MathIt/
אח בכור: ChessIt (https://github.com/LiorHen9/ChessIt).

לפני שמתחילים: קרא את CLAUDE.md, docs/ARCHITECTURE.md (בעיקר פרקים 4, 5, 6, 7, 8, 10, 11, 12) ו-docs/ROADMAP.md.
שלבים 0–9 הושלמו (גרסה 0.10.0):
- Learning Core (src/core/): 32 מיומנויות עד כיתה ו׳ (SkillId ב-core/types.ts, SKILLS ב-core/skills/),
  מחוללים עם seed ו-ErrorTag לכל מסיח (27 סוגים, ERROR_TAGS), Answer = number | Sign | Time | Frac
  (answerKey/sameAnswer/answerText/isCorrect; שבר שקול נכון רק כש-Question.equivalent; עשרוניים במאיות
  שלמות), Visual: dots/blocks/coins/clock/pizza/grid/column/hundred, Actions מונפשים (17 סוגים,
  ACTION_LIMITS, actionResult/actionValid), שיעור לכל מיומנות (core/lessons/), fracWords.
- core/quest/: 10 פרקים (chapter1.ts, chapters.ts, chapters6.ts; ids יציבים), Node: lesson / practice
  {level, template} / chest / boss{tier 1–10} / review / puzzle{puzzle, level}. core/puzzles/: ריבוע קסם,
  מאזניים, מספר חסר, KenKen 4×4 – makePuzzle(id, level, seed) עם פתרון יחיד, puzzleStars.
- core/mastery/: updateMastery, adaptLevel, dueSkills, commonError, invites/pickQuestion/sisterOf, מבחן מיקום
  (LADDER של 34, CHAPTER_RUNGS, IMPLIED, FIRST_JUMP 5 וחציית פערים), recommendByMastery, summarize.
- core/parents/: PARENT_ERRORS (כל ErrorTag), TEMPLATE_NAMES (כל תבנית חוץ מ-Pop), skillsByChapter,
  practiceSkills, allowedTemplates/stationTemplate, goal/days, journeyView (כולל puzzles).
- משחקים (games/, עצלים): Pop, Jump, Build, Match, ClockSet, Shop, Slice, Pattern, Speed; Ask + PromptCard
  (מאונך, שברים מוערמים דרך ui/MathText); GameHost (roundTemplate, focus, blocked), Lesson, Chest, Boss,
  PuzzleHost (+games/puzzles/), QuestMap (פרק בכל פעם, לשוניות), Home, Placement, Collection, אזור ההורים
  (ParentGate, ParentHome, ParentDashboard, ParentKidSettings, BackupPanel).
- manipulatives/ (עצלים, transform/opacity, ממשיכים לאט בתנועה מופחתת) – כולל ArrayAnim, ShareAnim,
  PizzaAnim, ColumnAnim, GridAnim, DecimalAnim.
- משוב: fx/director.ts – planFor(event, world); 31 אירועים (FEEDBACK_TYPES, SAMPLE_EVENTS, TEACHING_TYPES,
  COMPANION_TYPES), World.fx, SoundPack לכל עולם, מוזיקה.
- שמירה: SCHEMA_VERSION 5 (meta, profiles, skillStates, questProgress, inventory, sessions), storage/*.ts,
  normalize לכל רשומה, backup.ts – **שדה או מאגר חדש: גם בגיבוי ובדגימה של tests/storage/check.ts**.
- בדיקות: tests/core, tests/profiles, tests/storage, tests/worlds (bun), tests/e2e/phase0–9.cjs.
  הכול רץ ב-scripts/local-check.sh <scratchpad> (npm חסום; ר׳ CLAUDE.md). ה-CSS של chunks עצלים מצורף שם
  ל-main.css אחרי מדידת הטעינה הראשונה. האתר החי חסום מסביבת העבודה – בודקים שה-Actions הצליח (mcp github
  actions_list). pkill עם מחרוזת השרת בתוך אותה פקודה הורג את המעטפת – להריץ את השרת מסקריפט נפרד
  ב-scratchpad (python3 -m http.server ואז ה-e2e), ואת כל ה-e2e ברקע (run_in_background) ולחכות להודעה.
  ל-e2e יש ווים: data-answer/data-template/data-key/data-common על .game, ?template=X, ?puzzleSeed=N,
  data-solution על לוחות החידות, ?clockDays=N לשעון מוזרק, ו-ONLY=… ב-phase9.cjs להרצת חלקים.

בצע את שלב 10 — ליטוש והשקה (גרסה 1.0.0). עבוד בסדר הזה, ודחוף/בדוק בסוף כל חלק (בנייה + בדיקות +
צילומי מסך שמסתכלים עליהם):

1. מעברי מסכים: מעבר רך ואחיד בין כל המסכים (App) – transform/opacity בלבד, קצר (≤ 250ms), לא חוסם קלט,
   מתקצר לדהייה בתנועה מופחתת; כיוון שתואם RTL (קדימה = משמאל לימין? להחליט ולתעד ב-ARCHITECTURE).
   בלי קפיצת גלילה ובלי הבהוב של מסך ריק בזמן טעינת chunk (שלד/placeholder עדין).

2. הישגים: מאגר הישגים טהור ב-core (למשל core/achievements/: "10 תשובות ברצף", "בוס ראשון", "כל החידות
   בפרק", "שבוע של תרגול", "פרק שלם ב-3 כוכבים", "לוח הכפל נשלט"...) – פונקציה טהורה שמחשבת מה הושג
   מתוך skillStates/questProgress/sessions/inventory, ids יציבים, ניסוח לפי מין (byGender), אייקון לכל אחד.
   שמירה: אם צריך מאגר/שדה – SCHEMA_VERSION 6 + מיגרציה + גיבוי + בדיקת הגיבוי + e2e מסכמה 5. מסך
   "ההישגים שלי" (עצל, ליד "האוסף שלי"), והודעה חגיגית כשהישג נפתח (אירוע חדש `achievement` דרך ה-director,
   מיפוי בכל עולם + tests/worlds). בדשבורד ההורים – ההישגים של הילד.

3. חגיגות סוף פרק: אחרי ניצחון על בוס של פרק – חגיגה ארוכה (ניתנת לדילוג בנגיעה) עם הגיבור, הבוס הבורח,
   משפט סיפור לסיום הפרק בכל עולם (World.story.ends או דומה – לכל 10 הפרקים, משפט אחד), וסיכום (כוכבים,
   חידות, מטבעות). בסוף המסע (בוס פרק 10) – חגיגת סיום מסע ותעודה (מסך שאפשר לצלם/לשתף, SVG בצבעי העולם).

4. ביצועים בטלפון ישן: למדוד (Playwright עם CPU throttling ×4 ו-Slow 3G מדומה) את זמן הטעינה הראשונה ואת
   הפתיחה של המפה, סבב, שיעור וחידה; לתקן מה שמעל 2.5 שניות. להגביל חלקיקים במכשירים חלשים
   (navigator.hardwareConcurrency / deviceMemory), לוודא שאין דליפת אנימציות (document.getAnimations()
   חוזר לאפס אחרי מסך), ושהמפה (10 פרקים) נשארת קלה. טעינה ראשונה עדיין מתחת ל-300KB.

5. נגישות בכל המסכים ובכל העולמות: tests/e2e/a11y.cjs (אם אין – ליצור) שעובר על כל המסכים העיקריים בכל
   ששת העולמות, בהיר וכהה: ניגודיות (גם של משתני הצבע החדשים בפיצה/רשת/קנקן), שמות לכל כפתור, תפקידים
   (grid/role=button/aria-pressed), ניווט מקלדת ופוקוס נראה, aria-live למשוב, יעד מגע ≥ 48px, בלי גלילה הצידה
   ב-320px וב-360px, טקסט מוגדל (200%) לא שובר. לתקן כל מה שנמצא.

6. דף אודות ופרטיות (עצל, מההגדרות ומאזור ההורים): מה האפליקציה, שכל הנתונים מקומיים ואין שרת/מעקב, איך
   מגבים, קרדיטים (נכסים מקוריים, גופן Rubik), גרסה ותאריך בנייה. תמונת שיתוף (og:image) – SVG/PNG מקורי
   ב-public, meta og/twitter ב-index.html, ושיתוף האפליקציה (Web Share) מדף האודות.

7. גרסה 1.0.0: package.json, version.ts, manifest (שם, תיאור, צילומי מסך ל-manifest אם רלוונטי), Service
   Worker מתעדכן נכון (הודעה "יש גרסה חדשה"), README קצר בעברית.

8. בדיקות:
   - tests/core: הישגים (חישוב טהור מכל המאגרים, ids יציבים, ניסוח לפי מין, אף הישג לא נפתח מנתונים ריקים),
     סיפורי סוף פרק.
   - tests/worlds: האירועים החדשים בכל עולם, משפט סוף לכל פרק בכל עולם, ניגודיות.
   - tests/storage: אם נוסף שדה או מאגר – בדגימה ובגיבוי; גיבוי מסכמה 5 משוחזר.
   - tests/e2e/phase10.cjs בטלפון 360px: מעברי מסכים (רק transform/opacity, קצרים, לא חוסמים), הישג שנפתח
     בסבב אמיתי וחוגג פעם אחת, מסך ההישגים, חגיגת סוף פרק אחרי בוס (ודילוג), סיום מסע ותעודה, דף אודות
     ופרטיות, מדידת ביצועים מדומה בטלפון ישן (ספים מתועדים), תנועה מופחתת, מגע ≥ 48px, בלי גלילה הצידה,
     צילומים בבהיר ובכהה בשלושה עולמות לפחות; a11y.cjs בכל העולמות.
   - phase0–9.cjs ממשיכים לעבור (לעדכן רק מה שבאמת השתנה).

תנאי סיום: אפליקציה מלוטשת בגרסה 1.0.0 – מעברים רכים, הישגים, חגיגות סוף פרק ומסע, מהירה בטלפון ישן,
נגישה בכל המסכים ובכל העולמות, עם דף אודות ופרטיות ותמונת שיתוף. טעינה ראשונה מתחת ל-300KB. כל הבדיקות
עוברות (scripts/local-check.sh), הפריסה ב-Actions הצליחה.
בסיום: עדכן את docs/ROADMAP.md (וגם ARCHITECTURE אם משהו השתנה), כתוב פרומפט מפורט לשלב הבא (רעיונות
"אחרי ההשקה" ב-ROADMAP – למשל מצב חדר בין שני טלפונים; גם ב-docs/prompts/phase-11.md), הצג אותו לי בגוש
קוד, והמלץ לנקות סשן.
