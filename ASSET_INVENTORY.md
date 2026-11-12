# Connectify Android — Complete Visual & Audio Asset Inventory (`ASSET_INVENTORY.md`)

**Author:** Agent 07 — Game Art Director & Senior Visual Designer  
**Source Repository Audited:** `/root/.gemini/antigravity/scratch/connectify-new` (READ-ONLY)  
**Target Android Project:** `/root/.gemini/antigravity/scratch/connectify-android`  
**Audit Date:** 2026-11-12

---

## 1. Executive Summary

A full byte-level and code-reference scan of `/root/.gemini/antigravity/scratch/connectify-new` identified **545 discrete image/vector asset files** totaling **25.62 MB (26,235.9 KB / 26,865,544 Bytes)** across `public/`, `src/assets/`, and `scripts/art-originals/`, plus **5 non-file visual/audio systems** (procedural Web Audio synthesis, Google Fonts webfont imports, Lucide React vector iconography, inline base64 splash fallback in `index.html`, and procedural SVG connection/burst animations).

### 1.1 High-Level Asset Breakdown by Domain Classification

| Classification Domain | File Count | Total Size (KB) | Formats | Primary Role in Connectify Android |
| :--- | ---: | ---: | :--- | :--- |
| **Shared Theme Tile Sets (Onet + Match 3)** | 273 | 3,672.6 KB | WEBP, PNG | 19 complete tile themes (13 × 16-tile sets, 1 × 15-tile vanilla set, 5 × 10-tile legacy reward sets) shared across Onet & Match 3 |
| **Onet & Match 3 Board Surfaces / Tile Skins** | 22 | 288.5 KB | WEBP | 13 premium porcelain/material tile & board surfaces (`256×256` RGBA) + 9 legacy reward tile/arrow skins (`512×512`) |
| **Shared UI, Brand, Avatars, Frames & Effects** | 75 | 1,253.8 KB | WEBP, PNG | Brand marks, currency (`permen`), booster/mode icons (`onet`, `triple`, `hint`, `shuffle`, `hammer`, `bomb`), 25 avatars, 7 avatar frames, 7 particle effects, 2 backgrounds, fallback PNGs |
| **Unused / Legacy Game Modes (Exclude from APK)** | 139 | 3,475.4 KB | WEBP, PNG, SVG | Star Patrol / Infinity (80 files), Fruit Merge tiles & baskets (22 files), Memory Flip cards (6 files), legacy chests (9 files), unused SVGs (9 files), atlas `sheet.webp` (5 files), unused mode icons (4 files), legacy unreferenced brand (4 files) |
| **Offline Source Atlases (`scripts/art-originals`)** | 36 | 17,545.5 KB | JPG, PNG | Master AI generation sheets (`1024×1024`, `1264×848`, `1408×768`) & review contact sheets — preserve in library, exclude from APK |
| **TOTAL REPOSITORY FILES** | **545** | **26,235.9 KB** | **WEBP, PNG, JPG, SVG** | **370 files (5,214.9 KB) active/reusable for Onet + Match 3 + Shared UI; 175 files (21,020.9 KB) archived to reusable library** |

> **Optimization Note:** Within the 370 active/reusable files, the 5 legacy reward themes (`public/art/{sakura,bakery,galaxy,meadow,fruit}`, 50 files at `512×512` = 1,700.9 KB) and 12 overridden vanilla PNG logos (~269 KB) have `256×256` WebP counterparts in `public/art/premium/`. Packaging the active production set for Onet + Match 3 + Shared UI requires **~3.16 MB** (before optional `512→256` normalization of legacy reward skins).

---

## 2. Directory-by-Directory Summary Table

| Directory Path | Files | Total Size | Format(s) | Dimensions | Color Mode | Domain Assignment |
| :--- | ---: | ---: | :--- | :--- | :--- | :--- |
| `public/` (`logo.png`) | 1 | 30.1 KB | PNG | `256×256` | Palette (P) | Legacy / Redundant (Duplicate of `connectify_logo.png`) |
| `public/brand/` | 3 | 193.9 KB | WEBP | `512×512`, `848×1264` | RGB, RGBA | Legacy / Unreferenced Brand |
| `public/art/atelier/` | 9 | 5.9 KB | SVG | `100×100` to `200×220` | Vector SVG | Unused Legacy Vector Prototypes |
| `public/art/avatars/` | 13 | 171.5 KB | WEBP | `220×220`, `512×512` | RGB, RGBA | Shared UI (Profile Avatars & Reward Avatars) |
| `public/art/bakery/` | 10 | 355.8 KB | WEBP | `512×512` | RGBA | Onet + Match 3 (Reward Theme `reward_bakery`) |
| `public/art/candy/` | 17 | 74.5 KB | WEBP | `220×220` (16), `512×512` (1) | RGB | Onet + Match 3 (Classic Theme `candy` + 1 unused `sheet.webp`) |
| `public/art/chests/` | 3 | 161.6 KB | WEBP | `512×512` | RGBA | Unused / Removed Feature (Legacy Chests) |
| `public/art/forest/` | 17 | 91.1 KB | WEBP | `220×220` (16), `512×512` (1) | RGB | Onet + Match 3 (Classic Theme `forest` + 1 unused `sheet.webp`) |
| `public/art/fruit/` | 10 | 299.0 KB | WEBP | `512×512` | RGBA | Onet + Match 3 (Reward Theme `reward_fruit`) |
| `public/art/galaxy/` | 10 | 329.2 KB | WEBP | `512×512` | RGBA | Onet + Match 3 (Reward Theme `reward_galaxy`) |
| `public/art/infinity/` | 51 | 2,398.6 KB | WEBP, PNG | `128×128`, `336×336`, `720×1020` | RGB, RGBA | Unused Mode (`star` / Infinity Space Shooter) |
| `public/art/meadow/` | 10 | 357.2 KB | WEBP | `512×512` | RGBA | Onet + Match 3 (Reward Theme `reward_meadow`) |
| `public/art/ocean/` | 17 | 104.6 KB | WEBP | `220×220` (16), `512×512` (1) | RGB | Onet + Match 3 (Classic Theme `ocean` + 1 unused `sheet.webp`) |
| `public/art/sakura/` | 10 | 359.7 KB | WEBP | `512×512` | RGBA | Onet + Match 3 (Reward Theme `reward_sakura`) |
| `public/art/skins/` | 9 | 193.5 KB | WEBP | `512×512` | RGB, RGBA | Onet + Match 3 (Legacy Reward Tile & Arrow Skins) |
| `public/art/space/` | 17 | 80.7 KB | WEBP | `220×220` (16), `512×512` (1) | RGB | Onet + Match 3 (Classic Theme `space` + 1 unused `sheet.webp`) |
| `public/art/star-patrol/` | 29 | 47.9 KB | PNG | `9×54` to `256×256` | RGB, RGBA | Unused Mode (Legacy Star Patrol Sprites) |
| `public/art/premium/alpine_winter/` | 16 | 168.2 KB | WEBP | `256×256` | RGBA | Onet + Match 3 (Seasonal Theme `alpine_winter`) |
| `public/art/premium/autumn_harvest/` | 16 | 139.0 KB | WEBP | `256×256` | RGBA | Onet + Match 3 (Seasonal Theme `autumn_harvest`) |
| `public/art/premium/avatars/` | 13 | 224.1 KB | WEBP | `256×256` | RGBA | Shared UI (Premium & Seasonal Profile Avatars) |
| `public/art/premium/bakery/` | 16 | 163.7 KB | WEBP | `256×256` | RGBA | Onet + Match 3 (Atelier Theme `bakery`) |
| `public/art/premium/baskets/` | 6 | 63.0 KB | WEBP | `~266×332` | RGBA | Unused Mode (Fruit Merge Basket Skins) |
| `public/art/premium/brand/` | 3 | 84.5 KB | WEBP, PNG | `640×640`, `180×180`, `64×64` | RGBA | Shared UI (Primary Connectify Brand Mark & App Icons) |
| `public/art/premium/cards/` | 6 | 122.1 KB | WEBP | `248×368` | RGBA | Unused Mode (Memory Flip Card Backs & Front) |
| `public/art/premium/chests/` | 3 | 67.7 KB | WEBP | `256×256` | RGBA | Shared UI (`epic.webp` used for Login Reward & Gift icon; `common`/`rare` unused) |
| `public/art/premium/effects/` | 7 | 51.5 KB | WEBP | `256×256` | RGBA | Onet + Match 3 + Shared UI (Match Burst & Victory Particles) |
| `public/art/premium/frames/` | 7 | 129.0 KB | WEBP | `256×256` | RGBA | Shared UI (Avatar Portrait Frames) |
| `public/art/premium/fruit/` | 16 | 168.2 KB | WEBP | `256×256` | RGBA | Onet + Match 3 (Atelier Theme `fruit`) |
| `public/art/premium/fruit-merge/` | 16 | 113.9 KB | WEBP | `256×256` | RGBA | Unused Mode (Fruit Merge Sprites — Reserved in Library) |
| `public/art/premium/galaxy/` | 16 | 156.6 KB | WEBP | `256×256` | RGBA | Onet + Match 3 (Atelier Theme `galaxy`) |
| `public/art/premium/magic_atelier/` | 16 | 160.0 KB | WEBP | `256×256` | RGBA | Onet + Match 3 (Seasonal Theme `magic_atelier`) |
| `public/art/premium/meadow/` | 16 | 180.6 KB | WEBP | `256×256` | RGBA | Onet + Match 3 (Default Free Atelier Theme `meadow`) |
| `public/art/premium/retro_arcade/` | 16 | 119.1 KB | WEBP | `256×256` | RGBA | Onet + Match 3 (Seasonal Theme `retro_arcade`) |
| `public/art/premium/sakura/` | 16 | 185.5 KB | WEBP | `256×256` | RGBA | Onet + Match 3 (Atelier Theme `sakura`) |
| `public/art/premium/surfaces/` | 13 | 95.0 KB | WEBP | `256×256` | RGBA | Onet + Match 3 (Porcelain/Material Tile & Board Skins) |
| `public/art/premium/ui/` | 17 | 158.0 KB | WEBP | `256×256` | RGBA | Shared UI + Boosters (12 active icons, 5 legacy mode icons) |
| `scripts/art-originals/` | 36 | 17,545.6 KB | JPG, PNG | `1024×1024`, `1264×848`, etc. | RGB | Offline Generation Source Sheets (Archive Only) |
| `src/assets/vanilla/background/` | 2 | 134.4 KB | WEBP | `1254×1254` | RGB | Shared UI & Board Backgrounds (`global_background.webp`, `popup_background.webp`) |
| `src/assets/vanilla/logo/` | 21 | 460.1 KB | PNG | `256×256` | Palette (P) | Shared UI (Vanilla Fallback Icons — 7 active, 14 overridden by `BRAND_LOGOS`) |
| `src/assets/vanilla/tiles/` | 15 | 291.3 KB | PNG | `256×256` | Palette (P) | Onet + Match 3 (Default Theme `sweets` / "Summer Club" Beach Tiles) |

