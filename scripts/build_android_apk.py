#!/usr/bin/env python3
"""
Generates a self-contained Android Gradle project wrapping the built Vite/React
Windows 11 Update Notifier web application into a native signed Android APK:
`Win11-Update-Notifier-Android.apk`
"""
import os
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


def main() -> None:
    ensure_pwa_icons_in_public()

    if os.path.exists(ANDROID_DIR):
        shutil.rmtree(ANDROID_DIR)
    os.makedirs(ANDROID_DIR, exist_ok=True)

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
        android.useAndroidX=true
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
                versionCode 1
                versionName "1.0.0"
            }

            compileOptions {
                sourceCompatibility JavaVersion.VERSION_17
                targetCompatibility JavaVersion.VERSION_17
            }
        }

        dependencies {
            implementation 'androidx.webkit:webkit:1.10.0'
        }
        """,
    )

    # 5. Generate Android launcher icon PNG in mipmap-xxxhdpi
    mipmap_dir = os.path.join(ANDROID_DIR, "app", "src", "main", "res", "mipmap-xxxhdpi")
    os.makedirs(mipmap_dir, exist_ok=True)
    with open(os.path.join(mipmap_dir, "ic_launcher.png"), "wb") as f:
        f.write(create_win11_png(192))

    # 6. AndroidManifest.xml
    write_file(
        "app/src/main/AndroidManifest.xml",
        """
        <?xml version="1.0" encoding="utf-8"?>
        <manifest xmlns:android="http://schemas.android.com/apk/res/android">

            <uses-permission android:name="android.permission.INTERNET" />
            <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
            <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />

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

    # 7. MainActivity.java using WebViewAssetLoader so ES modules and assets load natively offline/online
    write_file(
        "app/src/main/java/com/win11notifier/app/MainActivity.java",
        """
        package com.win11notifier.app;

        import android.app.Activity;
        import android.content.Intent;
        import android.graphics.Color;
        import android.net.Uri;
        import android.os.Build;
        import android.os.Bundle;
        import android.view.Window;
        import android.webkit.WebChromeClient;
        import android.webkit.WebResourceRequest;
        import android.webkit.WebResourceResponse;
        import android.webkit.WebSettings;
        import android.webkit.WebView;
        import android.webkit.WebViewClient;
        import androidx.webkit.WebViewAssetLoader;

        public class MainActivity extends Activity {
            private WebView webView;

            @Override
            protected void onCreate(Bundle savedInstanceState) {
                super.onCreate(savedInstanceState);

                Window window = getWindow();
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                    window.setStatusBarColor(Color.parseColor("#0B0F17"));
                    window.setNavigationBarColor(Color.parseColor("#0B0F17"));
                }

                webView = new WebView(this);
                webView.setBackgroundColor(Color.parseColor("#0B0F17"));
                setContentView(webView);

                final WebViewAssetLoader assetLoader = new WebViewAssetLoader.Builder()
                        .addPathHandler("/", new WebViewAssetLoader.AssetsPathHandler(this))
                        .build();

                WebSettings settings = webView.getSettings();
                settings.setJavaScriptEnabled(true);
                settings.setDomStorageEnabled(true);
                settings.setDatabaseEnabled(true);
                settings.setAllowFileAccess(false);
                settings.setAllowContentAccess(false);

                webView.setWebChromeClient(new WebChromeClient());
                webView.setWebViewClient(new WebViewClient() {
                    @Override
                    public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                        Uri url = request.getUrl();
                        if (url != null && "appassets.androidplatform.net".equals(url.getHost())) {
                            return assetLoader.shouldInterceptRequest(url);
                        }
                        return super.shouldInterceptRequest(view, request);
                    }

                    @Override
                    public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                        Uri uri = request.getUrl();
                        String host = uri.getHost() != null ? uri.getHost() : "";
                        if (host.equals("appassets.androidplatform.net")) {
                            return false;
                        }
                        Intent intent = new Intent(Intent.ACTION_VIEW, uri);
                        startActivity(intent);
                        return true;
                    }
                });

                webView.loadUrl("https://appassets.androidplatform.net/index.html");
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

    # 8. Copy built dist/ files into app/src/main/assets/
    assets_root = os.path.join(ANDROID_DIR, "app", "src", "main", "assets")
    os.makedirs(assets_root, exist_ok=True)
    if os.path.exists(DIST_DIR):
        shutil.copytree(DIST_DIR, assets_root, dirs_exist_ok=True)

    print("Android Gradle project generated at:", ANDROID_DIR)


if __name__ == "__main__":
    main()
