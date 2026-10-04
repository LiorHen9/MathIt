אנחנו ממשיכים לבנות את MathIt — אפליקציית ווב למובייל (PWA, עברית) ללימוד מתמטיקה
לילדים כמסע עם חידות ומיני-משחקים, בעולמות פיות / כדורגל / כדורסל / נינג׳ה / קוביות / כוכבות הבמה, עם דגש
חזק על אנימציות וצלילים. ריפו: https://github.com/LiorHen9/MathIt
אתר: https://liorhen9.github.io/MathIt/

לפני שמתחילים: קרא את CLAUDE.md, docs/ARCHITECTURE.md (בעיקר פרקים 4.4, 5, 6.2–6.6, 9, 10)
ו-docs/ROADMAP.md. שלבים 0–4 הושלמו (גרסה 0.5.0):
- Learning Core (src/core/): 4 מיומנויות עם מחוללים, רמזים והסברים מונפשים (Action), שיעורים,
  round.ts. core/quest/: Journey → Chapter → Section → Node (lesson / practice{level} /
  chest{prize} / boss{skillIds, level, hits, bossId}), nodeStatus, lockReason, nextNode,
  chapterStars, withStars, progressFromSkills, journeyProblems. פרק 1: 16 תחנות, תיבה (needStars 10)
  ובוס "הבלבלן" (needStars 18).
- משוב: fx/director.ts – planFeedback(event, worldId) טהור, אחד לכל העולמות (העולם רק "צובע" את
  correct דרך flavor). אירועים: tap, correct, wrong, hint, starEarned, roundDone, count, jump, ten,
  whoosh, explain, explained, walk, step, unlock, locked, chestShake, chestOpen, bossAppear, bossHit,
  bossDodge, bossDefeated (TEACHING_TYPES, EXPLAIN_TYPES, COMPANION_TYPES). FxPlan: sound, soundOpts,
  hero, heroMs, motion (pop/shake/wobble/tremble/dodge), particles, fly. יומנים window.__mathitFx
  ו-window.__mathitSounds. audio/sfx.ts – סינתזה בסגנון ZzFX, צליל world-<id> לכל עולם.