---

## 3. Complete File-by-File Asset Inventory

### 3.1 Brand, App Icons & Backgrounds (Shared UI)

| File Path | Format | Dimensions | Color Mode | Size (Bytes / KB) | Code References | Classification |
| :--- | :--- | :--- | :--- | ---: | :--- | :--- |
| `public/art/premium/brand/mark.webp` | WEBP | `640×640` | RGBA | 46,164 B (45.1 KB) | `index.html`, `src/core/artAssets.js` (`BRAND_MARK`, `BRAND_LOGOS.connectify_logo`), `MainLobby.tsx` | **Shared UI (Core Brand)** |
| `public/art/premium/brand/favicon.png` | PNG | `64×64` | RGBA | 6,401 B (6.3 KB) | `index.html` (`<link rel="icon">`) | **Shared UI (App Icon)** |
| `public/art/premium/brand/touch-icon.png` | PNG | `180×180` | RGBA | 33,967 B (33.2 KB) | `index.html` (`<link rel="apple-touch-icon">`) | **Shared UI (App Icon)** |
| `src/assets/vanilla/background/global_background.webp` | WEBP | `1254×1254` | RGB | 73,804 B (72.1 KB) | `src/core/theme/utils.ts`, `src/screens/BootScreen.tsx`, `ThemeProvider.tsx` (`--asset-bg-global`) | **Shared UI / Game Background** |
| `src/assets/vanilla/background/popup_background.webp` | WEBP | `1254×1254` | RGB | 63,836 B (62.3 KB) | `src/core/theme/utils.ts`, `src/screens/BootScreen.tsx`, `ThemeProvider.tsx` (`--asset-bg-popup`) | **Shared UI / Modal Background** |
| `public/logo.png` | PNG | `256×256` | Palette (P) | 30,813 B (30.1 KB) | Unreferenced in `src/` (mentioned in `laporan.md` PWA audit) | **Unused / Legacy Duplicate** |
| `public/brand/logo.webp` | WEBP | `512×512` | RGBA | 19,802 B (19.3 KB) | Unreferenced (superseded by `/art/premium/brand/mark.webp`) | **Unused / Legacy Brand** |
| `public/brand/permen.webp` | WEBP | `512×512` | RGBA | 37,994 B (37.1 KB) | Unreferenced (superseded by `/art/premium/ui/permen.webp`) | **Unused / Legacy Brand** |
| `public/brand/startup.webp` | WEBP | `848×1264` | RGB | 140,806 B (137.5 KB) | Unreferenced in active screens | **Unused / Legacy Splash** |

---

### 3.2 Shared UI Icons & Booster Icons (`public/art/premium/ui/` & `src/assets/vanilla/logo/`)

#### A. Premium Atelier UI & Booster Icons (`public/art/premium/ui/*.webp`)
All 17 icons are `256×256` transparent RGBA WebP sprites referenced via `artIcon(name)` in `src/core/artAssets.js`.

| File Path | Format | Dimensions | Mode | Size (Bytes / KB) | Referenced In | Classification |
| :--- | :--- | :--- | :--- | ---: | :--- | :--- |
| `public/art/premium/ui/onet.webp` | WEBP | `256×256` | RGBA | 10,902 B (10.6 KB) | `artAssets.js` (`play`, `onet`), `MainLobby.tsx`, `GameHubScreen.tsx`, `GameplayScreen.tsx`, `OnetModals.tsx` | **Onet & Shared UI** |
| `public/art/premium/ui/triple.webp` | WEBP | `256×256` | RGBA | 9,802 B (9.6 KB) | `games.ts` (`triple`), `artAssets.js` — **Repurpose as Match 3 Game Mode Icon** | **Match 3 & Shared UI** |
| `public/art/premium/ui/hint.webp` | WEBP | `256×256` | RGBA | 9,374 B (9.2 KB) | `artAssets.js`, `GameplayScreen.tsx`, `ShopPanel.tsx`, `CosmeticPreview.tsx` | **Onet + Match 3 Booster Icon** |
| `public/art/premium/ui/shuffle.webp` | WEBP | `256×256` | RGBA | 9,638 B (9.4 KB) | `artAssets.js`, `GameplayScreen.tsx`, `ShopPanel.tsx`, `CosmeticPreview.tsx` | **Onet + Match 3 Booster Icon** |
| `public/art/premium/ui/hammer.webp` | WEBP | `256×256` | RGBA | 8,250 B (8.1 KB) | `artAssets.js`, `ShopPanel.tsx` — **Repurpose as Match 3 Single-Tile Smash Booster** | **Match 3 Booster Icon** |
| `public/art/premium/ui/bomb.webp` | WEBP | `256×256` | RGBA | 6,528 B (6.4 KB) | `artAssets.js`, `ShopPanel.tsx` — **Repurpose as Match 3 Area Bomb Booster** | **Match 3 Booster Icon** |
| `public/art/premium/ui/permen.webp` | WEBP | `256×256` | RGBA | 9,004 B (8.8 KB) | `artAssets.js`, `MainLobby.tsx`, `GameHubScreen.tsx`, `KineticComponents.tsx` (`CurrencyPill`) | **Shared UI (Currency Icon)** |
| `public/art/premium/ui/achievements.webp` | WEBP | `256×256` | RGBA | 11,970 B (11.7 KB) | `artAssets.js` (`achievement`, `achievements`, `trophy`), `MainLobby.tsx`, `OnetModals.tsx` | **Shared UI (Achievements & Victory)** |
| `public/art/premium/ui/missions.webp` | WEBP | `256×256` | RGBA | 5,882 B (5.7 KB) | `artAssets.js` (`mission`, `missions`), `MissionPanel.tsx` | **Shared UI (Daily/Weekly Missions)** |
| `public/art/premium/ui/collection.webp` | WEBP | `256×256` | RGBA | 9,370 B (9.2 KB) | `artAssets.js` (`collection`, `store`, `shop`), `CollectionScreen.tsx` | **Shared UI (Collection & Shop)** |
| `public/art/premium/ui/theme.webp` | WEBP | `256×256` | RGBA | 9,976 B (9.7 KB) | `artAssets.js` (`theme`, `themes`, `palette`), `ThemeScreen.tsx` | **Shared UI (Theme Selector)** |
| `public/art/premium/ui/notifications.webp` | WEBP | `256×256` | RGBA | 11,902 B (11.6 KB) | `artAssets.js` (`notification`, `notifications`), `NotificationScreen.tsx` | **Shared UI (Notifications)** |
| `public/art/premium/ui/leaderboard.webp` | WEBP | `256×256` | RGBA | 11,460 B (11.2 KB) | `artAssets.js` (`leaderboard`), `StatistikScreen.tsx` | **Shared UI (Stats / Records)** |
| `public/art/premium/ui/block.webp` | WEBP | `256×256` | RGBA | 9,460 B (9.2 KB) | `games.ts` (`block`) | **Unused Mode (Block Puzzle)** |
| `public/art/premium/ui/memory.webp` | WEBP | `256×256` | RGBA | 10,410 B (10.2 KB) | `games.ts` (`memory`) | **Unused Mode (Memory Flip)** |
| `public/art/premium/ui/fruit-merge.webp` | WEBP | `256×256` | RGBA | 9,270 B (9.1 KB) | Unreferenced in `src/` (prepared for Fruit Merge mode) | **Unused Mode (Fruit Merge)** |
| `public/art/premium/ui/multiplayer.webp` | WEBP | `256×256` | RGBA | 8,588 B (8.4 KB) | `artAssets.js` (`multiplayer`), `MultiplayerScreen.tsx` | **Unused Mode (Multiplayer)** |

