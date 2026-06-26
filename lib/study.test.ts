import { describe, it, expect } from "vitest";
import {
  resolveCitations,
  renderSourcesForStudy,
  validateStudyRequest,
} from "@/lib/study";
import type { Source } from "@/lib/types";

const sources: Source[] = [
  { id: "s1", name: "Sibika", kind: "text", pages: [{ page: 1, text: "x" }], addedAt: 0 },
  { id: "s2", name: "Algebra Notes", kind: "pdf", pages: [{ page: 4, text: "y" }], addedAt: 0 },
];

describe("resolveCitations", () => {
  it("maps source name (case-insensitive) to its id", () => {
    const out = resolveCitations(
      [{ sourceName: "algebra notes", page: 4 }],
      sources
    );
    expect(out).toEqual([{ sourceId: "s2", sourceName: "algebra notes", page: 4 }]);
  });

  it("uses 'unknown' for an unmatched source name", () => {
    const out = resolveCitations([{ sourceName: "Ghost", page: 2 }], sources);
    expect(out).toEqual([{ sourceId: "unknown", sourceName: "Ghost", page: 2 }]);
  });

  it("dedupes by name+page and tolerates undefined", () => {
    const out = resolveCitations(
      [
        { sourceName: "Sibika", page: 1 },
        { sourceName: "Sibika", page: 1 },
      ],
      sources
    );
    expect(out).toHaveLength(1);
    expect(resolveCitations(undefined, sources)).toEqual([]);
  });
});

describe("renderSourcesForStudy", () => {
  it("renders page markers per page and source", () => {
    const out = renderSourcesForStudy(sources);
    expect(out).toContain("--- Sibika · p. 1 ---");
    expect(out).toContain("--- Algebra Notes · p. 4 ---");
  });

  it("returns a placeholder when there are no sources", () => {
    expect(renderSourcesForStudy([])).toBe("<no sources>");
  });
});

describe("validateStudyRequest", () => {
  const base = { sources };
  it("accepts a valid quiz request", () => {
    expect(validateStudyRequest({ kind: "quiz", ...base })).toEqual({ ok: true });
  });
  it("rejects an unknown kind", () => {
    const r = validateStudyRequest({ kind: "essay", ...base });
    expect(r.ok).toBe(false);
  });
  it("rejects empty sources", () => {
    const r = validateStudyRequest({ kind: "quiz", sources: [] });
    expect(r.ok).toBe(false);
  });
  it("requires sourceId and page for explain", () => {
    expect(validateStudyRequest({ kind: "explain", ...base }).ok).toBe(false);
    expect(
      validateStudyRequest({ kind: "explain", sources, options: { sourceId: "s1", page: 1 } }).ok
    ).toBe(true);
  });
});
