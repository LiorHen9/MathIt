# פרומפט לשלב 1 — פרופילים ועולמות

```
אנחנו ממשיכים לבנות את MathIt — אפליקציית ווב למובייל (PWA, עברית) ללימוד מתמטיקה
לילדים כמסע עם חידות ומיני-משחקים, בעולמות פיות / כדורגל / כדורסל / נינג׳ה, עם דגש
חזק על אנימציות וצלילים. ריפו: https://github.com/LiorHen9/MathIt
אתר: https://liorhen9.github.io/MathIt/

לפני שמתחילים: קרא את CLAUDE.md, docs/ARCHITECTURE.md (בעיקר פרקים 5, 6, 8, 9)
ו-docs/ROADMAP.md. שלב 0 הושלם: יש שלד Vite + Preact + TS, PWA, App כמכונת מצבים
(splash → ComingSoon), storage/db.ts עם מיגרציות (meta, profiles; SCHEMA_VERSION 1),
audio/sfx.ts (פתיחה בנגיעה ראשונה, window.__mathitSounds), audio/speech.ts,
components/Speak.tsx, fx/motion.ts (תנועה מופחתת דרך data-motion), worlds/ עם BASE
ורישום ריק, ו-scripts/local-check.sh שבונה ובודק בלי npm.

שכפל את ChessIt (https://github.com/LiorHen9/ChessIt) לקריאה. משם מעבירים ומתאימים:
src/profiles/profiles.ts, settings.ts, pin.ts, ו-src/screens/ProfilePicker.tsx,
ProfileEditor.tsx, PinScreen.tsx, וגם NarrationHelp מ-components/Speak.tsx.

בצע את שלב 1 — פרופילים ועולמות:
1. פרופילים (מ-ChessIt): שם, אווטאר, גיל/כיתה (גן חובה עד ו׳; או גיל 4–12),
   מין לפנייה נכונה (בן/בת/אחר) ו-byGender, PIN אופציונלי, worldId.
   ממשק Profile כמו ב-ARCHITECTURE פרק 8. שמירה במאגר profiles.
2. הגדרות לכל פרופיל: אפקטים · מוזיקה · הקראה · עוצמה · תנועה מופחתת
   (ברירת מחדל: לפי הטלפון). חיבור אמיתי: setSfxEnabled/setSfxVolume,
   setNarration, setReducedMotion. מסך הגדרות פשוט (מוזיקה רק נשמרת – מגיעה בשלב 5).
3. ארבעה עולמות ב-src/worlds/<id>/ (fairies, football, basketball, ninja), כל אחד
   chunk עצל: צבעים light+dark, שם, אייקון, תיאור קצר, ו-hero: גיבור SVG מקורי
   שבנוי מחלקים (ראש, גוף, ידיים, אביזר) עם מצב idle מונפש ב-CSS (נשימה + מצמוץ,
   transform/opacity בלבד). גיבור לפי מין הפרופיל כשזה רלוונטי (חלוץ/ה, שחקן/ית).
   בלי קבוצות, שחקנים או דמויות אמיתיות.
4. צליל דוגמה לכל עולם (סינתזה ב-sfx.ts, למשל פיות: פעמון ונצנוץ; כדורגל: שריקה;
   כדורסל: כדרור; נינג׳ה: "שוש"). זה הבסיס ל-SoundPack של שלב 5.
5. בוחר עולמות: כרטיס לכל עולם עם הגיבור המונפש בצבעי העולם (תצוגה מקדימה עם
   worldStyle), נגיעה = צליל דוגמה + הגיבור קופץ; בחירה מחליפה את העור חי
   (applyWorld) בלי טעינה מחדש. משמש ביצירת פרופיל ובהגדרות.
6. מסך "מי משחק?" בפתיחה (אחרי ה-splash): אריחי פרופילים בצבעי העולם של כל אחד,
   "+ פרופיל חדש". בפעם הראשונה – ישר ליצירת פרופיל. בחירת פרופיל → applyWorld
   + הגדרות → מסך בית זמני של הפרופיל (שם, גיבור, "המסע מתחיל בקרוב").
   זכירת הפרופיל האחרון (meta).
7. אם צריך שדות חדשים במאגרים – SCHEMA_VERSION + מיגרציה.
8. בדיקות: tests/worlds/check.ts מכסה את כל 5 העולמות (משתנים חובה, ניגודיות
   ב-light וב-dark); בדיקת byGender ו-PIN (bun); tests/e2e/phase1.cjs: יצירת 3
   פרופילים בעולמות שונים, החלפה ביניהם וצבע הרקע משתנה, טעינה מחדש שומרת הכול,
   צליל דוגמה ב-__mathitSounds, PIN, תנועה מופחתת בהגדרות משפיעה על data-motion,
   מגע ≥ 48px, בלי גלילה הצידה ב-360px, צילומי מסך בבהיר ובכהה. phase0.cjs ממשיך
   לעבור (לעדכן אותו אם הזרימה אחרי ה-splash השתנתה).

תנאי סיום: 3 פרופילים בעולמות שונים, הכל נשמר, והאפליקציה "מחליפה עור" לפי הילד.
טעינה ראשונה עדיין מתחת ל-300KB (העולמות עצלים). כל הבדיקות עוברות
(scripts/local-check.sh), הפריסה ב-Actions הצליחה והאתר החי נבדק.
בסיום: עדכן את docs/ROADMAP.md (וגם ARCHITECTURE אם משהו השתנה), כתוב פרומפט
מפורט לשלב 2 (גם ב-docs/prompts/phase-2.md), הצג אותו לי בגוש קוד, והמלץ לנקות סשן.
```
