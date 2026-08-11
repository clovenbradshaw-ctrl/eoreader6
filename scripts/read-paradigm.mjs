// eoreader6 · read-paradigm — WIRING THE LAST TERRAIN: PARADIGM, FROM RAW TEXT.
//
// terrain-census.mjs's own Paradigm row has always been a gap: "emergence/
// paradigm.js does not consume raw text and no script wires people.js's
// EVA·Pattern branch." That organ (refuseParadigm / rezeroParadigm) is fully
// built and conformance-tested — DEF·Pattern (does an already-induced
// paradigm still hold NEW material?) and REC·Pattern (if not, compose the
// next one) — but nothing before this script fed it two bodies of material
// from one reading in sequence.
//
// THE MISSING PIECE WAS NEVER A NEW MECHANISM. It is exactly the helix turn
// this session kept finding missing elsewhere: read part one, induce a
// paradigm (Amendment XXII's own Network-aware kind induction — reused
// verbatim, not reinvented), read further, and ask whether the paradigm
// induced from the FIRST part still holds being-records derived from the
// SECOND. `refuseParadigm` answers that; `rezeroParadigm` composes the next
// paradigm if it does not, and only if the new one demonstrably holds what
// the old one could not (its own "holds the loss" gate — a re-zero that
// concedes nothing is refused, not silently accepted).
//
// THE SPLIT is the book's own structure (perceiver/text/segments.js's
// heading detector — Amendment-independent, already validated on real
// Gutenberg text) at its declared midpoint by heading count, never by raw
// character count, so "part one" and "part two" are whole chapters, not an
// arbitrary byte cut through the middle of a sentence.
//
// Every organ below is unmodified from its own validated form:
//   perceiver/text/segments.js    outline -> the split point
//   emergence/binding.js          Link (Amendment XXI)
//   emergence/segment.js          Network (Amendment XXII)
//   emergence/people.js           being-records, induceKinds via understand()
//   emergence/paradigm.js         refuseParadigm / rezeroParadigm — THE NEW WIRING

import { readFileSync } from "node:fs";
import { lineIndex, outlineOfIndex } from "../packages/engine/perceiver/text/segments.js";
import { splitSentences, stripContainer } from "../packages/engine/perceiver/text/spans.js";
import { extractRelations, discoverRelationVocab } from "../packages/engine/perceiver/text/relations.js";
import { createGraph, readTriples } from "../packages/engine/emergence/graph.js";
import { gammaFor } from "../packages/engine/emergence/tiers.js";
import { extractSurfaces, discoverReferents, diaNorm } from "../packages/engine/perceiver/text/surfaces.js";
import { tokenize, buildFrequencyTable, functionWordSet } from "../packages/engine/perceiver/text/material.js";
import { projectReferents } from "../packages/engine/referents/index.js";
import { resolveAllNarratorSpans, narratorAt, isFirstPerson } from "../packages/engine/perceiver/text/narrator.js";
import { deriveBeingRecords, understand } from "../packages/engine/emergence/people.js";
import { readLinks, bindingTriples } from "../packages/engine/emergence/binding.js";
import { connectedComponents, communityDetection } from "../packages/engine/emergence/segment.js";
import { refuseParadigm, rezeroParadigm } from "../packages/engine/emergence/paradigm.js";
import { isGap } from "../nul/index.js";

const TEXT_PATH = process.argv[2];
const COREF_PATH = process.argv[3];
if (!TEXT_PATH || !COREF_PATH) throw new Error("usage: node scripts/read-paradigm.mjs <text> <coref-json> [population]");
const POPULATION = process.argv[4] || "paradigm-beings";

const OPTS = { minPrevalence: 0.25, minKindSize: 3, permutations: 200, quantile: 0.95, seed: 42, reseeds: 24 };
const SENTENCES_PER_FRAME = 6;
const WINDOW = 12;
const PRUNE_BELOW = 1e-4;
const BINDING_WINDOW = 2;
const BINDING_DRAWS = 199;
const BINDING_SEED = 20260811;

