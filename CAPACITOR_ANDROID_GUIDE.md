# Capacitor Android Offline & Online Build Guide

This guide explains how **Urdu Dubber** is packaged into a native Android APK using **Capacitor**, providing complete offline capability alongside full online Gemini AI access.

---

## 1. How It Works (Offline + Online Hybrid Architecture)

### 100% Offline Capability
* When you run `npm run build`, Vite bundles all JavaScript, CSS, typography, and HTML into the `dist/` folder.
* Capacitor copies this entire bundle directly into the Android native assets (`android/app/src/main/assets/public/`).
* In the native APK, Capacitor's internal `WebViewAssetLoader` serves your app from `https://localhost/` directly from local flash storage:
  - **No internet required** to launch the app.
  - Subtitle parsing (SRT, VTT, ASS, SSA, LRC, JSON), editing, split/merge, time-shifting, gap adjustments, text cleanup, find & replace, and file exporting all run **100% locally and offline**.
  - All 6 visual themes (Classic, Cinematic, Cyberpunk, Neon, Sapphire, Sunset) render with zero network delay.

### Online Connectivity
* Android network permissions (`INTERNET`, `ACCESS_NETWORK_STATE`) remain active.
* When connected to Wi-Fi or mobile data:
  - AI Translation via **Google Gemini API** (`@google/genai`) and **Google Translate** connect securely over HTTPS.
  - Quota dashboard, model selection, and token calculators update live.
* If internet disconnects, the app stays running with zero crashes or dinosaur screens.

---

## 2. Project Configuration

### `capacitor.config.json`
Located in the root of your project:
```json
{
  "appId": "com.urdudubber.app",
  "appName": "Urdu Dubber",
  "webDir": "dist",
  "server": {
    "androidScheme": "https",
    "cleartext": true
  },
  "android": {
    "allowMixedContent": true
  }
}
```

### NPM Scripts
You can run these scripts anytime from your terminal:
- `npm run build`: Compiles the Vite web app to `dist/`.
- `npm run cap:sync`: Syncs web changes into the native `android/` project.
- `npm run cap:build`: One-command shortcut to build Vite and sync Android.

---

## 3. Building the APK on GitHub Actions (Recommended)

No Android Studio or local Java setup is needed—GitHub builds the APK in the cloud for free:

1. Push your latest code (including `capacitor.config.json` and `.github/workflows/build-apk.yml`) to your GitHub `main` branch.
2. In your GitHub repository, tap the **Actions** tab.
3. Select **Build Android APK (Capacitor)** from the left sidebar.
4. Click **Run workflow** → **Run workflow**.
5. Once the build completes (~2 minutes, green checkmark), scroll down to **Artifacts**.
6. Download **`Urdu-Dubber-Offline-APK`** to get your installable `app-debug.apk`.

---

## 4. Building the APK Locally (Optional)

If you have **Android Studio** or command-line tools installed on your computer:

### Prerequisites
- Node.js 18+ & npm
- JDK 17
- Android Studio with Android SDK 34

### Steps
1. **Install dependencies & build:**
   ```bash
   npm install
   npm run build
   ```

2. **Sync the Android project:**
   ```bash
   npx cap sync android
   ```

3. **Build the APK via command line:**
   ```bash
   cd android
   ./gradlew assembleDebug
   ```
   The compiled APK will be at:
   `android/app/build/outputs/apk/debug/app-debug.apk`

4. **Or open in Android Studio:**
   ```bash
   npx cap open android
   ```
   Click the green **Run** button to launch on your connected phone or emulator, or go to **Build** → **Build Bundle(s) / APK(s)** → **Build APK(s)**.

---

## 5. Customizing Your Android App

### Change App Name
Edit `"appName": "Your Custom Name"` in `capacitor.config.json` and in `android/app/src/main/res/values/strings.xml`, then run `npx cap sync android`.

### Change App Icon
Place your custom app icon files inside the mipmap directories in:
`android/app/src/main/res/mipmap-*/ic_launcher.png`

### Change Package ID
Edit `"appId": "com.yourcompany.app"` in `capacitor.config.json` and update `applicationId` in `android/app/build.gradle`.
