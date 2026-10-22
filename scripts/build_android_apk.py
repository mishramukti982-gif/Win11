#!/usr/bin/env python3
"""
Generates a self-contained Android Gradle project wrapping the built Vite/React
Windows 11 Update Notifier web application into a native signed Android APK:
`Win11-Update-Notifier-Android.apk`
"""
import os
import shutil
import textwrap

ANDROID_DIR = "android_build"
DIST_DIR = "dist"


def write_file(rel_path: str, content: str) -> None:
    full_path = os.path.join(ANDROID_DIR, rel_path)
    os.makedirs(os.path.dirname(full_path), exist_ok=True)
    with open(full_path, "w", encoding="utf-8") as f:
        f.write(textwrap.dedent(content).lstrip())


def main() -> None:
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

            buildTypes {
                release {
                    minifyEnabled false
                    signingConfig signingConfigs.debug
                }
                debug {
                    signingConfig signingConfigs.debug
                }
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

    # 5. AndroidManifest.xml
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

    # 6. MainActivity.java using WebViewAssetLoader so ES modules and assets load natively offline/online
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
                        .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this))
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
                        return assetLoader.shouldInterceptRequest(request.getUrl());
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

                webView.loadUrl("https://appassets.androidplatform.net/assets/public/index.html");
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

    # 7. Copy built dist/ files into app/src/main/assets/public
    assets_public = os.path.join(ANDROID_DIR, "app", "src", "main", "assets", "public")
    os.makedirs(assets_public, exist_ok=True)
    if os.path.exists(DIST_DIR):
        shutil.copytree(DIST_DIR, assets_public, dirs_exist_ok=True)
        # Rewrite root-relative paths (/assets/...) to relative (./assets/...) for WebViewAssetLoader
        index_html_path = os.path.join(assets_public, "index.html")
        if os.path.exists(index_html_path):
            with open(index_html_path, "r", encoding="utf-8") as f:
                html = f.read()
            html = html.replace('src="/assets/', 'src="./assets/')
            html = html.replace('href="/assets/', 'href="./assets/')
            html = html.replace('href="/manifest.webmanifest"', 'href="./manifest.webmanifest"')
            html = html.replace('href="/icon.svg"', 'href="./icon.svg"')
            html = html.replace('href="/apple-touch-icon.png"', 'href="./apple-touch-icon.png"')
            with open(index_html_path, "w", encoding="utf-8") as f:
                f.write(html)

    print("Android Gradle project generated at:", ANDROID_DIR)


if __name__ == "__main__":
    main()
