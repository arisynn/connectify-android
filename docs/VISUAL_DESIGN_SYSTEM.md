# Connectify Android — Visual Design System (`VISUAL_DESIGN_SYSTEM.md`)

**Author:** Agent 07 — Game Art Director & Senior Visual Designer (`@art-director`)  
**Target Platform:** Android Native APK (Capacitor WebView, Portrait Lock, SDK 24–36)  
**Cross-References:** `UI_UX_SPECIFICATION.md`, `GAME_FEEL_AND_AUDIO_SPEC.md`, `THEME_COLLECTION_DESIGN.md`  
**Date:** 2026-11-12

---

## 1. Design Philosophy: "Connectify Play Club — Tactile Atelier"

`connectify-new` evolved across two overlapping visual dialects:
1. **Vanilla Neo-Brutalist (`theme.json`):** Thick `3px–4px #111827` borders, saturated cyan/pink accents (`#39C6C8`, `#FF6B8A`), and hard `4px 5px 0px #000` shadows.
2. **Play Club Warm Editorial (`index.css` / `game-hub.css`):** Warm cream paper (`#FFFAF5`), deep navy ink (`#172337`), generous `18px–24px` radii, and softer `0 3px 0` tactile offset bevels.

For **Connectify Android**, we unify both into **Tactile Atelier**:
- **Warm, inviting canvas (`#FFFAF5`)** paired with **high-craft porcelain/wood/frost game surfaces** so bright illustrated tiles pop effortlessly without visual fatigue.
- **Tactile physicality without clutter:** `2px solid` ink contours and crisp `0 3px 0` bottom-edge depth shadows on interactive buttons and tiles, giving every tap physical toy-like compression (`translateY(2px)`).
- **Board-first clarity:** Menus feel playful and editorial; inside gameplay (`Onet` and `Match 3`), chrome shrinks into compact safe-area bands so **70–75% of the portrait screen** belongs exclusively to crisp, scannable puzzle tiles.

---

## 2. Unified Color System (Light & Dark Modes)

### 2.1 Core Semantic Tokens (`src/styles/tokens.css`)

| CSS Variable | Light Mode (`data-mode="light"`) | Dark Mode (`data-mode="dark"`) | Usage |
| :--- | :--- | :--- | :--- |
| `--club-paper` | `#FFFAF5` | `#0B1220` | Root app background |
| `--club-paper-2` | `#FFF2E6` | `#121C2E` | Subtle gradient stops & secondary surfaces |
| `--club-card` | `#FFFFFF` | `#162238` | Cards, bottom sheets, dialogs, tile wells |
| `--club-card-elevated` | `#FFFBF7` | `#1C2A44` | Active level nodes, hovered shop cards |
| `--club-ink` | `#172337` | `#F4F7FC` | Primary headings, borders on primary CTAs, dark outlines |
| `--club-muted` | `#5E6D82` | `#96A5BC` | Secondary labels, helper captions (`>= 4.6:1` contrast) |
| `--club-line` | `rgba(23, 35, 55, 0.14)` | `rgba(244, 247, 252, 0.14)` | Hairline dividers & inactive container strokes |
| `--club-border-ink` | `#172337` | `#2D3F5E` | Tactile borders on primary buttons, pills & cards |
| `--club-soft-shadow` | `0 4px 0 rgba(23, 35, 55, 0.12)` | `0 4px 0 rgba(0, 0, 0, 0.45)` | Standard card tactile lift |
| `--club-hard-shadow` | `0 3px 0 #172337` | `0 3px 0 #050912` | Interactive CTA & booster button depth |
| `--club-pill` | `#FFF4EA` | `#1D2B44` | Filter chips, tag badges, level badge pills |
| `--club-gold` | `#FFB020` | `#FFC247` | Stars, Permen / Connect Coins highlights, streak badges |
| `--club-success` | `#16A34A` | `#34D399` | Clear checkmarks, match target pulse, valid swaps |
| `--club-warn` | `#F59E0B` | `#FBBF24` | Low timer (`<=15s`), low moves (`<=3`), hint ring |
| `--club-danger` | `#EF4444` | `#F87171` | Critical timer (`<=5s`), defeat badge, invalid shake |

