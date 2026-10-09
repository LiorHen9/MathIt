אנחנו ממשיכים לבנות את MathIt — אפליקציית ווב למובייל (PWA, עברית) ללימוד מתמטיקה
לילדים כמסע עם חידות ומיני-משחקים, בעולמות פיות / כדורגל / כדורסל / נינג׳ה / קוביות / כוכבות הבמה, עם דגש
חזק על אנימציות וצלילים. ריפו: https://github.com/LiorHen9/MathIt
אתר: https://liorhen9.github.io/MathIt/
אח בכור: ChessIt (https://github.com/LiorHen9/ChessIt) – יש בו מצב חדר עובד בין שני טלפונים (שלב 6 שלו).

לפני שמתחילים: קרא את CLAUDE.md, docs/ARCHITECTURE.md (בעיקר פרקים 2, 6.4, 6.7, 6.8, 8, 9, 10, 12) ו-docs/ROADMAP.md.
ב-ChessIt קרא את docs/ARCHITECTURE.md (החדרים), docs/FIREBASE.md, src/net/ (transport.ts, firebase.ts, local.ts,
room.ts, openRoom.ts, qr.ts, rules.ts, config.ts), src/screens/RoomScreen.tsx + RoomGame.tsx + room.css,
firebase/database.rules.json, scripts/cleanup-rooms.mjs + .github/workflows/cleanup-rooms.yml, tests/net/
(check.ts, mock-firebase.ts) ו-tests/e2e/phase6.cjs (שני דפים, ?transport=local, השרת המדומה, פענוח QR).

שלבים 0–10 הושלמו (גרסה 1.0.0 – ההשקה):
- Learning Core (src/core/): 32 מיומנויות עד כיתה ו׳, מחוללים עם seed (makeQuestion/makeRound(skill, level,
  seed)), ErrorTag לכל מסיח, Answer = number | Sign | Time | Frac (answerKey/sameAnswer), שיעורים, 10 פרקים
  (core/quest), חידות, מנוע שליטה ומבחן מיקום (core/mastery), אזור הורים (core/parents), הישגים
  (core/achievements: 20, ids יציבים ב-ids.ts, achieved/newlyAchieved, שלוש צורות לפי מין).
- משחקים (games/, עצלים): Ask + PromptCard, Pop, Jump, Build, Match, ClockSet, Shop, Slice, Pattern, Speed;
  GameHost, Lesson, Chest, Boss (data-answer לבדיקות), PuzzleHost, QuestMap, Home, Placement, Collection,
  Achievements, ChapterEnd, Finale (+certificate.ts), About, אזור ההורים.
- משוב: fx/director.ts – 34 אירועים (FEEDBACK_TYPES, SAMPLE_EVENTS), World.fx לכל עולם, SoundPack, מוזיקה;
  fx/particles.ts עם lowEnd()/particleCap() לטלפון חלש.
- App (app/App.tsx): מכונת מצבים; setScreen טוען את ה-chunk מראש (lazy().preload), מעבר של 200ms בכיוון RTL
  (DEPTH לכל מסך – מסך חדש צריך מקום ב-DEPTH, ב-CHUNKS וב-CALM_SCREENS אם מתאים), תור תגי הישגים
  (progressChanged → checkAchievements), "יש גרסה חדשה" (app/updates.ts).
- שמירה: SCHEMA_VERSION 6 (meta, profiles, skillStates, questProgress, inventory, sessions, achievements),
  storage/*.ts עם normalize לכל רשומה, backup.ts – **שדה או מאגר חדש: גם בגיבוי ובדגימה של
  tests/storage/check.ts**; storage/changes.ts – אות "ההתקדמות השתנתה".
- בדיקות: tests/core, tests/profiles, tests/storage, tests/worlds, tests/app (bun), tests/e2e/phase0–10.cjs ו-
  a11y.cjs (כל המסכים בכל העולמות, בהיר וכהה; גם מודול – checkScreen – לבדיקות אחרות). הכול רץ ב-
  scripts/local-check.sh <scratchpad> (npm חסום; ר׳ CLAUDE.md; phase10.cjs מגיש את dist בעצמו עם gzip על פורט
  4175 למדידת טלפון ישן). האתר החי חסום מסביבת העבודה – בודקים שה-Actions הצליח. pkill/grep עם מחרוזת
  השרת בתוך אותה פקודה הורג את המעטפת – להריץ שרתים מסקריפט נפרד ב-scratchpad, ואת כל ה-e2e ברקע
  (nohup … &) ולבדוק את הקובץ.

בצע את שלב 11 — מצב חדר: קרב חשבון בין שני טלפונים (גרסה 1.1.0). עבוד בסדר הזה, ודחוף/בדוק בסוף כל חלק
(בנייה + בדיקות + צילומי מסך שמסתכלים עליהם):

1. רשת (src/net/, מ-ChessIt, מותאם): Transport (Firebase REST + EventSource בלי SDK; local בין לשוניות עם
   ?transport=local; שרת מדומה ?db=http://localhost:9010 רק ב-localhost), RoomDoc והודעות עם parse קפדני,
   קוד חדר (אלפבית בלי אותיות מתבלבלות), QR (מימוש משלנו כמו ב-ChessIt), RoomClient (יצירה, הצטרפות, נוכחות,
   יציאה, חדר שננטש), כללי Firebase ב-TS + firebase/database.rules.json (כל שינוי – בשניהם, ולבקש ממני
   להדביק מחדש), config.ts. docs/FIREBASE.md בעברית למשתמש (הקמת פרויקט, הכללים, כתובת ה-DB). ניקוי חדרים
   ישנים: scripts/cleanup-rooms.mjs + workflow מתוזמן (סוד FIREBASE_SERVICE_ACCOUNT). אם אין עדיין DB – הכול
   עובד מול local והשרת המדומה, ומסך החדר אומר בעדינות שהחדרים עוד לא הוגדרו.

2. מסך החדר (עצל, מהמפה – "⚔️ קרב חשבון" – ומ"מי משחק?"): יצירת חדר (קוד גדול + QR), הצטרפות בהקלדת קוד
   או בסריקה (קישור עם ?room=), חדר המתנה עם שני השחקנים (אווטאר, שם, עולם – כל אחד רואה את השני בצבעי
   העולם שלו), בחירת נושא מתוך מה ששניהם פתחו (או "הפתעה"), יציאה בכל רגע. כל צליל/אנימציה דרך ה-director
   (אירועים חדשים: roomJoin, duelStart, duelPoint, duelWin, duelLose – מיפוי בכל עולם + tests/worlds).

3. הקרב: אותן שאלות בשני הטלפונים מ-seed משותף (makeRound), 10 שאלות; מי שעונה נכון ראשון לוקח את הנקודה
   (השני רואה "כמעט!" ואת התשובה), טעות לא מורידה נקודות אלא נועלת את השחקן לשנייה; פס ניקוד חי, סמלי רגש
   (בלי צ׳אט), שעון מקומי בלבד – ההכרעה לפי סדר ההגעה ל-DB (חותמת שרת) ולא לפי שעון הטלפון. **התאמת רמה**:
   לכל שחקן הרמה שלו באותה מיומנות (אח גדול מול אח קטן – שאלות שונות באותו נושא, אותו מספר), והורה יכול
   לבטל ולשחק "שווה בשווה". סוף: חגיגה למנצח, תבוסה עדינה ("כמעט! עוד קרב?"), "עוד קרב" עם אותו חדר. כל
   תשובה נשמרת במנוע השליטה (recordAnswer) כמו בכל סבב, ומטבעות לשניהם. הישגים חדשים לקרב (למשל "קרב
   ראשון", "5 ניצחונות") – ids חדשים ב-ids.ts, בלי לשנות קיימים; אם צריך מונה – בשדה ברשומת achievements
   (normalize + גיבוי + בדיקת הגיבוי; SCHEMA_VERSION רק אם נדרש מאגר/מפתח חדש).

4. פרטיות ובטיחות: בחדר עוברים רק שם, אווטאר, מין (לפנייה נכונה), עולם, רמה, תשובות וסמלי רגש. בלי צ׳אט,
   בלי מיקום. החדר נמחק כששני השחקנים יוצאים, וחדר שננטש – בניקוי. עדכון דף האודות (פסקת החדר), והגדרת
   הורים "חדרים כבויים" לכל ילד (Profile.parent, normalize, גיבוי). בלי חיבור – הודעה ברורה, בלי קריסה.

5. גרסה 1.1.0: package.json, version, README (פסקה על הקרב), ARCHITECTURE (פרק חדרים), ROADMAP.

6. בדיקות:
   - tests/net/check.ts (חדש, bun): קוד חדר, parse של כל הודעה (תקינות + 15 הודעות פגומות), הכללים מול
     מסמכים מותרים/אסורים, QR (מקודד ומפוענח), seed משותף → אותן שאלות, הכרעה לפי סדר הגעה.
   - tests/core: התאמת הרמה בקרב, ההישגים החדשים (ids יציבים, כלום מנתונים ריקים).
   - tests/worlds: האירועים החדשים בכל עולם.
   - tests/storage: אם נוסף שדה – בדגימה ובגיבוי.
   - tests/e2e/phase11.cjs בטלפון 360px: שני דפים באותו הקשר עם ?transport=local – יצירה, הצטרפות בקוד,
     קרב שלם (נקודה לכל אחד, "כמעט!", נעילה אחרי טעות, ניקוד חי, סמל רגש), ניצחון ותבוסה, "עוד קרב",
     יציאה באמצע (השני רואה שהחבר יצא), הורה שכיבה חדרים; מול השרת המדומה (bun tests/net/mock-firebase.ts
     על 9010) – יצירה והצטרפות ב-QR (פענוח עם python3 + cv2), נפילת רשת והתאוששות; תנועה מופחתת, מגע ≥ 48px,
     בלי גלילה הצידה, checkScreen מ-a11y.cjs על מסכי החדר, צילומים בבהיר ובכהה בשלושה עולמות.
   - a11y.cjs: להוסיף את מסכי החדר. phase0–10.cjs ממשיכים לעבור (לעדכן רק מה שבאמת השתנה).

תנאי סיום: שני ילדים בשני טלפונים יוצרים חדר בקוד או ב-QR ומשחקים קרב חשבון חי, כל אחד ברמה שלו ובעולם
שלו, עם משוב מלא, ניקוד הוגן לפי סדר ההגעה ופרטיות מלאה; בלי Firebase מוגדר הכול עובד מול local והשרת
המדומה. גרסה 1.1.0. כל הבדיקות עוברות (scripts/local-check.sh), הפריסה ב-Actions הצליחה.
בסיום: עדכן את docs/ROADMAP.md (וגם ARCHITECTURE אם משהו השתנה), כתוב פרומפט מפורט לשלב הבא (רעיונות
"אחרי ההשקה" ב-ROADMAP – למשל עולם חדש או אתגר יומי משפחתי; גם ב-docs/prompts/phase-12.md), הצג אותו לי בגוש
קוד, והמלץ לנקות סשן.
