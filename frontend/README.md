# Intent Drift Radar – Frontend

React + TypeScript (Vite) single-page app for Intent Drift Radar. 3-column analyst-grade UI: **Timeline** | **Analysis** | **Evidence & Reasoning**, with evidence ↔ timeline linking and Judge Mode.

## Stack

- **React 18** + **TypeScript**
- **Vite** (dev server, build)
- No UI framework; CSS variables and Manrope font

## Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── HeaderBar.tsx      # Title, badges (Model/Thinking/Windows), Judge/Demo Mode
│   │   ├── TimelinePanel.tsx  # Signals by day, type tags, highlight/active, Add Signal
│   │   ├── AnalysisPanel.tsx  # Analyze, Settings, drift banner, confidence, signature, Copy/Confirm/Reject
│   │   ├── EvidencePanel.tsx  # Evidence list, reasoning cards, hover/click linking, Pinned chip
│   │   ├── OutputPanel.tsx    # Legacy output layout (used internally by AnalysisPanel content)
│   │   ├── SettingsPanel.tsx  # Baseline/current window, thinking level
│   │   └── SignalsPanel.tsx   # Demo data + Add Signal form (used by TimelinePanel)
│   ├── App.tsx                # Root layout, state (highlightedDays, pinnedDays, activeDay), Judge/Demo handlers
│   ├── api.ts                 # getVersion, analyze, submitFeedback
│   ├── types.ts               # Signal, AnalysisResult, EvidenceItem, ReasoningCard, etc.
│   ├── index.css              # CSS variables (--accent, --radius), layout, component styles
│   └── main.tsx
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts             # Builds to ../backend/static
```

## Run

From **project root**:

```bash
# Dev (frontend + backend)
make dev

# Frontend only (proxies /api to backend :8000)
make run-frontend
```

From `frontend/`:

```bash
npm install
npm run dev
```

Optional: `export VITE_API_BASE="http://localhost:8000"` if the proxy is not used.

## Build

From project root:

```bash
./scripts/build.sh
# Or: make build
```

Output: `backend/static/` (served by the backend in production).

## Features

- **Judge Mode**: One click loads demo data, sets high thinking + window sizes, auto-runs analysis, scrolls to output.
- **Demo Mode**: Loads 5-day demo dataset; badge "Demo Dataset (5 days)" when active.
- **Evidence ↔ Timeline**: Hover evidence or reasoning cards highlights corresponding days in the timeline; click pins and scrolls; "Pinned: Day 3" chip when pinned; "Clear highlight" to reset.
- **Traceability hint**: Helper text above Evidence invites hover/click.
- **Copy Summary**: Plain-text summary to clipboard; Confirm/Reject Drift for feedback.
