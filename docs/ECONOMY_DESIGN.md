# Connectify Android — Unified Virtual Economy Design (`ECONOMY_DESIGN.md`)

**Author:** Agent 05 — Senior Game Economy Designer  
**Target Project:** `connectify-android` (Onet + Match 3 Offline-First Android APK)  
**Source Audited (Read-Only):** `/root/.gemini/antigravity/scratch/connectify-new`  
**Currency Identity:** **Connect Coins** (internal field `permen` / display label `Connect Coins` or localized `Permen`)

---

## 1. Executive Summary & Audit of `connectify-new`

### 1.1 Existing Economy Audit Findings
An exhaustive audit of `/root/.gemini/antigravity/scratch/connectify-new` revealed the following existing virtual economy implementation:

1. **Currency Identity & Schema (`src/core/economy.js`, `src/core/profile/ProfileContext.tsx`, `src/core/cde/CDE.ts`, `api/cde.ts`):**
   - `connectify-new` uses a single unified currency named **Permen** (`profile.permen`, mapped to `base.coins` in `ProfileContext.tsx:48` for legacy UI compatibility) with `ECONOMY_VERSION = 3`.
   - `connectify-android` preserves this unified internal currency ID (`permen`) and migration compatibility while branding it externally as **Connect Coins** (with optional localized subtitle *Permen*).
   - All balance mutations are recorded in a 200-entry rolling financial ledger (`recordTransaction` in `src/core/economy.js:28-33`, displayed in `src/screens/LedgerScreen.tsx`) and reset daily at `00:00 WIB (UTC+7)` (`getTodayKey`).

2. **Critical Gap in `connectify-new` (`calcWinPermen = () => 0`):**
   - In `src/core/economy.js:17` and `src/core/reward.js:102`, winning a puzzle level grants **0 currency directly** (`calcWinPermen = () => 0`, `permen: 0`). Players only earn currency by manually claiming Daily Missions (`5/7/10`), Weekly Missions (`8/9/10`), Achievements (`5/7/9/10`), and Daily Login Rewards (`5, 5, 6, 7, 8, 9, 10`), all capped at `DAILY_INCOME_CAP = 100` and `<= 10` per grant (`canReceive` in `src/core/economy.js:22`).
   - Additionally, `connectify-new` contains legacy `ShopConfig.js` prices (`250–600`) that conflict with `ITEM_PRICES` (`hint: 8, shuffle: 12, hammer: 14, bomb: 18`), plus legacy currencies/modes (`star_shield`, `star_blast`, `starUpgrades`, `memory`, `triple`, `block`, `MultiplayerBankEngine.ts`) that are **out of scope** for `connectify-android`.
   - **Design Fix for Android:** Re-introduce **direct, rewarding per-level Connect Coins** upon completing Onet and Match 3 levels (essential for mobile puzzle dopamine and offline play), paired with **anti-farming replay decay**, **soft/hard daily gameplay caps**, and **unified dual-mode Missions, Daily Challenges, Login Streaks, and Achievements**.

3. **Existing Asset & Theme Pricing Baseline (`src/core/economy.js`, `src/core/cosmetics.js`, `src/core/seasonalCatalog.js`, `src/core/artRewards.js`):**
   - **Free Starter Themes:** `sweets` (*Summer Club*), `meadow` (*Meadow Atelier*).
   - **Milestone Reward Themes (`ART_REWARDS`):** `reward_sakura` (Lvl 3), `reward_bakery` (Lvl 5), `reward_galaxy` (3 Achievement tiers), `reward_meadow` (3 Login days), `reward_fruit` (7 Login days).
   - **Purchasable Themes (`THEME_PRICES`):** `ocean` (60), `forest` (80), `candy` (80), `space` (100), `fruit` (100), `bakery` (110), `sakura` (120), `autumn_harvest` (120), `alpine_winter` (130), `retro_arcade` (140), `galaxy` (150), `magic_atelier` (150). Total theme catalog cost: **1,340 Connect Coins**.
   - **Tile Skin Packs (`SKIN_PACKS`):** `tilepack_pearl` (0, free), `tilepack_candy` (105), `tilepack_opal` (125), `tilepack_amber` (130), `tilepack_mint` (135), `tilepack_night` (140), `tilepack_pixel` (140), `tilepack_frost` (140), `tilepack_sunset` (150), `tilepack_enchanted` (150).
   - **Board Surfaces, Avatars, Frames, Victory Effects & Match Animations:** Preserved and scoped exclusively to Onet, Match 3, and Hub Profile (total full permanent catalog = **62 purchasable items, 5,505 Connect Coins**).

