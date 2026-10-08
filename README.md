# 🛰️ SIA-Orbit — UNSIA PJJ Curriculum Roadmap & Offline Matrix

> **Production-Grade Offline-First Single Page Application (SPA) & Progressive Web App (PWA) tailored for Distance Learning (PJJ) Students at Universitas Siber Asia (UNSIA).**

![PWA Ready](https://img.shields.io/badge/PWA-Prompt%20Mode-10b981?style=flat-square&logo=pwa)
![React 19](https://img.shields.io/badge/React-19.2-3b82f6?style=flat-square&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178c6?style=flat-square&logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-3.4-38bdf8?style=flat-square&logo=tailwindcss)
![Vite](https://img.shields.io/badge/Vite-8-646cff?style=flat-square&logo=vite)
![Cloudflare Pages](https://img.shields.io/badge/Deployment-Cloudflare%20Pages-f38020?style=flat-square&logo=cloudflare)

---

## 🌟 Key Features & Evolution Since Initial Release

### 1. 🛡️ 100% Client-Side & Zero Mandatory Login Barrier
- **Zero Friction:** No mandatory authentication wall, login tokens, or session timeouts. Students can immediately explore their curriculum roadmap, simulate study plans, and organize assignments.
- **Local Persistence:** All state (presets, course statuses, grades, assignment boards, and notification configurations) persists locally in browser `localStorage` and `IndexedDB`.
- **Offline Resilience:** Pre-caches all HTML, JavaScript, Tailwind styles, SVG icons, and static assets via Workbox. Includes an ambient status indicator for offline browsing.

---

### 2. 🎯 Dynamic Grade Thresholds & Decimal (0.00 – 4.00) Grade Input
- **Replaced Combobox with Live Numeric Input:** Course cards feature dynamic decimal input (`<input type="number" min="0" max="4" step="0.01" />`) instead of static `<select>` dropdowns.
- **Dynamic Letter Grade & GPA Calculation:** Typing scores (e.g. `3.85`, `3.30`, `2.75`) dynamically computes the corresponding letter grade badge (`A (4.0)`, `B+ (3.3)`) and synchronizes the cumulative GPA (IPK) across the Header and simulation cards.
- **Configurable Grade Thresholds:**
  - Located under **Konfigurasi $\rightarrow$ Tab Nilai**.
  - Built-in presets: **Standar UNSIA ($A \ge 3.75$)**, **Skala Ketat ($A \ge 3.85$)**, and **Skala Sederhana ($A \ge 3.50$)**.
  - Fully customizable minimum score thresholds ($\ge$) for every grade tier ($A, A-, B+, B, B-, C+, C, D, E$).
  - **Live Conversion Simulator Sandbox:** Test decimal scores against current thresholds with instant feedback.

---

### 3. 🔔 Operating System Task Reminders (Works Even When Tab is Closed)
- **Background Service Worker Engine:** Powered by a dedicated background service worker (`sw-task-reminder.js`) and `IndexedDB` (`sia_orbit_background_db`).
- **Closed-Tab Notification Guarantee:** Schedules OS-level desktop/mobile push notifications that fire even after browser tabs are closed.
- **Strict Anti-Spam Deduplication:** Notifications are dispatched strictly **once per task** using in-memory and persistent deduplication hashes.
- **Customizable Due Reminder Window:**
  - Configure alerts to trigger $X$ minutes before deadlines (presets for 15m, 30m, 60m, 120m, 24h, or custom inputs).
  - Test buttons for foreground and a 10-second closed-tab test scenario directly in **Konfigurasi $\rightarrow$ Tab Tugas**.
  - Synchronous task state syncing to the Service Worker via `beforeunload` and `pagehide`.

---

### 4. 🗂️ Interactive Kanban Board, Drag-and-Drop & Calendar View
- **Drag-and-Drop Kanban Columns:** Drag task cards freely across **Pending**, **In Progress (On Work)**, and **Completed** statuses with instant state updates.
- **Calendar View:** Visual monthly calendar showing assignment deadlines, urgency markers, and course tags.
- **PJJ Team Splitter & Delegator:**
  - 1-click generator for standardized WhatsApp / Telegram task distribution messages.
  - Export assignments to `.ICS` format for one-tap import into Google Calendar or Apple Calendar.

---

### 5. 📚 Curriculum Preset Management & JSON Import/Export
- **Multi-Preset Architecture:** Manage multiple degree plans, specialization tracks, or alternative scenarios (e.g. Software Engineering track vs. Data Analytics).
- **Course & Preset CRUD:** Add, edit, or delete courses (code, title, SKS, semester, prerequisites, category, descriptions, lecturer tips).
- **JSON Import / Export:**
  - Backup and restore custom curriculum structures in standard JSON format.
  - **Intelligent Conflict Resolver:** Modal prompt to replace, keep existing, or rename & import as a new preset.
- **Prerequisite Validation Engine:**
  - Interactive highlighting of upstream prerequisites and downstream unlocked courses.
  - Visual warnings if a student plans advanced courses before fulfilling prerequisite criteria.

---

### 6. ⚡ Non-Intrusive PWA Updates (User Consent Required)
- **No More Force Restarts:** Configured with `registerType: 'prompt'`, `skipWaiting: false`, and `clientsClaim: false`.
- **Gentle Update Notification:** When a new build is detected and cached in the background, a bottom banner alerts the student:
  > *"Pembaruan Versi Tersedia — Versi terbaru telah di-cache. [Muat Ulang] | [Tutup]"*
- The browser will **never force reload** without explicit user consent. Students can choose to update immediately or continue working undisturbed.

---

## 🛠️ Technology Stack

| Layer | Technology | Details |
| :--- | :--- | :--- |
| **Frontend Framework** | React 19 + TypeScript | High-performance SPA with modern hooks |
| **Bundler & Build Tool** | Vite 8 | Ultra-fast HMR and optimized production bundles |
| **Styling & Theme** | Tailwind CSS + Lucide Icons | Dark/Light mode (`class` strategy), glassmorphism design |
| **PWA & Offline Engine** | `vite-plugin-pwa` + Workbox | Cache-First runtime assets & Prompt-driven updates |
| **Background Services** | Service Worker + IndexedDB | Background alarms & OS notification triggers |
| **Calendar & Effects** | `canvas-confetti` + ICS Generator | Celebration confetti and `.ics` calendar sync |
| **Deployment Target** | Cloudflare Pages | Automated CI/CD edge deployment |

---

## 🚀 Quick Start Guide

### 1. Clone & Install
```bash
git clone https://github.com/yanuarizalk/1day.git
cd 1day
npm install
```

### 2. Run Local Development Server
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### 3. Production Build & Preview
```bash
npm run build
npm run preview
```
Production preview runs on [http://localhost:4173](http://localhost:4173).

---

## 📁 Project Structure

```
.
├── public/
│   ├── favicon.svg                # Application Favicon
│   ├── pwa-192x192.svg            # PWA Icon (192x192)
│   ├── pwa-512x512.svg            # PWA Maskable Icon (512x512)
│   └── sw-task-reminder.js        # Background Service Worker for closed-tab OS notifications
├── src/
│   ├── components/
│   │   ├── AssignmentMatrix.tsx       # Kanban drag-and-drop, Calendar view & WhatsApp group delegator
│   │   ├── ConfigurationMenu.tsx      # Unified 3-tab Config (Kurikulum, Tugas/Notifikasi, Nilai)
│   │   ├── CurriculumExplorer.tsx     # 8-Semester roadmap, decimal grade inputs, prerequisite visualizer
│   │   ├── CurriculumManageModal.tsx  # Preset manager & Course CRUD modal
│   │   ├── Header.tsx                 # Navigation bar, GPA pill, theme toggle, diagnostics toggle
│   │   ├── ImportConflictModal.tsx    # JSON import conflict resolver modal
│   │   ├── SystemDiagnosticsModal.tsx # Judge transparency panel for Cache & Storage telemetry
│   │   └── UpdateNotificationToast.tsx# User-consent PWA update toast
│   ├── data/
│   │   └── curriculumData.ts          # Default UNSIA Information Systems curriculum (144 SKS)
│   ├── types/
│   │   └── index.ts                   # TypeScript interfaces (Course, Preset, Assignment, Threshold, etc.)
│   ├── utils/
│   │   ├── curriculumIO.ts            # JSON serialization, normalization & export/import helpers
│   │   ├── gradeThresholdService.ts   # Decimal (0–4) threshold engine, presets & local persistence
│   │   └── taskNotificationService.ts # Notification permission, schedule engine & tab sync
│   ├── serviceWorkerRegistration.ts   # PWA registration, update lifecycle & cache diagnostics
│   ├── App.tsx                        # Master layout & root state orchestrator
│   ├── main.tsx                       # React DOM entry point
│   └── index.css                      # Tailwind base & custom animations
├── vite.config.ts                     # Vite config with VitePWA Prompt mode & Workbox integration
└── package.json                       # Scripts and project dependencies
```

---

## ☁️ Cloudflare Pages Deployment Configuration

Deploy directly via Git repository connection or Cloudflare Wrangler:

| Setting | Value |
| :--- | :--- |
| **Framework Preset** | `Vite` |
| **Build Command** | `npm run build` |
| **Build Output Directory** | `dist` |
| **Root Directory** | `/` |
| **Node.js Version** | `18+` or `20+` |

---

## 📝 License & Attribution

Developed for **Universitas Siber Asia (UNSIA)** Distance Learning (PJJ) Students.  
Open-source under the [MIT License](LICENSE).
