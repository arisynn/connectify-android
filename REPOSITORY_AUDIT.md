# Connectify Repository Audit (`connectify-new` -> `connectify-android`)

**Document Owner:** Agent 01 — Executive Game Producer & Lead Architect (`@architect`)  
**Source Repository (Read-Only):** `/root/.gemini/antigravity/scratch/connectify-new`  
**Target Repository:** `/root/.gemini/antigravity/scratch/connectify-android`  
**Audit Date:** 2026-11-12

---

## 1. Executive Summary

`connectify-new` is a multi-game web portal ("Connectify Play Club") built with **React 18.2, TypeScript 5.2, Vite 5.2, Tailwind CSS v4, Motion 12, and Lucide React**, backed by an **Express (`server.ts`) API and Supabase PostgreSQL/Auth** backend (`api/cde.ts`, `src/core/cde/CDE.ts`).

While `connectify-new` contains rich, production-grade visual assets (`124+` transparent WebP sprites in `public/art/premium/`, legacy WebP sets in `public/art/`, and vanilla PNGs in `src/assets/vanilla/`), a procedural Web Audio synthesizer (`ClubSynth.ts`), a sophisticated Onet board engine (`src/core/board.js`), and shared economy/progression/cosmetic catalogs, **it cannot run as a standalone offline Android APK in its current state** for four reasons:

1. **Hard Cloud & Auth Lock-In:** `src/lib/supabase.ts` throws an uncaught error at module evaluation time if `VITE_SUPABASE_URL` or `VITE_SUPABASE_ANON_KEY` are absent. `BootScreen.tsx` and `CDE.ts` require an active Supabase Auth session and live HTTP round-trips to `/api/cde` to load or mutate player state.
2. **Scope Bloat (5 Mini-Games + Multiplayer):** The repository bundles five games (`onet`, `block`, `memory`, `triple`, `star` / Infinity) plus real-time multiplayer (`MultiplayerScreen.tsx`, `MultiplayerGameplay.tsx`), pulling in heavy dependencies (`phaser@3.90.0` and `matter-js@0.20.0`) that are unnecessary for a focused **Onet + Match 3** mobile puzzle app.
3. **Incomplete Match 3 Implementation:** While `connectify-new` has a tile-matching game (`TripleGame.tsx`, a 31-line 7-slot stack picker) and remnants of a planned fruit swap/pop mode (`fruitSwaps`, `fruitPops` in `api/cde.ts:436`) alongside a data-driven level/cascade architecture in `block-puzzle/`, it lacks a full grid-based swap-and-cascade **Match 3** engine.
4. **Broken Level-Win Currency Loop:** In `src/core/economy.js:17`, `calcWinPermen()` is hardcoded to `() => 0`, meaning completing levels in `connectify-new` awards `0` currency (`Permen`), forcing players to rely solely on capped daily login/mission claims (`DAILY_INCOME_CAP = 100`, max `10` per grant).

This audit catalogs every file, game engine, shared system, backend dependency, and asset in `connectify-new`, and defines the exact disposition (**Direct Reuse**, **Adapt & Upgrade**, or **Exclude**) for `connectify-android`.

---

## 2. Source Repository Architecture & File Inventory

### 2.1 Build, Server & Configuration Files

| File Path | Purpose in `connectify-new` | Disposition for `connectify-android` |
| :--- | :--- | :--- |
| `package.json` | Vite + React 18 + Tailwind v4 + Motion 12 + Lucide + Express + Supabase + Phaser + Matter-js. | **Adapt:** Retain React 18, TypeScript, Vite, Tailwind v4, Motion 12, Lucide; add `@capacitor/core`, `@capacitor/cli`, `@capacitor/android`, `@capacitor/app`, `@capacitor/haptics`, `@capacitor/status-bar`, `@capacitor/splash-screen`; remove `express`, `phaser`, `matter-js`, `jsonwebtoken`, `@supabase/supabase-js`. |
| `vite.config.ts` | Vite config with `@vitejs/plugin-react`, `@tailwindcss/vite`, and `VITE_SUPABASE_*` env defines. | **Adapt:** Configure relative base (`base: './'`), clean chunking for offline WebView bundling, and path aliases (`@/`). |
| `tsconfig.json` | Bundler module resolution, `ES2022`, `react-jsx`. | **Reuse & Tighten:** Keep `ES2022` + `react-jsx`, include `src` only (exclude `server.ts` and `api/`). |
| `index.html` | HTML shell with `#static-loader` CSS progress overlay and Google Fonts (`Fredoka`, `Outfit`). | **Adapt:** Keep `#static-loader` instant boot UX; bundle font fallbacks/local styles so offline boot never blocks on external Google Fonts CDN; enforce mobile viewport lock (`user-scalable=no, viewport-fit=cover`). |
| `server.ts`, `api/*`, `supabase/*`, `backend/*` | Express server, Supabase RPC handlers (`cde_mutate_state`), multiplayer room API, Python API tests. | **Exclude:** Replaced completely by the offline-first local persistence engine (`src/services/persistence/`). |

