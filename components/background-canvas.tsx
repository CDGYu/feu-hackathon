"use client";

import { Dithering, PerlinNoise } from "@paper-design/shaders-react";
import { cn } from "@/lib/utils";

type Props = {
  active: boolean;
};

/*
  Two stacked WebGL canvases, crossfaded.
  - "Dormant": achromatic dither warp — the dark gallery wall.
  - "Awakened": organic mercury Perlin field — color lives only in imagery.
  The transition takes ~1.2s when the user starts a conversation.
*/
export function BackgroundCanvas({ active }: Props) {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden bg-canvas-white"
    >
      <div
        className={cn(
          "absolute inset-0 transition-opacity duration-[1200ms] ease-out",
          active ? "opacity-0" : "opacity-100"
        )}
      >
        <Dithering
          colorBack="#ffffff"
          colorFront="#ffcf9e"
          shape="warp"
          type="8x8"
          size={2.5}
          speed={0.18}
          style={{ width: "100%", height: "100%" }}
        />
      </div>

      <div
        className={cn(
          "absolute inset-0 transition-opacity duration-[1500ms] ease-out",
          active ? "opacity-80" : "opacity-0"
        )}
      >
        <PerlinNoise
          colorBack="#ffffff"
          colorFront="#bfe0f7"
          proportion={0.38}
          softness={0.85}
          octaveCount={4}
          persistence={0.65}
          lacunarity={2.4}
          speed={0.18}
          style={{ width: "100%", height: "100%" }}
        />
      </div>

      <div className="grain absolute inset-0" />

      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 50%, transparent 0%, rgba(255,255,255,0.28) 62%, rgba(255,255,255,0.92) 100%)",
        }}
      />
    </div>
  );
}
