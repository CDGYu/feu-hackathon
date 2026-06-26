import type { CitationRef, Source } from "@/lib/types";

const CITATION_RE = /\[([^\]·]+?)\s*·\s*p\.?\s*([\d,\s]+)\]/gi;

export function parseCitations(text: string, sources: Source[]): CitationRef[] {
  const out: CitationRef[] = [];
  const seen = new Set<string>();
  const byName = new Map<string, Source>();
  sources.forEach((s) => byName.set(s.name.toLowerCase().trim(), s));

  let m: RegExpExecArray | null;
  while ((m = CITATION_RE.exec(text)) !== null) {
    const name = m[1].trim();
    const pagesStr = m[2];
    const source = byName.get(name.toLowerCase());
    const pages = pagesStr
      .split(",")
      .map((p) => parseInt(p.trim(), 10))
      .filter((n) => Number.isFinite(n));
    for (const page of pages) {
      const key = `${name}|${page}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({
        sourceId: source?.id ?? "unknown",
        sourceName: name,
        page,
      });
    }
  }
  return out;
}
