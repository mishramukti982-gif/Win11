/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Bell,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Copy,
  Download,
  ExternalLink,
  Lock,
  RefreshCw,
  RotateCcw,
  Send,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Unlock,
  Webhook,
  X,
} from 'lucide-react';
import { useOnlineStatus } from './usePWAInstall';

export interface Win11UpdateItem {
  id: string;
  kb: string;
  build: string;
  version: '26H2' | '26H1' | '24H2' | '23H2' | '22H2';
  type: 'Major Feature Updates' | 'Security / Cumulative KB' | 'Out-of-Band / Preview';
  releaseDate: string;
  title: string;
  highlights: string;
  servicingChannel: string;
  sourceUrl: string;
  isNew?: boolean;
}

const FALLBACK_UPDATES: Win11UpdateItem[] = [
  {
    id: 'KB5129195-28000.3231',
    kb: 'KB5129195',
    build: '28000.3231',
    version: '26H2',
    type: 'Major Feature Updates',
    releaseDate: '2026-10-14',
    title: 'Windows 11 26H2 October Cumulative Security Update',
    highlights:
      'Cumulative security rollup for Windows 11 26H2 with kernel security patches and stability fixes.',
    servicingChannel: 'Security / Cumulative (B-Release)',
    sourceUrl: 'https://learn.microsoft.com/en-us/windows/release-health/windows11-release-information',
    isNew: true,
  },
  {
    id: 'KB5127646-26200.9711',
    kb: 'KB5127646',
    build: '26200.9711',
    version: '26H1',
    type: 'Security / Cumulative KB',
    releaseDate: '2026-10-08',
    title: 'October Patch Tuesday Security Update for Windows 11 26H1',
    highlights:
      'Fixes 43 security vulnerabilities across Windows Hyper-V, Defender SmartScreen, and DirectX 12.',
    servicingChannel: 'Security / Cumulative (B-Release)',
    sourceUrl: 'https://learn.microsoft.com/en-us/windows/release-health/windows11-release-information',
    isNew: true,
  },
  {
    id: 'KB5128402-28000.3188',
    kb: 'KB5128402',
    build: '28000.3188',
    version: '26H2',
    type: 'Out-of-Band / Preview',
    releaseDate: '2026-09-29',
    title: 'Optional Preview Update (Non-Security) for Windows 11 26H2',
    highlights:
      'Optional display wake fix. Contains no security patches — completely safe to skip while WUB is on.',
    servicingChannel: 'Optional Preview',
    sourceUrl: 'https://learn.microsoft.com/en-us/windows/release-health/windows11-release-information',
    isNew: false,
  },
  {
    id: 'KB5126810-26200.9610',
    kb: 'KB5126810',
    build: '26200.9610',
    version: '26H1',
    type: 'Major Feature Updates',
    releaseDate: '2026-09-10',
    title: 'September Cumulative Security Update for Windows 11 26H1',
    highlights:
      'Monthly security baseline and File Explorer performance improvements.',
    servicingChannel: 'Security / Cumulative (B-Release)',
    sourceUrl: 'https://learn.microsoft.com/en-us/windows/release-health/windows11-release-information',
    isNew: false,
  },
  {
    id: 'KB5051987-26100.3194',
    kb: 'KB5051987',
    build: '26100.3194',
    version: '24H2',
    type: 'Security / Cumulative KB',
    releaseDate: '2026-09-08',
    title: 'September Cumulative Security Update for Windows 11 24H2',
    highlights:
      'Includes servicing stack security updates (SSU) and networking vulnerability fixes.',
    servicingChannel: 'Security / Cumulative (B-Release)',
    sourceUrl: 'https://learn.microsoft.com/en-us/windows/release-health/windows11-release-information',
    isNew: false,
  },
  {
    id: 'KB5050094-26100.3037',
    kb: 'KB5050094',
    build: '26100.3037',
    version: '24H2',
    type: 'Out-of-Band / Preview',
    releaseDate: '2026-08-27',
    title: 'Optional Preview Update for Windows 11 24H2',
    highlights:
      'Non-security preview fixing Bluetooth audio stutter. Safe to skip while WUB is active.',
    servicingChannel: 'Optional Preview',
    sourceUrl: 'https://learn.microsoft.com/en-us/windows/release-health/windows11-release-information',
    isNew: false,
  },
  {
    id: 'KB5050009-26100.2894',
    kb: 'KB5050009',
    build: '26100.2894',
    version: '24H2',
    type: 'Security / Cumulative KB',
    releaseDate: '2026-08-12',
    title: 'August Patch Tuesday Security Update for Windows 11 24H2',
    highlights:
      'Critical kernel-mode driver security patches and Secure Boot revocation list update.',
    servicingChannel: 'Security / Cumulative (B-Release)',
    sourceUrl: 'https://learn.microsoft.com/en-us/windows/release-health/windows11-release-information',
    isNew: false,
  },
  {
    id: 'KB5048667-22631.4602',
    kb: 'KB5048667',
    build: '22631.4602',
    version: '23H2',
    type: 'Security / Cumulative KB',
    releaseDate: '2026-07-14',
    title: 'July Cumulative Security Update for Windows 11 23H2',
    highlights:
      'Cumulative security rollup for systems running Windows 11 23H2 (Build 22631).',
    servicingChannel: 'Security / Cumulative (B-Release)',
    sourceUrl: 'https://learn.microsoft.com/en-us/windows/release-health/windows11-release-information',
    isNew: false,
  },
];

