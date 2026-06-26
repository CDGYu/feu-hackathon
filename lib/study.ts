import type { CitationRef, Source, StudyKind } from "@/lib/types";

export type RawCitation = { sourceName: string; page: number };

const STUDY_KINDS: StudyKind[] = ["quiz", "flashcards", "summary", "explain"];

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

export function renderSourcesForStudy(sources: Source[]): string {
  if (sources.length === 0) return "<no sources>";
  return sources
    .map((s) =>
      s.pages
        .map((p) => `--- ${s.name} · p. ${p.page} ---\n${p.text}`)
        .join("\n\n")
    )
    .join("\n\n");
}

export type ValidationResult = { ok: true } | { ok: false; error: string };

export function validateStudyRequest(body: unknown): ValidationResult {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Invalid body" };
  }
  const b = body as { kind?: unknown; sources?: unknown; options?: unknown };
  if (typeof b.kind !== "string" || !STUDY_KINDS.includes(b.kind as StudyKind)) {
    return { ok: false, error: "Unknown or missing study kind" };
  }
  if (!Array.isArray(b.sources) || b.sources.length === 0) {
    return { ok: false, error: "Add at least one source first" };
  }
  if (b.kind === "explain") {
    const o = (b.options ?? {}) as { sourceId?: unknown; page?: unknown };
    if (typeof o.sourceId !== "string" || !o.sourceId.trim()) {
      return { ok: false, error: "explain requires options.sourceId" };
    }
    if (typeof o.page !== "number" || !Number.isFinite(o.page)) {
      return { ok: false, error: "explain requires options.page" };
    }
  }
  return { ok: true };
}
