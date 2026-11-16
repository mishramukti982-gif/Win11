/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  Bell,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Download,
  ExternalLink,
  Lock,
  RefreshCw,
  RotateCcw,
  Send,
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
  version: string;
  type: 'Major Feature Updates' | 'Security / Cumulative KB' | 'Out-of-Band / Preview';
  releaseDate: string;
  title: string;
  highlights: string;
  servicingChannel: string;
  sourceUrl: string;
  isNew?: boolean;
  supersededBy?: string;
  includesPreviewKb?: string;
}

const VERIFIED_UPDATES: Win11UpdateItem[] = [
  {
    id: 'KB5132061-26300.9974',
    kb: 'KB5132061',
    build: '26300.9974 · 26200.9974 · 26100.9974',
    version: '26H2, 25H2 & 24H2',
    type: 'Security / Cumulative KB',
    releaseDate: '2026-11-10',
    title: 'November 2026 Patch Tuesday Cumulative Security Update (26H2, 25H2 & 24H2)',
    highlights:
      'Mandatory November 10, 2026 security patches for Windows 11 26H2, 25H2, and 24H2. Fixes USB Audio 1.0 issues, enables Memory Integrity on compatible systems, and includes every change from the October 28 optional update (KB5127936).',
    servicingChannel: 'General Availability (Mandatory B-Release)',
    sourceUrl: 'https://support.microsoft.com/help/5132061',
    isNew: true,
    includesPreviewKb: 'KB5127936 (Released 2026-10-28)',
  },
  {
    id: 'KB5132059-28000.3501',
    kb: 'KB5132059',
    build: '28000.3501',
    version: '26H1',
    type: 'Security / Cumulative KB',
    releaseDate: '2026-11-10',
    title: 'November 2026 Patch Tuesday Cumulative Security Update for Windows 11 26H1',
    highlights:
      'Mandatory November 10, 2026 security update for Windows 11 26H1 (OS Build 28000.3501). Includes November security patches, Secure Boot certificate updates, and fixes printer error 87.',
    servicingChannel: 'General Availability (Mandatory B-Release)',
    sourceUrl: 'https://support.microsoft.com/help/5132059',
    isNew: true,
  },
  {
    id: 'KB5131087-22631.7711',
    kb: 'KB5131087',
    build: '22631.7711',
    version: '23H2',
    type: 'Security / Cumulative KB',
    releaseDate: '2026-11-10',
    title: 'November 2026 Patch Tuesday Cumulative Security Update for Windows 11 23H2 (Final)',
    highlights:
      'Mandatory final November 10, 2026 security update for Windows 11 version 23H2 (Enterprise & Education editions, OS Build 22631.7711). Includes November vulnerability patches and printing fixes.',
    servicingChannel: 'Enterprise & Education (Mandatory B-Release)',
    sourceUrl: 'https://support.microsoft.com/help/5131087',
    isNew: true,
  },
  {
    id: 'KB5127936-26300.9818',
    kb: 'KB5127936',
    build: '26300.9818 · 26200.9818',
    version: '26H2 & 25H2',
    type: 'Out-of-Band / Preview',
    releaseDate: '2026-10-28',
    title: 'October 28, 2026 Optional Non-Security Preview Update (26H2 & 25H2)',
    highlights:
      'Optional C-release preview introducing customizable context menu improvements and adaptive hibernation adjustments. Every change from KB5127936 is already rolled into the Nov 10 mandatory update KB5132061.',
    servicingChannel: 'Optional Preview Channel (C-Release)',
    sourceUrl: 'https://support.microsoft.com/help/5127936',
    isNew: false,
    supersededBy: 'KB5132061 (2026-11-10 Patch Tuesday)',
  },
  {
    id: 'KB5127648-26300.9711',
    kb: 'KB5127648',
    build: '26300.9711 · 26200.9711 · 26100.9711',
    version: '26H2, 25H2 & 24H2',
    type: 'Security / Cumulative KB',
    releaseDate: '2026-10-13',
    title: 'October 2026 Patch Tuesday Cumulative Security Update (26H2, 25H2 & 24H2)',
    highlights:
      'Mandatory October 13, 2026 security rollup for 26H2, 25H2, and 24H2 (also final standard monthly update for 24H2 Home/Pro). Fixes gaming mouse stutters, Windows Hello fingerprint issues, and File Explorer PDF previews.',
    servicingChannel: 'General Availability (Mandatory B-Release)',
    sourceUrl: 'https://support.microsoft.com/help/5127648',
    isNew: false,
    supersededBy: 'KB5132061 (2026-11-10 Patch Tuesday)',
  },
  {
    id: 'KB5127646-28000.3231',
    kb: 'KB5127646',
    build: '28000.3231',
    version: '26H1',
    type: 'Security / Cumulative KB',
    releaseDate: '2026-10-13',
    title: 'October 2026 Patch Tuesday Cumulative Security Update for Windows 11 26H1',
    highlights:
      'Mandatory October 13, 2026 security update for Windows 11 26H1 (OS Build 28000.3231) addressing kernel and hypervisor vulnerabilities.',
    servicingChannel: 'General Availability (Mandatory B-Release)',
    sourceUrl: 'https://support.microsoft.com/help/5127646',
    isNew: false,
    supersededBy: 'KB5132059 (2026-11-10 Patch Tuesday)',
  },
  {
    id: 'KB5126653-22631.7652',
    kb: 'KB5126653',
    build: '22631.7652',
    version: '23H2',
    type: 'Security / Cumulative KB',
    releaseDate: '2026-10-13',
    title: 'October 2026 Patch Tuesday Cumulative Security Update for Windows 11 23H2',
    highlights:
      'Mandatory October 13, 2026 cumulative security rollup for Windows 11 23H2 (OS Build 22631.7652).',
    servicingChannel: 'Enterprise & Education (Mandatory B-Release)',
    sourceUrl: 'https://support.microsoft.com/help/5126653',
    isNew: false,
    supersededBy: 'KB5131087 (2026-11-10 Patch Tuesday)',
  },
  {
    id: 'KB5124010-26300.9550',
    kb: 'KB5124010',
    build: '26300.9550 · 26200.9550 · 26100.9550',
    version: '26H2, 25H2 & 24H2',
    type: 'Out-of-Band / Preview',
    releaseDate: '2026-09-22',
    title: 'September 22, 2026 Optional Preview Update (26H2, 25H2 & 24H2)',
    highlights:
      'Optional non-security preview update (OS Builds 26300.9550, 26200.9550, 26100.9550). Fully superseded by October and November cumulative security updates.',
    servicingChannel: 'Optional Preview Channel (C-Release)',
    sourceUrl: 'https://support.microsoft.com/help/5124010',
    isNew: false,
    supersededBy: 'KB5132061 (2026-11-10 Patch Tuesday)',
  },
  {
    id: 'KB5129195-OOB',
    kb: 'KB5129195',
    build: '28000.3010 · 26200.9480',
    version: '26H1, 25H2 & 24H2',
    type: 'Security / Cumulative KB',
    releaseDate: '2026-09-14',
    title: 'September 14, 2026 Out-of-Band (OOB) Hotfix Update',
    highlights:
      'Out-of-band cumulative hotfix remediating Remote Desktop Services, Hyper-V Linux VM host folder shares, and USB audio issues introduced in early September.',
    servicingChannel: 'Out-of-Band Hotfix',
    sourceUrl: 'https://support.microsoft.com/help/5129195',
    isNew: false,
    supersededBy: 'KB5132061 / KB5132059 (2026-11-10 Patch Tuesday)',
  },
  {
    id: 'KB5124008-26200.9445',
    kb: 'KB5124008',
    build: '26200.9445 · 26100.9445',
    version: '25H2 & 24H2',
    type: 'Security / Cumulative KB',
    releaseDate: '2026-09-08',
    title: 'September 2026 Patch Tuesday Cumulative Security Update (25H2 & 24H2)',
    highlights:
      'Mandatory September 8, 2026 cumulative security update addressing CVE-2026-81963 (Windows Update Stack Elevation of Privilege) and system stability fixes.',
    servicingChannel: 'General Availability (Mandatory B-Release)',
    sourceUrl: 'https://support.microsoft.com/help/5124008',
    isNew: false,
    supersededBy: 'KB5132061 (2026-11-10 Patch Tuesday)',
  },
  {
    id: 'KB5124012-28000.2954',
    kb: 'KB5124012',
    build: '28000.2954',
    version: '26H1',
    type: 'Security / Cumulative KB',
    releaseDate: '2026-09-08',
    title: 'September 2026 Patch Tuesday Cumulative Security Update for Windows 11 26H1',
    highlights:
      'Mandatory September 8, 2026 security update for Windows 11 version 26H1 (OS Build 28000.2954).',
    servicingChannel: 'General Availability (Mandatory B-Release)',
    sourceUrl: 'https://support.microsoft.com/help/5124012',
    isNew: false,
    supersededBy: 'KB5132059 (2026-11-10 Patch Tuesday)',
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

// Compute automatic superseding KB label if not already hardcoded on the item
function getSupersedingLabel(item: Win11UpdateItem, allUpdates: Win11UpdateItem[]): string | undefined {
  if (item.supersededBy) return item.supersededBy;
  const newerSec = allUpdates.find(
    (other) =>
      other.releaseDate > item.releaseDate &&
      isSecurityOrCumulativeUpdate(other) &&
      ((item.version.includes('26H2') && other.version.includes('26H2')) ||
        (item.version.includes('25H2') && other.version.includes('25H2')) ||
        (item.version.includes('24H2') && other.version.includes('24H2')) ||
        (item.version.includes('26H1') && other.version.includes('26H1')) ||
        (item.version.includes('23H2') && other.version.includes('23H2')))
  );
  if (newerSec) {
    return `${newerSec.kb} (${newerSec.releaseDate} Patch Tuesday)`;
  }
  return undefined;
}

export default function App() {
  const isOnline = useOnlineStatus();
  const todayIso = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const [updates, setUpdates] = useState<Win11UpdateItem[]>(VERIFIED_UPDATES);
  const [checkingNow, setCheckingNow] = useState<boolean>(false);
  const [sendingAlert, setSendingAlert] = useState<boolean>(false);
  const [showAllHistory, setShowAllHistory] = useState<boolean>(true);

  // WUB (Windows Update Blocker) State — v2 key ensures fresh Nov 2026 default window
  const [wubIsBlocked, setWubIsBlocked] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('win11_wub_is_blocked_v2');
      return saved === null ? true : saved === 'true';
    } catch {
      return true;
    }
  });

  const [wubStartDate, setWubStartDate] = useState<string>(() => {
    try {
      return localStorage.getItem('win11_wub_start_date_v2') || '2026-10-29';
    } catch {
      return '2026-10-29';
    }
  });

  const [wubPlannedUnblockDate, setWubPlannedUnblockDate] = useState<string>(() => {
    try {
      return (
        localStorage.getItem('win11_wub_unblock_date_v2') ||
        addDaysToIso(new Date().toISOString().slice(0, 10), 4)
      );
    } catch {
      return addDaysToIso(new Date().toISOString().slice(0, 10), 4);
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
    const timer = setTimeout(() => setToast(null), 6500);
    return () => clearTimeout(timer);
  }, [toast]);

  // Fetch live updates from server when available, merging with verified Nov 2026 releases
  const fetchUpdates = async () => {
    try {
      const resp = await fetch('/api/updates');
      if (resp.ok) {
        const data = await resp.json();
        if (Array.isArray(data.updates) && data.updates.length > 0) {
          const byKb = new Map<string, Win11UpdateItem>();
          for (const item of data.updates) {
            byKb.set(item.kb, item);
          }
          for (const verified of VERIFIED_UPDATES) {
            byKb.set(verified.kb, verified);
          }
          const merged = Array.from(byKb.values()).sort((a, b) =>
            b.releaseDate.localeCompare(a.releaseDate)
          );
          setUpdates(merged);
        }
      }
    } catch {
      // Offline or standalone Android APK mode uses VERIFIED_UPDATES
      setUpdates(VERIFIED_UPDATES);
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
      localStorage.setItem('win11_wub_is_blocked_v2', String(blocked));
    } catch {
      // ignore
    }
  };

  const saveWubStart = (dateIso: string) => {
    setWubStartDate(dateIso);
    try {
      localStorage.setItem('win11_wub_start_date_v2', dateIso);
    } catch {
      // ignore
    }
  };

  const saveWubUnblock = (dateIso: string) => {
    setWubPlannedUnblockDate(dateIso);
    try {
      localStorage.setItem('win11_wub_unblock_date_v2', dateIso);
    } catch {
      // ignore
    }
  };

  // ============================================================================
  // Simplified Risk Meter Calculation:
  // - SAFE:     <= 14 days blocked AND 0 Security KBs missed (or when Unblocked)
  // - MODERATE: 15-30 days blocked OR 1 Security KB missed
  // - HIGH:     > 30 days blocked OR 2+ Security KBs missed OR past Planned Unblock Date
  //
  // Note on Patch Tuesday Batching:
  // On a single Patch Tuesday (e.g. Nov 10, 2026), Microsoft releases 3 branch-specific KBs
  // on the same date: KB5132061 (26H2/25H2/24H2), KB5132059 (26H1), and KB5131087 (23H2).
  // We show all 3 KBs clearly, and count both total Security KB packages and unique Patch
  // Tuesday security cycles so the risk explanation is 100% transparent.
  // ============================================================================
  const wubMetrics = useMemo(() => {
    const updatesInRange = updates
      .filter((u) => u.releaseDate >= wubStartDate)
      .sort((a, b) => b.releaseDate.localeCompare(a.releaseDate));

    const securityUpdates = updatesInRange.filter((u) => isSecurityOrCumulativeUpdate(u));
    const previewUpdates = updatesInRange.filter((u) => !isSecurityOrCumulativeUpdate(u));

    // Check if Oct 28 optional update (KB5127936) came out just before wubStartDate while KB5132061 is inside the window
    const oct28Preview = updates.find((u) => u.kb === 'KB5127936');
    const hasNov10InWindow = securityUpdates.some((u) => u.kb === 'KB5132061');
    const preWindowSupersededPreview =
      wubStartDate > '2026-10-28' && hasNov10InWindow ? oct28Preview : undefined;

    if (!wubIsBlocked) {
      return {
        daysBlocked: 0,
        daysLeft: diffDaysBetweenIso(todayIso, wubPlannedUnblockDate),
        isOverdue: false,
        securityUpdates: [] as Win11UpdateItem[],
        previewUpdates,
        preWindowSupersededPreview,
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
      if (missedCount >= 2) {
        parts.push(
          `${missedCount} Mandatory Security KBs missed (${securityUpdates
            .map((u) => u.kb)
            .slice(0, 4)
            .join(', ')})`
        );
      }
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
      if (missedCount === 1) parts.push(`1 Security KB missed (${securityUpdates[0].kb})`);
      if (daysBlocked >= 15) parts.push(`${daysBlocked} days blocked (15–30d)`);
      riskReason = parts.join(' · ');
    }

    return {
      daysBlocked,
      daysLeft,
      isOverdue,
      securityUpdates,
      previewUpdates,
      preWindowSupersededPreview,
      allInRange: updatesInRange,
      riskLevel,
      riskReason,
    };
  }, [updates, wubStartDate, wubPlannedUnblockDate, wubIsBlocked, todayIso]);

  const triggerPhoneNotification = async (
    title: string,
    body: string,
    kind: 'info' | 'success' | 'warning' = 'info'
  ) => {
    showToast(title, body, kind);

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

    const isHighPriority =
      forceTestPing ||
      (wubIsBlocked &&
        (secUpdates.length > 0 || wubMetrics.isOverdue || wubMetrics.riskLevel === 'HIGH'));

    const title =
      rangeUpdates.length === 0
        ? `No Windows 11 Updates (${activeStart} → ${todayIso})`
        : isHighPriority
        ? `HIGH PRIORITY: ${secUpdates.length} Mandatory Security KB(s) Released (${activeStart} → ${todayIso})`
        : `INFO: ${rangeUpdates.length} Update(s) Since ${activeStart} (0 Security Risk)`;

    const secList =
      secUpdates.map((u) => `${u.kb} (${u.version})`).join(' · ') || 'None';
    const prevList =
      prevUpdates
        .map((u) => {
          const sup = getSupersedingLabel(u, updates);
          return sup ? `${u.kb} [Superseded by ${sup.split(' ')[0]}]` : `${u.kb} (${u.version})`;
        })
        .join(' · ') || 'None in window (Oct 28 KB5127936 rolled into KB5132061)';

    const phoneBody =
      rangeUpdates.length === 0
        ? `0 Windows 11 updates were released between ${activeStart} and ${todayIso}.`
        : `Mandatory Security KBs: ${secList} | Optional Previews: ${prevList}`;

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
        ? [
            ...rangeUpdates.slice(0, 8).map((u) => {
              const sup = getSupersedingLabel(u, updates);
              const extraNote = u.includesPreviewKb
                ? ` *(Also includes all changes from ${u.includesPreviewKb})*`
                : sup
                ? ` *(Superseded by ${sup})*`
                : '';
              return `• **${u.releaseDate}** — \`${u.kb}\` (**${u.version}**, Build \`${u.build}\`) — **${
                isSecurityOrCumulativeUpdate(u)
                  ? '🚨 MANDATORY SECURITY KB'
                  : 'ℹ️ Optional Preview (0 Risk)'
              }**${extraNote}`;
            }),
            activeStart > '2026-10-28' && secUpdates.some((u) => u.kb === 'KB5132061')
              ? `\n*Note: Oct 28 optional update \`KB5127936\` (26H2/25H2) came out just before ${activeStart}, and all its changes are rolled into \`KB5132061\` (Nov 10).*`
              : '',
          ]
            .filter(Boolean)
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
        `Delivered ${rangeUpdates.length} verified update(s) from ${activeStart} → ${todayIso}.`,
        'success'
      );
    } catch {
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
                  { name: 'Mandatory Security KBs', value: secList.slice(0, 240), inline: true },
                  { name: 'Optional Previews / Rollup', value: prevList.slice(0, 240), inline: true },
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
            `Delivered ${rangeUpdates.length} verified update(s) from ${activeStart} → ${todayIso}.`,
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
    const sup = getSupersedingLabel(item, updates);
    const title = isHighPriority
      ? `HIGH PRIORITY Security Update: ${item.kb} (Win11 ${item.version})`
      : `Optional Preview Update (0 Risk): ${item.kb} (Win11 ${item.version})`;
    const body = `${item.releaseDate} · OS Build ${item.build} — ${item.title}${
      sup ? ` [Superseded by ${sup}]` : ''
    }`;

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
          Offline Mode — Showing verified November 2026 Windows 11 update history.
        </div>
      )}

      {/* Top Header — Strict 3-Zone Contract */}
      <header className="sticky top-0 z-30 flex items-center justify-between gap-8 px-4 sm:px-8 py-3.5 bg-[#0B0F17]/95 backdrop-blur-md border-b border-slate-800">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#top"
          className="text-base sm:text-lg font-bold tracking-tight text-white whitespace-nowrap shrink-0 font-display"
        >
          Win11 WUB Safe-Window Notifier
        </a>

        {/* Zone 2: 4 concise single-line nav links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-400">
          <a
            href="#step-discord"
            className="hover:text-white transition-colors whitespace-nowrap shrink-0"
          >
            Discord Setup
          </a>
          <a
            href="#step-dates"
            className="hover:text-white transition-colors whitespace-nowrap shrink-0"
          >
            WUB Dates
          </a>
          <a
            href="#step-updates"
            className="hover:text-white transition-colors whitespace-nowrap shrink-0"
          >
            Nov 2026 KBs
          </a>
          <a
            href="#step-apk"
            className="hover:text-white transition-colors whitespace-nowrap shrink-0"
          >
            Android APK
          </a>
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={handleCheckMicrosoftNow}
            disabled={checkingNow}
            className="min-h-[40px] px-4 py-2 text-xs sm:text-sm font-semibold text-slate-950 bg-sky-400 hover:bg-sky-300 disabled:opacity-60 rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-2 cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${checkingNow ? 'animate-spin' : ''}`} />
            <span>{checkingNow ? 'Checking...' : 'Check Updates & Notify Now'}</span>
          </button>
        </div>
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

      <main id="top" className="max-w-6xl mx-auto px-4 sm:px-8 pt-6 space-y-8">
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
                  className="min-h-[40px] px-4 py-2 text-xs sm:text-sm font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Mark as Unblocked (Reset)</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    saveWubBlocked(true);
                    saveWubStart('2026-10-29');
                    saveWubUnblock(addDaysToIso(todayIso, 4));
                  }}
                  className="min-h-[40px] px-4 py-2 text-xs sm:text-sm font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer"
                >
                  <Lock className="w-4 h-4" />
                  <span>Turn On WUB Window</span>
                </button>
              )}
            </div>
          </div>
        </section>

        {/* =====================================================================
            STEP 1 & STEP 2: DISCORD SETUP + WUB BLOCK DATES
           ===================================================================== */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* STEP 1: Discord Webhook Setup */}
          <div
            id="step-discord"
            className="lg:col-span-6 bg-[#111827] border border-slate-800 rounded-xl p-5 sm:p-6 space-y-4 flex flex-col justify-between scroll-mt-20"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-400 font-mono-tabular">
                <span className="font-semibold text-sky-400">Step 01 · Connect Discord Once</span>
                <span>Auto-saves on device</span>
              </div>
              <h2 className="text-lg font-bold text-white font-display">
                Where Should We Send @everyone Alerts?
              </h2>
              <p className="text-xs text-slate-300 leading-relaxed">
                Paste your Discord Webhook URL once below. Here is how priority routing works:
              </p>
              <ul className="text-xs text-slate-300 space-y-1.5 list-disc list-inside bg-[#0B0F17] p-3.5 rounded-lg border border-slate-800/80">
                <li>
                  <strong className="text-rose-300">Mandatory Security KBs (High Priority):</strong>{' '}
                  When Patch Tuesday KBs (like Nov 10 <code className="text-white">KB5132061</code>,{' '}
                  <code className="text-white">KB5132059</code>,{' '}
                  <code className="text-white">KB5131087</code>) fall inside your WUB block window,
                  it <strong>pings `@everyone`</strong> on Discord and alerts your phone.
                </li>
                <li>
                  <strong className="text-emerald-300">Optional Previews (Standard Info):</strong>{' '}
                  Non-security previews (like Oct 28 <code className="text-white">KB5127936</code>)
                  do not raise your security risk and are automatically marked{' '}
                  <strong>Superseded by KB5132061</strong>.
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
                className="w-full min-h-[44px] px-4 py-2.5 text-xs sm:text-sm font-semibold text-white bg-[#5865F2] hover:bg-[#4752C4] disabled:opacity-60 rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center justify-center gap-2 cursor-pointer"
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

          {/* STEP 2: Set Your WUB Block Dates */}
          <div
            id="step-dates"
            className="lg:col-span-6 bg-[#111827] border border-slate-800 rounded-xl p-5 sm:p-6 space-y-4 flex flex-col justify-between scroll-mt-20"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-400 font-mono-tabular">
                <span className="font-semibold text-emerald-400">
                  Step 02 · Set Your WUB Block Dates
                </span>
                <span>Current Date: {todayIso}</span>
              </div>
              <h2 className="text-lg font-bold text-white font-display">
                When Did You Turn WUB On &amp; When Will You Unblock?
              </h2>
              <p className="text-xs text-slate-300 leading-relaxed">
                Pick your <strong>WUB Start Date</strong>. Changing the date{' '}
                <strong>immediately</strong> checks all verified Microsoft updates from that date
                through today ({todayIso}) and notifies your phone &amp; Discord!
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="space-y-1.5">
                  <label
                    htmlFor="simple-start-date"
                    className="block text-xs font-medium text-slate-300"
                  >
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
                  <label
                    htmlFor="simple-unblock-date"
                    className="block text-xs font-medium text-slate-300"
                  >
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

              {/* Quick Date Buttons */}
              <div className="space-y-1.5 pt-2">
                <span className="block text-xs text-slate-400">
                  Quick WUB Window Presets (auto-notifies phone &amp; Discord):
                </span>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const start = '2026-10-29';
                      const unblock = addDaysToIso(todayIso, 4);
                      saveWubBlocked(true);
                      saveWubStart(start);
                      saveWubUnblock(unblock);
                      sendAlertToPhoneAndDiscord(start, false);
                    }}
                    className="min-h-[36px] px-3 py-1.5 text-xs font-medium text-rose-300 bg-rose-950/50 hover:bg-rose-900/60 border border-rose-700/50 rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    Since Oct 29 (Nov 10 Patch Tuesday Inside Window)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const start = '2026-10-14';
                      const unblock = addDaysToIso(todayIso, 2);
                      saveWubBlocked(true);
                      saveWubStart(start);
                      saveWubUnblock(unblock);
                      sendAlertToPhoneAndDiscord(start, false);
                    }}
                    className="min-h-[36px] px-3 py-1.5 text-xs font-medium text-amber-300 bg-amber-950/50 hover:bg-amber-900/60 border border-amber-700/50 rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    Since Oct 14 (Includes Oct 28 Preview + Nov 10 KBs)
                  </button>
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
                    className="min-h-[36px] px-3 py-1.5 text-xs font-medium text-emerald-300 bg-emerald-950/50 hover:bg-emerald-900/60 border border-emerald-700/50 rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    Blocked Today (0 Missed KBs · SAFE)
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2 text-xs text-slate-400 font-mono-tabular">
              <span>Safe: ≤14d &amp; 0 Sec KBs · Moderate: 15–30d or 1 Sec KB · High: &gt;30d or 2+ Sec KBs</span>
            </div>
          </div>
        </section>

        {/* =====================================================================
            STEP 3: VERIFIED UPDATES DURING YOUR SELECTED WINDOW (ALL VERSIONS)
           ===================================================================== */}
        <section id="step-updates" className="space-y-4 scroll-mt-20">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-xl font-bold text-white font-display">
                Verified Microsoft Updates From {wubStartDate} to {todayIso}
              </h2>
              <p className="text-xs sm:text-sm text-slate-400">
                Showing all Windows 11 versions together (<strong>26H2, 25H2, 24H2, 26H1, 23H2</strong>)
                with automatic superseding detection.
              </p>
            </div>
            <button
              type="button"
              onClick={() => sendAlertToPhoneAndDiscord(wubStartDate, false)}
              disabled={sendingAlert}
              className="min-h-[40px] px-4 py-2 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg whitespace-nowrap shrink-0 flex items-center gap-2 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5 text-sky-400" />
              <span>Re-Send This Range to Discord &amp; Phone</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
            {/* Box A: Mandatory Security / Cumulative KBs (High Priority) */}
            <div className="bg-[#111827] border border-slate-800 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0" />
                  <div>
                    <h3 className="text-base font-bold text-white font-display">
                      Mandatory Security &amp; Cumulative KBs ({wubMetrics.securityUpdates.length})
                    </h3>
                    <p className="text-xs text-rose-300">
                      Patch Tuesday Security Updates — Raises Risk Meter &amp; Pings @everyone
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
                    No mandatory Patch Tuesday security updates have dropped since {wubStartDate}.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {wubMetrics.securityUpdates.map((item) => {
                    const isChecked = Boolean(checkedKbs[item.kb]);
                    const sup = getSupersedingLabel(item, updates);
                    return (
                      <div
                        key={item.id}
                        className="bg-[#0B0F17] border border-slate-800 rounded-lg p-4 space-y-2.5"
                      >
                        {/* Unboxed Metadata Line */}
                        <div className="flex flex-wrap items-center gap-1.5 text-xs font-mono-tabular">
                          <span className="text-rose-400 font-bold">MANDATORY SECURITY KB</span>
                          <span aria-hidden="true">·</span>
                          <span className="text-white font-bold">{item.kb}</span>
                          <span aria-hidden="true">·</span>
                          <span className="text-sky-400 font-semibold">Win11 {item.version}</span>
                          <span aria-hidden="true">·</span>
                          <span className="text-slate-300">Released {item.releaseDate}</span>
                        </div>

                        <p className="text-xs text-slate-400 font-mono-tabular">
                          OS Builds: {item.build}
                        </p>

                        <p className="text-xs sm:text-sm font-semibold text-white">
                          {item.title}
                        </p>

                        <p className="text-xs text-slate-300 leading-relaxed">
                          {item.highlights}
                        </p>

                        {item.includesPreviewKb && (
                          <p className="text-xs text-emerald-300 font-mono-tabular">
                            Supersedes &amp; includes all changes from: {item.includesPreviewKb}
                          </p>
                        )}

                        {sup && (
                          <p className="text-xs text-amber-300 font-mono-tabular">
                            Superseded by: {sup} (Install the newer KB instead)
                          </p>
                        )}

                        <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-slate-800/80">
                          <button
                            type="button"
                            onClick={() =>
                              setCheckedKbs((prev) => ({ ...prev, [item.kb]: !prev[item.kb] }))
                            }
                            className={`text-xs font-medium px-2.5 py-1.5 rounded flex items-center gap-1.5 cursor-pointer ${
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
                            className="text-xs font-semibold px-3 py-1.5 rounded bg-rose-600 hover:bg-rose-500 text-white flex items-center gap-1 cursor-pointer"
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

            {/* Box B: Optional Preview Updates & Superseding Context (0 Risk — Safe to Skip) */}
            <div className="bg-[#111827] border border-slate-800 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
                  <div>
                    <h3 className="text-base font-bold text-white font-display">
                      Optional Preview Updates ({wubMetrics.previewUpdates.length})
                    </h3>
                    <p className="text-xs text-emerald-300">
                      0 Security Risk — Safe to Skip &amp; Auto-Marked When Superseded
                    </p>
                  </div>
                </div>
              </div>

              {/* Pre-Window Superseding Notice when WUB Start Date is just after Oct 28 */}
              {wubMetrics.preWindowSupersededPreview && (
                <div className="bg-[#0B0F17] border border-sky-800/60 rounded-lg p-4 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-1.5 text-xs font-mono-tabular">
                    <span className="text-sky-400 font-bold">PRE-WINDOW ROLLUP NOTE</span>
                    <span aria-hidden="true">·</span>
                    <span className="text-white font-bold">
                      {wubMetrics.preWindowSupersededPreview.kb}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="text-slate-300">
                      Released {wubMetrics.preWindowSupersededPreview.releaseDate}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    The October 28 optional preview update{' '}
                    <code className="text-white font-mono-tabular">KB5127936</code> (Win11 26H2 &amp;
                    25H2, Builds <code className="text-slate-200">26300.9818 · 26200.9818</code>)
                    came out just before your <code className="text-white">{wubStartDate}</code>{' '}
                    start date. It is now{' '}
                    <strong className="text-emerald-300">
                      Superseded by KB5132061 (2026-11-10)
                    </strong>
                    , which includes every change from <code className="text-white">KB5127936</code>.
                  </p>
                </div>
              )}

              {wubMetrics.previewUpdates.length === 0 ? (
                <div className="bg-[#0B0F17] border border-slate-800 rounded-lg p-5 text-center space-y-1.5">
                  <p className="text-sm font-medium text-slate-300">
                    0 Optional Preview Updates Released Inside {wubStartDate} → {todayIso}
                  </p>
                  <p className="text-xs text-slate-400">
                    Set your start date to <strong>2026-10-14</strong> (or tap the preset button in
                    Step 2) to see the October 28 optional update (<code>KB5127936</code>) inside
                    the range.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {wubMetrics.previewUpdates.map((item) => {
                    const sup = getSupersedingLabel(item, updates);
                    return (
                      <div
                        key={item.id}
                        className="bg-[#0B0F17] border border-slate-800 rounded-lg p-4 space-y-2"
                      >
                        <div className="flex flex-wrap items-center gap-1.5 text-xs font-mono-tabular text-slate-400">
                          <span className="text-emerald-400 font-bold">
                            OPTIONAL PREVIEW (0 RISK)
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className="text-white font-bold">{item.kb}</span>
                          <span aria-hidden="true">·</span>
                          <span className="text-sky-400">Win11 {item.version}</span>
                          <span aria-hidden="true">·</span>
                          <span>Released {item.releaseDate}</span>
                        </div>

                        <p className="text-xs text-slate-400 font-mono-tabular">
                          OS Builds: {item.build}
                        </p>

                        <p className="text-xs sm:text-sm font-semibold text-white">{item.title}</p>
                        <p className="text-xs text-slate-300 leading-relaxed">{item.highlights}</p>

                        {sup && (
                          <p className="text-xs font-semibold text-amber-300 font-mono-tabular">
                            Status: Superseded by {sup}
                          </p>
                        )}

                        <div className="pt-2 border-t border-slate-800/80 flex justify-end">
                          <button
                            type="button"
                            onClick={() => sendSingleKbAlert(item)}
                            className="text-xs font-medium px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center gap-1 cursor-pointer"
                          >
                            <Bell className="w-3 h-3 text-sky-400" />
                            <span>Send Normal Info Alert (No Ping)</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* =====================================================================
            STEP 4: ANDROID APK DOWNLOAD & COMPLETE SEP–NOV 2026 TIMELINE
           ===================================================================== */}
        <section
          id="step-apk"
          className="bg-[#111827] border border-slate-800 rounded-xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 scroll-mt-20"
        >
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white font-display flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-emerald-400" />
              <span>Android App (.apk) &amp; Complete Verified Timeline (Sep – Nov 2026)</span>
            </h3>
            <p className="text-xs text-slate-400">
              Push to your <strong>mishramukti982-gif/Win11</strong> GitHub repo to rebuild the
              Android APK with the verified November 10, 2026 release data.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <a
              href="https://github.com/mishramukti982-gif/Win11/releases/download/v1.0.0/Win11-Update-Notifier-Android.apk"
              target="_blank"
              rel="noopener noreferrer"
              className="min-h-[40px] px-4 py-2 text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg whitespace-nowrap shrink-0 flex items-center gap-1.5"
            >
              <Download className="w-4 h-4" />
              <span>Download Android APK</span>
            </a>

            <button
              type="button"
              onClick={() => setShowAllHistory((prev) => !prev)}
              className="min-h-[40px] px-3.5 py-2 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer"
            >
              <span>
                {showAllHistory
                  ? 'Hide Complete Sep–Nov 2026 Table'
                  : `Show All ${updates.length} Verified Updates`}
              </span>
              {showAllHistory ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>
          </div>
        </section>

        {/* Full Verified Update History Table */}
        {showAllHistory && (
          <section className="bg-[#111827] border border-slate-800 rounded-xl divide-y divide-slate-800">
            {updates.map((item) => {
              const isSec = isSecurityOrCumulativeUpdate(item);
              const sup = getSupersedingLabel(item, updates);
              return (
                <div
                  key={`all-${item.id}`}
                  className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 max-w-3xl">
                    <div className="flex flex-wrap items-center gap-2 text-xs font-mono-tabular">
                      <span
                        className={
                          isSec ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'
                        }
                      >
                        {isSec ? 'MANDATORY SECURITY KB' : 'OPTIONAL PREVIEW (0 RISK)'}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="text-white font-bold">{item.kb}</span>
                      <span aria-hidden="true">·</span>
                      <span className="text-sky-400 font-semibold">Win11 {item.version}</span>
                      <span aria-hidden="true">·</span>
                      <span className="text-slate-300">Builds: {item.build}</span>
                      <span aria-hidden="true">·</span>
                      <span className="text-white font-semibold">Released {item.releaseDate}</span>
                    </div>
                    <p className="text-sm sm:text-base font-semibold text-white">{item.title}</p>
                    <p className="text-xs text-slate-300 leading-relaxed">{item.highlights}</p>
                    {item.includesPreviewKb && (
                      <p className="text-xs text-emerald-300 font-mono-tabular">
                        Includes all changes from: {item.includesPreviewKb}
                      </p>
                    )}
                    {sup && (
                      <p className="text-xs text-amber-300 font-mono-tabular">
                        Superseded by: {sup}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => sendSingleKbAlert(item)}
                      className="min-h-[38px] px-3 py-1.5 text-xs font-medium text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5 text-sky-400" />
                      <span>Alert {item.kb}</span>
                    </button>
                    <a
                      href={item.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="min-h-[38px] px-3 py-1.5 text-xs font-medium text-sky-400 bg-[#0B0F17] border border-slate-800 rounded-lg whitespace-nowrap shrink-0 flex items-center gap-1"
                    >
                      <span>Microsoft KB</span>
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
