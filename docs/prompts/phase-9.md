אנחנו ממשיכים לבנות את MathIt — אפליקציית ווב למובייל (PWA, עברית) ללימוד מתמטיקה
לילדים כמסע עם חידות ומיני-משחקים, בעולמות פיות / כדורגל / כדורסל / נינג׳ה / קוביות / כוכבות הבמה, עם דגש
חזק על אנימציות וצלילים. ריפו: https://github.com/LiorHen9/MathIt
אתר: https://liorhen9.github.io/MathIt/
אח בכור: ChessIt (https://github.com/LiorHen9/ChessIt).

לפני שמתחילים: קרא את CLAUDE.md, docs/ARCHITECTURE.md (בעיקר פרקים 4, 5, 6, 7, 9, 10) ו-docs/ROADMAP.md.
שלבים 0–8 הושלמו (גרסה 0.9.0):
- Learning Core (src/core/): 17 מיומנויות עד כיתה ב׳ (SkillId ב-core/types.ts, SKILLS ב-core/skills/),
  מחוללים עם seed ו-ErrorTag לכל מסיח (14 סוגים, ERROR_TAGS), Answer = number | Sign | Time
  (answerKey/sameAnswer/answerText), Question.unit/prompts לפי תבנית, Actions מונפשים (ACTION_KINDS,
  ACTION_LIMITS, actionResult/actionValid), שיעור לכל מיומנות (core/lessons/). core/quest/ – 5 פרקים
  (chapter1.ts, chapters.ts; Node: lesson / practice{level, template} / chest / boss{tier} / review;
  QuestProgress.opened – פרק שהורה פתח). core/mastery/ – updateMastery, adaptLevel, dueSkills,
  commonError, invites/pickQuestion/sisterOf/makeAdaptiveRound, מבחן מיקום (LADDER של 22 שלבים,
  CHAPTER_RUNGS, IMPLIED), recommendByMastery, summarize.
- core/parents/ (שלב 8): PARENT_ERRORS – Record<ErrorTag, {m, f, tip}> (**כל ErrorTag חדש חייב
  ניסוח להורים**, הטיפוס אוכף), TEMPLATE_NAMES – Record של כל תבנית חוץ מ-Pop (**תבנית חדשה חייבת
  שם להורים**), skillsByChapter/practiceSkills (מיומנות נכנסת לפרק לפי התחנה הראשונה שלה),
  allowedTemplates/stationTemplate (משחקים שהורה כיבה), goal/days/journey.
- משחקים (games/, עצלים): Ask (+PromptCard), Pop, Jump, Build, Match, ClockSet, Shop; GameHost בוחר
  תבנית לסבב (roundTemplate מעל allowedTemplates), focus (סבב מכוון לטעות), Lesson, Chest, Boss
  (הבוס של העולם מתחזק לפי tier), QuestMap (פרק אחד בכל פעם, לשוניות, הליכה בין פרקים, מד יעד
  יומי, הצעת הפסקה), Home (תרגול חופשי), Placement, Collection, ואזור ההורים (ParentGate,
  ParentHome, ParentDashboard, ParentKidSettings, BackupPanel).
- manipulatives/ (עצלים): Counters, TenFrame, Combine, TakeAway, NumberLine, Compare, TensBlocks,
  DoubleFrame, LongLine, ClockAnim, CoinStack, CompareTens, Explainer – מעל timeline.ts (WAAPI,
  transform/opacity בלבד, ממשיכות לאט בתנועה מופחתת).
- משוב: fx/director.ts – planFor(event, world) טהור; 28 אירועים (FEEDBACK_TYPES, SAMPLE_EVENTS,
  TEACHING_TYPES, COMPANION_TYPES); World.fx לכל עולם; SoundPack לכל עולם; מוזיקה.
- שמירה: SCHEMA_VERSION 5 – meta (כולל parentLock, backup), profiles (כולל parent), skillStates,
  questProgress, inventory, sessions. storage/*.ts הם שכבת הגישה היחידה; normalize לכל רשומה.
  storage/backup.ts מגבה את כל המאגרים – **שדה או מאגר חדש: גם בגיבוי ובדגימה של
  tests/storage/check.ts** (הבדיקה נכשלת אם normalize מוסיף שדה שאין בדגימה).
- בדיקות: tests/core, tests/profiles, tests/storage, tests/worlds (bun), tests/e2e/phase0–8.cjs.
  הכול רץ ב-scripts/local-check.sh <scratchpad> (npm חסום; ר׳ CLAUDE.md; כ-20 דקות עם כל ה-e2e).
  האתר החי חסום מסביבת העבודה – בודקים שה-Actions הצליח (mcp github actions_list).
  שים לב: pkill עם המחרוזת של שרת הבדיקות בתוך אותה פקודה הורג את המעטפת – להריץ את השרת
  מסקריפט נפרד בתוך ה-scratchpad (סקריפט שמריץ python3 -m http.server ואז את ה-e2e), ולהריץ את
  כל ה-e2e ברקע (run_in_background) ולחכות להודעה.
  ל-e2e יש ווים: data-answer, data-template ו-data-common על .game, ?template=X לסבב בתבנית
  מסוימת, ?clockDays=N (או localStorage mathit-clock-days) לשעון מוזרק.

בצע את שלב 9 — כיתות ג׳–ו׳ + חידות. עבוד בסדר הזה, ודחוף/בדוק בסוף כל חלק (בנייה + בדיקות +
צילומי מסך שמסתכלים עליהם):

1. מחוללים (core/generators/, עם seed, ErrorTag לכל מסיח, רמות עם label להורים, בדיקה ב-1,000
   seeds לכל רמה): **כפל** (לוח הכפל לפי עמודות: 2/5/10 → 3/4 → 6–9, ואז דו-ספרתי × חד-ספרתי),
   **חילוק** (הפוך מכפל, בלי שארית ואז עם שארית), **חיבור וחיסור במאונך** (עד 1,000 ואז 10,000,
   עם הצגה במאונך ב-PromptCard), **שברים** (חלק משלם בציור, השוואת שברים עם אותו מכנה/מונה,
   שברים שווים, חיבור עם אותו מכנה), **עשרוניים** (עשיריות ומאיות, השוואה, חיבור), **היקף ושטח**
   (מלבן על רשת, צורות מורכבות פשוטות), **בעיות מילוליות** בכפל/חילוק דרך core/story.ts.
   Answer מקבל סוג חדש לשבר ({ n, d }) – answerKey/sameAnswer/answerText/isCorrect לכולו, ושבר
   שקול (2/4 = 1/2) נחשב נכון רק כשהשאלה אומרת זאת. עשרוניים בלי שגיאות נקודה צפה (לעבוד
   במאיות שלמות). ErrorTag חדשים לפי הצורך (למשל `times-as-plus`, `table-neighbor`,
   `remainder-dropped`, `bigger-denominator`, `decimal-as-whole`, `area-perimeter`) – כל אחד
   עם invites, ניסוח להורים ב-PARENT_ERRORS ורמז מונפש מתאים (pickHint).

2. אנימציות מלמדות (manipulatives/, עצלות, transform/opacity, צליל שמלמד דרך ה-director, ממשיכות
   לאט בתנועה מופחתת): **מערך** (שורות ועמודות שנבנות – כפל כחיבור חוזר, ואז הסיבוב 3×4 = 4×3),
   **חלוקה לקבוצות** (עצמים שעפים לצלחות, שארית נשארת בצד), **פיצה** (עיגול שנחתך לחלקים שווים,
   חלקים נצבעים; השוואה בין שתי פיצות), **מאונך** (ספרות שנכנסות לטורים, נשא/פריטה שעפים לעמודה
   הבאה), **רשת שטח** (משבצות שנמלאות שורה-שורה, הקו מסביב נמתח להיקף). Action חדשים ב-core
   (עם ACTION_LIMITS ו-actionResult), והסברים צעד-אחר-צעד במחוללים שמשתמשים בהם.

3. תבניות משחק (games/, עצלות, TemplateSkin לכל עולם, רכיבי מגע ≥ 48px): **פיצה (Slice)** – הילד
   חותך/צובע חלקים כדי לענות על שבר; **סדרות (Pattern)** – משלימים סדרה בגרירה/נגיעה (גם
   למיומנות pattern הקיימת ולסדרות כפל); **מהירות** אופציונלית ללוח הכפל (שעון עדין, בלי ענישה,
   אפשר לכבות באזור ההורים – כבר דרך blocked). templateFits לכל תבנית; TEMPLATE_IDS ו-TEMPLATE_NAMES
   מתעדכנים; roundTemplate/allowedTemplates ממשיכים לעבוד.

4. תחנות **חידה** במפה (Node חדש `puzzle` עם puzzleId, כוכבים כמו תחנה רגילה, ids יציבים):
   **ריבוע קסם** 3×3 (מספרים חסרים), **מאזניים** (משקל חסר), **מספר חסר** בתרגיל, **KenKen קטן**
   4×4. מחולל לכל חידה עם seed ובדיקת פתרון יחיד; מסך PuzzleHost עצל עם רמז, משוב דרך ה-director
   (אירועים חדשים לפי הצורך, למשל `puzzleSolved` – מיפוי בכל עולם + tests/worlds), ושמירה ב-questProgress
   (בלי סכמה חדשה אם אפשר; אם צריך – SCHEMA_VERSION 6 + מיגרציה + גיבוי + e2e מסכמה 5).

5. המפה: פרקים 6–9 (או כמה שיוצא טבעי) לכיתות ג׳–ו׳ – כפל וחילוק, מאונך, שברים ועשרוניים, היקף
   ושטח – כל פרק עם שיעורים, תרגולים ברמות עולות, חידות, תיבה ובוס (tier חדש), באנר לכל חלק ומשפט
   סיפור לכל פרק בכל עולם. journeyProblems עובר; פרקים 1–5 לא משתנים (ids יציבים).
   מבחן המיקום: LADDER ו-CHAPTER_RUNGS מתארכים (עדיין ≤ 10 שאלות; התחלה לפי גיל עד כיתה ו׳ –
   placementStart לפי AgeBand '8-9'/'10-12'); progressFromPlacement לכל הפרקים.

6. אזור ההורים עם התוכן החדש: הדשבורד מציג את הפרקים החדשים (skillsByChapter כבר כללי),
   PARENT_ERRORS לכל ErrorTag חדש, TEMPLATE_NAMES לכל תבנית חדשה, "לתרגל את זה" עובד גם על
   מיומנויות חדשות, ותחנות חידה נספרות במסע.

7. ביצועים: כל מחולל כבד, תבנית, manipulative, חידה ופרק נטענים בעצלות; טעינה ראשונה מתחת ל-300KB
   (היום כ-70KB).

8. בדיקות:
   - tests/core: כל מחולל חדש ב-1,000 seeds לכל רמה (תשובה נכונה, מסיחים ייחודיים, טווח, בלי
     שליליים, שבר מצומצם/שקול נכון, עשרוני בלי שגיאת נקודה צפה), Action חדשים, שיעורים, חידות
     (פתרון יחיד, seed זהה = חידה זהה), פרקים חדשים (מבנה, נגישות, שערי כוכבים), invites לכל
     ErrorTag חדש, מבחן מיקום מורחב ("יודע הכול" מגיע לבוס האחרון ב-≤ 10 שאלות, ילד כיתה ד׳ שיודע
     לוח כפל נוחת בפרק השברים), PARENT_ERRORS ו-TEMPLATE_NAMES מלאים.
   - tests/worlds: אירועים חדשים בכל עולם, TemplateSkin לכל תבנית חדשה בכל עולם, בוסים/סיפורים
     לפרקים החדשים, ניגודיות למשתני צבע חדשים.
   - tests/storage: אם נוסף שדה או מאגר – בדגימה ובגיבוי.
   - tests/e2e/phase9.cjs בטלפון 360px: סבב לכל תבנית חדשה עם תשובה נכונה ושגויה (רמז מונפש מהסוג
     הנכון), שיעור כפל עם מערך, פיצה שנחתכת, מאונך עם נשא, כל סוג חידה עד פתרון, מעבר מפרק 5 לפרק 6
     במפה, מבחן מיקום לילד כיתה ד׳, הורה מכבה את משחק המהירות והוא לא מופיע, דשבורד עם טעות חדשה
     בניסוח להורים, תנועה מופחתת, רק transform/opacity, מגע ≥ 48px, בלי גלילה הצידה, צילומים בבהיר
     ובכהה בשלושה עולמות לפחות.
   - phase0–8.cjs ממשיכים לעבור (לעדכן רק מה שבאמת השתנה, למשל מספר המיומנויות).

תנאי סיום: ילד בכיתות ג׳–ו׳ מוצא במסע כפל וחילוק, מאונך, שברים, עשרוניים, היקף ושטח וחידות, עם
שיעורים ואנימציות מלמדות ותבניות משחק חדשות בכל ששת העולמות; המנוע ואזור ההורים עובדים גם על
התוכן החדש. טעינה ראשונה מתחת ל-300KB. כל הבדיקות עוברות (scripts/local-check.sh), הפריסה ב-Actions
הצליחה.
בסיום: עדכן את docs/ROADMAP.md (וגם ARCHITECTURE אם משהו השתנה), כתוב פרומפט
מפורט לשלב 10 (גם ב-docs/prompts/phase-10.md), הצג אותו לי בגוש קוד, והמלץ לנקות סשן.
