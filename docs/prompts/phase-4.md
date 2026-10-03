# פרומפט לשלב 4 — מפת המסע

```
אנחנו ממשיכים לבנות את MathIt — אפליקציית ווב למובייל (PWA, עברית) ללימוד מתמטיקה
לילדים כמסע עם חידות ומיני-משחקים, בעולמות פיות / כדורגל / כדורסל / נינג׳ה / קוביות / כוכבות הבמה, עם דגש
חזק על אנימציות וצלילים. ריפו: https://github.com/LiorHen9/MathIt
אתר: https://liorhen9.github.io/MathIt/

לפני שמתחילים: קרא את CLAUDE.md, docs/ARCHITECTURE.md (בעיקר פרקים 4.1, 4.4, 6.1 סעיף 3
"תנועת מסע", 6.2, 6.4, 7.1–7.3, 9, 10) ו-docs/ROADMAP.md. שלבים 0–3 הושלמו (גרסה 0.4.0):
- Learning Core (src/core/): types.ts (Question, Hint{action, for}, Step{action}, Action =
  count/tenFrame/combine/takeAway/jump/compare, actionResult, pickHint), skills/ (4 מיומנויות:
  count.to10, compare.to10, add.within10, sub.within10, 2–3 רמות, recommendedSkills,
  startLevel), generators/ (makeQuestion, makeRound, findQuestion), round.ts (MAX_WRONG=2,
  starsFor, nextLevel), lessons/ (שיעור 4–5 מסכים לכל מיומנות: watch/try).
- משוב: fx/director.ts (אירועים tap/correct/wrong/hint/starEarned/roundDone + הוראה
  count/jump/ten/whoosh + explain/explained; planFeedback טהור; יומן window.__mathitFx),
  fx/motion.ts (pop, shake, hop, arc, flyTo, countUp), fx/particles.ts, audio/sfx.ts,
  fx/Hero.tsx (idle/think/happy/cheer/oops).
- אנימציות מלמדות: src/manipulatives/ (timeline.ts עם useRun, Counters, TenFrame, Combine,
  TakeAway, NumberLine, Compare, Explainer מסונכרן להקראה – sayAndWait/readingMs). בתנועה
  מופחתת הן ממשיכות, לאט פי 1.6.
- מסכים: Home (לכל מיומנות "▶ תרגול" ו-"📖 שיעור", ✓ אחרי צפייה), GameHost (סבב 8 עם
  games/Ask.tsx: רמז מונפש אחרי טעות ראשונה, הסבר צעד-אחר-צעד אחרי שנייה), Lesson.tsx
  (כוכב ופנפרה בסוף, "בוא/י נתרגל"). App.tsx = מכונת מצבים בלי ניתוב, מסכים כבדים ב-lazy().
- שמירה: SCHEMA_VERSION 2, מאגר skillStates (level, bestStars, rounds, lastPlayed,
  lessonSeen) עם normalizeSkillState.
- בדיקות: tests/core, tests/profiles, tests/worlds (bun), tests/e2e/phase0–3.cjs. הכול רץ
  ב-scripts/local-check.sh <scratchpad> (npm חסום; ר׳ CLAUDE.md). האתר החי חסום מסביבת
  העבודה – בודקים שה-Actions הצליח, ואת האתר עצמו בטלפון.

בצע את שלב 4 — מפת המסע (תחושת קווסט):

1. מודל (src/core/quest/, נתונים בלבד, בלי UI): Journey → Chapter → Node. סוגי תחנות:
   lesson (skillId), practice (skillId, אולי רמה מינימלית), chest (תיבה), boss (skillIds,
   מספר שאלות, "פס כוח"). כל תחנה: id יציב, כותרת, תנאי פתיחה (התחנה הקודמת עם ≥1 כוכב,
   או כוכבים מצטברים בפרק). פונקציות טהורות: nodeStatus(node, progress) → locked/open/done,
   nextNode, chapterStars. בדיקות ב-tests/core/check.ts (ids ייחודיים, כל skillId קיים, כל
   תחנה ניתנת להשגה, הסדר נפתח רק קדימה).
2. פרק 1 מלא, כ-15 תחנות: "מספרים עד 10" (שיעור + תרגולי מנייה והשוואה) ואז "חיבור וחיסור
   עד 10" (שיעורים, תרגולים ברמות עולות, תיבה באמצע, בוס בסוף שמשלב חיבור וחיסור).
3. שמירה: התקדמות במסע לכל פרופיל – מאגר חדש (למשל questProgress: כוכבים לכל תחנה,
   תיבות שנפתחו, התחנה האחרונה) ⇒ SCHEMA_VERSION 3 + מיגרציה מ-2 (ומ-1), ומי שכבר
   שיחק/ראה שיעורים ב-skillStates לא מאבד: תחנות שהושלמו מסומנות לפי מה שיש. להוסיף
   לבדיקות ה-e2e גם מיגרציה מ-2.
4. screens/QuestMap.tsx (lazy) – המסך הראשי של הפרופיל (Home הופך לכניסה למפה או נבלע בה,
   ההגדרות ו"מי משחק?" נשארים נגישים):
   - מפה בגלילה אנכית, שביל מתפתל (SVG, צבעים ממשתני CSS בלבד), תחנות עם אייקון לפי סוג,
     כוכבים שהושגו, מנעול לסגורות. גלילה אוטומטית לתחנה הנוכחית.
   - **הגיבור הולך על השביל** מהתחנה שהושלמה לבאה (תנועה לאורך הנתיב, transform בלבד, צעדים
     עם צליל), ותחנה נפתחת ב**פיצוץ אור** (חלקיקים + צליל unlock). בתנועה מופחתת: מעבר
     קצר/דהייה, בלי חלקיקים – אבל המידע (מה נפתח) נשאר ברור.
   - נגיעה בתחנה פתוחה → שיעור / סבב / תיבה / בוס; בסיום חוזרים למפה עם האנימציה.
5. תחנת תיבה: התיבה רועדת, נפתחת, פרס עף החוצה (flyTo) – בינתיים פרס סמלי (כוכב/מדבקה);
   מטבעות ואוסף בשלב 5.
6. תחנת בוס: מסך קרב קצר (שאלות מכמה מיומנויות דרך Ask/Pop), כל תשובה נכונה = מכה (הגיבור
   "תוקף", הבוס נרעד, פס כוח יורד בהנפשה), טעות = הבוס "מתחמק" (עדין). ניצחון → חגיגה
   גדולה. בוס מקורי (SVG פשוט, לא דמות קיימת), אותו בוס בכל העולמות עד שלב 5.
7. אירועים חדשים ל-director: unlock, walk/step, chestOpen, bossHit, bossDefeated (וכו׳) –
   מיפוי בכל עולם, צלילים חדשים ב-sfx.ts (בדיקות ב-tests/worlds/check.ts: כל אירוע ממופה,
   צלילים תקינים). מצבי גיבור walk ו-attack (לפחות בסיסיים) ב-Hero.tsx.
8. בדיקות: tests/e2e/phase4.cjs בטלפון 360px – פרופיל חדש רואה מפה עם תחנה ראשונה פתוחה;
   משלים שיעור → חוזר למפה, הגיבור הולך (יש אנימציה), התחנה הבאה נפתחת (unlock ביומן),
   התקדמות נשמרת אחרי רענון; תיבה נפתחת; בוס עם פס כוח עד ניצחון; מיגרציה מסכמה 2 עם
   skillStates קיימים; תנועה מופחתת; רק transform/opacity; מגע ≥ 48px; בלי גלילה הצידה;
   צילומי מסך בבהיר ובכהה ובשני עולמות לפחות. phase0–3.cjs ממשיכים לעבור (לעדכן מה שבאמת
   השתנה, למשל המסך שאחרי בחירת פרופיל).

תנאי סיום: מסלול רציף של כ-15 תחנות, משיעור ועד בוס, שמרגיש כמו משחק. טעינה ראשונה עדיין
מתחת ל-300KB (המפה, הבוס והתיבה עצלים). כל הבדיקות עוברות (scripts/local-check.sh),
הפריסה ב-Actions הצליחה.
בסיום: עדכן את docs/ROADMAP.md (וגם ARCHITECTURE אם משהו השתנה), כתוב פרומפט
מפורט לשלב 5 (גם ב-docs/prompts/phase-5.md), הצג אותו לי בגוש קוד, והמלץ לנקות סשן.
```
