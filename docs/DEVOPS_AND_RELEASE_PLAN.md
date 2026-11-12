# Connectify Android — DevOps, CI/CD & Release Engineering Plan

**Document Owner:** Agent 13 (DevOps & Release Engineer)  
**Target Repository:** `/root/.gemini/antigravity/scratch/connectify-android`  
**Source Baseline (Read-Only):** `/root/.gemini/antigravity/scratch/connectify-new`  
**Reference Android Sibling Inspected (Read-Only):** `/root/.gemini/antigravity/scratch/katakecil`  
**Application ID:** `com.connectify.android`  
**Application Name:** `Connectify`

---

## 1. Environment & Toolchain Audit Findings

We audited the current runtime environment (`proot-distro` Debian Trixie `aarch64` hosted on Android/Termux), the source web repository (`connectify-new`), and the sibling Android project (`katakecil` across both its Capacitor `df7b0eb` baseline and `HEAD`).

### 1.1 Local Termux / Linux (`proot-distro`) Capabilities & Constraints

| Component | Local Status | Binary / Path | Notes & DevOps Impact |
| :--- | :--- | :--- | :--- |
| **OS / Container** | Available | Debian Trixie (`aarch64` / `proot-distro`) | Shares `/data/data/com.termux/files/usr/bin` in `PATH`. |
| **Node.js & npm** | Available | `/usr/bin/node` (`v20.19.2`), `/usr/bin/npm` (`9.2.0`), `/usr/bin/npx` | Full support for Vite builds, TypeScript typechecking (`tsc`), unit tests, economy/progression simulations, and Capacitor CLI (`npx cap sync android`). |
| **Java / JDK 21** | Available | `/data/data/com.termux/files/usr/bin/java` & `javac` (`OpenJDK 21.0.13`) | Full JDK 21 runtime and compiler available locally. |
| **Keytool & Jarsigner** | Available | `/data/data/com.termux/files/usr/bin/keytool`, `jarsigner` | Can generate production PKCS12 (`.p12`) release keystores locally outside the repository (`npm run android:key`). |
| **APK Signer & APKTool** | Available | `/data/data/com.termux/files/usr/bin/apksigner`, `apktool` | Backed by `/data/data/com.termux/files/usr/share/java/apksigner.jar`. Can sign and verify APK v1/v2/v3 signatures locally. |
| **ADB** | Available | `/data/data/com.termux/files/usr/bin/adb` | Can install built APKs directly to a connected device/emulator (`adb install -r`). |
| **Android SDK (`ANDROID_HOME`)** | **Not Installed Locally** | `sdkmanager`, `aapt2`, `zipalign`, and `platforms/android-36/android.jar` are not installed on local storage | Local Termux storage does not have the multi-gigabyte Android SDK (`platforms;android-36`, `build-tools;36.0.0`) pre-installed, and Google's default Maven `aapt2` binary targets `linux-x86_64` rather than `linux-aarch64`. |

### 1.2 Dual-Track Build Strategy (Local Termux + Cloud GitHub Actions)

Because this workspace runs in an `aarch64` Termux/`proot-distro` environment without a local pre-installed `ANDROID_HOME`:

1. **What Runs 100% Locally in Termux/Linux (Zero External SDK Required):**
   - Dependency installation (`npm ci` / `npm install`)
   - Static analysis & TypeScript validation (`npm run typecheck` / `tsc --noEmit`)
   - Automated unit, solver, deadlock, economy, and persistence tests (`npm test`)
   - 30-day Economy & Progression Monte Carlo/deterministic simulations (`npm run sim:economy`, `npm run sim:progression`)
   - Production Vite web bundle compilation (`npm run build` -> `dist/`)
   - Capacitor Android asset synchronization (`npx cap sync android` / `npm run android:sync` -> updates `android/app/src/main/assets/public`)
   - Production PKCS12 release keystore generation (`npm run android:key -- /private/path`)
2. **What Runs When `ANDROID_HOME` Is Provided (Cloud GitHub Actions `ubuntu-latest` or Local SDK Setup):**
   - Full Gradle compilation (`./gradlew assembleDebug`, `./gradlew assembleRelease`, `./gradlew lintRelease`, `./gradlew testReleaseUnitTest`)
   - 16 KB page-size alignment (`zipalign -P 16 -f 4`) for Android 15/16 compatibility
   - APK Signature Scheme v1/v2/v3 signing and verification (`apksigner sign` & `apksigner verify`)
   - Artifact packaging (`Connectify-<version>-debug.apk`, `Connectify-<version>-release.apk`, `.sha256` checksums, and `Connectify-release-info.json`)