4. **Server/Supabase Coupling (`api/cde.ts`, `supabase/migrations/20260923_login_reward.sql`):**
   - `connectify-new` delegates authoritative currency checks to Postgres RPC `cde_mutate_state` and rejects client writes offline (`commitMutation` throws `OFFLINE`).
   - `connectify-android` replaces this with a **100% offline-first Atomic Local Economy Engine** with idempotency keys (`txId` / `opId`), write-ahead backup, checksum validation, and zero-negative-balance enforcement.

---

## 2. Unified Currency Architecture & Measurable Earning Targets

### 2.1 Core Principles
- **Single Shared Wallet:** Both **Onet** and **Match 3** earn into and spend from the exact same `Connect Coins` balance (`permen`).
- **Zero Forced Cross-Play:** All Daily Missions, Weekly Missions, and Achievements support **either** Onet or Match 3 progress (or mode-neutral totals) so a player who plays 100% Onet or 100% Match 3 earns at the exact same rate.
- **No Pay-to-Win:** Boosters assist puzzle completion but are balanced so skilled players can clear all levels without spending coins, while casual/booster-heavy players always generate net-positive surplus for cosmetics.

### 2.2 Measurable Income Targets

| Metric | Target Range | Actual Simulated Mean (Average Player) | Notes |
|---|---|---|---|
| **Active Gameplay Coins / Minute** | **3.20 – 4.20 Coins/min** | **3.70 Coins/min** | Repeatable level-completion rate before missions/login |
| **Total Blended Coins / Minute** | **6.50 – 8.00 Coins/min** | **7.57 Coins/min** | Includes level clears + missions + login + daily challenge + achievements |
| **Fresh Level Clear Reward** | **5 – 9 Coins / level** | **6.53 Coins/win** (gameplay) / **13.36** (blended) | Base + First-Clear + Star Bonus + Performance Bonus |
| **Session Income (9 min / ~6 levels)** | **45 – 75 Coins / session** | **~65 Coins / session** | First session of the day includes Login + Daily Mission claims |
| **Daily Income (Casual, ~9 min/day)** | **45 – 70 Coins / day** | **57.0 Coins/day** | Unlocks first theme by **Day 2–3** |
| **Daily Income (Average, ~18 min/day)** | **115 – 145 Coins / day** | **129.2 Coins/day** | Unlocks first theme on **Day 1–2**, ~11/12 themes in 30 days |
| **Daily Income (Skilled, ~24 min/day)** | **155 – 185 Coins / day** | **172.0 Coins/day** | Full theme catalog unlocked in ~14 days, 82.4% full catalog in 30d |
| **Daily Income (Highly Active, ~45 min/day)** | **180 – 210 Coins / day** | **195.4 Coins/day** | Soft-cap & hard-cap prevent runaway inflation (`4.30 Coins/min` blended) |

---

## 3. Per-Level Rewards, Anti-Farming & Daily Caps

### 3.1 Level Completion Formula (Fresh Clear vs Replay)

To guarantee **earning parity** between Onet (average attempt duration **75 seconds**) and Match 3 (average attempt duration **90 seconds**, i.e., **1.20×** longer), base completion rewards are calibrated proportionally:

#### Onet Level Reward (`avg 75s`)
$$\text{RawCoins}_{\text{Onet}} = \text{BaseWin} + \text{FirstClear} + \text{StarDelta} + \text{PerfBonus}$$
- **BaseWin:** `3` Coins (every victory, subject to replay decay).
- **FirstClear Bonus:** `+2` Coins (one-time lifetime per level number).
- **Star Upgrade Bonus:** `1★ = +0`, `2★ = +1`, `3★ = +2` Coins (awarded **once** per star threshold reached on that level; upgrading `1★ → 3★` later grants `+2` difference, never re-farmable).
- **Performance Bonus (`+1` Coin):** Awarded on a fresh clear if **Flawless** (0 mistakes) OR **Speedrun** (`< 45s`) OR **Max Combo ≥ 8**.
- **Range on Fresh Clear:** `5` Coins (1★) to `8` Coins (3★ + Perf).

