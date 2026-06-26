# erid Mobile UI — Design Spec

**Date:** 2026-06-26
**Status:** Approved design, pending spec review
**Topic:** Compact-cinematic responsive layout for phones (portrait)

## 1. Goal

Make erid render properly on a phone (≈390px portrait): the orb stays the hero, typography and spacing scale down to the mobile ratio, and the **features below the orb** (stats, `ask`/`review`/`read` tabs, chat, study tools) sit at a proper mobile proportion instead of being pushed far down by oversized editorial type and a bulky stats block.

## 2. Approach: compact cinematic (chosen)

Pure responsive, **mobile-first**, **no structural rewrite** — same DOM and components. Today the components hardcode desktop sizes (`text-[24px]`, `text-[48px]`, `py-[90px]`, `min-h-[620px]`). We make the **base (unprefixed)** values the mobile sizes and restore the current desktop values at Tailwind's `sm:` (640px) / `lg:` (1024px) breakpoints.

Rejected: *features-first* (shrink orb, hide editorial) and *app-shell* (bottom tab bar, bottom sheets) — larger departures from the desktop design than requested.

## 3. Typography tokens (`app/globals.css`)

The three desktop magic sizes recur ~15× across components. Instead of editing each call site inline, add responsive tokens in `globals.css` (consistent with the existing `.font-hero` / `.font-editorial` / `.micro` semantic classes), then apply them.

- **`.text-body`** (new) — replaces the repeated `text-[24px] leading-normal tracking-[-0.24px]`:
  ```css
  .text-body {
    font-size: 17px;
    line-height: 1.5;
    letter-spacing: -0.24px;
  }
  @media (min-width: 640px) { .text-body { font-size: 24px; } }
  ```
- **`.font-editorial`** (modify) — currently sets only weight/leading/tracking; give it a responsive size so call sites drop their inline `text-[48px]`:
  ```css
  .font-editorial { /* …existing family/weight/leading/tracking… */ font-size: 30px; }
  @media (min-width: 640px) { .font-editorial { font-size: 48px; } }
  ```
- **`.font-hero`** (modify) — lower the clamp floor so the hero headline eases down on narrow screens: `--text-display: clamp(34px, 8vw, 54px)` (was `clamp(42px, 8vw, 54px)`). Desktop is unchanged (still hits the 54px cap); only sub-~425px screens drop below 42px.

640px is Tailwind's `sm` breakpoint, so the token media queries and the `sm:` utilities used elsewhere stay aligned.

## 4. Hero + orb

- Orb size `clamp(280px, 48vmin, 520px)` → **`clamp(240px, 48vmin, 520px)`** (`components/voice-orb.tsx`). Only the floor changes, so the mobile orb shrinks 280→240px while desktop (driven by `48vmin`/520 cap) is untouched.
- Hero top padding `pt-[90px]` → `pt-[72px] sm:pt-[90px]` (`app/page.tsx`).
- Orb container `min-h-[46svh]` → `min-h-[40svh] sm:min-h-[46svh]` so headline + orb breathe without overflowing one screen. Hero section keeps `min-h-svh`.
- Hero subtext `text-[24px]…` → `.text-body` (with its existing color class kept).

## 5. Features below the orb

The crux of the request. In `app/page.tsx`'s workspace section:

- **Condense the stats `aside` into a slim strip on mobile:**
  - Hide the editorial `grounded, not generic.` `<h2>` and its paragraph on mobile: `hidden sm:block` (they're flavor; the `workspace` label + stat chips carry enough context).
  - The two stat cards (`sources loaded` / `mode`) become a compact **2-column row on mobile**, full treatment on desktop: `grid-cols-2 sm:grid-cols-1`, smaller numbers (`text-[30px] sm:text-[48px]` for the count), reduced padding, and `mt-4 sm:mt-[60px]`.
- Section padding `py-[90px]` → `py-12 sm:py-[90px]`.
- Workspace panel `min-h-[620px]` → `min-h-[460px] sm:min-h-[620px]`.
- **Tab touch targets** — the `role="tab"` buttons (`workspace-tabs.tsx`, `study-tools.tsx`, `sources-panel.tsx` source-type) are `px-4 py-1.5` (~30px tall); bump to `py-2 sm:py-1.5` for comfortable touch.
- **Chat (`conversation-panel.tsx`)** — bubbles and input `text-[24px]…` → `.text-body`; `EmptyState` heading `font-editorial text-[48px]` → `font-editorial` (responsive); its paragraph `text-[24px]…` → `.text-body`.
- **Study tools (`study-tools.tsx`)** — quiz question `text-[24px]` → `text-[18px] sm:text-[24px]`; summary tldr `text-[24px]` → `.text-body`; flashcard / explain `text-[20px]` → `text-[17px] sm:text-[20px]`. The existing `text-[16px]` items (choices, key points, explanations) already read well on mobile — unchanged.

## 6. Sources panel & misc

- `sources-panel.tsx` is already a full-width drawer on mobile (`w-full max-w-[520px]`) and verified to look correct. Apply the type tokens: header `font-editorial text-[48px]` → `font-editorial`; inputs / upload label `text-[24px]…` → `.text-body`. Bump source-type tab touch target (above).
- `citation-pill.tsx` (`text-[12px]`) and `micro` labels are already mobile-appropriate — unchanged.

## 7. Out of scope

- No structural/navigation rewrite (no bottom tab bar, no bottom sheet).
- No logic, data, or API changes; no behavior changes on desktop.
- Landscape-phone and tablet-specific tuning beyond what the `sm:`/`lg:` breakpoints already give.
- The code-review findings on the study-tools feature (tracked separately).

## 8. Per-file change list

- `app/globals.css` — add `.text-body`; add responsive size to `.font-editorial`; lower `--text-display` clamp floor.
- `app/page.tsx` — hero padding/orb-container/subtext; workspace section padding; condensed stats `aside`; panel min-height.
- `components/voice-orb.tsx` — orb size clamp floor.
- `components/workspace-tabs.tsx` — tab touch target.
- `components/conversation-panel.tsx` — `.text-body` on bubbles/input/empty-state; responsive empty-state heading.
- `components/study-tools.tsx` — responsive question/tldr/flashcard/explain sizes; tab touch target.
- `components/sources-panel.tsx` — `.font-editorial`/`.text-body` tokens; source-type tab touch target.

## 9. Verification

- No logic change → no new unit tests. Existing `npm test` must stay green.
- Visual verification with the dev server + Playwright at **390px** (primary), plus a quick check at **360px** and **430px** and one desktop width (≥1024px) to confirm no desktop regression: orb + headline fit one screen; stats strip is compact; tabs/chat/study tools are reachable and legible; sources drawer intact.
- `npx tsc --noEmit`, `npm run lint`, `npm run build` all pass.

## 10. Success criteria

- On a 390px portrait viewport: the orb hero fits comfortably; the `ask`/`review`/`read` tabs and chat sit directly below at a proper proportion (not a full extra screen away); no horizontal overflow; body text is legible (~17px) and headings are proportionate (~30px).
- Desktop (≥1024px) renders identically to today.
- Tests, types, lint, and build remain green.