3. **Optional Local Termux Gradle APK Compilation (If User Installs Termux Android SDK):**
   - Documented in Section 7 below: installing Termux's native ARM64 `aapt2` package (`pkg install aapt2 android-tools`) and passing `-Pandroid.aapt2FromMavenOverride=/data/data/com.termux/files/usr/bin/aapt2` allows `./gradlew assembleDebug` to execute natively on `aarch64` Android devices.

---

## 2. Target Repository Structure (`connectify-android`)

`connectify-android` is structured as a clean, modular, offline-first Capacitor + Vite + React + TypeScript project containing **only** Onet, Match 3, and the shared core systems (Economy, Progression, Themes/Cosmetics, Audio/Haptics, Local Persistence, and Mobile UI):

```text
connectify-android/
├── .github/
│   └── workflows/
│       └── android-build.yml          # Automated CI/CD pipeline (QA + Web Build + Cap Sync + APK Build/Sign/Release)
├── android/                           # Capacitor Android native project (Gradle 8.13+, SDK 24..36)
│   ├── app/
│   │   ├── src/main/
│   │   │   ├── assets/public/         # Populated automatically by `npx cap sync android` from `dist/`
│   │   │   ├── java/com/connectify/android/
│   │   │   │   └── MainActivity.java  # Capacitor BridgeActivity with immersive bars & back-button handling
│   │   │   ├── res/                   # Launcher adaptive icons, splash screen drawables, strings, styles
│   │   │   └── AndroidManifest.xml    # Minimal permissions, portrait orientation lock, hardwareAccelerated=true
│   │   ├── build.gradle               # App module Gradle config, version loading, debug & conditional release signing
│   │   ├── capacitor.build.gradle     # Auto-generated Capacitor plugin Gradle hooks
│   │   └── proguard-rules.pro         # Keep rules for Capacitor bridges and WebView JS interfaces
│   ├── gradle/wrapper/
│   │   ├── gradle-wrapper.jar
│   │   └── gradle-wrapper.properties  # Pinned Gradle 8.14.3
│   ├── build.gradle                   # Top-level Android Gradle Plugin (8.13.0) configuration
│   ├── capacitor.settings.gradle      # Auto-generated Capacitor settings
│   ├── gradle.properties              # JVM heap, parallel execution, AndroidX, nonTransitiveRClass, aapt2 override hook
│   ├── gradlew                        # POSIX Gradle wrapper script (chmod +x)
│   ├── gradlew.bat                    # Windows Gradle wrapper script
│   ├── settings.gradle                # Includes :app and :capacitor-android
│   └── variables.gradle               # Centralized SDK versions (minSdk=24, compileSdk=36, targetSdk=36)
├── docs/                              # Complete engineering, design, art, economy, progression, QA & DevOps specs
│   └── DEVOPS_AND_RELEASE_PLAN.md     # This document
├── public/
│   └── assets/                        # Curated production assets (Onet, Match 3, Themes, UI, Audio)
├── scripts/
│   ├── build-android.mjs              # End-to-end Android build, zipalign, apksigner & SHA-256 checksum script
│   ├── create-signing-key.mjs         # One-time PKCS12 keystore generator (writes outside repo)
│   ├── simulate-economy.mjs           # 30-day 9-profile economy balance simulator
│   └── simulate-progression.mjs       # XP curve, difficulty pacing & Onet/Match-3 parity simulator
├── src/
│   ├── config/                        # Centralized tunable game, economy, progression & theme configs
│   ├── core/                          # Shared services: persistence, economy, progression, themes, audio, haptics, android-bridge
│   ├── games/
│   │   ├── onet/                      # Modular Onet engine, solver, board generator, HUD & renderer
│   │   └── match3/                    # Modular Match 3 engine, swap/cascade/booster logic, HUD & renderer
│   ├── ui/                            # Mobile screens, modals, navigation stack, HUD components
│   ├── App.tsx                        # Root application shell & screen router
│   └── main.tsx                       # Entrypoint & Capacitor lifecycle initialization
├── tests/                             # Automated unit, integration & regression test suites
├── app-version.json                   # Single source of truth for versionName ("1.0.0") and versionCode (1)
├── capacitor.config.json              # Capacitor configuration (appId: com.connectify.android, webDir: dist)
├── index.html                         # Mobile viewport-fit=cover entry HTML
├── package.json                       # Dependencies and standardized build/test/sim/android scripts
├── tsconfig.json                      # Strict TypeScript compiler configuration
└── vite.config.ts                     # Offline-first Vite bundler config (relative base './' for WebView)
```

