import { test } from "node:test";
import assert from "node:assert/strict";

import { GRAINS, OPERATOR_ORDER, ORGANS, cellOf } from "../packages/engine/operators.js";
import { coverageReport } from "../packages/engine/emergence/coverage.js";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = dirname(__dirname);

const report = coverageReport();

// ── the grid is fully accounted for ───────────────────────────────────────────

test("every cell of the grid is occupied or named as an empty question, never both", () => {
  const grid = OPERATOR_ORDER.length * GRAINS.length;
  assert.equal(report.grid.cells, grid, "the report knows the whole grid");
  assert.equal(report.counts.total, grid, "occupied + empty == the whole grid");
  assert.equal(report.counts.occupied + report.counts.empty, grid);

  const seen = new Set();
  for (const c of report.occupied) {
    assert.ok(!seen.has(`${c.op}·${c.grain}`), `${c.op}·${c.grain} appears once`);
    seen.add(`${c.op}·${c.grain}`);
    assert.ok(GRAINS.includes(c.grain) && OPERATOR_ORDER.includes(c.op), "cell is in the algebra");
  }
  for (const c of report.empty) {
    assert.ok(!seen.has(`${c.op}·${c.grain}`), `${c.op}·${c.grain} cannot be both earned and empty`);
    seen.add(`${c.op}·${c.grain}`);
    assert.ok(GRAINS.includes(c.grain) && OPERATOR_ORDER.includes(c.op), "cell is in the algebra");
  }
  assert.equal(seen.size, grid, "every cell accounted for exactly once");
});

// ── empty cells are questions, never guesses ─────────────────────────────────

test("empty cells are open questions in the algebra's own vocabulary", () => {
  for (const c of report.empty) {
    assert.equal(c.organs, undefined, "an empty cell carries no organs — it is not inferred into one");
    const derived = cellOf(c.op, c.grain);
    assert.equal(c.terrain, derived.terrain, `${c.op}·${c.grain} terrain comes from the algebra`);
    assert.equal(c.stance, derived.stance, `${c.op}·${c.grain} stance comes from the algebra`);
  }
  // The instrument's honest self-report: only Ground is fully earned.
  assert.ok(report.empty.length > 0, "the report admits unearned cells — a perfect grid would be a lie");
});

// ── occupied cells are derived, and the roster is fully reported ─────────────

test("every occupied cell derives its terrain and stance from the algebra", () => {
  for (const c of report.occupied) {
    const derived = cellOf(c.op, c.grain);
    assert.equal(c.terrain, derived.terrain, `${c.op}·${c.grain} terrain matches the algebra`);
    assert.equal(c.stance, derived.stance, `${c.op}·${c.grain} stance matches the algebra`);
    assert.ok(c.organs.length >= 1, `${c.op}·${c.grain} has at least one organ`);
  }
  const ids = new Set();
  for (const c of report.occupied)
    for (const o of c.organs) ids.add(o.id);
  assert.deepEqual([...ids].sort(), ORGANS.map((o) => o.id).sort(), "every roster organ is reported exactly once");
});

// ── the organ is wired ───────────────────────────────────────────────────────

test("the coverage organ is a live, declared organ of the roster", async () => {
  const { pathToFileURL } = await import("node:url");
  const entry = ORGANS.find((o) => o.id === "emergence/coverage");
  assert.ok(entry, "emergence/coverage is in the roster");
  const mod = await import(pathToFileURL(join(ROOT, entry.module)).href);
  assert.equal(typeof mod[entry.fn], "function", "coverageReport is a live export");
  assert.equal(mod.CELL.op, entry.op, "declared CELL op matches the roster");
  assert.equal(mod.CELL.grain, entry.grain, "declared CELL grain matches the roster");
});

// ── measured, never classified ───────────────────────────────────────────────

test("the report is measured occupancy — it reads the roster and the algebra, never content", () => {
  const src = readFileSync(join(ROOT, "packages", "engine", "emergence", "coverage.js"), "utf8");
  assert.ok(!/\breadFileSync\b/.test(src), "no file reads — content is never consulted");
  assert.ok(!/\bimport\(/.test(src), "no dynamic import");
  assert.ok(!/amplitude|regex|match\(|classify/i.test(src), "no classifier vocabulary");
});
