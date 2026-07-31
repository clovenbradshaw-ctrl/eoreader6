import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { splitSentences, deriveAbbreviations } from "../packages/engine/perceiver/text/spans.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const EN = JSON.parse(readFileSync(join(root, "bin/priors/lang/en.json"), "utf8")).abbreviations;

const texts = (t, opts) => splitSentences(t, opts).map((s) => s.text);

test("a title does not end a sentence when a prior says it is a title", () => {
  const t = "Mr. Collins arrived early. Mrs. Bennet was delighted.";
  assert.deepEqual(texts(t, { abbreviations: EN }), [
    "Mr. Collins arrived early.",
    "Mrs. Bennet was delighted.",
  ]);
});

test("REGRESSION: without abbreviation handling every titled name is severed", () => {
  // The defect this file exists for. `Mr.` was treated as a full stop, so
  // "Mr. Collins" never occurred inside any single sentence — measured at 0
  // occurrences across Pride and Prejudice against 145 in the file. The old
  // guard ("a terminator not followed by whitespace") catches 3.14 and cannot
  // catch this, because "Mr. " has a space.
  const t = "He bowed to Mr. Darcy.";
  assert.deepEqual(texts(t, { abbreviations: [] }), ["He bowed to Mr.", "Darcy."]);
  assert.deepEqual(texts(t, { abbreviations: EN }), ["He bowed to Mr. Darcy."]);
});

test("a real sentence end still ends a sentence", () => {
  assert.deepEqual(texts("She left. He stayed.", { abbreviations: EN }), ["She left.", "He stayed."]);
  assert.equal(texts("One. Two. Three.", { abbreviations: EN }).length, 3);
});

test("a decimal point is not a sentence end either — the old guard still earns its keep", () => {
  assert.deepEqual(texts("The value is 3.14 exactly.", { abbreviations: EN }), ["The value is 3.14 exactly."]);
});

test("a paragraph break is a harder boundary than any terminator", () => {
  // A chapter heading has no period and must not glue onto what follows.
  assert.deepEqual(texts("CHAPTER XVIII\n\nMr. Darcy bowed.", { abbreviations: EN }), [
    "CHAPTER XVIII",
    "Mr. Darcy bowed.",
  ]);
});

test("a chapter numeral does not split a heading from its text", () => {
  assert.deepEqual(texts("CHAPTER XVIII. The ball at Netherfield.", { abbreviations: EN }), [
    "CHAPTER XVIII. The ball at Netherfield.",
  ]);
});

test("offsets still index back into the source exactly", () => {
  const t = "Mr. Collins arrived. Mrs. Bennet was pleased.";
  for (const s of splitSentences(t, { abbreviations: EN })) {
    assert.equal(t.slice(s.offset, s.offset + s.text.length), s.text);
  }
});

// ── the derived fallback ────────────────────────────────────────────────────

test("with no prior, abbreviations are derived from the material — no word list", () => {
  // "Mr" is only ever written with a period; "left" is not. Zipf-style
  // self-reference, the same discipline material.js uses for stopwords.
  const t = "Mr. Darcy left. Mr. Bingley left. She left. He left.";
  assert.ok(deriveAbbreviations(t).has("Mr"));
  assert.ok(!deriveAbbreviations(t).has("left"));
  assert.deepEqual(texts(t), ["Mr. Darcy left.", "Mr. Bingley left.", "She left.", "He left."]);
});

test("MEASURED LIMIT: the derived fallback is a floor, and a fragile one", () => {
  // Pinned rather than hidden, because the gap is not small. Two failure modes,
  // both real, both the reason bin/priors/lang/en.json exists.

  // 1. The length bar is the text's own 10th-percentile token length, which on
  //    real English prose comes out at 2 — a three-character title cannot pass.
  const t = "Mrs. Bennet spoke. Mrs. Hurst agreed. She spoke. He agreed. It is so. We go on. I am here.";
  assert.ok(!deriveAbbreviations(t).has("Mrs"), "if this now passes, the fallback improved — update the claim");

  // 2. "Always written with a period" is all-or-nothing: ONE period-less
  //    occurrence anywhere disqualifies the token for the whole text. This is
  //    why the fallback recovered nothing at all on Pride and Prejudice, where
  //    "Mr. Darcy" measured 0 sentences derived against 249 with the prior.
  // (No single-letter tokens in the fixture: they drag the 10th-percentile
  // length bar down to 1 and would mask the effect being demonstrated.)
  const clean = "Mr. Darcy went. Mr. Bingley went. She went.";
  assert.ok(deriveAbbreviations(clean).has("Mr"));
  const polluted = clean + " The Mr and Mrs went.";
  assert.ok(!deriveAbbreviations(polluted).has("Mr"), "a single bare occurrence disqualifies the whole text");

  assert.ok(EN.includes("Mrs") && EN.includes("Mr"), "the prior covers what the fallback cannot");
});

test("derivation is deterministic and reads nothing ambient", () => {
  const t = "Mr. A went. Mr. B went. She went.";
  assert.deepEqual([...deriveAbbreviations(t)].sort(), [...deriveAbbreviations(t)].sort());
});

test("an injected prior wins over derivation, and an empty one really is empty", () => {
  const t = "Mr. Darcy left. Mr. Bingley left. She left.";
  assert.ok(texts(t, { abbreviations: [] }).includes("Mr."), "an explicit empty prior disables the fallback");
  assert.ok(!texts(t, { abbreviations: EN }).includes("Mr."));
});
