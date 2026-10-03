// Optional 4-digit PIN per profile (from ChessIt). It keeps siblings out of each other's profile;
// it is not real security (the data is on the phone, and a parent can always reset it).
// Stored as SHA-256(salt + pin) with a random salt, never as the digits themselves.
import type { Profile } from './profiles';

export const PIN_LENGTH = 4;

function hex(buf: ArrayBuffer): string {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function newSalt(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return hex(bytes.buffer);
}

/** FNV-1a, only if crypto.subtle is missing (it needs https or localhost). */
function fallbackHash(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return 'fnv:' + h.toString(16);
}

export async function hashPin(pin: string, salt: string): Promise<string> {
  if (!crypto.subtle) return fallbackHash(`${salt}:${pin}`);
  const data = new TextEncoder().encode(`${salt}:${pin}`);
  return hex(await crypto.subtle.digest('SHA-256', data));
}

export function hasPin(p: Pick<Profile, 'pinHash' | 'pinSalt'>): boolean {
  return !!p.pinHash && !!p.pinSalt;
}

/** True for exactly PIN_LENGTH digits. */
export function validPin(pin: string): boolean {
  return new RegExp(`^[0-9]{${PIN_LENGTH}}$`).test(pin);
}

/** The profile with a new PIN (not saved). */
export async function withPin(p: Profile, pin: string): Promise<Profile> {
  if (!validPin(pin)) throw new Error('PIN must be 4 digits');
  const pinSalt = newSalt();
  return { ...p, pinSalt, pinHash: await hashPin(pin, pinSalt) };
}

/** The profile without a PIN (not saved). */
export function withoutPin(p: Profile): Profile {
  const rest = { ...p };
  delete rest.pinHash;
  delete rest.pinSalt;
  return rest;
}

export async function checkPin(p: Profile, pin: string): Promise<boolean> {
  if (!hasPin(p)) return true;
  return (await hashPin(pin, p.pinSalt!)) === p.pinHash;
}

/**
 * "Forgot PIN": a sum a parent does in their head but a young child usually cannot
 * (two-digit × one-digit). Answering it removes the PIN.
 * (In a math app some older children can solve it – that is fine: the PIN is a courtesy lock.)
 */
export function parentQuestion(rand = Math.random): { text: string; answer: number } {
  const a = 12 + Math.floor(rand() * 37); // 12–48
  const b = 3 + Math.floor(rand() * 7); // 3–9
  return { text: `${a} × ${b}`, answer: a * b };
}
