// eoreader6 · read-tiered — reading where SIGNIFICANCE IS ALTITUDE.
//
// Nothing here scores a passage. A passage's significance is how far up the
// fold it reached, and it reaches an altitude only by having surprised every
// tier beneath it. Atmosphere, lens and paradigm are priors that surprise
// built; their shift is what surprise means up there.
//
// The prior at the bottom is a GRAPH — who does what to whom — not a word
// histogram. A reader's belief is relational.

import { readFileSync } from "node:fs";
import { splitSentences, stripContainer } from "../packages/engine/perceiver/text/spans.js";
import { extractRelations } from "../packages/engine/perceiver/text/relations.js";
import { createGraph, readTriples, strongestEdges, edgeKey } from "../packages/engine/emergence/graph.js";
import { createTier, foldThrough, massIsConsistent } from "../packages/engine/emergence/tiers.js";
import { extractSurfaces, discoverReferents, diaNorm } from "../packages/engine/perceiver/text/surfaces.js";
import { tokenize, buildFrequencyTable, functionWordSet } from "../packages/engine/perceiver/text/material.js";
import { projectReferents } from "../packages/engine/referents/index.js";
import { resolveNarratorSpans, narratorAt, isFirstPerson } from "../packages/engine/perceiver/text/narrator.js";

const SENTENCES_PER_FRAME = 6;

// Forgetting slows with altitude; the gate tightens with it. Both declared.
const TIERS = [
  { name: "atmosphere", gamma: 0.75, quantile: 0.80 },
  { name: "lens",       gamma: 0.92, quantile: 0.85 },
  { name: "paradigm",   gamma: 0.98, quantile: 0.90 },
];

const TEXT_PATH = process.argv[2] || "/Users/mlacy/Documents/Default Project/pg84.txt";
const COREF_PATH = process.argv[3] || "/Users/mlacy/Documents/Default Project/eoPriors/priors/coref/pg84-frankenstein.json";
const { text } = stripContainer(readFileSync(TEXT_PATH, "utf8").replace(/\r\n/g, "\n").replace(/\r/g, "\n"));

const sentences = splitSentences(text);
const frames = [];
for (let i = 0; i < sentences.length; i += SENTENCES_PER_FRAME) {
  const g = sentences.slice(i, i + SENTENCES_PER_FRAME);
  if (g.length) frames.push({ order: frames.length, offset: g[0].offset, text: g.map((s) => s.text).join(" ") });
}

// ── the cast, discovered blind ──────────────────────────────────────────────
// A triple is kept only when BOTH ends resolve to a referent. Ungated, the
// extractor emits "as he | said | this" and "waves and | lost | in darkness"
// — the regex takes whatever 1-2 words precede a verb, so the graph fills
// with fragments and the belief structure is noise. eoreader5 gates on its
// resolved cast for exactly this reason, and that gate is what makes SVO
// "stronger evidence than any keyword" rather than weaker.
const table = buildFrequencyTable(tokenize(text));
const surfaces = extractSurfaces(sentences, { functionWords: functionWordSet(table) });
const referentEvents = discoverReferents(surfaces).events;
const cast = projectReferents(referentEvents).filter((r) => !r.mergedInto);