### 2.2 Frontend Application Shell & Navigation (`src/`)

| File Path | Lines | Current Implementation Details | Disposition |
| :--- | :---: | :--- | :--- |
| `src/main.tsx` | 10 | Mounts `<App />` into `#root`. | **Reuse** |
| `src/App.tsx` | 69 | Wraps app in `ProfileProvider -> CDEProvider -> ThemeProvider -> AudioProvider -> GameProvider`. Controls BGM scene switching and safe-area padding. | **Adapt:** Replace `CDEProvider` with offline `PersistenceProvider`; remove `login` screen gate; wire Capacitor hardware back-button and app lifecycle listeners. |
| `src/GameContext.tsx` | 52 | Manages `screen` state (`22` screen union types), `activeGame` (`'onet'|'block'|'memory'|'triple'|'star'`), and `gameMode` (`'normal'|'daily'|'infinity'`). | **Adapt:** Restrict `GameId` to `'onet' | 'match3'`; add structured navigation history stack for Android hardware back-button support and level selection state. |
| `src/MainLobby.tsx` | 36 | Poki-style hub displaying 5 game cards, Multiplayer card, Permen wallet pill, `AccountProgress` XP bar, `LoginRewardCard`, and Hub Achievements CTA. | **Adapt:** Redesign as the unified Connectify Home Screen featuring **Onet** and **Match 3** hero cards, "Continue Playing" quick-resume CTA, Daily Challenges, Player Level/XP bar, and Connect Coins (`Permen`) wallet pill. |
| `src/DestinationScreen.tsx` | 22 | Switch router mapping `screen` state to screen components. | **Adapt:** Route only to Onet, Match 3, Level Select, Theme Shop, Collection, Achievements/Profile, Statistics, and Settings screens. |
| `src/screens/GameHubScreen.tsx` | 44 | Per-game sub-site with 5 bottom tabs (`Main`, `Misi`, `Pencapaian`, `Toko`, `Statistik`), mode buttons, and exit confirmation modal. | **Adapt:** Integrate with the new Level Select map/grid (showing 1–3 star mastery per level, locked/unlocked states, and equipped theme preview). |

---

## 3. Game Modes Audit: Keep vs. Upgrade vs. Exclude

### 3.1 Onet (`onet`) — KEEP, FIX EDGE CASES & ENHANCE

Onet is the flagship game mode of `connectify-new` and is implemented across the following files:
- **`src/core/config.js` (lines 1–4):** Defines `ROWS = 10`, `COLS = 6` (60 inner cells inside a 12×8 padded array where row `0`, row `11`, col `0`, and col `7` are empty `0` border cells allowing exterior connections).
- **`src/core/difficulty.js` (lines 1–8):** `getOnetDifficulty(level)` maps level `1..N` into 5 tiers (`Santai`, `Fokus`, `Menantang`, `Ahli`, `Master`), computing:
  - `groups`: `0` (lvl 1), `1` (lvl 2–5), `2` (lvl 6+) multi-cell splitting tile pairs (`2×2` or `1×2`/`2×1`).
  - `time`: `Math.max(75, 150 - (level - 1) * 2)` seconds.
  - `separation`: `Math.min(8, 2 + Math.floor(level / 3))` minimum Manhattan distance favored during constructive board generation.
  - `arrowPairs`: `level < 8 ? 0 : Math.min(6, 1 + Math.floor((level - 8) / 4))` directional open-side constraints.
