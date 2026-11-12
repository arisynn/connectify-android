# Connectify Android — Asset Preservation & APK Migration Plan (`ASSET_MIGRATION_PLAN.md`)

**Author:** Agent 07 — Game Art Director & Senior Visual Designer (`@art-director`)  
**Source Repository Audited:** `/root/.gemini/antigravity/scratch/connectify-new` (READ-ONLY)  
**Target Android Project:** `/root/.gemini/antigravity/scratch/connectify-android`  
**Cross-References:** `ASSET_INVENTORY.md`, `TECHNICAL_ARCHITECTURE.md`, `ANDROID_MIGRATION_PLAN.md`, `MATCH3_TECHNICAL_SPEC.md`  
**Date:** 2026-11-12

---

## 1. Migration Objectives & Core Principles

1. **Zero Asset Loss (Full Reusable Library):** All **545 original visual assets (26,235.9 KB / 25.62 MB)** discovered in `connectify-new`—including unused game modes (`Infinity / Star Patrol`, `Fruit Merge`, `Memory Flip`, `Block Puzzle`), legacy chests, SVG prototypes, atlas contact sheets, and `scripts/art-originals/` raw AI generation sheets—are preserved in a versioned, non-bundled archive directory (`/assets-library/`) inside `connectify-android` (outside `src/` and `public/`) so future updates or mini-games can pull them immediately without re-generating art.
2. **Lean Production Android APK:** Only assets strictly required by **Onet Connect**, **Match 3 Puzzle**, **Shared Hub UI**, **Themes & Cosmetics**, **Local Bundled Typography**, and **Android Launcher/Splash Resources** are copied into `public/` and `src/assets/` for Vite bundling into `android/app/src/main/assets/public/`.
3. **100% Offline Determinism:** Zero runtime network requests for images, fonts, or audio. All Google Fonts (`Fredoka`, `Outfit`, `JetBrains Mono`) are bundled as `.woff2` files under `public/fonts/`, and `ClubSynth` generates 100% of music and SFX procedurally via the Web Audio API (`0 bytes` of `.mp3`/`.ogg` required).
4. **Retina-Sharp Mobile Scaling with Minimal Memory Pressure:** Mobile grid tiles render at `38dp–72dp` logical pixels (`~114px–216px` at `xxxhdpi` 3x–4x density). Normalizing oversized `512×512` legacy assets to `256×256` RGBA WebP preserves razor-sharp rendering on flagship screens while cutting decoded GPU texture memory by **75%** per sprite and shrinking APK size by **>1.1 MB**.

---

## 2. Two-Tier Repository Structure (Library vs. Production APK)

