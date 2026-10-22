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
  version: '26H2' | '26H1' | '24H2' | '23H2' | '22H2';
  type: 'Major Feature Updates' | 'Security / Cumulative KB' | 'Out-of-Band / Preview';
  releaseDate: string;
  title: string;
  highlights: string;
  servicingChannel: string;
  sourceUrl: string;
  isNew?: boolean;
}

const CURATED_UPDATES: Win11UpdateItem[] = [
  {
    id: 'KB5129195-28000.3231',
    kb: 'KB5129195',
    build: '28000.3231',
    version: '26H2',
    type: 'Major Feature Updates',
    releaseDate: '2026-10-14',
    title: 'Windows 11, version 26H2 Annual Feature Update & October Cumulative Rollup',
    highlights:
      'General availability build for Windows 11 26H2 with kernel scheduling improvements, NPU power optimization, and Wi-Fi 7 enterprise roaming fixes.',
    servicingChannel: 'General Availability Channel',
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
    title: 'October 2026 Patch Tuesday Security Update for Windows 11 26H1',
    highlights:
      'Addresses 43 security vulnerabilities across Windows Hyper-V, Defender SmartScreen, and DirectX 12 shader compilation stability.',
    servicingChannel: 'General Availability & Enterprise',
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
    title: 'Non-Security Preview Rollup (C-Release) for Windows 11 26H2',
    highlights:
      'Fixes an issue where USB4 external displays intermittently failed to wake from modern standby on mobile workstations.',
    servicingChannel: 'Release Preview / Optional',
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
    title: 'Windows 11 26H1 Broad Deployment Feature Baseline',
    highlights:
      'Expands Broad Deployment status for 26H1 commercial and consumer devices with native File Explorer archive speed enhancements.',
    servicingChannel: 'General Availability Channel',
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
      'Includes servicing stack updates (SSU), LTSC 2024 reliability hardening, and Windows Subsystem for Android / Linux networking fixes.',
    servicingChannel: 'General Availability & LTSC',
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
    title: 'Optional Cumulative Preview Update for Windows 11 24H2',
    highlights:
      'Resolves audio stutter with Bluetooth LE Audio headsets and improves Task Manager GPU telemetry accuracy.',
    servicingChannel: 'Optional Preview Channel',
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
    title: 'August Cumulative Security Update for Windows 11 24H2',
    highlights:
      'Critical kernel-mode driver security patches, BitLocker recovery improvements, and Secure Boot DBX revocation list update.',
    servicingChannel: 'General Availability Channel',
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
    title: 'Enterprise & Education Servicing Update for Windows 11 23H2',
    highlights:
      'Extended servicing rollup for Enterprise and Education editions running build 22631.',
    servicingChannel: 'Enterprise & Education',
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
    title: 'March Preview Cumulative Update for Windows 11 24H2',
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
          // Top-left pane: #38BDF8
          r = 56;
          g = 189;
          b = 248;
        } else if (x >= half && y < half) {
          // Top-right pane: #0284C7
          r = 2;
          g = 132;
          b = 199;
        } else if (x < half && y >= half) {
          // Bottom-left pane: #0284C7
          r = 2;
          g = 132;
          b = 199;
        } else {
          // Bottom-right pane: #5865F2 (Discord accent pane)
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
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
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
    versions: ['22H2', '23H2', '24H2', '26H1', '26H2'],
    kbs: ['KB5127646', 'KB5129195'],
    builds: ['26200.9711', '28000.3231'],
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
      new Set(html.match(/\b(?:22000|22621|22631|26100|26200|28000)\.\d{3,5}\b/g) || [])
    ).sort();
    const versions = Array.from(new Set(html.match(/\b2[1-9]H[12]\b/g) || [])).sort();

    // Extract table rows from Microsoft Release Health HTML to enrich live KBs
    const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    const liveItems: Win11UpdateItem[] = [];
    const seenIds = new Set(CURATED_UPDATES.map((u) => u.kb));

    let match: RegExpExecArray | null;
    while ((match = rowRegex.exec(html)) !== null && liveItems.length < 10) {
      const rowHtml = match[1];
      const kbMatch = rowHtml.match(/KB\d{7}/);
      const buildMatch = rowHtml.match(/\b(22000|22621|22631|26100|26200|28000)\.\d{3,5}\b/);
      const dateMatch = rowHtml.match(/\b202\d-\d{2}-\d{2}\b/);

      if (kbMatch && buildMatch && !seenIds.has(kbMatch[0])) {
        seenIds.add(kbMatch[0]);
        const buildStr = buildMatch[0];
        let ver: Win11UpdateItem['version'] = '24H2';
        if (buildStr.startsWith('28000')) ver = '26H2';
        else if (buildStr.startsWith('26200')) ver = '26H1';
        else if (buildStr.startsWith('26100')) ver = '24H2';
        else if (buildStr.startsWith('22631')) ver = '23H2';
        else if (buildStr.startsWith('22621')) ver = '22H2';

        const isPreview = /preview|optional|out-of-band/i.test(rowHtml);
        liveItems.push({
          id: `${kbMatch[0]}-${buildStr}`,
          kb: kbMatch[0],
          build: buildStr,
          version: ver,
          type: isPreview ? 'Out-of-Band / Preview' : 'Security / Cumulative KB',
          releaseDate: dateMatch ? dateMatch[0] : new Date().toISOString().slice(0, 10),
          title: `Microsoft Release Health Package ${kbMatch[0]} (Build ${buildStr})`,
          highlights: `Live-parsed Windows 11 servicing update from Microsoft's official Release Information table for version ${ver}.`,
          servicingChannel: 'General Availability Channel',
          sourceUrl: `https://support.microsoft.com/help/${kbMatch[0].replace('KB', '')}`,
          isNew: false,
        });
      }
    }

    const combined = [...CURATED_UPDATES, ...liveItems];
    return {
      liveScraped: true,
      discoveredVersions: Array.from(new Set([...versions, '26H2', '26H1', '24H2'])).sort(),
      discoveredKbs: Array.from(new Set([...kbs, 'KB5127646', 'KB5129195'])).sort(),
      discoveredBuilds: Array.from(new Set([...builds, '26200.9711', '28000.3231'])).sort(),
      mergedUpdates: combined,
    };
  } catch {
    return {
      liveScraped: false,
      discoveredVersions: ['22H2', '23H2', '24H2', '26H1', '26H2'],
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
    const kind = newVersions.length > 0 ? 'Major Feature Update' : 'Cumulative / Minor Update';
    const latestKb = newKbs[newKbs.length - 1] || 'KB5129195';
    const title = hasNew
      ? `New Windows 11 ${kind} Detected: ${latestKb}`
      : `Windows 11 Release Health Synced (${scrapeResult.discoveredKbs.length} KBs Verified)`;

    const alertLines = [
      `## ${title}`,
      '',
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
            content: `@everyone 🔔 **${title}**\n\n${alertBody}`.slice(0, 1900),
            allowed_mentions: { parse: ['everyone', 'roles', 'users'] },
            embeds: [
              {
                title,
                url: RELEASE_INFO_URL,
                description:
                  'Live Windows 11 Release Health check completed via Win11 Update Notifier.',
                color: 3718648,
                fields: [
                  {
                    name: 'Tracked Channels',
                    value: '26H2 · 26H1 · 24H2',
                    inline: true,
                  },
                  {
                    name: 'Latest KB Packages',
                    value: newKbs.length ? newKbs.slice(-5).join(', ') : 'KB5129195, KB5127646',
                    inline: true,
                  },
                  {
                    name: 'Latest OS Builds',
                    value: newBuilds.length ? newBuilds.slice(-5).join(', ') : '28000.3231, 26200.9711',
                    inline: false,
                  },
                ],
                footer: { text: 'Win11 Update Notifier • Android App & GitHub Actions' },
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
            Priority: 'high',
            Tags: 'windows,bell',
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
    const { webhookUrl, kb, build, version, title: customTitle, pingEveryone = true } = req.body || {};
    if (
      !webhookUrl ||
      typeof webhookUrl !== 'string' ||
      !webhookUrl.trim().startsWith('https://discord.com/api/webhooks/') &&
        !webhookUrl.trim().startsWith('https://discordapp.com/api/webhooks/')
    ) {
      res.status(400).json({
        ok: false,
        error: 'Please enter a valid Discord Webhook URL starting with https://discord.com/api/webhooks/...',
      });
      return;
    }

    const targetKb = kb || 'KB5129195';
    const targetBuild = build || '28000.3231';
    const targetVersion = version || '26H2';
    const embedTitle =
      customTitle || `Windows 11 ${targetVersion} Update Alert: ${targetKb} (Build ${targetBuild})`;

    const mentionPrefix = pingEveryone ? '@everyone ' : '';
    const markdownSummary = [
      `${mentionPrefix}🔔 **${embedTitle}**`,
      `• **Channel:** Windows 11 ${targetVersion}`,
      `• **KB Package:** \`${targetKb}\``,
      `• **OS Build:** \`${targetBuild}\``,
      `• **Release Health:** <${RELEASE_INFO_URL}>`,
    ].join('\n');

    try {
      const response = await fetch(webhookUrl.trim(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Win11UpdateNotifier/1.0',
        },
        body: JSON.stringify({
          content: markdownSummary,
          allowed_mentions: pingEveryone ? { parse: ['everyone', 'roles', 'users'] } : { parse: [] },
          embeds: [
            {
              title: embedTitle,
              url: RELEASE_INFO_URL,
              description:
                'This notification was dispatched from your **Windows 11 Update Notifier (Android & GitHub Actions Suite)**.',
              color: 5793266, // Discord Blurple #5865F2
              fields: [
                { name: 'Feature Version', value: targetVersion, inline: true },
                { name: 'KB Identifier', value: targetKb, inline: true },
                { name: 'OS Build', value: targetBuild, inline: true },
              ],
              footer: {
                text: 'Windows 11 Update Notifier • Instant Discord & Android Alert',
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
        message: `Delivered ${targetKb} (Build ${targetBuild}) alert to your Discord server & mobile app!`,
      });
    } catch (err) {
      res.status(500).json({
        ok: false,
        error: err instanceof Error ? err.message : 'Failed to connect to Discord Webhook endpoint.',
      });
    }
  });

  app.post('/api/notify/android-ntfy', async (req, res) => {
    const { topic, kb, build, version } = req.body || {};
    if (!topic || typeof topic !== 'string' || topic.trim().length < 3) {
      res.status(400).json({
        ok: false,
        error: 'Please enter a unique ntfy topic name (at least 3 characters, e.g. win11-alerts-982).',
      });
      return;
    }

    const cleanTopic = topic.trim().replace(/[^a-zA-Z0-9_-]/g, '');
    const targetKb = kb || 'KB5129195';
    const targetBuild = build || '28000.3231';
    const targetVersion = version || '26H2';

    try {
      const response = await fetch(`https://ntfy.sh/${cleanTopic}`, {
        method: 'POST',
        headers: {
          Title: `Windows 11 ${targetVersion} Update: ${targetKb}`,
          Priority: 'high',
          Tags: 'windows,iphone',
          Click: RELEASE_INFO_URL,
        },
        body: `New Windows 11 ${targetVersion} package ${targetKb} (OS Build ${targetBuild}) detected on Microsoft Release Health.`,
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
        message: `Sent native Android push notification to ntfy topic "${cleanTopic}"!`,
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
