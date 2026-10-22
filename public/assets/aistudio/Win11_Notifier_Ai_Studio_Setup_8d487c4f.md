# Windows 11 Update Notifier — Google AI Studio & GitHub Setup Guide

This guide walks you through creating your GitHub repository first, connecting it to [Google AI Studio Build mode](https://ai.google.dev/gemini-api/docs/aistudio-build-mode) via [GitHub Sync](https://aistudio.google.com/learn/sync-your-ai-studio-apps-with-github), generating the full notifier app and [GitHub Actions](https://github.com/features/actions) workflow, and pushing it so workflows run automatically with zero ongoing AI token cost.

## 1. Create the GitHub Repository First

You can create the repository either on GitHub first (recommended so you can enable Action permissions right away) or directly inside Google AI Studio:

| Method | Step-by-Step Instructions |
| :--- | :--- |
| **Method A: Create on GitHub first (Recommended)** | 1. Go to [GitHub New Repository](https://github.com/new) and name your repository `win11-update-notifier`.<br>2. Set visibility to **Public** (gives you unlimited free [GitHub Actions](https://github.com/features/actions) minutes) and check **Add a README file**.<br>3. Click **Create repository**.<br>4. Inside your new repo, go to **Settings → Actions → General**, scroll to **Workflow permissions**, select **Read and write permissions**, and check **Allow GitHub Actions to create and approve pull requests** (this lets the workflow commit state updates and open alert Issues). Click **Save**.<br>5. Open [Google AI Studio Build mode](https://ai.google.dev/gemini-api/docs/aistudio-build-mode), click **`+` (Add files) → Import from GitHub**, and paste your new repository URL. |
| **Method B: Create inside Google AI Studio** | 1. Open [Google AI Studio Build mode](https://ai.google.dev/gemini-api/docs/aistudio-build-mode) and run the prompt in Section 2 below to generate the app.<br>2. Click **Settings** (gear icon) in your AI Studio project and open the **GitHub** tab ([GitHub Sync](https://aistudio.google.com/learn/sync-your-ai-studio-apps-with-github)).<br>3. Authorize your GitHub account, select **Create a new GitHub repository**, name it `win11-update-notifier`, and click **Create & Sync**.<br>4. Open the created repo on GitHub and enable **Read and write permissions** under **Settings → Actions → General → Workflow permissions**. |

## 2. Copy-Paste Prompt for Google AI Studio (Build Mode)

Paste the following prompt directly into the prompt box in [Google AI Studio Build mode](https://ai.google.dev/gemini-api/docs/aistudio-build-mode):

```text
Build a complete "Windows 11 Update Notifier" project ready for GitHub Sync and GitHub Actions automation. Include both an interactive web dashboard and automated GitHub Actions background monitoring files in the repository:

1. Interactive Web Dashboard (React + Tailwind):
   - Display a live Windows 11 Update Tracker covering both major feature updates (such as Windows 11 26H2, 26H1, and 24H2) and smaller monthly cumulative/security/preview KB updates (such as KB5127646 and KB5129195) sourced from Microsoft's Windows Release Health page (https://learn.microsoft.com/en-us/windows/release-health/windows11-release-information).
   - Provide filters for Update Type ("All", "Major Feature Updates", "Security / Cumulative KB", "Out-of-Band / Preview") and Channel ("26H2", "26H1", "24H2").
   - Include a "Test Browser Notification" button using the Web Notifications API (with an in-app toast fallback) and a "Configure Webhook / GitHub Action" settings panel.

2. GitHub Actions Automation Files (must be generated in the project file tree so they push to GitHub):
   - `state/last_seen.json`: JSON file storing the latest seen Windows 11 KB identifiers and OS build numbers.
   - `scripts/check_win11_updates.py`: A standalone Python 3 script (using only standard library modules `urllib.request`, `re`, `json`, `os`, `datetime`) that fetches https://learn.microsoft.com/en-us/windows/release-health/windows11-release-information, extracts all Windows 11 version tables, KB numbers (e.g., KB5127646), OS builds (e.g., 26200.9711, 28000.3231), and release dates, compares them against `state/last_seen.json`, and when a new big or small update is detected:
     a) Writes the new update details to `state/latest_alert.md` and updates `state/last_seen.json`.
     b) Sends an optional webhook alert if `DISCORD_WEBHOOK_URL` or `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID` environment variables are set.
     c) Outputs `new_update=true` and `update_title=...` to `$GITHUB_OUTPUT`.
   - `.github/workflows/win11-update-notifier.yml`: A GitHub Actions workflow triggered `on: push`, `workflow_dispatch`, and `schedule` (every 6 hours via `cron: '0 */6 * * *'`) with `permissions: contents: write, issues: write` that runs `python3 scripts/check_win11_updates.py`, opens a new GitHub Issue with the contents of `state/latest_alert.md` (which automatically emails the repo owner), and commits/pushes the updated `state/last_seen.json` back to the repository.
```

## 3. Reference Files for Your Repository

If you want to inspect, edit, or manually add the automation scripts inside AI Studio's **Code** tab before pushing, use these exact files:

### File 1: `scripts/check_win11_updates.py`

```python
#!/usr/bin/env python3
import datetime
import json
import os
import re
import urllib.request

RELEASE_INFO_URL = "https://learn.microsoft.com/en-us/windows/release-health/windows11-release-information"
STATE_FILE = "state/last_seen.json"
ALERT_FILE = "state/latest_alert.md"


def fetch_html(url: str) -> str:
    req = urllib.request.Request(
        url,
        headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Win11UpdateNotifier/1.0"},
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        return resp.read().decode("utf-8", errors="ignore")


def parse_updates(html: str) -> dict:
    # Extract KB numbers (e.g. KB5127646) and OS Builds (e.g. 26200.9711, 28000.3231)
    kbs = sorted(set(re.findall(r"KB\d{7}", html)))
    builds = sorted(set(re.findall(r"(?:22000|22621|22631|26100|26200|28000)\.\d{3,5}", html)))
    versions = sorted(set(re.findall(r"2[1-9]H[12]", html)))
    return {
        "versions": versions,
        "kbs": kbs,
        "builds": builds,
    }


def load_state() -> dict:
    if os.path.exists(STATE_FILE):
        with open(STATE_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return {"versions": [], "kbs": [], "builds": []}


def save_state(state: dict) -> None:
    os.makedirs(os.path.dirname(STATE_FILE), exist_ok=True)
    state["last_checked_utc"] = datetime.datetime.now(datetime.timezone.utc).isoformat()
    with open(STATE_FILE, "w", encoding="utf-8") as f:
        json.dump(state, f, indent=2)


def send_discord_webhook(webhook_url: str, message: str) -> None:
    payload = json.dumps({"content": message[:1900]}).encode("utf-8")
    req = urllib.request.Request(
        webhook_url,
        data=payload,
        headers={"Content-Type": "application/json", "User-Agent": "Win11UpdateNotifier/1.0"},
        method="POST",
    )
    urllib.request.urlopen(req, timeout=15).read()


def write_github_output(key: str, value: str) -> None:
    env_file = os.environ.get("GITHUB_OUTPUT")
    if env_file:
        with open(env_file, "a", encoding="utf-8") as f:
            f.write(f"{key}={value}
")


def main() -> None:
    html = fetch_html(RELEASE_INFO_URL)
    current = parse_updates(html)
    previous = load_state()

    new_versions = [v for v in current["versions"] if v not in previous.get("versions", [])]
    new_kbs = [k for k in current["kbs"] if k not in previous.get("kbs", [])]
    new_builds = [b for b in current["builds"] if b not in previous.get("builds", [])]

    # Trigger on first run or whenever any new feature version, KB, or build appears
    is_first_run = not previous.get("kbs") and not previous.get("builds")
    has_new = bool(new_versions or new_kbs or new_builds)

    if has_new:
        kind = "Major Feature Update" if new_versions else "Cumulative / Minor Update"
        if is_first_run:
            title = f"Windows 11 Tracker Initialized ({len(current['kbs'])} KBs tracked)"
        else:
            latest_kb = new_kbs[-1] if new_kbs else "New Build"
            title = f"New Windows 11 {kind} Detected: {latest_kb}"

        lines = [
            f"## {title}",
            "",
            f"- **Source:** [Microsoft Windows 11 Release Information]({RELEASE_INFO_URL})",
            f"- **Detected At (UTC):** `{datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}`",
            f"- **New Feature Versions (Big Updates):** `{', '.join(new_versions) if new_versions else 'None'}`",
            f"- **New KB Packages (Big/Small Updates):** `{', '.join(new_kbs[-10:]) if new_kbs else 'None'}`",
            f"- **New OS Builds:** `{', '.join(new_builds[-10:]) if new_builds else 'None'}`",
        ]
        alert_body = "
".join(lines)

        os.makedirs(os.path.dirname(ALERT_FILE), exist_ok=True)
        with open(ALERT_FILE, "w", encoding="utf-8") as f:
            f.write(alert_body + "
")

        webhook = os.environ.get("DISCORD_WEBHOOK_URL", "").strip()
        if webhook:
            send_discord_webhook(webhook, alert_body)

        save_state(current)
        write_github_output("new_update", "true")
        write_github_output("update_title", title)
        print(alert_body)
    else:
        print("No new Windows 11 updates detected since last check.")
        write_github_output("new_update", "false")


if __name__ == "__main__":
    main()
```

### File 2: `.github/workflows/win11-update-notifier.yml`

```yaml
name: Windows 11 Update Notifier

on:
  push:
    branches: [ main, master ]
  workflow_dispatch:
  schedule:
    - cron: '0 */6 * * *'

permissions:
  contents: write
  issues: write

jobs:
  check-updates:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.12'

      - name: Check Microsoft Windows 11 Release Health
        id: check
        env:
          DISCORD_WEBHOOK_URL: ${{ secrets.DISCORD_WEBHOOK_URL }}
        run: python3 scripts/check_win11_updates.py

      - name: Create GitHub Issue Notification on New Update
        if: steps.check.outputs.new_update == 'true'
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          ISSUE_TITLE: ${{ steps.check.outputs.update_title }}
        run: |
          gh issue create             --title "$ISSUE_TITLE"             --body-file state/latest_alert.md

      - name: Commit and Push Updated State
        if: steps.check.outputs.new_update == 'true'
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
          git add state/last_seen.json state/latest_alert.md
          git diff --staged --quiet || git commit -m "chore: update Windows 11 release state"
          git push
```

## 4. Commit, Push, and Run Workflows from AI Studio

1. **Commit and push from AI Studio:** Once AI Studio generates the files, open **Settings → GitHub** in [Google AI Studio Build mode](https://ai.google.dev/gemini-api/docs/aistudio-build-mode) and click **Push to GitHub** (AI Studio will automatically generate the commit message and push the branch).
2. **Verify the automatic workflow run:** Because the workflow includes `on: push`, pushing from AI Studio immediately triggers the first [GitHub Actions](https://github.com/features/actions) run on your repository.
3. **Check your notification:** Open your repository's **Actions** and **Issues** tabs on GitHub—the first run initializes `state/last_seen.json`, commits it back to your repo, and opens a confirmation Issue that sends an email alert to your linked address (`mishramukti982@gmail.com`).