#### B. Vanilla Fallback Logo Icons (`src/assets/vanilla/logo/*.png`)
Loaded via `import.meta.glob('../../assets/vanilla/logo/*.png')` in `src/core/theme/utils.ts`, then partially overwritten by `Object.assign(vanillaTheme.assets.logo, BRAND_LOGOS)`. All 21 files are `256×256` 8-bit Palette PNGs.

| File Path | Format | Dimensions | Mode | Size (Bytes / KB) | Status in `vanillaTheme.assets.logo` | Classification |
| :--- | :--- | :--- | :--- | ---: | :--- | :--- |
| `src/assets/vanilla/logo/back.png` | PNG | `256×256` | P | 10,555 B (10.3 KB) | Active in `vanillaTheme.assets.logo.back` | **Shared UI (Fallback Icon)** |
| `src/assets/vanilla/logo/music_on.png` | PNG | `256×256` | P | 18,219 B (17.8 KB) | Active in `vanillaTheme.assets.logo.music_on` (`SettingsScreen.tsx`) | **Shared UI (Settings Audio)** |
| `src/assets/vanilla/logo/settings.png` | PNG | `256×256` | P | 24,442 B (23.9 KB) | Active in `vanillaTheme.assets.logo.settings` (`BootScreen.tsx`, `SettingsScreen.tsx`) | **Shared UI (Settings Icon)** |
| `src/assets/vanilla/logo/sound_off.png` | PNG | `256×256` | P | 18,817 B (18.4 KB) | Active in `vanillaTheme.assets.logo.sound_off` (`SettingsScreen.tsx`) | **Shared UI (Settings Audio)** |
| `src/assets/vanilla/logo/sound_on.png` | PNG | `256×256` | P | 20,894 B (20.4 KB) | Active in `vanillaTheme.assets.logo.sound_on` (`SettingsScreen.tsx`) | **Shared UI (Settings Audio)** |
| `src/assets/vanilla/logo/achievement.png` | PNG | `256×256` | P | 24,228 B (23.7 KB) | Overridden by `/art/premium/ui/achievements.webp` | **Legacy / Overridden** |
| `src/assets/vanilla/logo/avatar_female.png` | PNG | `256×256` | P | 30,611 B (29.9 KB) | Overridden by `/art/premium/avatars/cat.webp` | **Legacy / Overridden** |
| `src/assets/vanilla/logo/avatar_male.png` | PNG | `256×256` | P | 22,364 B (21.8 KB) | Overridden by `/art/premium/avatars/bear.webp` | **Legacy / Overridden** |
| `src/assets/vanilla/logo/chest_common.png` | PNG | `256×256` | P | 24,539 B (24.0 KB) | Chest feature removed | **Unused / Legacy Chest** |
| `src/assets/vanilla/logo/chest_epic.png` | PNG | `256×256` | P | 35,625 B (34.8 KB) | Chest feature removed | **Unused / Legacy Chest** |
| `src/assets/vanilla/logo/chest_rare.png` | PNG | `256×256` | P | 31,254 B (30.5 KB) | Chest feature removed | **Unused / Legacy Chest** |
| `src/assets/vanilla/logo/collection.png` | PNG | `256×256` | P | 30,079 B (29.4 KB) | Overridden by `/art/premium/ui/collection.webp` | **Legacy / Overridden** |
| `src/assets/vanilla/logo/collection_chest.png` | PNG | `256×256` | P | 24,610 B (24.0 KB) | Chest feature removed | **Unused / Legacy Chest** |
| `src/assets/vanilla/logo/connectify_logo.png` | PNG | `256×256` | P | 30,813 B (30.1 KB) | Overridden by `/art/premium/brand/mark.webp` | **Legacy / Overridden** |
| `src/assets/vanilla/logo/hint.png` | PNG | `256×256` | P | 18,460 B (18.0 KB) | Overridden by `/art/premium/ui/hint.webp` | **Legacy / Overridden** |
| `src/assets/vanilla/logo/missions.png` | PNG | `256×256` | P | 22,300 B (21.8 KB) | Overridden by `/art/premium/ui/missions.webp` | **Legacy / Overridden** |
| `src/assets/vanilla/logo/notification.png` | PNG | `256×256` | P | 18,797 B (18.4 KB) | Overridden by `/art/premium/ui/notifications.webp` | **Legacy / Overridden** |
| `src/assets/vanilla/logo/permen.png` | PNG | `256×256` | P | 15,636 B (15.3 KB) | Overridden by `/art/premium/ui/permen.webp` | **Legacy / Overridden** |
| `src/assets/vanilla/logo/play.png` | PNG | `256×256` | P | 6,169 B (6.0 KB) | Preloaded in `BootScreen.tsx`, overridden by `onet.webp` | **Legacy / Overridden** |
| `src/assets/vanilla/logo/shop.png` | PNG | `256×256` | P | 25,517 B (24.9 KB) | Overridden by `/art/premium/ui/collection.webp` | **Legacy / Overridden** |
| `src/assets/vanilla/logo/shuffle.png` | PNG | `256×256` | P | 17,169 B (16.8 KB) | Overridden by `/art/premium/ui/shuffle.webp` | **Legacy / Overridden** |

---

### 3.3 Shared Theme Tile Sets (Onet & Match 3) — 273 Files

All tile sets below are registered in `src/core/tileCatalog.js` and `src/core/theme/registry.ts` and are designed to power both **Onet** (10 to 16 distinct tile pairs per board) and **Match 3** (selecting 5 to 7 distinct high-contrast tile icons per level from the equipped 15/16-tile theme). Note that the 19 themes comprise **1 Vanilla (`15` PNGs)** + **4 Classic (`16` WebPs each)** + **5 Atelier (`16` WebPs each)** + **4 Seasonal (`16` WebPs each)** + **5 Legacy Reward (`10` WebPs each)** = **273 tile files**.

#### A. Default Vanilla Theme: `sweets` ("Summer Club") — 15 Files (`src/assets/vanilla/tiles/*.png`)
- **Format:** PNG (`256×256`, 8-bit Palette mode `P`)
- **Total Size:** 291.3 KB (298,309 Bytes)
- **Referenced in:** `src/core/tileCatalog.js` (`BEACH_TILES`), `src/core/theme/utils.ts`, `src/screens/BootScreen.tsx`

| Tile ID (`BEACH_TILES`) | File Path | Format | Dimensions | Mode | Size (Bytes / KB) | Classification |
| :--- | :--- | :--- | :--- | :--- | ---: | :--- |
| `beach_ball` | `src/assets/vanilla/tiles/beach_ball.png` | PNG | `256×256` | P | 18,203 B (17.8 KB) | **Onet + Match 3 Tile (`sweets`)** |
| `beach_hat` | `src/assets/vanilla/tiles/beach_hat.png` | PNG | `256×256` | P | 16,942 B (16.5 KB) | **Onet + Match 3 Tile (`sweets`)** |
| `camera` | `src/assets/vanilla/tiles/camera.png` | PNG | `256×256` | P | 24,166 B (23.6 KB) | **Onet + Match 3 Tile (`sweets`)** |
| `coconut` | `src/assets/vanilla/tiles/coconut.png` | PNG | `256×256` | P | 20,789 B (20.3 KB) | **Onet + Match 3 Tile (`sweets`)** |
| `crab` | `src/assets/vanilla/tiles/crab.png` | PNG | `256×256` | P | 22,594 B (22.1 KB) | **Onet + Match 3 Tile (`sweets`)** |
| `ice_cream` | `src/assets/vanilla/tiles/ice_cream.png` | PNG | `256×256` | P | 13,082 B (12.8 KB) | **Onet + Match 3 Tile (`sweets`)** |
| `sandal` | `src/assets/vanilla/tiles/sandal.png` | PNG | `256×256` | P | 22,493 B (22.0 KB) | **Onet + Match 3 Tile (`sweets`)** |
| `seagull` | `src/assets/vanilla/tiles/seagull.png` | PNG | `256×256` | P | 14,792 B (14.4 KB) | **Onet + Match 3 Tile (`sweets`)** |
| `seashell` | `src/assets/vanilla/tiles/seashell.png` | PNG | `256×256` | P | 24,657 B (24.1 KB) | **Onet + Match 3 Tile (`sweets`)** |
| `summer_shirt` | `src/assets/vanilla/tiles/summer_shirt.png` | PNG | `256×256` | P | 24,277 B (23.7 KB) | **Onet + Match 3 Tile (`sweets`)** |
| `summer_shorts` | `src/assets/vanilla/tiles/summer_shorts.png` | PNG | `256×256` | P | 23,341 B (22.8 KB) | **Onet + Match 3 Tile (`sweets`)** |
| `sunglasses` | `src/assets/vanilla/tiles/sunglasses.png` | PNG | `256×256` | P | 16,139 B (15.8 KB) | **Onet + Match 3 Tile (`sweets`)** |
| `swim_ring` | `src/assets/vanilla/tiles/swim_ring.png` | PNG | `256×256` | P | 17,352 B (16.9 KB) | **Onet + Match 3 Tile (`sweets`)** |
| `tropical_fish` | `src/assets/vanilla/tiles/tropical_fish.png` | PNG | `256×256` | P | 18,705 B (18.3 KB) | **Onet + Match 3 Tile (`sweets`)** |
| `tropical_juice` | `src/assets/vanilla/tiles/tropical_juice.png` | PNG | `256×256` | P | 20,776 B (20.3 KB) | **Onet + Match 3 Tile (`sweets`)** |

