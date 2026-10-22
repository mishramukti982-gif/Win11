# Windows 11 Update Notifier — Auto Date-Range Notifications & APK Direct Discord Fix

Updates the **02. Updates Since Date** explorer and standalone Android APK so that selecting any start date (e.g., `14/10` → `Now` or `16/07/2026` → `Now`) or tapping a timeframe preset **immediately** fires a native Android status-bar notification and sends a **single combined `@everyone` Discord summary card** containing all updates in that date range.

## User Review & Critical Decisions

> [!IMPORTANT]
> Confirmed from your answers: Changing the start date (or tapping **"Send All to Discord & Android"**) will automatically trigger both the native Android notification and a combined `@everyone` Discord embed directly from the APK without requiring a proxy server.

- **Confirmed Decision 1 — Auto-Notify Immediately on Date Selection**: Whenever you pick a new date or tap a preset (*Last 30 Days*, *Last 90 Days*, *Since Jan 2026*, *All Since 2025*) in Section 02, the app immediately:
  1. Fires a native Android system notification (`AndroidBridge.showNotification`) summarizing the updates found between that date and today.
  2. Dispatches a combined `@everyone` Discord Webhook alert (if your Discord Webhook URL is saved) directly from the app.
- **Confirmed Decision 2 — Combined `@everyone` Summary Card + Direct APK Fix**:
  - Fixes the `"Network Error: Failed to reach Discord proxy endpoint"` inside the Android APK by posting the combined `@everyone` embed directly to your Discord Webhook URL when running standalone on Android.
  - Formats all updates in the chosen range into **one clean, combined `@everyone` summary embed** listing each date, Windows 11 version, KB number, OS build, and title.

---

## 1. Technical Flow for Date-Range Auto-Notification

```text
┌─────────────────────────────────────────────────────────────────────────┐
│            USER CHANGES START DATE (e.g. 2026-07-16 → Now)              │
└───────────────────────────────────┬─────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│        COMPUTE MATCHING UPDATES & BUILD COMBINED SUMMARY CARD           │
│  • Counts total Major Feature, Security KB, and Preview updates         │
│  • Formats bulleted list: Date · Version · KB · Build · Title           │
└───────────────┬─────────────────────────────────────────┬───────────────┘
                │                                         │
                ▼                                         ▼
┌───────────────────────────────────┐   ┌─────────────────────────────────┐
│     NATIVE ANDROID NOTIFICATION   │   │   COMBINED DISCORD @everyone    │
│  • Calls AndroidBridge.showNotif  │   │  • Sends @everyone + Embed      │
│  • Shows in Android Status Bar    │   │  • Direct fetch fallback in APK │
└───────────────────────────────────┘   └─────────────────────────────────┘
```