### 2.2 Game-Mode Accent Tokens (`onet` vs. `match3`)

| Mode | `--g-accent` | `--g-accent-press` | `--g-soft` (Light) | `--g-soft` (Dark) | Identity Role |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Onet Connect (`onet`)** | `#FF5B4D` (Coral Punch) | `#E04335` | `#FFF0EC` | `rgba(255, 91, 77, 0.16)` | Warm coral-orange energy for fast path pairing |
| **Match 3 (`match3`)** | `#0EA5E9` (Sky Azure) / `#7C3AED` secondary | `#0284C7` | `#E0F4FE` | `rgba(14, 165, 233, 0.16)` | Crisp cerulean contrast cleanly distinct from Onet coral |

### 2.3 Theme Injection Tokens (Runtime via `ThemeContext.tsx`)
When any of the 19 themes is active, `ThemeContext` overrides board-level tokens (while preserving `--club-ink` and `--club-card` legibility in menus):
- `--color-background-main`: Screen gradient top/bottom tint inside gameplay.
- `--color-background-board`: Outer board tray background (or textured `surfaces/*.webp` layer).
- `--color-background-tile`: Individual tile face fill (e.g., `#FFFFFF` porcelain, `#20294C` night, `#FFF6E6` parchment).
- `--color-tile-border`: Tile 2px frame stroke.
- `--color-tile-selected`: High-contrast focus ring (`#FF4D8D` / `#38BDF8` / `#FACC15`, guaranteed `>= 3:1` against board tray).
- `--color-accent-primary` & `--color-accent-secondary`: Path line core, progress bar fill, and combo badge glow.

---

## 3. Offline Bundled Typography & Scale

All typography loads from **`public/fonts/*.woff2`** via `@font-face` (`font-display: swap`) with zero Google Fonts CDN reliance:

1. **Display & Headlines — `Fredoka` (`500`, `600`, `700`):** Rounded, friendly geometric terminals matching Connectify's illustrated tiles. Used for screen titles, game cards, level headers, combo callouts (`COMBO x5!`), and victory banners.
2. **UI & Body — `Outfit` (`400`, `500`, `600`, `700`, `800`):** Clean, compact geometric sans-serif legible at `11px–16px` on high-DPI Android displays.
3. **Tabular HUD Numerals — `JetBrains Mono` (`600`, `700`) / `font-variant-numeric: tabular-nums`:** Applied strictly to countdown timers (`01:24`), move counters (`18`), live scores (`12,450`), and coin balances so updating digits **never jump horizontally**.

### 3.1 Mobile Type Ramp (`360dp – 430dp` Portrait)

| Role | Font Family | Size | Weight | Line Height | Usage |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `display-hero` | `Fredoka` | `clamp(24px, 6.5vw, 30px)` | `700` | `1.12` | Victory/Defeat modal headlines, Splash brand |
| `title-screen` | `Fredoka` | `clamp(20px, 5.2vw, 24px)` | `700` | `1.18` | Top screen headers, Featured Game Card titles |
| `title-card` | `Fredoka` | `17px` | `600` | `1.22` | Shop item names, Modal section headers |
| `hud-metric` | `JetBrains Mono` | `clamp(16px, 4.4vw, 20px)` | `700` | `1.0` | Timer, Moves Left, Score (`tabular-nums`) |
| `body-ui` | `Outfit` | `14px` | `500` | `1.4` | Descriptions, pre-level briefing, mission goals |
| `label-cta` | `Fredoka` | `15px` | `700` | `1.0` | Primary button labels (`Main Level 14`, `Klaim`) |
| `caption-chip` | `Outfit` | `12px` | `600` | `1.25` | Booster counts, rarity pills, star thresholds |
| `micro-badge` | `Outfit` | `10.5px` | `700` | `1.1` | Small inventory count badges (`x3`), level tag |