#### B. Classic Themes (`ocean`, `forest`, `candy`, `space`) — 68 Files (`public/art/{ocean,forest,candy,space}/`)
- **Format:** WEBP (`220×220` RGB for tiles `0.webp`–`15.webp`; `512×512` RGB for `sheet.webp`)
- **Referenced in:** `src/core/tileCatalog.js`, `src/core/theme/registry.ts` (`makeTheme`)
- **Note:** Each folder contains `sheet.webp` (`512×512`), which is an unreferenced preview contact sheet generated by `scripts/prepare_art.py`.

| Theme ID & Name | Directory | Active Tile Files (`0.webp`–`15.webp`) | Individual File Size Breakdown (Bytes) | Contact Sheet (`sheet.webp` — Unused) | Classification |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`ocean`** (Ocean Friends) | `public/art/ocean/` | 16 files (`220×220` RGB, 72.8 KB total) | `0`: 5,266 · `1`: 5,376 · `2`: 3,846 · `3`: 3,658 · `4`: 3,310 · `5`: 4,418 · `6`: 5,072 · `7`: 4,990 · `8`: 3,818 · `9`: 3,852 · `10`: 3,790 · `11`: 5,662 · `12`: 4,070 · `13`: 4,732 · `14`: 4,728 · `15`: 6,294 | `sheet.webp` (`512×512`, 34,268 B) | **Onet + Match 3 Theme (`ocean`)** |
| **`forest`** (Forest Tales) | `public/art/forest/` | 16 files (`220×220` RGB, 62.3 KB total) | `0`: 3,510 · `1`: 2,830 · `2`: 3,926 · `3`: 2,998 · `4`: 5,016 · `5`: 4,732 · `6`: 4,996 · `7`: 3,308 · `8`: 4,558 · `9`: 4,760 · `10`: 4,084 · `11`: 3,070 · `12`: 4,246 · `13`: 3,592 · `14`: 5,218 · `15`: 2,936 | `sheet.webp` (`512×512`, 29,512 B) | **Onet + Match 3 Theme (`forest`)** |
| **`candy`** (Candy Parade) | `public/art/candy/` | 16 files (`220×220` RGB, 50.8 KB total) | `0`: 4,444 · `1`: 4,334 · `2`: 3,848 · `3`: 2,982 · `4`: 3,844 · `5`: 2,976 · `6`: 3,308 · `7`: 2,912 · `8`: 2,566 · `9`: 3,496 · `10`: 1,804 · `11`: 2,660 · `12`: 2,714 · `13`: 3,940 · `14`: 2,348 · `15`: 3,880 | `sheet.webp` (`512×512`, 24,214 B) | **Onet + Match 3 Theme (`candy`)** |
| **`space`** (Cosmic Trip) | `public/art/space/` | 16 files (`220×220` RGB, 55.2 KB total) | `0`: 3,532 · `1`: 3,858 · `2`: 3,008 · `3`: 3,554 · `4`: 2,952 · `5`: 2,996 · `6`: 4,600 · `7`: 3,384 · `8`: 4,358 · `9`: 2,304 · `10`: 2,298 · `11`: 3,878 · `12`: 3,320 · `13`: 3,438 · `14`: 3,740 · `15`: 5,312 | `sheet.webp` (`512×512`, 26,078 B) | **Onet + Match 3 Theme (`space`)** |

#### C. Premium Atelier Themes (`meadow`, `sakura`, `bakery`, `galaxy`, `fruit`) — 80 Files (`public/art/premium/{theme}/0.webp`–`15.webp`)
- **Format:** WEBP (`256×256` transparent RGBA, edge-cleaned via `scripts/prepare_premium_art.py`)
- **Referenced in:** `src/core/tileCatalog.js`, `src/core/theme/registry.ts`, `src/core/games.ts`, `public/art/premium/manifest.json`

| Theme ID & Name | Directory | Files & Dimensions | Total Size | Individual File Size Breakdown (Bytes) | Classification |
| :--- | :--- | :--- | ---: | :--- | :--- |
| **`meadow`** (Meadow Atelier — Free Default) | `public/art/premium/meadow/` | `0.webp`–`15.webp` (`256×256` RGBA) | 180.6 KB | `0`: 13,610 · `1`: 14,794 · `2`: 10,782 · `3`: 9,890 · `4`: 10,728 · `5`: 9,308 · `6`: 13,256 · `7`: 11,714 · `8`: 9,448 · `9`: 15,362 · `10`: 11,154 · `11`: 13,656 · `12`: 5,046 · `13`: 12,948 · `14`: 7,394 · `15`: 15,800 | **Onet + Match 3 Theme (`meadow`)** |
| **`sakura`** (Sakura Atelier) | `public/art/premium/sakura/` | `0.webp`–`15.webp` (`256×256` RGBA) | 185.5 KB | `0`: 15,196 · `1`: 6,924 · `2`: 10,738 · `3`: 10,140 · `4`: 10,864 · `5`: 15,826 · `6`: 9,982 · `7`: 9,366 · `8`: 13,430 · `9`: 12,552 · `10`: 16,958 · `11`: 10,950 · `12`: 10,322 · `13`: 12,572 · `14`: 8,228 · `15`: 15,934 | **Onet + Match 3 Theme (`sakura`)** |
| **`bakery`** (Petite Bakery) | `public/art/premium/bakery/` | `0.webp`–`15.webp` (`256×256` RGBA) | 163.7 KB | `0`: 11,222 · `1`: 11,976 · `2`: 11,490 · `3`: 12,118 · `4`: 10,296 · `5`: 13,884 · `6`: 8,954 · `7`: 7,780 · `8`: 12,510 · `9`: 14,648 · `10`: 10,812 · `11`: 10,426 · `12`: 4,948 · `13`: 8,358 · `14`: 10,942 · `15`: 7,294 | **Onet + Match 3 Theme (`bakery`)** |
| **`galaxy`** (Midnight Galaxy) | `public/art/premium/galaxy/` | `0.webp`–`15.webp` (`256×256` RGBA) | 156.6 KB | `0`: 6,286 · `1`: 7,216 · `2`: 8,644 · `3`: 8,824 · `4`: 11,452 · `5`: 11,080 · `6`: 9,290 · `7`: 7,430 · `8`: 11,492 · `9`: 10,398 · `10`: 10,718 · `11`: 10,268 · `12`: 11,086 · `13`: 11,670 · `14`: 12,060 · `15`: 12,396 | **Onet + Match 3 Theme (`galaxy`)** |
| **`fruit`** (Fruit Market) | `public/art/premium/fruit/` | `0.webp`–`15.webp` (`256×256` RGBA) | 168.2 KB | `0`: 11,076 · `1`: 11,276 · `2`: 9,486 · `3`: 9,450 · `4`: 11,426 · `5`: 9,892 · `6`: 10,160 · `7`: 13,564 · `8`: 13,044 · `9`: 9,904 · `10`: 11,374 · `11`: 10,112 · `12`: 13,568 · `13`: 12,314 · `14`: 8,380 · `15`: 7,226 | **Onet + Match 3 Theme (`fruit`)** |

#### D. Seasonal Themes (`autumn_harvest`, `magic_atelier`, `retro_arcade`, `alpine_winter`) — 64 Files (`public/art/premium/{theme}/0.webp`–`15.webp`)
- **Format:** WEBP (`256×256` transparent RGBA, edge-cleaned via `scripts/prepare_seasonal_art.py`)
- **Referenced in:** `src/core/seasonalCatalog.js` (`SEASONAL_THEMES`), `src/core/tileCatalog.js`, `src/core/theme/registry.ts`, `public/art/premium/seasonal-manifest.json`

| Theme ID & Name | Directory | Files & Dimensions | Total Size | Individual File Size Breakdown (Bytes) | Classification |
| :--- | :--- | :--- | ---: | :--- | :--- |
| **`autumn_harvest`** (Autumn Harvest) | `public/art/premium/autumn_harvest/` | `0.webp`–`15.webp` (`256×256` RGBA) | 139.0 KB | `0`: 8,030 · `1`: 7,910 · `2`: 5,834 · `3`: 9,148 · `4`: 10,206 · `5`: 9,186 · `6`: 10,152 · `7`: 8,570 · `8`: 9,100 · `9`: 11,940 · `10`: 8,924 · `11`: 9,898 · `12`: 8,364 · `13`: 7,214 · `14`: 9,182 · `15`: 8,690 | **Onet + Match 3 Theme (`autumn_harvest`)** |
| **`magic_atelier`** (Magic Atelier) | `public/art/premium/magic_atelier/` | `0.webp`–`15.webp` (`256×256` RGBA) | 160.0 KB | `0`: 7,776 · `1`: 10,508 · `2`: 14,016 · `3`: 9,048 · `4`: 7,900 · `5`: 12,700 · `6`: 9,094 · `7`: 11,408 · `8`: 11,664 · `9`: 9,994 · `10`: 8,320 · `11`: 7,896 · `12`: 10,812 · `13`: 12,992 · `14`: 10,740 · `15`: 8,928 | **Onet + Match 3 Theme (`magic_atelier`)** |
| **`retro_arcade`** (Retro Arcade) | `public/art/premium/retro_arcade/` | `0.webp`–`15.webp` (`256×256` RGBA) | 119.1 KB | `0`: 6,998 · `1`: 5,454 · `2`: 8,224 · `3`: 5,738 · `4`: 7,960 · `5`: 6,804 · `6`: 7,560 · `7`: 7,146 · `8`: 8,770 · `9`: 8,152 · `10`: 6,534 · `11`: 10,288 · `12`: 6,112 · `13`: 10,646 · `14`: 8,482 · `15`: 7,058 | **Onet + Match 3 Theme (`retro_arcade`)** |
| **`alpine_winter`** (Alpine Winter) | `public/art/premium/alpine_winter/` | `0.webp`–`15.webp` (`256×256` RGBA) | 168.2 KB | `0`: 14,298 · `1`: 12,958 · `2`: 9,826 · `3`: 9,646 · `4`: 9,336 · `5`: 11,544 · `6`: 6,650 · `7`: 7,600 · `8`: 14,726 · `9`: 10,830 · `10`: 12,212 · `11`: 12,386 · `12`: 10,146 · `13`: 9,928 · `14`: 11,162 · `15`: 9,034 | **Onet + Match 3 Theme (`alpine_winter`)** |

