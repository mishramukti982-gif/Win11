#!/usr/bin/env python3
"""
Generates a zero-dependency Android Gradle project wrapping the built Vite/React
Windows 11 Update Notifier web application into a native signed Android APK:
`Win11-Update-Notifier-Android.apk`
Includes Android 13+ POST_NOTIFICATIONS runtime permission request,
NotificationChannel registration, and native AndroidBridge.showNotification(title, body).
"""
import glob
import os
import re
import shutil
import struct
import textwrap
import zlib

ANDROID_DIR = "android_build"
DIST_DIR = "dist"


def write_file(rel_path: str, content: str) -> None:
    full_path = os.path.join(ANDROID_DIR, rel_path)
    os.makedirs(os.path.dirname(full_path), exist_ok=True)
    with open(full_path, "w", encoding="utf-8") as f:
        f.write(textwrap.dedent(content).lstrip())


def create_win11_png(size: int) -> bytes:
    """Generates a valid RGBA PNG icon with the Windows 11 Fluent 4-pane grid."""
    raw = bytearray()
    pad = int(size * 0.16)
    gap = max(2, int(size * 0.05))
    half = size // 2

    for y in range(size):
        raw.append(0)  # filter type 0
        for x in range(size):
            r, g, b = 11, 15, 23  # #0B0F17
            in_sq = pad <= x < size - pad and pad <= y < size - pad
            in_gap = abs(x - half) < gap // 2 or abs(y - half) < gap // 2
            if in_sq and not in_gap:
                if x < half and y < half:
                    r, g, b = 56, 189, 248  # #38BDF8
                elif x >= half and y < half:
                    r, g, b = 2, 132, 199   # #0284C7
                elif x < half and y >= half:
                    r, g, b = 2, 132, 199   # #0284C7
                else:
                    r, g, b = 88, 101, 242  # #5865F2
            raw.extend((r, g, b, 255))

    def make_chunk(chunk_type: bytes, data: bytes) -> bytes:
        crc = zlib.crc32(chunk_type + data) & 0xFFFFFFFF
        return struct.pack(">I", len(data)) + chunk_type + data + struct.pack(">I", crc)

    ihdr = struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0)
    idat = zlib.compress(bytes(raw), 9)
    return (
        b"\x89PNG\r\n\x1a\n"
        + make_chunk(b"IHDR", ihdr)
        + make_chunk(b"IDAT", idat)
        + make_chunk(b"IEND", b"")
    )


def ensure_pwa_icons_in_public() -> None:
    os.makedirs("public", exist_ok=True)
    for filename, sz in [
        ("pwa-192x192.png", 192),
        ("pwa-512x512.png", 512),
        ("pwa-maskable-512x512.png", 512),
        ("apple-touch-icon.png", 180),
    ]:
        path = os.path.join("public", filename)
        if not os.path.exists(path):
            with open(path, "wb") as f:
                f.write(create_win11_png(sz))


def build_inlined_index_html() -> str:
    """Inlines compiled Vite CSS and JS bundles into a single self-contained HTML string."""
    index_path = os.path.join(DIST_DIR, "index.html")
    if not os.path.exists(index_path):
        return "<html><body style='background:#0B0F17;color:#fff'>Win11 Notifier</body></html>"

    with open(index_path, "r", encoding="utf-8") as f:
        html = f.read()

    css_contents = []
    for css_file in sorted(glob.glob(os.path.join(DIST_DIR, "assets", "*.css"))):
        with open(css_file, "r", encoding="utf-8") as cf:
            css_contents.append(cf.read())

    js_contents = []
    for js_file in sorted(glob.glob(os.path.join(DIST_DIR, "assets", "*.js"))):
        with open(js_file, "r", encoding="utf-8") as jf:
            js_contents.append(jf.read())

    html = re.sub(r'<link[^>]+href="[^"]*assets/[^"]+\.css"[^>]*>', "", html)
    html = re.sub(r'<script[^>]+src="[^"]*assets/[^"]+\.js"[^>]*></script>', "", html)
    html = re.sub(r'<script[^>]+src="[^"]*registerSW\.js"[^>]*></script>', "", html)
    html = re.sub(r'<link[^>]+rel="manifest"[^>]*>', "", html)

    if css_contents:
        combined_css = "\n".join(css_contents)
        html = html.replace("</head>", f"<style>\n{combined_css}\n</style>\n</head>")

    if js_contents:
        combined_js = "\n".join(js_contents)
        html = html.replace("</body>", f"<script type=\"module\">\n{combined_js}\n</script>\n</body>")

    return html