---

## 4. Buttons, Cards, Modals & HUD Treatments

### 4.1 Tactile Button Hierarchy (`min-height: 48dp` everywhere)
- **Primary Action CTA:** Height `52dp` (radius `16px`), background `var(--g-accent)` or `#FF5B4D`, white bold `Fredoka` text, `2px solid #172337` outline, bottom shadow `0 4px 0 #172337`. Active press: `transform: translateY(3px); box-shadow: 0 1px 0 #172337`.
- **Secondary Tactile Button:** Height `48dp` (radius `14px`), background `var(--club-card)`, `var(--club-ink)` text, `2px solid var(--club-border-ink)`, shadow `0 3px 0 var(--club-line)`.
- **Icon-Only HUD Button (Pause / Settings / Back):** `48×48dp` hit box (visible pill `40×40dp` centered inside transparent padding if needed for compact visual spacing, **never `<44dp` hit area**).
- **Booster Dock Button (`BoosterDock`):** `56×56dp` rounded square (`16px` radius) featuring the `36×36dp` booster WebP icon (`hint`, `shuffle`, `hammer`, `bomb`), bottom-right stock pill (`#172337` fill, `#FFFFFF` tabular number, or golden `+` badge when stock is `0` to trigger quick-buy sheet without breaking flow).

### 4.2 Cards & Bottom Sheets
- **Standard Card:** `background: var(--club-card)`, `border: 2px solid var(--club-line)`, `border-radius: 20px`, `box-shadow: var(--club-soft-shadow)`, inner padding `14px–16px`.
- **Game Mode Feature Cards (Home):** Distinct tinted upper header band (`var(--g-soft)`), 4-tile tilted theme collage (`rotate(-6deg)` / `rotate(5deg)`), current frontier level badge + star tally, and full-width `48dp` `Main` CTA.
- **Modals & Bottom Sheets:** Backdrop `rgba(11, 18, 32, 0.58)` with light `backdrop-filter: blur(4px)`. Modal card uses `popup_background.webp` subtly masked at `12%` opacity over `--club-card`, `24px` radius, `2.5px` ink border, top handle bar on mobile bottom sheets (`PreLevelSheet`, `ThemePreviewModal`).

### 4.3 Compact In-Game HUD (`GameHeader` — max `56dp` height)
- **Left:** Pause button (`48×48dp` touch zone) + Mode/Level pill (`Lvl 14`).
- **Center:**
  - *Onet:* Countdown timer capsule (`Clock` icon + tabular `01:24`, turns amber `<=15s`, pulses coral-red `<=5s`) stacked above a slim `6px` 3-Star threshold progress meter.
  - *Match 3:* Moves Remaining badge (large tabular numeral) + up to 2–3 compact horizontal Objective Chips (`[TileIcon] 8/12`, `[IceIcon] 4/6`).
- **Right:** Live Score + Streak/Combo pill (`x4` pops in `Fredoka` when `combo >= 2`).

---

## 5. Board Contrast, Silhouette Readability & Accessibility Rules

1. **Tile Cell Aspect & Breathing Room:**
   - Every Onet & Match 3 cell maintains a `1:1` square aspect ratio with `3px–5px` gap on `7×7`–`9×9` Match 3 and `4px` gap on `6×4`–`10×6` Onet boards.
   - Inside every tile frame (`--color-background-tile`), the illustrated WebP sprite sits inside **`10%` padding** (`80%` width/height) so edges never tangle with rounded corners or borders.
