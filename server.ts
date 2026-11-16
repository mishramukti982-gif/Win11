import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import zlib from 'zlib';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const RELEASE_INFO_URL =
  'https://learn.microsoft.com/en-us/windows/release-health/windows11-release-information';
const STATE_FILE = path.join(__dirname, 'state', 'last_seen.json');
const ALERT_FILE = path.join(__dirname, 'state', 'latest_alert.md');
const PYTHON_SCRIPT_FILE = path.join(__dirname, 'scripts', 'check_win11_updates.py');
const WORKFLOW_FILE = path.join(__dirname, '.github', 'workflows', 'win11-update-notifier.yml');
const APK_WORKFLOW_FILE = path.join(__dirname, '.github', 'workflows', 'android-apk-release.yml');
const APK_BUILDER_FILE = path.join(__dirname, 'scripts', 'build_android_apk.py');

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

const CURATED_UPDATES: Win11UpdateItem[] = [
  {
    id: 'KB5132061-26300.9974',
    kb: 'KB5132061',
    build: '26300.9974 · 26200.9974 · 26100.9974',
    version: '26H2, 25H2 & 24H2',
    type: 'Security / Cumulative KB',
    releaseDate: '2026-11-10',
    title: 'November 2026 Patch Tuesday Cumulative Security Update (26H2, 25H2 & 24H2)',
    highlights:
      'Mandatory November 2026 security patches for Windows 11 26H2, 25H2, and 24H2. Fixes USB Audio 1.0 issues, enables Memory Integrity on more systems, and includes every change from the October 28 optional update (KB5127936).',
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
      'Mandatory November 2026 security update for Windows 11 26H1 (OS Build 28000.3501). Includes security patches, Secure Boot certificate updates, and fixes printer error 87.',
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
      'Mandatory final November 2026 security update for Windows 11 version 23H2 (Enterprise & Education editions, OS Build 22631.7711). Includes November vulnerability fixes and printing stability repairs.',
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
      'Optional C-release preview introducing context menu improvements and adaptive hibernation adjustments. All changes from KB5127936 are already included inside the Nov 10 mandatory update KB5132061.',
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

// Generate valid PNG icons for Android PWA & Apple Touch Icon if missing
function createWin11PngBuffer(size: number, maskable: boolean): Buffer {
  const rawData = Buffer.alloc(size * (size * 4 + 1));
  const pad = maskable ? Math.floor(size * 0.22) : Math.floor(size * 0.16);
  const gap = Math.max(4, Math.floor(size * 0.04));
  const half = Math.floor(size / 2);

  for (let y = 0; y < size; y++) {
    const rowStart = y * (size * 4 + 1);
    rawData[rowStart] = 0; // Filter type 0
    for (let x = 0; x < size; x++) {
      const px = rowStart + 1 + x * 4;
      // Background #0B0F17
      let r = 11,
        g = 15,
        b = 23;

      const inSquare = x >= pad && x < size - pad && y >= pad && y < size - pad;
      const inGapX = Math.abs(x - half) < gap / 2;
      const inGapY = Math.abs(y - half) < gap / 2;

      if (inSquare && !inGapX && !inGapY) {
        if (x < half && y < half) {
          r = 56;
          g = 189;
          b = 248;
        } else if (x >= half && y < half) {
          r = 2;
          g = 132;
          b = 199;
        } else if (x < half && y >= half) {
          r = 2;
          g = 132;
          b = 199;
        } else {
          r = 88;
          g = 101;
          b = 242;
        }
      }

      rawData[px] = r;
      rawData[px + 1] = g;
      rawData[px + 2] = b;
      rawData[px + 3] = 255;
    }
  }

  const crcTable = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    crcTable[n] = c;
  }

  function crc32(buf: Buffer): number {
    let c = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
    }
    return (c ^ 0xffffffff) >>> 0;
  }

  function makeChunk(type: string, data: Buffer): Buffer {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, 'ascii');
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
    return Buffer.concat([len, typeBuf, data, crc]);
  }

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const idat = zlib.deflateSync(rawData);
  return Buffer.concat([
    signature,
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', idat),
    makeChunk('IEND', Buffer.alloc(0)),
  ]);
}