#### E. Legacy Milestone Reward Themes (`reward_sakura`, `reward_bakery`, `reward_galaxy`, `reward_meadow`, `reward_fruit`) — 50 Files (`public/art/{theme}/0.webp`–`9.webp`)
- **Format:** WEBP (`512×512` RGBA)
- **Referenced in:** `src/core/artRewards.js`, `src/core/tileCatalog.js`, `src/core/theme/registry.ts`
- **Note:** These 50 files are earlier 10-tile editions unlocked via account milestones (Account Level 3/5, Login Days 3/7, Achievement Tiers 3).

| Reward Theme ID | Directory | Files & Dimensions | Total Size | Individual File Size Breakdown (Bytes) | Classification |
| :--- | :--- | :--- | ---: | :--- | :--- |
| **`reward_sakura`** | `public/art/sakura/` | `0.webp`–`9.webp` (`512×512` RGBA) | 359.7 KB | `0`: 37,532 · `1`: 28,802 · `2`: 55,124 · `3`: 22,396 · `4`: 76,948 · `5`: 20,452 · `6`: 31,648 · `7`: 29,534 · `8`: 41,146 · `9`: 24,752 | **Onet + Match 3 Milestone Theme** |
| **`reward_bakery`** | `public/art/bakery/` | `0.webp`–`9.webp` (`512×512` RGBA) | 355.8 KB | `0`: 59,792 · `1`: 30,750 · `2`: 27,044 · `3`: 36,276 · `4`: 30,674 · `5`: 30,092 · `6`: 30,590 · `7`: 38,114 · `8`: 35,294 · `9`: 45,752 | **Onet + Match 3 Milestone Theme** |
| **`reward_galaxy`** | `public/art/galaxy/` | `0.webp`–`9.webp` (`512×512` RGBA) | 329.2 KB | `0`: 29,610 · `1`: 38,906 · `2`: 35,194 · `3`: 26,036 · `4`: 30,530 · `5`: 37,396 · `6`: 37,124 · `7`: 28,862 · `8`: 23,834 · `9`: 49,578 | **Onet + Match 3 Milestone Theme** |
| **`reward_meadow`** | `public/art/meadow/` | `0.webp`–`9.webp` (`512×512` RGBA) | 357.2 KB | `0`: 51,190 · `1`: 28,776 · `2`: 35,132 · `3`: 35,314 · `4`: 30,078 · `5`: 40,446 · `6`: 53,720 · `7`: 24,922 · `8`: 34,538 · `9`: 31,668 | **Onet + Match 3 Milestone Theme** |
| **`reward_fruit`** | `public/art/fruit/` | `0.webp`–`9.webp` (`512×512` RGBA) | 299.0 KB | `0`: 18,036 · `1`: 30,106 · `2`: 30,354 · `3`: 25,896 · `4`: 47,864 · `5`: 22,010 · `6`: 37,328 · `7`: 43,528 · `8`: 28,090 · `9`: 22,990 | **Onet + Match 3 Milestone Theme** |

#### F. Bonus Unused Tile Set Available in Repository: `fruit-merge` — 16 Files (`public/art/premium/fruit-merge/0.webp`–`15.webp`)
- **Format:** WEBP (`256×256` RGBA, 113.9 KB total)
- **Individual Sizes (Bytes):** `0`: 4,932 · `1`: 6,330 · `2`: 5,580 · `3`: 5,438 · `4`: 7,732 · `5`: 6,814 · `6`: 5,708 · `7`: 5,934 · `8`: 9,268 · `9`: 7,994 · `10`: 10,952 · `11`: 9,726 · `12`: 10,160 · `13`: 7,690 · `14`: 9,270 · `15`: 3,146
- **Referenced in:** `public/art/premium/fruit-merge/manifest.json` (unreferenced in `src/`)
- **Classification:** **Unused Mode (Fruit Merge) / Optional Bonus Theme Tile Set** (since all 16 sprites are `256×256` transparent RGBA kawaii fruits, they can either remain in the Asset Library or serve as an unlockable "Juicy Merge" special theme).

---

### 3.4 Tile Material Surfaces & Legacy Skins (`public/art/premium/surfaces/` & `public/art/skins/`)

#### A. Premium Material Surfaces (`public/art/premium/surfaces/*.webp`) — 13 Files
Used in `src/core/cosmetics.js` and `src/core/seasonalCatalog.js` as tile backing textures (`tile1`, `tile2`, `tile4`, `arrow`, `SKIN_PACKS`) and in `OnetBoard.tsx` (`backgroundImage: url(${cosmeticImage(skin)})`). In Connectify Android, these serve as **both Onet Tile Skins and Match 3 Tile/Cell Backing Surfaces**.

| File Path | Format | Dimensions | Mode | Size (Bytes / KB) | Cosmetic / Skin Pack IDs | Classification |
| :--- | :--- | :--- | :--- | ---: | :--- | :--- |
| `public/art/premium/surfaces/cream.webp` | WEBP | `256×256` | RGBA | 7,996 B (7.8 KB) | `tilepack_pearl` (Free Default: `tile1_pearl`, `tile2_pearl`, `tile4_pearl`, `arrow_pearl`) | **Onet + Match 3 Default Tile Surface** |
| `public/art/premium/surfaces/candy.webp` | WEBP | `256×256` | RGBA | 8,966 B (8.8 KB) | `tilepack_candy` ("Strawberry Milk Set") | **Onet + Match 3 Tile Surface** |
| `public/art/premium/surfaces/opal.webp` | WEBP | `256×256` | RGBA | 5,894 B (5.8 KB) | `tilepack_opal` ("Opal Set"), `block_ceramic` | **Onet + Match 3 Tile Surface** |
| `public/art/premium/surfaces/night.webp` | WEBP | `256×256` | RGBA | 6,784 B (6.6 KB) | `tilepack_night` ("Midnight Set") | **Onet + Match 3 Tile Surface** |
| `public/art/premium/surfaces/mint.webp` | WEBP | `256×256` | RGBA | 7,756 B (7.6 KB) | `tilepack_mint` ("Jade Set"), `arrow_mint` | **Onet + Match 3 Tile Surface** |
| `public/art/premium/surfaces/sunset.webp` | WEBP | `256×256` | RGBA | 8,140 B (7.9 KB) | `tilepack_sunset` ("Honey Set"), `arrow_sunset` | **Onet + Match 3 Tile Surface** |
| `public/art/premium/surfaces/amber.webp` | WEBP | `256×256` | RGBA | 5,428 B (5.3 KB) | `tilepack_amber` ("Amber Set" — Seasonal) | **Onet + Match 3 Tile Surface** |
| `public/art/premium/surfaces/enchanted.webp` | WEBP | `256×256` | RGBA | 8,292 B (8.1 KB) | `tilepack_enchanted` ("Enchanted Set" — Seasonal) | **Onet + Match 3 Tile Surface** |
| `public/art/premium/surfaces/pixel.webp` | WEBP | `256×256` | RGBA | 6,176 B (6.0 KB) | `tilepack_pixel` ("Pixel Pop Set" — Seasonal) | **Onet + Match 3 Tile Surface** |
| `public/art/premium/surfaces/frost.webp` | WEBP | `256×256` | RGBA | 5,114 B (5.0 KB) | `tilepack_frost` ("Frosted Set" — Seasonal) | **Onet + Match 3 Tile Surface** |
| `public/art/premium/surfaces/cloud.webp` | WEBP | `256×256` | RGBA | 9,338 B (9.1 KB) | `block_pearl` (Repurpose as Match 3 / Onet "Cloud Porcelain" Surface) | **Onet + Match 3 Tile Surface** |
| `public/art/premium/surfaces/jelly.webp` | WEBP | `256×256` | RGBA | 6,510 B (6.4 KB) | `block_jelly` (Repurpose as Match 3 / Onet "Rose Jelly" Surface) | **Onet + Match 3 Tile Surface** |
| `public/art/premium/surfaces/wood.webp` | WEBP | `256×256` | RGBA | 10,902 B (10.6 KB) | `block_wood` (Repurpose as Match 3 / Onet "Maple Wood" Surface) | **Onet + Match 3 Tile Surface** |

#### B. Legacy Journey Reward Skins (`public/art/skins/*.webp`) — 9 Files
Referenced in `src/core/cosmetics.js` (lines 36–41) and `src/core/artRewards.js`.

