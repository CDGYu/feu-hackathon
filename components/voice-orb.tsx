"use client";

import { useState } from "react";
import {
  useConversationControls,
  useConversationStatus,
  useConversationMode,
} from "@elevenlabs/react";
import { ParticleSphere } from "@/components/particle-sphere";
import { cn } from "@/lib/utils";

type Props = {
  sourcesCount: number;
  onActiveChange?: (active: boolean) => void;
};

/*
  A real canvas particle sphere on a transparent background:
  1200 points distributed on a sphere, rotating continuously, depth-shaded,
  and reacting to the live voice frequency data (dispersion + glow + spin).
*/
export function VoiceOrb({ sourcesCount, onActiveChange }: Props) {
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const {
    startSession,
    endSession,
    getOutputByteFrequencyData,
    getInputByteFrequencyData,
  } = useConversationControls();
  const { status } = useConversationStatus();
  const { mode, isSpeaking, isListening } = useConversationMode();

  const connected = status === "connected";
  const connecting = status === "connecting";

  async function handleTap() {
    if (busy) return;
    setErrorMsg(null);

    if (connected || connecting) {
      endSession();
      onActiveChange?.(false);
      return;
    }

    if (sourcesCount === 0) {
      setErrorMsg("Magdagdag muna ng kahit isang source bago tayo mag-usap.");
      return;
    }

    try {
      setBusy(true);
      const res = await fetch("/api/signed-url");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Hindi nagawa ang session.");
      await startSession({ signedUrl: data.signedUrl });
      onActiveChange?.(true);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "May error.");
    } finally {
      setBusy(false);
    }
  }

  const caption = connecting
    ? "Bumubuksan..."
    : !connected
    ? sourcesCount === 0
      ? "Magdagdag ng source para magsimula"
      : "Pindutin para magsimula"
    : isSpeaking
    ? "erid..."
    : isListening
    ? "Nakikinig..."
    : "Konektado";

  const label = connected
    ? `End conversation (currently ${mode})`
    : "Start voice conversation with erid";

  return (
    <div className="flex select-none flex-col items-center gap-6 sm:gap-8">
      <button
        type="button"
        onClick={handleTap}
        aria-label={label}
        aria-pressed={connected}
        disabled={busy}
        className={cn(
          "group relative grid place-items-center rounded-full bg-transparent",
          "transition-transform duration-300 ease-out",
          "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-iris-mist focus-visible:ring-offset-4 focus-visible:ring-offset-[#040b0a]",
          busy && "cursor-progress",
          !busy && "cursor-pointer hover:scale-[1.01] active:scale-[0.99]"
        )}
        style={{
          width: "clamp(280px, 48vmin, 520px)",
          height: "clamp(280px, 48vmin, 520px)",
        }}
      >
        <ParticleSphere
          getInputByteFrequencyData={getInputByteFrequencyData}
          getOutputByteFrequencyData={getOutputByteFrequencyData}
          connected={connected}
          isSpeaking={isSpeaking}
          isListening={isListening}
        />
      </button>

      <div className="flex flex-col items-center gap-1.5">
        <p className={cn("micro", connected ? "text-iris-mist" : "text-canvas-white/70")}>
          {caption}
        </p>
        {sourcesCount > 0 && (
          <p className="micro text-canvas-white/45">
            {sourcesCount} {sourcesCount === 1 ? "source" : "sources"} loaded
          </p>
        )}
        {errorMsg && (
          <p
            role="alert"
            className="mt-1 max-w-xs text-center text-[12px] leading-normal tracking-[-0.36px] text-canvas-white/85"
          >
            {errorMsg}
          </p>
        )}
      </div>
    </div>
  );
}
