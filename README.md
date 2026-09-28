# TrackOwl

<p align="center">
  <img src="public/icon.png" alt="TrackOwl Logo" width="100" />
</p>

<p align="center">
  <strong>Next-Generation, Lightweight Time Tracking & Workforce Productivity Platform</strong>
</p>

<p align="center">
  <a href="https://github.com/furqan-debug/TrackOwl/releases/latest"><img src="https://img.shields.io/github/v/release/furqan-debug/TrackOwl?label=latest%20release&color=blue" alt="Latest Release" /></a>
  <a href="https://github.com/furqan-debug/TrackOwl/actions"><img src="https://img.shields.io/github/actions/workflow/status/furqan-debug/TrackOwl/release.yml?label=build%20%26%20release" alt="Release Build" /></a>
  <a href="https://github.com/furqan-debug/TrackOwl/issues"><img src="https://img.shields.io/github/issues/furqan-debug/TrackOwl" alt="GitHub Issues" /></a>
  <a href="https://github.com/furqan-debug/TrackOwl/blob/main/LICENSE"><img src="https://img.shields.io/github/license/furqan-debug/TrackOwl" alt="License" /></a>
</p>

---

## 📖 Overview

**TrackOwl** is an enterprise-grade time tracking and team productivity ecosystem designed with a focus on high performance, minimal resource consumption, and rock-solid privacy.

Built natively on **Tauri v2 + Rust** to replace legacy Electron trackers, TrackOwl consumes under 40 MB of RAM (up to 85% less than Electron-based alternatives) while delivering deep system integrations, resilient offline-first caching, and sub-second UI responsiveness.

### Core Ecosystem
* **Desktop Tracker (`/`, `src-tauri/`)**: High-performance native desktop client for Windows and macOS. Records sessions, activity levels (keyboard/mouse), active application titles, browser URLs, and periodic screenshots.
* **Admin & Management Portal (`apps/admin-portal/`)**: Modern React 19 web application for administrators, managers, and clients. Provides real-time dashboards, timesheets, timeline audits, productivity analytics, project budgeting, and team management.
* **Cloud & Service Layer (`supabase/`)**: Scalable backend powered by Supabase (PostgreSQL, Row-Level Security, Edge Functions, Auth, and Storage).

---

## ⚡ Key Features

### 🖥️ Native Desktop Tracker (Tauri v2 + Rust)
* **Lightweight Footprint:** Instant startup, <10 MB binary installer, and <40 MB RAM footprint.
* **10-Minute Block Accumulation:** Hubstaff-grade time chunking that groups activity samples, mouse/keyboard movements, active windows, and URLs into unified 10-minute intervals.
* **Native Browser URL Tracking:** Zero-overhead Windows UIAutomation COM (`IUIAutomation`) integration. Inspects active tab URLs directly through OS accessibility interfaces without spawning PowerShell processes or triggering antivirus false positives.
* **Smart Offline Resilience:** Embedded SQLite local database (`cache.rs`) queues block metrics, URLs, active apps, and screenshots during network disruptions. Automatically syncs in the background with exponential backoff when connectivity returns.
* **Strict Timezone & DST Precision:** Time calculation uses dynamic IANA timezone resolution (`chrono-tz`) so daily limits, work days, and company timesheets align identically regardless of team member locations.
* **Automated Updates:** Built-in delta updates powered by `tauri-plugin-updater` with cryptographic ECDSA signature verification.
* **Code-Signed & Notarized:**
  * **Windows:** Authenticode signed using Digify Global LLC's SSL.com eSigner Cloud HSM certificate (`.exe` NSIS installer and `.msi`).
  * **macOS:** Signed with Apple Developer ID and fully notarized with Apple Ticket Stapling (`.dmg` and universal `.app`).

### 📊 Admin Portal & Reporting
* **Live Activity & Timeline:** Real-time visibility into who is currently tracking, active projects, and chronological screenshot timelines.
* **Timesheets & Audit Trails:** Granular day/week/month breakdowns with company timezone normalization, daily limit warnings, and time-off tracking.
* **App & URL Tracking Breakdown:** Insight into time spent across software applications and websites.
* **Projects & Budget Tracking:** Real-time budget burn rates, hourly rates, and client invoices.
* **Enterprise Access Control:** Role-based permissions (Owner, Admin, Manager, Member) strictly enforced at both the UI and database (RLS) layers.

---

## 📂 Project Structure

