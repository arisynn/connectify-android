# Connectify Android — Level Difficulty & Pacing Plan (`LEVEL_DIFFICULTY_PLAN.md`)

**Author:** Agent 06 — Player Progression & Retention Designer  
**Target Project:** `/root/.gemini/antigravity/scratch/connectify-android`  
**Source Audited (Read-Only):** `/root/.gemini/antigravity/scratch/connectify-new`  
**Simulation Validator:** `scripts/simulate-progression.mjs`

---

## 1. Difficulty Philosophy & Pacing Rhythm

Connectify Android uses a **sawtooth difficulty curve** across 4 progression bands (**Early Onboarding -> Intermediate -> Advanced -> Expert**) rather than a punishing linear ramp.

### 1.1 Sawtooth Cadence (Every 5 & 10 Levels)
- **Standard Levels (`N % 5 !== 0, 1`):** Gradual increase in grid density, icon/color variety, obstacle count, or timer/move pressure.
- **Boss / Milestone Levels (`Level 10, 20, 30, ...`):** Peak tension for the chapter (`-5s` timer or hybrid multi-objectives), rewarding high satisfaction and chapter-completion celebration.
- **Breather / Recovery Levels (`Level 6, 11, 16, 21, ...`, i.e., `L > 5 && L % 5 === 1`):** Deliberate tension release (`+15s` timer or reduced blockers / `+2` moves) inspired by `connectify-new`'s `pcg.ts` (`recovery = level % 5 === 1`). Prevents player burnout after Boss levels.

### 1.2 Shared Dynamic Difficulty Adjustment (DDA) & Anti-Frustration Pity
Extending `src/game/block-puzzle/core/dda.ts` from `connectify-new` across **both Onet and Match 3**:
- **EMA Skill Tracking (`skillScore` 0–100, default `50`, `alpha = 0.3`):**
  - Updated after every completed/failed round using win/loss, stars earned, retries, and efficiency.
- **4 Pre-Level Brackets:**
  - `easy` (`skill < 40`): `+15s` Onet timer / `+3` Match 3 moves; `-25%` optional blockers; no `hard` gravity shifts.
  - `normal` (`40 <= skill < 70`): Exact baseline parameters defined below.
  - `hard` (`skill >= 70`): `-5s` Onet timer / `-1` Match 3 move; optional extra stone/ice blockers on non-recovery levels (never breaking solvability).
  - `pity` (`consecutiveFailures >= 3` on the same level): `+25s` Onet timer / `+5` Match 3 moves, `-50%` non-essential blockers, reduced icon/color density, and gentle opening board layout so the player breaks through frustration cleanly.
- **Zero-Deadlock Guarantees:**
  - **Onet:** Constructive backwards-peeled board generation (`constructPairs` + `isBoardSolvable`) guarantees every generated board is 100% solvable; free automatic `guaranteedShuffle` triggers if zero valid paths remain mid-board.
  - **Match 3:** Pre-match-free initial board generation (`0` accidental cascades on spawn) with `>= 2` valid opening moves; free automatic reshuffle if zero moves remain mid-board.

---

## 2. Onet Connect — Difficulty Curve (Levels 1–100+)

### 2.1 Existing `connectify-new` Onet Audit
In `connectify-new/src/core/difficulty.js` and `src/core/board.js`:
- Grid is hardcoded to `ROWS = 10, COLS = 6` (`60` cells) from Level 1.
- `getOnetDifficulty(level)` defines 5 tiers (`Santai` L1–3, `Fokus` L4–7, `Menantang` L8–14, `Ahli` L15–24, `Master` L25+):
  - `groups` (compound `1×2`/`2×1`/`2×2` split tiles): `0` (L1), `1` (L2–5), `2` (L6+).
  - `time`: `max(75, 150 - (level - 1) * 2)` seconds.
  - `separation`: `min(8, 2 + floor(level / 3))` Manhattan distance bias.
  - `arrowPairs`: `0` (L1–7), `min(6, 1 + floor((level - 8) / 4))` (L8+).
- **Gaps Fixed for Android:** Starting on a full `10×6` (60-tile) board at Level 1 is visually intimidating on small mobile screens, and `gravityMode` + static blockers were absent in Onet.

### 2.2 Onet 4-Band Progression Matrix