---

## 3. Git Workflow & Repository Hygiene

### 3.1 Branching & Commit Strategy
- **Default Branch (`main`)**: Always deployable; every commit on `main` must pass `npm run typecheck`, `npm test`, `npm run sim:economy`, `npm run sim:progression`, and `npm run build`.
- **Feature Branches (`feat/<module>`)**: Scoped per subsystem (e.g., `feat/onet-engine`, `feat/match3-engine`, `feat/economy-progression`, `feat/android-shell`).
- **Release Tags (`v<major>.<minor>.<patch>`)**: Pushing a version tag (e.g., `v1.0.0`) after bumping `app-version.json` triggers `.github/workflows/android-build.yml` to build, sign, verify, and publish the release APK to GitHub Releases.
- **Conventional Commits**:
  - `feat(onet): ...`, `feat(match3): ...`, `feat(economy): ...`, `feat(ui): ...`, `feat(android): ...`
  - `fix(persistence): ...`, `test(qa): ...`, `ci(devops): ...`, `docs(spec): ...`

### 3.2 Mandatory `.gitignore` Rules (Secret & Artifact Protection)
The repository `.gitignore` must strictly exclude build outputs, local SDK paths, and any cryptographic signing materials:

```gitignore
# Dependencies & Web Build Outputs
node_modules/
dist/
artifacts/
*.tsbuildinfo

# Environment & Secrets (NEVER COMMIT)
.env
.env.*
*.local
*.jks
*.keystore
*.p12
*.pfx
*.pem
*.key
signing.json
*signing*/
credentials.json

# Android / Gradle Build & Local Machine Paths
android/.gradle/
android/build/
android/app/build/
android/capacitor-cordova-android-plugins/build/
android/local.properties
android/.idea/
android/*.iml
*.apk
*.aab
*.ap_
*.dex

# OS / Temp
.DS_Store
Thumbs.db
*.tmp
*.log
```

---

## 4. Standardized NPM Scripts (`package.json`)

To ensure local developers, QA agents, and GitHub Actions execute the exact same commands, `connectify-android/package.json` defines the following scripts:

```json
{
  "name": "connectify-android",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "typecheck": "tsc --noEmit",
    "lint": "tsc --noEmit",
    "test": "tsx --test tests/*.test.ts",
    "sim:economy": "node scripts/simulate-economy.mjs",
    "sim:progression": "node scripts/simulate-progression.mjs",
    "verify": "npm run typecheck && npm test && npm run sim:economy && npm run sim:progression && npm run build",
    "android:sync": "npm run build && npx cap sync android",
    "android:debug": "node scripts/build-android.mjs --debug",
    "android:release": "node scripts/build-android.mjs",
    "android:key": "node scripts/create-signing-key.mjs"
  }
}
```

---

## 5. Gradle Debug & Release Build Configuration

### 5.1 Single Source of Version Truth (`app-version.json`)
`connectify-android/app-version.json` controls both web metadata and Android manifest versioning:

```json
{
  "version": "1.0.0",
  "versionCode": 1
}
```

### 5.2 SDK & Dependency Variables (`android/variables.gradle`)
Following the proven setup in `katakecil`:
- `minSdkVersion = 24` (Android 7.0+, covers >99% of active Android devices)
- `compileSdkVersion = 36` (or `35` depending on installed platform)
- `targetSdkVersion = 36` (Android 15/16 ready, with 16 KB page alignment via `zipalign -P 16`)
- Java & Kotlin Target: `JavaVersion.VERSION_21`

### 5.3 App Module Configuration (`android/app/build.gradle`)
`android/app/build.gradle` reads `../app-version.json` dynamically and configures both **Debug** and **Release** build types without hardcoding credentials:

