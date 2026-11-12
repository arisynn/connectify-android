# Connectify Android — 30-Day Economy Simulation Report (`ECONOMY_SIMULATION_REPORT.md`)

**Simulation Script:** `/root/.gemini/antigravity/scratch/connectify-android/scripts/simulate-economy.mjs`  
**Execution Command:** `node /root/.gemini/antigravity/scratch/connectify-android/scripts/simulate-economy.mjs`  
**Methodology:** Seeded Mulberry32 Monte Carlo (`N = 500` 30-day trials per profile = **4,500 total player-months** simulated) + Deterministic Trajectory Checkpoints (seed `20261112`) + Anti-Farming & Atomic Exploit Stress Suite.

---

## 1. Simulated 9 Player Profiles — 30-Day Quantitative Summary (`N = 500` Trials/Profile)

| Player Profile | 30d Earned (`P10 / Mean / P90`) | Daily Avg (All Days) | Coins/Min (`All / Gameplay`) | Spend (`Boosters / Themes / Cosmetics`) | Mean End Balance | Themes Bought (`/12`) | Full Catalog % | 1st Theme Unlocked |
|---|---|---|---|---|---|---|---|---|
| **1. Casual** | `1,434 / 1,710 / 1,978` | `57.0/d` | `7.63 / 3.30` | `264 / 417 / 1,007` | `21` | `4.9 / 12` | `31.6%` | **Day 2.6** |
| **2. Average** | `3,656 / 3,877 / 4,113` | `129.2/d` | `7.57 / 3.70` | `783 / 1,204 / 1,865` | `25` | `11.1 / 12` | `53.5%` | **Day 1.1** |
| **3. Skilled** | `4,965 / 5,159 / 5,295` | `172.0/d` | `7.29 / 4.23` | `420 / 1,340 / 3,370` | `29` | `12.0 / 12` | `82.4%` | **Day 1.0** |
| **4. Highly Active** | `5,810 / 5,862 / 5,909` | `195.4/d` | `4.30 / 2.65` | `1,063 / 1,340 / 3,427` | `33` | `12.0 / 12` | `83.7%` | **Day 1.0** |
| **5. Onet-primary** | `4,342 / 4,432 / 4,521` | `147.7/d` | `7.39 / 3.78` | `805 / 1,339 / 2,262` | `25` | `12.0 / 12` | `59.6%` | **Day 1.0** |
| **6. Match3-primary** | `4,275 / 4,381 / 4,482` | `146.0/d` | `7.29 / 3.73` | `796 / 1,339 / 2,223` | `24` | `12.0 / 12` | `58.8%` | **Day 1.0** |
| **7. Alternating** | `4,291 / 4,399 / 4,505` | `146.6/d` | `7.34 / 3.75` | `799 / 1,339 / 2,235` | `26` | `12.0 / 12` | `59.0%` | **Day 1.0** |
| **8. Booster-heavy** | `4,153 / 4,393 / 4,607` | `146.4/d` | `7.65 / 4.07` | `1,984 / 631 / 1,740` | `39` | `6.8 / 12` | `48.5%` | **Day 1.4** |
| **9. Cosmetic-only** | `4,048 / 4,281 / 4,496` | `142.7/d` | `7.43 / 3.85` | `0 / 899 / 3,314` | `68` | `9.0 / 12` | `85.5%` | **Day 2.0** |

> Note: In addition to purchasable themes (`12`), players also start with `2` free themes (`Summer Club`, `Meadow Atelier`) and unlock up to `5` milestone reward themes (`Sakura`, `Bakery`, `Galaxy`, `Meadow`, `Fruit`) by Day 7 — bringing total available themes to `7–19` depending on progression.

---

## 2. Income Source Breakdown (30-Day Mean per Profile)

| Player Profile | Onet Gameplay | Match 3 Gameplay | Daily Challenge | Login Streak | Daily Missions | Weekly Missions | Achievements | Total Wins | Coins/Win (`All / Gameplay`) |
|---|---|---|---|---|---|---|---|---|---|
| **1. Casual** | `341` | `399` | `75` | `150` | `486` | `100` | `159` | `118` | `14.54 / 6.30` |
| **2. Average** | `871` | `1,026` | `172` | `195` | `991` | `253` | `370` | `290` | `13.36 / 6.53` |
| **3. Skilled** | `1,380` | `1,613` | `223` | `205` | `1,032` | `273` | `432` | `464` | `11.11 / 6.45` |
| **4. Highly Active** | `1,674` | `1,945` | `240` | `210` | `1,050` | `300` | `443` | `814` | `7.21 / 4.45` |
| **5. Onet-primary** | `2,009` | `260` | `204` | `210` | `1,050` | `258` | `441` | `368` | `12.05 / 6.17` |
| **6. Match3-primary** | `192` | `2,053` | `203` | `210` | `1,046` | `255` | `422` | `319` | `13.73 / 7.03` |
| **7. Alternating** | `1,037` | `1,212` | `204` | `210` | `1,048` | `256` | `433` | `341` | `12.92 / 6.60` |
| **8. Booster-heavy** | `1,074` | `1,266` | `195` | `197` | `1,005` | `256` | `399` | `356` | `12.36 / 6.58` |
| **9. Cosmetic-only** | `1,022` | `1,192` | `197` | `198` | `1,008` | `255` | `409` | `336` | `12.76 / 6.60` |