type RiskLevel = 'SAFE' | 'MODERATE' | 'HIGH';

function isSecurityOrCumulativeUpdate(item: Win11UpdateItem): boolean {
  if (item.type === 'Out-of-Band / Preview') return false;
  const lower = item.title.toLowerCase();
  if (lower.includes('preview') || lower.includes('non-security')) return false;
  return true;
}

function addDaysToIso(baseIso: string, daysToAdd: number): string {
  const d = new Date(`${baseIso}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) {
    const fallback = new Date();
    fallback.setDate(fallback.getDate() + daysToAdd);
    return fallback.toISOString().slice(0, 10);
  }
  d.setUTCDate(d.getUTCDate() + daysToAdd);
  return d.toISOString().slice(0, 10);
}

function diffDaysBetweenIso(startIso: string, endIso: string): number {
  const start = new Date(`${startIso}T00:00:00Z`).getTime();
  const end = new Date(`${endIso}T00:00:00Z`).getTime();
  if (Number.isNaN(start) || Number.isNaN(end)) return 0;
  return Math.round((end - start) / (1000 * 60 * 60 * 24));
}

export default function App() {
  const isOnline = useOnlineStatus();
  const todayIso = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const [updates, setUpdates] = useState<Win11UpdateItem[]>(FALLBACK_UPDATES);
  const [checkingNow, setCheckingNow] = useState<boolean>(false);
  const [sendingAlert, setSendingAlert] = useState<boolean>(false);
  const [showAllHistory, setShowAllHistory] = useState<boolean>(false);
  const [showAdvancedSetup, setShowAdvancedSetup] = useState<boolean>(false);

  // WUB (Windows Update Blocker) State
  const [wubIsBlocked, setWubIsBlocked] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('win11_wub_is_blocked');
      return saved === null ? true : saved === 'true';
    } catch {
      return true;
    }
  });

  const [wubStartDate, setWubStartDate] = useState<string>(() => {
    try {
      return localStorage.getItem('win11_wub_start_date') || '2026-10-14';
    } catch {
      return '2026-10-14';
    }
  });

  const [wubPlannedUnblockDate, setWubPlannedUnblockDate] = useState<string>(() => {
    try {
      return localStorage.getItem('win11_wub_unblock_date') || addDaysToIso(new Date().toISOString().slice(0, 10), 6);
    } catch {
      return addDaysToIso(new Date().toISOString().slice(0, 10), 6);
    }
  });

  // Discord Webhook URL (saved in localStorage)
  const [discordWebhookUrl, setDiscordWebhookUrl] = useState<string>(() => {
    try {
      return localStorage.getItem('win11_discord_webhook') || '';
    } catch {
      return '';
    }
  });

  const [checkedKbs, setCheckedKbs] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState<{
    title: string;
    message: string;
    kind: 'info' | 'success' | 'warning';
  } | null>(null);

  const showToast = (
    title: string,
    message: string,
    kind: 'info' | 'success' | 'warning' = 'info'
  ) => {
    setToast({ title, message, kind });
  };

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 6000);
    return () => clearTimeout(timer);
  }, [toast]);

  // Fetch live updates from server when available
  const fetchUpdates = async () => {
    try {
      const resp = await fetch('/api/updates');
      if (resp.ok) {
        const data = await resp.json();
        if (Array.isArray(data.updates) && data.updates.length > 0) {
          setUpdates(data.updates);
        }
      }
    } catch {
      // Offline or standalone Android APK mode uses FALLBACK_UPDATES
    }
  };

  useEffect(() => {
    fetchUpdates();
  }, []);

  const saveDiscordUrl = (val: string) => {
    setDiscordWebhookUrl(val);
    try {
      localStorage.setItem('win11_discord_webhook', val.trim());
    } catch {
      // ignore
    }
  };

  const saveWubBlocked = (blocked: boolean) => {
    setWubIsBlocked(blocked);
    try {
      localStorage.setItem('win11_wub_is_blocked', String(blocked));
    } catch {
      // ignore
    }
  };

  const saveWubStart = (dateIso: string) => {
    setWubStartDate(dateIso);
    try {
      localStorage.setItem('win11_wub_start_date', dateIso);
    } catch {
      // ignore
    }
  };

  const saveWubUnblock = (dateIso: string) => {
    setWubPlannedUnblockDate(dateIso);
    try {
      localStorage.setItem('win11_wub_unblock_date', dateIso);
    } catch {
      // ignore
    }
  };

  // ============================================================================
  // Simplified Risk Meter Calculation:
  // - SAFE:     <= 14 days blocked AND 0 Security KBs missed (or when Unblocked)
  // - MODERATE: 15-30 days blocked OR 1 Security KB missed
  // - HIGH:     > 30 days blocked OR 2+ Security KBs missed OR past Planned Unblock Date
  // ============================================================================
  const wubMetrics = useMemo(() => {
    const updatesInRange = updates
      .filter((u) => u.releaseDate >= wubStartDate)
      .sort((a, b) => b.releaseDate.localeCompare(a.releaseDate));

    const securityUpdates = updatesInRange.filter((u) => isSecurityOrCumulativeUpdate(u));
    const previewUpdates = updatesInRange.filter((u) => !isSecurityOrCumulativeUpdate(u));

    if (!wubIsBlocked) {
      return {
        daysBlocked: 0,
        daysLeft: diffDaysBetweenIso(todayIso, wubPlannedUnblockDate),
        isOverdue: false,
        securityUpdates: [] as Win11UpdateItem[],
        previewUpdates,
        allInRange: updatesInRange,
        riskLevel: 'SAFE' as RiskLevel,
        riskReason: 'Unblocked (0 days blocked · 0 Security KBs missed)',
      };
    }

    const daysBlocked = Math.max(0, diffDaysBetweenIso(wubStartDate, todayIso));
    const daysLeft = diffDaysBetweenIso(todayIso, wubPlannedUnblockDate);
    const isOverdue = daysLeft <= 0;
    const missedCount = securityUpdates.length;

    let riskLevel: RiskLevel = 'SAFE';
    let riskReason = `${daysBlocked} days blocked (≤14d safe window) and 0 Security KBs missed`;

    if (daysBlocked > 30 || missedCount >= 2 || isOverdue) {
      riskLevel = 'HIGH';
      const parts: string[] = [];
      if (missedCount >= 2) parts.push(`${missedCount} Security KBs missed`);
      if (daysBlocked > 30) parts.push(`${daysBlocked} days blocked (>30d)`);
      if (isOverdue) {
        parts.push(
          daysLeft === 0
            ? 'Unblock date reached today'
            : `Overdue by ${Math.abs(daysLeft)} days`
        );
      }
      riskReason = parts.join(' · ');
    } else if (daysBlocked >= 15 || missedCount === 1) {
      riskLevel = 'MODERATE';
      const parts: string[] = [];
      if (missedCount === 1) parts.push('1 Security KB missed while blocked');
      if (daysBlocked >= 15) parts.push(`${daysBlocked} days blocked (15–30d)`);
      riskReason = parts.join(' · ');
    }

    return {
      daysBlocked,
      daysLeft,
      isOverdue,
      securityUpdates,
      previewUpdates,
      allInRange: updatesInRange,
      riskLevel,
      riskReason,
    };
  }, [updates, wubStartDate, wubPlannedUnblockDate, wubIsBlocked, todayIso]);

  // ============================================================================
  // How Notifications Work:
  // 1. Triggers Android Phone Notification (via AndroidBridge in APK or Browser Notification)
  // 2. Sends Discord Webhook (High Priority = @everyone ping; Standard = Info card)
  // ============================================================================
  const triggerPhoneNotification = async (
    title: string,
    body: string,
    kind: 'info' | 'success' | 'warning' = 'info'
  ) => {
    showToast(title, body, kind);

    // 1. Native Android APK Notification Bridge
    const winWithBridge = window as unknown as {
      AndroidBridge?: {
        showNotification?: (t: string, m: string) => void;
      };
    };
    if (winWithBridge.AndroidBridge?.showNotification) {
      try {
        winWithBridge.AndroidBridge.showNotification(title, body);
        return;
      } catch {
        // fallback to browser notification
      }
    }

    // 2. Browser Notification API
    if ('Notification' in window) {
      try {
        let perm = Notification.permission;
        if (perm === 'default') {
          perm = await Notification.requestPermission();
        }
        if (perm === 'granted') {
          new Notification(title, { body, icon: '/pwa-192x192.png' });
        }
      } catch {
        // toast already shown
      }
    }
  };

  // Send Alert to Phone + Discord (used when changing start date or clicking Ping Now)
  const sendAlertToPhoneAndDiscord = async (
    customStartDate?: string,
    forceTestPing = false
  ) => {
    const activeStart = customStartDate || wubStartDate;
    const rangeUpdates = updates
      .filter((u) => u.releaseDate >= activeStart)
      .sort((a, b) => b.releaseDate.localeCompare(a.releaseDate));

    const secUpdates = rangeUpdates.filter((u) => isSecurityOrCumulativeUpdate(u));
    const prevUpdates = rangeUpdates.filter((u) => !isSecurityOrCumulativeUpdate(u));

    // High Priority if Security KB dropped while blocked, or unblock date reached, or user clicked Test @everyone
    const isHighPriority =
      forceTestPing ||
      (wubIsBlocked && (secUpdates.length > 0 || wubMetrics.isOverdue || wubMetrics.riskLevel === 'HIGH'));

    const title =
      rangeUpdates.length === 0
        ? `No Windows 11 Updates (${activeStart} → ${todayIso})`
        : isHighPriority
        ? `HIGH PRIORITY: ${secUpdates.length} Security KB(s) Missed Since ${activeStart}`
        : `INFO: ${rangeUpdates.length} Update(s) Since ${activeStart} (0 Security Risk)`;

    const secList = secUpdates.map((u) => `${u.kb} (${u.version})`).join(', ') || 'None';
    const prevList = prevUpdates.map((u) => `${u.kb} (${u.version})`).join(', ') || 'None';

    const phoneBody =
      rangeUpdates.length === 0
        ? `0 Windows 11 updates were released between ${activeStart} and ${todayIso}.`
        : `Security KBs: ${secList} · Optional Previews (Safe to Skip): ${prevList}`;

    // Always notify on phone/app immediately
    await triggerPhoneNotification(
      title,
      phoneBody,
      isHighPriority ? 'warning' : 'success'
    );

    if (!discordWebhookUrl.trim()) {
      if (forceTestPing) {
        showToast(
          'Paste Your Discord Webhook URL First',
          'Phone notification worked! Paste your Discord Webhook URL in Step 1 to also ping @everyone in Discord.',
          'warning'
        );
      }
      return;
    }

    setSendingAlert(true);
    const bulletSummary =
      rangeUpdates.length > 0
        ? rangeUpdates
            .slice(0, 8)
            .map(
              (u) =>
                `• **${u.releaseDate}** — \`${u.kb}\` (Win11 ${u.version}, Build \`${u.build}\`) — **${
                  isSecurityOrCumulativeUpdate(u)
                    ? '🚨 SECURITY KB (Install When Unblocking)'
                    : 'ℹ️ Optional Preview (Safe to Skip)'
                }**`
            )
            .join('\n')
        : `No updates released between ${activeStart} and ${todayIso}.`;

    const wubStatusLine = `WUB: ${wubIsBlocked ? 'BLOCKED' : 'UNBLOCKED'} · Risk: ${
      wubMetrics.riskLevel
    } · ${wubMetrics.daysBlocked}d Blocked`;

    try {
      const resp = await fetch('/api/notify/discord', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          webhookUrl: discordWebhookUrl.trim(),
          kb: secList.slice(0, 120),
          build: prevList.slice(0, 120),
          version: `${activeStart} → ${todayIso}`,
          title,
          summaryDescription: bulletSummary,
          pingEveryone: isHighPriority,
          priority: isHighPriority ? 'high' : 'standard',
          wubSummary: wubStatusLine,
        }),
      });
      if (!resp.ok) throw new Error('Direct fallback');
      showToast(
        isHighPriority
          ? 'Sent @everyone Ping to Discord + Phone!'
          : 'Sent Info Update to Discord + Phone!',
        `Delivered ${rangeUpdates.length} update(s) from ${activeStart} → ${todayIso}.`,
        'success'
      );
    } catch {
      // Direct Discord Webhook fallback (for standalone Android APK)
      try {
        const directResp = await fetch(discordWebhookUrl.trim(), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: isHighPriority
              ? `@everyone 🚨 **${title}**\n${wubStatusLine}\n\n${bulletSummary}`
              : `ℹ️ **${title}**\n${wubStatusLine}\n\n${bulletSummary}`,
            allowed_mentions: isHighPriority
              ? { parse: ['everyone', 'roles', 'users'] }
              : { parse: [] },
            embeds: [
              {
                title,
                url: 'https://learn.microsoft.com/en-us/windows/release-health/windows11-release-information',
                description: bulletSummary,
                color: isHighPriority ? 15548997 : 3718648,
                fields: [
                  { name: 'WUB Risk Status', value: wubStatusLine, inline: false },
                  { name: 'Security KBs (High Priority)', value: secList, inline: true },
                  { name: 'Optional Previews (0 Risk)', value: prevList, inline: true },
                ],
              },
            ],
          }),
        });
        if (directResp.ok) {
          showToast(
            isHighPriority
              ? 'Sent @everyone Ping to Discord + Phone!'
              : 'Sent Info Update to Discord + Phone!',
            `Delivered ${rangeUpdates.length} update(s) from ${activeStart} → ${todayIso}.`,
            'success'
          );
        }
      } catch {
        showToast('Discord Error', 'Check that your Discord Webhook URL is valid.', 'warning');
      }
    } finally {
      setSendingAlert(false);
    }
  };

  // Send alert for a single specific KB item
  const sendSingleKbAlert = async (item: Win11UpdateItem) => {
    const isSec = isSecurityOrCumulativeUpdate(item);
    const isHighPriority = isSec && wubIsBlocked;
    const title = isHighPriority
      ? `HIGH PRIORITY Security Update: ${item.kb} (Win11 ${item.version})`
      : `Optional Preview Update (0 Risk): ${item.kb} (Win11 ${item.version})`;
    const body = `${item.releaseDate} · Build ${item.build} — ${item.title}`;

    await triggerPhoneNotification(title, body, isHighPriority ? 'warning' : 'info');

    if (!discordWebhookUrl.trim()) return;

    try {
      const resp = await fetch('/api/notify/discord', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          webhookUrl: discordWebhookUrl.trim(),
          kb: item.kb,
          build: item.build,
          version: item.version,
          title,
          summaryDescription: body,
          pingEveryone: isHighPriority,
          priority: isHighPriority ? 'high' : 'standard',
          wubSummary: `WUB ${wubIsBlocked ? 'BLOCKED' : 'UNBLOCKED'} · Risk: ${wubMetrics.riskLevel}`,
        }),
      });
      if (!resp.ok) throw new Error('Direct fallback');
    } catch {
      try {
        await fetch(discordWebhookUrl.trim(), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: isHighPriority
              ? `@everyone 🚨 **${title}**\n${body}`
              : `ℹ️ **${title}**\n${body}`,
            allowed_mentions: isHighPriority
              ? { parse: ['everyone', 'roles', 'users'] }
              : { parse: [] },
          }),
        });
      } catch {
        // ignore
      }
    }
  };

  // Mark as Unblocked (Reset everything to 0 days & SAFE)
  const handleMarkAsUnblocked = async () => {
    saveWubBlocked(false);
    saveWubStart(todayIso);
    saveWubUnblock(addDaysToIso(todayIso, 14));
    setCheckedKbs({});

    await triggerPhoneNotification(
      'Marked as Unblocked — Risk Reset to SAFE',
      'Your WUB timer and missed Security KB counter have been reset to 0.',
      'success'
    );
  };

  // Live check button
  const handleCheckMicrosoftNow = async () => {
    setCheckingNow(true);
    try {
      await fetch('/api/check-now', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          discordWebhookUrl: discordWebhookUrl.trim() || undefined,
          simulateNewRelease: false,
        }),
      });
      await fetchUpdates();
    } catch {
      // offline/APK fallback
    } finally {
      setCheckingNow(false);
      await sendAlertToPhoneAndDiscord(wubStartDate, false);
    }
  };

  const riskBarClasses =
    wubMetrics.riskLevel === 'HIGH'
      ? 'bg-rose-500/15 border-rose-500/50 text-rose-200'
      : wubMetrics.riskLevel === 'MODERATE'
      ? 'bg-amber-500/15 border-amber-500/50 text-amber-200'
      : 'bg-emerald-500/15 border-emerald-500/50 text-emerald-200';

  const riskTextAccent =
    wubMetrics.riskLevel === 'HIGH'
      ? 'text-rose-400'
      : wubMetrics.riskLevel === 'MODERATE'
      ? 'text-amber-400'
      : 'text-emerald-400';

  return (
    <div className="min-h-screen bg-[#0B0F17] text-slate-100 pb-16">
      {!isOnline && (
        <div className="bg-amber-500/20 border-b border-amber-500/40 px-4 py-2 text-xs text-amber-200 text-center">
          Offline Mode — Using cached Windows 11 update history.
        </div>
      )}

      {/* Simple Top Header */}
      <header className="sticky top-0 z-30 flex items-center justify-between gap-4 px-4 sm:px-8 py-3.5 bg-[#0B0F17]/95 backdrop-blur-md border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <Shield className="w-5 h-5 text-sky-400 shrink-0" />
          <span className="text-base sm:text-lg font-bold text-white font-display">
            Win11 WUB Safe-Window Notifier
          </span>
        </div>

        <button
          type="button"
          onClick={handleCheckMicrosoftNow}
          disabled={checkingNow}
          className="min-h-[40px] px-4 py-2 text-xs sm:text-sm font-semibold text-slate-950 bg-sky-400 hover:bg-sky-300 disabled:opacity-60 rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${checkingNow ? 'animate-spin' : ''}`} />
          <span>{checkingNow ? 'Checking...' : 'Check Updates & Notify Now'}</span>
        </button>
      </header>

      {/* Toast Notification Popup */}
      {toast && (
        <div className="fixed top-16 right-4 left-4 sm:left-auto sm:w-96 z-50 bg-[#111827] border border-sky-500/50 rounded-xl p-4 shadow-2xl">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <Bell className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-white">{toast.title}</p>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">{toast.message}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setToast(null)}
              className="text-slate-400 hover:text-white p-1"
              aria-label="Close notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <main className="max-w-5xl mx-auto px-4 sm:px-8 pt-6 space-y-8">
        {/* =====================================================================
            TOP STATUS BAR: Status + Days Blocked/Left + Risk Color + Missed Security Count
           ===================================================================== */}
        <section className={`rounded-xl border p-4 sm:px-6 sm:py-5 ${riskBarClasses}`}>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm sm:text-base font-mono-tabular">
                <span className="font-bold text-white inline-flex items-center gap-1.5">
                  {wubIsBlocked ? (
                    <Lock className="w-4 h-4 text-amber-400" />
                  ) : (
                    <Unlock className="w-4 h-4 text-emerald-400" />
                  )}
                  {wubIsBlocked ? 'WUB BLOCKED' : 'WUB UNBLOCKED'}
                </span>
                <span aria-hidden="true" className="text-slate-500">
                  ·
                </span>
                <span className="text-white font-semibold">
                  {wubIsBlocked
                    ? `${wubMetrics.daysBlocked}d Blocked / ${
                        wubMetrics.daysLeft >= 0
                          ? `${wubMetrics.daysLeft}d Left`
                          : `${Math.abs(wubMetrics.daysLeft)}d Overdue`
                      }`
                    : '0d Blocked'}
                </span>
                <span aria-hidden="true" className="text-slate-500">
                  ·
                </span>
                <span className={`font-bold ${riskTextAccent}`}>
                  RISK: {wubMetrics.riskLevel}
                </span>
                <span aria-hidden="true" className="text-slate-500">
                  ·
                </span>
                <span className="text-white font-semibold">
                  Missed Security KBs: {wubMetrics.securityUpdates.length}
                </span>
              </div>
              <p className="text-xs text-slate-300 font-mono-tabular">
                Why: {wubMetrics.riskReason}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              {wubIsBlocked ? (
                <button
                  type="button"
                  onClick={handleMarkAsUnblocked}
                  className="min-h-[40px] px-4 py-2 text-xs sm:text-sm font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Mark as Unblocked (Reset)</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    saveWubBlocked(true);
                    saveWubStart(todayIso);
                    saveWubUnblock(addDaysToIso(todayIso, 14));
                  }}
                  className="min-h-[40px] px-4 py-2 text-xs sm:text-sm font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Lock className="w-4 h-4" />
                  <span>Turn On WUB (14-Day Safe Block)</span>
                </button>
              )}
            </div>
          </div>
        </section>

        {/* =====================================================================
            PLAIN-ENGLISH GUIDE: HOW NOTIFICATIONS & DISCORD PINGS WORK + STEP 1 & 2
           ===================================================================== */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* STEP 1: Discord Webhook Setup (Simple 1-Box Setup) */}
          <div className="lg:col-span-6 bg-[#111827] border border-slate-800 rounded-xl p-5 sm:p-6 space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-sky-400 font-mono-tabular">
                  STEP 1 · CONNECT DISCORD ONCE
                </span>
                <span className="text-xs text-slate-400">Auto-saves on your phone/PC</span>
              </div>
              <h2 className="text-lg font-bold text-white font-display">
                Where Should We Send @everyone Alerts?
              </h2>
              <p className="text-xs text-slate-300 leading-relaxed">
                Paste your Discord Webhook URL once below. Here is exactly how it notifies you:
              </p>
              <ul className="text-xs text-slate-300 space-y-1.5 list-disc list-inside bg-[#0B0F17] p-3.5 rounded-lg border border-slate-800/80">
                <li>
                  <strong className="text-white">When You Pick a Start Date (Step 2):</strong> It{' '}
                  <strong>immediately</strong> pops an Android notification AND sends all updates
                  from that date to today to your Discord.
                </li>
                <li>
                  <strong className="text-rose-300">Priority Rule:</strong> If a{' '}
                  <strong>Security KB</strong> dropped while WUB is blocked (or your Unblock Date is
                  overdue), it pings <code className="text-rose-300">@everyone</code>. If it&apos;s
                  just an Optional Preview, it sends a normal info message without pinging everyone.
                </li>
                <li>
                  <strong className="text-emerald-300">24/7 Background Auto-Check:</strong> Your
                  GitHub repo (<code className="text-white">Win11</code>) checks Microsoft every 6
                  hours and pings Discord automatically when a new update drops.
                </li>
              </ul>
            </div>

            <div className="space-y-2.5 pt-2">
              <input
                type="url"
                value={discordWebhookUrl}
                onChange={(e) => saveDiscordUrl(e.target.value)}
                placeholder="Paste Discord Webhook URL (https://discord.com/api/webhooks/...)"
                className="w-full min-h-[44px] px-3.5 py-2 bg-[#0B0F17] border border-slate-700 rounded-lg text-xs sm:text-sm text-white placeholder-slate-500 font-mono-tabular focus:outline-none focus:border-[#5865F2]"
              />
              <button
                type="button"
                onClick={() => sendAlertToPhoneAndDiscord(wubStartDate, true)}
                disabled={sendingAlert}
                className="w-full min-h-[44px] px-4 py-2.5 text-xs sm:text-sm font-semibold text-white bg-[#5865F2] hover:bg-[#4752C4] disabled:opacity-60 rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <Webhook className="w-4 h-4" />
                <span>
                  {sendingAlert
                    ? 'Sending to Discord & Phone...'
                    : 'Test Phone Notification + Discord @everyone Ping Now'}
                </span>
              </button>
            </div>
          </div>

          {/* STEP 2: Set Your WUB Block Dates (Auto-Notifies When Changed) */}
          <div className="lg:col-span-6 bg-[#111827] border border-slate-800 rounded-xl p-5 sm:p-6 space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-400 font-mono-tabular">
                  STEP 2 · SET YOUR WUB BLOCK DATES
                </span>
                <span className="text-xs text-slate-400">Safe limit: ≤14 Days</span>
              </div>
              <h2 className="text-lg font-bold text-white font-display">
                When Did You Turn WUB On &amp; When Will You Unblock?
              </h2>
              <p className="text-xs text-slate-300 leading-relaxed">
                Pick your <strong>WUB Start Date</strong> (for example, <code className="text-white">2026-10-14</code>).
                Changing the date <strong>automatically</strong> checks all updates from that date to
                today ({todayIso}) and notifies your phone &amp; Discord!
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="space-y-1.5">
                  <label htmlFor="simple-start-date" className="block text-xs font-medium text-slate-300">
                    1. WUB Start Date (Auto-Pings on Change)
                  </label>
                  <input
                    id="simple-start-date"
                    type="date"
                    value={wubStartDate}
                    max={todayIso}
                    onChange={(e) => {
                      const val = e.target.value;
                      saveWubBlocked(true);
                      saveWubStart(val);
                      if (val) {
                        sendAlertToPhoneAndDiscord(val, false);
                      }
                    }}
                    className="w-full min-h-[44px] px-3.5 py-2 bg-[#0B0F17] border border-slate-700 rounded-lg text-sm text-white font-mono-tabular focus:outline-none focus:border-sky-400"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="simple-unblock-date" className="block text-xs font-medium text-slate-300">
                    2. Planned Safe Unblock Date
                  </label>
                  <input
                    id="simple-unblock-date"
                    type="date"
                    value={wubPlannedUnblockDate}
                    onChange={(e) => {
                      saveWubBlocked(true);
                      saveWubUnblock(e.target.value);
                    }}
                    className="w-full min-h-[44px] px-3.5 py-2 bg-[#0B0F17] border border-slate-700 rounded-lg text-sm text-white font-mono-tabular focus:outline-none focus:border-sky-400"
                  />
                </div>
              </div>

              {/* Simple 1-Tap Quick Date Buttons */}
              <div className="space-y-1.5 pt-2">
                <span className="block text-xs text-slate-400">
                  Or tap a quick preset (auto-notifies phone &amp; Discord):
                </span>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const start = todayIso;
                      const unblock = addDaysToIso(todayIso, 14);
                      saveWubBlocked(true);
                      saveWubStart(start);
                      saveWubUnblock(unblock);
                      sendAlertToPhoneAndDiscord(start, false);
                    }}
                    className="min-h-[36px] px-3 py-1.5 text-xs font-medium text-emerald-300 bg-emerald-950/50 hover:bg-emerald-900/60 border border-emerald-700/50 rounded-lg cursor-pointer"
                  >
                    Blocked Today (14d Safe Window)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const start = '2026-10-14';
                      const unblock = addDaysToIso(todayIso, 6);
                      saveWubBlocked(true);
                      saveWubStart(start);
                      saveWubUnblock(unblock);
                      sendAlertToPhoneAndDiscord(start, false);
                    }}
                    className="min-h-[36px] px-3 py-1.5 text-xs font-medium text-amber-300 bg-amber-950/50 hover:bg-amber-900/60 border border-amber-700/50 rounded-lg cursor-pointer"
                  >
                    Since Oct 14 (14/10 → Today)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const start = '2026-09-01';
                      const unblock = addDaysToIso(todayIso, -2);
                      saveWubBlocked(true);
                      saveWubStart(start);
                      saveWubUnblock(unblock);
                      sendAlertToPhoneAndDiscord(start, false);
                    }}
                    className="min-h-[36px] px-3 py-1.5 text-xs font-medium text-rose-300 bg-rose-950/50 hover:bg-rose-900/60 border border-rose-700/50 rounded-lg cursor-pointer"
                  >
                    Since Sep 1 (High Risk Demo)
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2 text-xs text-slate-400">
              <span>Safe Rule: ≤14d &amp; 0 Security KBs = SAFE · &gt;30d or 2+ Security KBs = HIGH</span>
            </div>
          </div>
        </section>

        {/* =====================================================================
            STEP 3: UPDATES DURING YOUR SELECTED WINDOW (SEPARATED SIMPLY)
           ===================================================================== */}
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-xl font-bold text-white font-display">
                Updates Released From {wubStartDate} to Today ({todayIso})
              </h2>
              <p className="text-xs sm:text-sm text-slate-400">
                Separated into <strong>Security Updates (Must Install When You Unblock)</strong> vs.{' '}
                <strong>Optional Preview Updates (Safe to Ignore)</strong>.
              </p>
            </div>
            <button
              type="button"
              onClick={() => sendAlertToPhoneAndDiscord(wubStartDate, false)}
              disabled={sendingAlert}
              className="min-h-[40px] px-4 py-2 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg flex items-center gap-2 shrink-0 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5 text-sky-400" />
              <span>Re-Send This Range to Discord &amp; Phone</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Box A: Security / Cumulative KBs (High Priority) */}
            <div className="bg-[#111827] border border-slate-800 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0" />
                  <div>
                    <h3 className="text-base font-bold text-white font-display">
                      Security &amp; Cumulative KBs ({wubMetrics.securityUpdates.length})
                    </h3>
                    <p className="text-xs text-rose-300">
                      High Priority — Raises Risk Meter &amp; Pings @everyone
                    </p>
                  </div>
                </div>
              </div>

              {!wubIsBlocked ? (
                <div className="bg-[#0B0F17] border border-emerald-800/50 rounded-lg p-5 text-center space-y-2">
                  <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto" />
                  <p className="text-sm font-semibold text-emerald-400">
                    You Are Unblocked &amp; Up to Date!
                  </p>
                  <p className="text-xs text-slate-400">
                    0 missed security updates. Your risk level is SAFE.
                  </p>
                </div>
              ) : wubMetrics.securityUpdates.length === 0 ? (
                <div className="bg-[#0B0F17] border border-emerald-800/50 rounded-lg p-5 text-center space-y-1.5">
                  <p className="text-sm font-semibold text-emerald-400">
                    0 Security KBs Missed Since {wubStartDate}
                  </p>
                  <p className="text-xs text-slate-400">
                    No mandatory security updates have dropped during your block window yet.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {wubMetrics.securityUpdates.map((item) => {
                    const isChecked = Boolean(checkedKbs[item.kb]);
                    return (
                      <div
                        key={item.id}
                        className="bg-[#0B0F17] border border-slate-800 rounded-lg p-3.5 space-y-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-1.5 text-xs font-mono-tabular">
                              <span className="text-rose-400 font-bold">SECURITY KB</span>
                              <span>·</span>
                              <span className="text-white font-bold">{item.kb}</span>
                              <span>·</span>
                              <span className="text-sky-400">Win11 {item.version}</span>
                              <span>·</span>
                              <span className="text-slate-400">{item.releaseDate}</span>
                            </div>
                            <p className="text-xs sm:text-sm font-semibold text-white">
                              {item.title}
                            </p>
                            <p className="text-xs text-slate-400 leading-relaxed">
                              {item.highlights}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/80">
                          <button
                            type="button"
                            onClick={() =>
                              setCheckedKbs((prev) => ({ ...prev, [item.kb]: !prev[item.kb] }))
                            }
                            className={`text-xs font-medium px-2.5 py-1 rounded flex items-center gap-1.5 cursor-pointer ${
                              isChecked
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : 'bg-slate-800 text-slate-300 hover:text-white'
                            }`}
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>
                              {isChecked ? 'Installed' : 'Check Off When Installed'}
                            </span>
                          </button>

                          <button
                            type="button"
                            onClick={() => sendSingleKbAlert(item)}
                            className="text-xs font-semibold px-3 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white flex items-center gap-1 cursor-pointer"
                          >
                            <Send className="w-3 h-3" />
                            <span>Ping @everyone for {item.kb}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Box B: Optional Preview Updates (0 Risk — Safe to Skip) */}
            <div className="bg-[#111827] border border-slate-800 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
                  <div>
                    <h3 className="text-base font-bold text-white font-display">
                      Optional Preview Updates ({wubMetrics.previewUpdates.length})
                    </h3>
                    <p className="text-xs text-emerald-300">
                      0 Security Risk — Safe to Skip While WUB is On (No @everyone Ping)
                    </p>
                  </div>
                </div>
              </div>

              {wubMetrics.previewUpdates.length === 0 ? (
                <div className="bg-[#0B0F17] border border-slate-800 rounded-lg p-5 text-center space-y-1.5">
                  <p className="text-sm font-medium text-slate-300">
                    No Optional Previews Since {wubStartDate}
                  </p>
                  <p className="text-xs text-slate-400">
                    Pick an earlier date (like Sep 1) if you want to see past Optional Preview
                    updates.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {wubMetrics.previewUpdates.map((item) => (
                    <div
                      key={item.id}
                      className="bg-[#0B0F17] border border-slate-800 rounded-lg p-3.5 space-y-2"
                    >
                      <div className="flex flex-wrap items-center gap-1.5 text-xs font-mono-tabular text-slate-400">
                        <span className="text-emerald-400 font-bold">SAFE TO SKIP (PREVIEW)</span>
                        <span>·</span>
                        <span className="text-white font-bold">{item.kb}</span>
                        <span>·</span>
                        <span>Win11 {item.version}</span>
                        <span>·</span>
                        <span>{item.releaseDate}</span>
                      </div>
                      <p className="text-xs sm:text-sm font-semibold text-white">{item.title}</p>
                      <p className="text-xs text-slate-400 leading-relaxed">{item.highlights}</p>
                      <div className="pt-2 border-t border-slate-800/80 flex justify-end">
                        <button
                          type="button"
                          onClick={() => sendSingleKbAlert(item)}
                          className="text-xs font-medium px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center gap-1 cursor-pointer"
                        >
                          <Bell className="w-3 h-3 text-sky-400" />
                          <span>Send Normal Info Alert (No Ping)</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* =====================================================================
            SIMPLE ANDROID APK DOWNLOAD + OPTIONAL ALL-HISTORY TOGGLE
           ===================================================================== */}
        <section className="bg-[#111827] border border-slate-800 rounded-xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white font-display flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-emerald-400" />
              <span>Android App (.apk) &amp; 24/7 GitHub Auto-Monitor</span>
            </h3>
            <p className="text-xs text-slate-400">
              Download the standalone Android app from your <strong>mishramukti982-gif/Win11</strong>{' '}
              GitHub Releases page, or view all historical Windows 11 updates.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <a
              href="https://github.com/mishramukti982-gif/Win11/releases/download/v1.0.0/Win11-Update-Notifier-Android.apk"
              target="_blank"
              rel="noopener noreferrer"
              className="min-h-[40px] px-4 py-2 text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg flex items-center gap-1.5"
            >
              <Download className="w-4 h-4" />
              <span>Download Android APK</span>
            </a>

            <button
              type="button"
              onClick={() => setShowAllHistory((prev) => !prev)}
              className="min-h-[40px] px-3.5 py-2 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg flex items-center gap-1.5 cursor-pointer"
            >
              <span>{showAllHistory ? 'Hide Full Update List' : `View All ${updates.length} Updates`}</span>
              {showAllHistory ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>
          </div>
        </section>

        {/* Optional Expandable Full Update History List */}
        {showAllHistory && (
          <section className="bg-[#111827] border border-slate-800 rounded-xl divide-y divide-slate-800">
            {updates.map((item) => {
              const isSec = isSecurityOrCumulativeUpdate(item);
              return (
                <div
                  key={`all-${item.id}`}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs font-mono-tabular">
                      <span className={isSec ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'}>
                        {isSec ? 'SECURITY / CUMULATIVE' : 'OPTIONAL PREVIEW (0 RISK)'}
                      </span>
                      <span>·</span>
                      <span className="text-white font-bold">{item.kb}</span>
                      <span>·</span>
                      <span className="text-sky-400">Win11 {item.version}</span>
                      <span>·</span>
                      <span className="text-slate-400">Build {item.build}</span>
                      <span>·</span>
                      <span className="text-slate-400">{item.releaseDate}</span>
                    </div>
                    <p className="text-sm font-semibold text-white">{item.title}</p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => sendSingleKbAlert(item)}
                      className="min-h-[36px] px-3 py-1.5 text-xs font-medium text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg flex items-center gap-1.5 cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5 text-sky-400" />
                      <span>Alert {item.kb}</span>
                    </button>
                    <a
                      href={item.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="min-h-[36px] px-3 py-1.5 text-xs font-medium text-sky-400 bg-[#0B0F17] border border-slate-800 rounded-lg flex items-center gap-1"
                    >
                      <span>Microsoft Info</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              );
            })}
          </section>
        )}
      </main>
    </div>
  );
}
