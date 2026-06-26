# erid

> _"Talk to your notes."_
> A cinematic Filipino AI study companion. Add your own materials, then learn by speaking with a grounded voice orb — or by working through quizzes, flashcards, and summaries. Every answer — voice or text — is grounded in the sources you loaded, in Filipino or English.

**Hackathon case:** Accenture · _AI-Powered Study Companion for Filipino Learners_

Built in 24 hours for ACM TechSprint: Asteria, by **Rocky and the Other Rockies**.

---

## Team: Rocky and the Other Rockies

| Name |
| --- |
| Cosme, Rene Vincent |
| Razon III, Gerardo |
| Yu, Charles Derick |
| Zablan, Prince Edwin |

---

## The problem

Many Filipino students face barriers to quality educational support: limited access to tutors, connectivity constraints, and language differences. Existing platforms rarely accommodate learners who prefer Filipino — and generic AI chatbots invent answers students can't trust or verify.

## Problem we're solving

| Problem | erid's answer |
| --- | --- |
| Tutors are expensive and inaccessible | On-demand AI study help, available 24/7 (free to demo) |
| Existing apps don't understand Taglish | Code-switching by design — Tagalog / English / Taglish, per turn |
| Generic AI invents facts students can't trust | Answers come **only** from your loaded sources (RAG) — never the open web |
| Students can't verify an AI's answer | Every text answer cites the exact `source · page` |
| Heavy apps fail on slow connections | Lightweight: client-side PDF extraction, text-in / text-out |
| Few tools work with a student's _own_ materials | Bring your own notes or PDFs; erid grounds entirely in them |

## From SalitaCoach to erid

We started with **SalitaCoach** — a voice-first oral-recitation coach, since oral recitation (declamation, oral exams) is core to Philippine education yet has almost no practice tools. Inside the 24-hour window the concept sharpened into **erid**: a grounded, voice-and-text study companion that answers _only_ from the materials a student loads. Voice stays central — you can talk to your notes through a frequency-driven orb — but every answer, spoken or typed, is anchored to a real source and page, never the open web.

## What's in it

- **The voice orb** — a black-hole sphere with a pulsing ring whose intensity, scale, and bloom are driven in real time by the AI's actual voice frequency data (`getOutputByteFrequencyData()`). It breathes when idle, listens when you speak, and pulses to its own answers.
- **The BlueYard-inspired canvas** — a vast editorial page with a warm apricot horizon, one oversized centered headline, and the black-hole orb hanging low like a celestial magazine-cover artwork.
- **Real source grounding (RAG)** — paste text or drop a PDF. erid pushes each source to an ElevenLabs Conversational AI Knowledge Base, triggers RAG indexing, and attaches it to the agent. Voice and text answers both come from your sources only — never the open web.
- **Study tools** — generate a **quiz**, **flashcards**, a **summary**, or an **"explain this page"** breakdown, all grounded strictly in your loaded sources (Gemini structured output). They live in the `review` and `read` workspace tabs beside chat, and every item carries `source · page` citations.
- **Citations** — every text answer is grounded with `[source · p. N]` pills the student can scan to find the original passage.
- **Code-switching by design** — the tutor matches the student's language (Tagalog / English / Taglish) per turn. The system prompt enforces it; Gemini handles it on the text side, ElevenLabs on the voice side.

## Problem we're solving

| Problem | erid's answer |
| --- | --- |
| Tutors are expensive and inaccessible | On-demand AI study help, available 24/7 (free to demo) |
| Existing apps don't understand Taglish | Code-switching by design — Tagalog / English / Taglish, per turn |
| Generic AI invents facts students can't trust | Answers come **only** from your loaded sources (RAG) — never the open web |
| Students can't verify an AI's answer | Every text answer cites the exact `source · page` |
| Heavy apps fail on slow connections | Lightweight: client-side PDF extraction, text-in / text-out |
| Few tools work with a student's _own_ materials | Bring your own notes or PDFs; erid grounds entirely in them |

## Stack

- **Next.js 16** (App Router) + TypeScript + Tailwind 4 + Turbopack
- **`@elevenlabs/react`** + **`@elevenlabs/elevenlabs-js`** — Conversational AI agent, signed-URL auth, Knowledge Base + RAG
- **`@google/genai`** — Gemini 2.5 Flash for grounded text chat (citation parsing) and study-tool generation (structured output via `responseSchema`)
- **`@paper-design/shaders-react`** — Dithering, PerlinNoise
- **`pdfjs-dist`** — client-side PDF extraction (no server-side PDF deps)
- **`motion`** — sheet animations
- **`vitest`** — unit tests for the study-tools logic
- **Fonts:** Instrument Sans throughout. The UI relies on tight tracking, flat square surfaces, and scale rather than chrome.