def main() -> None:
    ensure_pwa_icons_in_public()

    if os.path.exists(ANDROID_DIR):
        shutil.rmtree(ANDROID_DIR)
    os.makedirs(ANDROID_DIR, exist_ok=True)

    sdk_dir = os.environ.get("ANDROID_HOME") or os.environ.get("ANDROID_SDK_ROOT") or "/usr/local/lib/android/sdk"
    if os.path.exists(sdk_dir):
        write_file("local.properties", f"sdk.dir={sdk_dir}\n")

    # 1. settings.gradle
    write_file(
        "settings.gradle",
        """
        pluginManagement {
            repositories {
                google()
                mavenCentral()
                gradlePluginPortal()
            }
        }
        dependencyResolutionManagement {
            repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
            repositories {
                google()
                mavenCentral()
            }
        }
        rootProject.name = "Win11UpdateNotifier"
        include ':app'
        """,
    )

    # 2. Root build.gradle
    write_file(
        "build.gradle",
        """
        plugins {
            id 'com.android.application' version '8.2.2' apply false
        }
        """,
    )

    # 3. gradle.properties
    write_file(
        "gradle.properties",
        """
        org.gradle.jvmargs=-Xmx2048m -Dfile.encoding=UTF-8
        """,
    )

    # 4. app/build.gradle
    write_file(
        "app/build.gradle",
        """
        plugins {
            id 'com.android.application'
        }

        android {
            namespace 'com.win11notifier.app'
            compileSdk 34

            defaultConfig {
                applicationId "com.win11notifier.app"
                minSdk 24
                targetSdk 34
                versionCode 2
                versionName "1.1.0"
            }

            compileOptions {
                sourceCompatibility JavaVersion.VERSION_17
                targetCompatibility JavaVersion.VERSION_17
            }
        }

        dependencies {
        }
        """,
    )

    # 5. Generate Android launcher icon PNG in mipmap-xxxhdpi
    mipmap_dir = os.path.join(ANDROID_DIR, "app", "src", "main", "res", "mipmap-xxxhdpi")
    os.makedirs(mipmap_dir, exist_ok=True)
    with open(os.path.join(mipmap_dir, "ic_launcher.png"), "wb") as f:
        f.write(create_win11_png(192))

    # 6. AndroidManifest.xml with POST_NOTIFICATIONS + VIBRATE
    write_file(
        "app/src/main/AndroidManifest.xml",
        """
        <?xml version="1.0" encoding="utf-8"?>
        <manifest xmlns:android="http://schemas.android.com/apk/res/android">

            <uses-permission android:name="android.permission.INTERNET" />
            <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
            <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
            <uses-permission android:name="android.permission.VIBRATE" />

            <application
                android:allowBackup="true"
                android:icon="@mipmap/ic_launcher"
                android:label="Win11 Notifier"
                android:usesCleartextTraffic="true"
                android:theme="@android:style/Theme.DeviceDefault.NoActionBar">
                <activity
                    android:name=".MainActivity"
                    android:exported="true"
                    android:configChanges="orientation|screenSize|keyboardHidden">
                    <intent-filter>
                        <action android:name="android.intent.action.MAIN" />
                        <category android:name="android.intent.category.LAUNCHER" />
                    </intent-filter>
                </activity>
            </application>
        </manifest>
        """,
    )

    # 7. MainActivity.java with NotificationChannel + Android 13+ POST_NOTIFICATIONS runtime request + JavascriptInterface
    write_file(
        "app/src/main/java/com/win11notifier/app/MainActivity.java",
        """
        package com.win11notifier.app;

        import android.app.Activity;
        import android.app.Notification;
        import android.app.NotificationChannel;
        import android.app.NotificationManager;
        import android.app.PendingIntent;
        import android.content.Context;
        import android.content.Intent;
        import android.content.pm.PackageManager;
        import android.graphics.Color;
        import android.net.Uri;
        import android.os.Build;
        import android.os.Bundle;
        import android.view.Window;
        import android.webkit.JavascriptInterface;
        import android.webkit.WebChromeClient;
        import android.webkit.WebResourceRequest;
        import android.webkit.WebSettings;
        import android.webkit.WebView;
        import android.webkit.WebViewClient;
        import java.io.ByteArrayOutputStream;
        import java.io.InputStream;
        import java.nio.charset.StandardCharsets;

        public class MainActivity extends Activity {
            private static final String CHANNEL_ID = "win11_updates_channel";
            private static final int PERMISSION_REQ_CODE = 1001;
            private WebView webView;
            private int notificationIdCounter = 2000;

            public class WebAppInterface {
                Context mContext;

                WebAppInterface(Context c) {
                    mContext = c;
                }

                @JavascriptInterface
                public void requestNotificationPermission() {
                    ensureNotificationPermission();
                }

                @JavascriptInterface
                public void showNotification(String title, String message) {
                    ensureNotificationPermission();
                    sendNativeNotification(title, message);
                }
            }

            private void createNotificationChannel() {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    NotificationChannel channel = new NotificationChannel(
                            CHANNEL_ID,
                            "Windows 11 Release Alerts",
                            NotificationManager.IMPORTANCE_HIGH
                    );
                    channel.setDescription("Notifications for major and minor Microsoft Windows 11 KB updates");
                    channel.enableLights(true);
                    channel.setLightColor(Color.parseColor("#38BDF8"));
                    channel.enableVibration(true);
                    NotificationManager manager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
                    if (manager != null) {
                        manager.createNotificationChannel(channel);
                    }
                }
            }

            private void ensureNotificationPermission() {
                if (Build.VERSION.SDK_INT >= 33) {
                    if (checkSelfPermission("android.permission.POST_NOTIFICATIONS") != PackageManager.PERMISSION_GRANTED) {
                        requestPermissions(new String[]{"android.permission.POST_NOTIFICATIONS"}, PERMISSION_REQ_CODE);
                    }
                }
            }

            private void sendNativeNotification(String title, String body) {
                try {
                    NotificationManager manager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
                    if (manager == null) return;

                    Intent intent = new Intent(this, MainActivity.class);
                    intent.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
                    int flags = Build.VERSION.SDK_INT >= Build.VERSION_CODES.M
                            ? PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
                            : PendingIntent.FLAG_UPDATE_CURRENT;
                    PendingIntent pendingIntent = PendingIntent.getActivity(this, 0, intent, flags);

                    Notification.Builder builder;
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        builder = new Notification.Builder(this, CHANNEL_ID);
                    } else {
                        builder = new Notification.Builder(this);
                    }

                    builder.setSmallIcon(android.R.drawable.stat_sys_download_done)
                            .setContentTitle(title)
                            .setContentText(body)
                            .setStyle(new Notification.BigTextStyle().bigText(body))
                            .setContentIntent(pendingIntent)
                            .setAutoCancel(true);

                    manager.notify(notificationIdCounter++, builder.build());
                } catch (Exception ignored) {
                }
            }

            private String loadAssetHtml() {
                try {
                    InputStream is = getAssets().open("index.html");
                    ByteArrayOutputStream buffer = new ByteArrayOutputStream();
                    int nRead;
                    byte[] data = new byte[4096];
                    while ((nRead = is.read(data, 0, data.length)) != -1) {
                        buffer.write(data, 0, nRead);
                    }
                    is.close();
                    return new String(buffer.toByteArray(), StandardCharsets.UTF_8);
                } catch (Exception e) {
                    return "<html><body style='background:#0B0F17;color:white'>Failed to load asset</body></html>";
                }
            }

            @Override
            protected void onCreate(Bundle savedInstanceState) {
                super.onCreate(savedInstanceState);

                createNotificationChannel();
                ensureNotificationPermission();

                Window window = getWindow();
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                    window.setStatusBarColor(Color.parseColor("#0B0F17"));
                    window.setNavigationBarColor(Color.parseColor("#0B0F17"));
                }

                webView = new WebView(this);
                webView.setBackgroundColor(Color.parseColor("#0B0F17"));
                setContentView(webView);

                WebSettings settings = webView.getSettings();
                settings.setJavaScriptEnabled(true);
                settings.setDomStorageEnabled(true);
                settings.setDatabaseEnabled(true);

                webView.addJavascriptInterface(new WebAppInterface(this), "AndroidBridge");
                webView.setWebChromeClient(new WebChromeClient());
                webView.setWebViewClient(new WebViewClient() {
                    @Override
                    public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                        Uri uri = request.getUrl();
                        String host = uri.getHost() != null ? uri.getHost() : "";
                        if (host.equals("win11notifier.local")) {
                            return false;
                        }
                        try {
                            Intent intent = new Intent(Intent.ACTION_VIEW, uri);
                            startActivity(intent);
                        } catch (Exception ignored) {
                        }
                        return true;
                    }
                });

                String html = loadAssetHtml();
                webView.loadDataWithBaseURL("https://win11notifier.local/", html, "text/html", "UTF-8", null);
            }

            @Override
            public void onBackPressed() {
                if (webView != null && webView.canGoBack()) {
                    webView.goBack();
                } else {
                    super.onBackPressed();
                }
            }
        }
        """,
    )

    # 8. Write self-contained inlined index.html into app/src/main/assets/index.html
    assets_root = os.path.join(ANDROID_DIR, "app", "src", "main", "assets")
    os.makedirs(assets_root, exist_ok=True)
    inlined_html = build_inlined_index_html()
    with open(os.path.join(assets_root, "index.html"), "w", encoding="utf-8") as f:
        f.write(inlined_html)

    print("Android Gradle project generated at:", ANDROID_DIR)


if __name__ == "__main__":
    main()
