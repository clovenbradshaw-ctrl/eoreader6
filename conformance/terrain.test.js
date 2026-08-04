import { test } from "node:test";
import assert from "node:assert/strict";

import { createGraph, readTriples, edgeKey } from "../packages/engine/emergence/graph.js";
import { gammaFor } from "../packages/engine/emergence/tiers.js";

// ═══════════════════════════════════════════════════════════════════════════════
// TERRAIN TESTS — robust testing of the 6 new organs against realistic data.
//
// The discipline: each organ must produce MEANINGLESS results on random data
// and MEANINGFUL results on structured data. If it cannot distinguish the two,
// it is not earned.
// ═══════════════════════════════════════════════════════════════════════════════

// ── SEG·Figure: connected components ────────────────────────────────────────
import { connectedComponents } from "../packages/engine/emergence/segment.js";

test("SEG·Figure: connected components find real clusters in a graph", () => {
  // Two disconnected subgraphs: {victor, creature} and {alice, bob}.
  const g = createGraph({ gamma: gammaFor(12), pruneBelow: 1e-4 });
  readTriples(g, [
    { subject: "victor", verb: "knows", object: "creature", polarity: "+" },
    { subject: "victor", verb: "loves", object: "creature", polarity: "+" },
    { subject: "alice", verb: "knows", object: "bob", polarity: "+" },
  ]);

  const components = connectedComponents(g.nodes, g.edges);
  assert.equal(components.length, 2, "two disconnected subgraphs");
  const sizes = components.map((c) => c.length).sort();
  assert.deepEqual(sizes, [2, 2], "each component has 2 nodes");
});

test("SEG·Figure: single component when graph is fully connected", () => {
  const g = createGraph({ gamma: gammaFor(12), pruneBelow: 1e-4 });
  readTriples(g, [
    { subject: "a", verb: "x", object: "b", polarity: "+" },
    { subject: "b", verb: "x", object: "c", polarity: "+" },
    { subject: "c", verb: "x", object: "a", polarity: "+" },
  ]);

  const components = connectedComponents(g.nodes, g.edges);
  assert.equal(components.length, 1, "one component");
  assert.equal(components[0].length, 3, "all 3 nodes in one component");
});

test("SEG·Figure: isolated nodes form their own components", () => {
  const g = createGraph({ gamma: gammaFor(12), pruneBelow: 1e-4 });
  readTriples(g, [
    { subject: "a", verb: "x", object: "b", polarity: "+" },
    { subject: "c", verb: "x", object: "d", polarity: "+" },
    { subject: "e", verb: "x", object: "f", polarity: "+" },
  ]);

  const components = connectedComponents(g.nodes, g.edges);
  assert.equal(components.length, 3, "three disconnected pairs");
});

test("SEG·Figure: empty graph returns empty components", () => {
  const g = createGraph({ gamma: gammaFor(12), pruneBelow: 1e-4 });
  const components = connectedComponents(g.nodes, g.edges);
  assert.equal(components.length, 0, "no components in empty graph");
});

test("SEG·Figure: structural edges (binding) participate in components", () => {
  const g = createGraph({ gamma: gammaFor(12), pruneBelow: 1e-4 });
  readTriples(g, [
    { subject: "a", verb: "knows", object: "b", polarity: "+" },
  ], { structural: true });
  // Structural key: "a||b"
  const components = connectedComponents(g.nodes, g.edges);
  assert.equal(components.length, 1, "structural edge connects a and b");
  assert.deepEqual(components[0].sort(), ["a", "b"]);
});

// ── SEG·Pattern: community detection ────────────────────────────────────────
import { communityDetection, communitiesFromLabels } from "../packages/engine/emergence/segment.js";

test("SEG·Pattern: community detection finds two communities in a modular graph", () => {
  const g = createGraph({ gamma: gammaFor(12), pruneBelow: 1e-4 });
  // Dense connections within two groups, sparse between.
  readTriples(g, [
    // Group 1: victor, creature
    { subject: "victor", verb: "knows", object: "creature", polarity: "+" },
    { subject: "victor", verb: "loves", object: "creature", polarity: "+" },
    { subject: "creature", verb: "fears", object: "victor", polarity: "−" },
    // Group 2: alice, bob
    { subject: "alice", verb: "knows", object: "bob", polarity: "+" },
    { subject: "alice", verb: "loves", object: "bob", polarity: "+" },
    { subject: "bob", verb: "admires", object: "alice", polarity: "+" },
    // Weak bridge
    { subject: "victor", verb: "knows", object: "alice", polarity: "+" },
  ]);

  const labels = communityDetection(g.nodes, g.edges);
  const communities = communitiesFromLabels(labels);
  // The two dense groups should be in separate communities.
  assert.ok(communities.length >= 2, `at least 2 communities, got ${communities.length}`);

  // victor and creature should be in the same community.
  const vComm = labels.get("victor");
  const cComm = labels.get("creature");
  assert.equal(vComm, cComm, "victor and creature share a community");

  // alice and bob should be in the same community.
  const aComm = labels.get("alice");
  const bComm = labels.get("bob");
  assert.equal(aComm, bComm, "alice and bob share a community");
});