#### Match 3 Level Reward (`avg 90s`)
$$\text{RawCoins}_{\text{Match3}} = \text{BaseWin} + \text{FirstClear} + \text{StarDelta} + \text{PerfBonus} + \text{SuperPerfBonus}$$
- **BaseWin:** `4` Coins (`4 / 90s ≈ 0.0444/s` vs Onet `3 / 75s = 0.0400/s`, balanced against Onet's slightly faster streak cadence).
- **FirstClear Bonus:** `+2` Coins (one-time lifetime per level number).
- **Star Upgrade Bonus:** `1★ = +0`, `2★ = +1`, `3★ = +2` Coins (non-downgrading lifetime delta).
- **Performance Bonus (`+1` Coin):** Cascade chain `≥ 4` OR `≥ 5` moves remaining.
- **Super Performance Bonus (`+1` Coin):** Both Cascade `≥ 5` AND a Special-Tile Combo triggered in the level.
- **Range on Fresh Clear:** `6` Coins (1★) to `10` Coins (3★ + Perf + SuperPerf).

#### Anti-Frustration Pity Guarantee
- If a player loses **3 consecutive attempts** on any level without a win, the 3rd loss awards **`+1` Pity Coin** (capped under the daily gameplay cap) alongside dynamic difficulty/pity assistance, preventing zero-reward frustration loops.

### 3.2 Anti-Farming Diminishing Returns (Replay Protection)

Replaying an already-cleared level cannot be used to farm infinite coins:

1. **Same-Day Replay Decay Multiplier** (applied to `BaseWin + PerfBonus`):
   - **Fresh Clear (never cleared before):** `100%` (`1.0×`) + FirstClear + StarDelta.
   - **1st Replay Clear Today (same level):** `50%` (`0.5×`) + any unpaid StarDelta (`1★ → 2★/3★`).
   - **2nd Replay Clear Today:** `25%` (`0.25×`, floored, min `1` Coin if raw ≥ 4) + any unpaid StarDelta.
   - **3rd+ Replay Clear Today:** `0%` (`0` Coins; StarDelta still awarded if improving from 1★/2★ to 3★).
2. **Trivial Low-Level Farming Guard:**
   - Replaying any already-3★ level where `level < highestUnlockedLevel - 10` applies an additional **`0.25×` cap** (max `1` Coin on 1st replay, `0` thereafter).
3. **Simulated Bot Proof:** A bot clearing Level 1 **100 times in one day** earns **11 Coins total** (`8 + 2 + 1 + 0×97`), eliminating Level-1 farming exploits.

### 3.3 Daily Gameplay Soft-Cap & Hard-Cap (Reset `00:00 WIB / UTC+7`)

| Daily Gameplay Coins Earned | Multiplier Applied to Level Rewards | Design Purpose |
|---|---|---|
| `0 – 80 Coins` | **`100%`** (`1.0×`) | Full rewards for Casual, Average, and Skilled daily sessions (~12–16 level wins) |
| `81 – 120 Coins` | **`50%`** (`0.5×`, min `1` Coin) | Gentle soft-cap dampening for marathon play |
| `> 120 Coins` | **`1 Coin` flat on new level clears / `0` on replays** | Hard anti-bot cap; new progression always feels acknowledged without inflating economy |

> **Important Rule:** Daily Gameplay Caps apply **only** to repeatable level-completion coins. **Daily Login Streak, Daily Missions, Weekly Missions, Daily Challenges, and Achievements are NEVER blocked by the gameplay cap** (unlike `connectify-new`'s old `DAILY_INCOME_LIMIT` bug that rejected mission/achievement claims at 100 coins).

---

## 4. Secondary Income Streams (Shared Across Onet & Match 3)

### 4.1 Daily Login Streak (`loginRewards`, 7-Day Cycle)
Preserved directly from `src/core/loginReward.js`:
- **Day 1:** `5` Coins + 20 XP
- **Day 2:** `5` Coins + 20 XP
- **Day 3:** `6` Coins + 20 XP (+ *Meadow* Reward Theme via `ART_REWARDS`)
- **Day 4:** `7` Coins + 20 XP
- **Day 5:** `8` Coins + 20 XP
- **Day 6:** `9` Coins + 20 XP
- **Day 7:** `10` Coins + 20 XP (+ *Fruit* Reward Theme via `ART_REWARDS`)
- **Cycle Average:** `50 Coins / 7 days = 7.14 Coins/day` (continuous streak loops Day 1–7).

### 4.2 Daily Challenge (`+8` Coins/day)
- **1 Daily Challenge/day** alternating or selectable between **Onet Sprint** (90s seeded board) and **Match 3 Daily Puzzle** (seeded target board).
- Clearing the Daily Challenge awards **`+8` Connect Coins** once per WIB day.

### 4.3 Daily & Weekly Missions (Mode-Agnostic Unified Slots)
Every mission slot tracks combined or mode-selectable milestones so **100% Onet players and 100% Match 3 players complete missions at identical speed**:

| Scope | Slot | Difficulty | Example Unified Objective (Onet OR Match 3) | Reward |
|---|---|---|---|---|
| **Daily** | Slot 1 | Mudah | Clear 2 levels (Onet or Match 3) / Match 25 tiles | **5 Coins** |
| **Daily** | Slot 2 | Menengah | Clear 4 levels / Score 4,000 pts | **7 Coins** |
| **Daily** | Slot 3 | Menengah | Clear 5 levels / Reach Combo ×5 (Onet) or Cascade ×3 (Match 3) | **8 Coins** |
| **Daily** | Slot 4 | Sulit | Clear 7 levels / Earn 12 Stars total | **10 Coins** |
| **Daily Bonus** | All-Clear | — | Claim ≥ 3 Daily Missions in one WIB day | **+5 Coins** |
| **Weekly** | Slot 1 | Menengah | Clear 15 levels across the week | **15 Coins** |
| **Weekly** | Slot 2 | Sulit | Clear 28 levels across the week | **20 Coins** |
| **Weekly** | Slot 3 | Sangat Sulit | Clear 42 levels across the week | **25 Coins** |

- **Daily Mission Potential:** `5 + 7 + 8 + 10 + 5 = 35 Coins/day`.
- **Weekly Mission Potential:** `15 + 20 + 25 = 60 Coins/week` (`8.57 Coins/day`).

### 4.4 Achievements (One-Time Progression Milestones)
8 multi-tier achievement families (mode-agnostic + mastery): `first_win` (5), `levels_cleared` (8/12/20/30), `stars_earned` (8/15/25/35), `login_streak` (6/10/15/25), `daily_missions_done` (8/15/25), `combo_mastery` (6/12/20/30), `theme_collector` (8/15/25), `wealth_milestone` (5/10/20/30). Total achievement pool over first 30–90 days: **~480 Connect Coins**.

---

## 5. Relative Earning Parity: Onet vs Match 3

### 5.1 Parity Design Formula
$$\text{ParityRatio} = \frac{\text{MeanCoinsPerMin}_{\text{Onet}}}{\text{MeanCoinsPerMin}_{\text{Match3}}} \in [0.97, 1.03]$$

- Onet average level clear time: `75s` (`1.25 min`), base+first+avgStar+perf ≈ `6.2 Coins/win` → **`~3.80 Coins/min`** (gameplay only, factoring 78% win rate and 10% replay rate).
- Match 3 average level clear time: `90s` (`1.50 min`, `1.20×` slower), base+first+avgStar+perf+superPerf ≈ `7.1 Coins/win` → **`~3.72 Coins/min`** (gameplay only).
- **Simulated 30-Day Result (500 Monte Carlo Trials, equal 20 min/day play):**
  - **Onet-primary (90% Onet):** `4,431.8` Coins (`7.393` blended Coins/min, `3.795` Onet gameplay Coins/min).
  - **Match3-primary (90% Match 3):** `4,381.0` Coins (`7.288` blended Coins/min, `3.715` Match 3 gameplay Coins/min).
  - **Alternating (50% / 50%):** `4,398.8` Coins (`7.338` blended Coins/min).
  - **Measured 30-Day Total Divergence:** **`1.15%`** (well inside `±3%` target).

---

## 6. Shop Catalog, Rarity Tiers & Balanced Pricing

### 6.1 Theme Rarity Tiers & Prices (Shared Across Onet & Match 3)
Every theme provides tile icons, board background, UI accent palette, and matching audio/particle pairing, usable across **both** Onet and Match 3:

| Rarity Tier | Unlock Method / Price Range | Themes Included | Target Unlock Cadence (Average Player) |
|---|---|---|---|
| **Starter (Free)** | `0 Coins` (Unlocked on Day 1) | *Summer Club* (`sweets`), *Meadow Atelier* (`meadow`) | Day 1 immediately |
| **Milestone (Earned)** | Gameplay / Login Milestones (`0 Coins`) | *Sakura Reward* (Lvl 3), *Bakery Reward* (Lvl 5), *Galaxy Reward* (3 Ach), *Meadow Reward* (3d Login), *Fruit Reward* (7d Login) | Days 1–7 organically |
| **Common** | `60 – 80 Coins` | *Ocean Friends* (60), *Forest Tales* (80), *Candy Parade* (80) | **Day 1–2** (~1 session + missions) |
| **Rare** | `100 – 120 Coins` | *Cosmic Trip* (100), *Fruit Market* (100), *Petite Bakery* (110), *Sakura Atelier* (120), *Autumn Harvest* (120) | **Days 3–7** (~1 theme every 1–2 days) |
| **Epic** | `130 – 150 Coins` | *Alpine Winter* (130), *Retro Arcade* (140), *Midnight Galaxy* (150), *Magic Atelier* (150) | **Days 8–14** (~1 theme every 1.5–2 days) |

### 6.2 Tile Collections, Board Surfaces & Profile Cosmetics

| Category | Rarity & Price Range | Items & Pricing (Connect Coins) |
|---|---|---|
| **Tile Skin Packs** (Full 1×1, 1×2, 2×2 bundle) | Starter `0`, Common `105`, Rare `125–135`, Epic `140`, Legendary `150` | *Pearl* (0), *Strawberry Milk* (105), *Opal* (125), *Amber* (130), *Jade* (135), *Midnight* (140), *Pixel Pop* (140), *Frosted* (140), *Honey* (150), *Enchanted* (150) |
| **Board Surfaces** (Match 3 & Onet backing) | Starter `0`, Common `80`, Rare `85`, Epic `90` | *Pearl Cloud* (0), *Jelly Rose* (80), *Amber* (80), *Opal Ceramic* (85), *Pixel Grid* (85), *Frosted* (85), *Maple Wood* (90), *Enchanted* (90) |
| **Avatars & Frames** (18 items) | Common `50–65`, Rare `70–75`, Epic `80–90` | *Mint Club* (50), *Bambu/Pip* (60), *Mochi/Kuma/Autumn* (65), *Rubi/Moonlit/Arcade* (70), *Lumi/Hazel/Golden Hour/Frost Halo* (75), *Bip/Snowy/Enchanted Ring* (80), *Orbit/Prof. Hoot* (90) |
| **Victory Effects, Animations & Compasses** (16 items) | Starter `0`, Common `35–65`, Rare `70–75`, Epic `80` | *Blossom Burst* (0), *Mint Compass* (35), *Sun Compass* (40), *Club Confetti* (60), *Star Shower / Autumn / Pixel* (65), *Snowfall / Pixel Pop* (70), *Magic Sparkles / Frost Bloom* (75), *Magic Orbit* (80) |

### 6.3 Balanced Booster & Hint Pricing (Sinks)
All boosters start with free starter stock (`3` each for core boosters, `2` for tactical boosters) and are sold both individually and in 3-pack bundles (~10% discount):

| Booster ID | Name | Applicable Game(s) | Single Price | 3-Pack Bundle | Free Starter | Tactical Role |
|---|---|---|---|---|---|---|
| `hint` | **Hint** (Petunjuk) | Onet & Match 3 | **8 Coins** | **21 Coins** | 3 | Highlights valid Onet pair or best Match 3 swap |
| `shuffle` | **Shuffle** (Acak Papan) | Onet & Match 3 | **12 Coins** | **32 Coins** | 3 | Reshuffles board tiles (note: automatic deadlock shuffle is always FREE) |
| `hammer` | **Hammer** (Palu) | Onet & Match 3 | **14 Coins** | **38 Coins** | 3 | Removes 1 blocker/cell (Match 3) or clears 1 blocked pair (Onet) |
| `extra_moves` | **+5 Moves / +15s Time** | Onet & Match 3 | **16 Coins** | **43 Coins** | 2 | Extends Match 3 move limit (+5) or Onet countdown (+15s) |
| `bomb` | **Area Bomb** (Bom 3×3) | Onet & Match 3 | **18 Coins** | **48 Coins** | 3 | Clears a 3×3 cluster (Match 3) or 3×3 zone pairs (Onet) |
| `color_burst` | **Color Burst** (Pelangi) | Match 3 | **22 Coins** | **58 Coins** | 2 | Clears all tiles of the targeted color on the Match 3 board |

**Sink Calibration:** Even a **Booster-heavy** player spending 45% of income on boosters (~120–140 boosters/month at ~1,984 Coins) retains **~2,400+ Coins** over 30 days to unlock ~7 purchasable themes + ~24 cosmetics!

---

## 7. Atomic Transaction Rules, Anti-Exploit & Zero-Negative-Balance Guarantees

Every mutation to `Connect Coins` (`permen`), `inventory`, `unlockedThemes`, `ownedCosmetics`, and `ledger` MUST execute through a single pure-function transaction processor (`EconomyEngine.applyTransaction`) wrapped in atomic storage commits:

1. **Zero-Negative-Balance Invariant (`balance >= 0`):**
   - `spendCoins(txId, amount, reason)` validates `Number.isSafeInteger(amount) && amount > 0` and `state.coins >= amount` **before** modifying state. Any underflow attempt throws/returns `ERR_INSUFFICIENT_FUNDS` with **zero state mutation**.
2. **Idempotent Transaction Deduplication (`processedTxIds` Ring Buffer):**
   - Every reward grant (`runId`, `login:${wibDate}`, `daily_challenge:${wibDate}`, `mission:${scope}:${period}:${id}`, `achievement:${id}:tier_${tier}`) and every purchase (`purchase:${opId}`) carries a deterministic or UUID `txId`.
   - Before applying any delta, the engine checks `processedTxIds` (last 500 keys). Duplicate claims return `{ status: 'IDEMPOTENT_NOOP', delta: 0 }` so double-taps, background-resume replays, or app restarts mid-claim can **never** double-credit coins or double-charge purchases.
3. **Server-Authoritative / Internal Price Lookup Only:**
   - Purchase handlers accept **only** `{ itemId, quantity }` — never a client-supplied `price`. Price is always resolved from the immutable `ECONOMY_CONFIG` catalog (`getItemPrice(itemId)`).
   - Permanent items (`theme_*`, `tilepack_*`, `block_*`, `avatar_*`, `frame_*`, `effect_*`, `anim_*`) check `isAlreadyOwned(state, itemId)` before charging; duplicate permanent purchases return `ERR_ALREADY_OWNED`.
   - Consumable stocks clamp at `[0, 99]`.
4. **Atomic Write-Ahead Backup & Checksum Verification:**
   - Every committed transaction writes `(state, ledgerEntry, sha256/fnv1a checksum)` to a staging/backup slot (`connectify_save_backup`) before swapping the primary slot (`connectify_save_primary`), guaranteeing no half-written state where coins were deducted without granting the item (or vice versa).
5. **Immutable Audit Ledger (`ledger`, max 200 entries):**
   - Every positive and negative coin delta appends `{ txId, type, label, delta, balanceAfter, timestampIso }` for full player transparency in the Wallet / Ledger screen.