| File Path | Format | Dimensions | Mode | Size (Bytes / KB) | Cosmetic ID | Classification |
| :--- | :--- | :--- | :--- | ---: | :--- | :--- |
| `public/art/skins/arrow_mint.webp` | WEBP | `512×512` | RGBA | 30,954 B (30.2 KB) | `reward_arrow_mint` | **Onet Milestone Skin** |
| `public/art/skins/arrow_night.webp` | WEBP | `512×512` | RGBA | 28,202 B (27.5 KB) | `reward_arrow_night` | **Onet Milestone Skin** |
| `public/art/skins/arrow_sunset.webp` | WEBP | `512×512` | RGBA | 22,656 B (22.1 KB) | `reward_arrow_sunset` | **Onet Milestone Skin** |
| `public/art/skins/candy.webp` | WEBP | `512×512` | RGB | 13,192 B (12.9 KB) | `reward_tile1_candy` | **Onet + Match 3 Milestone Skin** |
| `public/art/skins/cloud.webp` | WEBP | `512×512` | RGB | 13,620 B (13.3 KB) | `reward_tile1_cloud` | **Onet + Match 3 Milestone Skin** |
| `public/art/skins/cream.webp` | WEBP | `512×512` | RGB | 21,756 B (21.2 KB) | `reward_tile1_cream` | **Onet + Match 3 Milestone Skin** |
| `public/art/skins/mint.webp` | WEBP | `512×512` | RGB | 5,922 B (5.8 KB) | `reward_tile2_mint` | **Onet + Match 3 Milestone Skin** |
| `public/art/skins/night.webp` | WEBP | `512×512` | RGB | 42,942 B (41.9 KB) | `reward_tile4_night` | **Onet + Match 3 Milestone Skin** |
| `public/art/skins/wood.webp` | WEBP | `512×512` | RGB | 18,924 B (18.5 KB) | `reward_block_wood` | **Onet + Match 3 Milestone Skin** |

---

### 3.5 Particle Effects, Avatar Portraits & Avatar Frames (Shared UI & Gameplay FX)

#### A. Match & Victory Particle Sprites (`public/art/premium/effects/*.webp`) — 7 Files
All 7 files are `256×256` transparent RGBA WebP sprites referenced in `src/core/cosmetics.js`, `src/core/seasonalCatalog.js`, `src/components/VictoryBurst.tsx`, `src/components/GameParticles.tsx`, and `src/game/components/TileBurst.tsx`.

| File Path | Format | Dimensions | Mode | Size (Bytes / KB) | Cosmetic & Animation IDs | Classification |
| :--- | :--- | :--- | :--- | ---: | :--- | :--- |
| `public/art/premium/effects/blossom.webp` | WEBP | `256×256` | RGBA | 6,520 B (6.4 KB) | `effect_blossom` (Free Default Victory Burst) | **Onet + Match 3 Victory/Match FX** |
| `public/art/premium/effects/stars.webp` | WEBP | `256×256` | RGBA | 5,706 B (5.6 KB) | `effect_stars` ("Star Shower") | **Onet + Match 3 Victory/Match FX** |
| `public/art/premium/effects/confetti.webp` | WEBP | `256×256` | RGBA | 9,962 B (9.7 KB) | `effect_confetti` ("Club Confetti") | **Onet + Match 3 Victory/Match FX** |
| `public/art/premium/effects/autumn.webp` | WEBP | `256×256` | RGBA | 7,506 B (7.3 KB) | `effect_autumn`, `anim_onet_autumn` ("Autumn Drift", `#ce7c35`) | **Onet + Match 3 Match/Victory FX** |
| `public/art/premium/effects/magic.webp` | WEBP | `256×256` | RGBA | 7,422 B (7.2 KB) | `effect_magic`, `anim_onet_magic` ("Magic Orbit", `#a178cb`) | **Onet + Match 3 Match/Victory FX** |
| `public/art/premium/effects/pixel.webp` | WEBP | `256×256` | RGBA | 4,528 B (4.4 KB) | `effect_pixel`, `anim_onet_pixel` ("Pixel Pop", `#438bc1`) | **Onet + Match 3 Match/Victory FX** |
| `public/art/premium/effects/snow.webp` | WEBP | `256×256` | RGBA | 11,074 B (10.8 KB) | `effect_snow`, `anim_onet_snow` ("Frost Bloom", `#53b4cb`) | **Onet + Match 3 Match/Victory FX** |

#### B. Premium & Seasonal Avatar Portraits (`public/art/premium/avatars/*.webp`) — 13 Files
All 13 files are `256×256` transparent RGBA WebP sprites referenced in `src/core/cosmetics.js`, `src/core/seasonalCatalog.js`, and `src/core/artAssets.js`.

| File Path | Format | Dimensions | Mode | Size (Bytes / KB) | Avatar ID & Name | Classification |
| :--- | :--- | :--- | :--- | ---: | :--- | :--- |
| `public/art/premium/avatars/bear.webp` | WEBP | `256×256` | RGBA | 19,664 B (19.2 KB) | `avatar_male` ("Kai" — Default Free Starter Avatar) | **Shared UI (Profile Avatar)** |
| `public/art/premium/avatars/cat.webp` | WEBP | `256×256` | RGBA | 21,238 B (20.7 KB) | `avatar_female` ("Mika" — Default Free Starter Avatar) | **Shared UI (Profile Avatar)** |
| `public/art/premium/avatars/mochi.webp` | WEBP | `256×256` | RGBA | 19,450 B (19.0 KB) | `avatar_mochi` ("Mochi" — 65 Permen) | **Shared UI (Profile Avatar)** |
| `public/art/premium/avatars/orbit.webp` | WEBP | `256×256` | RGBA | 22,436 B (21.9 KB) | `avatar_orbit` ("Orbit" — 90 Permen) | **Shared UI (Profile Avatar)** |
| `public/art/premium/avatars/panda.webp` | WEBP | `256×256` | RGBA | 19,654 B (19.2 KB) | `portrait_panda` ("Bambu" — 60 Permen) | **Shared UI (Profile Avatar)** |
| `public/art/premium/avatars/fox.webp` | WEBP | `256×256` | RGBA | 20,196 B (19.7 KB) | `portrait_fox` ("Rubi" — 70 Permen) | **Shared UI (Profile Avatar)** |
| `public/art/premium/avatars/shiba.webp` | WEBP | `256×256` | RGBA | 19,670 B (19.2 KB) | `portrait_shiba` ("Kuma" — 65 Permen) | **Shared UI (Profile Avatar)** |
| `public/art/premium/avatars/penguin.webp` | WEBP | `256×256` | RGBA | 18,844 B (18.4 KB) | `portrait_penguin` ("Pip" — 60 Permen) | **Shared UI (Profile Avatar)** |
| `public/art/premium/avatars/koala.webp` | WEBP | `256×256` | RGBA | 17,866 B (17.4 KB) | `portrait_koala` ("Lumi" — 75 Permen) | **Shared UI (Profile Avatar)** |
| `public/art/premium/avatars/hedgehog.webp` | WEBP | `256×256` | RGBA | 15,204 B (14.8 KB) | `avatar_hedgehog` ("Hazel" — Seasonal, 75 Permen) | **Shared UI (Profile Avatar)** |
| `public/art/premium/avatars/wizard-owl.webp` | WEBP | `256×256` | RGBA | 13,774 B (13.5 KB) | `avatar_wizard-owl` ("Professor Hoot" — Seasonal, 90 Permen) | **Shared UI (Profile Avatar)** |
| `public/art/premium/avatars/robot.webp` | WEBP | `256×256` | RGBA | 10,470 B (10.2 KB) | `avatar_robot` ("Bip" — Seasonal, 80 Permen) | **Shared UI (Profile Avatar)** |
| `public/art/premium/avatars/polar-cub.webp` | WEBP | `256×256` | RGBA | 10,994 B (10.7 KB) | `avatar_polar-cub` ("Snowy" — Seasonal, 80 Permen) | **Shared UI (Profile Avatar)** |

#### C. Classic Milestone Avatars (`public/art/avatars/*.webp`) — 13 Files
Referenced in `src/core/theme/utils.ts` (lines 46–48), `src/core/avatars.js`, and `src/core/cosmetics.js` (`reward_avatar_*`).

| File Path | Format | Dimensions | Mode | Size (Bytes / KB) | Mapped Avatar ID | Classification |
| :--- | :--- | :--- | :--- | ---: | :--- | :--- |
| `public/art/avatars/0.webp` | WEBP | `220×220` | RGB | 6,458 B (6.3 KB) | `avatar_fox` ("Foxy") | **Shared UI (Milestone Avatar)** |
| `public/art/avatars/1.webp` | WEBP | `220×219` | RGB | 4,228 B (4.1 KB) | `avatar_frog` ("Kero") | **Shared UI (Milestone Avatar)** |
| `public/art/avatars/2.webp` | WEBP | `220×220` | RGB | 6,026 B (5.9 KB) | `avatar_cat` ("Pixel") | **Shared UI (Milestone Avatar)** |
| `public/art/avatars/3.webp` | WEBP | `219×220` | RGB | 5,486 B (5.4 KB) | `avatar_space` ("Nova") | **Shared UI (Milestone Avatar)** |
| `public/art/avatars/4.webp` | WEBP | `220×220` | RGB | 4,308 B (4.2 KB) | `avatar_robot` ("Bolt") | **Shared UI (Milestone Avatar)** |
| `public/art/avatars/5.webp` | WEBP | `219×220` | RGB | 5,134 B (5.0 KB) | `avatar_bunny` ("Mochi") | **Shared UI (Milestone Avatar)** |
| `public/art/avatars/6.webp` | WEBP | `220×220` | RGB | 7,672 B (7.5 KB) | `avatar_lion` ("Leo") | **Shared UI (Milestone Avatar)** |
| `public/art/avatars/7.webp` | WEBP | `220×219` | RGB | 7,120 B (7.0 KB) | `avatar_owl` ("Ollie") | **Shared UI (Milestone Avatar)** |
| `public/art/avatars/8.webp` | WEBP | `220×220` | RGB | 6,582 B (6.4 KB) | `avatar_penguin` ("Pip") | **Shared UI (Milestone Avatar)** |
| `public/art/avatars/bear.webp` | WEBP | `512×512` | RGBA | 29,568 B (28.9 KB) | `reward_avatar_bear` | **Shared UI (Journey Reward Avatar)** |
| `public/art/avatars/cat.webp` | WEBP | `512×512` | RGBA | 27,790 B (27.1 KB) | `reward_avatar_cat` | **Shared UI (Journey Reward Avatar)** |
| `public/art/avatars/panda.webp` | WEBP | `512×512` | RGBA | 31,028 B (30.3 KB) | `reward_avatar_panda` | **Shared UI (Journey Reward Avatar)** |
| `public/art/avatars/sheet.webp` | WEBP | `512×512` | RGB | 34,230 B (33.4 KB) | Unreferenced contact sheet | **Unused / Contact Sheet** |

