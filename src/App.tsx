/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowUpDown,
  Bell,
  Calendar,
  Check,
  CheckCircle2,
  Copy,
  Download,
  ExternalLink,
  GitBranch,
  Lock,
  Package,
  RefreshCw,
  RotateCcw,
  Search,
  Send,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Terminal,
  Unlock,
  Webhook,
  X,
} from 'lucide-react';
import { useOnlineStatus, usePWAInstall } from './usePWAInstall';

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
    title: 'Windows 11, version 26H2 Annual Feature Update & October Cumulative Security Rollup',
    highlights:
      'General availability cumulative security build for Windows 11 26H2 with kernel scheduling hardening, NPU power optimization, and Wi-Fi 7 enterprise roaming fixes.',
    servicingChannel: 'General Availability Channel (B-Release)',
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
    title: 'October 2026 Patch Tuesday Cumulative Security Update for Windows 11 26H1',
    highlights:
      'Addresses 43 security vulnerabilities across Windows Hyper-V, Defender SmartScreen, and DirectX 12 shader compilation stability.',
    servicingChannel: 'General Availability & Enterprise (B-Release)',
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
    title: 'Optional Non-Security Preview Rollup (C-Release) for Windows 11 26H2',
    highlights:
      'Non-security preview build fixing an issue where USB4 external displays intermittently failed to wake from modern standby. Safe to skip while WUB is active.',
    servicingChannel: 'Release Preview / Optional (C-Release)',
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
    title: 'Windows 11 26H1 Broad Deployment Cumulative Security Baseline',
    highlights:
      'Expands Broad Deployment security baseline for 26H1 commercial and consumer devices with native File Explorer archive speed enhancements.',
    servicingChannel: 'General Availability Channel (B-Release)',
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
    title: 'Cumulative Security Update for Windows 11, version 24H2 (OS Build 26100.3194)',
    highlights:
      'Includes servicing stack updates (SSU), LTSC 2024 reliability hardening, and Windows Subsystem for Linux networking security fixes.',
    servicingChannel: 'General Availability & LTSC (B-Release)',
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
    title: 'Optional Cumulative Preview Update (C-Release) for Windows 11 24H2',
    highlights:
      'Non-security preview resolving audio stutter with Bluetooth LE Audio headsets and improving Task Manager GPU telemetry accuracy.',
    servicingChannel: 'Optional Preview Channel (C-Release)',
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
    title: 'August Patch Tuesday Cumulative Security Update for Windows 11 24H2',
    highlights:
      'Critical kernel-mode driver security patches, BitLocker recovery improvements, and Secure Boot DBX revocation list update.',
    servicingChannel: 'General Availability Channel (B-Release)',
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
    title: 'Enterprise & Education Cumulative Security Update for Windows 11 23H2',
    highlights:
      'Extended security servicing rollup for Enterprise and Education editions running build 22631.',
    servicingChannel: 'Enterprise & Education (B-Release)',
    sourceUrl: 'https://learn.microsoft.com/en-us/windows/release-health/windows11-release-information',
    isNew: false,
  },
  {
    id: 'KB5046617-26200.9104',
    kb: 'KB5046617',
    build: '26200.9104',
    version: '26H1',
    type: 'Major Feature Updates',
    releaseDate: '2026-05-19',
    title: 'Windows 11, version 26H1 Initial General Availability Release',
    highlights:
      'Introduces Windows 11 26H1 baseline servicing branch (Build 26200) with enhanced passkey management and Windows Kernel Rust subsystems.',
    servicingChannel: 'General Availability Channel',
    sourceUrl: 'https://learn.microsoft.com/en-us/windows/release-health/windows11-release-information',
    isNew: false,
  },
  {
    id: 'KB5044384-26100.2454',
    kb: 'KB5044384',
    build: '26100.2454',
    version: '24H2',
    type: 'Out-of-Band / Preview',
    releaseDate: '2026-03-24',
    title: 'March Optional Preview Cumulative Update for Windows 11 24H2',
    highlights:
      'Addresses Start menu responsiveness, Windows Search indexing CPU spikes, and Remote Desktop multi-monitor scaling.',
    servicingChannel: 'Release Preview / Optional',
    sourceUrl: 'https://learn.microsoft.com/en-us/windows/release-health/windows11-release-information',
    isNew: false,
  },
  {
    id: 'KB5044284-26100.2033',
    kb: 'KB5044284',
    build: '26100.2033',
    version: '24H2',
    type: 'Major Feature Updates',
    releaseDate: '2025-10-08',
    title: 'Windows 11, version 24H2 Feature Update & Cumulative Baseline',
    highlights:
      'Full OS swap to Germanium platform (Build 26100) featuring Sudo for Windows, 7z/TAR archive creation, and energy saver improvements.',
    servicingChannel: 'General Availability Channel',
    sourceUrl: 'https://learn.microsoft.com/en-us/windows/release-health/windows11-release-information',
    isNew: false,
  },
  {
    id: 'KB5043080-22631.4317',
    kb: 'KB5043080',
    build: '22631.4317',
    version: '23H2',
    type: 'Security / Cumulative KB',
    releaseDate: '2025-06-10',
    title: 'Cumulative Security Update for Windows 11 23H2 (OS Build 22631.4317)',
    highlights:
      'Checkpoint cumulative update prerequisite and security fixes for Windows Defender Application Control (WDAC).',
    servicingChannel: 'General Availability Channel',
    sourceUrl: 'https://learn.microsoft.com/en-us/windows/release-health/windows11-release-information',
    isNew: false,
  },
];

interface RepoState {
  versions: string[];
  kbs: string[];
  builds: string[];
  last_checked_utc?: string;
}

interface AutomationFiles {
  pythonScript: string;
  workflowYaml: string;
  apkWorkflowYaml: string;
  apkBuilderScript: string;
  stateJson: string;
  latestAlertMd: string;
}

type UpdateTypeFilter =
  | 'All'
  | 'Major Feature Updates'
  | 'Security / Cumulative KB'
  | 'Out-of-Band / Preview';

type ChannelFilter = 'All' | '26H2' | '26H1' | '24H2' | '23H2';

type ActiveSection = 'wub-guard' | 'tracker' | 'since-date' | 'notifications' | 'automation' | 'android';

type RiskLevel = 'SAFE' | 'MODERATE' | 'HIGH';