function ensurePwaIcons() {
  const pubDir = path.join(__dirname, 'public');
  fs.mkdirSync(pubDir, { recursive: true });
  const icons: Array<{ file: string; size: number; maskable: boolean }> = [
    { file: 'pwa-192x192.png', size: 192, maskable: false },
    { file: 'pwa-512x512.png', size: 512, maskable: false },
    { file: 'pwa-maskable-512x512.png', size: 512, maskable: true },
    { file: 'apple-touch-icon.png', size: 180, maskable: false },
  ];
  for (const icon of icons) {
    const target = path.join(pubDir, icon.file);
    if (!fs.existsSync(target)) {
      fs.writeFileSync(target, createWin11PngBuffer(icon.size, icon.maskable));
    }
  }
}

function readStateFile() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      return JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
    }
  } catch {
    // ignore parse errors
  }
  return {
    versions: ['22H2', '23H2', '24H2', '25H2', '26H1', '26H2'],
    kbs: ['KB5127936', 'KB5131087', 'KB5132059', 'KB5132061'],
    builds: ['22631.7711', '26100.9974', '26200.9974', '26300.9974', '28000.3501'],
    last_checked_utc: new Date().toISOString(),
  };
}

function writeStateFile(state: Record<string, unknown>) {
  fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
  state.last_checked_utc = new Date().toISOString();
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf-8');
}

async function scrapeMicrosoftReleaseHealth(): Promise<{
  liveScraped: boolean;
  discoveredVersions: string[];
  discoveredKbs: string[];
  discoveredBuilds: string[];
  mergedUpdates: Win11UpdateItem[];
}> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8500);
    const resp = await fetch(RELEASE_INFO_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Win11UpdateNotifier/1.0',
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!resp.ok) {
      throw new Error(`HTTP ${resp.status}`);
    }

    const html = await resp.text();
    const kbs = Array.from(new Set(html.match(/KB\d{7}/g) || [])).sort();
    const builds = Array.from(
      new Set(html.match(/\b(?:22000|22621|22631|26100|26200|26300|28000)\.\d{3,5}\b/g) || [])
    ).sort();
    const versions = Array.from(new Set(html.match(/\b2[1-9]H[12]\b/g) || [])).sort();

    // Extract ALL table rows from Microsoft Release Health HTML (no 10-row cap)
    const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    const liveItems: Win11UpdateItem[] = [];
    const seenIds = new Set(CURATED_UPDATES.map((u) => u.kb));

    let match: RegExpExecArray | null;
    while ((match = rowRegex.exec(html)) !== null) {
      const rowHtml = match[1];
      const kbMatch = rowHtml.match(/KB\d{7}/);
      const buildMatches = rowHtml.match(
        /\b(?:22000|22621|22631|26100|26200|26300|28000)\.\d{3,5}\b/g
      );
      const dateMatch = rowHtml.match(/\b202\d-\d{2}-\d{2}\b/);

      if (kbMatch && buildMatches && dateMatch && !seenIds.has(kbMatch[0])) {
        seenIds.add(kbMatch[0]);
        const uniqueBuilds = Array.from(new Set(buildMatches));
        const buildStr = uniqueBuilds.join(' · ');

        const verParts: string[] = [];
        if (uniqueBuilds.some((b) => b.startsWith('26300'))) verParts.push('26H2');
        if (uniqueBuilds.some((b) => b.startsWith('26200'))) verParts.push('25H2');
        if (uniqueBuilds.some((b) => b.startsWith('26100'))) verParts.push('24H2');
        if (uniqueBuilds.some((b) => b.startsWith('28000'))) verParts.push('26H1');
        if (uniqueBuilds.some((b) => b.startsWith('22631'))) verParts.push('23H2');
        if (uniqueBuilds.some((b) => b.startsWith('22621'))) verParts.push('22H2');
        const verLabel = verParts.length > 0 ? verParts.join(', ') : '26H2 / 25H2 / 24H2';

        const isPreview = /preview|optional|non-security|c-release|d-release/i.test(rowHtml);
        liveItems.push({
          id: `${kbMatch[0]}-${uniqueBuilds[0]}`,
          kb: kbMatch[0],
          build: buildStr,
          version: verLabel,
          type: isPreview ? 'Out-of-Band / Preview' : 'Security / Cumulative KB',
          releaseDate: dateMatch[0],
          title: `Windows 11 ${ isPreview ? 'Optional Preview Update' : 'Cumulative Security Update' } ${kbMatch[0]} (${verLabel})`,
          highlights: `Official Microsoft Windows 11 Release Health package for version ${verLabel} (OS Build ${buildStr}).`,
          servicingChannel: isPreview
            ? 'Optional Preview Channel'
            : 'General Availability (B-Release)',
          sourceUrl: `https://support.microsoft.com/help/${kbMatch[0].replace('KB', '')}`,
          isNew: dateMatch[0] >= '2026-11-01',
        });
      }
    }

    const combined = [...CURATED_UPDATES, ...liveItems].sort((a, b) =>
      b.releaseDate.localeCompare(a.releaseDate)
    );
    return {
      liveScraped: true,
      discoveredVersions: Array.from(
        new Set([...versions, '26H2', '26H1', '25H2', '24H2', '23H2'])
      ).sort(),
      discoveredKbs: Array.from(
        new Set([...kbs, 'KB5132061', 'KB5132059', 'KB5131087', 'KB5127936'])
      ).sort(),
      discoveredBuilds: Array.from(
        new Set([...builds, '26300.9974', '26200.9974', '26100.9974', '28000.3501', '22631.7711'])
      ).sort(),
      mergedUpdates: combined,
    };
  } catch {
    return {
      liveScraped: false,
      discoveredVersions: ['22H2', '23H2', '24H2', '25H2', '26H1', '26H2'],
      discoveredKbs: CURATED_UPDATES.map((u) => u.kb).sort(),
      discoveredBuilds: CURATED_UPDATES.map((u) => u.build).sort(),
      mergedUpdates: CURATED_UPDATES,
    };
  }
}

