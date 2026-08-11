// eoreader6 · read-kinds-networked — KINDS INDUCED WITH THE NETWORK TERRAIN
// CONSULTED, NOT ONLY ATTRIBUTES.
//
// read-people.mjs already answers "do I already understand what these beings
// are" by clustering being-records on ATTRIBUTE PROFILES alone (relations,
// partners, subject_share, negated_share — emergence/people.js's own
// deriveBeingRecords). Measured on pg84.txt: that produces exactly ONE kind,
// "partners=1", 11 members mixing people (Agatha, Elizabeth, Henry) and
// places (America, Chamounix, Edinburgh, Germany) — everything with exactly
// one relation partner, undifferentiated, because nothing in that path ever
// asks which entities actually cluster together in the graph. The Network
// terrain (emergence/segment.js's connectedComponents / communityDetection)
// answers exactly that question and was never wired into kind induction at
// all — confirmed by grepping every import in kinds.js and people.js.
//
// This script is read-people.mjs's own pipeline (SVO relations, the same
// referent/narrator resolution), PLUS:
//
//   · LINK, causal — emergence/binding.js's co-arrival binding, wired the
//     same way scripts/read-ladder.mjs already validated (Amendment XXI):
//     modality-blind, three nulls, direction and polarity, fed to the graph
//     as structural edges alongside the verb-inclusive SVO ones.
//   · NETWORK — communityDetection (label propagation) run on the resulting
//     graph AFTER both relation sources are in it. Each being-record gets one
//     new categorical attribute, `community`, so kind induction's own
//     profile-Jaccard similarity can separate groups that are topologically
//     distinct even when their attribute profiles (partners, subject_share)
//     are identical — which is exactly the case that produced one
//     undifferentiated kind before.
//
// NOT A NEW STATISTIC. induceKinds' own CON/EVA/DEF/INS/SYN chain is
// unmodified; communityDetection and connectedComponents are unmodified,
// already-conformance-tested organs (SEG·Figure, SEG·Pattern). The only new
// code is the composition: label the being-records, then hand them to the
// SAME understand()/induceKinds() read-people.mjs already calls.

import { readFileSync } from "node:fs";
import { splitSentences, stripContainer } from "../packages/engine/perceiver/text/spans.js";
import { extractRelations, discoverRelationVocab } from "../packages/engine/perceiver/text/relations.js";
import { createGraph, readTriples, strongestEdges } from "../packages/engine/emergence/graph.js";
import { gammaFor } from "../packages/engine/emergence/tiers.js";
import { extractSurfaces, discoverReferents, diaNorm } from "../packages/engine/perceiver/text/surfaces.js";
import { tokenize, buildFrequencyTable, functionWordSet } from "../packages/engine/perceiver/text/material.js";
import { projectReferents } from "../packages/engine/referents/index.js";
import { resolveAllNarratorSpans, narratorAt, isFirstPerson } from "../packages/engine/perceiver/text/narrator.js";
import { deriveBeingRecords, understand, foldHolons } from "../packages/engine/emergence/people.js";
import { readLinks, bindingTriples } from "../packages/engine/emergence/binding.js";
import { connectedComponents, communityDetection } from "../packages/engine/emergence/segment.js";
import { isGap } from "../nul/index.js";

const TEXT_PATH = process.argv[2] || "scripts/adversarial/fixtures/pg84-frankenstein.txt";
const COREF_PATH = process.argv[3] || "scripts/adversarial/fixtures/pg84-frankenstein.coref.json";
const KIND_PRIORS_PATH = process.argv[4] || "";
const POPULATION = process.argv[5] || "pg84-beings-networked";
const READER_VERSION = "eo-2026-08-11";

// Declared, never defaulted — same numbers read-people.mjs and
// read-ladder.mjs already declare for the same organs.
const OPTS = { minPrevalence: 0.25, minKindSize: 3, permutations: 200, quantile: 0.95, seed: 42, reseeds: 24 };
const SENTENCES_PER_FRAME = 6;
const WINDOW = 12;            // the reach of the present (relation graph forgetting)
const PRUNE_BELOW = 1e-4;
const BINDING_WINDOW = 2;     // co-arrival window, frames — read-ladder.mjs's own declared value
const BINDING_DRAWS = 199;    // null draws for displacement, reversal, reseed
const BINDING_SEED = 20260811;

