# Connectify Android

**Connectify Android** (`com.connectify.android`) is an offline-first mobile puzzle game suite built with **React 18, TypeScript, Tailwind CSS v4, Motion, Vite, and Capacitor 8**. It brings together two complete, independently playable puzzle games—**Onet Connect** and **Match 3 Puzzle**—unified by a shared player profile, virtual economy (**Permen**), progression & daily/weekly missions, collectible visual themes, procedural audio/haptics, and crash-safe local persistence.

---

## Key Features

- **100% Offline-First & Zero Mandatory Login**: Boots straight into gameplay without requiring an account, Supabase, or internet connection. Player data is stored locally using an atomic dual-slot persistence engine (`Primary` + `Backup` + `Write-Ahead Log` + `IndexedDB` mirror) with checksum verification and corruption recovery.
- **Onet Connect (`src/games/onet/`)**:
  - `<= 2`-turn / `<= 3`-segment BFS pathfinding with animated SVG connection arcs and particle bursts.
  - Guaranteed solvable board generator with multi-cell splitting tiles (`2×2 → 1×2/2×1 → 1×1`), directional `openSide` arrow constraints, gravity shifts, and deadlock-proof 3-tier `guaranteedShuffle`.
  - Dynamic Mobile Portrait grid scaling across 100+ levels, `4s` combo chains, 1–3 star mastery, and Daily Sprint mode.
- **Match 3 Puzzle (`src/games/match3/`)**:
  - Full `7×7` / `8×8` / `9×9` 2D grid-swap engine with tap and swipe gestures and zero move penalty on invalid swaps.
  - `Match-3`, `Match-4` (`striped_h`/`striped_v`), `L/T-Match` (`bomb_3x3`), `Match-5` (`rainbow`), and all 7 Special+Special combo detonations with chain-reaction BFS cascades.
  - Obstacles (`ice`, `wood`, `metal-2`, `metal-1`, `stone`, `gem`), pre-match-free initial board generation (`>= 2` valid swaps guaranteed), `< 1ms` deadlock detection with obstacle-preserving auto-shuffle, EMA Dynamic Difficulty Adjustment (DDA), and 3-loss pity relief.
- **Unified Meta-Progression & Economy (`src/services/`)**:
  - **Permen** currency with idempotent, atomic transactions (`runId`/`opId` deduplication), anti-farming diminishing returns on replayed levels, and balanced earning parity between Onet and Match 3.
  - **Independent Game Trees**: Play Onet or Match 3 exclusively or alternate freely—neither game locks the other.
  - **Themes & Cosmetics**: Curated local `.webp` tile sets, board surfaces, frames, avatars, and effects under `public/art/`, plus bundled offline fonts (`Fredoka`, `Outfit`, `JetBrains Mono`).
- **Native Android Integration (`android/` & `src/services/native/`)**:
  - Capacitor 8 shell with Android Edge-to-Edge display, `Theme.SplashScreen` handoff, LIFO hardware `backButton` navigation stack, automatic pause/audio suspend on `appStateChange`, and native `Haptics`.

---

## Repository Architecture

```text
connectify-android/
├── .github/workflows/
│   └── android-build.yml          # CI/CD: typecheck, Vitest, simulations, Vite + Cap sync, APK build/sign/release
├── android/                       # Capacitor Android native project (compileSdk/targetSdk 36, minSdk 24)
├── docs/                          # Full engineering, design, art, economy, progression, QA & DevOps specs
├── public/
│   ├── art/                       # Curated production WebP/PNG sprites, themes & brand marks
│   └── fonts/                     # Offline-bundled Fredoka, Outfit & JetBrains Mono woff2 fonts
├── scripts/
│   ├── build-android.mjs          # Cross-platform Android APK build, zipalign (-P 16), apksigner & SHA-256 script
│   ├── generate-android-icons.mjs # Generates adaptive launcher icons & splash drawables from brand mark
│   ├── migrate-assets.mjs         # Asset pipeline from connectify-new baseline
│   ├── simulate-economy.mjs       # 30-day 9-profile economy simulation
│   └── simulate-progression.mjs   # XP curve & difficulty pacing simulation
├── src/
│   ├── app/                       # Root App shell, NavigationContext & Router
│   ├── components/                # Shared tactile UI primitives, game HUDs & FX components
│   ├── config/                    # Centralized tunable configs (app, onet, match3, economy, progression, themes, audioFeel)
│   ├── core/                      # Core utilities (seeded PRNG)
│   ├── games/
│   │   ├── onet/                  # Pure Onet engine, React hook & mobile UI
│   │   └── match3/                # Pure Match 3 engine, React hook & mobile UI
│   ├── screens/                   # Home, Level Select, Shop, Collection, Profile, Ledger, Daily, Settings
│   ├── services/                  # Persistence, Economy, Progression, Theme, Audio (ClubSynth), Haptics, CapacitorBridge
│   ├── styles/                    # Tailwind CSS v4 & mobile safe-area Play Club theme tokens
│   └── types/                     # Strict TypeScript domain contracts
├── tests/                         # Vitest unit, integration, solver, economy, progression & persistence suites
├── app-version.json               # Single source of truth for versionName & versionCode
├── capacitor.config.ts            # Capacitor 8 configuration (com.connectify.android)
├── package.json
├── tsconfig.json
├── vite.config.ts
└── vitest.config.ts
```

For full technical documentation, see [docs/TECHNICAL_ARCHITECTURE.md](docs/TECHNICAL_ARCHITECTURE.md), [docs/GAME_DESIGN_DOCUMENT.md](docs/GAME_DESIGN_DOCUMENT.md), [docs/ANDROID_MIGRATION_PLAN.md](docs/ANDROID_MIGRATION_PLAN.md), [docs/TESTING_STRATEGY.md](docs/TESTING_STRATEGY.md), and [docs/DEVOPS_AND_RELEASE_PLAN.md](docs/DEVOPS_AND_RELEASE_PLAN.md).

