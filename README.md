#AI-Powered Oral Practice Tutor for Filipino Learners
👥 Team: Rocky and the Other Rockies

NameRoleCosme, Rene VincentRazon III, GerardoYu, Charles DerickZablan, Prince Edwin


📌 Project Case

Accenture Challenge — AI-Powered Study Companion for Filipino Learners

Many Filipino students face barriers to quality educational support due to limited access to tutors, connectivity constraints, and language differences. Existing platforms often fail to accommodate diverse learning needs, particularly for students who prefer learning in Filipino or require personalized guidance aligned with their grade level.


💡 What We're Building: SalitaCoach

SalitaCoach is an AI-powered oral recitation and speaking-practice coach for Filipino learners — where voice isn't just a feature, it's the entire point.

Instead of a general-purpose tutor that happens to talk, SalitaCoach is built around the act of speaking itself. Students practice explaining concepts out loud in Taglish (Filipino-English code-switching), read passages aloud, and receive real-time feedback on:


🗣️ Pronunciation — Are the words being said correctly in Filipino and English?
🌊 Fluency — Is the student speaking with natural rhythm and flow?
📚 Content accuracy — Is the spoken explanation of a concept correct?
💬 Oral recitation readiness — Is the student prepared to present in class?


Why Voice-First?

Oral recitation is a core part of Philippine education — from elementary declamation contests to college oral exams — yet almost no tools exist specifically to help Filipino students practice speaking. SalitaCoach fills that gap directly.

Voice also sidesteps the bandwidth problem: instead of streaming video or loading heavy content, the app captures short audio clips, processes them, and returns lightweight text feedback — making it viable even in low-connectivity environments.


🛠️ Features (Planned & In Development)


Speak & Get Feedback — Record yourself explaining a concept or reading a passage; receive instant AI feedback on pronunciation, fluency, and accuracy.
Taglish-aware NLP — Understands natural Filipino-English code-switching; doesn't penalize students for mixing languages the way they naturally speak.
Grade-level adaptation — Content and difficulty adjust based on the student's level (elementary, junior high, senior high).
Practice Modes

Free Recitation — Explain a topic in your own words
Read Aloud — Read a passage and get pronunciation feedback
Q&A Drill — Answer a question verbally and get scored



Progress Tracking — Students can review past sessions and track fluency improvements over time.
Mobile-first, low-bandwidth — Optimized for Android devices on limited data connections.



🧱 Tech Stack (Proposed)

LayerTechnologyFrontendReact Native (mobile-first)Speech-to-TextWeb Speech API / Whisper (fine-tuned for Filipino)AI Feedback EngineClaude API (Anthropic)Language DetectionCustom Taglish classifierBackendNode.js + ExpressDatabaseSupabase (PostgreSQL)HostingVercel / Railway


🚀 Getting Started


(Instructions will be updated as development progresses.)



bash# Clone the repository
git clone https://github.com/<your-repo>/salita-coach.git

# Install dependencies
cd salita-coach
npm install

# Run development server
npm run dev


📁 Project Structure

salita-coach/
├── src/
│   ├── components/       # UI components
│   ├── screens/          # App screens (Home, Practice, Results)
│   ├── services/         # AI feedback & speech processing
│   └── utils/            # Taglish detection, scoring helpers
├── backend/
│   ├── routes/           # API endpoints
│   └── prompts/          # Claude prompt templates
├── public/
└── README.md


🎯 Problem We're Solving

ProblemOur SolutionNo oral practice tools for Filipino studentsVoice-first speaking coach built for PH educationExisting apps don't understand TaglishTaglish-aware AI that accepts natural code-switchingTutors are expensive and inaccessibleOn-demand AI feedback, available 24/7 for freeHeavy apps don't work on slow connectionsLightweight audio-in, text-out architectureStudents don't know how they soundObjective, specific, grade-appropriate feedback


🏆 Hackathon

Event: ACM TechSprint
Co-presented by: FEU Tech Innovation Center (FTIC) & Innovate PH Challenges
Major Partner: Accenture
Community Partner: RVND
Media Partner: Manila Bulletin


📄 License

MIT License — see LICENSE for details.
