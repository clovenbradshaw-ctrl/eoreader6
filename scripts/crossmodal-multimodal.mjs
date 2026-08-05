// eoreader6 · scripts/crossmodal-multimodal — applies verdict/crossmodal's
// explicit tag to the REAL, already-checked-in results in
// goldens/multimodal/fixtures.json (a genuine ffmpeg-decoded run against
// engineered, known-boundary audio/image/video, not fabricated here).
//
// goldens/multimodal/README.md already argues in prose that the boundary
// mechanism is "not a weaker version of the same finding; it's the SAME
// finding, reproduced cross-modally." This script is that claim run
// through the mechanism instead of asserted: each case's DEF-clearing
// position is normalized (nearest / materialLength) so audio, image, and
// video are comparable at all, and each case's `causalHit` — already an
// independent check against a synthesized, KNOWN ground-truth boundary,
// not something invented here — becomes the declared `corroborated` flag.
// `strength` reads "earned" only when a single, unambiguous DEF clearing
// fired (defAt.length === 1); more than one candidate boundary is read as
// "held", not earned, because the case is then ambiguous about which
// clearing is the one that matters.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { crossModalTag } from "../verdict/crossmodal.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const fixturesPath = join(HERE, "..", "goldens", "multimodal", "fixtures.json");

const sideFromCase = (c) => ({
  strength: c.defAt.length === 1 ? "earned" : c.defAt.length > 1 ? "held" : "weak",
  position: c.nearest != null ? c.nearest / c.materialLength : NaN,
  corroborated: c.causalHit === true,
});

const main = () => {
  const { cases } = JSON.parse(readFileSync(fixturesPath, "utf8"));
  const byId = Object.fromEntries(cases.map((c) => [c.id, c]));
  const pairs = [
    ["audio", "image"],
    ["audio", "video"],
    ["image", "video"],
  ];

  console.log("goldens/multimodal/fixtures.json, read as declared sides (never re-measured here):");
  for (const c of cases) {
    const side = sideFromCase(c);
    console.log(`  ${c.id.padEnd(6)} defAt=${JSON.stringify(c.defAt).padEnd(12)} position=${side.position.toFixed(3)} strength=${side.strength.padEnd(6)} corroborated=${side.corroborated}`);
  }

  console.log("\ncrossModalTag(), positionTolerance=0.05 (declared, not derived):");
  for (const [idA, idB] of pairs) {
    const v = crossModalTag(sideFromCase(byId[idA]), sideFromCase(byId[idB]), { positionTolerance: 0.05 });
    console.log(`  ${idA} <-> ${idB}: ${v.tag}${v.distance != null ? ` (distance=${v.distance.toFixed(3)})` : ""}`);
  }
};

if (fileURLToPath(import.meta.url) === process.argv[1]) main();