```text
connectify-android/
├── assets-library/                      # NON-BUNDLED: 100% preservation of all 545 original assets
│   ├── LIBRARY_INDEX.json               # Machine-readable catalog (original path, hash, dims, license/origin)
│   ├── excluded-modes/
│   │   ├── infinity/                    # 51 files (2,398.6 KB) — Space shooter ships/bosses/sectors
│   │   ├── star-patrol/                 # 29 files (47.9 KB) — Kenney shooter PNGs
│   │   ├── fruit-merge/                 # 16 files + 6 baskets (176.9 KB)
│   │   ├── memory-cards/                # 6 files (122.1 KB)
│   │   └── mode-icons/                  # 4 files: block.webp, memory.webp, fruit-merge.webp, multiplayer.webp
│   ├── legacy-replaced/
│   │   ├── chests/                      # 9 files (legacy chests + vanilla chest PNGs + common/rare)
│   │   ├── vanilla-logos-overridden/    # 12 overridden 256×256 PNGs + public/logo.png
│   │   ├── brand-legacy/                # 3 files in public/brand/
│   │   ├── atelier-svg/                 # 9 SVG prototypes
│   │   └── sheet-atlases/               # 5 contact sheets (candy, forest, ocean, space, avatars)
│   └── art-originals/                   # 36 master source sheets & QA contact sheets (17,545.5 KB)
│
├── public/                              # BUNDLED INTO APK (`dist/` -> `android/app/src/main/assets/public/`)
│   ├── fonts/                           # Local .woff2 fonts (~180 KB total)
│   │   ├── fredoka-latin-wght.woff2     # Weights 400..700 variable (or 500/600/700 subsets)
│   │   ├── outfit-latin-wght.woff2      # Weights 400..900 variable (or 400/500/600/700/800)
│   │   └── jetbrains-mono-latin.woff2   # Tabular numbers for timers/scores (600/700)
│   └── art/
│       ├── brand/                       # mark.webp (640×640), favicon.png (64×64), touch-icon.png (180×180)
│       ├── ui/                          # 13 active HUD/Nav/Booster WebPs (onet, match3[triple], hint, shuffle, hammer, bomb, permen, achievements, missions, collection, theme, notifications, leaderboard) + gift.webp (epic chest)
│       ├── ui-controls/                 # 5 crisp icons converted from vanilla/logo PNGs -> WebP (back, settings, music_on, sound_on, sound_off)
│       ├── themes/                      # Normalized 19 theme tile directories (see §3.2)
│       ├── surfaces/                    # 13 premium surfaces + 9 normalized milestone skins (256×256 WebP)
│       ├── effects/                     # 7 particle sprites (256×256 RGBA WebP)
│       ├── avatars/                     # 13 premium avatars + 12 milestone avatars (256×256 WebP)
│       └── frames/                      # 7 avatar frames (256×256 RGBA WebP)
│
├── src/assets/
│   └── backgrounds/                     # Imported via ES module for immediate Boot/Modal CSS vars
│       ├── global_background.webp       # 1254×1254 (or 1024×1024 WebP q82)
│       └── popup_background.webp        # 1254×1254 (or 1024×1024 WebP q82)
│
└── android/app/src/main/res/            # Generated offline by `scripts/generate-android-icons.mjs`
    ├── mipmap-anydpi-v26/               # Adaptive icon XML + foreground/background layers
    ├── mipmap-{mdpi..xxxhdpi}/          # Legacy + adaptive PNGs generated from `mark.webp`
    └── drawable*/splash*.png            # Branded splash centered on `#FFFAF5`
