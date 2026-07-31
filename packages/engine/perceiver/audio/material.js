// eoreader6 · perceiver/audio — real PCM in, RMS energy per frame out.
// Decodes with the system ffmpeg (no bundled decoder, no synthetic waveform).
// See perceiver/text/material.js for the shared load/reduce contract.

import { spawn } from "node:child_process";
import { contract } from "../consumption.js";

const decodePCM = (path, sampleRate) =>
  new Promise((resolve, reject) => {
    const args = ["-v", "error", "-i", path, "-f", "s16le", "-ar", String(sampleRate), "-ac", "1", "pipe:1"];
    const proc = spawn("ffmpeg", args);
    const chunks = [];
    let err = "";
    proc.stdout.on("data", (d) => chunks.push(d));
    proc.stderr.on("data", (d) => { err += d; });
    proc.on("error", reject);
    proc.on("close", (code) => {
      if (code !== 0) return reject(new Error(`ffmpeg audio decode failed (${code}): ${err.slice(0, 300)}`));
      resolve(Buffer.concat(chunks));
    });
  });

export const load = async (path, { sampleRate = 8000 } = {}) => {
  const buf = await decodePCM(path, sampleRate);
  return new Int16Array(buf.buffer, buf.byteOffset, Math.floor(buf.length / 2));
};

export const reduce = (samples, { fraction = 1, frameSamples = 400 } = {}) => {
  const readLen = Math.max(frameSamples, Math.floor(samples.length * fraction));
  const material = [];
  for (let i = 0; i + frameSamples <= readLen; i += frameSamples) {
    let sumSq = 0;
    for (let j = i; j < i + frameSamples; j++) sumSq += samples[j] * samples[j];
    material.push(Math.sqrt(sumSq / frameSamples));
  }
  return material;
};

// Music and speech arrive at a rate the listener does not set, and the reach
// of the auditory present is the one figure in this file that comes from
// outside it: the psychoacoustic present is conventionally taken as ~2-3
// seconds — the span over which a phrase is heard AS a phrase rather than as
// remembered notes. At the default 400-sample frame and 8 kHz that is 20 frames
// per second, so a 3-second present is 60 frames. It is a claim about hearing,
// not about the file, and it does not change because the piece is long.
export const consumption = ({ sampleRate = 8000, frameSamples = 400 } = {}) =>
  contract({
    order: "sequential",
    unit: `${((frameSamples / sampleRate) * 1000).toFixed(0)}ms RMS frame`,
    present: Math.max(2, Math.round(3 * (sampleRate / frameSamples))),
    rate: sampleRate / frameSamples,
    basis: "the psychoacoustic present, ~3s: the span over which a phrase is heard as a phrase rather than recalled",
  });
