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
        headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Win11UpdateNotifier/2.0"},
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        return resp.read().decode("utf-8", errors="ignore")


def builds_to_versions(builds: list) -> str:
    ver_parts = []
    if any(b.startswith("26300.") for b in builds):
        ver_parts.append("26H2")
    if any(b.startswith("26200.") for b in builds):
        ver_parts.append("25H2")
    if any(b.startswith("26100.") for b in builds):
        ver_parts.append("24H2")
    if any(b.startswith("28000.") for b in builds):
        ver_parts.append("26H1")
    if any(b.startswith("22631.") for b in builds):
        ver_parts.append("23H2")
    if any(b.startswith("22621.") for b in builds):
        ver_parts.append("22H2")
    if any(b.startswith("22000.") for b in builds):
        ver_parts.append("21H2")
    if not ver_parts:
        return "Windows 11"
    if len(ver_parts) == 1:
        return ver_parts[0]
    return ", ".join(ver_parts[:-1]) + " & " + ver_parts[-1]


def parse_updates(html: str) -> dict:
    kbs = sorted(set(re.findall(r"KB\d{7}", html)))
    builds = sorted(
        set(re.findall(r"\b(?:22000|22621|22631|26100|26200|26300|28000)\.\d{3,5}\b", html))
    )
    versions = sorted(set(re.findall(r"\b2[1-9]H[12]\b", html) + ["26H2", "26H1", "25H2", "24H2", "23H2"]))

    rows = re.findall(r"<tr[^>]*>(.*?)</tr>", html, flags=re.S | re.I)
    by_kb = {}

    for row_html in rows:
        cells = [
            re.sub(r"\s+", " ", re.sub(r"<[^>]+>", "", c)).strip()
            for c in re.findall(r"<td[^>]*>(.*?)</td>", row_html, flags=re.S | re.I)
        ]
        if len(cells) < 4:
            continue
        row_text = " | ".join(cells)
        kb_m = re.search(r"\b(KB\d{7})\b", row_text)
        date_m = re.search(r"\b(202\d-\d{2}-\d{2})\b", row_text)
        build_m = re.findall(
            r"\b((?:22000|22621|22631|26100|26200|26300|28000)\.\d{3,5})\b", row_text
        )
        if not (kb_m and date_m and build_m):
            continue

        kb = kb_m.group(1)
        rdate = date_m.group(1)
        # Microsoft uses "2026-11 B" (Patch Tuesday Security), "2026-10 D" / "C" (Optional Preview), "2026-10 OOB" (Out-of-Band)
        cadence_m = re.search(r"\b202\d[-.]\d{2}\s+(B|C|D|OOB)\b", row_text, flags=re.I)
        cadence = cadence_m.group(1).upper() if cadence_m else ("OOB" if "OOB" in row_text else "B")
        is_hotpatch = "hotpatch" in row_text.lower()

        if kb not in by_kb:
            by_kb[kb] = {
                "kb": kb,
                "releaseDate": rdate,
                "cadence": cadence,
                "isHotpatch": is_hotpatch,
                "builds": [],
            }
        for b in build_m:
            if b not in by_kb[kb]["builds"]:
                by_kb[kb]["builds"].append(b)

    security_kbs = []
    preview_kbs = []
    for kb in kbs:
        info = by_kb.get(kb)
        if info and info["cadence"] in ("C", "D"):
            preview_kbs.append(kb)
        else:
            security_kbs.append(kb)

    # Build structured recent_updates list (sorted newest first) with automatic superseding links
    sorted_records = sorted(
        by_kb.values(), key=lambda x: (x["releaseDate"], x["kb"]), reverse=True
    )
    recent_updates = []
    for rec in sorted_records[:45]:
        kb = rec["kb"]
        rdate = rec["releaseDate"]
        cadence = rec["cadence"]
        is_hotpatch = rec["isHotpatch"]
        rec_builds = rec["builds"]
        ver_str = builds_to_versions(rec_builds)
        build_str = " · ".join(rec_builds)

        if cadence in ("C", "D"):
            u_type = "Out-of-Band / Preview"
            channel_str = f"Optional Preview ({cadence}-Release)"
            title = f"Optional Non-Security Preview Update ({ver_str})"
            highlights = (
                f"Optional non-security preview update ({cadence}-Release) for Windows 11 {ver_str} "
                f"(OS Build {build_str}). Safe to skip while Windows Update Blocker (WUB) is active."
            )
        elif cadence == "OOB":
            u_type = "Security / Cumulative KB"
            channel_str = "Out-of-Band (OOB) Hotfix"
            title = f"Out-of-Band (OOB) Cumulative Hotfix Update ({ver_str})"
            highlights = (
                f"Out-of-band cumulative update for Windows 11 {ver_str} (OS Build {build_str}) "
                f"addressing urgent reliability or security issues."
            )
        elif is_hotpatch:
            u_type = "Security / Cumulative KB"
            channel_str = "Enterprise Hotpatch (B-Release)"
            title = f"Patch Tuesday Hotpatch Security Update ({ver_str})"
            highlights = (
                f"Monthly Patch Tuesday Hotpatch security update for Windows 11 {ver_str} "
                f"(OS Build {build_str})."
            )
        else:
            u_type = "Security / Cumulative KB"
            channel_str = "General Availability (Mandatory B-Release)"
            title = f"Patch Tuesday Mandatory Cumulative Security Update ({ver_str})"
            highlights = (
                f"Mandatory monthly Patch Tuesday security update for Windows 11 {ver_str} "
                f"(OS Build {build_str}). Includes cumulative security patches and prior preview fixes."
            )

        recent_updates.append(
            {
                "id": f"{kb}-{rec_builds[0]}",
                "kb": kb,
                "build": build_str,
                "version": ver_str,
                "type": u_type,
                "cadence": "Hotpatch" if is_hotpatch else cadence,
                "releaseDate": rdate,
                "title": title,
                "highlights": highlights,
                "servicingChannel": channel_str,
                "sourceUrl": f"https://support.microsoft.com/help/{kb.replace('KB', '')}",
            }
        )

    # Compute superseding & rollup relationships automatically across branches
    for item in recent_updates:
        item_prefixes = {b.split(".")[0] for b in item["build"].split(" · ") if "." in b}
        # Find newer mandatory B-release covering the same build branch
        for newer in recent_updates:
            if newer["releaseDate"] <= item["releaseDate"]:
                continue
            if newer["cadence"] != "B":
                continue
            newer_prefixes = {b.split(".")[0] for b in newer["build"].split(" · ") if "." in b}
            if item_prefixes & newer_prefixes:
                item["supersededBy"] = f"{newer['kb']} ({newer['releaseDate']} Patch Tuesday)"
                break

        # If this is a mandatory B-release, find the most recent prior C/D preview it rolls up
        if item["cadence"] == "B":
            for older in recent_updates:
                if older["releaseDate"] >= item["releaseDate"]:
                    continue
                if older["cadence"] in ("C", "D"):
                    older_prefixes = {
                        b.split(".")[0] for b in older["build"].split(" · ") if "." in b
                    }
                    if item_prefixes & older_prefixes:
                        item["includesPreviewKb"] = (
                            f"{older['kb']} (Released {older['releaseDate']})"
                        )
                        break

    return {
        "versions": versions,
        "kbs": kbs,
        "security_kbs": sorted(set(security_kbs)),
        "preview_kbs": sorted(set(preview_kbs)),
        "builds": builds,
        "recent_updates": recent_updates,
    }