| Band | Level Range | Grid Size (Playable Cells) | Unique Tile Icons | Base Timer | Split Groups (`1×2` / `2×2`) | Arrow Pairs (`openSide`) | Gravity Shift | Static Blockers | Expected Base Win Rate |
|---|---|---:|---:|---:|---:|---:|---|---:|---:|
| **Band 1: Early Onboarding** | **Lv 1–10** | `6×6` (L1–3) → `8×6` (L4–10) | `6 → 12` | `150s → 127s` | `0` (L1–2) → `1` (L3–6) → `2` (L7–10) | `0` (L1–7) → `1` (L8–10) | `none` | `0` | `81% – 93%` |
| **Band 2: Intermediate** | **Lv 11–30** | `10×6` (60 cells) | `10 → 14` | `149s` (Breather) → `100s` | `1–4` | `1–4` | `none` (L11–15) → `down` / `left` (L16+) | `0` (L11–21) → `2` (L22–30) | `66% – 94%` |
| **Band 3: Advanced** | **Lv 31–60** | `10×6` (56–60 cells) | `13 → 16` | `120s` (Breather) → `81s` | `2–4` | `2–6` | `down`, `left`, `inward`, `alternating` | `0–4` | `57% – 84%` |
| **Band 4: Expert** | **Lv 61–100+** | `10×6` (56 cells) | `16` (full set) | `85s → 75s` (floor) | `2` (Breather) / `4` | `3` (Breather) / `6` | `inward`, `alternating`, `down`, `left` | `2` (Breather) / `4` | `49% – 75%` |

*(Note: Onet boards use `10×6` maximum grid dimensions in portrait orientation to ensure every tile meets `>= 48dp` touch target minimums on `360dp`-wide Android phones. Smaller `6×6` and `8×6` boards center cleanly inside the same viewport frame.)*

### 2.3 Onet Mechanic Introduction Schedule
- **Level 1–2 (`6×6`, 6–7 icons, 148–150s):** Pure `1×1` classic connect (`<= 2` turns). Teaches straight, 1-turn, and 2-turn perimeter paths.
- **Level 3–7 (`6×6` → `8×6`, 7–10 icons):** Introduces **Compound Split Tiles** (`2×2` and `1×2`/`2×1` tiles that fracture into smaller child pairs when matched).
- **Level 8–15 (`8×6` → `10×6`, 10–11 icons):** Introduces **Directional Arrow Tiles (`openSide`)** — pairs that can only be connected from their indicated open edge.
- **Level 16–21 (`10×6`, 11–12 icons):** Introduces **Gravity Shift (`down` / `left`)** — remaining tiles slide in the indicated direction after every cleared pair, dynamically opening new lanes.
- **Level 22+ (`10×6`, 13–16 icons):** Introduces **Static Stone/Ice Blockers** (2–4 unmatchable cells placed symmetrically so outer perimeter routing stays open) and **Inward / Alternating Gravity** at Lv 31+.

### 2.4 Onet Sample Curve Table (Generated by `scripts/simulate-progression.mjs`)

| Lv | Band | Grid | Icons | Timer | Splits | Arrows | Gravity | Blockers | Diff Index | Base Win Rate | Role |
|---:|---|---|---:|---:|---:|---:|---|---:|---:|---:|---|
| 1 | Early Onboarding | `6x6` | 6 | `150s` | 0 | 0 | `none` | 0 | `0.124` | 93% | Standard |
| 3 | Early Onboarding | `6x6` | 7 | `146s` | 1 | 0 | `none` | 0 | `0.171` | 91% | Standard |
| 5 | Early Onboarding | `8x6` | 9 | `142s` | 1 | 0 | `none` | 0 | `0.179` | 90% | Standard |
| 8 | Early Onboarding | `8x6` | 10 | `136s` | 2 | 1 | `none` | 0 | `0.255` | 86% | Standard |
| 10 | Early Onboarding | `8x6` | 12 | `127s` | 2 | 1 | `none` | 0 | `0.343` | 81% | **Boss** |
| 11 | Intermediate | `10x6` | 10 | `149s` | 1 | 1 | `none` | 0 | `0.106` | 94% | **Breather** |
| 15 | Intermediate | `10x6` | 11 | `128s` | 2 | 2 | `none` | 0 | `0.306` | 83% | Standard |
| 20 | Intermediate | `10x6` | 12 | `115s` | 3 | 3 | `down` | 0 | `0.520` | 71% | **Boss** |
| 25 | Intermediate | `10x6` | 13 | `113s` | 3 | 4 | `left` | 2 | `0.484` | 73% | Standard |
| 30 | Intermediate | `10x6` | 14 | `100s` | 4 | 4 | `down` | 2 | `0.622` | 66% | **Boss** |
| 31 | Advanced | `10x6` | 13 | `120s` | 2 | 2 | `alternating` | 0 | `0.296` | 84% | **Breather** |
| 40 | Advanced | `10x6` | 14 | `94s` | 4 | 4 | `down` | 2 | `0.660` | 64% | **Boss** |
| 50 | Advanced | `10x6` | 15 | `87s` | 4 | 5 | `inward` | 4 | `0.723` | 60% | **Boss** |
| 60 | Advanced | `10x6` | 16 | `81s` | 4 | 6 | `down` | 4 | `0.785` | 57% | **Boss** |
| 75 | Expert | `10x6` | 16 | `82s` | 4 | 6 | `left` | 4 | `0.761` | 58% | Standard |
| 100 | Expert | `10x6` | 16 | `75s` | 4 | 6 | `inward` | 4 | `0.935` | 49% | **Boss** |