- **`src/core/board.js` (lines 1–182):**
  - **Multi-Cell Splitting Footprints (`groupSize`, `getTileCells`, `clearMatchedGroups`):** Supports `2×2` tiles (`area === 4`, splitting into two `1×2` or `2×1` tiles) and `1×2`/`2×1` dominoes (`area === 2`, splitting into two `1×1` tiles). Children deterministically derive their tile IDs from `tileIdsFor(theme)` without `Math.random()`, keeping replays and daily seeds deterministic.
  - **Pathfinding (`getPath`, lines 16–43):** Breadth-First Search (BFS) over the `(ROWS+2) × (COLS+2)` matrix. Enforces `turns <= 2` (maximum 3 straight segments) and respects `openSide` directional entry/exit constraints (`up`, `down`, `left`, `right`).
  - **Constructive Solvable Generation (`generateBoard`, `constructPairs`, `addDirectionTiles`, lines 96–155):** Places multi-cell groups on exposed edges first, then peels legal pairs from a probe board (`constructPairs`) favoring Manhattan distance `>= separation`, verifies full board solvability up to 150 steps (`isBoardSolvable`), and attaches `openSide` arrows strictly along a simulated legal solution path so arrows never create an unsolvable board.
  - **Deadlock Recovery (`guaranteedShuffle`, lines 157–177):** Strips `openSide` constraints, shuffles `1×1` tiles up to 5 times checking `isBoardSolvable`, falls back to `constructPairs`, and includes an emergency recovery pass.
- **`src/game/hooks/useOnetGame.ts` (lines 1–104):**
  - Manages board state, selection, 4-second combo chain (`Date.now() - lastMatch.current < 4000`), score (`100` base, `150` for `1×2` split, `200` for `2×2` split, `+(chain-1)*10` combo bonus), 1-second countdown timer, automatic free shuffle when `!findHint(board)`, paid Hint (`useHint`) and Shuffle (`useShuffle`), and `visibilitychange` auto-pause.
- **`src/game/components/OnetBoard.tsx` (lines 1–75) & `backup_onet_animation/`:**
  - Responsive `ResizeObserver` grid calculator, CSS Grid span rendering for `1×1`, `1×2`, `2×1`, and `2×2` tiles, SVG path overlay (`onet-path-layer`), `TileBurst` particle burst (`src/game/components/TileBurst.tsx`), and split-tile clip-path animations.

#### Architectural Improvements Required for Onet in `connectify-android`:
1. **Per-Level 1–3 Star Mastery & Level Select Support:** Currently `useOnetGame.ts` only plays `profile.currentLevel` and increments `highestLevel` on win. We will add level selection (`level 1..N`), 1–3 star calculation based on remaining time percentage / score / flawless completion, and persistent per-level star & high-score records.
2. **Configurable Grid Dimensions by Difficulty Tier:** Currently `ROWS=10, COLS=6` is hardcoded in `src/core/config.js` and imported directly by `board.js` and `OnetBoard.tsx`. We will make board dimensions configurable per level tier (e.g., onboarding `6×4` / `8×5`, standard `10×6`, expert `10×8` / `12×8`) via the centralized config system.
3. **Preserve Multi-Cell Footprints During Shuffle:** In `board.js:160`, `guaranteedShuffle` only shuffles `1×1` tiles and its emergency fallback (lines 170–176) overwrites multi-cell master/slave footprints with `1×1` tiles. `@onet-eng` will refine `guaranteedShuffle` so `2×2` and `1×2` pairs are preserved cleanly unless no legal configuration exists.
4. **Mobile Portrait HUD Ergonomics:** Replace the desktop `<aside className="onet-play-tools">` side panel in `GameplayScreen.tsx` with a compact top HUD bar (Level, Score, Combo, Timer, Pause) and thumb-friendly bottom booster dock (Hint, Shuffle, Theme indicator).

---

### 3.2 Match 3 (`match3`) — UPGRADE FROM `TripleGame.tsx` + `block-puzzle` PATTERNS

In `connectify-new`, the second tile-matching puzzle (`src/game/minigames/TripleGame.tsx`) is a minimal 31-line tray/stack minigame (`12` stacks of `3` tiles, `7`-slot tray), while `src/game/block-puzzle/` contains a full data-driven level architecture (`SPEC.md`, `levels.json`, 3 missions/stars per level, gravity/cascade loop, `usePowerups.ts` for Hammer/Bomb/Shuffle) and `api/cde.ts:436` contains legacy fields `fruitSwaps` and `fruitPops`.

