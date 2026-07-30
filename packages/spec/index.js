export const CORPUS_API_VERSION = 2;

export function canonicalHashSync(data) {
  const str = JSON.stringify(data, Object.keys(data).sort());
  const bytes = new TextEncoder().encode(str);
  let hash = 0;
  for (const b of bytes) {
    hash = ((hash << 5) - hash) + b;
    hash = hash & hash;
  }
  return hash.toString(16).padStart(8, "0");
}