def load_state() -> dict:
    if os.path.exists(STATE_FILE):
        with open(STATE_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return {
        "versions": [],
        "kbs": [],
        "security_kbs": [],
        "preview_kbs": [],
        "builds": [],
        "recent_updates": [],
    }


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
    embed_color = 15548997 if is_high_priority else 3718648
    priority_label = (
        "HIGH PRIORITY — Mandatory Security / Cumulative KB (Impacts WUB Risk Meter)"
        if is_high_priority
        else "STANDARD PRIORITY — Optional Preview Update (0 WUB Security Risk Impact)"
    )

    embed = {
        "title": title,
        "url": RELEASE_INFO_URL,
        "description": (
            f"**{priority_label}**\n"
            "Live-scraped from Microsoft's official Windows 11 Release Information tables."
        ),
        "color": embed_color,
        "fields": [
            {
                "name": "Security / Cumulative KBs",
                "value": ", ".join(new_security_kbs[-8:])
                if new_security_kbs
                else "None (0 Security Risk)",
                "inline": True,
            },
            {
                "name": "Optional Preview KBs (C/D)",
                "value": ", ".join(new_preview_kbs[-8:]) if new_preview_kbs else "None",
                "inline": True,
            },
            {
                "name": "OS Builds",
                "value": ", ".join(new_builds[-8:]) if new_builds else "None",
                "inline": False,
            },
        ],
        "footer": {"text": "Win11 Update Notifier • Live Microsoft Release Health Parser"},
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
        headers={"Content-Type": "application/json", "User-Agent": "Win11UpdateNotifier/2.0"},
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
            "Tags": "rotating_light,shield,windows"
            if is_high_priority
            else "windows,information_source",
            "Click": RELEASE_INFO_URL,
            "User-Agent": "Win11UpdateNotifier/2.0",
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

    is_first_run = not previous.get("kbs") and not previous.get("builds")
    has_new = bool(new_versions or new_kbs or new_builds)
    has_missing_structured = not previous.get("recent_updates")

    if has_new or has_missing_structured:
        is_high_priority = bool(new_security_kbs or new_versions or is_first_run)

        if is_first_run:
            title = f"Windows 11 Tracker Initialized ({len(current['kbs'])} KBs tracked)"
        elif new_security_kbs:
            title = f"Mandatory Security Update Detected: {', '.join(new_security_kbs[-3:])}"
        elif new_preview_kbs:
            title = f"Optional Preview Update Detected (Safe to Skip in WUB): {', '.join(new_preview_kbs[-3:])}"
        else:
            latest_rec = current["recent_updates"][0] if current["recent_updates"] else {"kb": "KB5132061"}
            title = f"Microsoft Release Health Synced (Latest: {latest_rec['kb']})"

        lines = [
            f"## {title}",
            "",
            f"- **Alert Priority:** `{'HIGH (Mandatory Security / Cumulative — Impacts WUB Risk)' if is_high_priority else 'STANDARD (Optional Preview — 0 WUB Risk Impact)'}`",
            f"- **Source:** [Microsoft Windows 11 Release Information]({RELEASE_INFO_URL})",
            f"- **Detected At (UTC):** `{datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}`",
            f"- **New Security / Cumulative KBs:** `{', '.join(new_security_kbs[-10:]) if new_security_kbs else 'None'}`",
            f"- **New Optional Preview KBs (C/D):** `{', '.join(new_preview_kbs[-10:]) if new_preview_kbs else 'None'}`",
            f"- **New OS Builds:** `{', '.join(new_builds[-10:]) if new_builds else 'None'}`",
        ]
        alert_body = "\n".join(lines)

        os.makedirs(os.path.dirname(ALERT_FILE), exist_ok=True)
        with open(ALERT_FILE, "w", encoding="utf-8") as f:
            f.write(alert_body + "\n")

        if has_new:
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

            ntfy_topic = os.environ.get("NTFY_TOPIC", "").strip()
            if ntfy_topic:
                send_android_ntfy(ntfy_topic, title, alert_body, is_high_priority)

        save_state(current)
        write_github_output("new_update", "true" if has_new else "false")
        write_github_output("update_title", title)
        print(alert_body)
    else:
        print("No new Windows 11 updates detected since last check.")
        write_github_output("new_update", "false")


if __name__ == "__main__":
    main()