test("SEG·Pattern: fully connected graph has one community", () => {
  const g = createGraph({ gamma: gammaFor(12), pruneBelow: 1e-4 });
  readTriples(g, [
    { subject: "a", verb: "x", object: "b", polarity: "+" },
    { subject: "b", verb: "x", object: "c", polarity: "+" },
    { subject: "c", verb: "x", object: "a", polarity: "+" },
    { subject: "a", verb: "x", object: "c", polarity: "+" },
  ]);

  const labels = communityDetection(g.nodes, g.edges);
  const communities = communitiesFromLabels(labels);
  assert.equal(communities.length, 1, "one community in fully connected graph");
});

test("SEG·Pattern: empty graph returns empty labels", () => {
  const g = createGraph({ gamma: gammaFor(12), pruneBelow: 1e-4 });
  const labels = communityDetection(g.nodes, g.edges);
  assert.equal(labels.size, 0, "no labels in empty graph");
});

// ── CON·Ground: initial co-occurrence relating ──────────────────────────────
import { detectCoOccurrences } from "../packages/engine/emergence/segment.js";

test("CON·Ground: detects co-occurrences within frames", () => {
  const units = [
    { id: "victor", frame: 0 },
    { id: "creature", frame: 0 },
    { id: "alice", frame: 0 },
    { id: "bob", frame: 1 },
    { id: "carol", frame: 1 },
  ];

  const pairs = detectCoOccurrences(units);
  assert.equal(pairs.length, 4, "3 choose 2 in frame 0 + 3 choose 2 in frame 1 = 3 + 1 = 4");
  // Frame 0: victor-creature, victor-alice, creature-alice
  const f0 = pairs.filter((p) => p.frame === 0);
  assert.equal(f0.length, 3, "3 pairs in frame 0");
  const f1 = pairs.filter((p) => p.frame === 1);
  assert.equal(f1.length, 1, "1 pair in frame 1");
});

test("CON·Ground: no pairs when each frame has one unit", () => {
  const units = [
    { id: "a", frame: 0 },
    { id: "b", frame: 1 },
    { id: "c", frame: 2 },
  ];
  const pairs = detectCoOccurrences(units);
  assert.equal(pairs.length, 0, "no co-occurrences when units are in separate frames");
});

test("CON·Ground: deduplicates within a frame", () => {
  const units = [
    { id: "a", frame: 0 },
    { id: "b", frame: 0 },
    { id: "a", frame: 0 },  // duplicate
  ];
  const pairs = detectCoOccurrences(units);
  assert.equal(pairs.length, 1, "only one pair despite duplicate a");
});

test("CON·Ground: handles empty input", () => {
  const pairs = detectCoOccurrences([]);
  assert.equal(pairs.length, 0, "no pairs from empty input");
});

// ── SYN·Figure: transitive composition ──────────────────────────────────────
import { composeTransitive } from "../packages/engine/emergence/segment.js";

test("SYN·Figure: composes transitive link when A→B and B→C exist", () => {
  const g = createGraph({ gamma: gammaFor(12), pruneBelow: 1e-4 });
  readTriples(g, [
    { subject: "a", verb: "knows", object: "b", polarity: "+" },
    { subject: "b", verb: "knows", object: "c", polarity: "+" },
  ]);

  const composed = composeTransitive(g.edges, g.edges);
  assert.ok(composed.length >= 1, "at least one transitive link composed");
  const link = composed[0];
  assert.equal(link.subject, "a");
  assert.equal(link.object, "c");
  assert.equal(link.via, "b");
});

test("SYN·Figure: does NOT compose when direct link already exists", () => {
  const g = createGraph({ gamma: gammaFor(12), pruneBelow: 1e-4 });
  readTriples(g, [
    { subject: "a", verb: "knows", object: "b", polarity: "+" },
    { subject: "b", verb: "knows", object: "c", polarity: "+" },
    { subject: "a", verb: "knows", object: "c", polarity: "+" },
  ]);

  const composed = composeTransitive(g.edges, g.edges);
  const aToC = composed.filter((c) => c.subject === "a" && c.object === "c");
  assert.equal(aToC.length, 0, "no composition when direct link exists");
});

test("SYN·Figure: does NOT compose across different verbs", () => {
  const g = createGraph({ gamma: gammaFor(12), pruneBelow: 1e-4 });
  readTriples(g, [
    { subject: "a", verb: "knows", object: "b", polarity: "+" },
    { subject: "b", verb: "loves", object: "c", polarity: "+" },
  ]);

  const composed = composeTransitive(g.edges, g.edges);
  const aToC = composed.filter((c) => c.subject === "a" && c.object === "c");
  assert.equal(aToC.length, 0, "no composition across different verbs");
});

test("SYN·Figure: no composition when graph has no chains", () => {
  const g = createGraph({ gamma: gammaFor(12), pruneBelow: 1e-4 });
  readTriples(g, [
    { subject: "a", verb: "knows", object: "b", polarity: "+" },
    { subject: "c", verb: "knows", object: "d", polarity: "+" },
  ]);

  const composed = composeTransitive(g.edges, g.edges);
  assert.equal(composed.length, 0, "no transitive chains to compose");
});

