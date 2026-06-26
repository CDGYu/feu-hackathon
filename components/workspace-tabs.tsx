"use client";

import { useState } from "react";
import { ConversationPanel } from "@/components/conversation-panel";
import { StudyTools } from "@/components/study-tools";
import { cn } from "@/lib/utils";

type Tab = "ask" | "review" | "read";

const TABS: Tab[] = ["ask", "review", "read"];

export function WorkspaceTabs() {
  const [tab, setTab] = useState<Tab>("ask");
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div
        role="tablist"
        aria-label="Workspace"
        className="mb-4 inline-flex self-start border border-line-graphite"
      >
        {TABS.map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={cn(
              "px-4 py-2 text-[12px] uppercase tracking-[-0.36px] transition-colors sm:py-1.5",
              tab === t
                ? "bg-canvas-white text-void"
                : "text-canvas-white/70 hover:bg-hover-graphite"
            )}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1">
        {tab === "ask" ? <ConversationPanel /> : <StudyTools group={tab} />}
      </div>
    </div>
  );
}