---

## 3. Match 3 Puzzle — Difficulty Curve (Levels 1–100+)

### 3.1 Existing `connectify-new` Audit & Upgrade Path
- `connectify-new` had `TripleGame.tsx` (a fixed 12-stack, 7-slot tray minigame locked to `level: 1`) and `block-puzzle/core/` (which already modeled `levels.json` L1–20, `pcg.ts` L21+, obstacle layers `ice`, `wood`, `metal-2`, `metal-1`, `stone`, `gem`, and EMA DDA).
- Connectify Android replaces `TripleGame` / `block-puzzle` with a true **2D Grid Swap Match 3 Engine** using `block-puzzle`'s obstacle vocabulary and sawtooth PCG/DDA philosophy.

### 3.2 Match 3 4-Band Progression Matrix

| Band | Level Range | Board Layout | Tile Colors | Move Limit | Primary Objectives | Blocker Budget | Expected Base Win Rate |
|---|---|---:|---:|---:|---|---:|---:|
| **Band 1: Early Onboarding** | **Lv 1–10** | `7×7` (L1–4) → `8×8` (L5–10) | `4` | `26 – 30` | `score` → `collect_tiles` → `clear_ice` → `break_crates` | `0 – 14` | `82% – 92%` |
| **Band 2: Intermediate** | **Lv 11–30** | `8×8` (with shaped `cellMask` cutouts on select levels) | `5` | `22 – 28` | Rotating: `score`, `collect_tiles`, `clear_ice`, `break_crates`, `drop_gems` | `6 – 20` | `72% – 91%` |
| **Band 3: Advanced** | **Lv 31–60** | `8×8` (shaped cutouts + stone anchors) | `5` (L31–44) → `6` (L45–60) | `17 – 25` | Single + `hybrid` dual-objectives on Boss levels | `10 – 26` | `60% – 87%` |
| **Band 4: Expert** | **Lv 61–100+** | `9×9` (compact `~40dp–44dp` high-density or `8×8` shaped) | `5` (Breather) / `6` | `15 – 24` | `hybrid` (e.g., Ice + Drop Gems + Collect) | `12 – 32` | `51% – 75%` |

*(Note: If Android phone width restricts `9×9` cell touch targets below `42dp`, Band 4 levels can maintain `8×8` geometry with shaped `cellMask` bottlenecks and 2-hit `metal-2` / `ice-2` blockers to preserve `>= 44dp–48dp` ergonomics while keeping identical difficulty budget.)*

### 3.3 Match 3 Mechanic & Objective Introduction Schedule
- **Level 1–2 (`7×7`, 4 colors, 30 moves):** Pure `score` objective. High cascade probability (`4` colors) guarantees effortless Match-4 Line Bombs and Match-5 Color Bombs in the first minute.
- **Level 3–5 (`7×7` → `8×8`, 4 colors):** Introduces `collect_tiles` (e.g., collect 35 Strawberry & 35 Lemon tiles) and **L/T-Shape Area Bombs** + **Special+Special Combos**.
- **Level 6–8 (`8×8`, 4 colors, 26 moves):** Introduces `clear_ice` (break frosted ice cells by matching tiles on top of them).
- **Level 9–10 (`8×8`, 4 colors, 26 moves):** Introduces `break_crates` (wooden boxes damaged by adjacent matches or special blasts).
- **Level 11–14 (`8×8`, 5 colors, 24–28 moves):** Steps up to **5 tile colors** (starts with Lv 11 Breather).
- **Level 15–30 (`8×8`, 5 colors, 22–25 moves):** Introduces `drop_gems` (treasure gems spawn at top and must reach bottom exit arrows) + `cellMask` shaped boards (corner cutouts / central islands).
- **Level 31–44 (`8×8`, 5 colors):** Boss levels (`40, 50, ...`) introduce `hybrid` dual-objectives (e.g., Clear 14 Ice + Drop 3 Gems).
- **Level 45+ (`8×8` / `9×9`, 6 colors):** Full 6-color strategic boards with multi-layer blockers (`ice-2`, `metal-1`/`metal-2`) and tighter `17–21` move budgets.

