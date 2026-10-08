אנחנו ממשיכים לבנות את MathIt — אפליקציית ווב למובייל (PWA, עברית) ללימוד מתמטיקה
לילדים כמסע עם חידות ומיני-משחקים, בעולמות פיות / כדורגל / כדורסל / נינג׳ה / קוביות / כוכבות הבמה, עם דגש
חזק על אנימציות וצלילים. ריפו: https://github.com/LiorHen9/MathIt
אתר: https://liorhen9.github.io/MathIt/
אח בכור: ChessIt (https://github.com/LiorHen9/ChessIt) – משם מעבירים את הכניסה המוגנת, הגיבוי והייבוא.

לפני שמתחילים: קרא את CLAUDE.md, docs/ARCHITECTURE.md (בעיקר פרקים 7, 8, 9, 10) ו-docs/ROADMAP.md.
שלבים 0–7 הושלמו (גרסה 0.8.0):
- Learning Core (src/core/): 17 מיומנויות (עד 10, עד 20 ומעבר עשרת, עד 100 וערך המקום, סדרות, כסף,
  שעון, בעיות מילוליות, חיבור וחיסור עד 100), מחוללים עם ErrorTag לכל מסיח (14 סוגים, ERROR_TAGS),
  Answer = number | Sign | Time (answerKey/sameAnswer/answerText), Question.unit/prompts לפי תבנית,
  Actions מונפשים (ACTION_LIMITS), שיעור לכל מיומנות. core/quest/ – 5 פרקים (chapter1.ts,
  chapters.ts), BossNode.tier, PracticeNode.template, תחנת review דינמית.
- מנוע (core/mastery/): updateMastery, adaptLevel, dueSkills, commonError, invites/pickQuestion/
  sisterOf, מבחן מיקום (LADDER של 22 שלבים בסדר הפרקים, startPlacement(age), FIRST_JUMP=3,
  IMPLIED), recommendByMastery, **summarize** (נשלט, איפה קשה לפי ErrorTag, זמן תרגול) –
  ו-storage/skillStates.ts getSkillSummary. אלה הבסיס לאזור ההורים.
- משחקים: games/Ask (+ PromptCard), Pop, Jump, Build, Match, ClockSet, Shop (עצלים); GameHost בוחר
  תבנית לסבב (roundTemplate), Lesson, Chest, Boss (הבוס של העולם מתחזק לפי tier), QuestMap (פרק
  אחד בכל פעם, לשוניות, הליכה בין פרקים), Home (תרגול חופשי, 17 מיומנויות), Placement, Collection.
- שמירה: SCHEMA_VERSION 4 – meta, profiles, skillStates, questProgress, inventory. storage/*.ts
  הם שכבת הגישה היחידה; normalize לכל רשומה.
- בדיקות: tests/core, tests/profiles, tests/worlds (bun), tests/e2e/phase0–7.cjs. הכול רץ
  ב-scripts/local-check.sh <scratchpad> (npm חסום; ר׳ CLAUDE.md; כ-15 דקות עם כל ה-e2e).
  האתר החי חסום מסביבת העבודה – בודקים שה-Actions הצליח (mcp github actions_list).
  שים לב: pkill עם המחרוזת של שרת הבדיקות בתוך אותה פקודה הורג את המעטפת – להריץ את השרת
  מסקריפט נפרד בתוך ה-scratchpad (סקריפט שמריץ python3 -m http.server ואז את ה-e2e).
  ל-e2e יש ווים: data-answer ו-data-template על .game, ?template=X לסבב בתבנית מסוימת,
  ?clockDays=N לשעון מוזרק.

בצע את שלב 8 — אזור הורים. עבוד בסדר הזה, ודחוף/בדוק בסוף כל חלק (בנייה + בדיקות):

1. כניסה מוגנת (מ-ChessIt): כפתור "👪 להורים" (במסך "מי משחק?" ובהגדרות), שער הורים –
   components/ParentCheck.tsx הקיים (שאלת חשבון למבוגרים) ואם הוגדר – PIN הורים נפרד מה-PIN של
   הילד (profiles/pin.ts, hash עם salt). screens/Parent*.tsx נטענים בעצלות; ילד לא נכנס בטעות
   (גם לא בלחיצה כפולה מהירה), "יציאה" חוזרת למסך שממנו באו.

2. דשבורד לכל ילד (screens/ParentDashboard.tsx, עצל): בחירת ילד, ואז:
   - מסע: באיזה פרק ותחנה, כוכבים לכל פרק (chapterStars/chapterMaxStars), בוסים שנוצחו.
   - מה נשלט / בלמידה / עוד לא – לכל מיומנות מד שליטה (summarize), לפי פרקים, בשפה להורים
     (Skill.title + levels[].label).
   - איפה קשה: הטעויות הנפוצות לכל מיומנות, בניסוח להורים לכל ErrorTag (מילון חדש, למשל
     no-bridge → "שוכח את מה שנשאר אחרי ה-10", hands-swapped → "מתבלבל בין המחוגים"), עם
     "לתרגל את זה" שפותח סבב מכוון (makeAdaptiveRound עם common) או את השיעור.
   - זמן תרגול: היום, השבוע, סך הכול; חזרות שהגיע זמנן (dueSkills); תאריך מבחן המיקום.
   - בלי גרפים כבדים: SVG פשוט (מד, עמודות שבוע) מצבעי העולם/בסיס בלבד, RTL, ≥48px, נגיש.
   זמן לפי יום דורש לוג: מאגר חדש `sessions` (profileId:yyyy-mm-dd → ms, questions, right) –
   SCHEMA_VERSION 5 + מיגרציה (נוצר ריק; בלי לשבור רשומות קיימות) + recordAnswer מעדכן אותו
   בתור הכתיבה הקיים; מחיקה עם הפרופיל; הגבלה ל-90 יום.

3. הגדרות הורים לכל ילד: הקראה (ברירת מחדל לפי גיל), אפקטים/מוזיקה/עוצמה, תנועה מופחתת,
   **יעד יומי** (מספר שאלות או דקות; הילד רואה מד יעד במפה וחגיגה קטנה דרך ה-director – אירוע חדש
   `goalReached` עם מיפוי בכל עולם ו-tests/worlds), **טיימר** אופציונלי (הפסקה מוצעת אחרי N דקות,
   עדינה), אילו תבניות מותרות (למשל בלי Match לילד שמתקשה בזיכרון) – GameHost מכבד את זה,
   נעילת פרקים קדימה (רק מה שנפתח במסע) או פתיחה ידנית של פרק. normalizeProfile משלים שדות.

4. ייצוא / ייבוא גיבוי (מ-ChessIt, storage/backup.ts + backupState.ts): קובץ JSON עם גרסה וסכמה,
   כל המאגרים (profiles, skillStates, questProgress, inventory, sessions, meta הרלוונטי); ייבוא
   מאמת ומנרמל כל רשומה (normalize* הקיימים), מתמזג או מחליף (שאלה להורה), עובר מיגרציה מסכמה
   3/4 ומגיבוי של ChessIt-פורמט ישן אם יש; שגיאה ברורה בעברית לקובץ פגום; Web Share / הורדה
   בטלפון. "גיבוי אחרון" נשמר ב-meta ומוצג תזכורת עדינה אחרי 14 יום.

5. בדיקות:
   - tests/core: מילון ErrorTag להורים (לכל ERROR_TAGS), חישובי הדשבורד (טהורים – core/parents/
     או core/mastery/summary.ts מורחב: לפי פרקים, לפי יום/שבוע עם שעון מוזרק), יעד יומי.
   - tests/profiles: PIN הורים, הגדרות הורים ב-normalizeProfile.
   - בדיקת גיבוי (bun): round-trip של כל המאגרים, קובץ פגום, גרסה ישנה, **כל שדה חדש מכוסה**
     (CLAUDE.md: שדה חדש – גם בבדיקת הגיבוי).
   - tests/worlds: האירוע goalReached בכל עולם.
   - tests/e2e/phase8.cjs בטלפון 360px: שער הורים (תשובה שגויה לא נכנסת, נכונה כן, PIN), דשבורד
     לילד שיחק כמה סבבים (שליטה, טעות נפוצה בניסוח להורים, זמן היום), "לתרגל את זה" פותח סבב
     מכוון, יעד יומי מתמלא וחוגג, תבנית שכובתה לא מופיעה, ייצוא → מחיקת נתונים → ייבוא מחזיר הכול
     (כולל מסע, אוסף ומטבעות), מיגרציה מסכמה 4 ל-5, תנועה מופחתת, רק transform/opacity,
     מגע ≥ 48px, בלי גלילה הצידה, צילומים בבהיר ובכהה.
   - phase0–7.cjs ממשיכים לעבור (לעדכן רק מה שבאמת השתנה, למשל סכמה 5).

6. ביצועים: כל מסכי ההורים והגיבוי עצלים; טעינה ראשונה מתחת ל-300KB (היום כ-68KB).

תנאי סיום: הורה נכנס באזור מוגן, רואה לכל ילד איפה הוא במסע, מה נשלט, איפה קשה ובכמה זמן תרגל,
מכוון יעד יומי והגדרות, ומגבה ומשחזר את כל הנתונים – והילד לא נכנס לשם בטעות. כל הבדיקות עוברות
(scripts/local-check.sh), הפריסה ב-Actions הצליחה.
בסיום: עדכן את docs/ROADMAP.md (וגם ARCHITECTURE אם משהו השתנה), כתוב פרומפט
מפורט לשלב 9 (גם ב-docs/prompts/phase-9.md), הצג אותו לי בגוש קוד, והמלץ לנקות סשן.
