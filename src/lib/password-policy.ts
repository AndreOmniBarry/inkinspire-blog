/**
 * Password policy (NIST SP 800-63B aligned): length over complexity rules.
 * At least 10 characters, not an obvious pattern; breached passwords are rejected by the
 * Have I Been Pwned range check (k-anonymity: only the first 5 hash characters leave the server).
 */
const COMMON = new Set([
  "password", "password1", "password123", "1234567890", "12345678910", "qwertyuiop", "iloveyou12",
  "inkinspire", "inkinspire1", "letmein123", "welcome123", "abcdefghij", "0123456789", "naija12345",
]);

export function passwordProblem(pw: string): string | null {
  if (pw.length < 10) return "Use at least 10 characters. A short sentence you will remember works well.";
  if (pw.length > 128) return "Please use 128 characters or fewer.";
  if (COMMON.has(pw.toLowerCase())) return "That password is too common. Try a short sentence instead.";
  if (/^(.)\1+$/.test(pw)) return "Please don’t repeat a single character.";
  if (new Set(pw).size < 4) return "Please use a little more variety in your password.";
  return null;
}

/** 0–4 strength hint for the meter on forms (not a security control). */
export function passwordStrength(pw: string): number {
  if (!pw) return 0;
  let score = 0;
  if (pw.length >= 10) score++;
  if (pw.length >= 14) score++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
  if (/\d/.test(pw) || /[^A-Za-z0-9]/.test(pw)) score++;
  if (passwordProblem(pw)) score = Math.min(score, 1);
  return Math.min(score, 4);
}
