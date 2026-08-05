// eoreader6 · perceiver/audio — real PCM in, RMS energy per frame out.
// Decodes with the system ffmpeg (no bundled decoder, no synthetic waveform).
// See perceiver/text/material.js for the shared load/reduce contract.

import { spawn } from "node:child_process";

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

// The inverse of reduce()'s framing: a surf()/atmosphere() material index
// back to the raw sample range (and, given sampleRate, the real time range)
// it was built from. Symmetric with reduce() by construction -- same
// frameSamples stride, nothing re-derived -- so a standpoint found in a ride
// over this material can be located without re-deciding what a frame is.
// SEED.md Amendment XV: addressing infrastructure, not a new statistic or
// perturbation, so it does not trigger the growth rule.
export const locate = (index, { frameSamples = 400, sampleRate = 8000 } = {}) => {
  if (!Number.isInteger(index) || index < 0) return { error: "index must be a non-negative integer" };
  if (!Number.isInteger(frameSamples) || frameSamples < 1) return { error: "frameSamples must be a positive integer" };
  const sampleStart = index * frameSamples;
  const sampleEnd = sampleStart + frameSamples;
  return { sampleStart, sampleEnd, timeStart: sampleStart / sampleRate, timeEnd: sampleEnd / sampleRate };
};
