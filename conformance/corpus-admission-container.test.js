// eoreader6 · conformance/corpus-admission-container — READING-POLICY P5.3
// enforced at the door (closes appendix A20: "Admission does not strip the
// container"). Before this, `admitChunked` chunked the received text whole,
// so a Project Gutenberg header and license were admitted, indexed,
// retrievable, and quotable — measured on War and Peace, `wp:chunk-0` was
// the PG header plus the table of contents. The move being pinned here is
// the general one: information about the CONTAINER is turned off so the
// work is legible, and the turn-off is (a) declared — spans.js's PG markers,
// a fact about the file format, never about the work — (b) reversible — the
// received bytes stay whole on the document record — and (c) addressed —
// every span's byte range still names its position in the received text, so
// slicing the original's UTF-8 bytes reproduces the span exactly.

import { test } from "node:test";
import assert from "node:assert/strict";

import { createSession, admitChunked, searchSpans, documentText } from "../packages/host/corpus.js";

const utf8 = new TextEncoder();
const utf8dec = new TextDecoder();

// A small PG-shaped file: front matter (with a multi-byte author name, so a
// char/byte mixup in the offset shift cannot hide), the start marker, a body
// long enough to chunk, the end marker, and a license tail. The body
// paragraphs are plain prose on purpose — isContainerParagraph must not eat
// them.
const FRONT = [
  "The Project Gutenberg eBook of A Small Book",
  "",
  "Title: A Small Book",
  "Author: Hélène Exemplaire",
  "Language: English",
  "",
].join("\n");
const START_MARKER = "*** START OF THE PROJECT GUTENBERG EBOOK A SMALL BOOK ***";
const BODY = [
  "",
  "",
  "Natásha walked into the ballroom and every head turned at once.",
  "The winter campaign had emptied the estates along the southern road.",
  "Nobody spoke of the letter, though everyone in the household had read it.",
  "",
].join("\n");
const END_MARKER = "*** END OF THE PROJECT GUTENBERG EBOOK A SMALL BOOK ***";
const LICENSE = [
  "",
  "Updated editions will replace the previous one—the old editions will be renamed.",
  "Creating the works from print editions not protected by U.S. copyright law.",
].join("\n");

const PG_FILE = [FRONT, START_MARKER, BODY, END_MARKER, LICENSE].join("\n");

test("admission strips the container: no span carries the PG header or license", () => {
  const session = createSession();
  const { chunks } = admitChunked(session, { text: PG_FILE, sourceId: "source:small-book.txt" });
  assert.ok(chunks >= 1, "the body itself must still be admitted");
  for (const span of session.spans.values()) {
    assert.ok(!span.text.includes("Project Gutenberg"), `container text was admitted as a span: ${span.text.slice(0, 80)}`);
    assert.ok(!span.text.includes("Updated editions"), "the license tail must not be admitted");
    assert.ok(!span.text.includes("Title: A Small Book"), "the front matter must not be admitted");
  }
});

test("the container is turned off, not erased: retrieval cannot reach it, the document record still holds it", () => {
  const session = createSession();
  admitChunked(session, { text: PG_FILE, sourceId: "source:small-book.txt" });
  const out = searchSpans(session, { query: "gutenberg license editions", limit: 10 });
  assert.equal(out.spans.length, 0, "the license must be unreachable through retrieval");
  const doc = documentText(session, "source:small-book.txt");
  assert.ok(doc.text.includes("*** START OF THE PROJECT GUTENBERG EBOOK"), "the received bytes stay whole on the document record");
});

test("span addresses stay reversible: slicing the RECEIVED text's UTF-8 bytes at [byte_start, byte_end) reproduces each span exactly", () => {
  const session = createSession();
  admitChunked(session, { text: PG_FILE, sourceId: "source:small-book.txt" });
  const bytes = utf8.encode(PG_FILE);
  let checked = 0;
  for (const span of session.spans.values()) {
    const sliced = utf8dec.decode(bytes.subarray(span.byte_start, span.byte_end));
    assert.equal(sliced, span.text, "a span's address must name its position in the received file, container included");
    checked++;
  }
  assert.ok(checked >= 1, "at least one span was actually verified");
});

test("the document record declares what was cut: container byteOffset and the front-matter fields the book names itself with", () => {
  const session = createSession();
  admitChunked(session, { text: PG_FILE, sourceId: "source:small-book.txt" });
  const doc = session.documents.get("source:small-book.txt");
  assert.ok(doc.container, "a stripped document must say so");
  assert.ok(doc.container.byteOffset > 0, "the cut's byte offset is recorded");
  const fields = Object.fromEntries(doc.container.front.map((f) => [f.field, f.value]));
  assert.equal(fields.Title, "A Small Book");
  assert.equal(fields.Author, "Hélène Exemplaire");
});

test("a file with no container is admitted exactly as before, and says so", () => {
  const PLAIN = "The cold rain fell on the empty streets of the silent town, and nobody minded it much.";
  const session = createSession();
  const { chunks } = admitChunked(session, { text: PLAIN, sourceId: "source:plain.txt" });
  assert.equal(chunks, 1);
  const doc = session.documents.get("source:plain.txt");
  assert.equal(doc.container, null, "nothing was stripped, nothing is claimed");
  const [span] = [...session.spans.values()];
  assert.equal(span.byte_start, 0, "no shift when nothing was cut");
  assert.equal(span.text, PLAIN);
});
