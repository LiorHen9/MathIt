// Profile checks that need no browser: `bun tests/profiles/check.ts`
// byGender, grade/age helpers, default settings, reading old or damaged records, the PIN, and the
// parents' settings in a profile (phase 8).
import { ageBand, approxAge, byGender, defaultSettings, normalizeProfile, stageLabel, type Profile } from '../../src/profiles/profiles';
import { checkPin, hasPin, hashPin, parentQuestion, validPin, withPin, withoutPin } from '../../src/profiles/pin';

let failures = 0;
const fail = (msg: string) => {
  failures++;
  console.log('✗', msg);
};
const ok = (msg: string) => console.log('✓', msg);
const eq = (got: unknown, want: unknown, what: string) => {
  if (JSON.stringify(got) !== JSON.stringify(want)) fail(`${what}: got ${JSON.stringify(got)}, expected ${JSON.stringify(want)}`);
};

// byGender
{
  eq(byGender({ gender: 'boy' }, 'ניצח', 'ניצחה'), 'ניצח', 'byGender boy');
  eq(byGender({ gender: 'girl' }, 'ניצח', 'ניצחה'), 'ניצחה', 'byGender girl');
  eq(byGender({ gender: 'other' }, 'ניצח', 'ניצחה'), 'ניצח/ה', 'byGender other → combined suffix');
  eq(byGender({}, 'שחקן', 'שחקנית'), 'שחקן/ית', 'byGender none → combined suffix');
  eq(byGender({}, 'חלוץ', 'חלוצה'), 'חלוץ/ה', 'byGender none, final letter');
  eq(byGender({ gender: 'other' }, 'בחר', 'בחרי', 'בחרו'), 'בחרו', 'byGender other → neutral');
  eq(byGender(null, 'שלו', 'שלה'), 'שלו/שלה', 'byGender null, no common prefix');
  eq(byGender(undefined, 'שלו', 'שלה', 'הזה'), 'הזה', 'byGender undefined → neutral');
  ok('byGender');
}

// Grade and age
{
  eq(approxAge({ grade: 0 }), 5, 'גן חובה ≈ 5');
  eq(approxAge({ grade: 1 }), 6, 'א׳ ≈ 6');
  eq(approxAge({ grade: 6 }), 11, 'ו׳ ≈ 11');
  eq(approxAge({ age: 9 }), 9, 'age as given');
  eq(ageBand({ grade: 0 }), '4-5', 'band גן');
  eq(ageBand({ grade: 2 }), '6-7', 'band ב׳');
  eq(ageBand({ age: 8 }), '8-9', 'band 8');
  eq(ageBand({ grade: 5 }), '10-12', 'band ה׳');
  eq(stageLabel({ grade: 0 }), 'גן חובה', 'label גן');
  eq(stageLabel({ grade: 3 }), 'כיתה ג׳', 'label ג׳');
  eq(stageLabel({ age: 7 }), 'גיל 7', 'label age');
  eq(defaultSettings({ grade: 1 }).narration, true, 'narration on by default in א׳');
  eq(defaultSettings({ age: 10 }).narration, false, 'narration off by default at 10');
  eq(defaultSettings({ age: 10 }).reducedMotion, null, 'reduced motion follows the phone by default');
  ok('grade, age, bands and default settings');
}

// Old or damaged records
{
  const n = normalizeProfile({ id: 'p1', name: '  נועה ', worldId: 'ninja', grade: 2, createdAt: 5 } as Partial<Profile> & { id: string });
  eq(n.name, 'נועה', 'name trimmed');
  eq(n.settings.sfx && n.settings.music, true, 'missing settings get defaults');
  eq(n.settings.narration, true, 'narration default by grade');
  const bad = normalizeProfile({ id: 'p2', name: 'x', worldId: 'space', grade: 9, age: 30, gender: 'robot', pinHash: 'abc', settings: { volume: 7, reducedMotion: 'yes' } } as unknown as Partial<Profile> & { id: string });
  eq(bad.worldId, 'fairies', 'unknown world → fairies');
  eq([bad.grade, bad.age], [1, undefined], 'bad grade and age → א׳');
  eq(bad.gender, undefined, 'unknown gender dropped');
  eq(hasPin(bad), false, 'a hash without salt is no PIN');
  eq(bad.settings.volume, 0.8, 'bad volume → default');
  eq(bad.settings.reducedMotion, null, 'bad reduced motion → phone');
  const both = normalizeProfile({ id: 'p3', name: 'y', worldId: 'football', grade: 3, age: 8 } as Partial<Profile> & { id: string });
  eq([both.grade, both.age], [3, undefined], 'grade wins over age');
  ok('normalizeProfile fills and fixes records');
}