For `connectify-android`, **Match 3 (`src/games/match3/`)** is elevated to a full, first-class **Grid Swap & Cascade Match 3 Engine** that co-stars alongside Onet:
- **Reused Assets & Cosmetics:** Directly reuses all 14+ Connectify tile sprite sets (`sweets`, `meadow`, `ocean`, `forest`, `candy`, `space`, `sakura`, `bakery`, `galaxy`, `fruit`, `autumn_harvest`, `magic_atelier`, `retro_arcade`, `alpine_winter`), board surface skins (`COSMETICS` `block_*` / `tile1_*`), and victory burst effects (`TileBurst.tsx`, `VictoryBurst.tsx`).
- **Core Mechanics (`@match3-eng`):**
  - Configurable grid sizes (`7×7`, `8×8`, `9×9`) with custom cell masks/blockers (Ice, Wood/Crate, Stone, Gem targets adapted from `SPEC.md`).
  - Touch drag/swipe and tap-to-swap input between orthogonal adjacent tiles, with invalid-swap spring bounce-back when a swap creates no match.
  - Match-3, Match-4 (creates **Line Clear Bomb** — horizontal/vertical), Match-5 (creates **Color/Rainbow Bomb**), and L/T-shape match detection (creates **3×3 Area Bomb**), plus special-to-special swap combinations.
  - Deterministic gravity drop, top-spawning refill, multi-step cascade chain evaluation with escalating combo multipliers and pitch-shifted audio SFX.
  - Initial board generation guaranteed to have **zero pre-existing matches** and **at least one valid move**, plus runtime deadlock detection (`findValidSwaps(board)`) triggering an automatic free board shuffle when no moves remain.
  - Move-limited and score/collection/blocker-clearing level objectives with 1–3 star mastery ratings and 4 boosters (`Hint`, `Shuffle`, `Hammer` single-tile smash, `Bomb` 3×3 blast).

---

### 3.3 Excluded Game Modes & Code Paths

To keep `connectify-android` lean, fast, and 100% focused on **Onet** and **Match 3**, the following modes and directories from `connectify-new` are **excluded from the Android application**:

| Excluded Mode / System | Source Paths in `connectify-new` | Reason for Exclusion |
| :--- | :--- | :--- |
| **Block Puzzle & Block Infinity** | `src/game/block-puzzle/**`, `SPEC.md`, `test_pcg.ts` | Outside the Onet + Match 3 product scope (though its 3-star mission & obstacle concepts inform Match 3). |
| **Memory Flip** | `src/game/minigames/MemoryGame.tsx` | Outside the Onet + Match 3 product scope. |
| **Triple Match (Stack Tray)** | `src/game/minigames/TripleGame.tsx`, `src/game/minigames/useMiniRound.ts` | Superseded by the full grid-based Match 3 game mode. |
| **Star Patrol / Infinity (Space Shooter)** | `src/game/star-patrol/**`, `src/core/starPatrol.js`, `public/art/star-patrol/**`, `public/art/infinity/**`, `design_guidelines.json` | Arcade shooter requiring `phaser@3.90.0`; outside puzzle scope. Removing Phaser saves ~1.2 MB bundled JS. |
| **Real-Time Multiplayer** | `src/screens/MultiplayerScreen.tsx`, `src/game/MultiplayerGameplay.tsx`, `src/core/hooks/useMultiplayer.ts`, `MultiplayerBankEngine.ts`, `api/multiplayer.ts` | Requires live server rooms (`mp_rooms`); deferred in `PRD.md` and out of scope for offline-first Android release. |

---

## 4. Shared Systems & Backend Dependency Audit

### 4.1 Virtual Economy & Currency (`src/core/economy.js`, `src/core/reward.js`)
- **Current Implementation:** Uses a single currency named **Permen** (stored in `cde_profiles.permen` and mapped to `profile.coins` in `ProfileContext.tsx:48`).
  - Consumable prices (`ITEM_PRICES`): `hint: 8`, `shuffle: 12`, `hammer: 14`, `bomb: 18`.
  - Theme prices (`THEME_PRICES`): `meadow: 0`, `sweets: 0`, `ocean: 60`, `forest: 80`, `candy: 80`, `space: 100`, `fruit: 100`, `bakery: 110`, `sakura: 120`, `autumn_harvest: 120`, `alpine_winter: 130`, `retro_arcade: 140`, `galaxy: 150`, `magic_atelier: 150`.
  - Cosmetic prices (`ATELIER_PRICES` & `SKIN_PACKS`): Avatars `60–90`, Frames `50–80`, Tile Skin Packs `105–150`, Victory Effects `60–75`.