```

> **Path Compatibility Shim:** `themes.config.ts` maps all legacy paths cleanly (e.g., `/art/premium/ui/triple.webp` -> `/art/ui/match3.webp`, or preserves stable `/art/premium/...` relative paths if preferred during Phase 3 migration; `scripts/migrate-assets.mjs` can either normalize to `/art/themes/...` or mirror `/art/premium/...` deterministically as long as `themes.config.ts` and `public/art/` match 1:1). Using clean normalized paths under `public/art/` is recommended in `connectify-android` since we are building a clean modular TypeScript codebase.

---

## 3. File-by-File Inclusion, Normalization & Exclusion Matrix

### 3.1 Summary of Excluded vs. Included Assets

| Source Group | Original Files | Original Size | Action in `connectify-android` | APK Destination | Post-Migration Size |
| :--- | ---: | ---: | :--- | :--- | ---: |
| `scripts/art-originals/` | 36 | 17,545.5 KB | **Archive to `assets-library/art-originals/`** | Excluded from APK | 0 KB |
| `public/art/infinity/` + `star-patrol/` | 80 | 2,446.5 KB | **Archive to `assets-library/excluded-modes/`** | Excluded from APK | 0 KB |
| `public/art/premium/{baskets,cards,fruit-merge}/` | 28 | 299.0 KB | **Archive to `assets-library/excluded-modes/`** | Excluded from APK | 0 KB |
| Unused UI mode icons (`block`, `memory`, `fruit-merge`, `multiplayer`) | 4 | 37.7 KB | **Archive to `assets-library/excluded-modes/mode-icons/`** | Excluded from APK | 0 KB |
| Unused Chests (`chests/*`, `premium/chests/{common,rare}`, `vanilla/logo/chest_*`) | 9 | 294.3 KB | **Archive to `assets-library/legacy-replaced/chests/`** | Excluded from APK | 0 KB |
| Contact Sheets (`sheet.webp` × 5) + `atelier/*.svg` (9) + `public/brand/*` (3) + `public/logo.png` (1) | 18 | 398.1 KB | **Archive to `assets-library/legacy-replaced/`** | Excluded from APK | 0 KB |
| Overridden `src/assets/vanilla/logo/*.png` (12 files) | 12 | 269.0 KB | **Archive to `assets-library/legacy-replaced/`** | Excluded from APK | 0 KB |
| Active Vanilla UI PNGs (`back`, `settings`, `music_on`, `sound_on`, `sound_off`) | 5 | 90.8 KB | **Keep & Convert `256×256 PNG` -> `128×128 RGBA WebP`** | `public/art/ui-controls/` | ~24.0 KB |
| Active Premium Brand & UI (`brand/*`, 13 active `ui/*.webp`, `chests/epic.webp`) | 17 | 229.6 KB | **Include (keep WebP; rename `triple.webp` -> `match3.webp`, `epic.webp` -> `gift.webp`)** | `public/art/brand/`, `public/art/ui/` | ~229.6 KB |
| Backgrounds (`src/assets/vanilla/background/*.webp`) | 2 | 134.4 KB | **Include (optionally re-encode `1024×1024` q82 WebP)** | `src/assets/backgrounds/` | ~110.0 KB |
| Vanilla Default Tiles (`sweets`, 15 PNGs) | 15 | 291.3 KB | **Include & Convert `256×256 PNG` -> `256×256 RGBA WebP (q90)`** | `public/art/themes/sweets/` | ~135.0 KB |
| Classic 4 Themes (`candy`, `forest`, `ocean`, `space`, 64 WebPs) | 64 | 241.1 KB | **Include verbatim (`220×220` RGB WebP)** | `public/art/themes/{id}/` | 241.1 KB |
| Atelier 5 Themes (`meadow`, `sakura`, `bakery`, `galaxy`, `fruit`, 80 WebPs) | 80 | 854.6 KB | **Include verbatim (`256×256` RGBA WebP)** | `public/art/themes/{id}/` | 854.6 KB |
| Seasonal 4 Themes (`autumn_harvest`, `magic_atelier`, `retro_arcade`, `alpine_winter`, 64 WebPs) | 64 | 586.3 KB | **Include verbatim (`256×256` RGBA WebP)** | `public/art/themes/{id}/` | 586.3 KB |
| Legacy 5 Reward Themes (`public/art/{sakura,bakery,galaxy,meadow,fruit}`, 50 WebPs) | 50 | 1,700.9 KB | **Include & Normalize `512×512` -> `256×256` RGBA WebP (q85)** | `public/art/themes/reward_{id}/` | ~480.0 KB |
| Board Surfaces & Skins (`premium/surfaces` 13 + `skins` 9) | 22 | 288.5 KB | **Include (`surfaces` verbatim `256×256`; normalize `skins` `512→256` WebP)** | `public/art/surfaces/` | ~195.0 KB |
| Particle Effects (`premium/effects/*.webp`, 7 files) | 7 | 51.5 KB | **Include verbatim (`256×256` RGBA WebP)** | `public/art/effects/` | 51.5 KB |
| Avatars (`premium/avatars` 13 + 12 active `art/avatars`) & Frames (7) | 32 | 396.1 KB | **Include (normalize 3 `512×512` reward avatars to `256×256`)** | `public/art/avatars/`, `public/art/frames/` | ~340.0 KB |
| **NEW: Local Bundled Fonts** (`Fredoka`, `Outfit`, `JetBrains Mono`) | *(New)* 3 | — | **Bundle offline `.woff2` subsets (Latin + numbers/punctuation)** | `public/fonts/` | ~180.0 KB |
| **NEW: Match 3 Obstacle Badge Overlays** (optional lightweight SVGs/WebPs) | *(New)* 5 | — | **Pure CSS/SVG crisp vector badges (`ice`, `wood`, `metal-2`, `metal-1`, `stone`) + reuse `effects/stars` for `gem`** | `src/games/match3/assets/` (inline SVG) | ~6.0 KB |
| **TOTAL PRODUCTION APK ASSET BUDGET** | **361** *(358 kept + 3 fonts; 187 archived = 545 orig)* | *(vs. 26,235.9 KB)* | **~87% footprint reduction from source repo** | **APK `assets/public/`** | **~3,433 KB (~3.35 MB)** |

---

## 4. Handling Match 3 & Onet Shared vs. Game-Specific Assets

### 4.1 Reusing the 19 Tile Themes Across Both Onet & Match 3
- **Onet Connect:** Uses **10 to 16** tiles per level (`getOnetLevelConfig(level)`). Every 15/16-tile theme maps 1:1 to `0..14` or `0..15`. The 5 `reward_*` 10-tile themes work seamlessly on 10-pair levels (or repeat deterministically with distinct frame tinting on 12–16-pair levels).
- **Match 3 Puzzle:** Standard Match 3 boards use **5 or 6** distinct gem/tile types per level (per `MATCH3_TECHNICAL_SPEC.md` and `match3.config.ts`). Rather than creating separate Match 3 sprite sheets from scratch, `themes.config.ts` exports a **pre-curated `match3TileIndices: number[6]`** array for every single one of the 19 themes!
  - **Selection Criterion:** The 6 chosen indices from each theme's 10–16 tiles are hand-picked for **maximum silhouette separation AND maximum perceptual hue distance ($\Delta E > 35$)** so Match 3 boards are instantly scannable in rapid cascades and colorblind-friendly.
  - **Special Tiles (4-Line H/V, L/T Area Bomb, 5-Color Rainbow):** Rendered by compositing the theme's tile sprite with a **crisp procedural vector/CSS aura + badge** (directional striped arrow sheen for Line Bomb, glowing ring + fuse badge reusing `bomb.webp`/spark for Area Bomb, prismatic `magic.webp` / `stars.webp` spinning core for Color Bomb) — adding **0 KB** of extra bitmap weight while automatically adapting to all 19 themes!

### 4.2 Match 3 Board Obstacles & Boosters Mapping
- **Boosters:** Reuses existing high-craft `256×256` RGBA WebP assets:
  - `hint` -> `/art/ui/hint.webp` (Shared Onet + Match 3)
  - `shuffle` -> `/art/ui/shuffle.webp` (Shared Onet + Match 3)
  - `hammer` -> `/art/ui/hammer.webp` (Match 3 single-cell smash / Onet blocked-pair break)
  - `bomb` -> `/art/ui/bomb.webp` (Match 3 3×3 blast / Onet zone blast)
  - `color_burst` -> `/art/effects/stars.webp` composited with rainbow badge (Match 3)
  - `extra_moves` / `+15s` -> Crisp `lucide-react` `Clock` / `PlusCircle` badge inside booster dock pill
- **Obstacles (`ice`, `wood`, `metal-2`, `metal-1`, `stone`, `gem`):**
  - `ice`: Frosted translucent overlay combining `surfaces/frost.webp` tint + crisp SVG crystal crack pattern (`0 KB` extra raster).
  - `wood` & `metal-2`/`metal-1`/`stone`: Styled layered crate/plate overlays referencing `surfaces/wood.webp` (`10.2 KB`), `surfaces/opal.webp`, and `surfaces/night.webp` + SVG rivet/crack decals so Match 3 obstacles inherit Connectify's tactile illustrated aesthetic.
  - `gem`: Uses `themes.config.ts` jewel/star tile or `effects/stars.webp` golden drop icon.

### 4.3 Optional Bonus Theme (`fruit_merge` Reclaim Option)
- `public/art/premium/fruit-merge/` contains **16 crisp `256×256` RGBA WebP fruit-evolution sprites** (`0.webp`–`15.webp`, `113.9 KB` total). While archived in `assets-library/excluded-modes/fruit-merge/` for the initial release scope (`19` canonical themes), it can be promoted to a 20th theme (`"Orchard Evolution"`) in one command without generating new art.

---

## 5. Android Native Launcher Icons & Splash Generation

Generated deterministically during setup/CI by `scripts/generate-android-icons.mjs` (using `sharp` / `Pillow` from `/art/brand/mark.webp` `640×640` RGBA):

1. **Android Adaptive Icon (`res/mipmap-anydpi-v26/ic_launcher.xml` & `ic_launcher_round.xml`):**
   - `<background android:drawable="@color/ic_launcher_background"/>` -> Warm Cream `#FFFAF5` (matches `index.html` `theme-color` and `--club-paper` so launch transition has zero flash).
   - `<foreground android:drawable="@mipmap/ic_launcher_foreground"/>` -> `mark.webp` scaled into the `66%` (`72dp / 108dp`) Android adaptive safe zone with centered optical padding across `mdpi` (`108×108`), `hdpi` (`162×162`), `xhdpi` (`216×216`), `xxhdpi` (`324×324`), and `xxxhdpi` (`432×432`).
2. **Legacy Mipmap Icons (`ic_launcher.png`, `ic_launcher_round.png`):** `48`, `72`, `96`, `144`, `192` px rounded-squircle (`22%` radius) and circular renders on `#FFFAF5` with subtle `#FFE5DC` inner highlight.
3. **Android 12+ Splash Screen (`values-v31/styles.xml` + `drawable/splash_icon.png`):**
   - `windowSplashScreenBackground`: `#FFFAF5`
   - `windowSplashScreenAnimatedIcon`: `288×288` centered `mark.webp` inside the `192×192` circular safe mask.
   - `index.html` removes the 32 KB inline base64 PNG fallback and references `<img src="/art/brand/mark.webp">` directly (instant local WebView file load in `<5ms`), fading smoothly once React mounts and calls `SplashScreen.hide()`.

---

## 6. Automated Migration Script (`scripts/migrate-assets.mjs`) & Preloading Strategy

### 6.1 Deterministic Pipeline (`scripts/migrate-assets.mjs`)
During Phase 3 setup, `@art-director` executes a single idempotent Node/Python pipeline that:
1. Copies all **545 source files** verbatim from `connectify-new` into `connectify-android/assets-library/` and writes `assets-library/LIBRARY_INDEX.json` (verifying SHA-256 checksums, dimensions, and byte counts).
2. Populates `connectify-android/public/art/` and `src/assets/backgrounds/` exclusively with the **370 active/reusable production assets** (normalized: `sweets` PNG -> WebP `q90`, `512×512` legacy `reward_*` / `skins` / 3 `avatars` -> `256×256` RGBA WebP `q85`, 5 active `vanilla/logo` controls -> `128×128` WebP `q90`).
3. Emits a build-time verification report (`assert total public/art size < 3.6 MB`, `assert 0 files from infinity/star-patrol/baskets/cards/art-originals in public/`).
4. Verifies every file path declared in `src/config/themes.config.ts` exists on disk (100% zero broken `<img>` invariant).

### 6.2 Vite & Android Runtime Preloading Tiers

| Preload Tier | When Loaded | Assets Included | Approx. Budget |
| :--- | :--- | :--- | ---: |
| **Tier 0 — Boot Critical** | `index.html` + `App.tsx` mount (`<150ms`) | `brand/mark.webp`, `fonts/*.woff2`, `global_background.webp`, `popup_background.webp`, `ui/{onet,match3,permen}.webp`, active theme's 15/16 tiles + active surface | **~320 KB** |
| **Tier 1 — Hub Ready** | Idle callback right after Home renders | Remaining 10 `ui/*.webp` icons, 5 `ui-controls/*.webp`, equipped avatar + frame, booster icons (`hint`, `shuffle`, `hammer`, `bomb`) | **~220 KB** |
| **Tier 2 — Level Start** | Entering Onet or Match 3 screen | All 16 tiles of equipped theme (`Image().decode()` warmed in parallel), active `effects/*.webp`, `surfaces/*.webp` | **~170 KB** |
| **Tier 3 — On-Demand Shop** | Opening Shop / Collection | Theme preview thumbnails (first 4 tiles of each theme) loaded lazily with `loading="lazy"` + `decoding="async"` | **On demand** |

- **Vite Configuration (`vite.config.ts` coordination):** Set `assetsInlineLimit: 4096` so tiny SVGs/small icons inline while all WebP sprites emit cleanly into `dist/art/` without inflating JS bundle parse time on mobile WebView.
