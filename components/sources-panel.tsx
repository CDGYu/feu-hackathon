"use client";

import { useCallback, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { FileText, Upload, X, Trash2, FileType2, Plus } from "lucide-react";
import { useNotebook } from "@/components/notebook-context";
import { extractPdfPages } from "@/lib/pdf";
import { shortId, cn } from "@/lib/utils";
import type { Source, SourcePage } from "@/lib/types";

type Mode = "pdf" | "text";

export function SourcesPanel({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { sources, addSource, removeSource } = useNotebook();
  const [mode, setMode] = useState<Mode>("pdf");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [textName, setTextName] = useState("");
  const [textBody, setTextBody] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const pushToKb = useCallback(
    async (name: string, pages: SourcePage[]) => {
      const res = await fetch("/api/kb", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, pages }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "KB upload failed");
      return data.documentId as string;
    },
    []
  );

  async function handlePdf(file: File) {
    setBusy(true);
    setError(null);
    setProgress("Binabasa ang PDF...");
    try {
      const pages = await extractPdfPages(file);
      if (pages.length === 0) {
        throw new Error("Walang nakuhang teksto sa PDF na ito.");
      }
      setProgress(`Ipinapadala sa Knowledge Base (${pages.length} pages)...`);
      const documentId = await pushToKb(file.name, pages);
      const source: Source = {
        id: shortId(),
        name: file.name,
        kind: "pdf",
        pages,
        elevenlabsDocumentId: documentId,
        addedAt: Date.now(),
      };
      addSource(source);
      setProgress("Tagumpay!");
      setTimeout(() => setProgress(null), 1500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "May error.");
      setProgress(null);
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handleText() {
    if (!textName.trim() || !textBody.trim()) {
      setError("Kailangan ang pangalan at laman.");
      return;
    }
    setBusy(true);
    setError(null);
    setProgress("Ipinapadala...");
    try {
      const pages: SourcePage[] = [{ page: 1, text: textBody.trim() }];
      const documentId = await pushToKb(textName.trim(), pages);
      const source: Source = {
        id: shortId(),
        name: textName.trim(),
        kind: "text",
        pages,
        elevenlabsDocumentId: documentId,
        addedAt: Date.now(),
      };
      addSource(source);
      setTextName("");
      setTextBody("");
      setProgress("Tagumpay!");
      setTimeout(() => setProgress(null), 1500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "May error.");
      setProgress(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-void/70 backdrop-blur-[2px]"
          />

          <motion.aside
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 240 }}
            className={cn(
              "fixed inset-y-0 left-0 z-50 flex w-full max-w-[520px] flex-col",
              "border-r border-line-soft bg-panel"
            )}
          >
            <header className="flex items-center justify-between border-b border-line-soft px-6 py-6 sm:px-8">
              <div>
                <h2 className="font-editorial text-[48px] text-canvas-white">
                  sources
                </h2>
                <p className="micro mt-3 text-canvas-white/55">
                  Knowledge base · {sources.length} loaded
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close sources panel"
                className="grid size-10 place-items-center border border-line-graphite text-canvas-white hover:bg-hover-graphite"
              >
                <X size={18} />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto px-6 py-6 sm:px-8">
              <div
                role="tablist"
                aria-label="Source type"
                className="mb-6 inline-flex border border-line-graphite"
              >
                {(["pdf", "text"] as Mode[]).map((m) => (
                  <button
                    key={m}
                    role="tab"
                    aria-selected={mode === m}
                    onClick={() => setMode(m)}
                    className={cn(
                      "px-4 py-1.5 text-[12px] uppercase tracking-[-0.36px] transition-colors",
                      mode === m
                        ? "bg-canvas-white text-void"
                        : "text-canvas-white/70 hover:bg-hover-graphite"
                    )}
                  >
                    {m === "pdf" ? "PDF" : "Paste text"}
                  </button>
                ))}
              </div>

              {mode === "pdf" ? (
                <label
                  htmlFor="source-pdf"
                  className={cn(
                    "flex cursor-pointer flex-col items-center justify-center gap-3 border border-dashed border-line-graphite bg-transparent px-6 py-14 text-center transition-colors",
                    !busy && "hover:border-iris-mist hover:bg-hover-graphite",
                    busy && "cursor-progress opacity-60"
                  )}
                >
                  <FileType2 size={26} className="text-iris-mist" />
                  <span className="text-[24px] leading-normal tracking-[-0.24px] text-canvas-white">
                    I-click para mag-upload ng PDF
                  </span>
                  <span className="micro text-canvas-white/55">
                    Mga note, chapter, o handouts
                  </span>
                  <input
                    id="source-pdf"
                    ref={fileRef}
                    type="file"
                    accept="application/pdf"
                    className="sr-only"
                    disabled={busy}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handlePdf(f);
                    }}
                  />
                </label>
              ) : (
                <div className="flex flex-col gap-3">
                  <input
                    type="text"
                    value={textName}
                    onChange={(e) => setTextName(e.target.value)}
                    placeholder="Pangalan (e.g. Aralin sa Sibika)"
                    disabled={busy}
                    className="w-full border border-line-soft bg-transparent px-4 py-3 text-[24px] leading-normal tracking-[-0.24px] text-canvas-white placeholder:text-canvas-white/40 focus:border-iris-mist focus:outline-none"
                  />
                  <textarea
                    value={textBody}
                    onChange={(e) => setTextBody(e.target.value)}
                    placeholder="Idikit ang teksto rito..."
                    disabled={busy}
                    rows={10}
                    className="w-full resize-none border border-line-soft bg-transparent px-4 py-3 text-[24px] leading-normal tracking-[-0.24px] text-canvas-white placeholder:text-canvas-white/40 focus:border-iris-mist focus:outline-none"
                  />
                  <button
                    type="button"
                    disabled={busy || !textName.trim() || !textBody.trim()}
                    onClick={handleText}
                    className={cn(
                      "flex items-center justify-center gap-2 border border-line-graphite bg-transparent px-5 py-2.5 text-xs uppercase tracking-[-0.36px] text-canvas-white transition-colors",
                      "hover:bg-hover-graphite disabled:opacity-40 disabled:hover:bg-transparent"
                    )}
                  >
                    <Upload size={14} />
                    Idagdag
                  </button>
                </div>
              )}

              {(progress || error) && (
                <p
                  role="status"
                  className={cn(
                    "micro mt-3",
                    error ? "text-apricot-wash" : "text-canvas-white/60"
                  )}
                >
                  {error ?? progress}
                </p>
              )}

              {sources.length > 0 && (
                <div className="mt-8">
                  <p className="micro mb-4 text-canvas-white/55">
                    Naka-load sa erid
                  </p>
                  <ul className="flex flex-col gap-1.5">
                    {sources.map((s) => {
                      const totalChars = s.pages.reduce(
                        (n, p) => n + p.text.length,
                        0
                      );
                      return (
                        <li
                          key={s.id}
                          className="group flex items-center gap-3 border-t border-line-soft px-0 py-3"
                        >
                          <FileText size={16} className="shrink-0 text-iris-mist" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[16px] leading-normal tracking-[-0.24px] text-canvas-white">
                              {s.name}
                            </p>
                            <p className="micro mt-1 text-canvas-white/50">
                              {s.pages.length} {s.pages.length === 1 ? "page" : "pages"}
                              {" · "}
                              {(totalChars / 1000).toFixed(1)}k chars
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeSource(s.id)}
                            aria-label={`Remove ${s.name}`}
                            className="p-2 text-canvas-white/60 opacity-0 transition-opacity hover:bg-hover-graphite hover:text-canvas-white group-hover:opacity-100"
                          >
                            <Trash2 size={14} />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>

            <footer className="border-t border-line-soft px-6 py-5 sm:px-8">
              <p className="text-[12px] leading-normal tracking-[-0.36px] text-canvas-white/60">
                erid answers <em>only</em> from the sources you add. No
                sources, no answers &mdash; that&rsquo;s the contract.
              </p>
            </footer>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

export function AddSourceButton({ onClick }: { onClick: () => void }) {
  const { sources } = useNotebook();
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "grid size-10 place-items-center border border-current bg-transparent text-current transition-colors",
        "hover:bg-current/10"
      )}
      aria-label={
        sources.length === 0
          ? "Add source"
          : `${sources.length} sources loaded. Open source panel`
      }
    >
      <Plus size={18} />
    </button>
  );
}