```groovy
import groovy.json.JsonSlurper

apply plugin: 'com.android.application'

def appVersionFile = rootProject.file('../app-version.json')
def appVersion = appVersionFile.exists()
    ? new JsonSlurper().parseText(appVersionFile.getText('UTF-8'))
    : [version: '1.0.0', versionCode: 1]

def releaseStoreFile = project.findProperty('CONNECTIFY_RELEASE_STORE_FILE') ?: System.getenv('CONNECTIFY_RELEASE_STORE_FILE')
def releaseStorePassword = project.findProperty('CONNECTIFY_RELEASE_STORE_PASSWORD') ?: System.getenv('CONNECTIFY_RELEASE_STORE_PASSWORD')
def releaseKeyAlias = project.findProperty('CONNECTIFY_RELEASE_KEY_ALIAS') ?: System.getenv('CONNECTIFY_RELEASE_KEY_ALIAS')
def releaseKeyPassword = project.findProperty('CONNECTIFY_RELEASE_KEY_PASSWORD') ?: System.getenv('CONNECTIFY_RELEASE_KEY_PASSWORD')
def hasReleaseSigning = releaseStoreFile && releaseStorePassword && releaseKeyAlias && releaseKeyPassword

android {
    namespace = "com.connectify.android"
    compileSdk = rootProject.ext.compileSdkVersion

    defaultConfig {
        applicationId "com.connectify.android"
        minSdkVersion rootProject.ext.minSdkVersion
        targetSdkVersion rootProject.ext.targetSdkVersion
        versionCode appVersion.versionCode as Integer
        versionName appVersion.version as String
        testInstrumentationRunner "androidx.test.runner.AndroidJUnitRunner"
        aaptOptions {
            ignoreAssetsPattern = '!.svn:!.git:!.ds_store:!*.scc:.*:!CVS:!thumbs.db:!picasa.ini:!*~'
        }
    }

    signingConfigs {
        if (hasReleaseSigning) {
            release {
                storeFile file(releaseStoreFile)
                storePassword releaseStorePassword
                keyAlias releaseKeyAlias
                keyPassword releaseKeyPassword
                enableV1Signing true
                enableV2Signing true
                enableV3Signing true
            }
        }
    }

    buildTypes {
        debug {
            applicationIdSuffix ".debug"
            versionNameSuffix "-debug"
            debuggable true
        }
        release {
            if (hasReleaseSigning) {
                signingConfig signingConfigs.release
            }
            minifyEnabled false
            shrinkResources false
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }

    compileOptions {
        sourceCompatibility JavaVersion.VERSION_21
        targetCompatibility JavaVersion.VERSION_21
    }

    lint {
        abortOnError = false
        checkReleaseBuilds = false
    }
}
```

> **Note on `applicationIdSuffix` in Debug:** Depending on testing preference, `applicationId` can remain `com.connectify.android` across both debug and release or use `.debug` to allow side-by-side installation. Keeping `com.connectify.android` without suffix is default in Capacitor so save data can be inspected consistently during QA.

---

## 6. APK Signing Architecture (Zero Secrets in Git)

### 6.1 Generating a Production Signing Key Locally
Never store `.p12` or `.jks` files inside the repository. Use `scripts/create-signing-key.mjs` (or `keytool` directly) to generate a 4096-bit RSA PKCS12 keystore in a private directory outside the repository:

```bash
# Run once and back up the resulting directory securely offline
mkdir -p ~/.connectify-signing
chmod 700 ~/.connectify-signing

keytool -genkeypair \
  -keystore ~/.connectify-signing/connectify-release.p12 \
  -storetype PKCS12 \
  -alias connectify \
  -keyalg RSA \
  -keysize 4096 \
  -validity 10000 \
  -dname "CN=Connectify Studio, OU=Mobile Games, O=Connectify, C=ID"
```

### 6.2 Required GitHub Actions Repository Secrets (Optional for Debug, Required for Signed Release)
Configure the following secrets in GitHub under **Settings → Secrets and variables → Actions**:

| Secret Name | Required? | Description |
| :--- | :--- | :--- |
| `CONNECTIFY_KEYSTORE_BASE64` | For Signed Release | Base64-encoded PKCS12/JKS keystore (`base64 -w 0 ~/.connectify-signing/connectify-release.p12`). |
| `CONNECTIFY_STORE_PASSWORD` | For Signed Release | Keystore password. |
| `CONNECTIFY_KEY_PASSWORD` | For Signed Release | Key password (defaults to `CONNECTIFY_STORE_PASSWORD` if identical). |
| `CONNECTIFY_KEY_ALIAS` | For Signed Release | Key alias (defaults to `connectify`). |
| `CONNECTIFY_SIGNING_JSON` | Optional Alternative | JSON string `{ "storeFile": "connectify-release.p12", "alias": "connectify", "storePassword": "...", "keyPassword": "..." }` (compatible with the `katakecil` signing pattern). |

