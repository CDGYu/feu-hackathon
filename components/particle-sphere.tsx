"use client";

import { useEffect, useLayoutEffect, useRef } from "react";

type Props = {
  getInputByteFrequencyData: () => Uint8Array;
  getOutputByteFrequencyData: () => Uint8Array;
  connected: boolean;
  isSpeaking: boolean;
  isListening: boolean;
};

type Particle = {
  // Position on the unit sphere.
  x: number;
  y: number;
  z: number;
  // Per-particle radius (slight shell thickness) and twinkle phase.
  r: number;
  tw: number;
};

const PARTICLE_COUNT = 1200;

// Fibonacci sphere — evenly distributed points, no clumping at the poles.
function buildParticles(): Particle[] {
  const pts: Particle[] = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const y = 1 - (i / (PARTICLE_COUNT - 1)) * 2;
    const radius = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = golden * i;
    pts.push({
      x: Math.cos(theta) * radius,
      y,
      z: Math.sin(theta) * radius,
      // Most particles on the shell, some pulled slightly inward for volume.
      r: 0.82 + Math.random() * 0.18,
      tw: Math.random() * Math.PI * 2,
    });
  }
  return pts;
}

export function ParticleSphere({
  getInputByteFrequencyData,
  getOutputByteFrequencyData,
  connected,
  isSpeaking,
  isListening,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Keep latest reactive inputs in a ref so the RAF loop never restarts.
  const live = useRef({
    connected,
    isSpeaking,
    isListening,
    getInputByteFrequencyData,
    getOutputByteFrequencyData,
  });
  useLayoutEffect(() => {
    live.current = {
      connected,
      isSpeaking,
      isListening,
      getInputByteFrequencyData,
      getOutputByteFrequencyData,
    };
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    const particles = buildParticles();
    let width = 0;
    let height = 0;
    let dpr = 1;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    let raf = 0;
    let angleY = 0;
    let angleX = -0.32;
    let smoothed = 0;
    const start = performance.now();

    const tick = () => {
      const {
        connected: isConnected,
        isSpeaking: speaking,
        isListening: listening,
        getInputByteFrequencyData: inFreq,
        getOutputByteFrequencyData: outFreq,
      } = live.current;

      // ---- audio level ----
      let target = 0;
      if (isConnected) {
        const data = listening && !speaking ? inFreq() : outFreq();
        let sum = 0;
        const n = Math.min(data.length, 48);
        for (let i = 0; i < n; i++) sum += data[i];
        target = n > 0 ? sum / (n * 255) : 0;
      } else {
        // Gentle idle breathing so the sphere always feels alive.
        const t = (performance.now() - start) / 1000;
        target = 0.06 + 0.045 * (0.5 - 0.5 * Math.cos(t * 1.1));
      }
      smoothed += (target - smoothed) * 0.16;
      const level = smoothed;

      // ---- motion ----
      const baseSpin = reduce ? 0 : 0.0016;
      angleY += baseSpin + level * 0.006;
      angleX = -0.32 + Math.sin((performance.now() - start) / 4200) * 0.12;

      const cosY = Math.cos(angleY);
      const sinY = Math.sin(angleY);
      const cosX = Math.cos(angleX);
      const sinX = Math.sin(angleX);

      const cx = (width * dpr) / 2;
      const cy = (height * dpr) / 2;
      const R = Math.min(width, height) * dpr * 0.34 * (1 + level * 0.05);
      const dispersion = 1 + level * 0.22;
      const now = performance.now() / 1000;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.globalCompositeOperation = "lighter";

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        const pr = p.r * dispersion;
        const px = p.x * pr;
        const py = p.y * pr;
        const pz = p.z * pr;

        // rotate around Y
        const x1 = px * cosY - pz * sinY;
        const z1 = px * sinY + pz * cosY;
        // rotate around X (tilt)
        const y2 = py * cosX - z1 * sinX;
        const z2 = py * sinX + z1 * cosX;

        const depth = (z2 + 1) / 2; // 0 (back) .. 1 (front)
        const sx = cx + x1 * R;
        const sy = cy + y2 * R;

        // twinkle + audio + depth brightness
        const twinkle = 0.78 + 0.22 * Math.sin(now * 2.4 + p.tw);
        const alpha = (0.1 + depth * 0.85) * twinkle * (0.7 + level * 0.5);
        const size = (0.6 + depth * 1.7) * dpr;

        // front particles read cream-lime, back ones deepen to green
        const g = Math.round(200 + depth * 55);
        const r = Math.round(120 + depth * 110);
        const b = Math.round(60 + depth * 70);

        ctx.beginPath();
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha.toFixed(3)})`;
        ctx.arc(sx, sy, size, 0, Math.PI * 2);
        ctx.fill();
      }

      // soft central bloom
      const bloom = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 1.25);
      const bloomA = 0.1 + level * 0.28;
      bloom.addColorStop(0, `rgba(190, 255, 120, ${bloomA.toFixed(3)})`);
      bloom.addColorStop(0.5, `rgba(120, 220, 70, ${(bloomA * 0.4).toFixed(3)})`);
      bloom.addColorStop(1, "rgba(120, 220, 70, 0)");
      ctx.fillStyle = bloom;
      ctx.beginPath();
      ctx.arc(cx, cy, R * 1.25, 0, Math.PI * 2);
      ctx.fill();

      ctx.globalCompositeOperation = "source-over";
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="absolute inset-0 size-full"
      style={{ background: "transparent" }}
    />
  );
}
