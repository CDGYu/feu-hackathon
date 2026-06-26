// Stub for bundler-only modules (e.g. "server-only") so vitest can import
// server modules in a plain Node environment. Next.js provides the real
// "server-only" guard at build time; in tests it is a harmless no-op.
export {};
