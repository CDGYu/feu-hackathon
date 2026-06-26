"use client";

import { useEffect } from "react";

type Options = {
  ref: React.RefObject<HTMLElement | null>;
  getOutputByteFrequencyData: () => Uint8Array;
  getInputByteFrequencyData: () => Uint8Array;
  connected: boolean;
  isSpeaking: boolean;
  isListening: boolean;
};

/*
  Reads voice frequency data every frame and writes it to CSS variables on the
  orb element. We never call setState in the loop -- updating CSS vars keeps
  React out of the render path entirely, which is what we want at 60 fps.

  Idle behaviour: when no conversation is active, the loop synthesizes a slow
  breathing wave so the orb still feels alive on the landing state.
*/
export function useOrbActivity({
  ref,
  getOutputByteFrequencyData,
  getInputByteFrequencyData,
  connected,
  isSpeaking,
  isListening,
}: Options) {
  useEffect(() => {
    let raf = 0;
    let smoothed = 0;
    const start = performance.now();

    const tick = () => {
      const el = ref.current;
      let target = 0;
      let tint = 0;

      if (connected) {
        const pickInput = isListening && !isSpeaking;
        const data = pickInput
          ? getInputByteFrequencyData()
          : getOutputByteFrequencyData();
        let sum = 0;
        const N = Math.min(data.length, 48);
        for (let i = 0; i < N; i++) sum += data[i];
        target = N > 0 ? sum / (N * 255) : 0;
        tint = pickInput ? 1 : 0;
      } else {
        const t = (performance.now() - start) / 1000;
        target = 0.08 + 0.05 * (0.5 - 0.5 * Math.cos((t * Math.PI) / 2));
      }

      smoothed += (target - smoothed) * 0.18;

      if (el) {
        el.style.setProperty("--orb-level", smoothed.toFixed(3));
        el.style.setProperty(
          "--orb-scale",
          (1 + smoothed * 0.08).toFixed(4)
        );
        el.style.setProperty("--orb-tint", tint.toString());
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [
    ref,
    connected,
    isSpeaking,
    isListening,
    getOutputByteFrequencyData,
    getInputByteFrequencyData,
  ]);
}
