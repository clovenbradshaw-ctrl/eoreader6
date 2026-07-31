// eoreader6 · packages/host — the host face of the engine.
//
// Thin by the constitution: session, I/O, and the reader's own surfaces.
// All measurement is imported from the engine; nothing here derives a figure
// the engine refused to produce.
export {
  createSession,
  admitChunked,
  ingestFile,
  searchSpans,
  spanUnits,
  foldSpans,
  readSpan,
  documentIds,
  documentText,
  sessionSegments,
  sessionOutline,
  snipSegment,
  sessionReferents,
  CORPUS_API_VERSION,
} from "./corpus.js";

export { executePrompt } from "./surfer.js";
