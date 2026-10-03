# פרומפט לשלב 3 — אנימציות מלמדות ושיעורים

```
אנחנו ממשיכים לבנות את MathIt — אפליקציית ווב למובייל (PWA, עברית) ללימוד מתמטיקה
לילדים כמסע עם חידות ומיני-משחקים, בעולמות פיות / כדורגל / כדורסל / נינג׳ה, עם דגש
חזק על אנימציות וצלילים. ריפו: https://github.com/LiorHen9/MathIt
אתר: https://liorhen9.github.io/MathIt/

לפני שמתחילים: קרא את CLAUDE.md, docs/ARCHITECTURE.md (בעיקר פרקים 4.2, 6.1, 6.3, 6.5,
6.6, 7.3, 11) ו-docs/ROADMAP.md. שלבים 0–2 הושלמו (גרסה 0.3.0):
- Learning Core (src/core/): types.ts (Question עם prompt{text, math, visual, speech},
  answer, distractors, choices, errorTags, hints, explanation: Step[], numeric, key;
  Visual = { kind: 'dots', groups, crossed?, between?, numbered? }), skills/ (count.to10,
  compare.to10, add.within10, sub.within10 עם 2–3 רמות, recommendedSkills, startLevel),
  generators/ (makeQuestion, makeRound), round.ts (MAX_WRONG=2, questionPoints, starsFor,
  nextLevel).
- משוב: fx/director.ts (emit(event, {el, to}), planFeedback טהור, hushFeedback, יומן
  window.__mathitFx; אירועים tap/correct/wrong/hint/starEarned/roundDone), fx/motion.ts
  (pop, shake, hop, arc, flyTo, countUp, reducedMotion), fx/particles.ts (burst, confetti,
  clearParticles, MAX_PARTICLES), audio/sfx.ts (סינתזה עם פרמטרים: correct לפי streak
  ו-flavor של עולם, star, click, wrong, hint, fanfare; comboPitch, starPitch, hushSfx,
  tonesFor), fx/Hero.tsx (מצבים idle/think/happy/cheer/oops, setHeroMood, useHeroMood).
- UI: ui/NumPad.tsx, ui/Dots.tsx (ציור סטטי של Visual), games/Pop.tsx (בועות או מקלדת),
  screens/GameHost.tsx (סבב 8, קומבו, שני ניסיונות: טעות 1 → "נסה שוב" + רמז טקסט/כוכבים
  ממוספרים, טעות 2 → התשובה + "הבא"; חגיגת כוכבים עם דילוג). Home: 4 כפתורי מיומנות.
- שמירה: SCHEMA_VERSION 2, מאגר skillStates (level, bestStars, rounds, lastPlayed).
- בדיקות: tests/core, tests/profiles, tests/worlds (bun), tests/e2e/phase0–2.cjs.
  הכול רץ ב-scripts/local-check.sh <scratchpad> (npm חסום; ר׳ CLAUDE.md).

בצע את שלב 3 — אנימציות מלמדות ושיעורים (ההסבר עצמו מונפש):

1. src/manipulatives/ – רכיבים לשימוש חוזר שמקבלים מספרים ולא קשורים לשאלה מסוימת
   (ARCHITECTURE 6.1), transform/opacity בלבד, צבעים ממשתני CSS בלבד:
   - Counters: עצמים מופיעים אחד-אחד (קפיצה קטנה), כל אחד עם מספר שנחשף.
   - TenFrame: מסגרת עשר (2×5) שמתמלאת; עשר שלם = "קליק" ואקורד.
   - Combine (חיבור): שתי קבוצות מתקרבות ומתאחדות, ואז נספרות יחד מהמספר הגדול.
   - TakeAway (חיסור): העצמים שמורידים עפים מהמסך בקשת (arc), ומה שנשאר נספר.
   - NumberLine: ציר 0–10 (dir="ltr", עולה משמאל לימין) והגיבור/סמן קופץ בקשתות,
     תו לכל קפיצה.
   - Compare: שתי קבוצות מסתדרות זו מול זו בזוגות, והעודף מודגש.
   כל רכיב מקבל props פשוטים (למשל {a, b, play, speed}), מחזיר Promise/קולבק בסוף, ואפשר
   להריץ אותו שוב. הם נטענים בעצלות (לא בטעינה הראשונה).
2. צליל שמלמד (audio/sfx.ts): count{step} – סולם עולה בספירה (תו לכל עצם), jump{step} –
   תו לכל קפיצה בציר, ten – אקורד בעשר שלם, whoosh – עצם שעף. להוסיף לבדיקות ב-
   tests/worlds/check.ts (גובה עולה לפי step, כל הצלילים תקינים).
3. סנכרון הקראה: הגיבור "מסביר" – שלבי ההסבר מוקראים (speech.ts) ומסונכרנים לאנימציה:
   שלב הבא מתחיל כשההקראה והאנימציה של הקודם הסתיימו (בלי קול עברי – לפי זמן). מצב
   גיבור think/happy בזמן ההסבר. מוזיקה עדיין לא קיימת (שלב 5).
4. Visual ו-Step בליבה: להרחיב בלי לשבור – כל Step יכול לשאת visual ופעולה מונפשת
   (למשל { kind: 'combine', a, b } / 'takeAway' / 'count' / 'jump' / 'compare'), והמחוללים
   מחזירים explanation שמתאר את ההסבר המונפש. Learning Core נשאר בלי UI (רק נתונים).
   לעדכן את tests/core/check.ts (לכל שאלה: הסבר מונפש תקין שמגיע לתשובה הנכונה).
5. רמזים והסבר בסבב (GameHost + Pop):
   - טעות ראשונה: הרמז מראה את האנימציה המתאימה (למשל Combine / NumberLine) במקום
     הכוכבים הסטטיים, בקצב רגוע, וניתן לנגן שוב.
   - טעות שנייה: הסבר צעד-אחר-צעד מונפש עם הקראה, ובסופו התשובה; "הבא" רק אחרי ההסבר
     (או "דלג").
   - לבחור את סוג הרמז לפי errorTags כשאפשר (למשל added בחיסור → TakeAway).
6. תחנת שיעור: screens/Lesson.tsx – 3–5 מסכים אינטראקטיביים לכל מיומנות (src/core/lessons/
   כנתונים): הסבר מונפש, "עכשיו תורך" עם שאלה אחת, משוב מלא דרך ה-director. בבית: לכל
   מיומנות כפתור "שיעור" לצד "תרגול" (עד שהמפה תגיע בשלב 4). שמירת "השיעור נצפה" ב-
   skillStates (שדה חדש דרך normalizeSkillState, בלי מיגרציה; אם מוסיפים מאגר – SCHEMA 3).
7. תנועה מופחתת: משוב מתקצר כמו היום, אבל **אנימציות מלמדות נשארות** – לאט ורגוע, בלי
   חלקיקים ובלי אנימציות אינסופיות. לבדוק שהן עדיין רצות (getAnimations) כשהנתון
   data-motion="reduced".
8. בדיקות: tests/core (הסברים), tests/worlds (צלילים חדשים), tests/e2e/phase3.cjs בטלפון
   360px: שיעור חיבור מלא; בסבב חיבור – טעות → רמז מונפש (יש אנימציות על אלמנטים של
   manipulatives, צלילי count/jump ב-__mathitSounds), שתי טעויות → הסבר צעד-אחר-צעד עד
   התשובה; תנועה מופחתת – ההסבר עדיין מונפש וארוך יותר, המשוב קצר; רק transform/opacity;
   מגע ≥ 48px; בלי גלילה הצידה; צילומי מסך בבהיר ובכהה ובשני עולמות לפחות.
   phase0–2.cjs ממשיכים לעבור.

תנאי סיום: ילד שלא יודע חיבור לומד אותו משיעור מונפש, וכשהוא טועה הוא רואה את ההסבר זז
ושומע אותו. טעינה ראשונה עדיין מתחת ל-300KB (manipulatives ושיעורים עצלים). כל הבדיקות
עוברות (scripts/local-check.sh), הפריסה ב-Actions הצליחה והאתר החי נבדק.
בסיום: עדכן את docs/ROADMAP.md (וגם ARCHITECTURE אם משהו השתנה), כתוב פרומפט
מפורט לשלב 4 (גם ב-docs/prompts/phase-4.md), הצג אותו לי בגוש קוד, והמלץ לנקות סשן.
```
