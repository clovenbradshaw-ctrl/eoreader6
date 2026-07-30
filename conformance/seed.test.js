import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const sources = ["nul/index.js", "verdict/index.js", "provenance/index.js", "event_log/index.js", "holon_level/index.js", "discourse/index.js"];

const codeOf = (file) =>
  readFileSync(join(root, file), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");

test("the doctrine is present, and the instrument is held outside the code", () => {
  assert.ok(existsSync(join(root, "SEED.md")));
  assert.ok(existsSync(join(root, "CUBE.md")));
  assert.ok(!existsSync(join(root, "nul", "cube.js")), "the cube is an instrument, not a runtime");
});

test("only earned organs exist alongside the core", () => {
  const dirs = readdirSync(root, { withFileTypes: true })
    .filter((e) => e.isDirectory() && !e.name.startsWith(".") && e.name !== "node_modules")
    .map((e) => e.name)
    .sort();
  assert.deepEqual(dirs, ["conformance", "discourse", "event_log", "holon_level", "nul", "packages", "provenance", "scripts", "verdict"], `unearned organ planted: ${dirs.join(", ")}`);
});

test("nothing is ported — no organ vocabulary has crept in", () => {
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

const levelTest = (name, modPath, { enables }) => {
  test(`${name} is above nul by the level test`, () => {
    const nulCode = codeOf("nul/index.js");
    const modCode = codeOf(modPath);
    // Existence-dependency: mod imports from nul, nul does not import mod
    assert.ok(modCode.includes("../nul/index.js"), `${name} must depend on nul`);
    assert.ok(!modCode.includes("../${name}/"), `unexpected self-reference`); // sanity
    // nul must not import the new organ (check for its directory path in imports)
const nulImports = nulCode.match(/require\s*\([^)]+\)|from\s+['"][^'"]+['"]/g) || [];
const modInNul = nulImports.some(i => i.includes(name));
    assert.ok(!modInNul, `nul must not depend on ${name}`);
    for (const feature of enables) {
      assert.ok(modCode.includes(feature), `${name} must ${feature}`);
    }
    // nul's API surface preserved
    assert.ok(nulCode.includes("export const ground"), "nul still exports ground");
    assert.ok(nulCode.includes("export const difference"), "nul still exports difference");
    assert.ok(nulCode.includes("export const level"), "nul still exports level");
    assert.ok(nulCode.includes("export const pattern"), "nul still exports pattern");
    assert.ok(nulCode.includes("export const witness"), "nul still exports witness");
  });
};

levelTest("verdict", "verdict/index.js", {
  importsNul: true,
  enables: ["verdict:"],
});

levelTest("provenance", "provenance/index.js", {
  importsNul: true,
  enables: ["register", "lookup", "createRegistry", "search"],
});

levelTest("event_log", "event_log/index.js", {
  importsNul: true,
  enables: ["tick", "createLog", "replay", "findByType"],
});

levelTest("holon_level", "holon_level/index.js", {
  importsNul: true,
  enables: ["existenceDependencyTest", "possibilityConstraintTest", "holonLevelRelation"],
});

levelTest("discourse", "discourse/index.js", {
  importsNul: true,
  enables: ["createSession", "activateMotif", "pushTopic", "addSubTask", "commit"],
});
