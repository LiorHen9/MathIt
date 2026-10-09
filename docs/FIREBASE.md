# העברת MathIt ל-Firebase Hosting

כמו ChessIt: האתר עובר מ-GitHub Pages ל-**Firebase Hosting** של Google, בתוכנית החינמית (Spark). לא צריך כרטיס אשראי.
הכתובת החדשה: **https://mathit-liorhen9.web.app/**

הקוד כבר מוכן: כל דחיפה ל-`main` בונה ומפרסמת את האתר (`.github/workflows/deploy.yml`). מה שנשאר הוא הקמה חד-פעמית, כ-10 דקות. מומלץ מהמחשב.

עד שההקמה נגמרת, האפליקציה בכתובת הישנה (liorhen9.github.io/MathIt) ממשיכה לעבוד כרגיל – רק לא מתעדכנת. הריצות של **Deploy to Firebase Hosting** ב-Actions יופיעו באדום עם הודעה שחסר מפתח. זה צפוי.

> MathIt צריך פרויקט Firebase **משלו**, נפרד מ-ChessIt. מפתח של ChessIt לא יעבוד כאן (הפריסה בודקת את זה ועוצרת).

---

## חלק א – יצירת פרויקט

1. נכנסים ל-<https://console.firebase.google.com> ומתחברים עם אותו חשבון Google של ChessIt.
2. לוחצים **Create a project** (או **Create a Firebase project**).
3. שם הפרויקט: `mathit`.
4. **חשוב – מזהה הפרויקט:** מתחת לשם מופיע מזהה (Project ID) עם סמל עיפרון ✏️. לוחצים על העיפרון ומשנים אותו ל-

   ```
   mathit-liorhen9
   ```

   אם Firebase אומר שהמזהה תפוס – בוחרים מזהה אחר ושולחים לי (ל-Claude) אותו. אני אעדכן את הקוד.
5. מסמנים את ההסכמה לתנאים ← **Continue**. על **Gemini in Firebase** – אפשר לכבות ← **Continue**.
6. **Google Analytics**: מכבים (לא צריך) ← **Create project**. מחכים חצי דקה ← **Continue**.
7. בתפריט: **Build** ← **Hosting** ← **Get started**. מדלגים על כל השלבים (**Next** … **Continue to console**). אין צורך להתקין שום דבר.

## חלק ב – מפתח שירות ל-GitHub

הפריסה צריכה "מפתח שירות" – קובץ שמאפשר ל-GitHub לפרסם את האתר. **המפתח הזה סוד**, ולכן הוא נשמר ב-GitHub Secrets ולא במאגר.

1. ב-Firebase: גלגל השיניים ⚙️ ליד **Project Overview** ← **Project settings** ← לשונית **Service accounts**.
2. **Generate new private key** ← **Generate key**. יורד קובץ שנגמר ב-`.json`.
3. פותחים אותו בפנקס רשימות ומעתיקים את **כל** התוכן (Ctrl+A, Ctrl+C).
4. נכנסים ל-<https://github.com/LiorHen9/MathIt/settings/secrets/actions> ← **New repository secret**.
   - **Name**: `FIREBASE_SERVICE_ACCOUNT` (בדיוק כך).
   - **Secret**: מדביקים ← **Add secret**.
5. **מוחקים את הקובץ שהורד** (וגם מסל המיחזור).

## חלק ג – הרשאה לפרסם את האתר

1. ב-Firebase ← ⚙️ ← **Project settings** ← **Service accounts**: מעתיקים את המייל של חשבון השירות (מתחיל ב-`firebase-adminsdk-`).
2. נכנסים ל-<https://console.cloud.google.com/iam-admin/iam?project=mathit-liorhen9>.
3. בשורה של אותו מייל: העיפרון ✏️ ← **Add another role** ← מחפשים **Firebase Hosting Admin** ← **Save**.

## חלק ד – פריסה ראשונה ובדיקה

1. במאגר ← **Actions** ← **Deploy to Firebase Hosting** ← **Run workflow**. אחרי כ-2 דקות צריך להופיע ✓ ירוק.
2. פותחים בטלפון את https://mathit-liorhen9.web.app/ – MathIt עולה.
3. אם מופיעה שגיאה – לצלם מסך של הריצה האדומה ולשלוח לי.

ברגע שהפריסה מצליחה, רץ לבד גם **Old address notice (GitHub Pages)**: הכתובת הישנה מתחלפת במסך "MathIt עבר לכתובת חדשה". הוא מתפרסם רק אחרי שהאתר החדש באמת עונה, כך שלא נשארים בלי אפליקציה.

## חלק ה – העברת הטלפונים (פעם אחת)

הנתונים (ילדים, מסע, מטבעות, אוסף, הגדרות) שמורים בטלפון **לפי כתובת האתר**. בכתובת החדשה האפליקציה מתחילה ריקה, ולכן מעבירים אותם בגיבוי:

1. בכל טלפון, פותחים את **האייקון הישן** של MathIt (או את liorhen9.github.io/MathIt). במקום האפליקציה יופיע מסך "MathIt עבר לכתובת חדשה" (אולי רק בפתיחה השנייה). הוא מציג את הילדים שנמצאו בטלפון, ובלחיצה שומר קובץ גיבוי של כל המשפחה.
2. פותחים את https://mathit-liorhen9.web.app/ ומוסיפים למסך הבית.
3. **פותחים מהאייקון החדש** (באייפון, Safari והאייקון שומרים בנפרד): במסך הראשון ← **📂 יש לנו גיבוי – לשחזר ממנו** ← בוחרים את הקובץ `mathit-backup-…`.
4. מוחקים את האייקון הישן ממסך הבית.
5. **רק אחרי שכל הטלפונים עברו**: במאגר ← **Settings** ← **General** ← **Change visibility** ← **Make private**. האתר הישן ייסגר מעצמו.

---

## מה יש בפרויקט

- רק **Hosting** – אתר סטטי. אין מסד נתונים, אין הרשמה ואין שרת: הנתונים של הילדים נשארים בטלפון, כמו קודם.
- המכסה החינמית: ‏10GB אחסון ו-360MB הורדה ביום. האפליקציה כ-1MB, ואחרי הפעם הראשונה היא עובדת מהטלפון (Service Worker), כך שזה רחוק מאוד מהגבול.
- `firebase.json` קובע את הכותרות: קבצי `assets/` נשמרים בטלפון לשנה (השם שלהם משתנה בכל גרסה), ו-`index.html`, ‏`sw.js` וה-manifest נבדקים בכל פתיחה – כך גרסה חדשה מגיעה מהר.
