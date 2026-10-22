# Windows Update Blocker (WUB) Safe-Window & Vulnerability Guard Plan

## 1. Research Summary: How Long Is It Safe to Block Windows Updates?
Microsoft delivers Windows 11 updates on a predictable monthly cadence:
- **Patch Tuesday ("B Release" — 2nd Tuesday of each month)**: Mandatory cumulative **Security Updates** containing fixes for newly disclosed vulnerabilities (CVEs) and all previous patches. Because attackers reverse-engineer Patch Tuesday fixes within days of release, CISA and enterprise security baselines recommend applying security updates within **14 days**.
- **Optional Preview ("C/D Release" — 3rd or 4th week of each month)**: Non-security preview builds testing upcoming features and bug fixes ahead of the next month's Patch Tuesday. These contain **no new security patches** and are completely safe to skip while Windows Update Blocker (WUB) is enabled.
- **Consumer Pause Ceiling (30–35 Days)**: Windows Update natively allows pausing updates for up to 35 days (spanning roughly one monthly Patch Tuesday cycle). Blocking beyond **30 days** or missing **2+ consecutive Security KBs** leaves multiple months of publicly known vulnerabilities unpatched.

---

## 2. Simplified & Deterministic Risk Meter Logic
No complex or speculative CVE scoring is used. The Risk Meter is calculated strictly from **Days Blocked**, **Missed Security KBs**, and the **Planned Unblock Date**:

- **🟢 SAFE (`Green`)**:
  - $\le 14\text{ days}$ blocked **AND** `0` Security/Cumulative KBs missed.
- **🟡 MODERATE (`Amber`)**:
  - $15\text{–}30\text{ days}$ blocked **OR** `1` Security/Cumulative KB missed (while still before the Planned Unblock Date).
- **🔴 HIGH (`Red`)**:
  - $> 30\text{ days}$ blocked **OR** `2+` Security/Cumulative KBs missed **OR** current date is **on or past the Planned Unblock Date**.

---

## 3. Core Upgrades & User Experience

### A. Clean Top WUB Status Bar
At the top of the app, a scannable, single-line telemetry bar displays the four core indicators with tabular numerals:
- **WUB Status**: `BLOCKED (Active)` or `UNBLOCKED (Protected)`
- **Timer**: `Days Blocked` · `Days Left until Planned Unblock` (or Overdue count)
- **Risk Indicator**: Color-coded status (`SAFE` / `MODERATE` / `HIGH`) with plain-English reason
- **Missed Security Count**: Exact count of missed **Security / Cumulative KBs** (`0`, `1`, `2+`)

### B. WUB Window Controls & "Mark as Unblocked" Reset Action
- **Start Date & Planned Unblock Date Pickers**: Set when you turned WUB on and when you plan to unblock. Quick presets (`+7 Days`, `+14 Days Safe Window`, `+30 Days Max Window`) make setup effortless.
- **One-Tap "Mark as Unblocked" Action**: A prominent reset button for when you turn WUB off and update Windows. Clicking **"Mark as Unblocked"** immediately:
  - Switches status to `UNBLOCKED (Protected)`
  - Resets `Days Blocked` to `0` and clears the active block window
  - Resets `Missed Security KBs` to `0` and restores the Risk Meter to `🟢 SAFE`

### C. Strict Separation: Security/Cumulative KBs vs. Optional Preview Updates
Updates released during your active WUB window are automatically classified and separated into two distinct lists:
1. **Security & Cumulative KBs (`Affects Risk & High-Priority Alerts`)**:
   - Patch Tuesday (B-releases) and Out-of-Band (OOB) security updates.
   - Directly increments the **Missed Security KB** counter and elevates the Risk Meter.
   - Includes a **One-Tap Unblock Catch-Up Guide** highlighting the single latest Cumulative KB per Windows 11 version (`24H2`, `23H2`, `22H2`) you need to install when unblocking (since Windows 11 cumulative updates supersede prior KBs).
2. **Optional Preview Updates (`Informational Only — 0 Risk Impact`)**:
   - Late-month `Preview` builds (C/D-releases).
   - Clearly labeled as safe to skip while WUB is active; never elevates the Risk Meter.

### D. Alert Every Single Update with Priority-Based Routing (Discord & Android)
Every single Windows 11 update discovered (both live background checks and date-range explorations) triggers a notification so you always have full visibility, but with **strict priority routing**:
- **🚨 HIGH PRIORITY (`@everyone` Ping + Red Embed + Urgent Android Notification)**:
  - Triggered when a **Security / Cumulative KB** drops while WUB is blocked.
  - Triggered when your **Planned Unblock Date is reached or overdue**, or when your Risk Meter hits **HIGH**.
- **ℹ️ STANDARD PRIORITY (Informational Embed without `@everyone` + Standard Android Notification)**:
  - Triggered when an **Optional Preview Update** drops, or when WUB is currently marked as **Unblocked** (keeps you informed of every single release without false-alarm emergency pings).

---

## 4. Architecture & Alert Flow Diagram

```text
+-------------------------------------------------------------------------+
|                   Microsoft Windows 11 Release Health                   |
|             (Every Update Scraped: 24H2, 23H2, 22H2 Builds)             |
+------------------------------------+------------------------------------+
                                     |
                                     v
+-------------------------------------------------------------------------+
|                Update Classifier & WUB Safe-Window Engine               |
|                                                                         |
|  1. Classify Every Update:                                              |
|     - Security / Cumulative KB (Patch Tuesday B-Release / OOB)          |
|     - Optional Preview KB (Non-Security C/D-Release)                    |
|                                                                         |
|  2. Evaluate WUB Window (If Status == BLOCKED):                         |
|     - Safe:     <= 14 days blocked AND 0 Security KBs missed            |
|     - Moderate: 15-30 days blocked OR 1 Security KB missed              |
|     - High:     > 30 days OR 2+ Security KBs OR Past Unblock Date       |
+-----------------+-------------------------------------+-----------------+
                  |                                     |
    [Security KB While Blocked]           [Optional Preview KB OR Unblocked]
    [OR Unblock Date Reached/Overdue]                   |
                  |                                     |
                  v                                     v
+-----------------------------------+ +-----------------------------------+
|      🚨 HIGH-PRIORITY ALERT       | |    ℹ️ STANDARD-PRIORITY ALERT     |
|  - Discord: @everyone + Red Card  | |  - Discord: Info Card (No Ping)   |
|  - Android: Urgent Security Alert | |  - Android: Standard Update Info  |
|  - Unblock Catch-Up KB Checklist  | |  - Marked "Safe to Skip in WUB"   |
+-----------------------------------+ +-----------------------------------+
```