- **Critical Flaws Found in `connectify-new`:**
  1. `calcWinPermen = () => 0` (`economy.js:17`): Players earn **0 Permen** from winning Onet or puzzle levels!
  2. `DAILY_INCOME_CAP = 100` and `canReceive` (`amount <= 10`) block any reward larger than 10 Permen, which forced `achievements.js:188` to overwrite its own 200–5,000 Permen tier definitions down to `5–10` Permen.
- **Adaptation for `connectify-android`:**
  - Retain the beloved **Permen / Connect Coins** currency identity and `/art/premium/ui/permen.webp` icon.
  - Award currency directly on every Onet and Match 3 level completion (scaled by difficulty tier, star rating, combo/flawless bonus, with anti-farming diminishing returns on replaying already-completed levels), plus daily login streak, daily missions, and achievement tiers.

### 4.2 Player Progression, Missions & Achievements (`progression.js`, `misiHarian.js`, `achievements.js`)
- **Account XP & Ranks (`src/core/progression.js`):** Quadratic XP threshold `xpForLevel(L) = 100*(L-1) + 25*(L-1)*(L-2)` with inverse level solver `Math.floor((-75 + Math.sqrt(5625 + 100 * xp)) / 50) + 1` and 6 rank titles. **Directly reusable.**
- **Daily & Weekly Missions (`src/core/misiHarian.js`, `src/core/misiMingguan.js`):** Deterministic date-seeded mission generator (`seededRng(getTodayKey())`), automatic completion notifications, and archive-on-rollover (`pendingMissions`). **Adapt** by replacing `block`, `memory`, `triple`, `star` mission pools with new **Match 3** missions (`match3_clear`, `match3_score`, `match3_combos`, `match3_special_tiles`, `match3_blockers`) alongside existing **Onet** missions.
- **Achievements (`src/core/achievements.js`):** Multi-tier progression/mastery/collection achievements. **Adapt** by scoping strictly to `hub` (Global), `onet`, and `match3`, and restoring meaningful currency rewards per tier.

### 4.3 Theme & Cosmetic System (`src/core/theme/*`, `src/core/cosmetics.js`, `src/core/artRewards.js`)
- `ThemeProvider.tsx` applies CSS custom properties (`--color-bg-main`, `--color-primary-coral-pink`, etc.) to `document.documentElement` and persists the active theme in `localStorage.getItem('connectify_active_theme')`.
- `registry.ts` and `tileCatalog.js` define 19 theme entries (2 free: `sweets`, `meadow`; 4 classic: `ocean`, `forest`, `candy`, `space`; 4 atelier: `sakura`, `bakery`, `galaxy`, `fruit`; 4 seasonal: `autumn_harvest`, `magic_atelier`, `retro_arcade`, `alpine_winter`; 5 milestone reward editions: `reward_sakura`, `reward_bakery`, `reward_galaxy`, `reward_meadow`, `reward_fruit`).
- **Adaptation for `connectify-android`:** Extend `ThemeManifest` so every theme provides a unified visual package for **both Onet and Match 3** (tile sprites, board surface background, screen palette, match line/particle color, and rarity tier).

### 4.4 Audio & Haptics System (`src/core/audio/AudioEngine.tsx`, `src/core/audio/ClubSynth.ts`)
- `ClubSynth.ts` is a self-contained 52-line Web Audio API synthesizer with a `DynamicsCompressorNode`, separate `music` and `sfx` gain buses, procedural 16-step chord/melody sequencer (`menu` at 84 BPM, `game` at 102 BPM), and 11 synthesized sound effects.
- **Adaptation for `connectify-android`:** Reuse `ClubSynth.ts` and `AudioEngine.tsx`, add Match 3 cascade pitch-scaling (`playCascadeMatch(step)`), hook into Capacitor `App.addListener('appStateChange')` so audio mutes immediately when the Android app backgrounds, and add a `HapticsEngine` wrapper around `@capacitor/haptics` (`navigator.vibrate` fallback).