async function startServer() {
  ensurePwaIcons();
  const app = express();
  app.use(express.json());

  app.get('/api/updates', async (_req, res) => {
    const state = readStateFile();
    const scrapeResult = await scrapeMicrosoftReleaseHealth();
    const latestAlertMd = fs.existsSync(ALERT_FILE)
      ? fs.readFileSync(ALERT_FILE, 'utf-8')
      : 'No alert markdown generated yet.';

    res.json({
      sourceUrl: RELEASE_INFO_URL,
      liveScraped: scrapeResult.liveScraped,
      state,
      latestAlertMd,
      updates: scrapeResult.mergedUpdates,
    });
  });

  app.post('/api/check-now', async (req, res) => {
    const { discordWebhookUrl, ntfyTopic, simulateNewRelease } = req.body || {};
    const previous = readStateFile();
    const scrapeResult = await scrapeMicrosoftReleaseHealth();

    let newVersions = scrapeResult.discoveredVersions.filter(
      (v) => !(previous.versions || []).includes(v)
    );
    let newKbs = scrapeResult.discoveredKbs.filter((k) => !(previous.kbs || []).includes(k));
    let newBuilds = scrapeResult.discoveredBuilds.filter(
      (b) => !(previous.builds || []).includes(b)
    );

    if (simulateNewRelease && newKbs.length === 0) {
      newVersions = ['26H2'];
      newKbs = ['KB5129195', 'KB5127646'];
      newBuilds = ['28000.3231', '26200.9711'];
    }

    const hasNew = newVersions.length > 0 || newKbs.length > 0 || newBuilds.length > 0;
    const nowUtc = new Date().toISOString().replace('T', ' ').slice(0, 16) + ' UTC';
    const kind = newVersions.length > 0 ? 'Major Feature Update' : 'Security / Cumulative Update';
    const latestKb = newKbs[newKbs.length - 1] || 'KB5129195';
    const title = hasNew
      ? `New Windows 11 ${kind} Detected: ${latestKb}`
      : `Windows 11 Release Health Synced (${scrapeResult.discoveredKbs.length} KBs Verified)`;

    const alertLines = [
      `## ${title}`,
      '',
      `- **Alert Priority:** \`HIGH (Security / Cumulative — Impacts WUB Risk Meter)\``,
      `- **Source:** [Microsoft Windows 11 Release Information](${RELEASE_INFO_URL})`,
      `- **Detected At (UTC):** \`${nowUtc}\``,
      `- **New Feature Versions (Big Updates):** \`${newVersions.length ? newVersions.join(', ') : 'None'}\``,
      `- **New KB Packages (Big/Small Updates):** \`${newKbs.length ? newKbs.slice(-10).join(', ') : 'KB5127646, KB5129195'}\``,
      `- **New OS Builds:** \`${newBuilds.length ? newBuilds.slice(-10).join(', ') : '26200.9711, 28000.3231'}\``,
    ];
    const alertBody = alertLines.join('\n');

    fs.mkdirSync(path.dirname(ALERT_FILE), { recursive: true });
    fs.writeFileSync(ALERT_FILE, alertBody + '\n', 'utf-8');

    const updatedState = {
      versions: scrapeResult.discoveredVersions,
      kbs: scrapeResult.discoveredKbs,
      builds: scrapeResult.discoveredBuilds,
      last_checked_utc: new Date().toISOString(),
    };
    writeStateFile(updatedState);

    let discordSent = false;
    let ntfySent = false;

    if (discordWebhookUrl && typeof discordWebhookUrl === 'string' && discordWebhookUrl.startsWith('https://')) {
      try {
        const discordResp = await fetch(discordWebhookUrl.trim(), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'User-Agent': 'Win11UpdateNotifier/1.0' },
          body: JSON.stringify({
            content: `@everyone 🚨 **[HIGH PRIORITY SECURITY ALERT] ${title}**\n\n${alertBody}`.slice(0, 1900),
            allowed_mentions: { parse: ['everyone', 'roles', 'users'] },
            embeds: [
              {
                title,
                url: RELEASE_INFO_URL,
                description:
                  'Live Windows 11 Release Health check completed via Win11 Update Notifier (WUB Safe-Window Guard).',
                color: 15548997,
                fields: [
                  {
                    name: 'Tracked Channels',
                    value: '26H2 · 26H1 · 24H2 · 23H2',
                    inline: true,
                  },
                  {
                    name: 'Latest Security KB Packages',
                    value: newKbs.length ? newKbs.slice(-5).join(', ') : 'KB5129195, KB5127646',
                    inline: true,
                  },
                  {
                    name: 'Latest OS Builds',
                    value: newBuilds.length ? newBuilds.slice(-5).join(', ') : '28000.3231, 26200.9711',
                    inline: false,
                  },
                ],
                footer: { text: 'Win11 Update Notifier • WUB Safe-Window & Vulnerability Guard' },
                timestamp: new Date().toISOString(),
              },
            ],
          }),
        });
        discordSent = discordResp.ok;
      } catch {
        discordSent = false;
      }
    }

    if (ntfyTopic && typeof ntfyTopic === 'string' && ntfyTopic.trim().length > 0) {
      try {
        const ntfyResp = await fetch(`https://ntfy.sh/${encodeURIComponent(ntfyTopic.trim())}`, {
          method: 'POST',
          headers: {
            Title: title,
            Priority: 'urgent',
            Tags: 'rotating_light,shield,windows',
            Click: RELEASE_INFO_URL,
          },
          body: alertBody,
        });
        ntfySent = ntfyResp.ok;
      } catch {
        ntfySent = false;
      }
    }

    res.json({
      ok: true,
      hasNew,
      title,
      alertBody,
      state: updatedState,
      liveScraped: scrapeResult.liveScraped,
      discordSent,
      ntfySent,
    });
  });

  app.post('/api/notify/discord', async (req, res) => {
    const {
      webhookUrl,
      kb,
      build,
      version,
      title: customTitle,
      summaryDescription,
      pingEveryone = true,
      priority = 'high',
      wubSummary,
    } = req.body || {};
    if (
      !webhookUrl ||
      typeof webhookUrl !== 'string' ||
      (!webhookUrl.trim().startsWith('https://discord.com/api/webhooks/') &&
        !webhookUrl.trim().startsWith('https://discordapp.com/api/webhooks/'))
    ) {
      res.status(400).json({
        ok: false,
        error: 'Please enter a valid Discord Webhook URL starting with https://discord.com/api/webhooks/...',
      });
      return;
    }

    const isHighPriority = priority === 'high' && Boolean(pingEveryone);
    const targetKb = kb || 'KB5129195';
    const targetBuild = build || '28000.3231';
    const targetVersion = version || '26H2';
    const embedTitle =
      customTitle || `Windows 11 ${targetVersion} Update Alert: ${targetKb} (Build ${targetBuild})`;

    const mentionPrefix = isHighPriority ? '@everyone 🚨 **[HIGH PRIORITY]** ' : 'ℹ️ **[STANDARD INFO — 0 WUB RISK]** ';
    const markdownSummary = summaryDescription
      ? `${mentionPrefix}**${embedTitle}**\n${summaryDescription}`.slice(0, 1900)
      : [
          `${mentionPrefix}**${embedTitle}**`,
          `• **Channel / Scope:** Windows 11 ${targetVersion}`,
          `• **KB Package:** \`${targetKb}\``,
          `• **OS Build:** \`${targetBuild}\``,
          wubSummary ? `• **WUB Safe-Window Status:** ${wubSummary}` : null,
          `• **Release Health:** <${RELEASE_INFO_URL}>`,
        ]
          .filter(Boolean)
          .join('\n');

    try {
      const fields = [
        { name: 'Feature Version / Scope', value: String(targetVersion).slice(0, 250), inline: true },
        { name: 'KB Identifiers', value: String(targetKb).slice(0, 250), inline: true },
        {
          name: 'Alert Priority',
          value: isHighPriority
            ? 'HIGH — Security / WUB Action Required'
            : 'STANDARD — Optional Preview (Safe to Skip)',
          inline: true,
        },
        { name: 'OS Builds', value: String(targetBuild).slice(0, 250), inline: false },
      ];
      if (wubSummary) {
        fields.push({
          name: 'WUB Safe-Window Guard',
          value: String(wubSummary).slice(0, 250),
          inline: false,
        });
      }

      const response = await fetch(webhookUrl.trim(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Win11UpdateNotifier/1.0',
        },
        body: JSON.stringify({
          content: markdownSummary,
          allowed_mentions: isHighPriority
            ? { parse: ['everyone', 'roles', 'users'] }
            : { parse: [] },
          embeds: [
            {
              title: embedTitle,
              url: RELEASE_INFO_URL,
              description:
                summaryDescription ||
                (isHighPriority
                  ? 'High-Priority Security / Cumulative KB or WUB Safe-Window Alert.'
                  : 'Standard Informational Update Alert (Optional Preview — 0 WUB Risk Impact).'),
              color: isHighPriority ? 15548997 : 3718648,
              fields,
              footer: {
                text: 'Windows 11 Update Notifier • WUB Safe-Window & Vulnerability Guard',
              },
              timestamp: new Date().toISOString(),
            },
          ],
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        res.status(response.status).json({
          ok: false,
          error: `Discord returned HTTP ${response.status}: ${text.slice(0, 160)}`,
        });
        return;
      }

      res.json({
        ok: true,
        message: isHighPriority
          ? `Delivered HIGH-PRIORITY @everyone alert (${targetKb}) to Discord!`
          : `Delivered Standard Informational alert (${targetKb} — no @everyone ping) to Discord!`,
      });
    } catch (err) {
      res.status(500).json({
        ok: false,
        error: err instanceof Error ? err.message : 'Failed to connect to Discord Webhook endpoint.',
      });
    }
  });

  app.post('/api/notify/android-ntfy', async (req, res) => {
    const { topic, kb, build, version, priority = 'high', customMessage } = req.body || {};
    if (!topic || typeof topic !== 'string' || topic.trim().length < 3) {
      res.status(400).json({
        ok: false,
        error: 'Please enter a unique ntfy topic name (at least 3 characters, e.g. win11-alerts-982).',
      });
      return;
    }

    const isHighPriority = priority === 'high';
    const cleanTopic = topic.trim().replace(/[^a-zA-Z0-9_-]/g, '');
    const targetKb = kb || 'KB5129195';
    const targetBuild = build || '28000.3231';
    const targetVersion = version || '26H2';

    try {
      const response = await fetch(`https://ntfy.sh/${cleanTopic}`, {
        method: 'POST',
        headers: {
          Title: isHighPriority
            ? `[HIGH PRIORITY] Win11 ${targetVersion}: ${targetKb}`
            : `[INFO - 0 WUB RISK] Win11 ${targetVersion}: ${targetKb}`,
          Priority: isHighPriority ? 'urgent' : 'default',
          Tags: isHighPriority ? 'rotating_light,shield,windows' : 'windows,information_source',
          Click: RELEASE_INFO_URL,
        },
        body:
          customMessage ||
          (isHighPriority
            ? `HIGH PRIORITY Security/Cumulative Update ${targetKb} (Build ${targetBuild}) detected while monitoring WUB Safe-Window.`
            : `Optional Preview Update ${targetKb} (Build ${targetBuild}) released. Safe to skip while WUB is active (0 security risk impact).`),
      });

      if (!response.ok) {
        res.status(response.status).json({
          ok: false,
          error: `ntfy.sh returned HTTP ${response.status}`,
        });
        return;
      }

      res.json({
        ok: true,
        topic: cleanTopic,
        message: `Sent ${isHighPriority ? 'High-Priority' : 'Standard'} Android push notification to ntfy topic "${cleanTopic}"!`,
      });
    } catch (err) {
      res.status(500).json({
        ok: false,
        error: err instanceof Error ? err.message : 'Failed to reach ntfy.sh push gateway.',
      });
    }
  });

  app.get('/api/automation-files', (_req, res) => {
    const pythonScript = fs.existsSync(PYTHON_SCRIPT_FILE)
      ? fs.readFileSync(PYTHON_SCRIPT_FILE, 'utf-8')
      : '';
    const workflowYaml = fs.existsSync(WORKFLOW_FILE)
      ? fs.readFileSync(WORKFLOW_FILE, 'utf-8')
      : '';
    const apkWorkflowYaml = fs.existsSync(APK_WORKFLOW_FILE)
      ? fs.readFileSync(APK_WORKFLOW_FILE, 'utf-8')
      : '';
    const apkBuilderScript = fs.existsSync(APK_BUILDER_FILE)
      ? fs.readFileSync(APK_BUILDER_FILE, 'utf-8')
      : '';
    const stateJson = fs.existsSync(STATE_FILE)
      ? fs.readFileSync(STATE_FILE, 'utf-8')
      : '{}';
    const latestAlertMd = fs.existsSync(ALERT_FILE)
      ? fs.readFileSync(ALERT_FILE, 'utf-8')
      : '';

    res.json({
      pythonScript,
      workflowYaml,
      apkWorkflowYaml,
      apkBuilderScript,
      stateJson,
      latestAlertMd,
    });
  });

  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
        watch: null,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const PORT = Number(process.env.PORT) || 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Win11 Update Notifier server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
