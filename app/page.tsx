"use client";

import { useState, useEffect } from "react";
import { ConversationProvider } from "@elevenlabs/react";
import { VoiceOrb } from "@/components/voice-orb";
import { WorkspaceTabs } from "@/components/workspace-tabs";
import {
  SourcesPanel,
  AddSourceButton,
} from "@/components/sources-panel";
import {
  NotebookProvider,
  useNotebook,
} from "@/components/notebook-context";
import { shortId } from "@/lib/utils";

export default function HomePage() {
  return (
    <NotebookProvider>
      <ConversationBridge>
        <Surface />
      </ConversationBridge>
    </NotebookProvider>
  );
}

// Bridge: forward voice-conversation messages into the shared notebook log so
// the user sees voice + text replies in the same feed.
function ConversationBridge({ children }: { children: React.ReactNode }) {
  const { addMessage } = useNotebook();
  return (
    <ConversationProvider
      onMessage={({ message, role }) => {
        if (!message) return;
        addMessage({
          id: shortId(),
          role: role === "user" ? "user" : "assistant",
          text: message,
        });
      }}
      onError={(msg) => {
        console.warn("[ElevenLabs]", msg);
      }}
    >
      {children}
    </ConversationProvider>
  );
}

function Surface() {
  const { sources, messages } = useNotebook();
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const latestAgentText = getHeroText(messages);

  useEffect(() => {
    if (sources.length === 0) {
      const t = setTimeout(() => setSourcesOpen(true), 800);
      return () => clearTimeout(t);
    }
  }, [sources.length]);

  return (
    <>
      <div className="relative min-h-svh overflow-hidden bg-void">
        <Header onAddSources={() => setSourcesOpen(true)} />

        <main>
          <section
            className="relative isolate flex min-h-svh flex-col overflow-hidden px-5 pb-0 pt-[90px] sm:px-8"
            style={{ backgroundColor: "#040b0a" }}
          >
            {/* Space-like void: deep base + green bloom rising from the orb */}
            <div
              aria-hidden
              className="absolute inset-0 -z-20"
              style={{
                background:
                  "radial-gradient(ellipse 64% 52% at 50% 80%, rgba(157,255,74,0.26) 0%, rgba(79,174,40,0.10) 32%, transparent 62%), radial-gradient(ellipse 120% 90% at 50% 18%, rgba(16,53,51,0.55) 0%, transparent 66%), #040b0a",
              }}
            />
            {/* Faint starfield */}
            <div
              aria-hidden
              className="absolute inset-0 -z-10 opacity-[0.35]"
              style={{
                backgroundImage:
                  "radial-gradient(circle, rgba(251,248,232,0.9) 0 0.7px, transparent 1.2px), radial-gradient(circle, rgba(217,255,106,0.6) 0 0.6px, transparent 1px)",
                backgroundPosition: "0 0, 19px 23px",
                backgroundSize: "44px 44px, 67px 67px",
                maskImage:
                  "radial-gradient(ellipse at 50% 70%, transparent 0 30%, rgba(0,0,0,0.9) 80%)",
                WebkitMaskImage:
                  "radial-gradient(ellipse at 50% 70%, transparent 0 30%, rgba(0,0,0,0.9) 80%)",
              }}
            />

            <div className="mx-auto flex w-full max-w-[1200px] flex-col items-center text-center">
              <p className="micro mb-6 text-canvas-white/55">erid is saying</p>
              <h1 className="font-hero max-w-[980px] text-canvas-white">
                {latestAgentText}
              </h1>
              <p className="mt-6 max-w-[680px] text-[24px] leading-normal tracking-[-0.24px] text-canvas-white/75">
                Upload PDFs or paste lessons. erid answers from your sources,
                by voice or text, in Filipino or English.
              </p>
            </div>

            <div className="relative z-10 mx-auto mt-auto flex min-h-[46svh] w-full max-w-[1200px] items-end justify-center">
              <VoiceOrb sourcesCount={sources.length} />
            </div>
          </section>

          <section className="bg-void px-5 py-[90px] sm:px-8">
            <div className="mx-auto grid max-w-[1200px] gap-[12px] lg:grid-cols-[0.34fr_0.66fr]">
              <aside className="border border-line-soft bg-panel p-3">
                <p className="micro text-canvas-white/55">workspace</p>
                <h2 className="mt-6 text-[48px] leading-[1.2] tracking-[-0.54px] text-canvas-white">
                  grounded, not generic.
                </h2>
                <p className="mt-6 text-[24px] leading-normal tracking-[-0.24px] text-canvas-white/70">
                  Your sources are the boundary. Add one material first, then
                  speak or type.
                </p>
                <div className="mt-[60px] grid gap-[5px]">
                  <div className="bg-apricot-wash p-3">
                    <p className="micro text-graphite-ink">sources loaded</p>
                    <p className="mt-4 text-[48px] leading-none tracking-[-0.54px] text-graphite-ink">
                      {sources.length}
                    </p>
                  </div>
                  <div className="border border-iris-mist p-3">
                    <p className="micro text-iris-mist">mode</p>
                    <p className="mt-4 text-[24px] leading-normal tracking-[-0.24px] text-canvas-white">
                      voice + text
                    </p>
                  </div>
                </div>
              </aside>

              <section className="min-h-[620px] border border-line-soft bg-panel p-3">
                <WorkspaceTabs />
              </section>
            </div>
          </section>
        </main>
      </div>

      <SourcesPanel
        open={sourcesOpen}
        onClose={() => setSourcesOpen(false)}
      />
    </>
  );
}

function getHeroText(messages: ReturnType<typeof useNotebook>["messages"]) {
  const latest = [...messages]
    .reverse()
    .find((m) => m.role === "assistant" && !m.pending && m.text.trim());

  if (!latest) return "What should your notes become?";

  return latest.text
    .replace(/\[[^\]]+\]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
}

function Header({ onAddSources }: { onAddSources: () => void }) {
  return (
    <header className="fixed inset-x-0 top-0 z-30 flex items-start justify-between px-5 py-5 text-white mix-blend-difference sm:px-8">
      <Wordmark />
      <AddSourceButton onClick={onAddSources} />
    </header>
  );
}

function Wordmark() {
  return (
    <div className="text-[12px] font-medium uppercase leading-none tracking-[-0.36px]">
      <span className="block">er</span>
      <span className="block">id</span>
    </div>
  );
}