**Graceful Fallback in CI:**
- If no signing secrets are configured, `.github/workflows/android-build.yml` **still succeeds** and produces:
  1. `Connectify-<version>-debug.apk` (signed with the standard Android debug key — **immediately installable on any Android phone**).
  2. `Connectify-<version>-release-unsigned.apk` (16 KB page-aligned unsigned release APK ready for external `apksigner` signing).
- Once signing secrets are added, the workflow automatically produces:
  1. `Connectify-<version>-debug.apk` (+ `.sha256`)
  2. `Connectify-<version>-release.apk` (aligned with `zipalign -P 16 -f 4`, signed with `apksigner` v1+v2+v3, verified with `apksigner verify`, + `.sha256` + `Connectify-release-info.json`).

---

## 7. Termux / ARM64 Local Compatibility vs. Cloud Build Guide

### 7.1 Standard Workflow (Local Termux Development + GitHub Actions APK Build)
In this Termux/`proot-distro` environment, developers and agents run the full web + Capacitor sync pipeline locally:

```bash
cd /root/.gemini/antigravity/scratch/connectify-android

# 1. Install dependencies
npm ci

# 2. Run TypeScript check, unit tests, and 30-day economy/progression simulations
npm run typecheck
npm test
npm run sim:economy
npm run sim:progression

# 3. Build production offline web bundle and sync into android/app/src/main/assets/public
npm run build
npx cap sync android
```

Then push to GitHub (or trigger `Build Connectify Android APK` in GitHub Actions) to compile the native Gradle project on `ubuntu-latest` and download `Connectify-Android-APK.zip`.

### 7.2 Building APKs Locally on Termux / ARM64 (When Local Android SDK Is Installed)
If you install an Android SDK inside Termux/proot-distro (e.g., at `/opt/android-sdk` or `/data/data/com.termux/files/usr/share/android-sdk`):
1. Install Termux's native `aarch64` `aapt2` binary so Gradle does not fail trying to run Google's `linux-x86_64` `aapt2` from Maven:
   ```bash
   pkg install aapt2 android-tools openjdk-21
   ```
2. Export `ANDROID_HOME` and pass `android.aapt2FromMavenOverride`:
   ```bash
   export ANDROID_HOME=/path/to/android-sdk
   cd android
   ./gradlew assembleDebug \
     --no-daemon \
     --max-workers=2 \
     -Pandroid.aapt2FromMavenOverride=/data/data/com.termux/files/usr/bin/aapt2
   ```
3. Our `scripts/build-android.mjs` automatically detects if running on `linux` + `arm64` (`process.arch === 'arm64'`) and, if `/data/data/com.termux/files/usr/bin/aapt2` exists, injects `-Pandroid.aapt2FromMavenOverride=/data/data/com.termux/files/usr/bin/aapt2` into the `./gradlew` invocation automatically.

---

## 8. Release Checklist & Quality Gates

Before cutting any release (`v1.x.y`):
1. **Version Bump**: Increment `version` (SemVer) and `versionCode` (strictly increasing integer) in `app-version.json` and `package.json`.
2. **Automated Verification Gate**:
   - `npm run typecheck` passes with `0` errors.
   - `npm test` passes 100% of Onet pathfinding/board-solvability, Match 3 cascade/booster/no-moves, Economy atomic transaction, Progression XP/star, and Persistence corruption-recovery tests.
   - `node scripts/simulate-economy.mjs` and `node scripts/simulate-progression.mjs` complete with balanced metrics across all 9 player personas.
3. **Offline Asset Integrity Check**:
   - `npm run build && npx cap sync android` copies all tiles, themes, sprites, fonts, and audio into `android/app/src/main/assets/public/`.
   - Verify zero runtime dependencies on external CDNs or mandatory remote servers.
4. **APK Verification Gate**:
   - Verify 16 KB page alignment: `zipalign -c -P 16 4 artifacts/Connectify-<version>-release.apk`
   - Verify APK signature schemes v2/v3: `apksigner verify --verbose --print-certs artifacts/Connectify-<version>-release.apk`
   - Verify SHA-256 checksum matches `artifacts/Connectify-<version>-release.apk.sha256`.
