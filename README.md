# TrackOwl

[![GitHub Pull Requests](https://img.shields.io/github/issues-pr/furqan-debug/TrackOwl)](https://github.com/furqan-debug/TrackOwl/pulls)
TrackOwl is a time tracking and workforce monitoring platform built around three applications:

* An Electron desktop client for activity tracking
* A React admin portal for managing teams and projects
* An Express API backed by Supabase

The desktop application records work sessions, application usage, browser activity, screenshots, and productivity data. The admin portal provides project management, reporting, team administration, and time-off management tools.

## Project Structure

```text
.
├── admin-portal/   # React + Vite management dashboard
├── backend/        # Express API and business logic
└── desktop/        # Electron tracking client
```

### Desktop Client

The Electron client runs on employee devices and is responsible for:

* Session tracking
* Activity monitoring
* Screenshot capture
* Active application detection
* Browser URL tracking
* Syncing collected data to Supabase

### Admin Portal

The admin portal provides:

* Project management
* Team management
* Productivity reporting
* Budget tracking
* Time-off management
* Organization settings

### Backend

The backend acts as a service layer between the frontend applications and Supabase.

Responsibilities include:

* Member invitations
* Permission handling
* Reporting aggregation
* Project management workflows
* Business rule enforcement

## Tech Stack

### Admin Portal

* React
* TypeScript
* Vite
* Tailwind CSS

### Desktop Client

* Electron
* Node.js

### Backend

* Express
* Node.js

### Infrastructure

* Supabase
* PostgreSQL
* Supabase Auth

## Setup

### Requirements

* Node.js 18+
* Supabase project

### Backend

```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

Configure the required Supabase environment variables before starting the server.

### Admin Portal

```bash
cd admin-portal
npm install
npm run dev
```

Required environment variables:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_API_BASE_URL=
```

### Desktop Client

```bash
npm install
npm run dev
```

Configure Supabase credentials in the desktop client's environment file before running the application.

## Database

The project uses Supabase as its primary datastore.

Core tables include:

| Table            | Purpose                             |
| ---------------- | ----------------------------------- |
| projects         | Project configuration and budgeting |
| members          | Team members and profile data       |
| sessions         | Recorded work sessions              |
| activity_samples | Productivity and activity metrics   |
| project_members  | Project access mapping              |
| project_teams    | Team assignments                    |

The complete schema can be found in:

```text
backend/supabase_schema.sql
```

## Authentication

Authentication is handled through Supabase Auth and shared across the platform.

Access to projects, reports, and administrative functionality is controlled through role-based permissions stored in the database.

## Development

Each application can be developed independently:

```bash
# Backend
cd backend && npm run dev

# Admin Portal
cd admin-portal && npm run dev

# Desktop Client
npm run dev
```

## Security & Hardening

The repository undergoes regular audits and security hardening:

* **NPM Package Overrides**: Nested dependencies are strictly locked in `apps/admin-portal/package.json` to prevent security issues:
  * ReDoS (Regular Expression Denial of Service) in `path-to-regexp` and `minimatch`.
  * Windows-specific Arbitrary File Read in `esbuild`.
  * HTTP Request/Response Smuggling or WebSocket decompression issues in `undici`.
* **Rust/Cargo Audits**: Key vulnerabilities in Tauri's native dependencies are mitigated:
  * Upgraded `rustls-webpki` and `tar-rs` to eliminate CRL bit string DoS and path traversal risks.
  * Upgraded `tauri` Core to patch remote IPC origin confusion vulnerabilities.
  * Upgraded `openssl` to patch buffer overflows in `digest_final()` and memory disclosure in cookies.

