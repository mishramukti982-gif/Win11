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

    # Classify KBs by inspecting surrounding table row HTML for Preview/Optional vs Security/Cumulative
    security_kbs = []
    preview_kbs = []
    rows = re.findall(r"<tr[^>]*>([\s\S]*?)</tr>", html, flags=re.IGNORECASE)
    kb_classification = {}
    for row in rows:
        row_kbs = re.findall(r"KB\d{7}", row)
        if not row_kbs:
            continue
        is_preview = bool(re.search(r"preview|optional|non-security|c-release|d-release", row, flags=re.IGNORECASE))
        for kb in row_kbs:
            if kb not in kb_classification:
                kb_classification[kb] = "preview" if is_preview else "security"

    for kb in kbs:
        if kb_classification.get(kb) == "preview":
            preview_kbs.append(kb)
        else:
            security_kbs.append(kb)

    return {
        "versions": versions,
        "kbs": kbs,
        "security_kbs": sorted(set(security_kbs)),
        "preview_kbs": sorted(set(preview_kbs)),
        "builds": builds,
    }


def load_state() -> dict:
    if os.path.exists(STATE_FILE):
        with open(STATE_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return {"versions": [], "kbs": [], "security_kbs": [], "preview_kbs": [], "builds": []}


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
    new_security_kbs: list,
    new_preview_kbs: list,
    new_builds: list,
    is_high_priority: bool,
) -> None:
    # High Priority (Security / Cumulative KB or Feature Release): Red/Urgent color + @everyone ping
    # Standard Priority (Optional Preview C/D-Release only): Sky Blue color + informational alert
    embed_color = 15548997 if is_high_priority else 3718648
    priority_label = (
        "HIGH PRIORITY — Security / Cumulative KB (Impacts WUB Risk Meter)"
        if is_high_priority
        else "STANDARD PRIORITY — Optional Preview Update (0 WUB Security Risk Impact)"
    )

    embed = {
        "title": title,
        "url": RELEASE_INFO_URL,
        "description": (
            f"**{priority_label}**\n"
            "Microsoft published new Windows 11 packages on the official Release Health feed."
        ),
        "color": embed_color,
        "fields": [
            {
                "name": "Security / Cumulative KBs",
                "value": ", ".join(new_security_kbs[-8:]) if new_security_kbs else "None (0 Security Risk)",
                "inline": True,
            },
            {
                "name": "Optional Preview KBs",
                "value": ", ".join(new_preview_kbs[-8:]) if new_preview_kbs else "None",
                "inline": True,
            },
            {
                "name": "Feature Versions & OS Builds",
                "value": (
                    f"Versions: {', '.join(new_versions) if new_versions else 'Existing'} | "
                    f"Builds: {', '.join(new_builds[-6:]) if new_builds else 'None'}"
                ),
                "inline": False,
            },
        ],
        "footer": {"text": "Win11 Update Notifier • WUB Safe-Window & Vulnerability Guard"},
        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
    }

    if is_high_priority:
        ping_content = f"@everyone 🚨 **[HIGH PRIORITY SECURITY ALERT] {title}**\n\n{message}"[:1900]
        allowed_mentions = {"parse": ["everyone", "roles", "users"]}
    else:
        ping_content = f"ℹ️ **[OPTIONAL PREVIEW UPDATE — SAFE TO SKIP IN WUB] {title}**\n\n{message}"[:1900]
        allowed_mentions = {"parse": []}

    payload = json.dumps(
        {
            "content": ping_content,
            "allowed_mentions": allowed_mentions,
            "embeds": [embed],
        }
    ).encode("utf-8")
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


def send_android_ntfy(topic: str, title: str, message: str, is_high_priority: bool) -> None:
    url = f"https://ntfy.sh/{topic.strip()}"
    req = urllib.request.Request(
        url,
        data=message.encode("utf-8"),
        headers={
            "Title": title,
            "Priority": "urgent" if is_high_priority else "default",
            "Tags": "rotating_light,shield,windows" if is_high_priority else "windows,information_source",
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

    prev_kbs = set(previous.get("kbs", []))
    new_versions = [v for v in current["versions"] if v not in previous.get("versions", [])]
    new_kbs = [k for k in current["kbs"] if k not in prev_kbs]
    new_security_kbs = [k for k in current.get("security_kbs", []) if k in new_kbs]
    new_preview_kbs = [k for k in current.get("preview_kbs", []) if k in new_kbs]
    new_builds = [b for b in current["builds"] if b not in previous.get("builds", [])]

    # Trigger on first run or whenever ANY new feature version, Security KB, Preview KB, or build appears
    is_first_run = not previous.get("kbs") and not previous.get("builds")
    has_new = bool(new_versions or new_kbs or new_builds)

    if has_new:
        # High priority only if a Security/Cumulative KB or Major Feature Version dropped
        is_high_priority = bool(new_security_kbs or new_versions or is_first_run)

        if is_first_run:
            title = f"Windows 11 Tracker Initialized ({len(current['kbs'])} KBs tracked)"
        elif is_high_priority:
            latest_sec = new_security_kbs[-1] if new_security_kbs else (new_kbs[-1] if new_kbs else "New Build")
            title = f"Security / Cumulative Update Detected: {latest_sec}"
        else:
            latest_prev = new_preview_kbs[-1] if new_preview_kbs else (new_kbs[-1] if new_kbs else "Preview Build")
            title = f"Optional Preview Update Detected (Safe to Skip in WUB): {latest_prev}"

        lines = [
            f"## {title}",
            "",
            f"- **Alert Priority:** `{'HIGH (Security / Cumulative — Impacts WUB Risk)' if is_high_priority else 'STANDARD (Optional Preview — 0 WUB Risk Impact)'}`",
            f"- **Source:** [Microsoft Windows 11 Release Information]({RELEASE_INFO_URL})",
            f"- **Detected At (UTC):** `{datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}`",
            f"- **New Security / Cumulative KBs:** `{', '.join(new_security_kbs[-10:]) if new_security_kbs else 'None'}`",
            f"- **New Optional Preview KBs:** `{', '.join(new_preview_kbs[-10:]) if new_preview_kbs else 'None'}`",
            f"- **New Feature Versions:** `{', '.join(new_versions) if new_versions else 'None'}`",
            f"- **New OS Builds:** `{', '.join(new_builds[-10:]) if new_builds else 'None'}`",
        ]
        alert_body = "\n".join(lines)

        os.makedirs(os.path.dirname(ALERT_FILE), exist_ok=True)
        with open(ALERT_FILE, "w", encoding="utf-8") as f:
            f.write(alert_body + "\n")

        webhook = os.environ.get("DISCORD_WEBHOOK_URL", "").strip()
        if webhook:
            send_discord_webhook(
                webhook,
                title,
                alert_body,
                new_versions,
                new_security_kbs,
                new_preview_kbs,
                new_builds,
                is_high_priority,
            )

        tg_token = os.environ.get("TELEGRAM_BOT_TOKEN", "").strip()
        tg_chat = os.environ.get("TELEGRAM_CHAT_ID", "").strip()
        if tg_token and tg_chat:
            send_telegram_alert(tg_token, tg_chat, alert_body)

        ntfy_topic = os.environ.get("NTFY_TOPIC", "").strip()
        if ntfy_topic:
            send_android_ntfy(ntfy_topic, title, alert_body, is_high_priority)

        save_state(current)
        write_github_output("new_update", "true")
        write_github_output("update_title", title)
        print(alert_body)
    else:
        print("No new Windows 11 updates detected since last check.")
        write_github_output("new_update", "false")


if __name__ == "__main__":
    main()