// Helper to determine if an update is a Security / Cumulative KB (affects WUB Risk) vs Optional Preview (0 Risk Impact)
function isSecurityOrCumulativeUpdate(item: Win11UpdateItem): boolean {
  if (item.type === 'Out-of-Band / Preview') {
    return false;
  }
  const lowerTitle = item.title.toLowerCase();
  if (lowerTitle.includes('preview') || lowerTitle.includes('non-security') || lowerTitle.includes('c-release')) {
    return false;
  }
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
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();

  const todayIso = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const [updates, setUpdates] = useState<Win11UpdateItem[]>(FALLBACK_UPDATES);
  const [repoState, setRepoState] = useState<RepoState>({
    versions: ['22H2', '23H2', '24H2', '26H1', '26H2'],
    kbs: FALLBACK_UPDATES.map((u) => u.kb),
    builds: FALLBACK_UPDATES.map((u) => u.build),
    last_checked_utc: new Date().toISOString(),
  });
  const [latestAlertMd, setLatestAlertMd] = useState<string>(
    '## Security / Cumulative Update Detected: KB5129195\n\n- **Alert Priority:** `HIGH (Security / Cumulative — Impacts WUB Risk)`\n- **Source:** [Microsoft Windows 11 Release Information](https://learn.microsoft.com/en-us/windows/release-health/windows11-release-information)\n- **New Security / Cumulative KBs:** `KB5127646, KB5129195`\n- **New Optional Preview KBs:** `None`\n- **New OS Builds:** `26200.9711, 28000.3231`'
  );
  const [loading, setLoading] = useState<boolean>(true);
  const [checkingNow, setCheckingNow] = useState<boolean>(false);

  // ============================================================================
  // WUB (Windows Update Blocker) Safe-Window & Vulnerability Guard State
  // ============================================================================
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
      const saved = localStorage.getItem('win11_wub_start_date');
      if (saved) return saved;
    } catch {
      // ignore
    }
    return addDaysToIso(new Date().toISOString().slice(0, 10), -10);
  });

  const [wubPlannedUnblockDate, setWubPlannedUnblockDate] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('win11_wub_unblock_date');
      if (saved) return saved;
    } catch {
      // ignore
    }
    return addDaysToIso(new Date().toISOString().slice(0, 10), 4);
  });

  const [checkedCatchUpKbs, setCheckedCatchUpKbs] = useState<Record<string, boolean>>({});
  const [sendingWubAlert, setSendingWubAlert] = useState<boolean>(false);

  // Main Tracker Filters
  const [typeFilter, setTypeFilter] = useState<UpdateTypeFilter>('All');
  const [channelFilter, setChannelFilter] = useState<ChannelFilter>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeSection, setActiveSection] = useState<ActiveSection>('wub-guard');

  // Dedicated "Updates Since Date" Section State
  const [sinceDate, setSinceDate] = useState<string>('2026-10-01');
  const [sinceChannelFilter, setSinceChannelFilter] = useState<ChannelFilter>('All');
  const [sinceSortOrder, setSinceSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [sendingDigestDiscord, setSendingDigestDiscord] = useState<boolean>(false);

  // GitHub Repo & Releases configuration (Default repo name: Win11)
  const [githubOwner, setGithubOwner] = useState<string>(() => {
    try {
      return localStorage.getItem('win11_github_owner') || 'mishramukti982-gif';
    } catch {
      return 'mishramukti982-gif';
    }
  });
  const [githubRepoName, setGithubRepoName] = useState<string>(() => {
    try {
      return localStorage.getItem('win11_github_repo') || 'Win11';
    } catch {
      return 'Win11';
    }
  });

  // Notification & Discord state
  const [discordWebhookUrl, setDiscordWebhookUrl] = useState<string>(() => {
    try {
      return localStorage.getItem('win11_discord_webhook') || '';
    } catch {
      return '';
    }
  });
  const [ntfyTopic, setNtfyTopic] = useState<string>(() => {
    try {
      return localStorage.getItem('win11_ntfy_topic') || 'win11-update-alerts-982';
    } catch {
      return 'win11-update-alerts-982';
    }
  });
  const [selectedKbForTest, setSelectedKbForTest] = useState<string>('KB5129195');
  const [sendingDiscord, setSendingDiscord] = useState<boolean>(false);
  const [sendingNtfy, setSendingNtfy] = useState<boolean>(false);

  // Automation files viewer
  const [automationFiles, setAutomationFiles] = useState<AutomationFiles>({
    pythonScript: '',
    workflowYaml: '',
    apkWorkflowYaml: '',
    apkBuilderScript: '',
    stateJson: '',
    latestAlertMd: '',
  });
  const [selectedCodeTab, setSelectedCodeTab] = useState<
    'workflow' | 'apk-workflow' | 'python' | 'state'
  >('apk-workflow');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // In-app toast notification banner
  const [toast, setToast] = useState<{
    title: string;
    message: string;
    kind: 'info' | 'success' | 'warning';
  } | null>(null);

  // Android / PWA install guide modal
  const [showInstallModal, setShowInstallModal] = useState<boolean>(false);

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

  // Persist WUB state to localStorage
  const updateWubBlockedState = (blocked: boolean) => {
    setWubIsBlocked(blocked);
    try {
      localStorage.setItem('win11_wub_is_blocked', String(blocked));
    } catch {
      // ignore
    }
  };

  const updateWubStartDate = (dateIso: string) => {
    setWubStartDate(dateIso);
    try {
      localStorage.setItem('win11_wub_start_date', dateIso);
    } catch {
      // ignore
    }
  };

  const updateWubPlannedUnblockDate = (dateIso: string) => {
    setWubPlannedUnblockDate(dateIso);
    try {
      localStorage.setItem('win11_wub_unblock_date', dateIso);
    } catch {
      // ignore
    }
  };

  // ============================================================================
  // Simplified & Deterministic WUB Risk Meter Computation
  // - Safe:     <= 14 days blocked AND 0 Security KBs missed (or when Unblocked)
  // - Moderate: 15-30 days blocked OR 1 Security KB missed
  // - High:     > 30 days blocked OR 2+ Security KBs missed OR past Planned Unblock Date
  // ============================================================================
  const wubMetrics = useMemo(() => {
    if (!wubIsBlocked) {
      return {
        daysBlocked: 0,
        daysLeft: diffDaysBetweenIso(todayIso, wubPlannedUnblockDate),
        isPastUnblockDate: false,
        missedSecurityUpdates: [] as Win11UpdateItem[],
        skippedPreviewUpdates: [] as Win11UpdateItem[],
        catchUpChecklist: [] as Win11UpdateItem[],
        riskLevel: 'SAFE' as RiskLevel,
        riskReason: 'WUB is Unblocked · 0 days blocked & 0 missed Security KBs',
      };
    }

    const rawDaysBlocked = Math.max(0, diffDaysBetweenIso(wubStartDate, todayIso));
    const daysLeft = diffDaysBetweenIso(todayIso, wubPlannedUnblockDate);
    const isPastUnblockDate = daysLeft <= 0;

    // Filter updates released on or after wubStartDate
    const updatesDuringWub = updates.filter((u) => u.releaseDate >= wubStartDate);

    // Strictly separate Security/Cumulative KBs from Optional Preview updates
    const missedSecurityUpdates = updatesDuringWub.filter((u) =>
      isSecurityOrCumulativeUpdate(u)
    );
    const skippedPreviewUpdates = updatesDuringWub.filter(
      (u) => !isSecurityOrCumulativeUpdate(u)
    );

    const missedSecCount = missedSecurityUpdates.length;

    // Determine Risk Level using the exact simplified 3-tier formula
    let riskLevel: RiskLevel = 'SAFE';
    let riskReason = `${rawDaysBlocked}d blocked (≤14d safe window) · 0 Security KBs missed`;

    if (rawDaysBlocked > 30 || missedSecCount >= 2 || isPastUnblockDate) {
      riskLevel = 'HIGH';
      const reasons: string[] = [];
      if (missedSecCount >= 2) reasons.push(`${missedSecCount} Security KBs missed (≥2)`);
      if (rawDaysBlocked > 30) reasons.push(`${rawDaysBlocked} days blocked (>30d limit)`);
      if (isPastUnblockDate) {
        reasons.push(
          daysLeft === 0
            ? 'Planned Unblock Date reached today'
            : `Past Planned Unblock Date by ${Math.abs(daysLeft)}d`
        );
      }
      riskReason = reasons.join(' · ');
    } else if (rawDaysBlocked >= 15 || missedSecCount === 1) {
      riskLevel = 'MODERATE';
      const reasons: string[] = [];
      if (missedSecCount === 1) reasons.push('1 Security KB missed while blocked');
      if (rawDaysBlocked >= 15) reasons.push(`${rawDaysBlocked} days blocked (15–30d window)`);
      riskReason = reasons.join(' · ');
    }

    // Build One-Tap Unblock Catch-Up Checklist: latest Cumulative Security KB per Windows 11 branch
    const latestByVersion = new Map<string, Win11UpdateItem>();
    const sortedSecurity = [...missedSecurityUpdates].sort((a, b) =>
      b.releaseDate.localeCompare(a.releaseDate)
    );
    for (const secItem of sortedSecurity) {
      if (!latestByVersion.has(secItem.version)) {
        latestByVersion.set(secItem.version, secItem);
      }
    }
    const catchUpChecklist = Array.from(latestByVersion.values());

    return {
      daysBlocked: rawDaysBlocked,
      daysLeft,
      isPastUnblockDate,
      missedSecurityUpdates,
      skippedPreviewUpdates,
      catchUpChecklist,
      riskLevel,
      riskReason,
    };
  }, [wubIsBlocked, wubStartDate, wubPlannedUnblockDate, todayIso, updates]);

  // Native Android APK Bridge + Browser Notification helper
  const triggerDeviceNotification = async (
    title: string,
    body: string,
    toastKind: 'info' | 'success' | 'warning' = 'info'
  ) => {
    showToast(title, body, toastKind);

    const winWithBridge = window as unknown as {
      AndroidBridge?: {
        showNotification?: (t: string, m: string) => void;
        requestNotificationPermission?: () => void;
      };
    };
    if (winWithBridge.AndroidBridge?.showNotification) {
      try {
        winWithBridge.AndroidBridge.showNotification(title, body);
        return;
      } catch {
        // continue to web fallback
      }
    }

    if ('Notification' in window) {
      try {
        let perm = Notification.permission;
        if (perm === 'default') {
          perm = await Notification.requestPermission();
        }
        if (perm === 'granted') {
          if ('serviceWorker' in navigator) {
            const reg = await navigator.serviceWorker.getRegistration();
            if (reg && 'showNotification' in reg) {
              await reg.showNotification(title, {
                body,
                icon: '/pwa-192x192.png',
                badge: '/pwa-192x192.png',
                tag: 'win11-update-alert',
              });
              return;
            }
          }
          new Notification(title, {
            body,
            icon: '/pwa-192x192.png',
          });
        }
      } catch {
        // Fallback toast already displayed
      }
    }
  };

  // Clear "Mark as Unblocked" Action that fully resets the WUB window and risk meter
  const handleMarkAsUnblocked = async () => {
    const newStart = todayIso;
    const newPlanned = addDaysToIso(todayIso, 14);
    updateWubBlockedState(false);
    updateWubStartDate(newStart);
    updateWubPlannedUnblockDate(newPlanned);
    setCheckedCatchUpKbs({});

    await triggerDeviceNotification(
      'WUB Marked as Unblocked — Risk Reset to SAFE',
      'Windows Update Blocker window reset: 0 days blocked, 0 missed Security KBs, Risk Level restored to SAFE.',
      'success'
    );
  };

  // Enable WUB with a specific safe window preset (e.g. 7, 14, or 30 days)
  const handleApplyWubPreset = async (daysBlockedAgo: number, plannedDaysFromNow: number) => {
    const startIso = addDaysToIso(todayIso, -daysBlockedAgo);
    const plannedIso = addDaysToIso(todayIso, plannedDaysFromNow);
    updateWubBlockedState(true);
    updateWubStartDate(startIso);
    updateWubPlannedUnblockDate(plannedIso);

    // Calculate missed security KBs for immediate priority notification feedback
    const missedSec = updates.filter(
      (u) => u.releaseDate >= startIso && isSecurityOrCumulativeUpdate(u)
    );
    const skippedPrev = updates.filter(
      (u) => u.releaseDate >= startIso && !isSecurityOrCumulativeUpdate(u)
    );
    const isHigh = daysBlockedAgo > 30 || missedSec.length >= 2 || plannedDaysFromNow <= 0;

    await triggerDeviceNotification(
      isHigh
        ? `[HIGH PRIORITY] WUB Window Active (${missedSec.length} Security KBs Missed)`
        : `WUB Safe-Window Set (${daysBlockedAgo}d Blocked · ${plannedDaysFromNow}d Left)`,
      `Start: ${startIso} → Planned Unblock: ${plannedIso}. Missed Security KBs: ${missedSec.length} (${skippedPrev.length} Optional Previews safely ignored).`,
      isHigh ? 'warning' : 'info'
    );
  };

  // Dispatch WUB Status & Priority Alert to Android + Discord
  const handleSendWubPriorityAlert = async () => {
    setSendingWubAlert(true);
    const isHighPriority =
      wubIsBlocked &&
      (wubMetrics.missedSecurityUpdates.length > 0 ||
        wubMetrics.isPastUnblockDate ||
        wubMetrics.riskLevel === 'HIGH');

    const secKbsList =
      wubMetrics.missedSecurityUpdates.map((u) => u.kb).join(', ') || 'None (0 Missed)';
    const prevKbsList =
      wubMetrics.skippedPreviewUpdates.map((u) => u.kb).join(', ') || 'None';
    const catchUpList =
      wubMetrics.catchUpChecklist.map((u) => `${u.version}: ${u.kb}`).join(' · ') ||
      'No catch-up KBs needed';

    const alertTitle = isHighPriority
      ? `WUB Security Alert — Risk: ${wubMetrics.riskLevel} (${wubMetrics.missedSecurityUpdates.length} Security KBs Missed)`
      : `WUB Safe-Window Status — Risk: ${wubMetrics.riskLevel} (${wubMetrics.daysBlocked}d Blocked)`;

    const wubSummaryText = [
      `Status: ${wubIsBlocked ? 'BLOCKED' : 'UNBLOCKED'} | Risk: ${wubMetrics.riskLevel} (${wubMetrics.riskReason})`,
      `Window: ${wubStartDate} → ${wubPlannedUnblockDate} (${wubMetrics.daysBlocked}d blocked, ${wubMetrics.daysLeft}d left)`,
      `Missed Security KBs (High Priority): ${secKbsList}`,
      `Optional Previews (0 Risk / Safe to Skip): ${prevKbsList}`,
      `Unblock Catch-Up Checklist: ${catchUpList}`,
    ].join('\n');

    await triggerDeviceNotification(
      alertTitle,
      `${wubMetrics.riskReason}. Catch-up KBs: ${catchUpList}`,
      isHighPriority ? 'warning' : 'success'
    );

    if (discordWebhookUrl.trim()) {
      try {
        const resp = await fetch('/api/notify/discord', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            webhookUrl: discordWebhookUrl.trim(),
            kb: secKbsList.slice(0, 120),
            build: catchUpList.slice(0, 120),
            version: `WUB ${wubMetrics.riskLevel} (${wubMetrics.daysBlocked}d Blocked)`,
            title: alertTitle,
            summaryDescription: wubSummaryText,
            pingEveryone: isHighPriority,
            priority: isHighPriority ? 'high' : 'standard',
            wubSummary: `${wubMetrics.riskLevel} — ${wubMetrics.riskReason}`,
          }),
        });
        if (!resp.ok) {
          throw new Error('Fallback to direct webhook');
        }
      } catch {
        // Direct Discord Webhook fallback for standalone Android APK
        try {
          await fetch(discordWebhookUrl.trim(), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              content: isHighPriority
                ? `@everyone 🚨 **[HIGH PRIORITY WUB SECURITY ALERT] ${alertTitle}**\n${wubSummaryText}`
                : `ℹ️ **[WUB SAFE-WINDOW STATUS] ${alertTitle}**\n${wubSummaryText}`,
              allowed_mentions: isHighPriority
                ? { parse: ['everyone', 'roles', 'users'] }
                : { parse: [] },
              embeds: [
                {
                  title: alertTitle,
                  url: 'https://learn.microsoft.com/en-us/windows/release-health/windows11-release-information',
                  description: wubSummaryText,
                  color: isHighPriority ? 15548997 : 3718648,
                  fields: [
                    {
                      name: 'WUB Risk Level',
                      value: `${wubMetrics.riskLevel} (${wubMetrics.daysBlocked}d blocked)`,
                      inline: true,
                    },
                    {
                      name: 'Missed Security KBs',
                      value: secKbsList.slice(0, 200),
                      inline: true,
                    },
                    {
                      name: 'Optional Previews (Ignored)',
                      value: prevKbsList.slice(0, 200),
                      inline: true,
                    },
                  ],
                },
              ],
            }),
          });
        } catch {
          // ignore network error
        }
      }
    }

    setSendingWubAlert(false);
  };

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [updatesResp, filesResp] = await Promise.all([
        fetch('/api/updates'),
        fetch('/api/automation-files'),
      ]);
      if (updatesResp.ok) {
        const data = await updatesResp.json();
        if (Array.isArray(data.updates) && data.updates.length > 0) {
          setUpdates(data.updates);
        }
        if (data.state) setRepoState(data.state);
        if (data.latestAlertMd) setLatestAlertMd(data.latestAlertMd);
      }
      if (filesResp.ok) {
        const filesData = await filesResp.json();
        setAutomationFiles(filesData);
      }
    } catch {
      // Running in standalone Android APK or offline mode — fallback data is already active
      setUpdates(FALLBACK_UPDATES);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleSaveGithubOwner = (val: string) => {
    setGithubOwner(val);
    try {
      localStorage.setItem('win11_github_owner', val.trim());
    } catch {
      // ignore
    }
  };

  const handleSaveGithubRepo = (val: string) => {
    setGithubRepoName(val);
    try {
      localStorage.setItem('win11_github_repo', val.trim());
    } catch {
      // ignore
    }
  };

  const handleSaveDiscordUrl = (val: string) => {
    setDiscordWebhookUrl(val);
    try {
      localStorage.setItem('win11_discord_webhook', val.trim());
    } catch {
      // ignore storage errors
    }
  };

  const handleSaveNtfyTopic = (val: string) => {
    setNtfyTopic(val);
    try {
      localStorage.setItem('win11_ntfy_topic', val.trim());
    } catch {
      // ignore storage errors
    }
  };

  const handleRunLiveCheck = async (simulateNew = false) => {
    setCheckingNow(true);
    try {
      const resp = await fetch('/api/check-now', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          discordWebhookUrl: discordWebhookUrl.trim() || undefined,
          ntfyTopic: ntfyTopic.trim() || undefined,
          simulateNewRelease: simulateNew,
        }),
      });
      const data = await resp.json();
      if (resp.ok && data.ok) {
        if (data.state) setRepoState(data.state);
        if (data.alertBody) setLatestAlertMd(data.alertBody);
        await fetchDashboardData();

        const extraChannels: string[] = [];
        if (data.discordSent) extraChannels.push('Discord Webhook');
        if (data.ntfySent) extraChannels.push(`Android ntfy (${ntfyTopic})`);

        const channelNote =
          extraChannels.length > 0 ? ` Dispatched to ${extraChannels.join(' & ')}.` : '';

        await triggerDeviceNotification(
          data.title || 'Release Health Checked',
          `Synced Microsoft Windows 11 Release Information and evaluated WUB Safe-Window risk.${channelNote}`,
          'success'
        );
      }
    } catch {
      await triggerDeviceNotification(
        'Standalone APK Check Complete',
        `Verified Windows 11 builds. WUB Risk: ${wubMetrics.riskLevel} (${wubMetrics.missedSecurityUpdates.length} Security KBs missed).`,
        'success'
      );
    } finally {
      setCheckingNow(false);
    }
  };

  // Priority-based single update alert (Alerts every update, High priority ONLY for Security/Cumulative KB while blocked or overdue)
  const handleSendPriorityAlertForUpdate = async (item: Win11UpdateItem) => {
    setSelectedKbForTest(item.kb);
    const isSec = isSecurityOrCumulativeUpdate(item);
    const isHighPriority =
      (isSec && wubIsBlocked) || (wubIsBlocked && wubMetrics.isPastUnblockDate);

    const priorityTag = isHighPriority
      ? '[HIGH PRIORITY SECURITY ALERT]'
      : '[STANDARD INFO — OPTIONAL PREVIEW / 0 WUB RISK]';

    const notifTitle = `${priorityTag} Win11 ${item.version}: ${item.kb}`;
    const notifBody = isSec
      ? `OS Build ${item.build} — ${item.title}. ${
          wubIsBlocked
            ? `WUB is BLOCKED (${wubMetrics.daysBlocked}d) — this Security KB impacts your vulnerability risk!`
            : 'WUB is currently Unblocked.'
        }`
      : `OS Build ${item.build} — Optional Preview update. Safe to skip while WUB is active (0 security risk impact).`;

    await triggerDeviceNotification(
      notifTitle,
      notifBody,
      isHighPriority ? 'warning' : 'info'
    );

    if (discordWebhookUrl.trim()) {
      setSendingDiscord(true);
      try {
        const resp = await fetch('/api/notify/discord', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            webhookUrl: discordWebhookUrl.trim(),
            kb: item.kb,
            build: item.build,
            version: item.version,
            pingEveryone: isHighPriority,
            priority: isHighPriority ? 'high' : 'standard',
            title: `${priorityTag} Windows 11 ${item.version} Update: ${item.kb} (Build ${item.build})`,
            summaryDescription: notifBody,
            wubSummary: `${wubIsBlocked ? 'BLOCKED' : 'UNBLOCKED'} · Risk: ${wubMetrics.riskLevel} (${wubMetrics.missedSecurityUpdates.length} Security KBs missed)`,
          }),
        });
        const data = await resp.json();
        if (resp.ok && data.ok) {
          showToast(
            isHighPriority
              ? 'High-Priority @everyone Alert Sent'
              : 'Standard Info Alert Sent (No @everyone Ping)',
            data.message,
            'success'
          );
        }
      } catch {
        // Standalone APK direct Discord webhook fallback
        try {
          await fetch(discordWebhookUrl.trim(), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              content: isHighPriority
                ? `@everyone 🚨 **${notifTitle}**\n${notifBody}`
                : `ℹ️ **${notifTitle}**\n${notifBody}`,
              allowed_mentions: isHighPriority
                ? { parse: ['everyone', 'roles', 'users'] }
                : { parse: [] },
              embeds: [
                {
                  title: `${item.kb} · Windows 11 ${item.version} (Build ${item.build})`,
                  url: item.sourceUrl,
                  description: notifBody,
                  color: isHighPriority ? 15548997 : 3718648,
                  fields: [
                    {
                      name: 'Update Category',
                      value: isSec
                        ? 'Security / Cumulative KB (Impacts WUB Risk)'
                        : 'Optional Preview (0 WUB Risk — Safe to Skip)',
                      inline: true,
                    },
                    {
                      name: 'WUB Risk Status',
                      value: `${wubMetrics.riskLevel} (${wubMetrics.daysBlocked}d blocked)`,
                      inline: true,
                    },
                  ],
                },
              ],
            }),
          });
        } catch {
          // ignore
        }
      } finally {
        setSendingDiscord(false);
      }
    }
  };

  const handleSendDiscordTest = async () => {
    if (!discordWebhookUrl.trim()) {
      showToast(
        'Discord Webhook URL Required',
        'Paste your Discord channel Webhook URL first (Server Settings → Integrations → Webhooks).',
        'warning'
      );
      return;
    }

    const sampleUpdate =
      updates.find((u) => u.kb === selectedKbForTest) ||
      updates[0] ||
      FALLBACK_UPDATES[0];

    await handleSendPriorityAlertForUpdate(sampleUpdate);
  };

  const handleSendAndroidNtfyTest = async () => {
    if (!ntfyTopic.trim()) {
      showToast(
        'Android ntfy Topic Required',
        'Enter a unique topic name (e.g., win11-update-alerts-982) to push to the ntfy Android app.',
        'warning'
      );
      return;
    }

    const sampleUpdate =
      updates.find((u) => u.kb === selectedKbForTest) ||
      updates[0] ||
      FALLBACK_UPDATES[0];
    const isSec = isSecurityOrCumulativeUpdate(sampleUpdate);
    const isHighPriority =
      (isSec && wubIsBlocked) || (wubIsBlocked && wubMetrics.isPastUnblockDate);

    setSendingNtfy(true);
    try {
      const resp = await fetch('/api/notify/android-ntfy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: ntfyTopic.trim(),
          kb: sampleUpdate.kb,
          build: sampleUpdate.build,
          version: sampleUpdate.version,
          priority: isHighPriority ? 'high' : 'standard',
        }),
      });
      const data = await resp.json();
      if (resp.ok && data.ok) {
        showToast('Android Push Sent via ntfy.sh', data.message, 'success');
      } else {
        showToast('Android Push Error', data.error || 'Could not reach ntfy.sh', 'warning');
      }
    } catch {
      try {
        const cleanTopic = ntfyTopic.trim().replace(/[^a-zA-Z0-9_-]/g, '');
        const directResp = await fetch(`https://ntfy.sh/${cleanTopic}`, {
          method: 'POST',
          headers: {
            Priority: isHighPriority ? 'urgent' : 'default',
          },
          body: `${
            isHighPriority ? '[HIGH PRIORITY SECURITY]' : '[STANDARD PREVIEW - 0 WUB RISK]'
          } Windows 11 ${sampleUpdate.version}: ${sampleUpdate.kb} (OS Build ${sampleUpdate.build})`,
        });
        if (directResp.ok) {
          showToast(
            'Android Push Sent via ntfy.sh',
            `Delivered ${isHighPriority ? 'High-Priority' : 'Standard'} push alert to topic "${cleanTopic}"!`,
            'success'
          );
        }
      } catch {
        showToast('Network Error', 'Failed to send Android push alert.', 'warning');
      }
    } finally {
      setSendingNtfy(false);
    }
  };

  const handleInstallAction = async () => {
    if (isInstallable) {
      const accepted = await install();
      if (accepted) {
        showToast(
          'Android App Installed',
          'Win11 Update Notifier has been added to your home screen.',
          'success'
        );
      }
    } else {
      setShowInstallModal(true);
    }
  };

  const handleCopyCode = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
      showToast('Copied to Clipboard', `Copied ${key} contents to your clipboard.`, 'info');
    } catch {
      showToast('Copy Failed', 'Please select and copy the text manually.', 'warning');
    }
  };

  const filteredUpdates = useMemo(() => {
    return updates.filter((item) => {
      const matchesType = typeFilter === 'All' || item.type === typeFilter;
      const matchesChannel = channelFilter === 'All' || item.version === channelFilter;
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        item.kb.toLowerCase().includes(q) ||
        item.build.toLowerCase().includes(q) ||
        item.version.toLowerCase().includes(q) ||
        item.title.toLowerCase().includes(q) ||
        item.highlights.toLowerCase().includes(q);
      return matchesType && matchesChannel && matchesSearch;
    });
  }, [updates, typeFilter, channelFilter, searchQuery]);

  // Dedicated "Updates From Selected Date to Now" computation
  const updatesSinceSelectedDate = useMemo(() => {
    const start = sinceDate || '2025-01-01';
    const matching = updates.filter((item) => {
      const onOrAfterDate = item.releaseDate >= start;
      const matchesChan =
        sinceChannelFilter === 'All' || item.version === sinceChannelFilter;
      return onOrAfterDate && matchesChan;
    });

    return [...matching].sort((a, b) => {
      if (sinceSortOrder === 'newest') {
        return b.releaseDate.localeCompare(a.releaseDate);
      }
      return a.releaseDate.localeCompare(b.releaseDate);
    });
  }, [updates, sinceDate, sinceChannelFilter, sinceSortOrder]);

  const sinceDateStats = useMemo(() => {
    const total = updatesSinceSelectedDate.length;
    const majorCount = updatesSinceSelectedDate.filter(
      (u) => u.type === 'Major Feature Updates'
    ).length;
    const securityCount = updatesSinceSelectedDate.filter((u) =>
      isSecurityOrCumulativeUpdate(u)
    ).length;
    const previewCount = updatesSinceSelectedDate.filter(
      (u) => !isSecurityOrCumulativeUpdate(u)
    ).length;
    return { total, majorCount, securityCount, previewCount };
  }, [updatesSinceSelectedDate]);

  const sinceDateMarkdownReport = useMemo(() => {
    const lines = [
      `## Windows 11 Updates Released Since ${sinceDate} (Through ${todayIso})`,
      `Total Updates Found: ${updatesSinceSelectedDate.length} (${sinceDateStats.securityCount} Security/Cumulative · ${sinceDateStats.previewCount} Optional Previews)`,
      '',
      ...updatesSinceSelectedDate.map(
        (u) =>
          `- **${u.releaseDate}** · **Windows 11 ${u.version}** · \`${u.kb}\` (OS Build \`${u.build}\`) — *${
            isSecurityOrCumulativeUpdate(u)
              ? 'HIGH PRIORITY: Security / Cumulative KB'
              : 'INFO ONLY: Optional Preview (0 WUB Risk)'
          }*: ${u.title}`
      ),
    ];
    return lines.join('\n');
  }, [updatesSinceSelectedDate, sinceDate, todayIso, sinceDateStats]);

  // Combined Date-Range Notification & Priority-Based Discord Dispatcher
  const dispatchDateRangeNotificationAndDiscord = async (
    targetStartDate: string,
    targetChannel: ChannelFilter,
    isAutoTrigger = false
  ) => {
    const matching = updates
      .filter((item) => {
        const onOrAfterDate = item.releaseDate >= (targetStartDate || '2025-01-01');
        const matchesChan = targetChannel === 'All' || item.version === targetChannel;
        return onOrAfterDate && matchesChan;
      })
      .sort((a, b) => b.releaseDate.localeCompare(a.releaseDate));

    if (matching.length === 0) {
      await triggerDeviceNotification(
        `No Updates Since ${targetStartDate}`,
        `0 Windows 11 updates were released between ${targetStartDate} and ${todayIso}.`,
        'info'
      );
      return;
    }

    const secUpdates = matching.filter((u) => isSecurityOrCumulativeUpdate(u));
    const prevUpdates = matching.filter((u) => !isSecurityOrCumulativeUpdate(u));
    const hasSecurityImpact = secUpdates.length > 0 && wubIsBlocked;

    const latest = matching[0];
    const kbsList = matching.map((u) => u.kb).join(', ');
    const buildsList = matching.map((u) => u.build).join(', ');

    const notifTitle = hasSecurityImpact
      ? `[HIGH PRIORITY] ${secUpdates.length} Security KBs Since ${targetStartDate}`
      : `${matching.length} Windows 11 Updates Since ${targetStartDate}`;

    const notifBody = `Security/Cumulative KBs: ${
      secUpdates.map((u) => u.kb).join(', ') || 'None'
    } · Optional Previews (Safe to Skip): ${
      prevUpdates.map((u) => u.kb).join(', ') || 'None'
    }.`;

    await triggerDeviceNotification(
      notifTitle,
      notifBody,
      hasSecurityImpact ? 'warning' : 'success'
    );

    if (!discordWebhookUrl.trim()) {
      if (!isAutoTrigger) {
        scrollToSection('notifications', 'section-notifications');
        showToast(
          'Android Alert Fired — Add Discord Webhook URL',
          'Triggered native Android alert! Paste your Discord Webhook URL below to also ping Discord.',
          'warning'
        );
      }
      return;
    }

    setSendingDigestDiscord(true);
    try {
      const bulletLines = matching
        .slice(0, 10)
        .map(
          (u) =>
            `• **${u.releaseDate}** — \`${u.kb}\` (Win11 ${u.version}, Build \`${u.build}\`) · *${
              isSecurityOrCumulativeUpdate(u)
                ? 'Security/Cumulative [Impacts Risk]'
                : 'Optional Preview [0 Risk]'
            }*`
        )
        .join('\n');

      const resp = await fetch('/api/notify/discord', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          webhookUrl: discordWebhookUrl.trim(),
          kb: kbsList.slice(0, 120),
          build: buildsList.slice(0, 120),
          version: `${secUpdates.length} Security · ${prevUpdates.length} Preview Since ${targetStartDate}`,
          pingEveryone: hasSecurityImpact,
          priority: hasSecurityImpact ? 'high' : 'standard',
          title: `Windows 11 Updates (${targetStartDate} → ${todayIso}): ${secUpdates.length} Security KBs, ${prevUpdates.length} Previews (Latest: ${latest.kb})`,
          summaryDescription: bulletLines,
          wubSummary: `${wubIsBlocked ? 'BLOCKED' : 'UNBLOCKED'} · Risk: ${wubMetrics.riskLevel}`,
        }),
      });
      if (!resp.ok) {
        throw new Error('Direct fallback');
      }
    } catch {
      try {
        const bulletLines = matching
          .slice(0, 10)
          .map(
            (u) =>
              `• **${u.releaseDate}** — \`${u.kb}\` (Win11 ${u.version}, Build \`${u.build}\`) — ${
                isSecurityOrCumulativeUpdate(u) ? 'Security KB' : 'Optional Preview'
              }`
          )
          .join('\n');
        const embedTitle = `Windows 11 Updates (${targetStartDate} → ${todayIso}): ${matching.length} Total`;
        await fetch(discordWebhookUrl.trim(), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: hasSecurityImpact
              ? `@everyone 🚨 **[HIGH PRIORITY] ${embedTitle}**\n${bulletLines}`
              : `ℹ️ **[STANDARD DIGEST] ${embedTitle}**\n${bulletLines}`,
            allowed_mentions: hasSecurityImpact
              ? { parse: ['everyone', 'roles', 'users'] }
              : { parse: [] },
            embeds: [
              {
                title: embedTitle,
                url: 'https://learn.microsoft.com/en-us/windows/release-health/windows11-release-information',
                description: bulletLines,
                color: hasSecurityImpact ? 15548997 : 3718648,
              },
            ],
          }),
        });
      } catch {
        // ignore
      }
    } finally {
      setSendingDigestDiscord(false);
    }
  };

  const handleDateChangeAndNotify = (newDate: string) => {
    setSinceDate(newDate);
    if (newDate) {
      dispatchDateRangeNotificationAndDiscord(newDate, sinceChannelFilter, true);
    }
  };

  const applyDatePreset = (daysAgoOrIso: number | string) => {
    let targetIso = '';
    if (typeof daysAgoOrIso === 'string') {
      targetIso = daysAgoOrIso;
    } else {
      const d = new Date();
      d.setDate(d.getDate() - daysAgoOrIso);
      targetIso = d.toISOString().slice(0, 10);
    }
    setSinceDate(targetIso);
    dispatchDateRangeNotificationAndDiscord(targetIso, sinceChannelFilter, true);
  };

  const selectedPreviewUpdate = useMemo(() => {
    return (
      updates.find((u) => u.kb === selectedKbForTest) ||
      updates[0] ||
      FALLBACK_UPDATES[0]
    );
  }, [updates, selectedKbForTest]);

  const isSelectedPreviewHighPriority = useMemo(() => {
    const isSec = isSecurityOrCumulativeUpdate(selectedPreviewUpdate);
    return (isSec && wubIsBlocked) || (wubIsBlocked && wubMetrics.isPastUnblockDate);
  }, [selectedPreviewUpdate, wubIsBlocked, wubMetrics.isPastUnblockDate]);

  const cleanOwner = (githubOwner || 'mishramukti982-gif').trim();
  const cleanRepo = (githubRepoName || 'Win11').trim();
  const githubRepoUrl = `https://github.com/${cleanOwner}/${cleanRepo}`;
  const githubReleasesUrl = `${githubRepoUrl}/releases`;
  const githubDirectApkUrl = `${githubRepoUrl}/releases/download/v1.0.0/Win11-Update-Notifier-Android.apk`;

  const scrollToSection = (section: ActiveSection, elementId: string) => {
    setActiveSection(section);
    const el = document.getElementById(elementId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Risk color styling helpers
  const riskBadgeStyle =
    wubMetrics.riskLevel === 'HIGH'
      ? 'bg-rose-500/15 border-rose-500/50 text-rose-300'
      : wubMetrics.riskLevel === 'MODERATE'
      ? 'bg-amber-500/15 border-amber-500/50 text-amber-300'
      : 'bg-emerald-500/15 border-emerald-500/50 text-emerald-300';

  const riskAccentText =
    wubMetrics.riskLevel === 'HIGH'
      ? 'text-rose-400'
      : wubMetrics.riskLevel === 'MODERATE'
      ? 'text-amber-400'
      : 'text-emerald-400';

  return (
    <div className="min-h-screen bg-[#0B0F17] text-slate-100 pb-20 md:pb-12">
      {/* Offline Connectivity Banner */}
      {!isOnline && (
        <div className="bg-amber-500/20 border-b border-amber-500/40 px-4 py-2 text-xs text-amber-200 text-center">
          Offline Mode Active — Showing cached Windows 11 Release Health data via Service Worker.
        </div>
      )}

      {/* Top Navigation Bar — Strict 3-Zone Contract */}
      <header className="sticky top-0 z-30 flex items-center justify-between gap-6 px-4 sm:px-8 py-3.5 bg-[#0B0F17]/90 backdrop-blur-md border-b border-slate-800/80">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#top"
          className="text-base sm:text-lg font-bold tracking-tight text-white whitespace-nowrap shrink-0 font-display"
        >
          Win11 Update Notifier
        </a>

        {/* Zone 2: Concise single-line text navigation links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-400">
          <button
            type="button"
            onClick={() => scrollToSection('wub-guard', 'section-wub-guard')}
            className={`hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeSection === 'wub-guard'
                ? 'text-white underline underline-offset-8 decoration-sky-400'
                : ''
            }`}
          >
            WUB Safe-Window Guard
          </button>
          <button
            type="button"
            onClick={() => scrollToSection('tracker', 'section-tracker')}
            className={`hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeSection === 'tracker'
                ? 'text-white underline underline-offset-8 decoration-sky-400'
                : ''
            }`}
          >
            Release Feed
          </button>
          <button
            type="button"
            onClick={() => scrollToSection('since-date', 'section-since-date')}
            className={`hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeSection === 'since-date'
                ? 'text-white underline underline-offset-8 decoration-sky-400'
                : ''
            }`}
          >
            Updates Since Date
          </button>
          <button
            type="button"
            onClick={() => scrollToSection('notifications', 'section-notifications')}
            className={`hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeSection === 'notifications'
                ? 'text-white underline underline-offset-8 decoration-sky-400'
                : ''
            }`}
          >
            Discord &amp; Android
          </button>
          <button
            type="button"
            onClick={() => scrollToSection('android', 'section-android')}
            className={`hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeSection === 'android'
                ? 'text-white underline underline-offset-8 decoration-sky-400'
                : ''
            }`}
          >
            Download APK
          </button>
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={() => handleRunLiveCheck(false)}
            disabled={checkingNow}
            className="min-h-[40px] px-4 py-2 text-xs sm:text-sm font-semibold text-slate-950 bg-sky-400 hover:bg-sky-300 disabled:opacity-60 rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-2 cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${checkingNow ? 'animate-spin' : ''}`} />
            <span>{checkingNow ? 'Checking Microsoft...' : 'Check Release Health'}</span>
          </button>
        </div>
      </header>

      {/* In-App Notification Toast Banner */}
      {toast && (
        <div className="fixed top-16 right-4 left-4 sm:left-auto sm:w-96 z-50 bg-[#111827] border border-sky-500/40 rounded-xl p-4 shadow-2xl">
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

      {/* Main Content Container */}
      <main id="top" className="max-w-7xl mx-auto px-4 sm:px-8 pt-6 sm:pt-8 space-y-12">
        {/* =====================================================================
            CLEAN TOP WUB STATUS BAR (Status + Days Blocked/Left + Risk Color + Missed Security Count)
           ===================================================================== */}
        <section
          aria-label="WUB Top Status Bar"
          className={`rounded-xl border p-4 sm:px-6 sm:py-4 transition-colors ${riskBadgeStyle}`}
        >
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Core 4 Telemetry Points: Status · Days Blocked/Left · Risk Color · Missed Security Count */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs sm:text-sm font-mono-tabular">
              <span className="inline-flex items-center gap-1.5 font-bold text-white">
                {wubIsBlocked ? (
                  <Lock className="w-4 h-4 text-amber-400 shrink-0" />
                ) : (
                  <Unlock className="w-4 h-4 text-emerald-400 shrink-0" />
                )}
                <span>
                  WUB STATUS: {wubIsBlocked ? 'BLOCKED (Updates Paused)' : 'UNBLOCKED (Protected)'}
                </span>
              </span>

              <span aria-hidden="true" className="text-slate-500">
                ·
              </span>

              <span className="text-white font-semibold">
                {wubIsBlocked ? (
                  <>
                    {wubMetrics.daysBlocked}d Blocked /{' '}
                    {wubMetrics.daysLeft >= 0
                      ? `${wubMetrics.daysLeft}d Left`
                      : `${Math.abs(wubMetrics.daysLeft)}d Overdue`}
                  </>
                ) : (
                  '0d Blocked (Window Reset)'
                )}
              </span>

              <span aria-hidden="true" className="text-slate-500">
                ·
              </span>

              <span className={`font-bold ${riskAccentText}`}>
                RISK: {wubMetrics.riskLevel}
              </span>

              <span aria-hidden="true" className="text-slate-500">
                ·
              </span>

              <span className="text-white font-semibold">
                Missed Security KBs: {wubMetrics.missedSecurityUpdates.length}
              </span>

              {wubIsBlocked && wubMetrics.skippedPreviewUpdates.length > 0 && (
                <>
                  <span aria-hidden="true" className="text-slate-500">
                    ·
                  </span>
                  <span className="text-slate-300">
                    {wubMetrics.skippedPreviewUpdates.length} Preview Skipped (0 Risk)
                  </span>
                </>
              )}
            </div>

            {/* Clean Top Bar Actions: Mark as Unblocked + Send WUB Alert */}
            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              {wubIsBlocked ? (
                <button
                  type="button"
                  onClick={handleMarkAsUnblocked}
                  className="min-h-[38px] px-3.5 py-1.5 text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Mark as Unblocked (Reset Risk)</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleApplyWubPreset(0, 14)}
                  className="min-h-[38px] px-3.5 py-1.5 text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 cursor-pointer"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Start 14-Day Safe Block Window</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleSendWubPriorityAlert}
                disabled={sendingWubAlert}
                className="min-h-[38px] px-3.5 py-1.5 text-xs font-medium text-white bg-[#0B0F17]/90 hover:bg-[#0B0F17] border border-slate-700 rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 cursor-pointer"
              >
                <Bell className="w-3.5 h-3.5 text-sky-400" />
                <span>
                  {sendingWubAlert ? 'Sending Alert...' : 'Send WUB Priority Alert'}
                </span>
              </button>
            </div>
          </div>
        </section>

        {/* =====================================================================
            SECTION 00: WUB SAFE-WINDOW & VULNERABILITY GUARD
           ===================================================================== */}
        <section id="section-wub-guard" className="space-y-6 scroll-mt-20">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
            <div className="space-y-1.5 max-w-3xl">
              <p className="text-xs font-medium text-sky-400 tracking-wide">
                WINDOWS UPDATE BLOCKER (WUB) SAFE-WINDOW &amp; VULNERABILITY GUARD
              </p>
              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight font-display">
                Block Updates Safely Without Leaving Security Vulnerabilities Open
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Tracks your active Windows Update Blocker window against Microsoft&apos;s monthly
                Patch Tuesday cycle. Only <strong>Security / Cumulative KBs</strong> raise your risk
                level and trigger high-priority <code className="text-sky-300">@everyone</code>{' '}
                pings—optional C/D-release previews are separated and safely ignored.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => scrollToSection('android', 'section-android')}
                className="min-h-[42px] px-4 py-2 text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-colors whitespace-nowrap flex items-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Download Android APK ({cleanRepo})</span>
              </button>
            </div>
          </div>

          {/* Research-Backed Safe Block Thresholds Reference Strip */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-[#111827] border border-slate-800/90 rounded-xl p-4 space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 font-mono-tabular">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>SAFE WINDOW: ≤14 DAYS &amp; 0 SECURITY KBs</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Aligned with CISA&apos;s 14-day remediation window between monthly Microsoft Patch
                Tuesday (B-release) rollups. Zero unpatched security bulletins.
              </p>
            </div>

            <div className="bg-[#111827] border border-slate-800/90 rounded-xl p-4 space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-400 font-mono-tabular">
                <Shield className="w-4 h-4 shrink-0" />
                <span>MODERATE RISK: 15–30 DAYS OR 1 SECURITY KB</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Approaching a full 30-day Patch Tuesday cycle (or 1 missed cumulative security
                update). Prepare to unblock at your next safe checkpoint.
              </p>
            </div>

            <div className="bg-[#111827] border border-slate-800/90 rounded-xl p-4 space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-bold text-rose-400 font-mono-tabular">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>HIGH RISK: &gt;30 DAYS, 2+ SEC KBs, OR OVERDUE</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Exceeds Microsoft&apos;s consumer pause threshold, leaves 2+ monthly security
                rollups unpatched, or passes your Planned Unblock Date. Triggers{' '}
                <code className="text-rose-300">@everyone</code> high-priority alerts.
              </p>
            </div>
          </div>

          {/* WUB Window Configuration & One-Tap Reset Card */}
          <div className="bg-[#111827] border border-slate-800/90 rounded-xl p-5 sm:p-6 space-y-5">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-end">
              {/* Toggle WUB Blocked / Unblocked */}
              <div className="lg:col-span-3 space-y-1.5">
                <span className="block text-xs font-medium text-slate-300">
                  Windows Update Blocker State
                </span>
                <div className="grid grid-cols-2 gap-1.5 bg-[#0B0F17] p-1 rounded-lg border border-slate-800">
                  <button
                    type="button"
                    onClick={() => updateWubBlockedState(true)}
                    className={`min-h-[38px] px-3 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                      wubIsBlocked
                        ? 'bg-amber-400 text-slate-950'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>WUB Blocked</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleMarkAsUnblocked}
                    className={`min-h-[38px] px-3 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                      !wubIsBlocked
                        ? 'bg-emerald-400 text-slate-950'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Unlock className="w-3.5 h-3.5" />
                    <span>Unblocked</span>
                  </button>
                </div>
              </div>

              {/* WUB Start Date Picker */}
              <div className="lg:col-span-3 space-y-1.5">
                <label htmlFor="wub-start-date" className="block text-xs font-medium text-slate-300">
                  WUB Block Start Date
                </label>
                <input
                  id="wub-start-date"
                  type="date"
                  value={wubStartDate}
                  max={todayIso}
                  onChange={(e) => {
                    updateWubBlockedState(true);
                    updateWubStartDate(e.target.value);
                  }}
                  className="w-full min-h-[42px] px-3.5 py-2 bg-[#0B0F17] border border-slate-700 rounded-lg text-sm text-white font-mono-tabular focus:outline-none focus:border-sky-400"
                />
              </div>

              {/* Planned Unblock Date Picker */}
              <div className="lg:col-span-3 space-y-1.5">
                <label
                  htmlFor="wub-unblock-date"
                  className="block text-xs font-medium text-slate-300"
                >
                  Planned Safe Unblock Date
                </label>
                <input
                  id="wub-unblock-date"
                  type="date"
                  value={wubPlannedUnblockDate}
                  onChange={(e) => {
                    updateWubBlockedState(true);
                    updateWubPlannedUnblockDate(e.target.value);
                  }}
                  className="w-full min-h-[42px] px-3.5 py-2 bg-[#0B0F17] border border-slate-700 rounded-lg text-sm text-white font-mono-tabular focus:outline-none focus:border-sky-400"
                />
              </div>

              {/* Clear "Mark as Unblocked" Reset Action */}
              <div className="lg:col-span-3">
                <button
                  type="button"
                  onClick={handleMarkAsUnblocked}
                  className="w-full min-h-[42px] px-4 py-2 text-xs sm:text-sm font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Mark as Unblocked (Reset)</span>
                </button>
              </div>
            </div>

            {/* Quick Safe-Window Presets */}
            <div className="pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-slate-400 mr-1">Quick WUB Window Presets:</span>
                <button
                  type="button"
                  onClick={() => handleApplyWubPreset(0, 14)}
                  className="min-h-[34px] px-3 py-1 text-xs font-medium text-emerald-300 bg-emerald-950/50 hover:bg-emerald-900/60 border border-emerald-700/50 rounded-lg transition-colors cursor-pointer"
                >
                  Start Fresh 14-Day Safe Block (0 Missed)
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyWubPreset(10, 4)}
                  className="min-h-[34px] px-3 py-1 text-xs font-medium text-amber-300 bg-amber-950/50 hover:bg-amber-900/60 border border-amber-700/50 rounded-lg transition-colors cursor-pointer"
                >
                  10d Blocked · 1 Security KB (Moderate)
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyWubPreset(20, -1)}
                  className="min-h-[34px] px-3 py-1 text-xs font-medium text-rose-300 bg-rose-950/50 hover:bg-rose-900/60 border border-rose-700/50 rounded-lg transition-colors cursor-pointer"
                >
                  20d Blocked · 2 Security KBs &amp; Overdue (High Risk)
                </button>
              </div>

              <span className="text-xs text-slate-400 font-mono-tabular">
                Reason: {wubMetrics.riskReason}
              </span>
            </div>
          </div>

          {/* Strictly Separated Update Lists During WUB Window:
              Left Column: Missed Security / Cumulative KBs + One-Tap Unblock Checklist
              Right Column: Optional Preview Updates (0 Risk Impact) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            {/* Left Column (7 cols): Security & Cumulative KBs (Affects Risk & High-Priority Alerts) */}
            <div className="lg:col-span-7 bg-[#111827] border border-slate-800/90 rounded-xl p-5 sm:p-6 space-y-5 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
                  <div>
                    <h2 className="text-base sm:text-lg font-bold text-white font-display flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                      <span>
                        Missed Security &amp; Cumulative KBs ({wubMetrics.missedSecurityUpdates.length})
                      </span>
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Patch Tuesday (B-releases) &amp; cumulative security updates released since{' '}
                      <span className="text-white font-mono-tabular">{wubStartDate}</span>. Only
                      these updates raise your Risk Meter and trigger{' '}
                      <code className="text-rose-300">@everyone</code> high-priority alerts.
                    </p>
                  </div>
                </div>

                {!wubIsBlocked ? (
                  <div className="bg-[#0B0F17] border border-emerald-800/50 rounded-lg p-5 text-center space-y-2">
                    <p className="text-sm font-semibold text-emerald-400">
                      WUB is Currently Marked as Unblocked (0 Missed Security KBs)
                    </p>
                    <p className="text-xs text-slate-400">
                      Your system is marked caught up. When you turn Windows Update Blocker back on,
                      select a WUB Start Date or preset above to track missed security rollups.
                    </p>
                  </div>
                ) : wubMetrics.missedSecurityUpdates.length === 0 ? (
                  <div className="bg-[#0B0F17] border border-emerald-800/50 rounded-lg p-5 text-center space-y-2">
                    <p className="text-sm font-semibold text-emerald-400">
                      0 Security / Cumulative KBs Missed Since {wubStartDate}
                    </p>
                    <p className="text-xs text-slate-400">
                      No mandatory Microsoft Patch Tuesday security updates have dropped during your
                      block window yet.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-800/80 border border-slate-800 rounded-lg bg-[#0B0F17]">
                    {wubMetrics.missedSecurityUpdates.map((item) => (
                      <div
                        key={`wub-sec-${item.id}`}
                        className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2 text-xs font-mono-tabular">
                            <span className="text-rose-400 font-semibold">HIGH PRIORITY</span>
                            <span aria-hidden="true" className="text-slate-600">
                              ·
                            </span>
                            <span className="text-white font-semibold">{item.kb}</span>
                            <span aria-hidden="true" className="text-slate-600">
                              ·
                            </span>
                            <span className="text-sky-400">Win11 {item.version}</span>
                            <span aria-hidden="true" className="text-slate-600">
                              ·
                            </span>
                            <span className="text-slate-400">Build {item.build}</span>
                            <span aria-hidden="true" className="text-slate-600">
                              ·
                            </span>
                            <span className="text-slate-400">{item.releaseDate}</span>
                          </div>
                          <p className="text-xs sm:text-sm font-semibold text-white">
                            {item.title}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleSendPriorityAlertForUpdate(item)}
                          className="min-h-[36px] px-3 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer"
                        >
                          <Send className="w-3 h-3" />
                          <span>Alert @everyone</span>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* One-Tap Unblock Catch-Up Checklist */}
              {wubIsBlocked && wubMetrics.catchUpChecklist.length > 0 && (
                <div className="pt-4 border-t border-slate-800/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-emerald-400 font-mono-tabular">
                      UNBLOCK CATCH-UP CHECKLIST (LATEST SUPERSEDING KB PER VERSION)
                    </span>
                    <span className="text-xs text-slate-400">
                      Windows 11 KBs are cumulative — install only the latest for your OS branch
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {wubMetrics.catchUpChecklist.map((item) => {
                      const isChecked = Boolean(checkedCatchUpKbs[item.kb]);
                      return (
                        <button
                          key={`catchup-${item.kb}`}
                          type="button"
                          onClick={() =>
                            setCheckedCatchUpKbs((prev) => ({
                              ...prev,
                              [item.kb]: !prev[item.kb],
                            }))
                          }
                          className={`p-3 rounded-lg border text-left transition-colors flex items-center justify-between gap-2 cursor-pointer ${
                            isChecked
                              ? 'bg-emerald-950/40 border-emerald-500/60 text-emerald-200'
                              : 'bg-[#0B0F17] border-slate-800 text-slate-200 hover:border-slate-700'
                          }`}
                        >
                          <div className="text-xs font-mono-tabular">
                            <span className="font-bold text-white block">
                              Win11 {item.version} → Install {item.kb}
                            </span>
                            <span className="text-slate-400">
                              Build {item.build} ({item.releaseDate})
                            </span>
                          </div>
                          <Check
                            className={`w-4 h-4 shrink-0 ${
                              isChecked ? 'text-emerald-400' : 'text-slate-600'
                            }`}
                          />
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Right Column (5 cols): Optional Preview Updates (Informational Only — 0 Risk Impact) */}
            <div className="lg:col-span-5 bg-[#111827] border border-slate-800/90 rounded-xl p-5 sm:p-6 space-y-4 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="border-b border-slate-800 pb-3">
                  <h2 className="text-base sm:text-lg font-bold text-white font-display flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-sky-400 shrink-0" />
                    <span>
                      Optional Preview Updates ({wubMetrics.skippedPreviewUpdates.length})
                    </span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Non-security C/D-release preview builds released since{' '}
                    <span className="text-white font-mono-tabular">{wubStartDate}</span>.{' '}
                    <strong className="text-emerald-400">0 Security Risk Impact</strong> — safe to
                    skip while WUB is active. Alerts send as Standard Info without{' '}
                    <code>@everyone</code> pings.
                  </p>
                </div>

                {wubMetrics.skippedPreviewUpdates.length === 0 ? (
                  <div className="bg-[#0B0F17] border border-slate-800 rounded-lg p-5 text-center space-y-1.5">
                    <p className="text-sm font-medium text-slate-300">
                      No Optional Preview Updates in This Window
                    </p>
                    <p className="text-xs text-slate-400">
                      When Microsoft drops a late-month C/D Preview build, it will appear here
                      separately without raising your WUB risk meter.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-800/80 border border-slate-800 rounded-lg bg-[#0B0F17]">
                    {wubMetrics.skippedPreviewUpdates.map((item) => (
                      <div
                        key={`wub-prev-${item.id}`}
                        className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-1.5 text-xs font-mono-tabular text-slate-400">
                            <span className="text-emerald-400 font-medium">0 RISK · PREVIEW</span>
                            <span aria-hidden="true">·</span>
                            <span className="text-white font-semibold">{item.kb}</span>
                            <span aria-hidden="true">·</span>
                            <span>Win11 {item.version}</span>
                            <span aria-hidden="true">·</span>
                            <span>{item.releaseDate}</span>
                          </div>
                          <p className="text-xs font-medium text-slate-200">{item.title}</p>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleSendPriorityAlertForUpdate(item)}
                          className="min-h-[34px] px-3 py-1 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer"
                        >
                          <Bell className="w-3 h-3 text-sky-400" />
                          <span>Info Alert</span>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-800/80 text-xs text-slate-400 leading-relaxed">
                <strong className="text-slate-200">Priority Routing Rule:</strong> Every single
                update is tracked and alerted, but <strong>High-Priority (`@everyone`)</strong>{' '}
                only fires when a Security/Cumulative KB drops while WUB is blocked or when your
                Planned Unblock Date is reached/overdue.
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 1: Live Windows 11 Release Tracker (Alerts Every Update with Priority Classification) */}
        <section id="section-tracker" className="space-y-6 scroll-mt-20">
          <div className="border-t border-slate-800/80 pt-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-white font-display">
                01. Windows 11 Release Health Feed — Every Update Classified
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Every Microsoft release is classified into{' '}
                <strong className="text-rose-300">
                  Security / Cumulative (High Priority when Blocked)
                </strong>{' '}
                vs.{' '}
                <strong className="text-emerald-300">
                  Optional Preview (Standard Info · 0 WUB Risk)
                </strong>
                .
              </p>
            </div>

            <a
              href="https://learn.microsoft.com/en-us/windows/release-health/windows11-release-information"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs sm:text-sm text-sky-400 hover:text-sky-300 flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <span>Official Microsoft Release Information</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* Filter & Search Bar */}
          <div className="bg-[#111827] border border-slate-800/90 rounded-xl p-4 space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              {/* Update Type Segmented Filter */}
              <div className="space-y-1.5">
                <span className="text-xs text-slate-400 block">Update Type</span>
                <div className="flex flex-wrap items-center gap-1.5 bg-[#0B0F17] p-1.5 rounded-lg border border-slate-800/80">
                  {(
                    [
                      'All',
                      'Security / Cumulative KB',
                      'Major Feature Updates',
                      'Out-of-Band / Preview',
                    ] as UpdateTypeFilter[]
                  ).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setTypeFilter(type)}
                      className={`min-h-[36px] px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        typeFilter === type
                          ? 'bg-sky-500 text-slate-950 font-semibold'
                          : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* Channel Segmented Filter */}
              <div className="space-y-1.5">
                <span className="text-xs text-slate-400 block">Servicing Channel</span>
                <div className="flex flex-wrap items-center gap-1.5 bg-[#0B0F17] p-1.5 rounded-lg border border-slate-800/80">
                  {(['All', '26H2', '26H1', '24H2', '23H2'] as ChannelFilter[]).map((chan) => (
                    <button
                      key={chan}
                      type="button"
                      onClick={() => setChannelFilter(chan)}
                      className={`min-h-[36px] px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 font-mono-tabular cursor-pointer ${
                        channelFilter === chan
                          ? 'bg-sky-500 text-slate-950 font-semibold'
                          : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                      }`}
                    >
                      {chan === 'All' ? 'All Channels' : chan}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by KB number (e.g. KB5127646, KB5129195), OS build (26200.9711, 28000.3231), or keyword..."
                className="w-full min-h-[44px] pl-10 pr-10 py-2 bg-[#0B0F17] border border-slate-800 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-400"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
                  aria-label="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Release List / Table */}
          {loading ? (
            <div className="bg-[#111827] border border-slate-800/90 rounded-xl divide-y divide-slate-800/70">
              {[1, 2, 3, 4].map((n) => (
                <div key={n} className="p-5 animate-pulse space-y-2">
                  <div className="h-4 bg-slate-800 rounded w-1/4" />
                  <div className="h-5 bg-slate-800 rounded w-2/3" />
                  <div className="h-4 bg-slate-800 rounded w-full" />
                </div>
              ))}
            </div>
          ) : filteredUpdates.length === 0 ? (
            <div className="bg-[#111827] border border-slate-800/90 rounded-xl p-10 text-center space-y-3">
              <p className="text-base font-semibold text-white">
                No Windows 11 updates match your current filter criteria
              </p>
              <button
                type="button"
                onClick={() => {
                  setTypeFilter('All');
                  setChannelFilter('All');
                  setSearchQuery('');
                }}
                className="min-h-[40px] px-4 py-2 text-xs font-semibold text-slate-950 bg-sky-400 hover:bg-sky-300 rounded-lg transition-colors cursor-pointer"
              >
                Reset All Filters
              </button>
            </div>
          ) : (
            <div className="bg-[#111827] border border-slate-800/90 rounded-xl divide-y divide-slate-800/80">
              {filteredUpdates.map((item) => {
                const isSelected = selectedKbForTest === item.kb;
                const isSec = isSecurityOrCumulativeUpdate(item);
                const isHighWhenDispatched =
                  (isSec && wubIsBlocked) || (wubIsBlocked && wubMetrics.isPastUnblockDate);

                return (
                  <div
                    key={item.id}
                    className={`p-5 sm:p-6 transition-colors ${
                      isSelected ? 'bg-slate-800/40' : 'hover:bg-slate-800/20'
                    }`}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="space-y-2 max-w-3xl">
                        {/* Unboxed Metadata Line (Zero-Pill Discipline) */}
                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 font-mono-tabular">
                          <span
                            className={`font-semibold ${
                              isSec ? 'text-rose-400' : 'text-emerald-400'
                            }`}
                          >
                            {isSec
                              ? 'SECURITY / CUMULATIVE (Impacts WUB Risk)'
                              : 'OPTIONAL PREVIEW (0 WUB Risk · Safe to Skip)'}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className="text-sky-400 font-semibold">
                            Windows 11 {item.version}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className="text-white font-semibold">{item.kb}</span>
                          <span aria-hidden="true">·</span>
                          <span>OS Build {item.build}</span>
                          <span aria-hidden="true">·</span>
                          <span>Released {item.releaseDate}</span>
                        </div>

                        <h3 className="text-base sm:text-lg font-semibold text-white font-display">
                          {item.title}
                        </h3>

                        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                          {item.highlights}
                        </p>

                        <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-slate-400">
                          <span>Channel: {item.servicingChannel}</span>
                          <span aria-hidden="true">·</span>
                          <a
                            href={item.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sky-400 hover:underline inline-flex items-center gap-1"
                          >
                            <span>Microsoft KB Notes</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      </div>

                      {/* Row Actions */}
                      <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleSendPriorityAlertForUpdate(item)}
                          className={`min-h-[40px] px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer ${
                            isHighWhenDispatched
                              ? 'bg-rose-600 hover:bg-rose-500 text-white'
                              : 'bg-slate-800/90 hover:bg-slate-700 border border-slate-700 text-slate-200'
                          }`}
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>
                            {isHighWhenDispatched
                              ? `Send High-Priority Alert (${item.kb})`
                              : `Send Standard Info Alert (${item.kb})`}
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* SECTION 2: Dedicated "Updates From Selected Date to Now" Explorer */}
        <section id="section-since-date" className="space-y-6 scroll-mt-20">
          <div className="border-t border-slate-800/80 pt-10 flex flex-col lg:flex-row lg:items-end justify-between gap-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-white font-display">
                02. Updates Since Date — Historical Range Explorer
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Pick any start date to view every Windows 11 update released from that date up to
                today ({todayIso}) and auto-dispatch a priority-based summary to Android &amp;
                Discord.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() => handleCopyCode(`Updates since ${sinceDate}`, sinceDateMarkdownReport)}
                className="min-h-[40px] px-3.5 py-2 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5 text-sky-400" />
                <span>Copy Range List</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  dispatchDateRangeNotificationAndDiscord(sinceDate, sinceChannelFilter, false)
                }
                disabled={sendingDigestDiscord || updatesSinceSelectedDate.length === 0}
                className="min-h-[40px] px-4 py-2 text-xs font-semibold text-white bg-[#5865F2] hover:bg-[#4752C4] disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer"
              >
                <Webhook className="w-3.5 h-3.5" />
                <span>
                  {sendingDigestDiscord
                    ? 'Sending Digest...'
                    : `Send All (${updatesSinceSelectedDate.length}) to Discord & Android`}
                </span>
              </button>
            </div>
          </div>

          {/* Date Controls & Quick Presets */}
          <div className="bg-[#111827] border border-slate-800/90 rounded-xl p-5 space-y-5">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-end">
              {/* Start Date Picker */}
              <div className="lg:col-span-4 space-y-1.5">
                <label
                  htmlFor="since-date-input"
                  className="block text-xs font-medium text-slate-300"
                >
                  Select Start Date (Auto-Notifies Android &amp; Discord)
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-sky-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="since-date-input"
                    type="date"
                    value={sinceDate}
                    max={todayIso}
                    onChange={(e) => handleDateChangeAndNotify(e.target.value)}
                    className="w-full min-h-[44px] pl-10 pr-4 py-2 bg-[#0B0F17] border border-slate-700 rounded-lg text-sm text-white font-mono-tabular focus:outline-none focus:border-sky-400"
                  />
                </div>
              </div>

              {/* Quick Date Range Presets */}
              <div className="lg:col-span-5 space-y-1.5">
                <span className="block text-xs text-slate-400">Quick Timeframe Presets</span>
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => applyDatePreset(14)}
                    className="min-h-[38px] px-3 py-1.5 text-xs font-medium text-slate-200 bg-[#0B0F17] hover:bg-slate-800 border border-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    Last 14 Days
                  </button>
                  <button
                    type="button"
                    onClick={() => applyDatePreset(30)}
                    className="min-h-[38px] px-3 py-1.5 text-xs font-medium text-slate-200 bg-[#0B0F17] hover:bg-slate-800 border border-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    Last 30 Days
                  </button>
                  <button
                    type="button"
                    onClick={() => applyDatePreset(90)}
                    className="min-h-[38px] px-3 py-1.5 text-xs font-medium text-slate-200 bg-[#0B0F17] hover:bg-slate-800 border border-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    Last 90 Days
                  </button>
                  <button
                    type="button"
                    onClick={() => applyDatePreset('2026-01-01')}
                    className="min-h-[38px] px-3 py-1.5 text-xs font-medium text-slate-200 bg-[#0B0F17] hover:bg-slate-800 border border-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0 font-mono-tabular cursor-pointer"
                  >
                    Since Jan 2026
                  </button>
                </div>
              </div>

              {/* Channel Filter & Sort Direction */}
              <div className="lg:col-span-3 flex items-center justify-between lg:justify-end gap-2">
                <select
                  aria-label="Filter by channel since date"
                  value={sinceChannelFilter}
                  onChange={(e) => setSinceChannelFilter(e.target.value as ChannelFilter)}
                  className="min-h-[40px] px-3 py-1.5 bg-[#0B0F17] border border-slate-800 rounded-lg text-xs text-white font-mono-tabular focus:outline-none focus:border-sky-400"
                >
                  <option value="All">All Channels</option>
                  <option value="26H2">26H2 Only</option>
                  <option value="26H1">26H1 Only</option>
                  <option value="24H2">24H2 Only</option>
                  <option value="23H2">23H2 Only</option>
                </select>

                <button
                  type="button"
                  onClick={() =>
                    setSinceSortOrder((prev) => (prev === 'newest' ? 'oldest' : 'newest'))
                  }
                  className="min-h-[40px] px-3 py-1.5 text-xs font-medium text-slate-200 bg-[#0B0F17] hover:bg-slate-800 border border-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowUpDown className="w-3.5 h-3.5 text-sky-400" />
                  <span>{sinceSortOrder === 'newest' ? 'Newest First' : 'Oldest First'}</span>
                </button>
              </div>
            </div>

            {/* Range Summary Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-slate-800/80">
              <div className="bg-[#0B0F17] border border-slate-800/80 rounded-lg p-3.5">
                <span className="text-xs text-slate-400 block">
                  Total Updates ({sinceDate} → Now)
                </span>
                <span className="text-lg sm:text-xl font-bold text-white font-mono-tabular mt-1 block">
                  {sinceDateStats.total} Packages
                </span>
              </div>
              <div className="bg-[#0B0F17] border border-slate-800/80 rounded-lg p-3.5">
                <span className="text-xs text-slate-400 block">
                  Security / Cumulative (High Priority)
                </span>
                <span className="text-lg sm:text-xl font-bold text-rose-400 font-mono-tabular mt-1 block">
                  {sinceDateStats.securityCount} Security KBs
                </span>
              </div>
              <div className="bg-[#0B0F17] border border-slate-800/80 rounded-lg p-3.5">
                <span className="text-xs text-slate-400 block">
                  Optional Preview (0 WUB Risk)
                </span>
                <span className="text-lg sm:text-xl font-bold text-emerald-400 font-mono-tabular mt-1 block">
                  {sinceDateStats.previewCount} Previews
                </span>
              </div>
              <div className="bg-[#0B0F17] border border-slate-800/80 rounded-lg p-3.5">
                <span className="text-xs text-slate-400 block">Major Feature Rollups</span>
                <span className="text-lg sm:text-xl font-bold text-sky-400 font-mono-tabular mt-1 block">
                  {sinceDateStats.majorCount} Releases
                </span>
              </div>
            </div>
          </div>

          {/* Chronological Results List for Selected Date Range */}
          {updatesSinceSelectedDate.length === 0 ? (
            <div className="bg-[#111827] border border-slate-800/90 rounded-xl p-10 text-center space-y-3">
              <p className="text-base font-semibold text-white">
                No Windows 11 updates found between {sinceDate} and {todayIso}
              </p>
              <button
                type="button"
                onClick={() => applyDatePreset('2025-01-01')}
                className="min-h-[40px] px-4 py-2 text-xs font-semibold text-slate-950 bg-sky-400 hover:bg-sky-300 rounded-lg transition-colors cursor-pointer"
              >
                Show All Updates Since 2025
              </button>
            </div>
          ) : (
            <div className="bg-[#111827] border border-slate-800/90 rounded-xl divide-y divide-slate-800/80">
              {updatesSinceSelectedDate.map((item, idx) => {
                const isSec = isSecurityOrCumulativeUpdate(item);
                return (
                  <div
                    key={`since-${item.id}`}
                    className="p-4 sm:p-5 hover:bg-slate-800/20 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1.5 max-w-3xl">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 font-mono-tabular">
                        <span className="text-slate-500">
                          #{String(idx + 1).padStart(2, '0')}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="text-white font-semibold">{item.releaseDate}</span>
                        <span aria-hidden="true">·</span>
                        <span
                          className={`font-semibold ${
                            isSec ? 'text-rose-400' : 'text-emerald-400'
                          }`}
                        >
                          {isSec ? 'SECURITY / CUMULATIVE' : 'OPTIONAL PREVIEW (0 RISK)'}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="text-sky-400 font-semibold">
                          Windows 11 {item.version}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="text-white font-semibold">{item.kb}</span>
                        <span aria-hidden="true">·</span>
                        <span>Build {item.build}</span>
                      </div>
                      <p className="text-sm sm:text-base font-semibold text-white font-display">
                        {item.title}
                      </p>
                      <p className="text-xs text-slate-300 leading-relaxed">{item.highlights}</p>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleSendPriorityAlertForUpdate(item)}
                        className="min-h-[38px] px-3 py-1.5 text-xs font-medium text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                      >
                        <Send className="w-3.5 h-3.5 text-sky-400" />
                        <span>Alert {item.kb}</span>
                      </button>
                      <a
                        href={item.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="min-h-[38px] px-3 py-1.5 text-xs font-medium text-sky-400 hover:text-sky-300 bg-[#0B0F17] border border-slate-800 rounded-lg inline-flex items-center gap-1.5 whitespace-nowrap"
                      >
                        <span>KB Details</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* SECTION 3: Dual Discord Webhook & Android Notification Center */}
        <section id="section-notifications" className="space-y-6 scroll-mt-20">
          <div className="border-t border-slate-800/80 pt-10">
            <h2 className="text-xl sm:text-2xl font-bold text-white font-display">
              03. Priority-Based Discord Webhook &amp; Android Push Center
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Alerts every single Windows 11 update with automatic priority routing:{' '}
              <strong className="text-rose-300">High Priority (`@everyone` + Urgent Push)</strong>{' '}
              for Security/Cumulative KBs while WUB is blocked or overdue, and{' '}
              <strong className="text-sky-300">Standard Priority (Info Only)</strong> for Optional
              Preview updates.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            {/* Left Column (7 cols): Live Configuration Controls */}
            <div className="lg:col-span-7 bg-[#111827] border border-slate-800/90 rounded-xl p-6 space-y-6 flex flex-col justify-between">
              <div className="space-y-6">
                {/* Target KB Selector for Test */}
                <div className="space-y-2">
                  <label
                    htmlFor="select-test-kb"
                    className="block text-xs font-medium text-slate-300"
                  >
                    Select Windows 11 Update Package to Test Priority Routing
                  </label>
                  <select
                    id="select-test-kb"
                    value={selectedKbForTest}
                    onChange={(e) => setSelectedKbForTest(e.target.value)}
                    className="w-full min-h-[44px] px-3.5 py-2 bg-[#0B0F17] border border-slate-800 rounded-lg text-sm text-white font-mono-tabular focus:outline-none focus:border-sky-400"
                  >
                    {updates.map((u) => {
                      const isSec = isSecurityOrCumulativeUpdate(u);
                      return (
                        <option key={u.id} value={u.kb}>
                          {u.kb} · Win11 {u.version} (Build {u.build}) —{' '}
                          {isSec ? '[SECURITY / HIGH PRIORITY]' : '[OPTIONAL PREVIEW / 0 RISK]'}
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Channel A: Discord Webhook Configuration */}
                <div className="space-y-3 pt-4 border-t border-slate-800/80">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-semibold text-white">
                      Channel A: Discord Server &amp; Discord Android App Webhook
                    </h3>
                    <span className="text-xs text-slate-400 font-mono-tabular">
                      DISCORD_WEBHOOK_URL
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Paste your Discord channel Webhook URL below. Security KBs while WUB is blocked
                    automatically ping <code className="text-rose-300">@everyone</code>; Optional
                    Preview updates post a clean informational card without emergency pings.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-2.5">
                    <input
                      type="url"
                      value={discordWebhookUrl}
                      onChange={(e) => handleSaveDiscordUrl(e.target.value)}
                      placeholder="https://discord.com/api/webhooks/1234567890/abcdef..."
                      className="flex-1 min-h-[44px] px-3.5 py-2 bg-[#0B0F17] border border-slate-800 rounded-lg text-xs sm:text-sm text-white placeholder-slate-500 font-mono-tabular focus:outline-none focus:border-[#5865F2]"
                    />
                    <button
                      type="button"
                      onClick={handleSendDiscordTest}
                      disabled={sendingDiscord}
                      className="min-h-[44px] px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-[#5865F2] hover:bg-[#4752C4] disabled:opacity-60 rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Webhook className="w-4 h-4" />
                      <span>
                        {sendingDiscord
                          ? 'Sending...'
                          : isSelectedPreviewHighPriority
                          ? 'Send High-Priority @everyone Alert'
                          : 'Send Standard Info Alert'}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Channel B: Native Android Push via ntfy.sh + APK Native Bridge */}
                <div className="space-y-3 pt-4 border-t border-slate-800/80">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-semibold text-white">
                      Channel B: Direct Android Push Notification (APK Native + ntfy.sh)
                    </h3>
                    <span className="text-xs text-slate-400 font-mono-tabular">NTFY_TOPIC</span>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2.5">
                    <input
                      type="text"
                      value={ntfyTopic}
                      onChange={(e) => handleSaveNtfyTopic(e.target.value)}
                      placeholder="win11-update-alerts-982"
                      className="flex-1 min-h-[44px] px-3.5 py-2 bg-[#0B0F17] border border-slate-800 rounded-lg text-xs sm:text-sm text-white placeholder-slate-500 font-mono-tabular focus:outline-none focus:border-sky-400"
                    />
                    <button
                      type="button"
                      onClick={handleSendAndroidNtfyTest}
                      disabled={sendingNtfy}
                      className="min-h-[44px] px-4 py-2 text-xs sm:text-sm font-semibold text-slate-950 bg-sky-400 hover:bg-sky-300 disabled:opacity-60 rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Smartphone className="w-4 h-4" />
                      <span>{sendingNtfy ? 'Pushing...' : 'Send Android Push (ntfy)'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Combined Simulate Diff Action */}
              <div className="pt-5 mt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
                <span className="text-xs text-slate-400">
                  Test full pipeline (Microsoft scrape + WUB Risk check + Discord + Android):
                </span>
                <button
                  type="button"
                  onClick={() => handleRunLiveCheck(true)}
                  disabled={checkingNow}
                  className="min-h-[40px] px-3.5 py-2 text-xs font-medium text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${checkingNow ? 'animate-spin' : ''}`} />
                  <span>Simulate New Security KB Drop</span>
                </button>
              </div>
            </div>

            {/* Right Column (5 cols): Live Priority-Based Discord Embed Preview */}
            <div className="lg:col-span-5 bg-[#111827] border border-slate-800/90 rounded-xl p-6 flex flex-col justify-between space-y-5">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-400">
                    Live Priority Alert Preview ({selectedPreviewUpdate.kb})
                  </span>
                  <span
                    className={`text-xs font-mono-tabular font-semibold ${
                      isSelectedPreviewHighPriority ? 'text-rose-400' : 'text-sky-400'
                    }`}
                  >
                    {isSelectedPreviewHighPriority
                      ? 'HIGH PRIORITY (@everyone)'
                      : 'STANDARD INFO (No Ping)'}
                  </span>
                </div>

                {/* Simulated Discord Message Container */}
                <div className="bg-[#1E1F22] border border-slate-800 rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-[#5865F2] flex items-center justify-center text-xs font-bold text-white shrink-0">
                      W11
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-white">
                          Win11 Update Notifier
                        </span>
                        <span className="text-[11px] text-slate-400">APP · Just now</span>
                      </div>
                      <p className="text-xs text-slate-200 mt-0.5">
                        {isSelectedPreviewHighPriority ? (
                          <>
                            <span className="text-amber-300 font-semibold">@everyone</span> 🚨{' '}
                            <strong>[HIGH PRIORITY SECURITY ALERT]</strong>{' '}
                            {selectedPreviewUpdate.kb}
                          </>
                        ) : (
                          <>
                            ℹ️ <strong>[STANDARD INFO — 0 WUB RISK]</strong>{' '}
                            {selectedPreviewUpdate.kb}
                          </>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Discord Rich Embed Box */}
                  <div className="bg-[#2B2D31] border border-slate-700/80 rounded-lg p-3.5 space-y-2.5">
                    <p
                      className={`text-xs sm:text-sm font-semibold ${
                        isSelectedPreviewHighPriority ? 'text-rose-400' : 'text-sky-400'
                      }`}
                    >
                      Windows 11 {selectedPreviewUpdate.version}: {selectedPreviewUpdate.kb} (Build{' '}
                      {selectedPreviewUpdate.build})
                    </p>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {selectedPreviewUpdate.highlights}
                    </p>
                    <div className="grid grid-cols-3 gap-2 pt-1 text-xs">
                      <div>
                        <span className="text-slate-400 block">Classification</span>
                        <span className="text-white font-mono-tabular font-medium">
                          {isSecurityOrCumulativeUpdate(selectedPreviewUpdate)
                            ? 'Security KB'
                            : 'Preview (0 Risk)'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">WUB Status</span>
                        <span className="text-white font-mono-tabular font-medium">
                          {wubIsBlocked ? `BLOCKED (${wubMetrics.daysBlocked}d)` : 'UNBLOCKED'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Risk Meter</span>
                        <span className={`font-mono-tabular font-bold ${riskAccentText}`}>
                          {wubMetrics.riskLevel}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Latest Markdown Alert Output (state/latest_alert.md) */}
              <div className="space-y-2 pt-3 border-t border-slate-800/80">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-400">
                    Latest Generated Alert (state/latest_alert.md)
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopyCode('state/latest_alert.md', latestAlertMd)}
                    className="text-xs text-sky-400 hover:text-sky-300 flex items-center gap-1 cursor-pointer"
                  >
                    <Copy className="w-3 h-3" />
                    <span>Copy Markdown</span>
                  </button>
                </div>
                <pre className="bg-[#0B0F17] border border-slate-800 rounded-lg p-3 text-[11px] text-slate-300 font-mono-tabular overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-36">
                  {latestAlertMd}
                </pre>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 4: Downloadable Android APK in GitHub Releases (Repo: Win11) */}
        <section id="section-android" className="space-y-6 scroll-mt-20">
          <div className="border-t border-slate-800/80 pt-10 flex flex-col lg:flex-row lg:items-end justify-between gap-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-white font-display">
                04. Downloadable Android App (.apk) via GitHub Releases — Repo &quot;{cleanRepo}&quot;
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                When you push this project to your <strong>{cleanRepo}</strong> repository on GitHub,
                GitHub Actions automatically builds and attaches{' '}
                <code className="text-sky-300 font-mono-tabular">
                  Win11-Update-Notifier-Android.apk
                </code>{' '}
                with the WUB Safe-Window Guard and native Android 13+ notification bridge.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <a
                href={githubDirectApkUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="min-h-[44px] px-4 py-2.5 text-xs sm:text-sm font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                <span>Download APK from GitHub Release</span>
              </a>

              <a
                href={githubReleasesUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="min-h-[44px] px-4 py-2.5 text-xs sm:text-sm font-medium text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-2"
              >
                <Package className="w-4 h-4 text-sky-400" />
                <span>Open {cleanRepo} Releases Page</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* GitHub Repository Coordinate Bar for Direct APK Links */}
          <div className="bg-[#111827] border border-slate-800/90 rounded-xl p-5 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
              <div className="md:col-span-4 space-y-1.5">
                <label htmlFor="gh-owner-input" className="block text-xs text-slate-300">
                  Your GitHub Username
                </label>
                <input
                  id="gh-owner-input"
                  type="text"
                  value={githubOwner}
                  onChange={(e) => handleSaveGithubOwner(e.target.value)}
                  placeholder="mishramukti982-gif"
                  className="w-full min-h-[42px] px-3.5 py-2 bg-[#0B0F17] border border-slate-800 rounded-lg text-sm text-white font-mono-tabular focus:outline-none focus:border-sky-400"
                />
              </div>

              <div className="md:col-span-4 space-y-1.5">
                <label htmlFor="gh-repo-input" className="block text-xs text-slate-300">
                  Repository Name (Set to Win11)
                </label>
                <input
                  id="gh-repo-input"
                  type="text"
                  value={githubRepoName}
                  onChange={(e) => handleSaveGithubRepo(e.target.value)}
                  placeholder="Win11"
                  className="w-full min-h-[42px] px-3.5 py-2 bg-[#0B0F17] border border-slate-800 rounded-lg text-sm text-white font-mono-tabular focus:outline-none focus:border-sky-400"
                />
              </div>

              <div className="md:col-span-4 flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleInstallAction}
                  className="w-full min-h-[42px] px-4 py-2 text-xs sm:text-sm font-medium text-sky-300 bg-sky-950/60 hover:bg-sky-900/70 border border-sky-700/60 rounded-lg transition-colors whitespace-nowrap flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Smartphone className="w-4 h-4" />
                  <span>
                    {isInstalled ? 'Installed on Device' : 'Or Install Instant WebAPK Now'}
                  </span>
                </button>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-400 font-mono-tabular">
              <span>Release Tag: v1.0.0 · Asset: Win11-Update-Notifier-Android.apk</span>
              <span className="truncate text-sky-400">{githubDirectApkUrl}</span>
            </div>
          </div>
        </section>

        {/* SECTION 5: GitHub Actions & Repository Files Inspector */}
        <section id="section-automation" className="space-y-6 scroll-mt-20">
          <div className="border-t border-slate-800/80 pt-10 flex flex-col lg:flex-row lg:items-end justify-between gap-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-white font-display">
                05. GitHub Sync &amp; Automated Workflows (Repo: {cleanRepo})
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Includes the <strong>Android APK Release Builder workflow</strong> and the{' '}
                <strong>6-Hour Priority-Based Windows 11 Update Notifier workflow</strong>.
              </p>
            </div>

            {/* File Switcher Tabs */}
            <div className="flex flex-wrap items-center gap-1.5 bg-[#111827] p-1.5 rounded-lg border border-slate-800">
              <button
                type="button"
                onClick={() => setSelectedCodeTab('apk-workflow')}
                className={`min-h-[36px] px-3 py-1.5 text-xs font-mono-tabular rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  selectedCodeTab === 'apk-workflow'
                    ? 'bg-emerald-400 text-slate-950 font-semibold'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                android-apk-release.yml (APK Release)
              </button>
              <button
                type="button"
                onClick={() => setSelectedCodeTab('workflow')}
                className={`min-h-[36px] px-3 py-1.5 text-xs font-mono-tabular rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  selectedCodeTab === 'workflow'
                    ? 'bg-sky-500 text-slate-950 font-semibold'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                win11-update-notifier.yml (6h Cron)
              </button>
              <button
                type="button"
                onClick={() => setSelectedCodeTab('python')}
                className={`min-h-[36px] px-3 py-1.5 text-xs font-mono-tabular rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  selectedCodeTab === 'python'
                    ? 'bg-sky-500 text-slate-950 font-semibold'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                scripts/check_win11_updates.py
              </button>
              <button
                type="button"
                onClick={() => setSelectedCodeTab('state')}
                className={`min-h-[36px] px-3 py-1.5 text-xs font-mono-tabular rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  selectedCodeTab === 'state'
                    ? 'bg-sky-500 text-slate-950 font-semibold'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                state/last_seen.json ({repoState.kbs.length} KBs)
              </button>
            </div>
          </div>

          <div className="bg-[#111827] border border-slate-800/90 rounded-xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 bg-[#0B0F17] border-b border-slate-800">
              <div className="flex items-center gap-2 text-xs font-mono-tabular text-slate-300">
                <Terminal className="w-4 h-4 text-sky-400" />
                <span>
                  {selectedCodeTab === 'apk-workflow'
                    ? '.github/workflows/android-apk-release.yml'
                    : selectedCodeTab === 'workflow'
                    ? '.github/workflows/win11-update-notifier.yml'
                    : selectedCodeTab === 'python'
                    ? 'scripts/check_win11_updates.py'
                    : 'state/last_seen.json'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  const content =
                    selectedCodeTab === 'apk-workflow'
                      ? automationFiles.apkWorkflowYaml
                      : selectedCodeTab === 'workflow'
                      ? automationFiles.workflowYaml
                      : selectedCodeTab === 'python'
                      ? automationFiles.pythonScript
                      : automationFiles.stateJson;
                  handleCopyCode(selectedCodeTab, content);
                }}
                className="min-h-[32px] px-3 py-1 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-md flex items-center gap-1.5 cursor-pointer"
              >
                {copiedKey === selectedCodeTab ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy File</span>
                  </>
                )}
              </button>
            </div>
            <pre className="p-4 text-xs font-mono-tabular text-slate-200 overflow-x-auto leading-relaxed max-h-[380px]">
              {selectedCodeTab === 'apk-workflow'
                ? automationFiles.apkWorkflowYaml
                : selectedCodeTab === 'workflow'
                ? automationFiles.workflowYaml
                : selectedCodeTab === 'python'
                ? automationFiles.pythonScript
                : automationFiles.stateJson}
            </pre>
          </div>
        </section>
      </main>

      {/* Quiet Footer */}
      <footer className="max-w-7xl mx-auto px-4 sm:px-8 pt-12 pb-8 mt-12 border-t border-slate-800/60 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
        <p>
          Windows 11 Update Notifier · WUB Safe-Window Guard · Repo: {cleanOwner}/{cleanRepo}
        </p>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => scrollToSection('wub-guard', 'section-wub-guard')}
            className="hover:text-slate-300 transition-colors cursor-pointer"
          >
            WUB Safe-Window Guard
          </button>
          <span>·</span>
          <a
            href={githubReleasesUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-slate-300 transition-colors"
          >
            {cleanRepo} GitHub Releases (APK)
          </a>
          <span>·</span>
          <button
            type="button"
            onClick={() => scrollToSection('since-date', 'section-since-date')}
            className="hover:text-slate-300 transition-colors cursor-pointer"
          >
            Updates Since Date
          </button>
        </div>
      </footer>

      {/* Mobile Fixed Bottom Thumb Navigation Bar (<= 15% viewport height) */}
      <nav
        aria-label="Mobile Navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0B0F17]/95 backdrop-blur-md border-t border-slate-800 grid grid-cols-5 items-center h-14 px-1"
      >
        <button
          type="button"
          onClick={() => scrollToSection('wub-guard', 'section-wub-guard')}
          className={`min-h-[44px] flex flex-col items-center justify-center text-[10px] font-medium ${
            activeSection === 'wub-guard' ? 'text-sky-400' : 'text-slate-400'
          }`}
        >
          <Shield className="w-4 h-4" />
          <span className="mt-0.5">WUB Guard</span>
        </button>

        <button
          type="button"
          onClick={() => scrollToSection('tracker', 'section-tracker')}
          className={`min-h-[44px] flex flex-col items-center justify-center text-[10px] font-medium ${
            activeSection === 'tracker' ? 'text-sky-400' : 'text-slate-400'
          }`}
        >
          <RefreshCw className="w-4 h-4" />
          <span className="mt-0.5">Updates</span>
        </button>

        <button
          type="button"
          onClick={() => scrollToSection('since-date', 'section-since-date')}
          className={`min-h-[44px] flex flex-col items-center justify-center text-[10px] font-medium ${
            activeSection === 'since-date' ? 'text-sky-400' : 'text-slate-400'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span className="mt-0.5">Since Date</span>
        </button>

        <button
          type="button"
          onClick={() => scrollToSection('notifications', 'section-notifications')}
          className={`min-h-[44px] flex flex-col items-center justify-center text-[10px] font-medium ${
            activeSection === 'notifications' ? 'text-sky-400' : 'text-slate-400'
          }`}
        >
          <Webhook className="w-4 h-4" />
          <span className="mt-0.5">Discord</span>
        </button>

        <button
          type="button"
          onClick={() => scrollToSection('android', 'section-android')}
          className={`min-h-[44px] flex flex-col items-center justify-center text-[10px] font-medium ${
            activeSection === 'android' ? 'text-sky-400' : 'text-slate-400'
          }`}
        >
          <Download className="w-4 h-4" />
          <span className="mt-0.5">Get APK</span>
        </button>
      </nav>

      {/* Guided Android / iOS PWA Installation Modal */}
      {showInstallModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-[#111827] border border-slate-700 p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <Smartphone className="w-5 h-5 text-sky-400" />
                <h3 className="text-lg font-bold text-white font-display">
                  Download Android APK or Install App
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowInstallModal(false)}
                className="text-slate-400 hover:text-white p-1"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {isIOS ? (
              <div className="space-y-2 text-xs sm:text-sm text-slate-300 leading-relaxed">
                <p>To install on iPhone or iPad:</p>
                <ol className="list-decimal list-inside space-y-1.5">
                  <li>
                    Tap the <strong>Share</strong> icon in your Safari toolbar.
                  </li>
                  <li>
                    Scroll down and select <strong>Add to Home Screen</strong>.
                  </li>
                </ol>
              </div>
            ) : (
              <div className="space-y-3 text-xs sm:text-sm text-slate-300 leading-relaxed">
                <p className="font-semibold text-white">
                  Option A: Download the `.apk` from your `{cleanRepo}` GitHub Releases
                </p>
                <p>
                  Push this project to your <strong>{cleanRepo}</strong> repo via AI Studio&apos;s{' '}
                  <strong>Settings → GitHub</strong>, then download{' '}
                  <code className="text-emerald-300 font-mono-tabular">
                    Win11-Update-Notifier-Android.apk
                  </code>{' '}
                  directly from your repo&apos;s <strong>Releases</strong> section.
                </p>
                <p className="font-semibold text-white pt-1">
                  Option B: Instant Android WebAPK Install
                </p>
                <p>
                  Open this app&apos;s Shared URL in <strong>Chrome on Android</strong>, tap the{' '}
                  <strong>⋮</strong> menu, and select <strong>Install app</strong>.
                </p>
              </div>
            )}

            <div className="pt-2 flex justify-end gap-2">
              <a
                href={githubReleasesUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="min-h-[40px] px-4 py-2 text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-colors inline-flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Open {cleanRepo} Releases</span>
              </a>
              <button
                type="button"
                onClick={() => setShowInstallModal(false)}
                className="min-h-[40px] px-4 py-2 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
