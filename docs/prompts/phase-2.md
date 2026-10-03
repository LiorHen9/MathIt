# פרומפט לשלב 2 — ליבת הלמידה + משחק ראשון עם משוב מלא

```
אנחנו ממשיכים לבנות את MathIt — אפליקציית ווב למובייל (PWA, עברית) ללימוד מתמטיקה
לילדים כמסע עם חידות ומיני-משחקים, בעולמות פיות / כדורגל / כדורסל / נינג׳ה, עם דגש
חזק על אנימציות וצלילים. ריפו: https://github.com/LiorHen9/MathIt
אתר: https://liorhen9.github.io/MathIt/

לפני שמתחילים: קרא את CLAUDE.md, docs/ARCHITECTURE.md (בעיקר פרקים 4, 6, 7.3, 11, 12)
ו-docs/ROADMAP.md. שלבים 0–1 הושלמו (גרסה 0.2.0):
- App כמכונת מצבים: splash → "מי משחק?" (ProfilePicker) → [PIN] → Home (בית זמני עם
  הגיבור) ⇄ Settings / ProfileEditor. מסכים עצלים ב-lazy().
- profiles/: profiles.ts (Profile עם settings בפנים, byGender, approxAge/ageBand/stageLabel,
  normalizeProfile), settings.ts (activateProfile, updateSettings, useActiveProfile), pin.ts.
- worlds/<id>/index.tsx: ארבעה עולמות עצלים (צבעים + hero: HeroDef), applyWorld, worldStyle,
  משתני --hero-*. fx/Hero.tsx (גוף משותף, מצב idle ב-CSS), fx/motion.ts (reducedMotion,
  setReducedMotion, hop). audio/sfx.ts: סינתזה קטנה (מתנדים, רעש, פילטר, ויברטו), צלילי
  world-<id>, window.__mathitSounds. components/WorldPicker, PinPad, ParentCheck, Speak
  (SpeakButton, useAutoSpeak, Feedback, NarrationHelp).
- בדיקות: tests/core, tests/profiles, tests/worlds (bun), tests/e2e/phase0.cjs + phase1.cjs.
  הכול רץ ב-scripts/local-check.sh <scratchpad>.

בצע את שלב 2 — ליבת הלמידה ומשחק ראשון עם משוב מלא:

1. Learning Core (src/core/, בלי UI/עולמות/צלילים):
   - טיפוסים: Skill, Question, Answer, Generator, DifficultyLevel (ARCHITECTURE 4.1–4.2).
   - src/core/skills/: ארבע מיומנויות – count.to10, compare.to10, add.within10,
     sub.within10, עם 2–3 רמות קושי כל אחת ו-band.
   - src/core/generators/: מחולל לכל אחת, עם createRng(seed). מסיחים חכמים עם errorTags
     (חיבור: ±1 טעות ספירה, חיסור במקום חיבור; חיסור: חיבור במקום חיסור, הפוך את
     הסדר; השוואה: הסימן ההפוך). prompt כטקסט + חלק מתמטי ("7 + 5 = ?"), ו-hints בסיסיים.
   - tests/core/check.ts: לכל מחולל 1,000 seeds – תשובה נכונה, 3 מסיחים ייחודיים ושונים
     מהתשובה, הכול בטווח הרמה, בלי שליליים; אותו seed = אותה שאלה.
2. מנוע המשוב (ARCHITECTURE 6.4–6.5):
   - fx/director.ts: Feedback Director. אירועים: tap, correct{streak}, wrong{attempt},
     hint, starEarned{n}, roundDone{stars}. משחק משדר אירוע בלבד; ה-director מחליט על
     צליל, אנימציה, מצב הגיבור וחלקיקים. יומן אירועים ב-window.__mathitFx.
   - מיפוי משוב בסיסי משותף לכל העולמות (שלב 5 יוסיף מיפוי לכל עולם); כבר עכשיו
     הצליל של correct יכול לקחת גוון מהעולם (למשל פיות → פעמון).
   - fx/motion.ts: pop, shake, flyTo(el, target), arc(from, to), countUp – על Web Animations
     API, transform/opacity בלבד, מתקצרים בתנועה מופחתת.
   - fx/particles.ts: Canvas אחד מעל המסך, נצנוצים/קונפטי, תקרת חלקיקים, נעצר בתנועה מופחתת.
   - audio/sfx.ts: להרחיב לסינתזה עשירה בסגנון ZzFX: correct (קומבו: גובה עולה לפי streak),
     wrong (רך ונמוך, בלי באזר), star (תו עולה לכל כוכב), hint, click למקלדת.
   - fx/Hero.tsx: להוסיף מצבים think, happy, cheer, oops (CSS, transform/opacity בלבד),
     ו-API להחלפת מצב מה-director (מצב חוזר ל-idle אחרי זמן קצר).
3. ui/NumPad.tsx: מקלדת מספרים גדולה (מגע ≥ 56px), מחיקה ו"בדוק", משוב מגע וצליל, dir="ltr".
4. games/Pop (בחירה מהירה) + screens/GameHost.tsx:
   - סבב של 8 שאלות ממיומנות אחת (לבחירה במסך הבית הזמני: 4 כפתורים, אחד לכל מיומנות,
     עם המלצה לפי ageBand של הפרופיל). התשובות בועות/כפתורים גדולים, ובחלק מהשאלות
     NumPad.
   - הגיבור על המסך, מגיב לכל אירוע. רצף (קומבו) עם צליל עולה ומונה מונפש.
   - טעות: רעידה עדינה + oops + "נסו שוב" + רמז בסיסי (טקסט/ויזואלי פשוט). אחרי שתי
     טעויות – מראים את התשובה הנכונה וממשיכים.
   - סוף סבב: 0–3 כוכבים שנחשפים אחד-אחד, כל אחד בתו גבוה יותר, וחגיגה שאפשר לדלג
     עליה בנגיעה. "שוב" / "לבית".
   - המשימה מוקראת (SpeakButton + useAutoSpeak; לגיל 5–7 משפט אחד), תרגילים dir="ltr",
     טקסט לפי מין דרך byGender.
5. שמירה: אם שומרים תוצאות סבב (למשל הכוכבים הטובים ביותר לכל מיומנות) – מאגר חדש,
   SCHEMA_VERSION 2 + מיגרציה, ועדכון phase0.cjs (בודק כרגע schemaVersion 1 ו-stores).
6. בדיקות: tests/core/check.ts (מחוללים), tests/worlds/check.ts (כל אירוע משוב ממופה,
   צלילים חדשים קיימים), tests/e2e/phase2.cjs: סבב חיבור מלא בטלפון 360px – תשובה נכונה
   ושגויה, __mathitFx ו-__mathitSounds מכילים את האירועים והצלילים הנכונים, קומבו עולה,
   כוכבים בסוף, דילוג על החגיגה, תנועה מופחתת מקצרת (בלי אנימציות אינסופיות), מגע ≥ 48px,
   בלי גלילה הצידה, רק transform/opacity, צילומי מסך בבהיר ובכהה ובשני עולמות לפחות.
   phase0.cjs ו-phase1.cjs ממשיכים לעבור.

תנאי סיום: ילד בן 5–6 משחק סבב חיבור, שומע ורואה תגובה לכל לחיצה, ומקבל חגיגת כוכבים.
טעינה ראשונה עדיין מתחת ל-300KB (משחקים ומחוללים עצלים). כל הבדיקות עוברות
(scripts/local-check.sh), הפריסה ב-Actions הצליחה והאתר החי נבדק.
בסיום: עדכן את docs/ROADMAP.md (וגם ARCHITECTURE אם משהו השתנה), כתוב פרומפט
מפורט לשלב 3 (גם ב-docs/prompts/phase-3.md), הצג אותו לי בגוש קוד, והמלץ לנקות סשן.
```
