# Connectify Android — Theme & Cosmetics Collection Design (`THEME_COLLECTION_DESIGN.md`)

**Author:** Agent 07 — Game Art Director & Senior Visual Designer (`@art-director`)  
**Target Config Output (Phase 3):** `src/config/themes.config.ts` & `src/services/theme/`  
**Cross-References:** `ASSET_INVENTORY.md`, `ASSET_MIGRATION_PLAN.md`, `VISUAL_DESIGN_SYSTEM.md`, `ECONOMY_DESIGN.md`, `GAME_FEEL_AND_AUDIO_SPEC.md`  
**Date:** 2026-11-12

---

## 1. Unified Theme Architecture (Shared Onet + Match 3 + Mix-and-Match Cosmetics)

In `connectify-android`, every theme is a **complete sensory bundle** constructed 100% from verified existing assets in `/root/.gemini/antigravity/scratch/connectify-new`:
1. **Shared Tile Set (`onet` + `match3`):**
   - **Onet Connect** uses `10–16` tiles from the theme's sprite directory (`0..15`).
   - **Match 3 Puzzle** draws from the exact same theme using a **hand-curated `match3TileIndices: [i0, i1, i2, i3, i4, i5]`** subset of **6 high-contrast, silhouette-distinct tiles** so every Match 3 board reads cleanly during rapid cascades without requiring separate Match 3 asset packs.
2. **Board Surface & Tile Frame:** Pairs a tactile board background color with a subtle `public/art/surfaces/*.webp` or `skins/*.webp` overlay (`256×256` RGBA).
3. **Game Screen Background & Light/Dark Support:** Defines main screen gradient stops layered subtly with `global_background.webp` (`5%–10%` soft pattern) and automatic dark-mode contrast fallback.
4. **UI Accent Palette:** Drives path glow, selection ring, progress bars, level badges, and combo callouts.
5. **Matching Burst & Trail Effect:** Pairs each theme with a matching `public/art/effects/*.webp` particle sprite and `TileBurst` ring color.
6. **Procedural `ClubSynth` Sound Pairing:** Pairs each theme with a subtle `ClubSynth` audio preset (`timbre`, `rootOffsetSemitones`, `echoMix`) so themes *feel* subtly distinct (e.g., bright bell chimes on *Alpine Winter*, chiptune square pulse on *Retro Arcade*, warm marimba triangle on *Autumn Harvest*) with **zero static `.mp3`/`.ogg` overhead**.
7. **Equip Mode (Shared vs. Per-Game):** Players can **Equip for Both Games** (default 1-tap action in Collection) OR toggle **Onet Only / Match 3 Only** independently, storing `{ globalThemeId, onetThemeId?, match3ThemeId?, surfaceId, effectId, avatarId, frameId }` in `LocalPersistenceEngine`.

---

## 2. Complete Catalog of All 19 Canonical Themes

### 2.1 Rarity & Unlock Summary Table (Aligned 1:1 with `ECONOMY_DESIGN.md` §6.1)