// surface -> referent id, longest surface first so "Victor Frankenstein"
// wins over "Victor" when both could match
// Surfaces must be at least 2 characters and must match on WORD BOUNDARIES.
// Substring matching on a 1-char surface is catastrophic: "M." (Monsieur
// Krempe, Monsieur Waldman) yields the surface "m", and `phrase.includes("m")`
// then matches any phrase containing the letter — `ref:auto:m` appeared in 6
// of the 8 strongest relations before this.
const surfaceToId = [];
for (const r of cast) for (const s of r.surfaces) {
  const n = diaNorm(s);
  if (n.length < 2) continue;
  surfaceToId.push([n, new RegExp(`\\b${n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "u"), r.id]);
}
surfaceToId.sort((a, b) => b[0].length - a[0].length);

// First-person surfaces resolve by SCOPE, never by string. Frankenstein is a
// frame narrative (Walton > Victor > Creature); every "I" inside the
// creature's tale is the creature, and the same three letters elsewhere are
// someone else. Without this, referent-gated SVO kept 4 of 570 triples,
// because in first-person narrative nearly every subject is a pronoun.
const coref = JSON.parse(readFileSync(COREF_PATH, "utf8"));
const narratorSource = coref.referents.find((r) => Array.isArray(r.narratorSpans) && r.narratorSpans.length);
const { resolved: narratorSpans, unresolved: narratorGaps } = narratorSource
  ? resolveNarratorSpans(text, `ref:narrator:${narratorSource.id}`, narratorSource.narratorSpans)
  : { resolved: [], unresolved: [] };

let firstPersonBound = 0, firstPersonGapped = 0;

const resolve = (phrase, offset) => {
  const p = diaNorm(phrase);
  if (isFirstPerson(p)) {
    const n = narratorAt(offset, narratorSpans);
    if (n.referentId) { firstPersonBound++; return n.referentId; }
    firstPersonGapped++;
    return null; // a typed absence: some narrator, and the prior does not say which
  }
  for (const [, re, id] of surfaceToId) if (re.test(p)) return id;
  return null;
};

const graph = createGraph({ gamma: 0.9 });
const tiers = TIERS.map(createTier);
const reached = [];
let totalTriples = 0;
let statedTotal = 0;

for (const f of frames) {
  const raw = extractRelations(f.text);
  statedTotal += raw.length;
  const triples = raw
    .map((t) => ({ ...t, subject: resolve(t.subject, f.offset), object: resolve(t.object, f.offset), said: t }))
    .filter((t) => t.subject && t.object && t.subject !== t.object);
  totalTriples += triples.length;
  if (!triples.length) continue;

  const g = readTriples(graph, triples);

  // what rises is the frame's own stated relations
  const arrival = new Map();
  for (const t of triples) {
    const k = edgeKey(t);
    arrival.set(k, (arrival.get(k) ?? 0) + 1);
  }

  const fold = foldThrough(tiers, arrival);
  reached.push({ ...f, triples, graphBelief: g.belief, fold });
}

for (const t of tiers) {
  if (!massIsConsistent(t)) throw new Error(`tier ${t.name}: prior mass diverged from its total`);
}

console.log(`READING ${TEXT_PATH.split("/").pop()} — ${frames.length} frames`);
console.log(`SVO: ${statedTotal} stated, ${totalTriples} kept (both ends resolve to a referent)`);
console.log(`cast discovered blind: ${cast.length} referents`);
console.log(`narrator spans: ${narratorSpans.length} resolved, ${narratorGaps.length} unresolved`);
console.log(`first-person: ${firstPersonBound} bound by scope, ${firstPersonGapped} typed gaps`);
console.log(`graph: ${graph.nodes.size} nodes, ${graph.edges.size} live relations\n`);
for (const t of tiers) console.log(`  ${t.name.padEnd(11)} observed ${t.observations}, shifted ${t.shifts}`);

const byAltitude = (n) => reached.filter((r) => r.fold.reached >= n && r.fold.results[n - 1]?.passed);

for (let level = TIERS.length; level >= 1; level--) {
  const hits = byAltitude(level);
  const name = TIERS[level - 1].name.toUpperCase();
  console.log(`\n${"═".repeat(70)}\n${name} — reached by ${hits.length} passages\n${"═".repeat(70)}`);
  for (const h of hits.slice(0, level === 3 ? 12 : 6)) {
    const pct = ((h.offset / text.length) * 100).toFixed(1);
    const rel = h.triples.slice(0, 2).map((t) => `${t.subject.replace("ref:auto:","")} ${t.polarity === "-" ? "NOT " : ""}${t.verb} ${t.object.replace("ref:auto:","")}`).join(" · ");
    console.log(`\n── ${pct}%   ${rel}`);
    console.log(`   ${h.text.replace(/\n/g, " ").slice(0, 220)}…`);
  }
}

console.log(`\n${"═".repeat(70)}\nstrongest relations believed at the end:`);
for (const e of strongestEdges(graph, 8)) console.log(`  ${e.weight.toFixed(2)}  ${e.edge}`);
