export function admitReferent(events, referent, { fullText } = {}) {
  const surfaces = [];
  const seen = new Set();

  for (const entry of referent.surfaces || []) {
    const surface = typeof entry === "string" ? entry : entry.surface || entry.name;
    if (!surface || seen.has(surface)) continue;
    seen.add(surface);

    const scope = entry.scope || null;
    surfaces.push({ surface, scope });
  }

  const name = referent.name || referent.display || referent.id || "unknown";
  if (!seen.has(name)) {
    surfaces.unshift({ surface: name, scope: null });
  }

  const referentId = referent.referentId || referent.id || `ref:${name.replace(/\s+/g, "_")}`;
  return { referentId, surfaces };
}
