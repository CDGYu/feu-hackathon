"use client";

import type { SourcePage } from "@/lib/types";

type TextItem = { str: string; transform: number[] };

// pdf.js is browser-only. We dynamic-import it from inside the function so
// nothing about its module evaluation runs during Next.js SSR/prerender.
export async function extractPdfPages(file: File): Promise<SourcePage[]> {
  const pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

  const buf = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: buf });
  const pdf = await loadingTask.promise;
  const pages: SourcePage[] = [];

  try {
    for (let p = 1; p <= pdf.numPages; p++) {
      const page = await pdf.getPage(p);
      const content = await page.getTextContent();
      const text = joinTextItems(content.items as TextItem[]);
      pages.push({ page: p, text });
    }
  } finally {
    await loadingTask.destroy();
  }

  return pages;
}

// pdf.js returns text fragments without line breaks. Reconstruct a
// reasonable plain-text view by inserting a newline when the y-coordinate
// changes between consecutive items.
function joinTextItems(items: TextItem[]): string {
  let out = "";
  let prevY: number | null = null;

  for (const item of items) {
    if (!item.str) continue;
    const y = item.transform?.[5];
    if (prevY !== null && Math.abs(y - prevY) > 2) {
      out += "\n";
    } else if (out.length > 0 && !out.endsWith(" ") && !out.endsWith("\n")) {
      out += " ";
    }
    out += item.str;
    prevY = y;
  }

  return out.replace(/[ \t]+/g, " ").trim();
}