#### D. Avatar Portrait Frames (`public/art/premium/frames/*.webp`) — 7 Files
All 7 files are `256×256` transparent RGBA WebP overlays rendered by `PlayerPortrait.tsx` and `CosmeticPreview.tsx`.

| File Path | Format | Dimensions | Mode | Size (Bytes / KB) | Frame ID & Name | Classification |
| :--- | :--- | :--- | :--- | ---: | :--- | :--- |
| `public/art/premium/frames/mint.webp` | WEBP | `256×256` | RGBA | 19,250 B (18.8 KB) | `frame_mint` ("Mint Club" — 50 Permen) | **Shared UI (Avatar Frame)** |
| `public/art/premium/frames/sunset.webp` | WEBP | `256×256` | RGBA | 24,744 B (24.2 KB) | `frame_sunset` ("Golden Hour" — 75 Permen) | **Shared UI (Avatar Frame)** |
| `public/art/premium/frames/moon.webp` | WEBP | `256×256` | RGBA | 25,516 B (24.9 KB) | `frame_moon` ("Moonlit" — 70 Permen) | **Shared UI (Avatar Frame)** |
| `public/art/premium/frames/autumn.webp` | WEBP | `256×256` | RGBA | 15,926 B (15.6 KB) | `frame_autumn` ("Autumn Wreath" — 65 Permen) | **Shared UI (Avatar Frame)** |
| `public/art/premium/frames/enchanted.webp` | WEBP | `256×256` | RGBA | 17,254 B (16.8 KB) | `frame_enchanted` ("Enchanted Ring" — 80 Permen) | **Shared UI (Avatar Frame)** |
| `public/art/premium/frames/arcade.webp` | WEBP | `256×256` | RGBA | 12,500 B (12.2 KB) | `frame_arcade` ("Arcade Loop" — 70 Permen) | **Shared UI (Avatar Frame)** |
| `public/art/premium/frames/frost.webp` | WEBP | `256×256` | RGBA | 16,952 B (16.6 KB) | `frame_frost` ("Frost Halo" — 75 Permen) | **Shared UI (Avatar Frame)** |

---

### 3.6 Unused / Excluded Game Mode & Legacy Feature Assets — 139 Files

> Note: In addition to the 130 files itemized in subsections A–F below, **9 legacy/redundant files** counted in earlier sections (`public/logo.png`, `public/brand/{logo,permen,startup}.webp`, the 4 `sheet.webp` classic theme atlases, and `public/art/avatars/sheet.webp`) bring the total excluded non-production runtime files to **139 files (3,475.4 KB)** before counting the 36 offline `scripts/art-originals/` files. (The 4 unused UI icons in `public/art/premium/ui/` — `block.webp`, `memory.webp`, `fruit-merge.webp`, `multiplayer.webp` — plus the 4 `src/assets/vanilla/logo/chest_*.png` icons are documented in §3.2 and excluded in `ASSET_MIGRATION_PLAN.md`.)

#### A. Infinity / Star Patrol Space Shooter (`public/art/infinity/` & `public/art/star-patrol/`) — 80 Files
- **`public/art/infinity/` (51 files, 2,398.6 KB):**
  - **6 Sector Backgrounds (`720×1020` RGB WEBP, 58.3 KB total):** `background-aurora.webp` (9,518 B), `background-crown.webp` (9,958 B), `background-eclipse.webp` (9,120 B), `background-jade.webp` (9,672 B), `background-rift.webp` (9,586 B), `background-solar.webp` (10,434 B). *(Note: Can optionally be repurposed as cosmic game backgrounds or archived to the Asset Library).*
  - **24 Ship, Enemy, Boss & Powerup Sprites (`336×336` RGBA PNG, 2,326.8 KB total):** `bomber.png` (78,148 B), `boss-crown.png` (121,655 B), `boss-eclipse.png` (96,565 B), `boss-helios.png` (154,358 B), `boss-kraken.png` (116,315 B), `boss-manta.png` (104,005 B), `boss-serpent.png` (128,923 B), `companion.png` (94,830 B), `coral.png` (81,055 B), `cruiser.png` (80,236 B), `drone.png` (23,907 B), `glacier.png` (77,917 B), `guardian.png` (68,184 B), `interceptor.png` (60,371 B), `mint.png` (89,610 B), `phantom.png` (112,008 B), `power-beam.png` (130,016 B), `power-drone.png` (150,348 B), `power-rapid.png` (123,715 B), `power-shield.png` (114,026 B), `power-spread.png` (133,087 B), `scout.png` (94,643 B), `solar.png` (106,155 B), `wasp.png` (42,844 B).
  - **21 Projectile & HUD Effect Sprites (`128×128` RGBA PNG, 13.5 KB total):** `beam.png` (593 B), `cannon.png` (988 B), `flame.png` (576 B), `hazard.png` (692 B), `heal.png` (664 B), `hull.png` (937 B), `laser-blue.png` (436 B), `laser-green.png` (439 B), `laser-red.png` (439 B), `missile.png` (649 B), `nova.png` (1,229 B), `rapid.png` (611 B), `recovery.png` (1,179 B), `shield.png` (940 B), `shot-coral.png` (642 B), `shot-glacier.png` (501 B), `shot-mint.png` (846 B), `shot-phantom.png` (459 B), `shot-scout.png` (419 B), `shot-solar.png` (779 B), `spark.png` (960 B).
- **`public/art/star-patrol/` (29 files, 47.9 KB):**
  - Legacy Kenney Space Shooter PNG sprites referenced only in `design_guidelines.json` (superseded by `public/art/infinity/`): `bolt_gold.png` (`19×30`, 559 B), `enemyBlack3.png` (`103×84`, 3,548 B), `enemyGreen2.png` (`104×84`, 3,059 B), `enemyRed1.png` (`93×84`, 3,096 B), `fire00.png`–`fire05.png` (`14×31`–`16×40`, 3,578 B total), `laserBlue01.png` (`9×54`, 744 B), `laserGreen01.png` (`37×38`, 709 B), `laserRed01.png` (`9×54`, 735 B), `meteorGrey_big1.png` (`101×84`, 1,786 B), `pill_green.png` (`22×21`, 512 B), `playerShip1_blue.png` (`99×75`, 2,698 B), `playerShip1_orange.png` (`99×75`, 2,578 B), `playerShip2_green.png` (`112×75`, 3,800 B), `playerShip2_red.png` (`112×75`, 3,797 B), `playerShip3_blue.png` (`98×75`, 2,834 B), `playerShip3_red.png` (`98×75`, 2,852 B), `powerupBlue_shield.png` (`34×33`, 584 B), `powerupYellow_bolt.png` (`34×33`, 565 B), `shield3.png` (`144×137`, 3,623 B), `shield_gold.png` (`30×30`, 795 B), `star2.png` (`25×24`, 345 B), `star_gold.png` (`31×30`, 675 B), `stars.png` (`256×256`, 2,515 B), `ufoRed.png` (`91×91`, 3,050 B).

#### B. Memory Flip Card Assets (`public/art/premium/cards/*.webp`) — 6 Files (122.1 KB)
- All `248×368` RGBA WEBP: `arcade.webp` (25,464 B), `autumn.webp` (29,808 B), `celestial.webp` (23,226 B), `deck.webp` (12,934 B), `front.webp` (7,926 B), `mint.webp` (25,638 B).
- **Classification:** **Unused Mode (Memory Flip)** — Exclude from APK, preserve in Asset Library.

#### C. Fruit Merge Basket Skins (`public/art/premium/baskets/*.webp`) — 6 Files (63.0 KB)
- All RGBA WEBP: `candy.webp` (`269×332`, 13,126 B), `frost.webp` (`266×332`, 9,090 B), `meadow.webp` (`269×336`, 11,272 B), `night.webp` (`264×329`, 7,868 B), `pixel.webp` (`266×332`, 9,144 B), `rattan.webp` (`268×335`, 13,962 B).
- **Classification:** **Unused Mode (Fruit Merge)** — Exclude from APK, preserve in Asset Library.

