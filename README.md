# 🛰️ SIA-Orbit — UNSIA PJJ Curriculum Roadmap & Offline Matrix

> **Production-Grade Offline-First Single Page Application (SPA) & Progressive Web App (PWA) tailored for Distance Learning (PJJ) Students at Universitas Siber Asia (UNSIA).**

![PWA Badge](https://img.shields.io/badge/PWA-Ready-10b981?style=flat-square&logo=pwa)
![React 19](https://img.shields.io/badge/React-19.2-3b82f6?style=flat-square&logo=react)
![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-3.4-38bdf8?style=flat-square&logo=tailwindcss)
![Vite](https://img.shields.io/badge/Vite-8-646cff?style=flat-square&logo=vite)
![Cloudflare Pages](https://img.shields.io/badge/Deployment-Cloudflare%20Pages-f38020?style=flat-square&logo=cloudflare)

---

## 🌟 Core Architectural Features

### 1. 🛡️ 100% Client-Side & Zero Mandatory Login Barrier
- Designed specifically for PJJ students with unpredictable internet connectivity.
- No mandatory authentication wall or login expiration; students can immediately explore the curriculum, simulate graduation plans, and organize assignments.
- Full local persistence via `localStorage` with real-time reactive state.

### 2. ⚡ Offline Resilience & Workbox Cache Lifecycle
- **Initial Visit:** Service Worker pre-caches all HTML, JS bundles, Tailwind stylesheets, SVG badges, and the static curriculum JSON bundle.
- **Offline Mode:** Ambient top banner activates: *"Offline Mode Active — All data is securely loaded from your local browser cache."*
- **Background Version Check:** Automatically queries the service worker registration (`update()`) on each online session.
- **Interactive Update Notification:** When a new build is detected and installed in the background (`waiting` status), a floating sticky toast bar alerts the user:
  > *"⚡ Update Available: A new version of SIA-Orbit has been cached. [Reload Now] | [Dismiss]"*
  Clicking **Reload Now** sends `SKIP_WAITING` and activates the new version seamlessly.

### 3. 🔍 System & Cache Diagnostics Modal (Judge Transparency Panel)
- Detailed transparency widget inspecting:
  - Real-time `navigator.onLine` connectivity telemetry.
  - Active Workbox Service Worker lifecycle (`active`, `waiting`, `installing`).
  - CacheStorage buckets and asset count inspection.
  - Storage quota usage (`navigator.storage.estimate()`).
  - Manual triggers for SW update check and local cache purging.

### 4. 🎓 Module A: Interactive Curriculum & Prerequisite Matrix (SI Track)
- Complete **8 Semesters of Information Systems (UNSIA)** totaling **144 SKS**.
- Categories: Foundation, Database, Backend, Algorithms, Web Engineering, Enterprise Systems, Cyber Security, Capstone/Skripsi.
- **Interactive Prerequisite Highlighting:**
  - Clicking any course dynamically illuminates upstream foundational prerequisites and downstream unlocked courses.
- **Graduation & SKS Planner:**
  - Live progress tracker (Target: 144 SKS) with celebratory confetti milestone.
  - Real-time cumulative GPA (IPK) calculator simulation.
  - Prerequisite warning validation engine: flags warnings if advanced courses are planned without passing required foundational prerequisites.

### 5. 📋 Module B: PJJ Assignment Sync & Group Task Matrix
- **Asynchronous Deadline Board:**
  - Kanban & List toggles for pending PJJ assignments with Course, Due Date, LMS Submission URL, and Priority tags.
  - Dynamic urgency tags: `"Due in 24h"` (pulsing badge), `"Due this week"`, and `"Completed"`.
- **One-Click Group Splitter & Deliverable Generator:**
  - Auto-formats standardized WhatsApp / Telegram / Markdown task delegation messages with PIC assignments, Google Drive links, and submission guidelines.
  - **Single-Click Copy to Clipboard** with instant feedback.
  - **Export to .ICS Calendar File** for one-tap import into Google Calendar or Apple Calendar.

---

## 🚀 Quick Start Guide

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Local Development Server
```bash
npm run dev
```
Open your browser at `http://localhost:5173`.

### 3. Build for Production & PWA Inspection
```bash
npm run build
npm run preview
```

---

## ☁️ Cloudflare Pages Deployment Configuration

Deploy directly via Git or Cloudflare Wrangler CLI:

| Setting | Value |
| :--- | :--- |
| **Framework Preset** | `Vite` (or `None`) |
| **Build Command** | `npm run build` |
| **Build Output Directory** | `dist` |
| **Root Directory** | `/` |
| **Node.js Version** | `18+` or `20+` |

---

## 📁 Project Architecture

```
Current Directory
├── public/
│   ├── pwa-192x192.svg          # High-resolution PWA SVG icon
│   └── pwa-512x512.svg          # Maskable PWA SVG icon
├── src/
│   ├── components/
│   │   ├── Header.tsx                   # Navbar, theme toggle, connectivity & diagnostics button
│   │   ├── CurriculumExplorer.tsx       # 8-semester graph, prerequisite engine, SKS & GPA calculator
│   │   ├── AssignmentMatrix.tsx         # Kanban/List board & WhatsApp group task generator (.ICS export)
│   │   ├── UpdateNotificationToast.tsx  # Interactive SW update prompt toast
│   │   └── SystemDiagnosticsModal.tsx   # Cache & storage telemetry transparency modal
│   ├── data/
│   │   └── curriculumData.ts    # Complete UNSIA SI curriculum (144 SKS), assignments, grade scale
│   ├── types/
│   │   └── index.ts             # TypeScript definitions for Courses, Tasks, Groups, Diagnostics
│   ├── serviceWorkerRegistration.ts # Workbox SW registration, update listener & cache metrics
│   ├── App.tsx                  # Root application component with state orchestration
│   ├── main.tsx                 # React DOM mount & SW hook initializer
│   ├── index.css                # Tailwind base, dark mode tokens & glassmorphism
│   └── vite-env.d.ts            # Vite & PWA ambient types
├── tailwind.config.js           # Tailwind theme & class-based dark mode configuration
├── postcss.config.js            # PostCSS configuration
├── vite.config.ts               # Vite build config with VitePWA and Workbox caching strategies
└── package.json                 # Project dependencies & scripts
```

---
*Created for UNSIA PJJ Distance Learning Students • Universitas Siber Asia*