// PIN
{
  const base = normalizeProfile({ id: 'p4', name: 'מיה', worldId: 'basketball', age: 8 } as Partial<Profile> & { id: string });
  eq(hasPin(base), false, 'no PIN at first');
  eq(await checkPin(base, '0000'), true, 'no PIN: anything passes');
  const locked = await withPin(base, '1234');
  eq(hasPin(locked), true, 'withPin sets a PIN');
  if (JSON.stringify(locked).includes('1234')) fail('the PIN digits are stored');
  if (!/^[0-9a-f]{64}$/.test(locked.pinHash!)) fail('the PIN hash is not SHA-256 hex');
  eq(await checkPin(locked, '1234'), true, 'right PIN passes');
  eq(await checkPin(locked, '4321'), false, 'wrong PIN fails');
  const again = await withPin(base, '1234');
  if (again.pinSalt === locked.pinSalt || again.pinHash === locked.pinHash) fail('same PIN twice gave the same salt or hash');
  eq(await hashPin('1234', 'salt'), await hashPin('1234', 'salt'), 'hash is deterministic for a salt');
  eq(hasPin(withoutPin(locked)), false, 'withoutPin removes it');
  eq(['1234', '0000', '123', '12345', '12a4', ''].map(validPin), [true, true, false, false, false, false], 'validPin');
  let threw = false;
  try {
    await withPin(base, '12');
  } catch {
    threw = true;
  }
  if (!threw) fail('withPin accepted a 2-digit PIN');
  for (let i = 0; i < 200; i++) {
    const q = parentQuestion();
    const [a, b] = q.text.split(' × ').map(Number);
    if (a * b !== q.answer || a < 12 || a > 48 || b < 3 || b > 9) fail(`parent question ${q.text} = ${q.answer}`);
  }
  ok('PIN: hashed with salt, checked, removed; parent question');
}

// The parents' settings (phase 8): filled for old records, broken values dropped.
{
  const old = normalizeProfile({ id: 'p1', name: 'דנה', worldId: 'ninja', age: 6 } as never);
  eq(old.parent, { goal: null, breakAfter: null, blocked: [], lockAhead: false }, 'an old record gets parent defaults');
  const set = normalizeProfile({ id: 'p2', name: 'דנה', worldId: 'ninja', age: 6, parent: { goal: { kind: 'minutes', amount: 15 }, breakAfter: 20, blocked: ['match', 'pop', 'match', 'nope'], lockAhead: true } } as never);
  eq(set.parent, { goal: { kind: 'minutes', amount: 15 }, breakAfter: 20, blocked: ['match'], lockAhead: true }, 'parent settings kept (Pop never blocked, unknown games dropped)');
  const bad = normalizeProfile({ id: 'p3', name: 'דנה', worldId: 'ninja', age: 6, parent: { goal: { kind: 'laps', amount: 3 }, breakAfter: 2, blocked: 'match', lockAhead: 'yes' } } as never);
  eq(bad.parent, { goal: null, breakAfter: null, blocked: [], lockAhead: false }, 'broken parent settings dropped');
  ok("parents' settings in the profile: defaults for old records, kept, broken values dropped");
}

if (failures) {
  console.log(`\n${failures} failure(s)`);
  process.exit(1);
}
console.log('\nall profile checks passed');