const { text } = stripContainer(readFileSync(TEXT_PATH, "utf8").replace(/\r\n/g, "\n").replace(/\r/g, "\n"));

const sentences = splitSentences(text);
const frames = [];
for (let i = 0; i < sentences.length; i += SENTENCES_PER_FRAME) {
  const g = sentences.slice(i, i + SENTENCES_PER_FRAME);
  if (g.length) frames.push({ order: frames.length, offset: g[0].offset, text: g.map((s) => s.text).join(" ") });
}

// ── the cast, discovered blind ──────────────────────────────────────────────
const table = buildFrequencyTable(tokenize(text));
const functionWords = functionWordSet(table);
const surfaces = extractSurfaces(sentences, { functionWords });
const referentEvents = discoverReferents(surfaces).events;
const cast = projectReferents(referentEvents).filter((r) => !r.mergedInto);

const { verbs, candidates } = discoverRelationVocab(text, { surfaces, functionWords, minSurfaces: 1 });

const surfaceToId = [];
for (const r of cast) for (const s of r.surfaces) {
  const n = diaNorm(s);
  if (n.length < 2) continue;
  surfaceToId.push([n, new RegExp(`\\b${n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "u"), r.id]);
}
surfaceToId.sort((a, b) => b[0].length - a[0].length);

const coref = JSON.parse(readFileSync(COREF_PATH, "utf8"));
const { resolved: narratorSpans, unresolved: narratorGaps } = resolveAllNarratorSpans(text, coref.referents);

let firstPersonBound = 0, firstPersonGapped = 0;
const resolve = (phrase, offset) => {
  const p = diaNorm(phrase);
  if (isFirstPerson(p)) {
    const n = narratorAt(offset, narratorSpans);
    if (n.referentId) { firstPersonBound++; return n.referentId; }
    firstPersonGapped++;
    return null;
  }
  for (const [, re, id] of surfaceToId) if (re.test(p)) return id;
  return null;
};

// ── LINK, verb-inclusive: SVO into the graph, and referent arrivals tracked
// for binding at the same time (one pass over the frames, not two) ─────────
const graph = createGraph({ gamma: gammaFor(WINDOW), pruneBelow: PRUNE_BELOW });
const referentArrivals = new Map(); // referentId -> [frameOrder, ...]
let totalTriples = 0, statedTotal = 0;

for (const f of frames) {
  const raw = extractRelations(f.text, { verbs });
  statedTotal += raw.length;
  const triples = raw
    .map((t) => ({ ...t, subject: resolve(t.subject, f.offset), object: resolve(t.object, f.offset), said: t }))
    .filter((t) => t.subject && t.object && t.subject !== t.object);
  totalTriples += triples.length;
  if (triples.length) readTriples(graph, triples);

  for (const t of triples) {
    for (const id of [t.subject, t.object]) {
      const arr = referentArrivals.get(id);
      if (!arr) referentArrivals.set(id, [f.order]);
      else if (arr[arr.length - 1] !== f.order) arr.push(f.order);
    }
  }
}

// ── LINK, modality-blind: binding.js's co-arrival Link, fed structurally ───
const entityRegister = [...referentArrivals.entries()]
  .filter(([, arr]) => arr.length >= 2)
  .map(([id, arrivals]) => ({ id, arrivals: arrivals.slice().sort((a, b) => a - b) }));

let bindingTriplesCount = 0;
if (entityRegister.length >= 2) {
  const links = readLinks(entityRegister, { window: BINDING_WINDOW, draws: BINDING_DRAWS, seed: BINDING_SEED, totalUnits: frames.length });
  const lt = bindingTriples(links);
  bindingTriplesCount = lt.length;
  if (lt.length > 0) readTriples(graph, lt, { structural: true });
}

console.log(`READING ${TEXT_PATH.split("/").pop()} — ${frames.length} frames`);
console.log(`relation vocabulary: ${verbs.size} verbs measured from the text (${candidates.length} candidates seen, minSurfaces 1)`);
console.log(`SVO (Link, verb-inclusive): ${statedTotal} stated, ${totalTriples} kept`);
console.log(`binding (Link, modality-blind): ${entityRegister.length} entities registered, ${bindingTriplesCount} triples witnessed → graph`);
console.log(`cast discovered blind: ${cast.length} referents`);
console.log(`narrator spans: ${narratorSpans.length} resolved, ${narratorGaps.length} unresolved`);
console.log(`first-person: ${firstPersonBound} bound by scope, ${firstPersonGapped} typed gaps`);
console.log(`Network (graph): ${graph.nodes.size} nodes, ${graph.edges.size} live relations\n`);

// ── NETWORK: topology, read once the graph holds both relation sources ─────
const components = connectedComponents(graph.nodes, graph.edges);
const communityLabels = communityDetection(graph.nodes, graph.edges);
const componentOf = new Map();
components.forEach((comp, i) => { for (const id of comp) componentOf.set(id, `c${i}`); });

console.log(`Network topology: ${components.length} connected component(s) (sizes: ${components.map((c) => c.length).sort((a, b) => b - a).slice(0, 8).join(", ")}${components.length > 8 ? ", …" : ""})`);
const communityCount = new Set(communityLabels.values()).size;
console.log(`Network topology: ${communityCount} communit${communityCount === 1 ? "y" : "ies"} by label propagation\n`);

// ── the population, read — being-records augmented with the topology the
// attribute-only path never consulted ───────────────────────────────────────
const baseRecords = deriveBeingRecords(graph, { population: POPULATION });
const records = baseRecords.map((r) => Object.freeze({
  ...r,
  attributes: Object.freeze([
    ...r.attributes,
    Object.freeze({ field_id: "component", value_type: "categorical", value: componentOf.get(r.id) ?? "isolated", count: 1 }),
    Object.freeze({ field_id: "community", value_type: "categorical", value: communityLabels.get(r.id) ?? r.id, count: 1 }),
  ]),
}));
console.log(`being-records derived: ${records.length} (beings incident to a live relation), each carrying component + community`);

const kindPriors = KIND_PRIORS_PATH ? JSON.parse(readFileSync(KIND_PRIORS_PATH, "utf8")).priors : [];
const u = understand(records, { priors: kindPriors, population: POPULATION, readerVersion: READER_VERSION, ...OPTS });

console.log("\n" + "═".repeat(70));
if (u.understanding === "prior") {
  console.log(`UNDERSTANDING: prior — ${u.giver} covers ${u.population} as kind ${u.prior_kind.label}`);
} else {
  console.log(`UNDERSTANDING: invented — no kind prior covered this population for reader ${u.readerVersion}`);
  console.log(`reading: ${u.reading.keys.join(", ")} → valued: ${u.reading.valued}`);
  for (const f of u.reading.fields) console.log(`   ${f.field_id.padEnd(16)} ${f.mode}${f.scale ? ` (scale ${f.scale})` : ""}`);
  for (const g of u.reading.gaps) console.log(`   gap ${g.field_id}: ${g.gap} — ${g.reason}`);
  console.log(`\nkinds induced: ${u.kinds.length}`);
  for (const k of u.kinds) {
    console.log(`\n  KIND ${k.label} (${k.members.length} members)`);
    console.log(`    height: ${k.height}${k.height === "above" ? ` — existence ${k.heightGate.existence.passed ? "earned" : "failed"}, constraint ${k.heightGate.constraint.passed ? "earned" : "failed"}` : ""}`);
    if (k.core) console.log(`    core: centred on ${k.core.centre}, lift ${k.core.lift.toFixed(3)}`);
    const roster = k.members.slice(0, 16).map((m) => m.replace(/^ref:(auto|narrator):/, ""));
    console.log(`    members: ${roster.join(", ")}${k.members.length > 16 ? ` … and ${k.members.length - 16} more` : ""}`);
  }
}

console.log("\n" + "═".repeat(70));
console.log("THE FOLD — kinds as holons:");
const fold = foldHolons(records, { population: POPULATION, levels: 3, ...OPTS });
if (!fold.halted) {
  console.log(`reached all ${fold.ladder.length} declared levels without halting`);
} else {
  console.log(`halted at level ${fold.halted.at}: ${fold.halted.reason}`);
}
for (const l of fold.ladder) {
  console.log(`  L${l.level} ${l.population} — ${l.records.length} records → ${l.kinds.length} kind(s)`);
  for (const k of l.kinds) console.log(`      ${k.label}: ${k.members.length} members, ${k.height}`);
}

console.log("\n" + "═".repeat(70));
console.log("strongest relations believed at the end (referent ids):");
for (const e of strongestEdges(graph, 8)) console.log(`  ${e.weight.toFixed(2)}  ${e.edge}`);