#### D. Legacy Chests (`public/art/chests/` & `public/art/premium/chests/`) — 6 Files (229.3 KB)
- `public/art/chests/common.webp` (`512×512`, 52,456 B), `epic.webp` (`512×512`, 62,510 B), `rare.webp` (`512×512`, 50,486 B) — **Unused Legacy Chests**.
- `public/art/premium/chests/common.webp` (`256×256`, 21,414 B), `rare.webp` (`256×256`, 23,054 B) — **Unused**.
- `public/art/premium/chests/epic.webp` (`256×256`, 24,880 B) — **Active in Shared UI** (`LoginRewardCard.tsx` & `BRAND_LOGOS.gift`).

#### E. Legacy Vector Prototypes (`public/art/atelier/*.svg`) — 9 Files (5.9 KB)
- `ceramic.svg` (472 B), `confetti.svg` (702 B), `jelly.svg` (541 B), `mint.svg` (630 B), `mochi.svg` (1,146 B), `orbit.svg` (985 B), `stars.svg` (516 B), `sunset.svg` (581 B), `wood.svg` (446 B).
- **Classification:** **Unused Early SVG Prototypes** (superseded by `public/art/premium/`).

---

### 3.7 Offline Generation Source Sheets (`scripts/art-originals/`) — 36 Files (17,545.6 KB)

All 36 files in `scripts/art-originals/` are raw high-resolution AI generation sprite sheets and QA contact sheets used by `scripts/prepare_*.py`. None are referenced at runtime.

| File Path | Format | Dimensions | Size (Bytes / KB) | Role |
| :--- | :--- | :--- | ---: | :--- |
| `scripts/art-originals/avatars-f5ba26...jpg` | JPG | `1024×1024` | 477,896 B (466.7 KB) | Source sheet for `premium/avatars` |
| `scripts/art-originals/avatars.jpg` | JPG | `1024×1024` | 764,758 B (746.8 KB) | Earlier source iteration |
| `scripts/art-originals/bakery-cfa52b...jpg` | JPG | `1024×1024` | 533,472 B (521.0 KB) | Source sheet for `premium/bakery` |
| `scripts/art-originals/bakery.jpg` | JPG | `1024×1024` | 993,237 B (970.0 KB) | Earlier source iteration |
| `scripts/art-originals/baskets-review.jpg` | JPG | `780×190` | 29,940 B (29.2 KB) | QA review strip |
| `scripts/art-originals/baskets-v1.png` | PNG | `1408×768` | 477,038 B (465.9 KB) | Earlier source sheet |
| `scripts/art-originals/baskets.png` | PNG | `1408×768` | 477,368 B (466.2 KB) | Source sheet for `premium/baskets` |
| `scripts/art-originals/brand-0561c9...jpg` | JPG | `1024×1024` | 216,174 B (211.1 KB) | Source sheet for `premium/brand/mark.webp` |
| `scripts/art-originals/details-5cc50b...jpg` | JPG | `1024×1024` | 387,523 B (378.4 KB) | Source sheet for `frames`, `effects`, `chests` |
| `scripts/art-originals/fruit-82474f...jpg` | JPG | `1024×1024` | 435,961 B (425.7 KB) | Source sheet for `premium/fruit` |
| `scripts/art-originals/fruit-merge-review.jpg` | JPG | `960×270` | 38,705 B (37.8 KB) | QA review strip |
| `scripts/art-originals/fruit-merge.jpg` | JPG | `1024×1024` | 465,212 B (454.3 KB) | Source sheet for `premium/fruit-merge` |
| `scripts/art-originals/fruit.jpg` | JPG | `1024×1024` | 669,100 B (653.4 KB) | Earlier source iteration |
| `scripts/art-originals/galaxy-48b4a6...jpg` | JPG | `1024×1024` | 411,249 B (401.6 KB) | Source sheet for `premium/galaxy` |
| `scripts/art-originals/galaxy.jpg` | JPG | `1024×1024` | 940,767 B (918.7 KB) | Earlier source iteration |
| `scripts/art-originals/meadow-34a6d0...jpg` | JPG | `1024×1024` | 437,149 B (426.9 KB) | Source sheet for `premium/meadow` |
| `scripts/art-originals/meadow.jpg` | JPG | `1024×1024` | 729,366 B (712.3 KB) | Earlier source iteration |
| `scripts/art-originals/memory-cards.jpg` | JPG | `1264×848` | 553,778 B (540.8 KB) | Source sheet for `premium/cards` |
| `scripts/art-originals/memory-review.jpg` | JPG | `1080×300` | 73,887 B (72.2 KB) | QA review strip |
| `scripts/art-originals/review.jpg` | JPG | `960×2240` | 500,280 B (488.6 KB) | Master QA contact sheet |
| `scripts/art-originals/sakura-9b3a80...jpg` | JPG | `1024×1024` | 469,261 B (458.3 KB) | Source sheet for `premium/sakura` |
| `scripts/art-originals/sakura.jpg` | JPG | `1024×1024` | 752,022 B (734.4 KB) | Earlier source iteration |
| `scripts/art-originals/seasonal-049e21...jpg` | JPG | `1024×1024` | 597,680 B (583.7 KB) | Source sheet for seasonal avatars/frames/surfaces/effects |
| `scripts/art-originals/seasonal-1a4f22...jpg` | JPG | `1024×1024` | 519,621 B (507.4 KB) | Source sheet for `alpine_winter` |
| `scripts/art-originals/seasonal-20a710...jpg` | JPG | `1024×1024` | 518,879 B (506.7 KB) | Source sheet for `magic_atelier` |
| `scripts/art-originals/seasonal-5d4717...jpg` | JPG | `1024×1024` | 451,351 B (440.8 KB) | Source sheet for `retro_arcade` |
| `scripts/art-originals/seasonal-94f933...jpg` | JPG | `1024×1024` | 533,154 B (520.7 KB) | Source sheet for `autumn_harvest` |
| `scripts/art-originals/seasonal-review.jpg` | JPG | `960×1400` | 294,846 B (287.9 KB) | Seasonal QA contact sheet |
| `scripts/art-originals/surfaces-105cde...jpg` | JPG | `1024×1024` | 447,768 B (437.3 KB) | Source sheet for `premium/surfaces` |
| `scripts/art-originals/surfaces.jpg` | JPG | `1024×1024` | 447,768 B (437.3 KB) | Duplicate of `surfaces-105cde...jpg` |
| `scripts/art-originals/ui-a46b69...jpg` | JPG | `1024×1024` | 520,088 B (507.9 KB) | Source sheet for `premium/ui` |
| `scripts/art-originals/ui.jpg` | JPG | `1024×1024` | 520,088 B (507.9 KB) | Duplicate of `ui-a46b69...jpg` |
| `scripts/art-originals/infinity/arsenal.jpg` | JPG | `1264×848` | 623,782 B (609.2 KB) | Source sheet for Infinity arsenal |
| `scripts/art-originals/infinity/enemies.jpg` | JPG | `1264×848` | 573,734 B (560.3 KB) | Source sheet for Infinity enemies |
| `scripts/art-originals/infinity/players.jpg` | JPG | `1264×848` | 545,319 B (532.5 KB) | Source sheet for Infinity ships |
| `scripts/art-originals/infinity/reinforcements.jpg` | JPG | `1264×848` | 538,421 B (525.8 KB) | Source sheet for Infinity reinforcements |

---

## 4. Non-File Visual, Typography, Animation & Audio Assets

| System / Asset Type | Source Location | Format / Technology | Details & Android Reuse Classification |
| :--- | :--- | :--- | :--- |
| **Web Audio Synthesizer (`ClubSynth`)** | `src/core/audio/ClubSynth.ts`, `src/core/audio/AudioEngine.tsx` | Web Audio API (`OscillatorNode`, `DynamicsCompressorNode`) | Zero external `.mp3`/`.ogg` files exist in the repo. All BGM (`menu` @ 84 BPM, `game` @ 102 BPM) and 11 SFX cues (`click`, `place`, `match`, `split`, `clear`, `combo`, `win`, `lose`, `wrong`, `shuffle`, `purchase`) are synthesized procedurally in real time. **Reuse & extend for Onet + Match 3.** |
| **Typography (`Fredoka`, `Outfit`, `JetBrains Mono`)** | `index.html` (lines 13–15), `src/index.css`, `design_guidelines.json` | Google Fonts CSS2 (`Fredoka:wght@400..700`, `Outfit:wght@400..900`) | Headline font `Fredoka` + UI/Body font `Outfit`. For offline Android APK reliability, bundle local `.woff2` font files alongside the stylesheet. |
| **Vector UI Iconography** | `package.json` (`lucide-react: ^1.16.0`) | Inline SVG React Components | Used across HUD, modals, navigation, star ratings, timers, lock badges, and directional arrows (`ArrowUp`). **Directly reusable.** |
| **Onet SVG Path & Ring Animation** | `src/game/components/OnetBoard.tsx`, `backup_onet_animation/ConnectAnimationSnippet.tsx` | Procedural SVG `<motion.path>` + `TileBurst.tsx` | Dual-stroke connection path (`8px` white outer glow + `4px` themed core), origin/destination rounded square pulse rings (`generateRingPath`), 8-particle burst + 4-quadrant image shard clip-path split (`TileBurst.tsx`). **Directly reusable.** |
| **Inline Base64 Boot Logo** | `index.html` (line 121) | Data URI (`data:image/png;base64,...`, ~32 KB) | Hidden fallback `<img>` inside `#static-loader` while `/art/premium/brand/mark.webp` is visible. Can be removed in favor of bundled local `mark.webp` to save 32 KB in `index.html`. |