| # | Theme ID | Display Name | Rarity Tier | Unlock Method / Price | Tiles (Onet / M3) | Support Scope |
| :-: | :--- | :--- | :--- | :--- | :---: | :--- |
| 1 | `sweets` | **Summer Club** | **Starter (Free)** | `0 Coins` (Day 1 Default) | `15` / `6` | Shared (Onet + Match 3) |
| 2 | `meadow` | **Meadow Atelier** | **Starter (Free)** | `0 Coins` (Day 1 Unlocked) | `16` / `6` | Shared (Onet + Match 3) |
| 3 | `reward_sakura` | **Sakura Reward** | **Milestone** | Clear Level 3 (Onet or Match 3) | `10` / `6` | Shared (Onet + Match 3) |
| 4 | `reward_bakery` | **Bakery Reward** | **Milestone** | Clear Level 5 (Onet or Match 3) | `10` / `6` | Shared (Onet + Match 3) |
| 5 | `reward_galaxy` | **Galaxy Reward** | **Milestone** | Unlock 3 Achievements | `10` / `6` | Shared (Onet + Match 3) |
| 6 | `reward_meadow` | **Meadow Reward** | **Milestone** | Day 3 Login Streak | `10` / `6` | Shared (Onet + Match 3) |
| 7 | `reward_fruit` | **Fruit Reward** | **Milestone** | Day 7 Login Streak | `10` / `6` | Shared (Onet + Match 3) |
| 8 | `ocean` | **Ocean Friends** | **Common** | `60 Coins` | `16` / `6` | Shared (Onet + Match 3) |
| 9 | `forest` | **Forest Tales** | **Common** | `80 Coins` | `16` / `6` | Shared (Onet + Match 3) |
| 10 | `candy` | **Candy Parade** | **Common** | `80 Coins` | `16` / `6` | Shared (Onet + Match 3) |
| 11 | `space` | **Cosmic Trip** | **Rare** | `100 Coins` | `16` / `6` | Shared (Onet + Match 3) |
| 12 | `fruit` | **Fruit Market** | **Rare** | `100 Coins` | `16` / `6` | Shared (Onet + Match 3) |
| 13 | `bakery` | **Petite Bakery** | **Rare** | `110 Coins` | `16` / `6` | Shared (Onet + Match 3) |
| 14 | `sakura` | **Sakura Atelier** | **Rare** | `120 Coins` | `16` / `6` | Shared (Onet + Match 3) |
| 15 | `autumn_harvest` | **Autumn Harvest** | **Rare** | `120 Coins` | `16` / `6` | Shared (Onet + Match 3) |
| 16 | `alpine_winter` | **Alpine Winter** | **Epic** | `130 Coins` | `16` / `6` | Shared (Onet + Match 3) |
| 17 | `retro_arcade` | **Retro Arcade** | **Epic** | `140 Coins` | `16` / `6` | Shared (Onet + Match 3) |
| 18 | `galaxy` | **Midnight Galaxy** | **Epic** | `150 Coins` | `16` / `6` | Shared (Onet + Match 3) |
| 19 | `magic_atelier` | **Magic Atelier** | **Epic** | `150 Coins` | `16` / `6` | Shared (Onet + Match 3) |

> **Future Bonus Expansion (In `assets-library/`):** `fruit-merge` (`16` WebPs, `256×256` RGBA) can be added post-launch as **Orchard Evolution** (`100 Coins`, Rare) using zero new art generation.

---

### 2.2 Detailed Theme Specifications (Visuals, Palettes, Audio & Previews)

#### 1. `sweets` — **Summer Club** *(Starter / Free)*
- **Tile Set:** `public/art/themes/sweets/` (`15` sprites converted from `vanilla/tiles/*.png`: `beach_ball`, `beach_hat`, `camera`, `coconut`, `crab`, `ice_cream`, `sandal`, `seagull`, `seashell`, `summer_shirt`, `summer_shorts`, `sunglasses`, `swim_ring`, `tropical_fish`, `tropical_juice`)
- **Match 3 Curated 6:** `[beach_ball, camera, crab, ice_cream, seashell, tropical_fish]` (distinct warm/cool silhouettes)
- **Game Background & Board Surface:** Warm sky-cream `#FFF5F8 -> #FFF9FB` + `surfaces/cloud.webp` (`#FCE7F3` tray tint)
- **UI Accents:** Primary `#FF6B8A` (Strawberry Rose), Secondary `#39C6C8` (Poolside Teal), Selected Ring `#FF4D79`, Tile Fill `#FFFFFF`
- **Matching Effect Pairing:** `effects/confetti.webp` (`#FF6B8A` + `#FFD84D` burst)
- **`ClubSynth` Audio Pairing:** `Club Classic` — `'triangle'` lead, `0` semitone shift, sunny major triad decay
- **Preview Metadata:** `tagline: "Cerah, segar, klasik Connectify!"` · `preview4: [beach_ball, crab, ice_cream, tropical_fish]` · `recommendedAvatar: bear / cat`

#### 2. `meadow` — **Meadow Atelier** *(Starter / Free)*
- **Tile Set:** `public/art/themes/meadow/` (`16` Atelier WebPs: `0..15` botanical & woodland critters)
- **Match 3 Curated 6:** `[0, 3, 6, 9, 12, 14]`
- **Game Background & Board Surface:** Fresh sage cream `#F3FBF4 -> #E9F7EC` + `surfaces/cloud.webp` (`#D8F0DE` board tray)
- **UI Accents:** Primary `#2E9E5B`, Secondary `#F4A236`, Selected Ring `#16A34A`, Tile Fill `#FFFEFA`
- **Matching Effect Pairing:** `effects/blossom.webp` (`#67D58A` burst)
- **`ClubSynth` Audio Pairing:** `Meadow Flute` — warm `'triangle'` + soft `'sine'` octave-up harmonic (`echoMix: 0.32`)
- **Preview Metadata:** `tagline: "Hijau lembut bernuansa taman pagi"` · `preview4: [0, 3, 6, 12]` · `recommendedFrame: frame_mint`

