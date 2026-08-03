// eoreader6 · conformance/corpus — host-tier cast discovery and its
// language-received abbreviation prior. No coverage existed for
// sessionReferents/discoveredCast before this suite.

import { test } from "node:test";
import assert from "node:assert/strict";

import { createSession, admitChunked, sessionReferents } from "../packages/host/corpus.js";

// Long enough that "Mrs Darcy" recurs across multiple sentences — the exact
// regression bin/priors/lang/en.json's own notes measure against (Pride and
// Prejudice: 0 -> 249 occurrences kept intact with the prior, 0 -> 0 derived).
const TITLED_TEXT = [
  "Mrs. Darcy walked into the room. Everyone turned to look at Mrs. Darcy.",
  "Elizabeth greeted Mrs. Darcy politely. Mrs. Darcy said very little.",
  "Later, Mrs. Darcy left without a word. No one understood Mrs. Darcy that evening.",
].join(" ");

test("sessionReferents: with no declared language, behaviour is exactly the engine's derived fallback (unchanged for every existing caller)", () => {
  const session = createSession();
  admitChunked(session, { text: TITLED_TEXT, sourceId: "source:titled.txt" });
  const { referents, gaps } = sessionReferents(session, { sourceId: "source:titled.txt" });
  // Without a prior, "Mrs." falls outside the derived fallback's own length
  // bar (documented in spans.js: comes out at ~2 characters on real prose,
  // so a 3-character title is out of reach by construction) and is not
  // recognised as an abbreviation, so "Darcy" is severed from "Mrs." at
  // sentence boundaries — the documented limit this prior exists to fix.
  assert.ok(!gaps.some((g) => g.reason === "no_abbreviation_prior_for_language"));
  const surfaces = referents.flatMap((r) => r.surfaces ?? []);
  assert.ok(!surfaces.includes("Mrs Darcy"), "without a prior, the titled form should not survive intact");
});

test("sessionReferents: language: \"en\" loads bin/priors/lang/en.json and keeps the titled name intact", () => {
  const session = createSession();
  admitChunked(session, { text: TITLED_TEXT, sourceId: "source:titled-en.txt", language: "en" });
  const { referents, gaps } = sessionReferents(session, { sourceId: "source:titled-en.txt" });
  assert.ok(!gaps.some((g) => g.reason === "no_abbreviation_prior_for_language"));
  const surfaces = referents.flatMap((r) => r.surfaces ?? []);
  assert.ok(surfaces.includes("Mrs Darcy"), "with the English prior, the titled form should survive intact");
});

test("sessionReferents: an unknown declared language reports a typed gap and still falls back, never a crash", () => {
  const session = createSession();
  admitChunked(session, { text: TITLED_TEXT, sourceId: "source:titled-xx.txt", language: "xx-not-a-real-language" });
  const { gaps } = sessionReferents(session, { sourceId: "source:titled-xx.txt" });
  assert.ok(gaps.some((g) => g.reason === "no_abbreviation_prior_for_language"));
});
