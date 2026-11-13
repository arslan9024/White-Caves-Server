/**
 * microTypoInjector.ts — Optional organic humanization with subtle typo
 * corrections.
 *
 * Randomly introduces and then "corrects" a typo (via a follow-up message
 * with an asterisk correction) to make automated text look more human.
 *
 * Only applied probabilistically (~8% of messages) to avoid being obvious.
 */

const INJECTION_PROBABILITY = 0.08;
const ADJACENT_KEYS: Record<string, string[]> = {
  a: ['s', 'q', 'z'],
  b: ['v', 'n', 'g'],
  c: ['x', 'v', 'd'],
  d: ['s', 'f', 'e', 'c'],
  e: ['w', 'r', 'd'],
  f: ['d', 'g', 'r', 'v'],
  g: ['f', 'h', 't', 'b'],
  h: ['g', 'j', 'y', 'n'],
  i: ['u', 'o', 'k'],
  j: ['h', 'k', 'u', 'm'],
  k: ['j', 'l', 'i'],
  l: ['k', 'o', 'p'],
  m: ['n', 'j', 'k'],
  n: ['b', 'm', 'h'],
  o: ['i', 'p', 'l'],
  p: ['o', 'l'],
  q: ['w', 'a'],
  r: ['e', 't', 'f'],
  s: ['a', 'd', 'w', 'z'],
  t: ['r', 'y', 'g'],
  u: ['y', 'i', 'j'],
  v: ['c', 'b', 'f'],
  w: ['q', 'e', 's'],
  x: ['z', 'c', 's'],
  y: ['t', 'u', 'h'],
  z: ['a', 'x', 's'],
};

/**
 * Pick a random element from an array.
 */
function pickRandom<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Find a suitable position for a typo injection.
 * Returns an index into the word array, or -1 if none found.
 */
function findTypoCandidate(words: string[]): number {
  // Only consider words >= 4 chars to make the typo natural
  const candidates = words
    .map((w, i) => ({ w, i }))
    .filter(({ w }) => w.length >= 4 && /^[a-zA-Z]+$/.test(w));

  if (candidates.length === 0) return -1;
  return pickRandom(candidates).i;
}

/**
 * Introduce a single adjacent-key typo into a word.
 */
function corruptWord(word: string): { corrupted: string; original: string } {
  const chars = [...word.toLowerCase()];
  // Pick a random interior character (not first/last)
  const pos = 1 + Math.floor(Math.random() * (chars.length - 2));
  const original = chars[pos];
  const neighbors = ADJACENT_KEYS[original];

  if (!neighbors || neighbors.length === 0) {
    return { corrupted: word, original: word };
  }

  chars[pos] = pickRandom(neighbors);

  // Preserve original casing
  const result = chars.map((c, i) => {
    if (word[i] === word[i].toUpperCase()) {
      return c.toUpperCase();
    }
    return c;
  }).join('');

  return { corrupted: result, original: word };
}

export interface TypoResult {
  text: string;
  hadTypo: boolean;
  correction: string | null;
}

/**
 * Optionally inject a micro-typo into the text.
 *
 * With ~8% probability, one word gets a single adjacent-key substitution.
 * The returned `correction` field contains a `*corrected_word` string that
 * can be sent as a follow-up message.
 *
 * @param text  The original message text.
 * @returns The (possibly corrupted) text and an optional correction message.
 */
export function injectMicroTypo(text: string): TypoResult {
  if (Math.random() > INJECTION_PROBABILITY) {
    return { text, hadTypo: false, correction: null };
  }

  const words = text.split(' ');
  const idx = findTypoCandidate(words);

  if (idx === -1) {
    return { text, hadTypo: false, correction: null };
  }

  const { corrupted, original } = corruptWord(words[idx]);
  if (corrupted === original) {
    return { text, hadTypo: false, correction: null };
  }

  words[idx] = corrupted;

  return {
    text: words.join(' '),
    hadTypo: true,
    correction: `*${original}`,
  };
}
