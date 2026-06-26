# erid

> _"Talk to your notes."_
> A cinematic Filipino AI study companion. Add your own materials, then learn by speaking with a grounded voice orb. Every answer — voice or text — is grounded in the sources you loaded, in Filipino or English.

**Hackathon case:** Accenture · _AI-Powered Study Companion for Filipino Learners_

Built in 24 hours for ACM Techsprint: Asteria.

---

## What's in it

- **The voice orb** — a black-hole sphere with a pulsing ring whose intensity, scale, and bloom are driven in real time by the AI's actual voice frequency data (`getOutputByteFrequencyData()`). It breathes when idle, listens when you speak, and pulses to its own answers.
- **The BlueYard-inspired canvas** — a vast white editorial page with a warm apricot horizon, one oversized centered headline, and the black-hole orb hanging low like a celestial magazine-cover artwork.
- **Real source grounding (RAG)** — paste text or drop a PDF. erid pushes each source to an ElevenLabs Conversational AI Knowledge Base, triggers RAG indexing, and attaches it to the agent. Voice and text answers both come from your sources only — never the open web.
- **Citations** — every text answer is grounded with `[source · p. N]` pills the student can scan to find the original passage.
- **Code-switching by design** — the tutor matches the student's language (Tagalog / English / Taglish) per turn. The system prompt enforces it; Gemini handles it on the text side, ElevenLabs on the voice side.

## Stack

- **Next.js 16** (App Router) + TypeScript + Tailwind 4 + Turbopack
- **`@elevenlabs/react`** + **`@elevenlabs/elevenlabs-js`** — Conversational AI agent, signed-URL auth, Knowledge Base + RAG
- **`@google/genai`** — Gemini 2.5 Flash for grounded text chat with citation parsing
- **`@paper-design/shaders-react`** — Dithering, PerlinNoise, PulsingBorder
- **`pdfjs-dist`** — client-side PDF extraction (no server-side PDF deps)
- **`motion`** — sheet animations
- **Fonts:** Instrument Sans throughout. The UI relies on tight tracking, flat square surfaces, and scale rather than chrome.

## First-time setup

You will need three credentials. Both ElevenLabs and Google offer enough free credit to demo this.

### 1. ElevenLabs

1. Create an account at [elevenlabs.io](https://elevenlabs.io).
2. Go to **Conversational AI** in the sidebar and click **Create Agent**. Give it any name (e.g. _erid_). The defaults are fine — the app will overwrite the system prompt, knowledge base, and RAG settings on first source upload.
3. Copy the **Agent ID** (visible at the top of the agent page).
4. Generate an **API key**: profile menu → **API Keys** → **Create**. Give it `convai_read`, `convai_write`, and `convai_signed_url` scopes.

### 2. Google Gemini

1. Visit [aistudio.google.com](https://aistudio.google.com) and create an API key. The free tier is plenty for a demo.

### 3. Local env

Copy `.env.example` to `.env.local` and fill it in:

```bash
ELEVENLABS_API_KEY=sk_...
ELEVENLABS_AGENT_ID=agent_...
GOOGLE_GENAI_API_KEY=AIza...
```

### 4. Run

```bash
npm install
npm run dev
```

Open [localhost:3000](http://localhost:3000). The sources panel will slide in automatically the first time — drop a PDF or paste some study text, then tap the orb.

## How the pieces fit

```
                  ┌─────────────────────────────────────┐
                  │  Browser (Next.js client component) │
                  │  · BackgroundCanvas (dither / mercury flow) │
                  │  · VoiceOrb (frequency-driven)      │
                  │  · ConversationPanel (text + voice) │
                  │  · SourcesPanel (PDF / paste)       │
                  └────────┬───────────────┬────────────┘
                           │               │
                  pdf.js (client)          │ WebSocket (voice)
                           │               │
                           ▼               ▼
                  ┌─────────────┐    ┌──────────────────────┐
                  │ Next.js API │    │ ElevenLabs           │
                  │ routes      │    │ Conversational AI    │
                  │             │    │ (agent + KB + RAG)   │
                  │ /signed-url │◀──▶│                      │
                  │ /kb         │    │                      │
                  │ /chat       │    └──────────────────────┘
                  └──────┬──────┘
                         │
                         ▼
                  ┌─────────────┐
                  │ Gemini 2.5  │
                  │ (text chat) │
                  └─────────────┘
```

The two AI paths intentionally share **state but not transport**:

- **Voice path** — client opens a WebSocket directly to ElevenLabs using a signed URL we mint server-side (key never reaches the browser). The agent already has the sources in its KB, so it grounds responses there. Frequency data from the SDK drives the orb.
- **Text path** — the client posts its question and the full source text to `/api/chat`, which calls Gemini with a strict "only-from-sources" system prompt. The response is parsed for `[source · p. N]` citation tokens and rendered as pills.

## Deploy to AWS (Amplify Hosting)

This repo ships an `amplify.yml` build spec. The fastest path:

1. Push to GitHub.
2. AWS Console → **AWS Amplify** → **Host a web app** → pick the repo + branch.
3. Amplify auto-detects Next.js. When asked, paste the three env vars from `.env.local` into the **Environment variables** section.
4. Deploy. Builds run on Amplify's standard CI; first deploy takes ~3–5 minutes.

Pennies per day on a `$100` credit unless you really hammer it.

## Project structure

```
app/
  api/
    signed-url/route.ts   # mints ElevenLabs WebSocket URLs (key server-side)
    kb/route.ts           # uploads source text + triggers RAG + attaches to agent
    chat/route.ts         # Gemini grounded text chat with citation parsing
  globals.css             # BlueYard-style tokens, grain texture, breathing keyframes
  layout.tsx              # Instrument Sans font wiring
  page.tsx                # NotebookProvider → ConversationProvider → Surface

components/
  background-canvas.tsx   # pale atmospheric shader fallback
  voice-orb.tsx           # the centerpiece
  conversation-panel.tsx  # unified voice + text feed with citation pills
  sources-panel.tsx       # PDF / paste sheet, slides in from the left
  citation-pill.tsx       # flat apricot-hairline citation chip
  notebook-context.tsx    # shared sources + messages, persisted to localStorage

lib/
  pdf.ts                  # client-side PDF → page-numbered text
  elevenlabs-server.ts    # SDK client, agent ensure / KB attach
  gemini-server.ts        # Gemini system prompt + grounded answer
  citations.ts            # parses [source · p. N] tokens
  use-orb-activity.ts     # the RAF loop that writes CSS vars from voice freq
  types.ts                # shared types
  utils.ts                # cn helper
```

## Known MVP limitations (24-hour scope)

- One shared agent / one notebook per ElevenLabs account. Multi-tenant would mean dynamic agent creation, which is out of scope.
- Voice responses don't render citation pills (the spoken answer doesn't include the structured citation tokens text chat does). The voice agent _is_ still grounded — it just speaks naturally.
- "Remove source" only removes locally; the doc stays in ElevenLabs KB until you remove it from the dashboard. Wiring full detach is one extra API call and could be added.
- No user accounts. The notebook persists per browser via `localStorage`.

## Visual direction

erid now follows a BlueYard-style light editorial rhythm: a white canvas, warm apricot atmospheric wash, one centered headline, a single lower-half 3D celestial object, flat square controls, hairline cards, and pale chromatic tints used only as surfaces or borders.