2. **Board Tray vs. Tile Luminance Separation (`>= 3:1`):**
   - Light themes pair light porcelain tiles (`#FFFFFF` / `#FFFDF9`) against richer medium-saturated trays (`#FFDDE6`, `#BDE5C8`, `#D6EBFF`) with a crisp `2px` tile frame and `0 3px 0` bottom tile thickness (`3D mahjong bevel`).
   - Dark themes (`space`, `galaxy`, `retro_arcade`, `magic_atelier`) use deep slate/indigo trays (`#0B1026`, `#131836`) paired with luminous crisp-edged tiles (`#1E2749` or `#FFF7ED` cream cards) and subtle `1px rgba(255,255,255,0.22)` top inner highlight so tiles never bleed into the background.
3. **Onet Path & Multi-Cell Clarity:**
   - **Selection State:** `2.5px` bright ring (`--color-tile-selected`) + subtle `scale(1.05)` + soft white outer glow.
   - **Hint Pair Highlight:** Alternating dashed/pulsing gold halo (`#FFB020`) on both matching tiles simultaneously so hint targets never look like manual selection.
   - **SVG Connection Path:** Always drawn in 2 stacked strokes: outer `#FFFFFF` (`8px`, `opacity: 0.92`) + inner `--color-accent-primary` (`4px`), with rounded `12px` quadratic-bezier corners (`generateRoundedPath`) and directional entry/exit square rings (`generateRingPath`) so lines read unmistakably across any dark, pastel, or textured surface.
   - **`openSide` Directional Arrows (Onet L8+):** Render a `18×18dp` high-contrast circular pill (`#172337` background, `#FFFFFF` crisp `ArrowUp/Down/Left/Right` glyph) anchored on the open border edge with a `2px` color halo (`mint`, `night`, or `sunset` when arrow skin is equipped).
   - **2×2 & 1×2 Multi-Cell Split Tiles:** Use the `surfaces/*.webp` or `skins/*.webp` texture gently at `35%` corner tint + `2×` / `4×` micro-badge in top-left corner so players instantly distinguish multi-hit split tiles from standard `1×1` tiles.
4. **Match 3 Special Tiles, Obstacles & Colorblind Support:**
   - **6-Tile Per-Level Curation:** Every theme's `match3TileIndices` selects 6 distinct silhouettes + separated hues (`ΔE >= 35`), guaranteeing zero reliance on color alone.
   - **Special Tile Badges (Never Obscuring Base Sprite > 25%):**
     - *Line Bomb (4-in-a-row):* Horizontal or vertical glowing white twin-stripe overlay + directional arrowhead pips on opposite borders.
     - *Area Bomb (L/T 5-match):* Warm pulsing amber ring + bottom-right miniature `bomb.webp` fuse emblem (`14dp`).
     - *Color Burst (5-in-a-row):* Iridescent conic-gradient aura (`#FF5B4D -> #FFB020 -> #34D399 -> #38BDF8 -> #A855F7`) rotating slowly around a star core (`stars.webp`).
   - **Obstacle Layers:**
     - `ice`: Semi-transparent `#CFEFFF` frosted overlay (`opacity: 0.58`) + crisp white diagonal crystal cracks (`pointer-events: none`); underlying tile remains `>75%` identifiable!
     - `wood` (Crate): Warm textured `#B47B44` wood-slat frame (`surfaces/wood.webp`) with `X`-brace lines.
     - `metal-2` / `metal-1`: Steel `#64748B` riveted plate (`metal-2`) vs. dented cracked plate with sparks (`metal-1`).
     - `stone`: Solid charcoal basalt `#334155` rock block with carved rune bevel (immovable).
     - `gem`: Golden jewel target (`effects/stars.webp` + emerald glow) with downward exit chevron when near bottom row.

---

## 6. Mobile Safe-Area & Responsive Layout Grid

### 6.1 Android WebView Viewport & Safe-Area Rules
```css
:root {
  --safe-top: env(safe-area-inset-top, 0px);
  --safe-bottom: env(safe-area-inset-bottom, 0px);
  --safe-left: env(safe-area-inset-left, 0px);
  --safe-right: env(safe-area-inset-right, 0px);
}
```
- **HTML Viewport:** `<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />`
- **Root App Shell:** `height: 100dvh; overflow: hidden;` inside active Gameplay screens; scrollable vertical content inside Home, Level Select, Shop, Collection, and Profile uses `padding-bottom: calc(80px + var(--safe-bottom))` so bottom cards never hide behind the floating bottom tab bar or Android gesture pill.
- **No Horizontal Overflow & Zero Pull-to-Refresh:** `overscroll-behavior: none; touch-action: manipulation; user-select: none; -webkit-user-select: none;`.