### 3.4 Match 3 Sample Curve Table (Generated by `scripts/simulate-progression.mjs`)

| Lv | Band | Grid | Colors | Moves | Objective | Blockers | Star 1 / 2 / 3 Score | Diff Index | Base Win Rate | Role |
|---:|---|---|---:|---:|---|---:|---|---:|---:|---:|---|
| 1 | Early Onboarding | `7x7` | 4 | 30 | `score` | 0 | `5481 / 7947 / 10688` | `0.144` | 92% | Standard |
| 3 | Early Onboarding | `7x7` | 4 | 30 | `collect_tiles` | 0 | `5643 / 8182 / 11004` | `0.151` | 92% | Standard |
| 5 | Early Onboarding | `8x8` | 4 | 26 | `collect_tiles` | 0 | `5031 / 7295 / 9810` | `0.158` | 91% | Standard |
| 8 | Early Onboarding | `8x8` | 4 | 26 | `clear_ice` | 10 | `5242 / 7601 / 10222` | `0.207` | 88% | Standard |
| 10 | Early Onboarding | `8x8` | 4 | 26 | `break_crates` | 14 | `5382 / 7804 / 10495` | `0.319` | 82% | **Boss** |
| 11 | Intermediate | `8x8` | 5 | 28 | `score` | 6 | `5219 / 7568 / 10177` | `0.153` | 91% | **Breather** |
| 15 | Intermediate | `8x8` | 5 | 25 | `drop_gems` | 11 | `4900 / 7105 / 9555` | `0.316` | 82% | Standard |
| 20 | Intermediate | `8x8` | 5 | 24 | `drop_gems` | 14 | `4992 / 7238 / 9734` | `0.436` | 76% | **Boss** |
| 25 | Intermediate | `8x8` | 5 | 23 | `drop_gems` | 17 | `5060 / 7337 / 9867` | `0.375` | 79% | Standard |
| 30 | Intermediate | `8x8` | 5 | 22 | `drop_gems` | 20 | `5104 / 7401 / 9953` | `0.495` | 72% | **Boss** |
| 31 | Advanced | `8x8` | 5 | 25 | `score` | 10 | `5860 / 8497 / 11427` | `0.241` | 87% | **Breather** |
| 40 | Advanced | `8x8` | 5 | 22 | `hybrid` | 18 | `5632 / 8166 / 10982` | `0.524` | 71% | **Boss** |
| 50 | Advanced | `8x8` | 6 | 21 | `hybrid` | 22 | `5329 / 7727 / 10392` | `0.656` | 63% | **Boss** |
| 60 | Advanced | `8x8` | 6 | 20 | `hybrid` | 26 | `5510 / 7990 / 10745` | `0.708` | 60% | **Boss** |
| 75 | Expert | `9x9` | 6 | 19 | `break_crates` | 25 | `5854 / 8488 / 11415` | `0.669` | 63% | Standard |
| 100 | Expert | `9x9` | 6 | 18 | `hybrid` | 32 | `6525 / 9461 / 12724` | `0.877` | 51% | **Boss** |

---

## 4. Handcrafted vs. Procedural Level Generation Boundary

- **Handcrafted Levels (Levels 1–20 in both Onet & Match 3):** Defined in static JSON (`src/games/onet/levels.json` and `src/games/match3/levels.json`) so every tutorial beat, mechanic unlock, and Chapter 1–2 pacing spike is deterministic and playtested.
- **Seeded Procedural Levels (Levels 21+ in both Onet & Match 3):** Generated deterministically from `seed = "${game}:${level}:${ddaBracket}"` using the level-band formulas in Section 2 & 3, ensuring infinite replayability with zero local storage bloat and instant mobile load times (`< 5ms`).
