# Windows 11 Update Notifier — Dual Android App & Discord Alert Suite

An installable Android Progressive Web App (PWA) and automated Discord notification suite that tracks Microsoft's official Windows 11 Release Health page in real time, delivering instant updates simultaneously to your **Android app** (standalone home-screen app + native Android push notifications) and your **Discord server/mobile app** via Webhooks and 6-hour GitHub Actions cron runs.

## User Review & Critical Decisions

> [!IMPORTANT]
> Confirmed: We will build **BOTH the Android App AND Discord Notifications** together as a unified dual-channel system. Click **Proceed** to start building the complete application and GitHub Actions automation files.

- **Confirmed Decision 1 — Both Android App + Discord Notifications Enabled Together**:
  - **1. Dedicated Android App Experience**: Full installable Android PWA (`display: standalone`, Service Worker background caching, custom Windows 11 Fluent icon pack, one-tap **"Install on Android"** banner, native Android Web Notification trigger, plus optional **ntfy.sh Android Push Topic** support for instant lock-screen push alerts).
  - **2. Full Discord Notification System**: Built-in Discord Webhook manager with a live **"Send Discord Test Alert"** button in the app, rich Discord Embed cards (showing KB number, OS build, channel, and direct Microsoft links), and automatic Discord Webhook dispatching inside `scripts/check_win11_updates.py` and `.github/workflows/win11-update-notifier.yml`.
- **Confirmed Decision 2 — Live Data Fetching with Fallback**: A backend Express proxy fetches and parses Microsoft's live Windows 11 Release Information page (`learn.microsoft.com/en-us/windows/release-health/windows11-release-information`), syncs with `state/last_seen.json`, and includes a complete fallback dataset covering Windows 11 26H2, 26H1, and 24H2 updates (`KB5127646`, `KB5129195`, etc.).

---

## 1. Overview & Core Concept

- **What It Does**: Monitors Microsoft's official Windows 11 Release Health feed for major feature releases (26H2, 26H1, 24H2) and monthly cumulative, security, or preview KB packages. Users can browse, filter, and search updates from an installable Android app or desktop dashboard, test native Android/browser notifications, send live formatted alerts to a Discord channel on their phone, and push the project to GitHub so GitHub Actions checks Microsoft every 6 hours for free.
- **Target Audience / Persona**: Windows enthusiasts, system administrators, and developers who want immediate mobile alerts on Android and Discord whenever Microsoft publishes a new Windows 11 build or KB patch.
- **Key Value**: Zero ongoing server or token cost when synced to GitHub Actions, combined with an installable Android app and real-time Discord mobile push alerts.

---

## 2. User Experience & Visual Design

### Key User Flows
1. **Install on Android & Quick Status Check**: On mobile or desktop, users see the latest Windows 11 build metrics at a glance and can tap **"Install Android App"** in the header or mobile bar to add the standalone app to their Android home screen.
2. **Live Release Feed & Filtering**: Users filter updates by Update Type (*All*, *Major Feature Updates*, *Security / Cumulative KB*, *Out-of-Band / Preview*) and Channel (*All*, *26H2*, *26H1*, *24H2*), search by KB number or OS build (e.g., `KB5127646`, `26200.9711`), or trigger a live re-scrape of Microsoft's Release Health page.
3. **Discord & Android Notification Testing**:
   - Tap **"Test Browser / Android Notification"** to fire a native Service Worker / Web Notification API alert (with an immediate in-app toast confirmation).
   - Open the **Discord & GitHub Action Setup** view, paste a Discord Webhook URL, and click **"Send Live Discord Test"** to immediately receive a formatted Windows 11 KB embed on the Discord Android app.
4. **GitHub Sync & Automation Inspection**: View the live status of `state/last_seen.json`, preview the generated `state/latest_alert.md`, and copy or inspect the standalone Python scraper and GitHub Actions workflow YAML ready for one-click GitHub Sync.

### Visual Identity & Theme
- **Aesthetic Direction**: High-craft dark mission control tailored for both mobile thumb ergonomics (375px–430px Android viewports) and expansive 1440px desktop monitoring.
- **Color Palette & Mood**:
  - **60% Dominant Canvas**: Deep obsidian slate (`#0B0F17`) for reduced eye strain and crisp contrast on OLED Android screens.
  - **30% Structural Surfaces**: Elevated slate containers (`#111827` / `#1E293B`) with 1px hairline borders (`rgba(255, 255, 255, 0.08)`).
  - **10% Accent Budget**: Windows Fluent Azure (`#38BDF8` / `#0284C7`) for primary actions and active filters, Discord Blurple (`#5865F2`) for Discord webhook controls, and semantic text+icon indicators (`#10B981` nominal/synced, `#F59E0B` preview/out-of-band).
- **Typography & Hierarchy**:
  - *Display & Navigation*: `Plus Jakarta Sans` (SemiBold/Bold, tight tracking, `text-wrap: balance`).
  - *Body & Descriptions*: `DM Sans` (Regular/Medium, high scannability on mobile and desktop).
  - *Builds, KB Identifiers & Timestamps*: `JetBrains Mono` with `tabular-nums` for vertical alignment of OS build numbers (`26200.9711`, `28000.3231`) and KB codes (`KB5127646`).