### 6.2 Screen Budget Allocation (Portrait Gameplay, `360dp – 430dp`)
1. **Top Safe-Area + `GameHeader`:** `calc(var(--safe-top) + 56dp)` (`~8%–10%` of viewport)
2. **Board Playfield (`flex: 1` centered square/vertical container):** `~72%–76%` of viewport, dynamically sizing tile cell size via CSS `min()` (`min(calc((100vw - 24px) / cols), calc((100dvh - 180px - var(--safe-top) - var(--safe-bottom)) / rows))`) so **neither Onet `10×6` / `10×8` nor Match 3 `9×9` ever clips or requires scrolling!**
3. **Bottom Thumb-Zone `BoosterDock` + Safe-Area:** `calc(68dp + var(--safe-bottom))` (`~14%–16%` of viewport), placing all 4 tactical boosters right under the player's natural thumb arc.

### 6.3 Responsive Breakpoints
- **Compact (`<= 360px` width or `<= 660px` height):** Reduce board outer padding `12px -> 8px`, tile gap `4px -> 3px`, header font metrics scaled `-1px`, maintain `>= 44dp` visual pill inside `48dp` hit zone.
- **Standard (`361px – 430px`):** Default design tokens.
- **Large Phone / Foldable / Small Tablet (`>= 600px`):** Cap playable board container `max-width: 520px` and Hub feed `max-width: 560px` centered in the viewport so tiles never stretch awkwardly giant.

---

## 7. Micro-Interaction & Motion Guidelines

All animations target **60fps GPU-composited properties only** (`transform`, `opacity`, `clip-path`, SVG `stroke-dashoffset`) — never animate `top`, `left`, `width`, `height`, or `box-shadow` continuously.

| Interaction | Duration & Easing | Visual Motion Specification |
| :--- | :--- | :--- |
| **Button Press / Tile Tap** | `100ms` out, `140ms` spring back | `scale(0.94)` + `translateY(2px)` bevel compression |
| **Onet Pair Match** | `480ms–520ms` choreographed | `0–100ms`: origin SVG ring (`generateRingPath`); `100–280ms`: rounded bezier path (`generateRoundedPath`); `280–380ms`: target ring; `340–480ms`: `TileBurst` ring + 8 particles + 4 clip-path shards |
| **Onet Multi-Cell Split** | `420ms` `cubic-bezier(0.22, 1, 0.36, 1)` | Parent `2×2` or `1×2` splits cleanly into two child half-tiles sliding `6px` outward before settling |
| **Match 3 Valid Swap** | `180ms` spring `(stiffness: 420, damping: 28)` | Selected tile lifts `scale(1.06)`, swaps coordinates smoothly on GPU transform |
| **Match 3 Invalid Swap** | `300ms` elastic bounce | Swaps halfway (`40%`), shakes horizontally (`±4px`), snaps back cleanly |
| **Match 3 Cascade Drop** | `sqrt(dropRows) * 95ms` (`cubic-bezier(0.25, 0.9, 0.35, 1.05)`) | Staggered `18ms` per column with subtle `scaleY(0.92)` landing squash |
| **Victory 3-Star Reveal** | `240ms` step per star (`0ms`, `240ms`, `480ms`) | Empty star slots pop `scale(0.4 -> 1.18 -> 1.0)` + `VictoryBurst` confetti particles |
| **Reduced Motion (`prefers-reduced-motion: reduce` or Settings toggle)** | `120ms` linear | Disables screen shakes, shard spins, and particle arcs; preserves clear `opacity` fade & target ring highlight |