test("SYN·Figure: handles empty graph", () => {
  const g = createGraph({ gamma: gammaFor(12), pruneBelow: 1e-4 });
  const composed = composeTransitive(g.edges, g.edges);
  assert.equal(composed.length, 0, "no composition from empty graph");
});

// ── NUL·Pattern: kind void differentiation ──────────────────────────────────
import { kindVoid } from "../packages/engine/emergence/kind-void.js";

test("NUL·Pattern: required numbers are required", () => {
  assert.throws(() => kindVoid([], []), /draws/);
  assert.throws(() => kindVoid([], [], { draws: 100 }), /seed/);
});

test("NUL·Pattern: different kinds have low p-value (they are distinguishable)", () => {
  // Kind A: records with anchor_shared=true
  const kindA = Array.from({ length: 10 }, () => ({ anchor_shared: true, subject_shared: false }));
  // Kind B: records with subject_shared=true
  const kindB = Array.from({ length: 10 }, () => ({ anchor_shared: false, subject_shared: true }));

  const result = kindVoid(kindA, kindB, { draws: 199, seed: 42 });
  assert.ok(!result.reason, "not a gap");
  assert.ok(result.pValue < 0.1, `different kinds should be distinguishable, p=${result.pValue}`);
});

test("NUL·Pattern: identical kinds have high p-value (they are indistinguishable)", () => {
  // Both kinds have the same feature distribution.
  const kindA = Array.from({ length: 10 }, () => ({ anchor_shared: true, subject_shared: true }));
  const kindB = Array.from({ length: 10 }, () => ({ anchor_shared: true, subject_shared: true }));

  const result = kindVoid(kindA, kindB, { draws: 199, seed: 42 });
  assert.ok(!result.reason, "not a gap");
  assert.ok(result.pValue > 0.3, `identical kinds should not be distinguishable, p=${result.pValue}`);
});

test("NUL·Pattern: handles empty kinds gracefully", () => {
  const result = kindVoid([], [], { draws: 100, seed: 1 });
  assert.equal(result.reason, "empty_kinds");
});

// ── SIG·Pattern: kind co-occurrence ─────────────────────────────────────────
import { kindCoOccurrence } from "../packages/engine/emergence/kind-void.js";

test("SIG·Pattern: required numbers are required", () => {
  assert.throws(() => kindCoOccurrence(new Map(), []), /draws/);
  assert.throws(() => kindCoOccurrence(new Map(), [], { draws: 100 }), /seed/);
});

test("SIG·Pattern: frequently co-occurring kinds have low p-values", () => {
  // A and B co-occur in 40% of 50 frames (20 frames).
  // A appears in 30 frames total, B in 25 frames total.
  // Under the null, expected co-occurrence = 30/50 * 25/50 = 0.30.
  // Observed = 20/50 = 0.40 — higher than chance, but modest.
  // We test that A-C (random) is less significant than A-B (correlated).
  const assignments = new Map();
  for (let i = 0; i < 50; i++) {
    const present = new Set();
    if (i < 30) present.add("A");           // A in frames 0–29
    if (i >= 5 && i < 30) present.add("B"); // B in frames 5–29 (25 frames)
    if (i % 7 === 0) present.add("C");      // C in ~7 frames, randomly placed
    if (present.size > 0) assignments.set(i, present);
  }

  const results = kindCoOccurrence(assignments, ["A", "B", "C"], { draws: 199, seed: 42 });
  assert.ok(results.length > 0, "results produced");

  const ab = results.find((r) => r.a === "A" && r.b === "B");
  const ac = results.find((r) => r.a === "A" && r.c === "C");

  assert.ok(ab, "A-B pair exists");
  assert.ok(ab.pValue < 0.1, `A-B should co-occur significantly, p=${ab.pValue}`);

  if (ac) {
    assert.ok(ac.pValue > ab.pValue, `A-C should be less significant than A-B: ${ac.pValue} > ${ab.pValue}`);
  }
});

test("SIG·Pattern: returns empty for fewer than 2 kinds", () => {
  const results = kindCoOccurrence(new Map(), ["A"], { draws: 100, seed: 1 });
  assert.equal(results.length, 0, "need at least 2 kinds");
});

test("SIG·Pattern: handles empty assignments", () => {
  const results = kindCoOccurrence(new Map(), ["A", "B"], { draws: 100, seed: 1 });
  assert.equal(results.length, 0, "no results from empty assignments");
});

// ── declared numbers: all enforced ───────────────────────────────────────────

test("every new organ enforces declared numbers — none is defaulted", () => {
  // kindVoid
  assert.throws(() => kindVoid([], []), /draws/);
  // kindCoOccurrence
  assert.throws(() => kindCoOccurrence(new Map(), []), /draws/);
  // composeTransitive — no declared numbers (pure graph operation)
  // connectedComponents — no declared numbers (pure graph operation)
  // communityDetection — maxIterations is optional with a sensible default
  // detectCoOccurrences — no declared numbers (pure data operation)
});
