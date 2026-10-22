/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowUpDown,
  Bell,
  Calendar,
  Check,
  Copy,
  Download,
  ExternalLink,
  GitBranch,
  RefreshCw,
  Search,
  Send,
  Smartphone,
  Terminal,
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

interface RepoState {
  versions: string[];
  kbs: string[];
  builds: string[];
  last_checked_utc?: string;
}

interface AutomationFiles {
  pythonScript: string;
  workflowYaml: string;
  stateJson: string;
  latestAlertMd: string;
}

type UpdateTypeFilter =
  | 'All'
  | 'Major Feature Updates'
  | 'Security / Cumulative KB'
  | 'Out-of-Band / Preview';

type ChannelFilter = 'All' | '26H2' | '26H1' | '24H2' | '23H2';

type ActiveSection = 'tracker' | 'since-date' | 'notifications' | 'automation' | 'android';

export default function App() {
  const isOnline = useOnlineStatus();
  const { isInstallable, isInstalled, isIOS, isAndroid, install } = usePWAInstall();

  const [updates, setUpdates] = useState<Win11UpdateItem[]>([]);
  const [repoState, setRepoState] = useState<RepoState>({
    versions: ['24H2', '26H1', '26H2'],
    kbs: ['KB5127646', 'KB5129195'],
    builds: ['26200.9711', '28000.3231'],
    last_checked_utc: new Date().toISOString(),
  });
  const [latestAlertMd, setLatestAlertMd] = useState<string>('');
  const [liveScraped, setLiveScraped] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(true);
  const [checkingNow, setCheckingNow] = useState<boolean>(false);

  // Main Tracker Filters
  const [typeFilter, setTypeFilter] = useState<UpdateTypeFilter>('All');
  const [channelFilter, setChannelFilter] = useState<ChannelFilter>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeSection, setActiveSection] = useState<ActiveSection>('tracker');

  // Dedicated "Updates Since Date" Section State
  const [sinceDate, setSinceDate] = useState<string>('2026-08-01');
  const [sinceChannelFilter, setSinceChannelFilter] = useState<ChannelFilter>('All');
  const [sinceSortOrder, setSinceSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [sendingDigestDiscord, setSendingDigestDiscord] = useState<boolean>(false);

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
    stateJson: '',
    latestAlertMd: '',
  });
  const [selectedCodeTab, setSelectedCodeTab] = useState<
    'workflow' | 'python' | 'state' | 'alert'
  >('workflow');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // In-app toast notification banner
  const [toast, setToast] = useState<{
    title: string;
    message: string;
    kind: 'info' | 'success' | 'warning';
  } | null>(null);

  // Android / PWA install guide modal
  const [showInstallModal, setShowInstallModal] = useState<boolean>(false);

  const todayIso = useMemo(() => new Date().toISOString().slice(0, 10), []);

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

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [updatesResp, filesResp] = await Promise.all([
        fetch('/api/updates'),
        fetch('/api/automation-files'),
      ]);
      if (updatesResp.ok) {
        const data = await updatesResp.json();
        setUpdates(data.updates || []);
        if (data.state) setRepoState(data.state);
        if (data.latestAlertMd) setLatestAlertMd(data.latestAlertMd);
        setLiveScraped(Boolean(data.liveScraped));
      }
      if (filesResp.ok) {
        const filesData = await filesResp.json();
        setAutomationFiles(filesData);
      }
    } catch {
      showToast(
        'Offline Cache Active',
        'Displaying locally cached Windows 11 Release Health records.',
        'warning'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

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

        showToast(
          data.title || 'Release Health Checked',
          `Synced Microsoft Windows 11 Release Information and updated state/last_seen.json.${channelNote}`,
          'success'
        );
      }
    } catch {
      showToast(
        'Check Failed',
        'Could not reach backend scraper endpoint. Please verify connection.',
        'warning'
      );
    } finally {
      setCheckingNow(false);
    }
  };

  const handleTestBrowserAndAndroidNotification = async () => {
    const sampleUpdate =
      updates.find((u) => u.kb === selectedKbForTest) ||
      updates[0] || {
        kb: 'KB5129195',
        build: '28000.3231',
        version: '26H2',
        title: 'Windows 11, version 26H2 Cumulative Update',
      };

    const notifTitle = `Windows 11 ${sampleUpdate.version} Update: ${sampleUpdate.kb}`;
    const notifBody = `OS Build ${sampleUpdate.build} — ${sampleUpdate.title}. Tap to view release details.`;

    showToast(notifTitle, notifBody, 'success');

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
              await reg.showNotification(notifTitle, {
                body: notifBody,
                icon: '/pwa-192x192.png',
                badge: '/pwa-192x192.png',
                tag: 'win11-update-alert',
              });
              return;
            }
          }
          new Notification(notifTitle, {
            body: notifBody,
            icon: '/pwa-192x192.png',
          });
        }
      } catch {
        // Fallback toast already displayed
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
      updates[0] || {
        kb: 'KB5129195',
        build: '28000.3231',
        version: '26H2',
        title: 'Windows 11 26H2 Update',
      };

    setSendingDiscord(true);
    try {
      const resp = await fetch('/api/notify/discord', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          webhookUrl: discordWebhookUrl.trim(),
          kb: sampleUpdate.kb,
          build: sampleUpdate.build,
          version: sampleUpdate.version,
          title: `New Windows 11 ${sampleUpdate.version} Update: ${sampleUpdate.kb} (Build ${sampleUpdate.build})`,
        }),
      });
      const data = await resp.json();
      if (resp.ok && data.ok) {
        showToast('Discord Alert Delivered', data.message, 'success');
      } else {
        showToast('Discord Webhook Error', data.error || 'Failed to send webhook.', 'warning');
      }
    } catch {
      showToast('Network Error', 'Could not reach Discord notification proxy.', 'warning');
    } finally {
      setSendingDiscord(false);
    }
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
      updates[0] || {
        kb: 'KB5129195',
        build: '28000.3231',
        version: '26H2',
      };

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
        }),
      });
      const data = await resp.json();
      if (resp.ok && data.ok) {
        showToast('Android Push Sent via ntfy.sh', data.message, 'success');
      } else {
        showToast('Android Push Error', data.error || 'Could not reach ntfy.sh', 'warning');
      }
    } catch {
      showToast('Network Error', 'Failed to send Android push alert.', 'warning');
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
    const securityCount = updatesSinceSelectedDate.filter(
      (u) => u.type === 'Security / Cumulative KB'
    ).length;
    const previewCount = updatesSinceSelectedDate.filter(
      (u) => u.type === 'Out-of-Band / Preview'
    ).length;
    return { total, majorCount, securityCount, previewCount };
  }, [updatesSinceSelectedDate]);

  const sinceDateMarkdownReport = useMemo(() => {
    const lines = [
      `## Windows 11 Updates Released Since ${sinceDate} (Through ${todayIso})`,
      `Total Updates Found: ${updatesSinceSelectedDate.length}`,
      '',
      ...updatesSinceSelectedDate.map(
        (u) =>
          `- **${u.releaseDate}** · **Windows 11 ${u.version}** · \`${u.kb}\` (OS Build \`${u.build}\`) — *${u.type}*: ${u.title}`
      ),
    ];
    return lines.join('\n');
  }, [updatesSinceSelectedDate, sinceDate, todayIso]);

  const handleSendSinceDateDigestToDiscord = async () => {
    if (!discordWebhookUrl.trim()) {
      scrollToSection('notifications', 'section-notifications');
      showToast(
        'Discord Webhook URL Required',
        'Paste your Discord Webhook URL in the Dual Notification Center below to send this date-range report.',
        'warning'
      );
      return;
    }
    if (updatesSinceSelectedDate.length === 0) {
      showToast('No Updates in Range', 'Select an earlier start date first.', 'warning');
      return;
    }

    setSendingDigestDiscord(true);
    try {
      const latest = updatesSinceSelectedDate[0];
      const kbsList = updatesSinceSelectedDate.map((u) => u.kb).join(', ');
      const buildsList = updatesSinceSelectedDate.map((u) => u.build).join(', ');
      const resp = await fetch('/api/notify/discord', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          webhookUrl: discordWebhookUrl.trim(),
          kb: kbsList.slice(0, 120),
          build: buildsList.slice(0, 120),
          version: `${updatesSinceSelectedDate.length} Updates Since ${sinceDate}`,
          title: `Windows 11 Updates From ${sinceDate} to Now (${updatesSinceSelectedDate.length} Total, Latest: ${latest.kb})`,
        }),
      });
      const data = await resp.json();
      if (resp.ok && data.ok) {
        showToast(
          'Date-Range Digest Sent to Discord',
          `Delivered summary of ${updatesSinceSelectedDate.length} updates since ${sinceDate} to Discord!`,
          'success'
        );
      } else {
        showToast('Discord Webhook Error', data.error || 'Could not send digest.', 'warning');
      }
    } catch {
      showToast('Network Error', 'Failed to reach Discord proxy endpoint.', 'warning');
    } finally {
      setSendingDigestDiscord(false);
    }
  };

  const applyDatePreset = (daysAgoOrIso: number | string) => {
    if (typeof daysAgoOrIso === 'string') {
      setSinceDate(daysAgoOrIso);
      return;
    }
    const d = new Date();
    d.setDate(d.getDate() - daysAgoOrIso);
    setSinceDate(d.toISOString().slice(0, 10));
  };

  const selectedPreviewUpdate = useMemo(() => {
    return (
      updates.find((u) => u.kb === selectedKbForTest) ||
      updates[0] || {
        id: 'KB5129195-28000.3231',
        kb: 'KB5129195',
        build: '28000.3231',
        version: '26H2',
        type: 'Major Feature Updates',
        releaseDate: '2026-10-14',
        title: 'Windows 11, version 26H2 Annual Feature Update & October Cumulative Rollup',
        highlights: 'General availability build for Windows 11 26H2.',
        servicingChannel: 'General Availability Channel',
        sourceUrl: 'https://learn.microsoft.com/en-us/windows/release-health/windows11-release-information',
      }
    );
  }, [updates, selectedKbForTest]);

  const scrollToSection = (section: ActiveSection, elementId: string) => {
    setActiveSection(section);
    const el = document.getElementById(elementId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0F17] text-slate-100 pb-20 md:pb-12">
      {/* Offline Connectivity Banner */}
      {!isOnline && (
        <div className="bg-amber-500/20 border-b border-amber-500/40 px-4 py-2 text-xs text-amber-200 text-center">
          Offline Mode Active — Showing cached Windows 11 Release Health data via Service Worker.
        </div>
      )}

      {/* Top Navigation Bar — Strict 3-Zone Contract */}
      <header className="sticky top-0 z-30 flex items-center justify-between gap-8 px-4 sm:px-8 py-3.5 bg-[#0B0F17]/90 backdrop-blur-md border-b border-slate-800/80">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#top"
          className="text-base sm:text-lg font-bold tracking-tight text-white whitespace-nowrap shrink-0 font-display"
        >
          Win11 Update Notifier
        </a>

        {/* Zone 2: 5 concise single-line text navigation links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-400">
          <button
            type="button"
            onClick={() => scrollToSection('tracker', 'section-tracker')}
            className={`hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeSection === 'tracker'
                ? 'text-white underline underline-offset-8 decoration-sky-400'
                : ''
            }`}
          >
            Release Tracker
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
            Android App
          </button>
          <button
            type="button"
            onClick={() => scrollToSection('automation', 'section-automation')}
            className={`hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeSection === 'automation'
                ? 'text-white underline underline-offset-8 decoration-sky-400'
                : ''
            }`}
          >
            GitHub Actions
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
      <main id="top" className="max-w-7xl mx-auto px-4 sm:px-8 pt-6 sm:pt-10 space-y-12">
        {/* Hero & Action Bar */}
        <section className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-8 border-b border-slate-800/80">
          <div className="max-w-2xl space-y-3">
            <p className="text-xs font-medium text-sky-400 tracking-wide">
              Microsoft Windows 11 Release Health · Android PWA &amp; Discord Webhook Suite
            </p>
            <h1
              className="text-2xl sm:text-4xl font-bold text-white tracking-tight font-display"
              style={{ textWrap: 'balance' }}
            >
              Real-Time Windows 11 Build &amp; KB Update Monitor
            </h1>
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
              Tracks major feature releases (26H2, 26H1, 24H2) and monthly cumulative security KBs
              directly from Microsoft Learn. Filter all updates from any start date to now, install
              as an Android app, or push to Discord and GitHub Actions.
            </p>
          </div>

          {/* Primary Action Toolbar */}
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => scrollToSection('since-date', 'section-since-date')}
              className="min-h-[44px] px-4 py-2.5 text-xs sm:text-sm font-medium text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-2 cursor-pointer"
            >
              <Calendar className="w-4 h-4 text-sky-400" />
              <span>Updates Since Date</span>
            </button>

            <button
              type="button"
              onClick={handleTestBrowserAndAndroidNotification}
              className="min-h-[44px] px-4 py-2.5 text-xs sm:text-sm font-medium text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-2 cursor-pointer"
            >
              <Bell className="w-4 h-4 text-sky-400" />
              <span>Test Browser Notification</span>
            </button>

            <button
              type="button"
              onClick={() => scrollToSection('notifications', 'section-notifications')}
              className="min-h-[44px] px-4 py-2.5 text-xs sm:text-sm font-medium text-white bg-[#5865F2] hover:bg-[#4752C4] rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-2 cursor-pointer"
            >
              <Webhook className="w-4 h-4" />
              <span>Configure Discord &amp; Android Push</span>
            </button>

            {!isInstalled && (
              <button
                type="button"
                onClick={handleInstallAction}
                className="min-h-[44px] px-4 py-2.5 text-xs sm:text-sm font-medium text-emerald-200 bg-emerald-950/70 hover:bg-emerald-900/80 border border-emerald-700/60 rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-2 cursor-pointer"
              >
                <Smartphone className="w-4 h-4 text-emerald-400" />
                <span>{isInstallable ? 'Install Android App' : 'Install on Android'}</span>
              </button>
            )}
          </div>
        </section>

        {/* Full-Width 4-Column Telemetry Summary Row */}
        <section
          aria-label="Release Metrics"
          className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6"
        >
          <div className="bg-[#111827] border border-slate-800/90 rounded-xl p-5">
            <p className="text-xs text-slate-400">Latest Feature Build</p>
            <p className="text-xl sm:text-2xl font-bold text-white mt-1.5 font-mono-tabular">
              26H2 · 28000.3231
            </p>
            <p className="text-xs text-slate-400 mt-2">
              KB5129195 · General Availability
            </p>
          </div>

          <div className="bg-[#111827] border border-slate-800/90 rounded-xl p-5">
            <p className="text-xs text-slate-400">Latest 26H1 Security KB</p>
            <p className="text-xl sm:text-2xl font-bold text-white mt-1.5 font-mono-tabular">
              KB5127646
            </p>
            <p className="text-xs text-slate-400 mt-2">
              OS Build 26200.9711 · Cumulative
            </p>
          </div>

          <div className="bg-[#111827] border border-slate-800/90 rounded-xl p-5">
            <p className="text-xs text-slate-400">Tracked State Repository</p>
            <p className="text-xl sm:text-2xl font-bold text-white mt-1.5 font-mono-tabular">
              {repoState.kbs.length} KBs · {repoState.builds.length} Builds
            </p>
            <p className="text-xs text-slate-400 mt-2">
              state/last_seen.json · {liveScraped ? 'Live Microsoft Feed' : 'Curated Feed'}
            </p>
          </div>

          <div className="bg-[#111827] border border-slate-800/90 rounded-xl p-5">
            <p className="text-xs text-slate-400">GitHub Action Schedule</p>
            <p className="text-xl sm:text-2xl font-bold text-white mt-1.5 font-mono-tabular">
              Every 6 Hours
            </p>
            <p className="text-xs text-slate-400 mt-2">
              cron: &apos;0 */6 * * *&apos; · Issues + Discord
            </p>
          </div>
        </section>

        {/* SECTION 1: Live Windows 11 Release Tracker */}
        <section id="section-tracker" className="space-y-6 scroll-mt-20">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-white font-display">
                01. Windows 11 Release Health Feed
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Filter by Update Type or Servicing Channel, or click any KB update to test it in
                Discord and Android push notifications.
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
                      'Major Feature Updates',
                      'Security / Cumulative KB',
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
              <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto">
                Try clearing the search query or switching Update Type and Servicing Channel back to
                All.
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
                          <span className="text-sky-400 font-semibold">
                            Windows 11 {item.version}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className="text-white font-semibold">{item.kb}</span>
                          <span aria-hidden="true">·</span>
                          <span>OS Build {item.build}</span>
                          <span aria-hidden="true">·</span>
                          <span>{item.type}</span>
                          <span aria-hidden="true">·</span>
                          <span>Released {item.releaseDate}</span>
                          {item.isNew && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="text-emerald-400 font-medium">
                                Newly Detected
                              </span>
                            </>
                          )}
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
                          onClick={() => {
                            setSelectedKbForTest(item.kb);
                            scrollToSection('notifications', 'section-notifications');
                            showToast(
                              `Selected ${item.kb} for Alert Testing`,
                              `Ready to dispatch ${item.kb} (Build ${item.build}) to Discord or Android.`,
                              'info'
                            );
                          }}
                          className="min-h-[40px] px-3.5 py-2 text-xs font-medium text-slate-200 bg-slate-800/90 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer"
                        >
                          <Send className="w-3.5 h-3.5 text-sky-400" />
                          <span>Send Alert for {item.kb}</span>
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
                Pick any start date to view a complete list of every major and minor Windows 11
                update released from that date up to today ({todayIso}).
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
                onClick={handleSendSinceDateDigestToDiscord}
                disabled={sendingDigestDiscord || updatesSinceSelectedDate.length === 0}
                className="min-h-[40px] px-4 py-2 text-xs font-semibold text-white bg-[#5865F2] hover:bg-[#4752C4] disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer"
              >
                <Webhook className="w-3.5 h-3.5" />
                <span>
                  {sendingDigestDiscord
                    ? 'Sending Digest...'
                    : `Send All (${updatesSinceSelectedDate.length}) to Discord`}
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
                  Select Start Date (From Date → Now)
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-sky-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="since-date-input"
                    type="date"
                    value={sinceDate}
                    max={todayIso}
                    onChange={(e) => setSinceDate(e.target.value)}
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
                  <button
                    type="button"
                    onClick={() => applyDatePreset('2025-01-01')}
                    className="min-h-[38px] px-3 py-1.5 text-xs font-medium text-slate-200 bg-[#0B0F17] hover:bg-slate-800 border border-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0 font-mono-tabular cursor-pointer"
                  >
                    All Since 2025
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
                <span className="text-xs text-slate-400 block">Major Feature Updates</span>
                <span className="text-lg sm:text-xl font-bold text-sky-400 font-mono-tabular mt-1 block">
                  {sinceDateStats.majorCount} Releases
                </span>
              </div>
              <div className="bg-[#0B0F17] border border-slate-800/80 rounded-lg p-3.5">
                <span className="text-xs text-slate-400 block">Security / Cumulative KBs</span>
                <span className="text-lg sm:text-xl font-bold text-emerald-400 font-mono-tabular mt-1 block">
                  {sinceDateStats.securityCount} KBs
                </span>
              </div>
              <div className="bg-[#0B0F17] border border-slate-800/80 rounded-lg p-3.5">
                <span className="text-xs text-slate-400 block">Out-of-Band / Preview</span>
                <span className="text-lg sm:text-xl font-bold text-amber-400 font-mono-tabular mt-1 block">
                  {sinceDateStats.previewCount} Previews
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
              <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto">
                Pick an earlier start date (such as Jan 2026 or 2025) to see all historical feature
                and cumulative KB releases.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSinceDate('2025-01-01');
                  setSinceChannelFilter('All');
                }}
                className="min-h-[40px] px-4 py-2 text-xs font-semibold text-slate-950 bg-sky-400 hover:bg-sky-300 rounded-lg transition-colors cursor-pointer"
              >
                Show All Updates Since 2025
              </button>
            </div>
          ) : (
            <div className="bg-[#111827] border border-slate-800/90 rounded-xl divide-y divide-slate-800/80">
              {updatesSinceSelectedDate.map((item, idx) => (
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
                      <span className="text-sky-400 font-semibold">
                        Windows 11 {item.version}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="text-white font-semibold">{item.kb}</span>
                      <span aria-hidden="true">·</span>
                      <span>Build {item.build}</span>
                      <span aria-hidden="true">·</span>
                      <span>{item.type}</span>
                    </div>
                    <p className="text-sm sm:text-base font-semibold text-white font-display">
                      {item.title}
                    </p>
                    <p className="text-xs text-slate-300 leading-relaxed">{item.highlights}</p>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
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
              ))}
            </div>
          )}
        </section>

        {/* SECTION 3: Dual Discord Webhook & Android Notification Center */}
        <section id="section-notifications" className="space-y-6 scroll-mt-20">
          <div className="border-t border-slate-800/80 pt-10">
            <h2 className="text-xl sm:text-2xl font-bold text-white font-display">
              03. Dual Notification Center — Discord Webhook &amp; Android Push
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Test and configure both notification channels simultaneously: rich Discord Webhook
              embeds for your Discord Android/desktop app and native Android notifications.
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
                    Select Windows 11 Update Package to Test
                  </label>
                  <select
                    id="select-test-kb"
                    value={selectedKbForTest}
                    onChange={(e) => setSelectedKbForTest(e.target.value)}
                    className="w-full min-h-[44px] px-3.5 py-2 bg-[#0B0F17] border border-slate-800 rounded-lg text-sm text-white font-mono-tabular focus:outline-none focus:border-sky-400"
                  >
                    {updates.map((u) => (
                      <option key={u.id} value={u.kb}>
                        {u.kb} · Windows 11 {u.version} (Build {u.build}) — {u.type}
                      </option>
                    ))}
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
                    In Discord, open{' '}
                    <strong>Channel Settings → Integrations → Webhooks → New Webhook</strong>, copy
                    the Webhook URL, and paste it below to send a live formatted Windows 11 release
                    embed.
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
                        {sendingDiscord ? 'Sending to Discord...' : 'Send Live Discord Alert'}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Channel B: Native Android Push via ntfy.sh + Browser Web Push */}
                <div className="space-y-3 pt-4 border-t border-slate-800/80">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-semibold text-white">
                      Channel B: Direct Android Push Notification (PWA + ntfy.sh)
                    </h3>
                    <span className="text-xs text-slate-400 font-mono-tabular">NTFY_TOPIC</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Receive instant lock-screen push notifications on Android using either the
                    installed PWA Service Worker or the free open-source{' '}
                    <a
                      href="https://ntfy.sh"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sky-400 hover:underline"
                    >
                      ntfy Android app
                    </a>{' '}
                    subscribed to your custom topic below.
                  </p>
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
                  Want to test the full pipeline (state update + Discord + Android)?
                </span>
                <button
                  type="button"
                  onClick={() => handleRunLiveCheck(true)}
                  disabled={checkingNow}
                  className="min-h-[40px] px-3.5 py-2 text-xs font-medium text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${checkingNow ? 'animate-spin' : ''}`} />
                  <span>Simulate New Release Detection</span>
                </button>
              </div>
            </div>

            {/* Right Column (5 cols): Live Discord Mobile Embed Preview */}
            <div className="lg:col-span-5 bg-[#111827] border border-slate-800/90 rounded-xl p-6 flex flex-col justify-between space-y-5">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-400">
                    Live Discord &amp; Android Notification Preview
                  </span>
                  <span className="text-xs text-slate-400 font-mono-tabular">
                    {selectedPreviewUpdate.kb}
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
                      <p className="text-xs text-slate-300">
                        New Windows 11 {selectedPreviewUpdate.version} Update Alert:{' '}
                        <span className="font-mono-tabular text-white">
                          {selectedPreviewUpdate.kb}
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* Discord Rich Embed Box */}
                  <div className="bg-[#2B2D31] border border-slate-700/80 rounded-lg p-3.5 space-y-2.5">
                    <p className="text-xs sm:text-sm font-semibold text-sky-400">
                      Windows 11 {selectedPreviewUpdate.version} Update Alert:{' '}
                      {selectedPreviewUpdate.kb} (Build {selectedPreviewUpdate.build})
                    </p>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {selectedPreviewUpdate.highlights}
                    </p>
                    <div className="grid grid-cols-3 gap-2 pt-1 text-xs">
                      <div>
                        <span className="text-slate-400 block">Version</span>
                        <span className="text-white font-mono-tabular font-medium">
                          {selectedPreviewUpdate.version}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">KB Package</span>
                        <span className="text-white font-mono-tabular font-medium">
                          {selectedPreviewUpdate.kb}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">OS Build</span>
                        <span className="text-white font-mono-tabular font-medium">
                          {selectedPreviewUpdate.build}
                        </span>
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-400 pt-1">
                      Windows 11 Update Notifier • Instant Discord &amp; Android Alert
                    </p>
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

        {/* SECTION 4: Installable Android App Setup & Capabilities */}
        <section id="section-android" className="space-y-6 scroll-mt-20">
          <div className="border-t border-slate-800/80 pt-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-white font-display">
                04. Dedicated Android App &amp; Mobile Push Experience
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Install this application directly onto your Android phone as a standalone app and
                pair it with Discord Android or ntfy push alerts.
              </p>
            </div>

            <button
              type="button"
              onClick={handleInstallAction}
              className="min-h-[44px] px-5 py-2.5 text-xs sm:text-sm font-semibold text-slate-950 bg-sky-400 hover:bg-sky-300 rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-2 cursor-pointer self-start sm:self-auto"
            >
              <Download className="w-4 h-4" />
              <span>
                {isInstalled
                  ? 'Android App Installed (Standalone)'
                  : 'Install App on Android Home Screen'}
              </span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-[#111827] border border-slate-800/90 rounded-xl p-6 space-y-3">
              <p className="text-xs font-mono-tabular text-sky-400">STEP 01 · STANDALONE ANDROID PWA</p>
              <h3 className="text-base font-semibold text-white font-display">
                Add to Android Home Screen
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Open your deployed URL in <strong>Chrome on Android</strong> and tap{' '}
                <strong>Install Android App</strong> (or tap the Chrome menu <strong>⋮ → Install app</strong>).
                It installs with a native Windows 11 Fluent icon, full-screen standalone window,
                and offline Service Worker cache.
              </p>
            </div>

            <div className="bg-[#111827] border border-slate-800/90 rounded-xl p-6 space-y-3">
              <p className="text-xs font-mono-tabular text-sky-400">STEP 02 · DISCORD ANDROID PUSH</p>
              <h3 className="text-base font-semibold text-white font-display">
                24/7 Background Alerts via Discord App
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Add your <code className="text-white font-mono-tabular">DISCORD_WEBHOOK_URL</code>{' '}
                to your GitHub repository secrets. Every 6 hours, GitHub Actions checks Microsoft
                and pushes a rich card directly to the Discord app on your Android phone.
              </p>
            </div>

            <div className="bg-[#111827] border border-slate-800/90 rounded-xl p-6 space-y-3">
              <p className="text-xs font-mono-tabular text-sky-400">STEP 03 · NTFY ANDROID TOPIC</p>
              <h3 className="text-base font-semibold text-white font-display">
                Instant Lock-Screen Topic Subscription
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Prefer a lightweight dedicated push app? Install the free <strong>ntfy</strong> app
                on Android from Google Play, subscribe to topic{' '}
                <code className="text-white font-mono-tabular">{ntfyTopic}</code>, and receive
                instant high-priority Windows 11 KB alerts.
              </p>
            </div>
          </div>
        </section>

        {/* SECTION 5: GitHub Actions & Repository Files Inspector */}
        <section id="section-automation" className="space-y-6 scroll-mt-20">
          <div className="border-t border-slate-800/80 pt-10 flex flex-col lg:flex-row lg:items-end justify-between gap-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-white font-display">
                05. GitHub Sync &amp; Automated 6-Hour Cron Files
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                All required automation files are generated in your workspace file tree and ready
                to push via Google AI Studio&apos;s GitHub Sync.
              </p>
            </div>

            {/* File Switcher Tabs */}
            <div className="flex flex-wrap items-center gap-1.5 bg-[#111827] p-1.5 rounded-lg border border-slate-800">
              <button
                type="button"
                onClick={() => setSelectedCodeTab('workflow')}
                className={`min-h-[36px] px-3 py-1.5 text-xs font-mono-tabular rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  selectedCodeTab === 'workflow'
                    ? 'bg-sky-500 text-slate-950 font-semibold'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                .github/workflows/win11-update-notifier.yml
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
                state/last_seen.json
              </button>
            </div>
          </div>

          {/* GitHub Setup Checklist + Code Viewer */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-4 bg-[#111827] border border-slate-800/90 rounded-xl p-6 space-y-4">
              <div className="flex items-center gap-2 text-white font-semibold text-base font-display">
                <GitBranch className="w-4 h-4 text-sky-400" />
                <h3>GitHub Sync Quick Setup</h3>
              </div>
              <ol className="space-y-3 text-xs sm:text-sm text-slate-300 list-decimal list-inside leading-relaxed">
                <li>
                  Click <strong>Settings → GitHub</strong> in Google AI Studio and push this
                  project to your{' '}
                  <code className="text-white font-mono-tabular">win11-update-notifier</code>{' '}
                  repository.
                </li>
                <li>
                  In your GitHub repo, open{' '}
                  <strong>Settings → Actions → General → Workflow permissions</strong> and enable{' '}
                  <strong>Read and write permissions</strong>.
                </li>
                <li>
                  Open <strong>Settings → Secrets and variables → Actions</strong> and add your
                  optional repository secrets:
                  <ul className="mt-2 ml-4 space-y-1 text-xs font-mono-tabular text-sky-300 list-disc">
                    <li>DISCORD_WEBHOOK_URL</li>
                    <li>NTFY_TOPIC (e.g. {ntfyTopic})</li>
                  </ul>
                </li>
                <li>
                  Pushing automatically triggers the first run, initializes{' '}
                  <code className="text-white font-mono-tabular">state/last_seen.json</code>, opens
                  a GitHub Issue (emailing your GitHub address), and sends a Discord/Android alert!
                </li>
              </ol>
            </div>

            <div className="lg:col-span-8 bg-[#111827] border border-slate-800/90 rounded-xl overflow-hidden flex flex-col">
              <div className="flex items-center justify-between px-4 py-3 bg-[#0B0F17] border-b border-slate-800">
                <div className="flex items-center gap-2 text-xs font-mono-tabular text-slate-300">
                  <Terminal className="w-4 h-4 text-sky-400" />
                  <span>
                    {selectedCodeTab === 'workflow'
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
                      selectedCodeTab === 'workflow'
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
              <pre className="p-4 text-xs font-mono-tabular text-slate-200 overflow-x-auto leading-relaxed max-h-[420px]">
                {selectedCodeTab === 'workflow'
                  ? automationFiles.workflowYaml
                  : selectedCodeTab === 'python'
                  ? automationFiles.pythonScript
                  : automationFiles.stateJson}
              </pre>
            </div>
          </div>
        </section>
      </main>

      {/* Quiet Footer */}
      <footer className="max-w-7xl mx-auto px-4 sm:px-8 pt-12 pb-8 mt-12 border-t border-slate-800/60 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
        <p>
          Windows 11 Update Notifier · Sourced from Microsoft Windows 11 Release Information
        </p>
        <div className="flex items-center gap-4">
          <a
            href="https://learn.microsoft.com/en-us/windows/release-health/windows11-release-information"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-slate-300 transition-colors"
          >
            Microsoft Release Health
          </a>
          <span>·</span>
          <button
            type="button"
            onClick={() => scrollToSection('since-date', 'section-since-date')}
            className="hover:text-slate-300 transition-colors cursor-pointer"
          >
            Updates Since Date
          </button>
          <span>·</span>
          <button
            type="button"
            onClick={() => scrollToSection('automation', 'section-automation')}
            className="hover:text-slate-300 transition-colors cursor-pointer"
          >
            GitHub Actions Workflow
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
          <Smartphone className="w-4 h-4" />
          <span className="mt-0.5">Android</span>
        </button>

        <button
          type="button"
          onClick={() => scrollToSection('automation', 'section-automation')}
          className={`min-h-[44px] flex flex-col items-center justify-center text-[10px] font-medium ${
            activeSection === 'automation' ? 'text-sky-400' : 'text-slate-400'
          }`}
        >
          <GitBranch className="w-4 h-4" />
          <span className="mt-0.5">GitHub</span>
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
                  Install on Android &amp; Mobile
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
              <div className="space-y-2.5 text-xs sm:text-sm text-slate-300 leading-relaxed">
                <p>
                  {isAndroid
                    ? 'To install this standalone app on your Android phone:'
                    : 'To install on your Android phone or desktop browser:'}
                </p>
                <ol className="list-decimal list-inside space-y-2">
                  <li>
                    Open this app&apos;s Shared / Deployed URL directly in{' '}
                    <strong>Google Chrome on Android</strong> (outside the preview iframe).
                  </li>
                  <li>
                    Tap the Chrome menu <strong>⋮</strong> in the top-right corner and tap{' '}
                    <strong>Install app</strong> or <strong>Add to Home screen</strong>.
                  </li>
                  <li>
                    Launch <strong>Win11Notify</strong> from your Android app drawer for a
                    full-screen native experience and pair it with your{' '}
                    <strong>Discord Webhook</strong> or <strong>ntfy Android app</strong> topic{' '}
                    <code className="text-sky-300 font-mono-tabular">{ntfyTopic}</code>.
                  </li>
                </ol>
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setShowInstallModal(false)}
                className="min-h-[40px] px-4 py-2 text-xs font-semibold text-slate-950 bg-sky-400 hover:bg-sky-300 rounded-lg transition-colors cursor-pointer"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