> Originally scoped (as SalitaCoach) for a React Native + Claude/Whisper pipeline; realized in 24 hours as the Next.js web app above.

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

Create a `.env.local` file in the project root with:

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

Open [localhost:3000](http://localhost:3000). The sources panel will slide in automatically the first time — drop a PDF or paste some study text, then tap the orb, or open the `review` / `read` tabs to generate study material.

## How the pieces fit

```
                  ┌─────────────────────────────────────┐
                  │  Browser (Next.js client component) │
                  │  · BackgroundCanvas (dither / mercury flow) │
                  │  · VoiceOrb (frequency-driven)      │
                  │  · WorkspaceTabs (ask / review / read) │
                  │  · ConversationPanel (text + voice) │
                  │  · StudyTools (quiz/cards/summary/explain) │
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
                  │ /study      │
                  └──────┬──────┘
                         │
                         ▼
                  ┌─────────────┐
                  │ Gemini 2.5  │
                  │ (chat +     │
                  │  study gen) │
                  └─────────────┘
```

The two AI paths intentionally share **state but not transport**:

- **Voice path** — client opens a WebSocket directly to ElevenLabs using a signed URL we mint server-side (key never reaches the browser). The agent already has the sources in its KB, so it grounds responses there. Frequency data from the SDK drives the orb.
- **Text path** — the client posts its question and the full source text to `/api/chat`, which calls Gemini with a strict "only-from-sources" system prompt. The response is parsed for `[source · p. N]` citation tokens and rendered as pills.
- **Study path** — the client posts the loaded sources plus a tool kind to `/api/study`, which calls Gemini with a per-tool JSON `responseSchema`. Each generated item's `{ source, page }` citations are resolved back to the loaded sources and rendered as pills.

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
    study/route.ts        # quiz / flashcards / summary / explain (structured output)
  globals.css             # BlueYard-style tokens, grain texture, breathing keyframes
  layout.tsx              # Instrument Sans font wiring
  page.tsx                # NotebookProvider → ConversationProvider → Surface

components/
  background-canvas.tsx   # pale atmospheric shader fallback
  voice-orb.tsx           # the centerpiece
  workspace-tabs.tsx      # ask / review / read tab shell
  conversation-panel.tsx  # unified voice + text feed with citation pills
  study-tools.tsx         # quiz, flashcards, summary, explain UIs
  sources-panel.tsx       # PDF / paste sheet, slides in from the left
  citation-pill.tsx       # flat apricot-hairline citation chip
  notebook-context.tsx    # shared sources + messages, persisted to localStorage

lib/
  pdf.ts                  # client-side PDF → page-numbered text
  elevenlabs-server.ts    # SDK client, agent ensure / KB attach
  gemini-server.ts        # Gemini system prompt + grounded answer
  study.ts                # study schemas, prompts, validation, citation resolution
  study-server.ts         # runStudy — grounded Gemini study generation
  citations.ts            # parses [source · p. N] tokens
  use-orb-activity.ts     # the RAF loop that writes CSS vars from voice freq
  types.ts                # shared types
  utils.ts                # cn helper
```

## Known MVP limitations (24-hour scope)

- One shared agent / one notebook per ElevenLabs account. Multi-tenant would mean dynamic agent creation, which is out of scope.
- Voice responses don't render citation pills (the spoken answer doesn't include the structured citation tokens text chat does). The voice agent _is_ still grounded — it just speaks naturally.
- "Remove source" only removes locally; the doc stays in ElevenLabs KB until you remove it from the dashboard. Wiring full detach is one extra API call and could be added.
- Study-tool results are generated on demand and not persisted; only your sources persist (per browser, via `localStorage`).
- No user accounts. The notebook persists per browser via `localStorage`.

## Visual direction

erid follows a BlueYard-style editorial rhythm: one centered headline, a single lower-half 3D celestial object, flat square controls, hairline cards, and pale chromatic tints used only as surfaces or borders.

## Hackathon

- **Event:** ACM TechSprint: Asteria
- **Co-presented by:** FEU Tech Innovation Center (FTIC) & Innovate PH Challenges
- **Major Partner:** Accenture
- **Community Partner:** RVND
- **Media Partner:** Manila Bulletin

## License

MIT License — see [LICENSE](LICENSE) for details.
