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
    builds = sorted(set(re.findall(r"\b(?:22000|22621|22631|26100|26200|28000)\.\d{3,5}\b", html)))
    versions = sorted(set(re.findall(r"\b2[1-9]H[12]\b", html)))
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


def send_discord_webhook(
    webhook_url: str,
    title: str,
    message: str,
    new_versions: list,
    new_kbs: list,
    new_builds: list,
) -> None:
    embed = {
        "title": title,
        "url": RELEASE_INFO_URL,
        "description": "Microsoft published new Windows 11 release packages on the official Release Health feed.",
        "color": 3718648,
        "fields": [
            {
                "name": "Feature Versions",
                "value": ", ".join(new_versions) if new_versions else "No new feature branch",
                "inline": True,
            },
            {
                "name": "New KB Packages",
                "value": ", ".join(new_kbs[-10:]) if new_kbs else "None",
                "inline": True,
            },
            {
                "name": "New OS Builds",
                "value": ", ".join(new_builds[-10:]) if new_builds else "None",
                "inline": False,
            },
        ],
        "footer": {"text": "Windows 11 Update Notifier • GitHub Actions & Android Suite"},
        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
    }
    payload = json.dumps({"content": message[:1900], "embeds": [embed]}).encode("utf-8")
    req = urllib.request.Request(
        webhook_url,
        data=payload,
        headers={"Content-Type": "application/json", "User-Agent": "Win11UpdateNotifier/1.0"},
        method="POST",
    )
    urllib.request.urlopen(req, timeout=15).read()


def send_telegram_alert(bot_token: str, chat_id: str, message: str) -> None:
    url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
    payload = json.dumps({"chat_id": chat_id, "text": message, "parse_mode": "Markdown"}).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=payload,
        headers={"Content-Type": "application/json", "User-Agent": "Win11UpdateNotifier/1.0"},
        method="POST",
    )
    urllib.request.urlopen(req, timeout=15).read()


def send_android_ntfy(topic: str, title: str, message: str) -> None:
    url = f"https://ntfy.sh/{topic.strip()}"
    req = urllib.request.Request(
        url,
        data=message.encode("utf-8"),
        headers={
            "Title": title,
            "Priority": "high",
            "Tags": "windows,bell",
            "Click": RELEASE_INFO_URL,
            "User-Agent": "Win11UpdateNotifier/1.0",
        },
        method="POST",
    )
    urllib.request.urlopen(req, timeout=15).read()


def write_github_output(key: str, value: str) -> None:
    env_file = os.environ.get("GITHUB_OUTPUT")
    if env_file:
        with open(env_file, "a", encoding="utf-8") as f:
            f.write(f"{key}={value}\n")


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
        alert_body = "\n".join(lines)

        os.makedirs(os.path.dirname(ALERT_FILE), exist_ok=True)
        with open(ALERT_FILE, "w", encoding="utf-8") as f:
            f.write(alert_body + "\n")

        webhook = os.environ.get("DISCORD_WEBHOOK_URL", "").strip()
        if webhook:
            send_discord_webhook(webhook, title, alert_body, new_versions, new_kbs, new_builds)

        tg_token = os.environ.get("TELEGRAM_BOT_TOKEN", "").strip()
        tg_chat = os.environ.get("TELEGRAM_CHAT_ID", "").strip()
        if tg_token and tg_chat:
            send_telegram_alert(tg_token, tg_chat, alert_body)

        ntfy_topic = os.environ.get("NTFY_TOPIC", "").strip()
        if ntfy_topic:
            send_android_ntfy(ntfy_topic, title, alert_body)

        save_state(current)
        write_github_output("new_update", "true")
        write_github_output("update_title", title)
        print(alert_body)
    else:
        print("No new Windows 11 updates detected since last check.")
        write_github_output("new_update", "false")


if __name__ == "__main__":
    main()