- **Component Styling & Layout**:
  - **Desktop (1440px)**: Clean 3-zone top bar + 4-metric summary strip + full-width filterable release table and side-by-side Discord / GitHub Action configuration panel.
  - **Android Mobile (375px–430px)**: Sticky compact top bar + scrollable release cards with $\ge 44\text{px}$ touch targets + fixed bottom thumb navigation bar (*Updates*, *Discord Alerts*, *GitHub Action*, *Install App*) respecting the $\le 15\%$ mobile sticky height cap.
  - **Zero-Pill Metadata Discipline**: Release dates, build numbers, and servicing channels are rendered as clean inline text with `·` separators rather than cluttered pill badges.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Installable Android PWA + Real Discord Webhook Delivery**
  - *Chosen Approach*: Combine a compliant Vite PWA (`display: standalone`, Service Worker notifications, Android home screen install button) with direct Discord Webhook dispatching.
  - *Why*: Installing the PWA gives a native full-screen app experience on Android, while Discord Webhooks provide reliable background push notifications to Android lock screens even when the browser is closed, backed by GitHub Actions running every 6 hours.
  - *Alternatives Considered*: Browser-only polling (stops when the mobile browser is closed by Android battery management).
- **Decision 2: Dual Scraper Architecture (Express Proxy + Standalone Python Script)**
  - *Chosen Approach*: Provide both a live Node/Express scraper endpoint for interactive dashboard refreshes and the exact standalone Python 3 standard-library script (`urllib.request`, `re`, `json`, `os`, `datetime`) required for GitHub Actions.
  - *Why*: Users get real-time live data inside the web app immediately, and when pushed to GitHub via AI Studio GitHub Sync, the repository runs the Python workflow autonomously with zero external pip dependencies.

---

## 4. Technical Architecture & Data Strategy

### Architecture & Component Diagram

```text
┌────────────────────────────────────────────────────────────────────────────┐
│                   ANDROID PWA & WEB DASHBOARD (React 19)                   │
│                                                                            │
│  ┌──────────────────────┐  ┌──────────────────────┐  ┌──────────────────┐  │
│  │   Top Bar & Mobile   │  │  Windows 11 Release  │  │ Discord & GitHub │  │
│  │   PWA Install Hook   │  │   Tracker & Filters  │  │  Config Drawer   │  │
│  └──────────┬───────────┘  └──────────┬───────────┘  └────────┬─────────┘  │
│             │                         │                       │            │
│             ▼                         ▼                       ▼            │
│  ┌──────────────────────┐  ┌──────────────────────┐  ┌──────────────────┐  │
│  │ Web Notification API │  │ Live Search, Channel │  │ Discord Webhook  │  │
│  │  & Service Worker    │  │  & Type Filter State │  │  Test & Preview  │  │
│  └──────────────────────┘  └──────────┬───────────┘  └────────┬─────────┘  │
└───────────────────────────────────────┼───────────────────────┼────────────┘
                                        │                       │
                           GET /api/updates         POST /api/notify/discord
                           POST /api/check-now                  │
                                        ▼                       ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                     EXPRESS BACKEND SERVER (server.ts)                     │
│                                                                            │
│  • Scrapes Microsoft Learn Windows 11 Release Health HTML                  │
│  • Parses Versions (26H2, 26H1, 24H2), KBs (KB5127646+), & OS Builds       │
│  • Reads & updates state/last_seen.json and state/latest_alert.md          │
│  • Dispatches rich Discord Webhook embeds to user's Discord server         │
└───────────────────────────────────────┬────────────────────────────────────┘
                                        │
                                        ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                GITHUB ACTIONS AUTOMATION (Every 6 Hours)                   │
│                                                                            │
│  • .github/workflows/win11-update-notifier.yml (push, dispatch, cron)      │
│  • scripts/check_win11_updates.py (Python 3 stdlib scraper & notifier)     │
│  • state/last_seen.json & state/latest_alert.md (committed state & alert)  │
│  • Opens GitHub Issue (emails owner) + posts to DISCORD_WEBHOOK_URL        │
└────────────────────────────────────────────────────────────────────────────┘
```

### Data Model & State
- **Release Item Entity**:
  - `id`: Unique identifier (e.g., `KB5127646-26200.9711`)
  - `kb`: KB identifier (`KB5127646`, `KB5129195`, etc.)
  - `build`: OS Build number (`26200.9711`, `28000.3231`, `26100.3476`, etc.)
  - `version`: Windows 11 Feature Version (`26H2`, `26H1`, `24H2`, `23H2`)
  - `type`: `"Major Feature Updates"` | `"Security / Cumulative KB"` | `"Out-of-Band / Preview"`
  - `releaseDate`: ISO date string (`2026-10-14`, etc.)
  - `title` & `highlights`: Concise summary of key fixes or changes
  - `sourceUrl`: Direct link to Microsoft Release Health or KB support article
  - `isNew`: Boolean flag comparing against `state/last_seen.json`
- **Repository State (`state/last_seen.json`)**:
  - Tracks `versions`, `kbs`, `builds`, and `last_checked_utc` so both the interactive app and the GitHub Action know which updates are newly published.

### Interactive Component & State Mapping
- **Live Sync & Diff Check (`Check Now` button)**: Triggers `POST /api/check-now`, which fetches Microsoft's live page, compares discovered KBs/builds against `state/last_seen.json`, updates the state file, and highlights any newly detected updates.
- **Filter & Search Controls**: Instant client-side filtering across Update Type (`All`, `Major Feature Updates`, `Security / Cumulative KB`, `Out-of-Band / Preview`), Channel (`All`, `26H2`, `26H1`, `24H2`), and free-text query with an empty-state reset button.
- **Android & Browser Notification Tester**: Checks `Notification.permission`, requests permission if needed, triggers a native notification via `navigator.serviceWorker.ready` (for Android Chrome compatibility) or `new Notification()`, and always displays a companion in-app toast banner so it works inside preview iframes too.
- **Live Discord Webhook Tester**: Validates the user's Discord `https://discord.com/api/webhooks/...` URL, persists it optionally in `localStorage` for convenience, and sends a formatted Discord embed via `POST /api/notify/discord` containing the latest Windows 11 KB build details.
