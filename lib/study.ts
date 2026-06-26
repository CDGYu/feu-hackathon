import type { CitationRef, Source } from "@/lib/types";

export type RawCitation = { sourceName: string; page: number };

export function resolveCitations(
  raw: RawCitation[] | undefined,
  sources: Source[]
): CitationRef[] {
  if (!raw?.length) return [];
  const byName = new Map<string, Source>();
  sources.forEach((s) => byName.set(s.name.toLowerCase().trim(), s));

  const out: CitationRef[] = [];
  const seen = new Set<string>();
  for (const c of raw) {
    if (!c || typeof c.sourceName !== "string" || !Number.isFinite(c.page)) continue;
    const key = `${c.sourceName.toLowerCase().trim()}|${c.page}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const source = byName.get(c.sourceName.toLowerCase().trim());
    out.push({
      sourceId: source?.id ?? "unknown",
      sourceName: c.sourceName,
      page: c.page,
    });
  }
  return out;
}
