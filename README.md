# Win11 — Windows 11 Update Notifier (Android App & Discord Suite)

An automated **Windows 11 Release Health Tracker**, **Native Android App (`.apk` + PWA)**, and **Discord / GitHub Actions Notifier** monitoring Microsoft's official [Windows 11 Release Information](https://learn.microsoft.com/en-us/windows/release-health/windows11-release-information) page for major feature releases (`26H2`, `26H1`, `24H2`) and monthly cumulative security/preview KBs (`KB5129195`, `KB5127646`, etc.).

---

## 📱 Download the Android App (`.apk`) from GitHub Releases

Once you push this project to your **`Win11`** GitHub repository, the **`Build & Publish Android APK to GitHub Releases`** workflow (`.github/workflows/android-apk-release.yml`) automatically compiles and attaches the installable Android app to your repository's **Releases** section:

1. Open your **`Win11`** repository on GitHub.
2. Click **Releases** (on the right sidebar of your repo, or visit `https://github.com/<your-username>/Win11/releases/latest`).
3. Download **`Win11-Update-Notifier-Android.apk`** directly to your Android phone and tap to install!

---

## 🚀 How to Deploy to Your `Win11` GitHub Repository from Google AI Studio

1. In Google AI Studio Build mode, click **Settings (gear icon) → GitHub**.
2. Authorize your GitHub account, choose **Create a new GitHub repository**, name it **`Win11`**, and click **Create & Sync** (or push to your existing `Win11` repository).
3. On GitHub, open your **`Win11`** repository and go to **Settings → Actions → General → Workflow permissions**:
   - Select **Read and write permissions** and click **Save** (required so GitHub Actions can publish the `.apk` to **Releases**, open alert **Issues**, and update `state/last_seen.json`).
4. *(Optional)* Go to **Settings → Secrets and variables → Actions** and add:
   - `DISCORD_WEBHOOK_URL`: Your Discord channel Webhook URL for automatic rich embed notifications.
   - `NTFY_TOPIC`: Your custom `ntfy.sh` topic name for instant Android lock-screen push notifications.