### 4.5 Cloud Data Engine (`CDE`) & Supabase Removal (`src/core/cde/*`, `src/lib/supabase.ts`)
- **Current Dependencies:**
  - `src/lib/supabase.ts` requires `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` or throws immediately.
  - `src/core/cde/auth/CDEAuth.ts` and `src/screens/LoginScreen.tsx` force account sign-in/provisioning against `/api/cde?action=provision`.
  - `src/core/cde/CDE.ts` blocks mutations (`if (!this.state.account || !this.state.profile) throw new Error(...)`) when no cloud session exists.
  - `src/core/cde/persistence/CDEIndexedDB.ts` already implements a clean IndexedDB wrapper (`connectify_cde_db`), but `CDE.ts` only uses it as a cache for authenticated cloud accounts.
- **Adaptation for `connectify-android`:**
  - Replace `supabase.ts`, `CDEAuth.ts`, and network-dependent `CDE.ts` with an **Offline-First Local Persistence Engine** (`src/services/persistence/LocalPersistenceEngine.ts`).
  - Auto-provision a local player profile on first launch with zero login friction.
  - Maintain synchronous in-memory state backed by dual-slot atomic `localStorage` (`connectify_save_v1_primary`, `connectify_save_v1_backup`) + `IndexedDB` mirror (`CDEIndexedDB`), with SHA/CRC integrity checksums and idempotent transaction IDs (`processedRuns`, `ledger`).

---

## 5. Complete Asset Audit Summary

A full per-file inventory is maintained by `@art-director` in `ASSET_INVENTORY.md`. Architecturally, the asset footprint breaks down as follows:

1. **`public/art/premium/` (124 WebP files + 2 PNG icons, ~1.49 MB total):**
   - **Brand:** `brand/mark.webp`, `brand/favicon.png`, `brand/touch-icon.png` -> **Reuse** for app branding and Android adaptive launcher icons.
   - **Tile Themes (9 folders × 16 WebPs = 144 sprites):** `meadow/`, `sakura/`, `bakery/`, `galaxy/`, `fruit/`, `autumn_harvest/`, `magic_atelier/`, `retro_arcade/`, `alpine_winter/` -> **Reuse** for both Onet and Match 3 tiles.
   - **Surfaces (9 WebPs):** `surfaces/{amber,candy,cream,enchanted,frost,jelly,mint,night,opal,pixel,sunset,wood,cloud}.webp` -> **Reuse** for Onet & Match 3 tile/board backs.
   - **Avatars (13 WebPs) & Frames (7 WebPs):** `avatars/*`, `frames/*` -> **Reuse** for Player Profile & Achievements.
   - **Effects (7 WebPs):** `effects/{autumn,blossom,confetti,magic,pixel,snow,stars}.webp` -> **Reuse** for Onet & Match 3 match/victory particles.
   - **UI Icons (16 WebPs):** `ui/{achievements,block,bomb,collection,hammer,hint,leaderboard,memory,missions,multiplayer,notifications,onet,permen,shuffle,theme,triple}.webp` -> **Reuse** core icons (`onet`, `triple` for Match 3, `permen`, `hint`, `shuffle`, `hammer`, `bomb`, `theme`, `achievements`, `missions`, `collection`, `notifications`).
2. **`public/art/` Legacy Sets (~2.1 MB):**
   - `candy/`, `ocean/`, `forest/`, `space/` (16 WebPs each) + `sakura/`, `bakery/`, `galaxy/`, `meadow/`, `fruit/` (10 reward WebPs each) + `avatars/`, `skins/` -> **Reuse** for Classic & Reward Themes.
   - `star-patrol/` (27 PNGs) & `infinity/` (16 PNGs) -> **Archive / Exclude from Android APK build** (belong to excluded space shooter mode).
3. **`src/assets/vanilla/` (~420 KB):**
   - `tiles/` (15 summer beach PNGs), `logo/` (21 UI PNGs), `background/` (2 WebPs) -> **Reuse** (`Summer Club` default free theme and fallback UI icons).

**Total Production Asset Payload for `connectify-android`:** ~3.6 MB of compressed WebP/PNG assets—small enough to bundle 100% locally inside the Android APK (`assets/public/`) for instant zero-latency offline loading.