#### 3–7. **Milestone Reward Editions (`reward_sakura`, `reward_bakery`, `reward_galaxy`, `reward_meadow`, `reward_fruit`)**
All 5 Milestone themes wrap the `10` bespoke `512→256px` high-detail hero illustrations (`0.webp`–`9.webp`) unlocked organically through `ART_REWARDS` milestones (`0 Coins`!):
- **`reward_sakura` (Lvl 3 Reward):**
  - Tiles: `public/art/themes/reward_sakura/0..9.webp` · Match 3 Subset (6): `[0, 1, 3, 5, 7, 9]`
  - Board/BG: Soft petal blush `#FFF1F5 -> #FFE4EC` + `surfaces/jelly.webp` · Accent `#EC4899` / `#F472B6` · Effect `effects/blossom.webp`
  - `ClubSynth`: `Sakura Koto` (`+2` semitone D-major sparkle pluck)
  - Preview: `badge: "Hadiah Level 3"` · `preview4: [0, 2, 5, 8]`
- **`reward_bakery` (Lvl 5 Reward):**
  - Tiles: `public/art/themes/reward_bakery/0..9.webp` · Match 3 Subset (6): `[0, 2, 4, 6, 8, 9]`
  - Board/BG: Buttercream `#FFF8ED -> #FFEDD5` + `surfaces/wood.webp` · Accent `#D97706` / `#FB923C` · Effect `effects/confetti.webp`
  - `ClubSynth`: `Warm Café` (`0` semitones, soft mellow `-2dB` low-pass warmth)
  - Preview: `badge: "Hadiah Level 5"` · `preview4: [0, 1, 4, 7]`
- **`reward_galaxy` (3 Achievements Reward):**
  - Tiles: `public/art/themes/reward_galaxy/0..9.webp` · Match 3 Subset (6): `[0, 1, 4, 5, 7, 8]`
  - Board/BG: Deep starlight `#0B1026 -> #151C3D` + `surfaces/night.webp` · Accent `#818CF8` / `#38BDF8` · Tile Fill `#1E2749` · Effect `effects/stars.webp`
  - `ClubSynth`: `Starlight Pad` (`+5` semitones, lush `'sine'` echo `0.45`)
  - Preview: `badge: "Hadiah 3 Prestasi"` · `preview4: [0, 3, 5, 9]`
- **`reward_meadow` (Day 3 Login Streak Reward):**
  - Tiles: `public/art/themes/reward_meadow/0..9.webp` · Match 3 Subset (6): `[0, 2, 3, 5, 7, 9]`
  - Board/BG: Morning dew `#EFFAF1 -> #DCF4E2` + `surfaces/opal.webp` · Accent `#10B981` / `#84CC16` · Effect `effects/blossom.webp`
  - `ClubSynth`: `Meadow Flute` (`+2` semitone bright lead)
  - Preview: `badge: "Login Hari ke-3"` · `preview4: [0, 2, 5, 7]`
- **`reward_fruit` (Day 7 Login Streak Reward):**
  - Tiles: `public/art/themes/reward_fruit/0..9.webp` · Match 3 Subset (6): `[0, 1, 3, 4, 6, 8]`
  - Board/BG: Citrus sorbet `#FFFBEB -> #FEF3C7` + `surfaces/amber.webp` · Accent `#F59E0B` / `#10B981` · Effect `effects/confetti.webp`
  - `ClubSynth`: `Tropical Marimba` (`+4` semitone bouncy short decay)
  - Preview: `badge: "Login Hari ke-7"` · `preview4: [0, 3, 6, 8]`

#### 8–10. **Common Tier (`60–80 Coins`) — Classic Play Club Sets**
- **`ocean` — Ocean Friends (`60 Coins`):**
  - Tiles: `public/art/themes/ocean/0..15.webp` (`220×220`) · Match 3 Subset (6): `[0, 2, 5, 8, 11, 14]`
  - Board/BG: Seafoam aqua `#ECFEFF -> #CFFAFE` + `surfaces/opal.webp` · Accent `#0284C7` / `#06B6D4` · Tile Fill `#FFFFFF` · Effect `effects/stars.webp`
  - `ClubSynth`: `Lagoon Steelpan` (`-2` semitones, bright `'sine'` shimmer)
  - Preview: `tagline: "Dunia laut biru yang menenangkan"` · `preview4: [0, 5, 11, 14]`