// ── read ONE body of text into being-records — the same chain
// read-kinds-networked.mjs already validated, factored so it can run twice
// (once per half) without duplicating the pipeline by hand. ────────────────
const readPart = (text, coref, label) => {
  const { text: body } = stripContainer(text);
  const sentences = splitSentences(body);
  const frames = [];
  for (let i = 0; i < sentences.length; i += SENTENCES_PER_FRAME) {
    const g = sentences.slice(i, i + SENTENCES_PER_FRAME);
    if (g.length) frames.push({ order: frames.length, offset: g[0].offset, text: g.map((s) => s.text).join(" ") });
  }

  const table = buildFrequencyTable(tokenize(body));
  const functionWords = functionWordSet(table);
  const surfaces = extractSurfaces(sentences, { functionWords });
  const cast = projectReferents(discoverReferents(surfaces).events).filter((r) => !r.mergedInto);
  const { verbs } = discoverRelationVocab(body, { surfaces, functionWords, minSurfaces: 1 });

  const surfaceToId = [];
  for (const r of cast) for (const s of r.surfaces) {
    const n = diaNorm(s);
    if (n.length < 2) continue;
    surfaceToId.push([n, new RegExp(`\\b${n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "u"), r.id]);
  }
  surfaceToId.sort((a, b) => b[0].length - a[0].length);

  const { resolved: narratorSpans } = resolveAllNarratorSpans(body, coref.referents ?? []);
  const resolve = (phrase, offset) => {
    const p = diaNorm(phrase);
    if (isFirstPerson(p)) {
      const n = narratorAt(offset, narratorSpans);
      return n.referentId ?? null;
    }
    for (const [, re, id] of surfaceToId) if (re.test(p)) return id;
    return null;
  };

  const graph = createGraph({ gamma: gammaFor(WINDOW), pruneBelow: PRUNE_BELOW });
  const referentArrivals = new Map();
  for (const f of frames) {
    const raw = extractRelations(f.text, { verbs });
    const triples = raw
      .map((t) => ({ ...t, subject: resolve(t.subject, f.offset), object: resolve(t.object, f.offset) }))
      .filter((t) => t.subject && t.object && t.subject !== t.object);
    if (triples.length) readTriples(graph, triples);
    for (const t of triples) for (const id of [t.subject, t.object]) {
      const arr = referentArrivals.get(id);
      if (!arr) referentArrivals.set(id, [f.order]);
      else if (arr[arr.length - 1] !== f.order) arr.push(f.order);
    }
  }

  const entityRegister = [...referentArrivals.entries()].filter(([, a]) => a.length >= 2).map(([id, a]) => ({ id, arrivals: a.slice().sort((x, y) => x - y) }));
  if (entityRegister.length >= 2) {
    const links = readLinks(entityRegister, { window: BINDING_WINDOW, draws: BINDING_DRAWS, seed: BINDING_SEED, totalUnits: frames.length });
    const lt = bindingTriples(links);
    if (lt.length > 0) readTriples(graph, lt, { structural: true });
  }

  const components = connectedComponents(graph.nodes, graph.edges);
  const communityLabels = communityDetection(graph.nodes, graph.edges);
  const componentOf = new Map();
  components.forEach((comp, i) => { for (const id of comp) componentOf.set(id, `c${i}`); });

  const baseRecords = deriveBeingRecords(graph, { population: `${POPULATION}-${label}` });
  const records = baseRecords.map((r) => Object.freeze({
    ...r,
    attributes: Object.freeze([
      ...r.attributes,
      Object.freeze({ field_id: "component", value_type: "categorical", value: componentOf.get(r.id) ?? "isolated", count: 1 }),
      Object.freeze({ field_id: "community", value_type: "categorical", value: communityLabels.get(r.id) ?? r.id, count: 1 }),
    ]),
  }));

  console.log(`  ${label}: ${frames.length} frames, ${cast.length} referents, graph ${graph.nodes.size} nodes/${graph.edges.size} edges, ${records.length} being-records`);
  return records;
};

// ── the split: real chapter boundaries, not a raw character cut ────────────
const raw = readFileSync(TEXT_PATH, "utf8").replace(/\r\n/g, "\n");
const coref = JSON.parse(readFileSync(COREF_PATH, "utf8"));
const idx = lineIndex(raw);
const outline = outlineOfIndex(idx);
if (outline.gap) throw new Error(`no structural boundaries found: ${outline.gap}`);
const mid = outline.headings[Math.floor(outline.headings.length / 2)];
const partOneText = raw.slice(0, mid.start);
const partTwoText = raw.slice(mid.start);
console.log(`PARADIGM TEST — ${TEXT_PATH.split("/").pop()}`);
console.log(`split at heading "${mid.label}" (${outline.headings.length} total headings, ${Math.floor(outline.headings.length / 2)} in part one)\n`);

console.log("reading part one (\"read so far\") …");
const partOneRecords = readPart(partOneText, coref, "part1");
console.log("reading part two (\"newly arrived\") …");
const partTwoRecords = readPart(partTwoText, coref, "part2");

// ── EVA·Pattern / SYN — the paradigm, induced from part one ────────────────
console.log("\ninducing the paradigm from part one …");
const u1 = understand(partOneRecords, { priors: [], population: `${POPULATION}-part1`, readerVersion: "eo-2026-08-11", ...OPTS });
if (u1.understanding !== "invented" || !u1.kinds || u1.kinds.length === 0) {
  console.log(`no paradigm induced from part one (${u1.understanding}${u1.prior ? ": " + u1.prior.gap : ""}) — nothing to test part two against.`);
  process.exit(0);
}
console.log(`paradigm: ${u1.kinds.length} kind(s) — ${u1.kinds.map((k) => `${k.label} (${k.members.length})`).join(", ")}`);

// ── DEF · Pattern — does the paradigm hold part two? ────────────────────────
console.log("\ntesting the paradigm against part two (refuseParadigm, DEF·Pattern) …");
const refusal = refuseParadigm(u1.kinds, partTwoRecords, { population: `${POPULATION}-part2`, ...OPTS });
if (isGap(refusal)) {
  if (refusal.gap === "paradigm_unraveled") {
    console.log(`UNRAVELED: placement=${refusal.placement}, coherent=${refusal.coherent}`);
    console.log(`  the part-one paradigm (${refusal.paradigm.join(", ")}) holds NONE of part two's records.`);
    console.log(`  part two is coherent on its own terms: ${refusal.received_coherence.join(", ")}`);

    // ── REC · Pattern — compose the next paradigm ─────────────────────────
    console.log("\ncomposing the next paradigm over part two (rezeroParadigm, REC·Pattern) …");
    const rezero = rezeroParadigm(partTwoRecords, { population: `${POPULATION}-part2`, ...OPTS }, { prior: refusal });
    if (isGap(rezero)) {
      console.log(`REZERO REFUSED: ${rezero.gap} — ${rezero.reason}`);
    } else {
      console.log(`REZEROED: new paradigm = ${rezero.paradigm.join(", ")}`);
      console.log(`  cores: ${rezero.cores.join(", ")}`);
      console.log(`  held ${rezero.held_records} of part two's records; "${rezero.reason}"`);
    }
  } else {
    console.log(`refuseParadigm gapped: ${refusal.gap} — ${refusal.reason}`);
  }
} else {
  console.log(`HELD: placement=${refusal.placement.toFixed(3)} of part two's records carry a part-one paradigm core, coherent=${refusal.coherent}`);
  if (refusal.received_kinds) console.log(`  part two is ALSO independently coherent as: ${refusal.received_kinds.join(", ")}`);
}