- גיבור: fx/Hero.tsx, מצבים idle/think/happy/cheer/oops/walk/attack (walk ו-attack בסיסיים ומשותפים).
- מסכים: QuestMap (מסך ראשי; גיבור הולך על השביל, פיצוץ אור בפתיחה, "▶ קדימה", "🎯 תרגול
  חופשי" = Home), GameHost (quest: {nodeId, level}), Lesson (nodeId), Chest (מדבקה עפה למדף),
  Boss (פס כוח, מכות, התחמקות, ניצחון). screens/quest/art.tsx – תיבה ובוס ב-SVG ממשתני CSS.
- שמירה: SCHEMA_VERSION 3 – meta, profiles, skillStates, questProgress (רשומה לפרופיל: stars,
  chests{nodeId: prize}, at, revealed, last). ההמרה מ-skillStates קורית בקריאה הראשונה.
- בדיקות: tests/core, tests/profiles, tests/worlds (bun), tests/e2e/phase0–4.cjs. הכול רץ
  ב-scripts/local-check.sh <scratchpad> (npm חסום; ר׳ CLAUDE.md). האתר החי חסום מסביבת
  העבודה – בודקים שה-Actions הצליח, ואת האתר עצמו בטלפון. אחרי טעינה מחדש של הדף היומנים מתאפסים.

בצע את שלב 5 — עולמות במלואם (כל עולם נראה, נשמע ומרגיש אחר):

1. World.fx – מיפוי משוב לכל עולם מעל המיפוי המשותף: כל עולם יכול לדרוס את התוכנית של אירוע
   (צליל, חלקיקים, תנועה, אסימון שעף). planFeedback(event, worldId) נשאר טהור ומחזיר את התוכנית
   הממוזגת. דוגמאות: פיות – נצנוצים ופעמון, שובל קשת ברצף; כדורגל – כדור נכנס לרשת, קהל מריע,
   "גול!" ברצף; כדורסל – קשת וסוויש, הכדור "בוער" ברצף; נינג׳ה – שוריקן פוגע במטרה, עשן; קוביות –
   בלוק נכנס למקום, אבן חן נאספת; כוכבות הבמה – אקורד סינתי, זרקורים, שד צל נעלם. חלקיקים
   חדשים לפי עולם (סוג חלקיק ב-particles.ts: למשל leaf/spark/smoke/block/note), עדיין עם
   MAX_PARTICLES ובלי כלום בתנועה מופחתת.
2. SoundPack לכל עולם (docs/ARCHITECTURE.md §6.3): כל צליל ש-director מבקש עובר דרך חבילת העולם
   (tap, correct, wrong, hint, star, fanfare, step, unlock, chestOpen, hit, victory…), עם נפילה
   לצליל המשותף כשאין. "wrong" נשאר רך בכל העולמות (בלי באזר). צלילי ההוראה (count/jump/ten)
   נשארים זהים בכל העולמות – הם התוכן.
3. מוזיקה: audio/music.ts – סקוונסר קטן על Web Audio (תבנית תווים + תופים בסינתזה), לופ קצר לכל
   עולם בקובץ העולם, נטען בעצלות עם העולם, עוצמה נמוכה, יורד אוטומטית בזמן הקראה (speech.ts)
   וחוזר אחריה, מתחיל רק אחרי נגיעה, נעצר כשהגדרת "מוזיקה" כבויה (כבר קיימת בפרופיל) ובמסכים
   המשותפים. בלי מוזיקה בזמן הסבר/שיעור (או נמוכה מאוד) – להחליט ולתעד.
4. גיבור מלא לכל עולם: walk ו-attack בסגנון העולם (פיה מרחפת במקום ללכת, חלוץ בועט בכדור על
   הבוס, שחקן כדורסל מכדרר וזורק, נינג׳ה זורק שוריקן, בנאי מכה במכוש, זמרת שולחת גל צליל).
   תוספות ל-HeroDef (למשל walkStyle, attack prop/projectile). transform/opacity בלבד.
5. בוס לכל עולם (World.bosses, BossDef: שם לפי עולם, SVG מקורי ממשתני CSS, צבע/צורה) במקום
   "הבלבלן" המשותף: מכשפת הערפל (פיות), שוער ענק (כדורגל), אלוף ה-1 על 1 (כדורסל), מאסטר הצל
   (נינג׳ה), יצור מערות (קוביות), שד צל (כוכבות הבמה). אותה תחנה ואותו מנגנון (Boss.tsx), רק
   המראה, השם והצלילים מהעולם. נכסים מקוריים בלבד, בלי דמויות או מותגים קיימים.
6. עור מפה ועור Pop לכל עולם: MapSkin (רקע המפה – למשל דשא ומגרש, עננים וגינה, דוג׳ו, מערות,
   במה; צורת התחנות והשביל; סמלי הבאנרים) ו-TemplateSkin ל-Pop (בועות קסם / כדורים לשער /
   סלים / מטרות / בלוקים / זרקורים). רק משתני CSS ו-SVG; משתנה צבע חדש – בכל העולמות +
   בדיקת ניגודיות. סיפור קצר: משפט פתיחה לפרק ומשפט לבוס לכל עולם (מוקרא, משפט אחד לגיל 5–7).
7. מטבעות ואוסף: מאגר חדש (למשל inventory, key profileId:worldId → coins, collectibles) ⇒
   SCHEMA_VERSION 4 + מיגרציה מ-3 (ומ-1/2), מחיקה עם הפרופיל. מטבעות על תשובות נכונות / כוכבים
   (אירוע coin ב-director, מטבע עף למונה), פריטי אוסף לכל עולם (World.rewards) בתיבות ובבוס במקום
   המדבקה הסמלית (מי שכבר פתח תיבה בשלב 4 שומר את המדבקה). מסך "האוסף שלי" (lazy) מהמפה:
   מדפים לכל עולם, פריטים שהושגו וצלליות של מה שעוד לא. האוסף נשמר לכל עולם בנפרד.
8. placeholders לבעיות מילוליות: World.vocabulary ותמיכה בליבה (prompt עם {hero}, {item}…)
   שהעולם ממלא, בלי לשנות את המתמטיקה. לפחות מחולל אחד שמשתמש בזה (למשל חיבור/חיסור כסיפור),
   עם בדיקות (בכל עולם הטקסט מלא, בלי {…} שנשארו, ניטרלי מבחינת מין או דרך byGender).
9. בדיקות: tests/worlds/check.ts – כל אירוע ממופה בכל עולם (צליל אמיתי מהחבילה, מצב גיבור), כל
   SoundPack מלא ותקין, לופ מוזיקה תקין (תווים בטווח, אורך), כל עולם עם בוס, MapSkin ו-TemplateSkin,
   ניגודיות לכל משתנה חדש; tests/core – placeholders; tests/e2e/phase5.cjs בטלפון 360px – אותו
   פרק בשישה עולמות: תשובה נכונה עם המשוב של העולם (יומן __mathitFx: world, sound, particles),
   הגיבור הולך ותוקף בסגנון העולם, בוס של העולם, מוזיקה מתחילה אחרי נגיעה ויורדת בהקראה (יומן
   מוזיקה לבדיקות, למשל window.__mathitMusic), מטבעות עפים ונשמרים אחרי רענון, מסך האוסף,
   מיגרציה מסכמה 3; תנועה מופחתת; רק transform/opacity; מגע ≥ 48px; בלי גלילה הצידה; צילומי
   מסך של המפה, משחק ובוס בכל עולם, בבהיר ובכהה. phase0–4.cjs ממשיכים לעבור (לעדכן מה שבאמת
   השתנה, למשל SCHEMA_VERSION ושם הבוס).

תנאי סיום: אותו פרק בשישה עולמות שונים לגמרי – מראה, צלילים, מוזיקה, גיבור ובוס – וכל המשוב
עובד בכולם (בדיקה אוטומטית). טעינה ראשונה עדיין מתחת ל-300KB (מוזיקה, עורות ובוסים בעצלות, עם
העולם). כל הבדיקות עוברות (scripts/local-check.sh), הפריסה ב-Actions הצליחה.
בסיום: עדכן את docs/ROADMAP.md (וגם ARCHITECTURE אם משהו השתנה), כתוב פרומפט
מפורט לשלב 6 (גם ב-docs/prompts/phase-6.md), הצג אותו לי בגוש קוד, והמלץ לנקות סשן.
