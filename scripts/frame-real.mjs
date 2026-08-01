// Does `frame` manufacture a trend on real material that has none?
//
// conformance/frame.test.js establishes the organ on synthetic readers whose
// ananda is made to hold or made to decay, which proves it can tell the two
// apart and proves nothing about how it behaves when nobody has arranged an
// answer. SEED.md #3 is the worry, one grain up: a null that would clear
// anything put in front of it. An organ that reports a closing reader on
// stationary material would be exactly that, and it would be worse than
// useless because the thing it reports is a death.
//
// So: SPECIFICITY on real material, and SENSITIVITY on the same real material
// with a real decline imposed on it.
//
// Material: the 96 lines (32 lines x 3 velocity components) of 1024 points
// through the JHTDB isotropic1024coarse DNS already in goldens/, the same
// material scripts/turbulence-growth-rule.mjs licensed `phase` on. Homogeneous
// isotropic turbulence is stationary in space by construction, so a reader
// working along a line meets material with no trend in it. Any trend the organ
// reports there, it invented. That the index is SPACE is received from JHTDB
// (Amendment III); nothing here calls it time.
//
// `window` 5 is sub-Taylor (dissipative), received from the flow rather than
// chosen — see turbulence-growth-rule.mjs for the scales.
//
// The reader: 32 successive stretches of 32 points, one act each, equal extent
// throughout because `note` requires it. The attenuated arm multiplies stretch
// t by a factor falling from 1 to 0.15 — the material is real, the decline is
// imposed and known, which is what makes it a control rather than a finding.

import { load, line } from "../packages/engine/perceiver/field/material.js";
import { ground, received, isGap } from "../nul/index.js";
import { openFrame, note, selfLevel, selfWitness } from "../frame/index.js";

const FIELD = "goldens/turbulence/isotropic1024coarse-x-lines.npy";
const DRAWS = 128;
const WINDOW = 5;
const RESEEDS = 16;
const STRETCH = 32;
const ACTS = 32;

// The gift. A first ground is received and must name its giver (SEED.md #1);
// JHTDB is the giver of everything downstream of it here.
const GIFT = received({
  samples: Array.from({ length: 64 }, (_, i) => 0.2 + (2 * i) / 63),
  provenance: { giver: "JHTDB isotropic1024coarse" },
});

const field = await load(FIELD);
const [nLines, nX] = field.shape;
console.log(`material: ${FIELD}  shape ${field.shape.join("x")}  (${nLines} lines of ${nX})`);
console.log(`reader:   ${ACTS} acts x ${STRETCH} points, window ${WINDOW}, draws ${DRAWS}, reseeds ${RESEEDS}\n`);

const readLine = (material, attenuate) => {
  let f = note(openFrame({ giver: "frame-real" }), { op: "NUL", grain: "Ground", ground: GIFT });
  for (let t = 0; t < ACTS; t++) {
    const raw = material.slice(t * STRETCH, (t + 1) * STRETCH);
    if (raw.length < STRETCH) break;
    const amp = attenuate ? 1 - 0.85 * (t / (ACTS - 1)) : 1;
    const stretch = attenuate ? raw.map((v) => v * amp) : raw;
    const g = ground({ material: [...stretch], draws: DRAWS, window: WINDOW, seed: t });
    if (isGap(g)) continue;
    const next = note(f, { op: "EVA", grain: "Figure", ground: g });
    if (isGap(next)) return next;
    f = next;
  }
  return f;
};

for (const attenuate of [false, true]) {
  const arm = attenuate ? "ATTENUATED (a real decline imposed)" : "AS MEASURED (stationary — no trend to find)";
  const level = {};
  const spoke = {};
  let n = 0;

  for (let l = 0; l < nLines; l++) {
    for (let c = 0; c < 3; c++) {
      const material = line(field, { axis: 1, at: [l, c], component: c });
      const f = readLine(material, attenuate);
      if (isGap(f)) { level[`frame:${f.gap}`] = (level[`frame:${f.gap}`] ?? 0) + 1; continue; }

      const lv = selfLevel(f, { draws: DRAWS, window: WINDOW, reseeds: RESEEDS });
      const key = isGap(lv) ? `gap:${lv.gap}` : lv.continuous ? "continuous" : `displaced:opened=${lv.opened}`;
      level[key] = (level[key] ?? 0) + 1;

      const w = selfWitness(f, { draws: DRAWS, window: WINDOW, reseeds: RESEEDS });
      const wKey = isGap(w) ? w.gap : `record:opened=${w.opened}`;
      spoke[wKey] = (spoke[wKey] ?? 0) + 1;
      n++;
    }
  }

  console.log(`── ${arm} — ${n} lines ${"─".repeat(Math.max(0, 30 - arm.length))}`);
  console.log(`   selfLevel   ${Object.entries(level).map(([k, v]) => `${k}=${v}`).join("  ")}`);
  console.log(`   selfWitness ${Object.entries(spoke).map(([k, v]) => `${k}=${v}`).join("  ")}\n`);
}