- **`forest` — Forest Tales (`80 Coins`):**
  - Tiles: `public/art/themes/forest/0..15.webp` (`220×220`) · Match 3 Subset (6): `[1, 4, 6, 9, 12, 15]`
  - Board/BG: Woodland moss `#F0FDF4 -> #DCFCE7` + `surfaces/wood.webp` · Accent `#15803D` / `#A16207` · Tile Fill `#FFFDF7` · Effect `effects/autumn.webp`
  - `ClubSynth`: `Woodland Kalima` (`-3` semitones, earthy `'triangle'`)
  - Preview: `tagline: "Petualangan rimba & hewan lucu"` · `preview4: [1, 4, 9, 12]`
- **`candy` — Candy Parade (`80 Coins`):**
  - Tiles: `public/art/themes/candy/0..15.webp` (`220×220`) · Match 3 Subset (6): `[0, 3, 6, 9, 11, 15]`
  - Board/BG: Bubblegum frosting `#FDF2F8 -> #FCE7F3` + `surfaces/candy.webp` · Accent `#DB2777` / `#A855F7` · Tile Fill `#FFFFFF` · Effect `effects/confetti.webp`
  - `ClubSynth`: `Sugar Pop` (`+4` semitones, crisp playful arpeggio)
  - Preview: `tagline: "Permen warna-warni ekstra manis"` · `preview4: [0, 3, 9, 15]`

#### 11–15. **Rare Tier (`100–120 Coins`) — Atelier & Harvest Sets**
- **`space` — Cosmic Trip (`100 Coins`):**
  - Tiles: `public/art/themes/space/0..15.webp` (`220×220`) · Match 3 Subset (6): `[0, 2, 5, 8, 12, 15]`
  - Board/BG: Deep cosmos `#0F172A -> #1E1B4B` (forced dark-friendly high-contrast board) + `surfaces/night.webp` · Accent `#38BDF8` / `#C084FC` · Tile Fill `#1E293B` · Effect `effects/stars.webp`
  - `ClubSynth`: `Orbital Synth` (`-5` semitones, spacey `'sine'` delay)
  - Preview: `tagline: "Jelajah planet dan roket antariksa"` · `preview4: [0, 5, 8, 12]`
- **`fruit` — Fruit Market (`100 Coins`):**
  - Tiles: `public/art/themes/fruit/0..15.webp` (`256×256` RGBA) · Match 3 Subset (6): `[0, 3, 6, 8, 11, 14]`
  - Board/BG: Sunlit orchard `#FFFBEB -> #FEF9C3` + `surfaces/amber.webp` · Accent `#EA580C` / `#16A34A` · Tile Fill `#FFFFFF` · Effect `effects/blossom.webp`
  - `ClubSynth`: `Tropical Marimba` (`+2` semitones, bright pluck)
  - Preview: `tagline: "Buah tropis segar kualitas Atelier"` · `preview4: [0, 6, 11, 14]`
- **`bakery` — Petite Bakery (`110 Coins`):**
  - Tiles: `public/art/themes/bakery/0..15.webp` (`256×256` RGBA) · Match 3 Subset (6): `[1, 4, 7, 10, 13, 15]`
  - Board/BG: Warm patisserie `#FFF7ED -> #FFEDD5` + `surfaces/wood.webp` · Accent `#B45309` / `#F59E0B` · Tile Fill `#FFFDF9` · Effect `effects/confetti.webp`
  - `ClubSynth`: `Warm Café` (`0` semitones, cozy rounded tone)
  - Preview: `tagline: "Kue manis dan pastry hangat"` · `preview4: [1, 4, 10, 13]`
- **`sakura` — Sakura Atelier (`120 Coins`):**
  - Tiles: `public/art/themes/sakura/0..15.webp` (`256×256` RGBA) · Match 3 Subset (6): `[0, 2, 5, 8, 11, 15]`
  - Board/BG: Kyoto spring `#FFF1F2 -> #FFE4E6` + `surfaces/jelly.webp` · Accent `#E11D48` / `#FB7185` · Tile Fill `#FFFFFF` · Effect `effects/blossom.webp`
  - `ClubSynth`: `Sakura Koto` (`+2` semitones pentatonic lift)
  - Preview: `tagline: "Kelopak sakura lembut bergaya Jepang"` · `preview4: [0, 2, 8, 15]`