### Key Analytical Observations from Source Breakdown
- **Healthy Gameplay-to-Meta Ratio:** For an **Average** player, repeatable gameplay accounts for **49.0%** (`1,897 / 3,877`) of total 30-day income, while Daily/Weekly Missions + Login + Daily Challenge + Achievements supply **51.0%** (`1,980 / 3,877`). This keeps level-by-level progression exciting while giving casual players strong daily retention hooks.
- **Anti-Inflation Effectiveness (`Highly Active`):** Even at `45.5 min/day` (`814` wins over 30 days, `2.8×` the Average player's wins), `Highly Active` earns only `1.51×` the Average player's coins (`5,862` vs `3,877`) because soft-cap (`80/day`), hard-cap (`120/day`), and replay decay compress marginal Coins/Win from `6.53` down to `4.45`.

---

## 3. Onet vs Match 3 Earning Parity Verification

Tested across identical time budgets (`2 sessions/day × 10 min = 20.0 min/day`, `78%` win rate, `10%` replay rate) over `500` trials:

| Cohort | 30-Day Mean Earned | Total Coins / Min | Mode-Specific Gameplay Coins / Min | Mean Wins (30d) |
|---|---|---|---|---|
| **Onet-primary (90% Onet / 10% Match 3)** | `4,431.8` Coins | `7.393` Coins/min | `3.795` Coins/min (Onet) | `368` |
| **Match3-primary (10% Onet / 90% Match 3)** | `4,381.0` Coins | `7.288` Coins/min | `3.715` Coins/min (Match 3) | `319` |
| **Alternating (50% Onet / 50% Match 3)** | `4,398.8` Coins | `7.338` Coins/min | `3.75` Coins/min (Blended) | `341` |

- **30-Day Total Income Divergence (Onet-primary vs Match3-primary):** **`1.15%`** *(Pass — well below `3.00%` target)*.
- **Active Gameplay Rate Divergence:** **`2.13%`** *(Pass — well below `3.00%` target)*.
- **Conclusion:** Neither game mode penalizes the player's wallet or cosmetic unlock timeline.

---

## 4. Deterministic Progression Checkpoints (Seed `20261112`)

| Profile | Day 1 (`Earned / Bal`) | Day 7 (`Cumul / Bal / Themes`) | Day 14 (`Cumul / Bal / Themes`) | Day 30 (`Cumul / Bal / Themes / Perm Items`) |
|---|---|---|---|---|
| **1. Casual** | `0 / 0` *(inactive D1 roll)* | `401 / 10 / 2` | `886 / 20 / 4` | `1,868 / 61 / 6 / 20` |
| **2. Average** | `133 / 8` | `1,020 / 27 / 5` | `1,948 / 6 / 8` | `3,979 / 54 / 11 / 35` |
| **3. Skilled** | `188 / 22` | `1,248 / 9 / 6` | `2,517 / 48 / 11` | `5,043 / 7 / 12 / 50` |
| **4. Highly Active** | `200 / 22` | `1,390 / 57 / 6` | `2,798 / 33 / 11` | `5,835 / 63 / 12 / 51` |
| **5. Onet-primary** | `154 / 6` | `1,045 / 16 / 5` | `2,056 / 2 / 8` | `4,345 / 7 / 11 / 39` |
| **6. Match3-primary** | `131 / 4` | `1,092 / 35 / 5` | `2,130 / 39 / 8` | `4,342 / 44 / 12 / 36` |
| **7. Alternating** | `141 / 8` | `1,064 / 31 / 5` | `2,119 / 42 / 8` | `4,349 / 53 / 12 / 36` |
| **8. Booster-heavy** | `155 / 21` | `950 / 31 / 3` | `2,033 / 36 / 6` | `4,398 / 41 / 6 / 31` |
| **9. Cosmetic-only** | `141 / 16` | `1,058 / 33 / 1` | `2,069 / 79 / 3` | `4,427 / 87 / 9 / 54` |

---

## 5. Anti-Farming & Exploit Stress Verification Results

| Verification Check | Test Scenario | Observed Output | Status |
|---|---|---|---|
| **Level-1 Replay Farming Bot** | Bot replays Level 1 **100 times** in a single WIB day | Total earned = **`11` Coins** (`Attempt 1 = 8`, `Attempt 2 = 2`, `Attempt 3 = 1`, `Attempts 4..100 = 0`) | **PASS** |
| **Idempotent `runId` Deduplication** | Re-submits identical reward claim `run-uuid-9001` twice | 1st = `COMMITTED (+8)`, 2nd = `REJECTED_DUPLICATE_TX (+0)` | **PASS** |
| **Duplicate Permanent Item Guard** | Attempts to buy already-owned `frame_mint` | `REJECTED_ALREADY_OWNED`, balance unchanged | **PASS** |
| **Zero-Negative-Balance Purchase Guard** | Attempts `theme_ocean` (60) at 58 bal, then `hint` (8) at 0 bal | `REJECTED_INSUFFICIENT_FUNDS`, final wallet = `0` Coins | **PASS** |
| **Monte Carlo Negative Balance Audit** | Scans all `4,500` simulated 30-day trajectories (`135,000` player-days) | **`0`** negative-balance incidents | **PASS** |

---

## 6. Economy Health Assessment & Tuning Readiness

1. **No Starvation, No Runaway Inflation:** Every archetype remains solvent (`endingBalance >= 0` across all 4,500 trials), **Casual** unlocks ~5 purchasable themes + 20 permanent items in Month 1, **Average** unlocks ~11/12 themes + ~53.5% of the full catalog, and **Skilled / Highly Active** retain ~16–18% of the permanent catalog for Month 2+.
2. **Booster Sink Sustainability:** **Booster-heavy** spends `1,984` Coins on consumables (~45% of earnings) and still unlocks ~7 themes and ~48.5% of the catalog, proving boosters never create a paywall or progression trap.
3. **Config-Driven Tuning:** All constants (`levelRewards`, `replayDecay`, `dailyGameplayCaps`, `boosters`, `catalog`) live in a single declarative config module ready for Phase 3 TypeScript implementation.
