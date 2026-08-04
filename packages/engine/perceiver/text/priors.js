// eoreader6 · perceiver/text/priors — the prior register for closed-class
// word sets. Every received closed class enters through DEF.admit, names its
// giver, declares its scope (Amendment IV). These are not mined from the
// material; they are received facts about a language's function words or a
// script's typographic conventions.
//
// Each export carries a `giver` and optional `scope` so a reader can trace
// provenance back to the language or script that supplied it.

// ── lang/en — English function words ────────────────────────────────────────

/** Negation markers — a small closed grammatical class, not an open semantic list. */
export const NEGATION_WORDS = Object.freeze(new Set([
  "not", "never", "hardly", "scarcely", "neither", "nor",
  "didn't", "don't", "doesn't", "wouldn't", "couldn't", "shouldn't",
  "won't", "can't", "cannot",
]));
export const NEGATION_WORDS_META = Object.freeze({ giver: "lang/en", scope: null });

/**
 * First-person pronouns — forms whose capitalisation carries no naming
 * information in English. Same giver as FIRST_PERSON.
 */
export const NEVER_A_NAME = Object.freeze(new Set(["i", "i'm", "i'll", "i'd", "i've"]));
export const NEVER_A_NAME_META = Object.freeze({ giver: "lang/en", scope: null });

/**
 * First-person pronoun forms — who is "I" here is a function of who holds the
 * pen, not of the token itself. Same giver as NEVER_A_NAME.
 */
export const FIRST_PERSON = /^(i|me|my|mine|myself|we|us|our|ours)$/i;
export const FIRST_PERSON_META = Object.freeze({ giver: "lang/en", scope: null });

// ── script/latn — Latin-script typographic conventions ──────────────────────

/** Sentence-ending punctuation marks. */
export const SENTENCE_TERMINATORS = Object.freeze(new Set([".", "!", "?", "…"]));
export const SENTENCE_TERMINATORS_META = Object.freeze({ giver: "script/latn", scope: null });

/** Closing quote marks. */
export const CLOSING_QUOTES = Object.freeze(new Set(['"', "'", "\u201d", "\u2019"]));
export const CLOSING_QUOTES_META = Object.freeze({ giver: "script/latn", scope: null });
