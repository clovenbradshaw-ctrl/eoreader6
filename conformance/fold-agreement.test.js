// eoreader6 · conformance/fold-agreement — the cross-organ agreement fixture
// READING-POLICY P7.1 names, which A21 stayed open against: "one accented
// name, every text-comparing path in a session, all agreeing." The class was
// measured before it was named (A21: searchSpans returned three spans for
// "Natásha" and zero for "Natasha" against a text that writes the name 1,213
// times; A22: the same shape in a consumer, from the other side). One fold
// per session, by behavior: every path here is asked the same question in
// both orthographies and must give the same answer — and the material always
// comes back as the admitted bytes, accents intact. The fold shapes
// matching, never the material.

import { test } from "node:test";
import assert from "node:assert/strict";

import { createSession, admitChunked, searchSpans } from "../packages/host/corpus.js";
import { executePrompt } from "../packages/host/surfer.js";
import { headingsMatch } from "../packages/engine/perceiver/text/segments.js";
import { diaNorm } from "../packages/engine/perceiver/text/surfaces.js";

// One accented name, in plain prose, exactly one line carrying it — so every
// path has a single right answer to agree on.
const LINES = [
  "The evening opened quietly at the estate, with carriages arriving one by one.",
  "Servants moved between the kitchens and the long tables in the lower hall.",
  "Natásha entered the great ballroom and every conversation stopped at once.",
  "The old count greeted his guests near the tall windows overlooking the garden.",
  "Later the musicians tuned their instruments while the candles were lit.",
];
const DOC = LINES.join("\n");
const SOURCE = "source:agreement.txt";

const sessionWithDoc = () => {
  const session = createSession();
  admitChunked(session, { text: DOC, sourceId: SOURCE });
  return session;
};

test("the fold itself is one map: both orthographies of the witness name fold identically", () => {
  assert.equal(diaNorm("Natásha"), diaNorm("Natasha"));
});

test("searchSpans: both orthographies of the query reach the same spans", () => {
  const session = sessionWithDoc();
  const accented = searchSpans(session, { query: "Natásha ballroom", limit: 10 });
  const plain = searchSpans(session, { query: "Natasha ballroom", limit: 10 });
  assert.ok(accented.spans.length >= 1, "the accented query must find the material");
  assert.deepEqual(
    plain.spans.map((s) => s.span_id),
    accented.spans.map((s) => s.span_id),
    "the two orthographies must retrieve the same spans in the same order",
  );
  assert.ok(plain.spans[0].text.includes("Natásha"), "the admitted bytes come back accents intact");
});

test("the surfer's content rung: both orthographies of the prompt address the same line", () => {
  const session = sessionWithDoc();
  const accented = executePrompt(session, "Natásha ballroom", { sourceFilter: SOURCE });
  const plain = executePrompt(session, "Natasha ballroom", { sourceFilter: SOURCE });
  for (const [label, r] of [["accented", accented], ["plain", plain]]) {
    assert.notEqual(r.gap, "content_not_found", `the ${label} prompt must address the material`);
    assert.ok(String(r.text ?? "").includes("Natásha"), `the ${label} prompt's snip must contain the passage, accents intact`);
  }
  assert.equal(plain.content_line, accented.content_line, "both orthographies must anchor on the same line");
});

test("headingsMatch: an accented label answers an unaccented prompt, and the reverse", () => {
  assert.ok(headingsMatch("open the Natasha ballroom scene", "Natásha ballroom"));
  assert.ok(headingsMatch("open the Natásha ballroom scene", "Natasha ballroom"));
});