- **`autumn_harvest` — Autumn Harvest (`120 Coins`):**
  - Tiles: `public/art/themes/autumn_harvest/0..15.webp` (`256×256` RGBA) · Match 3 Subset (6): `[0, 3, 5, 9, 12, 15]`
  - Board/BG: Golden maple `#FFF8EB -> #FDE6C4` + `surfaces/amber.webp` · Accent `#C2410C` / `#D97706` · Tile Fill `#FFFDF8` · Effect `effects/autumn.webp` (`anim_onet_autumn` `#ce7c35`)
  - `ClubSynth`: `Maple Acoustic` (`-2` semitones, warm mellow bell)
  - Preview: `tagline: "Panen musim gugur hangat & nyaman"` · `preview4: [0, 5, 9, 15]` · `recommendedAvatar: hedgehog` · `recommendedFrame: frame_autumn`

#### 16–19. **Epic Tier (`130–150 Coins`) — Signature Collector Sets**
- **`alpine_winter` — Alpine Winter (`130 Coins`):**
  - Tiles: `public/art/themes/alpine_winter/0..15.webp` (`256×256` RGBA) · Match 3 Subset (6): `[0, 2, 6, 9, 12, 14]`
  - Board/BG: Crisp glacier `#F0F9FF -> #E0F2FE` + `surfaces/frost.webp` · Accent `#0369A1` / `#38BDF8` · Tile Fill `#FFFFFF` · Effect `effects/snow.webp` (`anim_onet_snow` `#53b4cb`)
  - `ClubSynth`: `Crystal Chime` (`+7` semitones bell shimmer)
  - Preview: `tagline: "Salju pegunungan berkilau dingin"` · `preview4: [0, 6, 9, 14]` · `recommendedAvatar: polar-cub` · `recommendedFrame: frame_frost`
- **`retro_arcade` — Retro Arcade (`140 Coins`):**
  - Tiles: `public/art/themes/retro_arcade/0..15.webp` (`256×256` RGBA) · Match 3 Subset (6): `[0, 3, 6, 8, 11, 15]`
  - Board/BG: Midnight cabinet `#0F172A -> #1E293B` + `surfaces/pixel.webp` · Accent `#38BDF8` / `#F43F5E` · Tile Fill `#1E293B` · Effect `effects/pixel.webp` (`anim_onet_pixel` `#438bc1`)
  - `ClubSynth`: `8-Bit Chiptune` (`'square'` soft duty wave at `vol * 0.55`, crisp staccato)
  - Preview: `tagline: "Nostalgia pixel art arcade neon"` · `preview4: [0, 6, 11, 15]` · `recommendedAvatar: robot` · `recommendedFrame: frame_arcade`
- **`galaxy` — Midnight Galaxy (`150 Coins`):**
  - Tiles: `public/art/themes/galaxy/0..15.webp` (`256×256` RGBA) · Match 3 Subset (6): `[0, 2, 4, 7, 10, 13]`
  - Board/BG: Nebula violet `#090D1F -> #1B1438` + `surfaces/night.webp` · Accent `#A855F7` / `#38BDF8` · Tile Fill `#192140` · Effect `effects/stars.webp`
  - `ClubSynth`: `Nebula Pad` (`+5` semitones atmospheric echo)
  - Preview: `tagline: "Rasi bintang bercahaya di malam pekat"` · `preview4: [0, 4, 10, 13]` · `recommendedAvatar: orbit` · `recommendedFrame: frame_moon`
- **`magic_atelier` — Magic Atelier (`150 Coins`):**
  - Tiles: `public/art/themes/magic_atelier/0..15.webp` (`256×256` RGBA) · Match 3 Subset (6): `[0, 3, 6, 9, 12, 14]`
  - Board/BG: Arcane velvet `#17102E -> #2A1B4E` + `surfaces/enchanted.webp` · Accent `#C084FC` / `#FBBF24` · Tile Fill `#251A45` · Effect `effects/magic.webp` (`anim_onet_magic` `#a178cb`)
  - `ClubSynth`: `Arcane Celesta` (`+3` semitones mystical triangle+sine shimmer)
  - Preview: `tagline: "Ramuan berkilau & buku sihir kuno"` · `preview4: [0, 6, 9, 14]` · `recommendedAvatar: wizard-owl` · `recommendedFrame: frame_enchanted`

---

