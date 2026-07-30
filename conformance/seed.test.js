// The growth rule, enforced.
//
// An organ joins only when the level test returns `above` against the existing
// core. Until then this repository has exactly one module. These tests fail the
// moment someone plants a second one without earning it — which is the only
// mechanism that has ever worked against a tree of built-and-unwired organs.
//
// Unwired is failing. A module nothing depends on is not early, it is refuted.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const sources = ["nul/index.js", "nul/triad.js"];

/**
 * Scan code, not prose. A header comment that states an invariant names the
 * thing it forbids, and a checker that cannot tell a prohibition from a use
 * would force the doctrine out of the file that obeys it.
 */
const codeOf = (file) =>
  readFileSync(join(root, file), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");

test("the doctrine is present, and the instrument is held outside the code", () => {
  assert.ok(existsSync(join(root, "SEED.md")));
  assert.ok(existsSync(join(root, "CUBE.md")));
  assert.ok(!existsSync(join(root, "nul", "cube.js")), "the cube is an instrument, not a runtime");
});

test("there is exactly one module", () => {
  const dirs = readdirSync(root, { withFileTypes: true })
    .filter((e) => e.isDirectory() && !e.name.startsWith(".") && e.name !== "node_modules")
    .map((e) => e.name)
    .sort();
  assert.deepEqual(dirs, ["conformance", "nul"], `unearned organ planted: ${dirs.join(", ")}`);
});

test("nothing is ported — no organ vocabulary has crept in", () => {
  // Each of these named a real organ in the prior engine. Every one of them is
  // welcome here once it clears the level test against nul, and not before.
  const forbidden = ["coref", "altitude", "classify", "terrain", "stance", "span", "offset", "sentence"];
  for (const file of sources) {
    const code = codeOf(file);
    for (const name of forbidden) {
      assert.ok(
        !new RegExp(`\\b${name}`, "i").test(code),
        `${file} reaches for "${name}" — re-earn it or leave it in v5`,
      );
    }
  }
});

test("purity is inherited, not negotiated", () => {
  const forbidden = ["Date.now", "Math.random", "performance.now", "require(", "process.env"];
  for (const file of sources) {
    const code = codeOf(file);
    for (const banned of forbidden) {
      assert.ok(!code.includes(banned), `${file} uses ${banned}`);
    }
  }
});

test("no privileged frame — nothing calls itself advisory", () => {
  for (const file of sources) {
    assert.ok(
      !codeOf(file).toLowerCase().includes("advisory"),
      `${file} claims an exemption; advisory is an unpaid debt`,
    );
  }
});
