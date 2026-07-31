import { test } from "node:test";
import assert from "node:assert/strict";

import { createSession, admitChunked, searchSpans } from "../packages/host/corpus.js";

const FIXTURE = [
  "It was on a dreary night of November that I beheld the accomplishment of my toils.",
  "The heat equation describes how temperature spreads through a body over time.",
  "The cold rain fell on the empty streets of the silent town.",
  "Quantum physics informed neural networks solve partial differential equations.",
].join("\n");

const admit = (session, text, sourceId = "source:Fixture.txt") =>
  admitChunked(session, { text, sourceId });

test("a multi-word query matches by token presence, not by contiguous substring", () => {
  const session = createSession();
  admit(session, FIXTURE);
  const out = searchSpans(session, { query: "heat equation over time", limit: 10 });
  assert.ok(out.spans.length >= 1, "the heat-equation line must be found even though the full query is not a substring of it");
  const top = out.spans[0];
  assert.ok(top.text.includes("The heat equation"));
});

test("coverage ranks spans by the fraction of query words actually present", () => {
  const session = createSession();
  admit(session, FIXTURE);
  const out = searchSpans(session, { query: "cold empty silent town", limit: 10 });
  assert.ok(out.spans.length >= 1);
  assert.equal(out.spans[0].coverage, 1, "the line containing every query word must rank first with full coverage");
  assert.ok(out.spans[0].text.includes("cold rain"));
});

test("a query sharing only common words with a span ranks it below one sharing rare words", () => {
  const session = createSession();
  admit(session, FIXTURE);
  const out = searchSpans(session, { query: "equation the of", limit: 10 });
  const top = out.spans[0];
  assert.ok(top.text.includes("heat equation"), "the span with the rare word ranks above spans that share only function words");
});

test("a query with no shared words returns no spans, honestly", () => {
  const session = createSession();
  admit(session, FIXTURE);
  const out = searchSpans(session, { query: "quantumgarbled nonword zzqx", limit: 10 });
  assert.equal(out.spans.length, 0);
  assert.equal(out.gaps, null);
});

test("returned spans stay byte-accurate — the span registry text is untouched", () => {
  const session = createSession();
  admit(session, FIXTURE);
  const out = searchSpans(session, { query: "heat temperature body", limit: 10 });
  const span = out.spans[0];
  const rec = session.spans.get(span.span_id);
  assert.equal(rec.text, span.text, "the returned text is the exact admitted span, never a reconstruction");
  assert.equal(rec.byte_start, span.byte_start);
  assert.equal(rec.byte_end, span.byte_end);
});

test("empty and whitespace queries are typed no-ops, not searches", () => {
  const session = createSession();
  admit(session, FIXTURE);
  for (const q of ["", "   "]) {
    const out = searchSpans(session, { query: q });
    assert.equal(out.spans.length, 0);
    assert.equal(out.gaps, null);
  }
});