---

## Local Development & Verification

### Prerequisites
- **Node.js**: `v20+` for Vite/Vitest (`v22+` recommended; note `@capacitor/cli` requires Node `>= 22`).
- **Java**: **JDK 21** (with `javac` and `keytool`).
- **Android SDK** (required only for local Gradle APK compilation): `ANDROID_HOME` with `platforms;android-36`, `build-tools;36.0.0`, and `platform-tools`.

### Install, Test, Simulate & Build Web Bundle

```bash
# Install dependencies
npm ci

# TypeScript typecheck
npm run typecheck

# Run full Vitest automated test suites
npm test

# Run 30-day Economy & Progression simulations
npm run test:sim

# Build production offline web bundle (dist/)
npm run build

# Run all verification gates in sequence
npm run verify
```

### Sync Capacitor Android Assets

```bash
npm run cap:sync
# Equivalent to: npm run build && npx cap sync android
```

---

## Termux / ARM64 (`aarch64`) Environment Notes

When developing inside Termux or a Debian `proot-distro` container on an ARM64 Android device:

1. **Node Binary Selection**:
   - Ensure your `vite` / `vitest` / `@tailwindcss/oxide` native bindings match the Node architecture (`/usr/bin/node` inside `proot-distro` Debian `linux-arm64`, or Termux `node` v24+ for `npx cap sync android`).
2. **Native `aapt2` Override for Local Gradle APK Builds**:
   - Google's default Maven `aapt2` artifact only ships `linux-x86_64` binaries. If you install an Android SDK locally on ARM64 Termux, also install Termux's native ARM64 `aapt2` (`pkg install aapt2 android-tools`).
   - `scripts/build-android.mjs` automatically detects `process.arch === 'arm64'` and injects `-Pandroid.aapt2FromMavenOverride=/data/data/com.termux/files/usr/bin/aapt2` (or `$CONNECTIFY_AAPT2_PATH`) when calling `./gradlew`.
3. **Without Local `ANDROID_HOME`**:
   - You can run `npm run verify` and `npm run cap:sync` locally, then push to GitHub to build the installable Debug and Release APKs in GitHub Actions.

---

## Building APKs Locally

With `ANDROID_HOME` and `JAVA_HOME` (JDK 21) configured:

```bash
# 1. Build installable Debug APK -> artifacts/Connectify-<version>-debug.apk (+ .sha256)
npm run android:debug

# 2. Build 16KB-aligned Unsigned Release APK -> artifacts/Connectify-<version>-release-unsigned.apk
npm run android:release

# 3. Build Signed Release APK -> artifacts/Connectify-<version>-release.apk (+ .sha256 + Connectify-release-info.json)
CONNECTIFY_SIGNING_DIR=/private/path/to/connectify-signing npm run android:release
```

---

## Release Keystore & Signing Instructions

**Never commit `.p12`, `.jks`, `.keystore`, `signing.json`, or passwords to Git.**

### 1. Generate a Release Keystore (Run Once Outside the Repo)

```bash
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

Create `~/.connectify-signing/signing.json` (`chmod 600`) for `scripts/build-android.mjs`:

```json
{
  "storeFile": "connectify-release.p12",
  "alias": "connectify",
  "storePassword": "<YOUR_STORE_PASSWORD>",
  "keyPassword": "<YOUR_KEY_PASSWORD>"
}
```

### 2. GitHub Actions CI/CD & Secrets

The workflow at [.github/workflows/android-build.yml](.github/workflows/android-build.yml) runs automatically on `push`, `pull_request`, version tags (`v*`), and manual `workflow_dispatch`:

1. Installs dependencies and runs `npm run typecheck`, `npm test`, and `npm run test:sim`.
2. Builds `dist/` and runs `npx cap sync android` (`npm run cap:sync`).
3. Always compiles and verifies `Connectify-<version>-debug.apk` (immediately installable on any Android 7.0+ device).
4. Compiles the Release APK:
   - **If signing secrets are configured**: runs `zipalign -P 16 -f 4`, signs with `apksigner` (APK Signature Scheme v1/v2/v3), verifies signatures & alignment, and generates `Connectify-<version>-release.apk`, `.sha256`, and `Connectify-release-info.json`.
   - **If signing secrets are not configured**: gracefully builds `Connectify-<version>-release-unsigned.apk` alongside the installable Debug APK.
5. Uploads all APKs and checksums to the `Connectify-Android-APK` workflow artifact (and publishes a GitHub Release on signed release builds when triggered manually with `publish_release: true` or via a `v*` tag).

Configure these **GitHub Repository Secrets** (**Settings → Secrets and variables → Actions**) for signed release builds:

| Secret | Description |
| :--- | :--- |
| `CONNECTIFY_KEYSTORE_BASE64` | Base64-encoded `.p12` keystore (`base64 -w 0 ~/.connectify-signing/connectify-release.p12`) |
| `CONNECTIFY_STORE_PASSWORD` | Keystore password |
| `CONNECTIFY_KEY_PASSWORD` | Key password (defaults to `CONNECTIFY_STORE_PASSWORD` if omitted) |
| `CONNECTIFY_KEY_ALIAS` | Key alias (defaults to `connectify`) |
| `CONNECTIFY_SIGNING_JSON` | Optional JSON string alternative to individual password/alias secrets |

### 3. Version Bumps for Updates
Update both `version` (SemVer) and `versionCode` (strictly increasing integer) in `app-version.json` and `package.json`, then sign with the **same** keystore so existing installations upgrade in place without losing local save data.