```text
.
├── src/                    # Desktop Client: React 19 + TypeScript + Vite frontend
│   ├── App.tsx             # Main desktop UI, timer view, project selector, weekly stats
│   ├── App.css             # Desktop styling & animations
│   ├── tauri-ipc.ts        # Typed IPC bridge communicating with Tauri commands & events
│   └── components/         # Desktop UI components (UpdaterOverlay, MyTasksPanel, etc.)
│
├── src-tauri/              # Desktop Client: Tauri v2 + Rust Native Engine
│   ├── src/
│   │   ├── main.rs         # Application entry point & command registration
│   │   ├── lib.rs          # Tauri builder initialization & plugins
│   │   ├── tracker.rs      # Session state machine & periodic scheduler
│   │   ├── block_accumulator.rs # 10-minute block aggregation & IANA timezone handling
│   │   ├── cache.rs        # SQLite offline cache (sync queue, purge, persistent storage)
│   │   ├── url_tracker.rs  # Native Win32 UIAutomation COM browser URL monitor
│   │   ├── active_window.rs# OS window title & process detection
│   │   ├── hooks.rs        # Low-level input hooks (activity percentage calculation)
│   │   ├── screenshot.rs   # Cross-platform screen capture
│   │   └── updater.rs      # Background auto-update checker
│   ├── Cargo.toml          # Rust dependencies & build profile
│   └── tauri.conf.json     # Tauri configuration (bundle settings, security, window specs)
│
├── apps/
│   └── admin-portal/       # Management Portal: React 19 + Vite + Tailwind CSS
│       ├── src/
│       │   ├── pages/      # Dashboard, Timesheets, Activity, Projects, Landing, etc.
│       │   ├── services/   # Supabase database services & API clients
│       │   └── context/    # AuthContext, ThemeContext
│       └── package.json    # Portal dependencies & build scripts
│
├── supabase/               # Cloud Infrastructure
│   ├── migrations/         # PostgreSQL database schemas, RLS policies, and triggers
│   └── functions/          # Supabase Edge Functions (invites, stripe billing, webhooks)
│
└── .github/workflows/      # CI/CD Workflows
    ├── release.yml         # Tag-driven build, SSL.com Windows signing, macOS notarization & release
    └── build-test.yml      # Manual test artifact generation
```

---

## 🛠️ Tech Stack

| Domain | Technologies |
| :--- | :--- |
| **Desktop Native** | Rust 2021, Tauri v2, Tokio, SQLite (`rusqlite`), `windows-rs` / Win32 COM, `chrono-tz` |
| **Desktop Frontend**| React 19, TypeScript, Vite, Framer Motion, Lucide Icons |
| **Admin Portal** | React 19, TypeScript, Vite, Tailwind CSS, Lenis Scroll |
| **Backend & Database** | Supabase (PostgreSQL 15), Row Level Security (RLS), Supabase Edge Functions (Deno) |
| **CI/CD & Security** | GitHub Actions, SSL.com eSigner (Windows), Apple Notarization (macOS) |

---

## 🚀 Getting Started

### Prerequisites

* **Node.js:** `v20.x` or higher
* **Rust:** Stable Rust toolchain (`rustup install stable`)
* **Platform Dependencies:**
  * **Windows:** [Visual Studio 2022 C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) + WebView2 (preinstalled on Windows 10/11)
  * **macOS:** Xcode Command Line Tools (`xcode-select --install`)

---

### 1. Desktop Application

```bash
# Clone the repository
git clone https://github.com/furqan-debug/TrackOwl.git
cd TrackOwl

# Install desktop frontend dependencies
npm install

# Run Desktop Client in Tauri Development Mode
npm run dev:tauri

# Or build production installer locally (unsigned)
npm run build:tauri
```

The desktop app runs its Vite dev server on port `5174` and opens a native Tauri window.

---

### 2. Admin Portal

```bash
cd apps/admin-portal

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env

# Run Vite dev server
npm run dev
```

Required environment variables for `apps/admin-portal/.env`:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

---

## 🔒 Security & Antivirus Compliance

TrackOwl is designed from the ground up for strict enterprise security compliance:

1. **Native Win32 COM URL Detection:**
   - URL monitoring uses native Windows UIAutomation interfaces directly through compiled C/Rust COM bindings.
   - **Zero PowerShell spawning:** Completely eliminates command-line process creation that commonly triggers heuristic antivirus flags (e.g., Windows Defender `Trojan:Win32/Wacatac`).
2. **Encrypted Authenticode Code Signing:**
   - Official Windows installers are signed in cloud CI using an SSL.com eSigner OV certificate issued to `Digify Global LLC`, verifying publisher identity and software integrity.
3. **Apple Notarization:**
   - Every macOS build is scanned by Apple's automated notary service and stamped with a trusted cryptographic ticket for Gatekeeper compliance.
4. **Row-Level Security (RLS):**
   - Every database query through Supabase is strictly filtered by organization and member tenancy at the database engine level. Employees can never view colleagues' metrics unless granted explicit manager or admin roles.
5. **Audited Dependencies:**
   - Regularly audited against CVEs across Cargo and NPM dependency graphs.

---

## 📦 Releases & Versioning

Official pre-built installers for Windows and macOS are published under [GitHub Releases](https://github.com/furqan-debug/TrackOwl/releases).

* **Windows:**
  * `TrackOwl_<version>_x64-setup.exe` (NSIS Installer — Recommended)
  * `TrackOwl_<version>_x64_en-US.msi` (MSI Enterprise Installer)
* **macOS:**
  * `TrackOwl_<version>_aarch64.dmg` (Apple Silicon M1/M2/M3/M4)
  * `TrackOwl_<version>_x64.dmg` (Intel Core Processors)

To trigger a new production release:
1. Ensure `package.json`, `src-tauri/Cargo.toml`, and `src-tauri/tauri.conf.json` versions are aligned.
2. Push a git tag following semantic versioning:
   ```bash
   git tag -a v2.0.61 -m "TrackOwl v2.0.61 release"
   git push origin v2.0.61
   ```

3. GitHub Actions builds, signs, and generates the `latest.json` updater manifest automatically.

---

## 📄 License

This repository and its codebase are proprietary and confidential.  
Copyright © 2026 Digify Global LLC / TrackOwl. All rights reserved.
