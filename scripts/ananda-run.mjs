// eoreader6 · ananda-run — the general instrument. Not problem-corpus-
// specific, not verdict/AHA-gated: just nul's own ground/pattern/volume
// primitives, run K passes over a growing fraction of whatever real material
// a perceiver can reduce a file down to. Same harness for every modality —
// only the perceiver (packages/engine/perceiver/<kind>/material.js) differs.
//
// Ananda (volume — the ground's own interquartile range) is reported per
// pass as a health signal to watch, per SEED.md: "never a gate, never a
// score." Rising ananda from real new material is encounter; falling is
// extraction. Neither is chased as a target — both are observed.

import { timeLoop } from "../packages/engine/loops/time.js";
import * as text from "../packages/engine/perceiver/text/material.js";
import * as audio from "../packages/engine/perceiver/audio/material.js";
import * as video from "../packages/engine/perceiver/video/material.js";
import * as image from "../packages/engine/perceiver/image/material.js";
import * as csv from "../packages/engine/perceiver/csv/material.js";

const PERCEIVERS = { text, audio, video, image, csv };

const EXT_KIND = {
  txt: "text", md: "text",
  mp3: "audio", m4a: "audio", wav: "audio", flac: "audio", aac: "audio",
  mp4: "video", mov: "video", mkv: "video", webm: "video",
  jpg: "image", jpeg: "image", png: "image", gif: "image",
  csv: "csv",
};

export const inferKind = (path) => EXT_KIND[path.split(".").pop().toLowerCase()];

export const anandaRun = async (path, { kind, passes = 8, window = 12, draws = 200, reseeds = 5, ...perceiverOpts } = {}) => {
  const k = kind || inferKind(path);
  const perceiver = PERCEIVERS[k];
  if (!perceiver) throw new Error(`no perceiver for kind "${k}" (path: ${path})`);

  const units = await perceiver.load(path, perceiverOpts);
  const reduce = (u, { fraction }) => perceiver.reduce(u, { fraction, ...perceiverOpts });
  const passResults = timeLoop({ reduce, units, passes, window, draws, reseeds });

  return { kind: k, path, passes: passResults };
};

export const summarize = (run) => {
  const lines = [`=== [${run.kind}] ${run.path} ===`];
  for (const p of run.passes) {
    if (p.gap) {
      lines.push(`  pass ${p.pass}: GAP — ${p.gap.reason || p.gap.gap || "unknown"}`);
      continue;
    }
    const pat = p.pattern
      ? `moved=${p.pattern.moved ?? "—"} opened=${p.pattern.opened ?? "—"} disp=${p.pattern.displacement != null ? p.pattern.displacement.toFixed(1) : "—"}`
      : "(first pass, no prior ground to pattern against)";
    lines.push(`  pass ${p.pass} (${Math.round(p.fraction * 100)}% read, ${p.chunks} chunks): ananda=${p.ananda.toFixed(1)}  ${pat}`);
  }
  return lines.join("\n");
};

// CLI: node scripts/ananda-run.mjs <path> [kind] [passes]
if (process.argv[1] && process.argv[1].endsWith("ananda-run.mjs")) {
  const [, , path, kindArg, passesArg] = process.argv;
  if (!path) {
    console.error("usage: node scripts/ananda-run.mjs <path> [kind] [passes]");
    process.exit(1);
  }
  const run = await anandaRun(path, { kind: kindArg || undefined, passes: passesArg ? parseInt(passesArg, 10) : 8 });
  console.log(summarize(run));
}