## 3. Board Surfaces, Match Effects, Avatars & Frames Catalog

All auxiliary cosmetics work across **both Onet and Match 3** and mirror `ECONOMY_DESIGN.md` §6.2 pricing:

### 3.1 Board Surfaces & Tile Skin Materials (22 Assets)
- **Board Surfaces (`public/art/surfaces/` — `256×256` RGBA):**
  - *Pearl Cloud* (`cloud.webp`, Starter `0`), *Rose Jelly* (`jelly.webp`, Common `80`), *Amber Glass* (`amber.webp`, Common `80`), *Opal Ceramic* (`opal.webp`, Rare `85`), *Pixel Grid* (`pixel.webp`, Rare `85`), *Frosted Ice* (`frost.webp`, Rare `85`), *Maple Wood* (`wood.webp`, Epic `90`), *Enchanted Velvet* (`enchanted.webp`, Epic `90`), plus companion finishes (`cream.webp`, `candy.webp`, `mint.webp`, `night.webp`, `sunset.webp`) powering Tile Skin Packs (`Pearl 0`, `Strawberry Milk 105`, `Opal 125`, `Amber 130`, `Jade 135`, `Midnight 140`, `Pixel Pop 140`, `Frosted 140`, `Honey 150`, `Enchanted 150`).
- **Legacy Milestone Tile & Arrow Skins (Normalized `256×256` in `public/art/surfaces/`):**
  - `reward_tile1_candy`, `reward_tile1_cloud`, `reward_tile1_cream`, `reward_tile2_mint`, `reward_tile4_night`, `reward_block_wood` (Board/Tile skins) + Onet directional arrow overlays `arrow_mint`, `arrow_night`, `arrow_sunset`.

### 3.2 Matching & Victory Effects (`public/art/effects/*.webp` — 7 Sprites)
- **Starter (`0`):** `effect_blossom` (*Blossom Burst* — `blossom.webp`)
- **Common (`60–65`):** `effect_confetti` (*Club Confetti* — `confetti.webp`, `60`), `effect_stars` (*Star Shower* — `stars.webp`, `65`), `effect_autumn` (*Autumn Drift* — `autumn.webp`, `65`, `#ce7c35`)
- **Rare (`70–75`):** `effect_pixel` (*Pixel Pop* — `pixel.webp`, `70`, `#438bc1`), `effect_snow` (*Frost Bloom* — `snow.webp`, `75`, `#53b4cb`)
- **Epic (`80`):** `effect_magic` (*Magic Orbit* — `magic.webp`, `80`, `#a178cb`)

### 3.3 Avatars (25 Active) & Portrait Frames (7)
- **Starter Free Avatars:** `bear.webp` (*Kai*), `cat.webp` (*Mika*).
- **Atelier & Seasonal Shop Avatars (`60–90 Coins`):** `panda` (Bambu, `60`), `penguin` (Pip, `60`), `mochi` (Mochi, `65`), `shiba` (Kuma, `65`), `fox` (Rubi, `70`), `koala` (Lumi, `75`), `hedgehog` (Hazel, `75`), `robot` (Bip, `80`), `polar-cub` (Snowy, `80`), `orbit` (Orbit, `90`), `wizard-owl` (Prof. Hoot, `90`).
- **Milestone Stat/Journey Avatars (`0 Coins`, unlocked automatically):** `0..8.webp` (`avatar_fox`..`avatar_penguin`) + normalized `reward_avatar_{bear,cat,panda}.webp`.
- **Avatar Frames (`public/art/frames/*.webp` — `50–80 Coins`):** `mint` (50), `autumn` (65), `moon` (70), `arcade` (70), `sunset` (75), `frost` (75), `enchanted` (80).

---

## 4. Shop & Collection Preview Contract

- **Shop Card Thumbnail:** Renders a **2×2 tilted collage** of `preview4` tile indices layered atop the theme's `surfaces/*.webp` backdrop swatch, accompanied by rarity pill (`Starter` / `Milestone` / `Common` / `Rare` / `Epic`), price in `Permen / Connect Coins`, and a `"Onet + Match 3"` dual-support badge.
- **Full Inspection Modal (`ThemePreviewModal`):** Displays a live toggleable **4×4 Complete Tile Grid** (or **Match 3 6-Tile + Board Surface Preview** tab) + particle preview burst button + `"Coba Suara"` (`ClubSynth` preview chord) before purchase, guaranteeing zero blind purchases.
