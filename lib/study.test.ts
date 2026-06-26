import { describe, it, expect } from "vitest";
import { resolveCitations } from "@/lib/study";
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
