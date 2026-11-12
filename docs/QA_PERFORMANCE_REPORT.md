# Connectify Android — QA & Performance Verification Report

**Project**: `connectify-android` (`com.connectify.android`)  
**Verification Owner**: `@qa-verifier` (Game QA, Balance & Performance Engineer)  
**Target Reference**: [TESTING_STRATEGY.md](file:///root/.gemini/antigravity/scratch/connectify-android/TESTING_STRATEGY.md)  

---

## 1. Executive Release Gate Summary (`GATE-01..06`)

| Gate | Description | Command / Evidence | Result | Status |
| :--- | :--- | :--- | :--- | :--- |
| **`GATE-01`** | TypeScript Strict Compilation | `/usr/bin/node ./node_modules/.bin/tsc --noEmit --pretty false` | Exit code `0`, `0` errors across `src/` & `tests/` (`TSC_OK`) | **PASS** |
| **`GATE-02`** | Unit & Integration Test Suites | `/usr/bin/node ./node_modules/.bin/vitest run` | `9/9` test files passed, `45/45` tests passed (`Duration 88.42s`) | **PASS** |
| **`GATE-03`** | 1,000 Onet + 1,000 Match 3 Stress Solver | `ONET-GEN-01` & `M3-DEAD-01` inside `vitest run` | `1,000/1,000` Onet boards solvable (`74.7s` suite total); `1,000/1,000` Match 3 boards valid (`1.99s` suite total) | **PASS** |
| **`GATE-04`** | 30-Day Economy & Progression Simulations | `node scripts/simulate-economy.mjs && node scripts/simulate-progression.mjs` | Exit code `0`; `0` negative balances across `4,500` trials; Onet/Match 3 coin divergence `1.15%`, XP parity `1.014` | **PASS** |
| **`GATE-05`** | Production Bundle Build & Offline Asset Audit | `vite build` + `INT-01..04` (`appAndAssets.test.tsx`) | `2072` modules built in `55.54s` (`dist/` `5.4 MB`); `0` broken `/art/` or `/fonts/` refs; `0` CDN/`phaser`/`matter-js`/`supabase` | **PASS** |
| **`GATE-06`** | Capacitor Android Sync & Local APK Build | `cap sync android` (`#82`) & `scripts/build-android.mjs --debug --skip-sync` | `cap sync android` **PASS** (`4.259s`); local Gradle APK build **BLOCKED on host** (`ANDROID_HOME` / API 36 SDK / `aapt2` missing on host; CI ready) | **BLOCKED (Host SDK)** |

---

## 2. Automated Test Suite Results (`vitest run`)

Executed `/usr/bin/node ./node_modules/.bin/vitest run` in `/root/.gemini/antigravity/scratch/connectify-android` after final edits (`task-349`):

- **Test Files**: `9 passed (9)`
- **Tests**: `45 passed (45)`
- **Total Duration**: `88.42s` (`transform 18.88s`, `setup 9.95s`, `collect 31.71s`, `tests 77.75s`, `environment 74.40s`, `prepare 21.27s`)

| Test File | Suite Scope | Passed / Total | Observed Runtime | Key Verified Assertions |
| :--- | :--- | :---: | :---: | :--- |
| [pathfinding.test.ts](file:///root/.gemini/antigravity/scratch/connectify-android/tests/onet/pathfinding.test.ts) | `ONET-PATH-01..07` | `7 / 7` | `<1s` | 0/1/2-turn paths, outer perimeter wrap (`-1`/`cols`/`rows`), `>=3`-turn rejection, Bug B1 internal `2x2` bypass fix with `openSide`, static stone blockers, `2x2` deterministic splits (`-a`/`-b`), multi-cell gravity & snapshot roundtrip |
| [solvability.test.ts](file:///root/.gemini/antigravity/scratch/connectify-android/tests/onet/solvability.test.ts) | `ONET-GEN-01..04` | `4 / 4` | `74,718ms` | `1,000/1,000` solvable boards across L1..100 + Daily Sprint (`0` orphans, valid opening hints), `50` partial multi-cell `guaranteedShuffle` checks (`themeKey`/`splitAxis`/blockers preserved), seeded determinism, 4-band sawtooth/Boss/Breather/DDA |
| [swapAndMatch.test.ts](file:///root/.gemini/antigravity/scratch/connectify-android/tests/match3/swapAndMatch.test.ts) | `M3-SWAP-01..06` | `6 / 6` | `<1s` | Valid swap & non-mutating `validateSwap`, `INPUT_LOCKED`/`OUT_OF_BOUNDS`/`NOT_ADJACENT`/`BLOCKED_CELL`/`IMMOVABLE_TILE`/`NO_MATCH`, Match-4 `striped_h`/`striped_v`, L/T `bomb_3x3`, Match-5 `rainbow`, bottom-row gem carrier collection |
| [specialsAndCascade.test.ts](file:///root/.gemini/antigravity/scratch/connectify-android/tests/match3/specialsAndCascade.test.ts) | `M3-SPEC-01..05` | `5 / 5` | `<1s` | All 7 special+special & rainbow combos (incl. `bomb_bomb` inner 3x3 double-damage cracking `metal-2`), recursive BFS chain reactions, `1.0x..4.0x` cascade multiplier, `hammer`/`bomb` strikes, gravity/refill with holes & solid blockers, seeded determinism |
| [deadlockAndPcg.test.ts](file:///root/.gemini/antigravity/scratch/connectify-android/tests/match3/deadlockAndPcg.test.ts) | `M3-DEAD-01..03` | `3 / 3` | `1,990ms` | `1,000/1,000` boards L1..80 + Daily (`0` immediate matches, `>=2` valid swaps, full cell invariants), zero-move deadlock `shuffleMatch3Board` preserving holes/ice/wood/specials, L1..20 manual + L21+ PCG/DDA/stars/EMA |
| [economy.test.ts](file:///root/.gemini/antigravity/scratch/connectify-android/tests/economy/economy.test.ts) | `ECON-01..06` | `6 / 6` | `<1s` | Zero-negative-balance guard, idempotent `runId`/`opId` deduplication, authoritative catalog pricing & rollback, duplicate permanent purchase rejection, anti-farming replay decay (`[1.0, 0.5, 0.25, 0.0]`) & daily soft/hard caps, Onet vs Match 3 earning parity (`<=15%`) |
| [progression.test.ts](file:///root/.gemini/antigravity/scratch/connectify-android/tests/progression/progression.test.ts) | `PROG-01..04` | `4 / 4` | `<1s` | Monotonic XP curve L1..100 & rank boundaries, non-downgrading 1–3 stars & high scores, independent Onet & Match 3 trees, WIB (`UTC+7`) midnight mission rollover & login streak continuity |
| [persistence.test.ts](file:///root/.gemini/antigravity/scratch/connectify-android/tests/persistence/persistence.test.ts) | `PERS-01..05` | `6 / 6` | `<1s` | Round-trip save/load (`fnv1a64`), truncated Primary recovery via Backup, tampered checksum / negative coin rejection, interrupted WAL recovery, legacy `connectify-new` `localStorage` migration, active mid-game session `flushNow()` & cold boot resume |
| [appAndAssets.test.tsx](file:///root/.gemini/antigravity/scratch/connectify-android/tests/integration/appAndAssets.test.tsx) | `INT-01..04` | `4 / 4` | `528ms` | Strict `onet` + `match3` only registry scope, offline `<App />` JSDOM boot (`navigator.onLine = false`, `_loaderReady === true`, no crash), zero broken `/art/` or `/fonts/` paths in `dist/`, zero `phaser`/`matter-js`/`supabase` or CDN links in `dist/` |

### Defect Caught & Verified During QA
- **`theme_sweets` broken catalog preview icon**: `INT-03` caught `assetPath: '/art/sweets/0.webp'` in [economy.config.ts](file:///root/.gemini/antigravity/scratch/connectify-android/src/config/economy.config.ts#L197) (absent from `public/` & `dist/`). `@economy-designer` (`#84`) updated it to `/art/vanilla/tiles/beach_ball.webp` (matching `THEME_MAP.sweets.tileUrls[0]`), after which `vite build` and `INT-03` passed cleanly (`0` missing assets).

---

## 3. Economy & Progression Simulation Results (`GATE-04`)

Executed `/usr/bin/node scripts/simulate-economy.mjs && /usr/bin/node scripts/simulate-progression.mjs` (both exited `0`):

- **Economy Monte Carlo (`N=500` per archetype, `4,500` total 30-day runs)**:
  - **Negative Balance Incidents**: `0` across `4,500` runs (`0` expected).
  - **Onet-primary 30d Mean Earned**: `4,431.8` Coins (`7.393` total coins/min; `3.795` Onet gameplay coins/min).
  - **Match3-primary 30d Mean Earned**: `4,381.0` Coins (`7.288` total coins/min; `3.715` Match 3 gameplay coins/min).
  - **30-Day Total Income Divergence**: `1.15%` (target `< 3.00%`).
  - **Active Gameplay Rate Divergence**: `2.13%` (target `< 3.00%`).
  - **Anti-Farming & Replay Exploit Stress**:
    - Level-1 replay bot (`100` clears/day): `11` Coins total (`8 + 2 + 1 + 0*97`).
    - Duplicate `runId` claim: 1st `COMMITTED (+8)`, 2nd `REJECTED_DUPLICATE_TX (+0)`.
    - Underflow spend guard at `0` Coins: `REJECTED_INSUFFICIENT_FUNDS`.
- **Progression & Difficulty Simulation**:
  - **Hourly Gameplay XP Parity**: Onet `5,994 XP/hr` (`99.9 XP/min`, `46.2` rounds/hr @ `78s`) vs Match 3 `5,912 XP/hr` (`98.5 XP/min`, `37.9` rounds/hr @ `95s`) -> Parity Ratio `1.014` (target `0.95 - 1.05`).
  - **30-Day Archetypes**: Casual `Lv 24` (`Onet Lv42 / M3 Lv30`), Average `Lv 40` (`Onet Lv92 / M3 Lv96`), Onet Purist `Lv 37` (`Onet Lv161 / M3 Lv1`), Match 3 Purist `Lv 37` (`Onet Lv1 / M3 Lv152`), Skilled `Lv 51`, Hardcore `Lv 65`.

---

## 4. Production Build, Bundle Size & Performance Audit (`GATE-05`)

Executed `/usr/bin/node ./node_modules/.bin/tsc --noEmit --pretty false && /usr/bin/node ./node_modules/.bin/vite build`:

- **Modules Transformed**: `2,072` (`✓ built in 55.54s`)
- **Total `dist/` Footprint**: `5.4 MB` (`du -sh dist/`, including offline art & fonts)
- **Chunk Breakdown**:
  - `dist/index.html`: `6.91 kB` (`gzip: 2.08 kB`)
  - `dist/assets/index-DrA19WX1.css`: `72.00 kB` (`gzip: 13.28 kB`)
  - `dist/assets/index-B_plcWei.js`: `385.79 kB` (`gzip: 102.27 kB`)
  - `dist/assets/vendor-react-BPd6_Jak.js`: `134.66 kB` (`gzip: 43.24 kB`)
  - `dist/assets/vendor-motion-BYaXmXrz.js`: `134.78 kB` (`gzip: 44.50 kB`)
  - `dist/assets/vendor-capacitor-B2tpebSi.js`: `10.45 kB` (`gzip: 4.31 kB`)
  - `dist/assets/web-*.js` (3 Capacitor web shims): `0.13 kB`, `0.85 kB`, `0.91 kB`
- **Offline Font Bundle (`dist/fonts/`, `103 KB` total)**: `fredoka-latin-wght.woff2` (`29,732 B`), `jetbrains-mono-latin.woff2` (`31,340 B`), `outfit-latin-wght.woff2` (`32,292 B`).
- **60 FPS & Runtime Readiness Notes (Observed in Code & Build)**:
  - GPU-composited transforms/opacity animations and lazy chunk separation keep main app JS at `102.27 kB` gzipped; `App.tsx` handles `CapacitorBridge.onPause` (`flushNow()` + `pauseAudio()`) and `onResume`, and both `OnetScreen.tsx` (`#60`) and `Match3Screen.tsx` (`#74`) register `CapacitorBridge.pushBackHandler`.
  - **Runtime-only items (not executable on headless Linux without Android device/emulator)**: Real device WebView 60 FPS DevTools trace, physical Android hardware back-button tap, and live Capacitor `App.appStateChange` pause/resume cycle remain for physical/emulator APK smoke testing once built via CI.

---

## 5. Android Sync & Build Status (`GATE-06`)

Per `@android-eng` (`#82`):
- **Capacitor Sync (`npx cap sync android` via Termux Node v24)**: **PASS** (`Sync finished in 4.259s`), registering `@capacitor/app@8.1.2`, `@capacitor/haptics@8.0.2`, `@capacitor/splash-screen@8.0.2`, `@capacitor/status-bar@8.0.4`. *(Note: after `@economy-designer`'s `economy.config.ts` fix in `#84` and `@qa-verifier`'s fresh `vite build` in `task-337`, run `npm run cap:sync` or CI workflow before final APK packaging so `android/app/src/main/assets/public/` picks up `index-B_plcWei.js`.)*
- **Local Gradle Debug APK Attempt (`node scripts/build-android.mjs --debug --skip-sync`)**:
  - **Blocker**: `Error: Android SDK not found. Set ANDROID_HOME / ANDROID_SDK_ROOT or android/local.properties (sdk.dir=...).` Host lacks Android SDK (`platforms;android-36`, `build-tools;36.0.0`, `cmdline-tools`), Gradle cache, and Termux `aapt2` (`16.0.0.4-4`).
  - **CI Pipeline**: `.github/workflows/android-build.yml` (`@devops-eng` `#67`) provisions Java + Android SDK and executes `typecheck`, `test`, `test:sim`, `cap:sync`, `build-android.mjs`, and `apksigner verify`.
