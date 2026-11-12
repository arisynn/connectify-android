# Connectify Android — Comprehensive Testing, Balance & Performance Strategy

**Document Owner:** Agent 12 — Game QA, Balance & Performance Engineer (`@qa-verifier`)  
**Source Repository Audited (Read-Only):** `/root/.gemini/antigravity/scratch/connectify-new`  
**Target Android Repository:** `/root/.gemini/antigravity/scratch/connectify-android`  
**Target Package ID:** `com.connectify.android`  
**Scope:** Connectify Android (Onet + Match 3 Unified Puzzle Suite)

---

## 1. Audit of Existing Tests & Game Logic in `connectify-new`

### 1.1 Existing Test Inventory & Gaps Found
An audit of `/root/.gemini/antigravity/scratch/connectify-new` revealed 7 ad-hoc test scripts across `tests/` and the repository root, with **no unified test runner or `npm test` script in `package.json`** (`package.json` only defines `dev`, `build`, `start`, and `lint`):

| File in `connectify-new` | Purpose in Source Repo | Audit Findings & Defects Identified |
| :--- | :--- | :--- |
| `tests/verify_onet_helpers.mjs` | Tests `generateBoard`, `findHint`, `clearMatchedGroups`, `guaranteedShuffle`, and `groupSize` from `src/core/board.js` across 4 themes (`ocean`, `forest`, `candy`, `space`) and 30 stress boards. | Functional, but only tests 30 stress boards (below the 1,000-board production gate) and does not directly unit-test `getPath()` corner cases (0, 1, 2, >2 turns, border gutter routing, or `openSide` directional blocking). |
| `tests/verify_economy_helpers.mjs` | Tests `DAILY_INCOME_CAP`, `canReceive`, `creditIncome`, `claimMissionReward`, `claimAchievement`, and chest timers. | **BROKEN in `connectify-new`**: Imports `../src/core/chest.js` (line 16), which was deleted when chests were replaced by `src/core/loginReward.js`. Fails immediately with `ERR_MODULE_NOT_FOUND`. |
| `tests/game_semantics_check.ts` | Checks `generateBoard`, `isBoardSolvable`, `findHint`, `guaranteedShuffle`, `openSide` arrow constraints (level `<8` vs `>=8`), low-tier vs high-tier adjacency/distance metrics, and Block Puzzle piece variants. | Functional via `tsx`, but only tests 5 levels × 3 seeds = 15 boards. Mixes Onet checks with legacy Block Puzzle piece catalog checks. |
| `tests/final_regression.ts` | Consolidated regression suite testing deterministic board generation, `2x2` / `1x2` / `2x1` split semantics (`clearMatchedGroups`), Block Puzzle PCG, `RewardEngine.processWin` (XP, `runId` deduplication), and daily mission rollover (`checkDailyMissions`). | Functional via `tsx`, covers `runId` duplicate protection and split child ID determinism, but couples Onet, Block Puzzle, Memory, and Triple Match. |
| `tests/art_catalog_contracts.ts` | Verifies `BEACH_TILES` (15), `TILE_SETS` (16 per main theme, 10 per reward theme, 209 total IDs), `THEME_PRICES`, `ART_REWARDS`, and `COSMETICS`. | **BROKEN path assumption**: Line 55 calls `readFileSync('/app/src/core/theme/utils.ts', 'utf-8')`, which fails outside a Docker `/app` mount. |
| `tests/new_theme_generation_check.ts` | Tests `generateBoard` across 10 themes (`sakura`, `bakery`, `galaxy`, `meadow`, `fruit`, and `reward_*` variants) on levels 1, 3, 7. | Functional; verifies 60 occupied cells (`10x6`), solvability, and catalog membership. |
| `test_pcg.ts` (root) | Generates 200 levels of Block Puzzle (`src/game/block-puzzle/core/pcg.ts`) checking failsafe fallback rate. | Specific to excluded `block-puzzle` mode; not applicable to Onet or Match 3. |

### 1.2 Architectural & Logic Findings Relevant to QA
1. **Onet Core (`src/core/board.js`, `src/core/difficulty.js`, `src/game/hooks/useOnetGame.ts`)**:
   - Uses a `10×6` playable grid (`ROWS = 10`, `COLS = 6`) padded with a 1-cell empty border (`(ROWS + 2) × (COLS + 2)` = `12×8`) so outer perimeter connections can route outside the playable area.
   - Supports multi-cell master/slave grouped tiles (`2×2` splitting into `1×2` or `2×1`, which in turn split into `1×1` unit tiles via `clearMatchedGroups`) and directional `openSide` arrow constraints (`up`, `down`, `left`, `right`) starting at Level 8.
   - **Edge Case to Guard**: `guaranteedShuffle` attempts 5 random shuffles of `1×1` tiles, then falls back to `constructPairs`, and finally has an emergency recovery (lines 170–176) that flattens multi-cell footprints into unit tiles if `findHint` fails. If `board` contains slave cells when emergency recovery runs, orphan slave metadata must be stripped cleanly so no ghost/orphan slave cells remain.
   - **Timer & Lifecycle Edge Case**: `useOnetGame.ts` pauses on `document.hidden` (`visibilitychange`), but pending `later()` `setTimeout` callbacks (480ms match clear, 700ms auto-shuffle) continue ticking during pause unless tied to a pause-aware timer or flushed deterministically.
2. **Match 3 Core (New Primary Mode for `connectify-android`)**:
   - `connectify-new` only had `TripleGame.tsx` (3-tile stack tray minigame) and `block-puzzle` (10×10 line clear with gravity), lacking a true grid-swap Match 3 engine.
   - `connectify-android` introduces a full deterministic **Match 3 Engine** alongside Onet. QA must therefore provide rigorous unit, property-based, and simulation tests for swap validation, Match-3/4/5/L/T shape detection, special tile creation & combo triggers, gravity & refill cascade determinism, and deadlock (`hasValidMoves`) detection.
3. **Economy, Progression & Persistence (`src/core/economy.js`, `src/core/reward.js`, `src/core/progression.js`, `src/core/cde/`)**:
   - `connectify-new` relies on `CDE.ts` + Supabase (`/api/cde`) and aborts initialization when no Supabase session exists (`error: 'No authenticated session'`).
   - In `connectify-android`, persistence is 100% offline-first (`localStorage` / `IndexedDB` with atomic write-ahead backup slot and checksum verification). All economy, progression, and persistence operations must be tested under pure offline conditions, simulated mid-write crashes, and replay/double-tap exploit attempts.

---

## 2. Test Architecture & Tooling Specification

All automated tests in `connectify-android` will be executable headlessly via CLI in Linux/Termux and GitHub Actions CI without requiring a external backend or network connection.

### 2.1 Test Runner & Scripts (`package.json`)
- **Framework**: Node.js native test runner (`node --test` with `tsx`) or **Vitest** (configured for fast TypeScript execution in Node/`jsdom`).
- **Standardized NPM Scripts**:
  - `npm run typecheck`: `tsc --noEmit` (zero TypeScript errors gate).
  - `npm run test:unit`: Executes all unit & property-based test suites (`tests/unit/**/*.test.ts`).
  - `npm run test:integration`: Executes cross-module integration & persistence recovery suites (`tests/integration/**/*.test.ts`).
  - `npm run test:stress`: Executes the 1,000-board Onet & 1,000-board Match 3 Monte Carlo solvability/deadlock stress suite (`tests/stress/**/*.test.ts`).
  - `npm run test:sim`: Runs `scripts/simulate-economy.mjs` and `scripts/simulate-progression.mjs` and asserts balance invariants.
  - `npm test`: Runs `typecheck` + `test:unit` + `test:integration` + `test:stress`.

### 2.2 Target Test Directory Layout
```text
connectify-android/
├── tests/
│   ├── helpers/
│   │   ├── prng.ts                        # Deterministic Mulberry32 / Xorshift seeded PRNG
│   │   ├── boardBuilders.ts               # ASCII-to-Board fixture builders for Onet & Match 3
│   │   └── mockStorage.ts                 # Fault-injecting localStorage/IndexedDB mock (corruption, quota)
│   ├── unit/
│   │   ├── onet-pathfinding.test.ts       # Suite 1: Onet BFS pathfinding, turns <= 2, arrows, splits
│   │   ├── onet-board-gen.test.ts         # Suite 2: Onet board generation, parity, 1,000-board stress
│   │   ├── match3-swap.test.ts            # Suite 3: Match 3 swap validation, revert, blockers, locks
│   │   ├── match3-specials-cascade.test.ts# Suite 4: Match 3 4/5/L/T specials, combos, cascade determinism
│   │   ├── match3-deadlock.test.ts        # Suite 5: Match 3 no-moves detection & auto-shuffle
│   │   ├── economy-transactions.test.ts   # Suite 6: Atomic transactions, anti-exploit, diminishing returns
│   │   ├── progression-math.test.ts       # Suite 7: XP curves, levels, stars, independent progression
│   │   └── persistence-recovery.test.ts   # Suite 8: Save/load, checksums, WAL backup recovery, migrations
│   ├── integration/
│   │   ├── game-loop-onet.test.ts         # Full Onet level lifecycle -> win/loss -> reward -> save
│   │   ├── game-loop-match3.test.ts       # Full Match 3 level lifecycle -> win/loss -> reward -> save
│   │   ├── shop-and-themes.test.ts        # Earn currency -> buy theme -> equip -> verify game board assets
│   │   └── android-lifecycle.test.ts      # Pause/resume timer freeze, back-button stack, mid-game restore
│   └── stress/
│       └── monte-carlo-boards.test.ts     # 1,000 Onet boards + 1,000 Match 3 boards end-to-end bot solver
```

---

## 3. Automated Unit & Integration Test Suites Specification

### Suite 1: Onet Pathfinding & `<= 2`-Turn (Max 3 Segments) Rules (`tests/unit/onet-pathfinding.test.ts`)

Validates the core Onet connection engine (`getPath`, `canMatch`, `getTileCells`, `clearMatchedGroups`) across all geometric and rule configurations.

| Test ID | Test Case | Input / Board Fixture | Expected Assertion |
| :--- | :--- | :--- | :--- |
| `ONET-PF-01` | **0-Turn (1-Segment) Orthogonal Adjacency** | Two identical `1×1` tiles placed horizontally `(2,2)-(2,3)` and vertically `(4,2)-(5,2)`. | `getPath` returns valid 2-point path; `turns === 0` (1 segment). |
| `ONET-PF-02` | **0-Turn (1-Segment) Collinear Across Empty Cells** | Two identical tiles at `(1,1)` and `(1,6)` with `(1,2)..(1,5)` empty. | `getPath` returns straight path; fails with `NO_PATH` if any intermediate cell `(1,3)` is occupied. |
| `ONET-PF-03` | **1-Turn (2-Segment) L-Shape Connection** | Identical tiles at `(2,2)` and `(5,6)` with corner `(2,6)` empty and `(5,2)` blocked. | `getPath` returns 3-point L-path via `(2,6)`; `turns === 1` (2 segments). |
| `ONET-PF-04` | **2-Turn (3-Segment) U-Shape & Z-Shape Internal** | Identical tiles at `(3,2)` and `(3,5)` separated by obstacles at `(3,3)` and `(3,4)`, with row `2` clear. | `getPath` returns 4-point U-path `(3,2)->(2,2)->(2,5)->(3,5)`; `turns === 2` (3 segments). |
| `ONET-PF-05` | **2-Turn Exterior Border Gutter Routing** | Identical tiles on top edge `(1,2)` and `(1,5)` with `(1,3)-(1,4)` blocked; same for bottom `(ROWS, c)`, left `(r, 1)`, and right `(r, COLS)` edges. | `getPath` routes through virtual border row `0` / `ROWS+1` or col `0` / `COLS+1` with `turns === 2`. |
| `ONET-PF-06` | **`> 2`-Turn (4+ Segments) Rejection** | Winding maze where the only free corridor between matching tiles at `(2,2)` and `(5,5)` requires 3 turns (4 segments). | `getPath` returns `{ error: 'NO_PATH' }` (or `null`); match is strictly rejected. |
| `ONET-PF-07` | **Self-Tap & Mismatched Tile Rejection** | Tapping `(3,3)` twice (`r1===r2 && c1===c2`), or tapping two tiles with different `id` or different `groupSize` (`1×1` vs `1×2`). | `canMatch` returns `false`; `getPath` returns `null`. |
| `ONET-PF-08` | **Multi-Cell Master/Slave Group Footprint Routing** | Two matching `2×2` groups at `(1,1..2,2)` and `(1,5..2,6)` or `1×2` dominoes. Clicking a slave cell `(2,2)` resolves to master `(1,1)`. | `getPath` evaluates all constituent cells of both footprints and connects from the closest valid perimeter cell with `<= 2` turns. |
| `ONET-PF-09` | **Deterministic Multi-Cell Splitting (`clearMatchedGroups`)** | Matching two `2×2` tiles (`horizontal` vs `vertical` `splitAxis`), and matching two `1×2` / `2×1` tiles. | `2×2` splits into two `1×2` or `2×1` pairs; `1×2` splits into two `1×1` pairs. Sibling child IDs on each parent differ (`left[0].id !== left[1].id`), while corresponding children across parents match (`left[0].id === right[0].id` and `left[1].id === right[1].id`). Zero orphan slaves. |
| `ONET-PF-10` | **Directional Arrow (`openSide`) Constraints** | Tile A at `(3,3)` has `openSide: 'up'`; Tile B at `(3,5)` has `openSide: 'left'`. Test paths exiting A via `'right'` (invalid) vs `'up'` (valid) and entering B from `'left'` (valid) vs `'down'` (invalid). | `getPath` rejects any path whose first step from A is not `a.openSide` or whose final approach into B is not `b.openSide`. |

---

### Suite 2: Onet Solvable Board Generation & Deadlock/Shuffle Guarantee Across 1,000 Boards (`tests/unit/onet-board-gen.test.ts` & `tests/stress/monte-carlo-boards.test.ts`)

Proves mathematically and empirically that no player can ever get stuck on an unsolvable Onet board.

| Test ID | Test Case | Scope / Parameters | Expected Assertion |
| :--- | :--- | :--- | :--- |
| `ONET-BG-01` | **Seeded Determinism** | Same `(themeKey, level, seed)` passed twice to `generateBoard`. | Serialized board state (tile IDs, master/slave coordinates, `splitAxis`, `openSide`) is 100% byte-identical. |
| `ONET-BG-02` | **Grid Occupancy, Border Integrity & Even Parity** | Levels 1..100 across all themes. | Border cells (`r=0`, `r=ROWS+1`, `c=0`, `c=COLS+1`) are all `0`. Interior cell occupancy equals `ROWS * COLS`. Every `(id, groupRows, groupCols)` master group appears an **even** number of times (`count % 2 === 0`). Zero orphan slaves. |
| `ONET-BG-03` | **1,000-Board Initial Solvability Stress Test** | 1,000 boards generated with `mulberry32(seed)` across Levels 1 to 100 (tiers 1–5: Santai, Fokus, Menantang, Ahli, Master) and all themes. | **1,000 / 1,000 (100%)** pass `isBoardSolvable(board) === true` and `findHint(board) !== null`. Generation time per board `< 15ms` average (`< 50ms` p99). |
| `ONET-BG-04` | **1,000-Board Adversarial Playthrough & Deadlock Shuffle Guarantee** | Simulate playing all 1,000 boards to `countRemaining(board) === 0` using an adversarial greedy agent (picking random valid pairs rather than the constructive solution order to intentionally induce mid-game deadlocks). Whenever `findHint(board) === null` with `remaining > 0`, invoke `guaranteedShuffle`. | **1,000 / 1,000 (100%)** boards reach `0` remaining tiles. Every `guaranteedShuffle` call immediately produces `findHint(shuffled) !== null`, preserves exact remaining tile count and pair parity, never creates orphan slaves, and finishes in `< 10ms`. |
| `ONET-BG-05` | **Pathological 2-Tile & 4-Tile Corner Lock Recovery** | Hand-crafted deadlocked boards: e.g., 2 pairs (`A1, B1` and `B2, A2`) checkerboard-locked in a `2×2` corner or blocked by directional arrows (`openSide` pointing inward at each other). | `findHint(board)` returns `null`; `guaranteedShuffle(board)` breaks the deadlock on the first call (`findHint(shuffled) !== null`) and strips or reassigns valid `openSide` directions so the board is 100% clearable. |

---

### Suite 3: Match 3 Swap Validation (`tests/unit/match3-swap.test.ts`)

Validates all player move input rules and board state transitions on a Swap Match-3 grid.

| Test ID | Test Case | Input / Board Fixture | Expected Assertion |
| :--- | :--- | :--- | :--- |
| `M3-SW-01` | **Valid Orthogonal Swap Creating a Match** | `8×8` board where swapping `(3,2)` and `(3,3)` creates a horizontal or vertical 3-of-a-kind. | `validateSwap(board, {r:3,c:2}, {r:3,c:3})` returns `{ valid: true, matches: [...] }`; move counter decrements by `1`. |
| `M3-SW-02` | **Invalid Orthogonal Swap (No Match Created)** | Swapping `(2,2)` and `(2,3)` produces no 3+ alignment for either tile and neither tile is a special combo trigger. | `validateSwap` returns `{ valid: false, reason: 'NO_MATCH' }`; board state reverts to exact pre-swap matrix; move counter does **not** decrement. |
| `M3-SW-03` | **Non-Adjacent, Diagonal & Self-Swap Rejection** | Attempting to swap `(1,1)` with `(1,1)` (dist 0), `(1,1)` with `(2,2)` (diagonal, Manhattan dist 2), or `(1,1)` with `(1,4)` (dist 3). | Rejected immediately (`valid: false, reason: 'NOT_ADJACENT'`); zero state mutation. |
| `M3-SW-04` | **Out-of-Bounds & Hole/Empty Cell Rejection** | Swapping `(0,0)` with `(-1,0)` or `(0,8)`, or swapping into a masked/non-playable board hole cell (`cell.type === 'hole'`). | Rejected cleanly without throwing an exception (`valid: false, reason: 'OUT_OF_BOUNDS' | 'BLOCKED_CELL'`). |
| `M3-SW-05` | **Immovable Blocker & Locked Tile Rejection** | Swapping a tile frozen in Ice/Cage (`locked: true`) or an immovable Stone/Crate blocker (`movable: false`). | Rejected (`valid: false, reason: 'IMMOVABLE_TILE'`); adjacent clear damage must be used instead. |
| `M3-SW-06` | **Special Tile Direct Swap Bypass** | Swapping a Color Bomb / Rainbow tile with any normal colored tile, or swapping two adjacent Special Tiles (e.g., Line Bomb + Area Bomb), even when no 3-match of identical colors is formed. | `validateSwap` returns `{ valid: true, specialCombo: ... }` and triggers the special effect resolution. |
| `M3-SW-07` | **Input Lock During Active Cascades** | Dispatching a swap action while `engine.state === 'RESOLVING_CASCADE'` or `gameState !== 'playing'`. | Action is ignored (`valid: false, reason: 'INPUT_LOCKED'`); active cascade state is untouched. |

---

### Suite 4: Match 3 L/T/4/5 Special Tile Creation & Cascade Determinism (`tests/unit/match3-specials-cascade.test.ts`)

Validates shape classification, special tile spawning coordinates, special-to-special combinations, gravity physics, and deterministic cascade chains.

| Test ID | Test Case | Input / Board Fixture | Expected Assertion |
| :--- | :--- | :--- | :--- |
| `M3-SP-01` | **Match-4 Line Bomb (Striped Tile) Creation** | Swapping `(4,2) -> (4,3)` to complete a 4-in-a-row horizontal or vertical match. | Clears the 4 tiles and spawns a **Line Bomb** (`striped_h` or `striped_v`) at the **moved destination coordinate `(4,3)`**. |
| `M3-SP-02` | **L-Shape & T-Shape (5-Tile) Area Bomb (Wrapped Tile) Creation** | Swapping a tile into the intersection of a `3×3` L-shape, T-shape, or `+` cross match (5 or 6 connected tiles of the same color). | Connected component analyzer merges intersecting horizontal + vertical runs into a single L/T match (never double-counting the intersection cell) and spawns one **Area/Wrapped Bomb** (`bomb_area`) at the swap/intersection point. |
| `M3-SP-03` | **Match-5 Straight Line Color Bomb (Rainbow) Creation** | Swapping a tile to form 5 (or 6) collinear tiles of the same color. | Spawns a **Color Bomb / Rainbow** (`color_bomb`) at the swap destination coordinate; does not downgrade to a 4-match or L-bomb. |
| `M3-SP-04` | **Simultaneous Dual-Match Disambiguation** | A single swap `(3,3) <-> (3,4)` simultaneously completes a 3-match for color A at `(3,3)` and a 4-match for color B at `(3,4)`. | Both matches resolve in the same wave; `(3,4)` spawns its Line Bomb; score awards both match groups. |
| `M3-SP-05` | **Special Tile Activation & Chain Reaction Triggers** | 1) Line Bomb clears full row/col.<br>2) Area Bomb clears `3×3` radius.<br>3) Color Bomb + Red tile clears all Red tiles.<br>4) Blast hitting another Special Tile on the board. | Secondary special tiles hit by a blast wave are queued and detonated in a deterministic breadth-first chain reaction without infinite recursion (guarded by a `triggeredSet` per wave). |
| `M3-SP-06` | **Special + Special Combo Matrix** | Test all 6 pairs:<br>• `Line + Line` -> Cross clear (1 row + 1 col)<br>• `Line + Area` -> Giant `3-row × 3-col` cross clear<br>• `Area + Area` -> `5×5` mega blast<br>• `Color + Line` -> Converts all tiles of that color into Line Bombs and detonates them<br>• `Color + Area` -> Converts all tiles of that color into Area Bombs and detonates them<br>• `Color + Color` -> Full-board clear of all destructible tiles & 1 layer of blockers. | Exact target cell sets are cleared, blockers take damage once per explosion wave, and combo score multipliers apply accurately. |
| `M3-SP-07` | **Gravity Drop & Seeded Refill Cascade Determinism** | Execute a swap on a board with `mulberry32(seed = 42)` across a multi-step cascade (Wave 1 clear -> gravity drop -> top refill -> Wave 2 auto-match -> Wave 3 settle). Run twice with seed `42`. | Both runs produce the **exact same sequence of cascade frames**, final settled board matrix, total score, combo multiplier (`1.0x, 1.5x, 2.0x...`), and objective progress. |
| `M3-SP-08` | **Obstacle & Gravity Interaction + Max Cascade Cap** | Board containing multi-HP blockers (Ice/Frosting 1–2 HP adjacent damage, Crate/Stone blocking gravity or falling per column rules). Test a rigged infinite-match generator. | Adjacent matches reduce blocker HP by 1 per wave; settled board has zero empty playable cells; cascade loop enforces `MAX_CASCADE_ITERATIONS` (e.g. 25) to guarantee termination. |

---

### Suite 5: Match 3 No-Moves Detection & Auto-Shuffle (`tests/unit/match3-deadlock.test.ts`)

| Test ID | Test Case | Input / Board Fixture | Expected Assertion |
| :--- | :--- | :--- | :--- |
| `M3-NM-01` | **Initial Board Generation Invariants (1,000 Boards)** | Generate 1,000 Match 3 boards across Levels 1–100 using seeded PRNG. | **0 / 1,000** boards contain any pre-existing 3-in-a-row match at start (`findAllMatches(board).length === 0`), and **1,000 / 1,000** boards have `findAllValidSwaps(board).length >= 1`. |
| `M3-NM-02` | **Exhaustive Potential-Move Scanner Accuracy** | Test `findAllValidSwaps(board)` against: (a) standard `[A, A, B, A]` patterns, (b) `[A, B, A]` with `A` above/below `B`, (c) a board with zero color matches but one `color_bomb` adjacent to a normal tile, and (d) a completely deadlocked checkerboard matrix. | Returns exact list of valid swaps for (a), (b), (c); returns `[]` (`hasValidMoves === false`) for (d). Execution time `< 1ms` per `8×8` scan. |
| `M3-NM-03` | **Deadlock Auto-Shuffle Preservation & Recovery** | Feed 100 deadlocked boards (including boards with immovable blockers, special tiles, and collection items) into `shuffleMatch3Board(board, rng)`. | After shuffle: (1) `findAllMatches(shuffled).length === 0` (no free accidental cascades), (2) `findAllValidSwaps(shuffled).length >= 1` (at least 1 playable move), (3) immovable obstacles/holes remain in their exact coordinates, and (4) special tiles and remaining objective items are preserved. |

---

### Suite 6: Economy Atomic Transactions & Anti-Duplicate Reward Exploit Tests (`tests/unit/economy-transactions.test.ts`)

Validates the unified economy engine (Connect Coins / Permen) across Onet, Match 3, Daily Challenges, Achievements, and the Theme/Booster Shop.

| Test ID | Test Case | Exploit / Scenario Simulated | Expected Assertion |
| :--- | :--- | :--- | :--- |
| `ECON-01` | **Zero-Negative-Balance & Overdraft Rejection** | Player with balance `50` attempts to purchase a `120`-coin theme or `60`-coin booster pack, or passes a negative/NaN/float delta (`-10`, `NaN`, `Infinity`, `12.5`). | Transaction throws/returns `INSUFFICIENT_FUNDS` or `INVALID_AMOUNT`; balance remains `50`; inventory is unchanged. Balance can **never** drop below `0` under any code path. |
| `ECON-02` | **Idempotent Reward Claim (`runId` / `opId` Deduplication)** | Submit the exact same `PROCESS_WIN` `runId`, `CLAIM_MISSION_REWARD` `missionId`, `CLAIM_ACHIEVEMENT_REWARD` `achievementId:tier`, or `CLAIM_LOGIN_REWARD` `dayKey` 10 times consecutively (simulating rapid multi-tap or app restart replay). | First call credits currency & XP once and records the ID in the transaction log / `processedRuns`; the subsequent 9 calls return idempotent no-ops with `0` currency/XP delta. |
| `ECON-03` | **Atomic Rollback on Mid-Transaction Failure** | Simulate a storage write failure or invalid item lookup halfway through `purchaseItem` (after debiting currency, before adding item to `unlockedThemes` / booster inventory). | Atomic state transition guarantees neither debit nor unlock persists if the transaction fails; balance and inventory remain in their pre-transaction state. |
| `ECON-04` | **Anti-Duplicate Shop Purchase Guard** | Player who already owns `theme_sakura` or a cosmetic item dispatches `purchaseItem('theme_sakura')` again. | Returns `ALREADY_OWNED`; zero currency is deducted; `unlockedThemes` array contains no duplicate IDs. |
| `ECON-05` | **Anti-Farming Diminishing Returns on Replayed Levels** | Player replays Level 1 ten times in a row after already 3-starring it, vs completing a new frontier level. | First-time completion and star upgrades award full base + star bonus currency; repeated replays of an already-completed easy level apply the configured diminishing-return multiplier (e.g., 25%–50% replay reward or daily replay cap) so Level 1 farming cannot out-earn normal progression. |
| `ECON-06` | **Onet vs Match 3 Earning Parity** | Simulate 10 minutes of average play in Onet vs 10 minutes of average play in Match 3 at equivalent difficulty tiers. | Currency earned per minute (`Coins/min`) between Onet and Match 3 stays within `±15%` parity band so neither game mode feels economically inferior. |

---

### Suite 7: Progression XP, Level & Star Calculations (`tests/unit/progression-math.test.ts`)

| Test ID | Test Case | Scenario / Input | Expected Assertion |
| :--- | :--- | :--- | :--- |
| `PROG-01` | **XP Curve Monotonicity & Inverse Level Formula** | Test `xpForLevel(L)` and `getAccountProgress(profile)` for Levels `L = 1..100` at `xpForLevel(L) - 1`, `xpForLevel(L)`, and `xpForLevel(L) + 1`. | `xpForLevel(L + 1) - xpForLevel(L)` is strictly increasing. At exact boundary `xp = xpForLevel(L)`, computed level is `L`, `current === 0`, `percent === 0`. At `xpForLevel(L) - 1`, level is `L - 1`. Never returns `NaN` or level `< 1`. |
| `PROG-02` | **Onet & Match 3 Star Rating Calculation (1–3 Stars)** | Test level completion with: (a) failed objective (`0` stars), (b) cleared with base objective only (`1` star), (c) cleared above 2-star time/moves/score threshold (`2` stars), (d) cleared above 3-star threshold / flawless (`3` stars). | Star rating is `0` on loss and `1..3` on win. Replaying a level with a *lower* score (`1` star) after previously earning `3` stars **never downgrades** the saved best star count (`Math.max(prevStars, newStars)`). |
| `PROG-03` | **Independent Per-Game Progression Trees** | Player completes Onet Levels 1..20 without ever launching Match 3; another player completes Match 3 Levels 1..20 without ever launching Onet. | Onet unlocks Onet Level 21 while Match 3 stays at Level 1 (and vice versa). Global Player XP, Level, and Connect Coins accumulate seamlessly from either mode without forcing cross-mode play. |
| `PROG-04` | **Daily & Weekly Challenge Rollover & Streak Integrity** | Simulate timestamps across UTC+7 (WIB) midnight boundaries: consecutive days (`day N -> day N+1`), skipped day (`day N -> day N+2`), and completed-but-unclaimed daily missions at midnight rollover. | Consecutive day increments streak; skipped day resets streak to `1`; completed-but-unclaimed missions are archived to `pendingMissions` or preserved rather than silently lost. |

---

### Suite 8: Persistence Save/Load, Schema Migration & Corruption Recovery (`tests/unit/persistence-recovery.test.ts`)

Validates that the 100% offline-first persistence engine never loses player progress or crashes on malformed storage data.

| Test ID | Test Case | Fault / Scenario Injected | Expected Assertion |
| :--- | :--- | :--- | :--- |
| `PERS-01` | **Deterministic Round-Trip Serialization** | Populate a full player state (profile, coins, XP, Onet levels/stars, Match 3 levels/stars, owned/equipped themes, active in-progress Onet & Match 3 boards, achievements, settings), save to storage, and reload in a fresh engine instance. | Reloaded state deep-equals the saved state (`assert.deepEqual(loaded, saved)`), including valid checksum metadata. |
| `PERS-02` | **Truncated / Corrupted Primary Save -> WAL Backup Recovery** | Save valid state `S1`, then save `S2`. Corrupt the primary storage slot (`connectify_save_v1`) with truncated JSON `'{"version":1,"profile":{"coins":99'` (simulating an Android process kill or battery death mid-write). Initialize Persistence Engine. | Engine detects JSON parse failure / checksum mismatch on primary slot, automatically falls back to the atomic write-ahead backup slot (`connectify_save_v1_backup`), restores `S1` cleanly, repairs the primary slot, and emits a recovery telemetry flag without crashing. |
| `PERS-03` | **Tampered / Invalid Checksum Detection & Sanitization** | Modify raw JSON fields in storage (e.g., setting `coins: -999999` or `unlockedThemes: "not_an_array"` or mismatching the integrity hash). | Schema validator & sanitizer clamps invalid types/negative numbers to safe defaults or restores from backup slot; app boots into a playable state without uncaught exceptions. |
| `PERS-04` | **Legacy `connectify-new` Profile Migration (v0 -> v1)** | Inject a legacy `connectify-new` profile object (`permen`, `highestLevel`, `unlockedThemes`, `statistics`) into storage and initialize `connectify-android`. | Migration adapter upgrades schema to `v1`, maps `permen`/`coins`, preserves `highestLevel`, `accountXP`, and `unlockedThemes`, and stamps `schemaVersion: 1`. |
| `PERS-05` | **Active Mid-Level Session Snapshot & Resume** | Start an Onet level (make 5 matches, 62s remaining) and a Match 3 level (make 4 swaps, 14 moves remaining). Trigger `onAppPause` / save snapshot, destroy engine, and cold-boot. | Engine detects active in-progress session snapshot and restores exact board matrix, score, combo, remaining time/moves, and equipped theme. |

---

## 4. End-to-End UI, Offline Capability, Android Lifecycle & 60 FPS Performance Verification Gates

### 4.1 End-to-End User Journey Verification Gate
Before packaging the final APK, the following end-to-end journeys must be verified across the integrated application:
1. **Cold Boot & Home Hub**: App launches directly into the Connectify Home Screen in `< 2.0s` with **zero mandatory login wall** (no Supabase auth blocker). Displays Player Level/XP bar, Connect Coins balance, Daily Challenge card, Onet entry card, Match 3 entry card, Shop, Collection, and Profile/Settings.
2. **Onet Full Loop**: Home -> Onet Level Select -> Start Level 1 -> Use Hint -> Match tiles (including `2×2`/`1×2` split tiles on Level 3+) -> Complete Level -> Victory Modal displays stars, score, XP bar animation, and Connect Coins earned -> Next Level unlocked.
3. **Match 3 Full Loop**: Home -> Match 3 Level Select -> Start Level 1 -> Execute valid 3-match, 4-match (Line Bomb), and L/T/5-match (Area/Color Bomb) -> Trigger cascade -> Complete level objective -> Victory Modal credits shared Connect Coins and XP -> Next Level unlocked.
4. **Shop -> Purchase -> Equip -> Visual Verification**: Open Theme Shop -> Preview a theme -> Purchase with earned Connect Coins -> Equip theme -> Enter both Onet and Match 3 -> Verify board background, tile sprites, UI accents, and sound effects reflect the equipped theme immediately.

### 4.2 100% Offline Capability Gate
- **Network Isolation Test**: Run the application with all network interfaces disabled (`navigator.onLine === false` and all external requests blocked).
- **Pass Criteria**:
  1. Zero failed network requests to `supabase.co`, `/api/cde`, `/api/profile`, or `fonts.googleapis.com` (all fonts, icons, `.webp`/`.png` sprites, and audio synthesis/SFX are bundled locally inside the APK `assets/public/`).
  2. Every gameplay feature, level progression, reward claim, shop purchase, theme switch, and save/load operation functions identically offline and online.

### 4.3 Android Hardware Back-Button & Lifecycle (`pause`/`resume`) Gate
- **Hardware Back-Button Navigation Stack (`Capacitor App.addListener('backButton')`)**:
  - When a Modal/Drawer (Settings, Shop Preview, Pause, Help) is open -> Back button closes only the top modal.
  - When in active gameplay (Onet or Match 3) and unpaused -> Back button opens the **Pause Modal** (never abruptly exits and loses level progress).
  - When in Pause Modal -> Back button resumes gameplay (or exits to Level Select upon explicit confirmation).
  - When on Level Select / Shop / Collection / Profile screen -> Back button navigates back to the Home Screen.
  - When on the root Home Screen -> Back button prompts exit confirmation or delegates to `App.minimizeApp()` / `App.exitApp()`.
- **App Lifecycle (`pause` / `resume` / `visibilitychange`)**:
  - Backgrounding the app or locking the phone screen during an active Onet timed level **immediately freezes the countdown timer**, pauses all WebAudio/BGM playback, and flushes the current in-progress board state to local storage.
  - Returning to the foreground resumes audio cleanly (respecting user mute settings) and keeps the game in the Paused state so the player is ready before the Onet timer ticks again.

### 4.4 60 FPS Performance & Memory Budgets Gate
- **Frame Time Budget (`<= 16.67ms` per frame for 60 FPS)**:
  - **Onet Pathfinding & Hint Search**: `getPath()` `< 0.5ms`; `findHint()` `< 2.0ms`; `guaranteedShuffle()` `< 10.0ms` on the main thread.
  - **Match 3 Cascade Step**: `findAllMatches()` + gravity calculation + `findAllValidSwaps()` `< 2.0ms` per cascade wave on an `8×8` board.
  - **Zero Layout Thrashing**: Board grids use pre-computed CSS Grid / `transform: translate3d(...)` and `scale(...)` GPU-composited animations (`will-change: transform, opacity`) rather than animating `top`/`left`/`width`/`height`.
  - **Particle & DOM Node Cap**: Burst particles (`TileBurst` / `VictoryBurst`) are capped at `<= 24` simultaneous elements per match and cleaned up immediately on animation completion; Respects `prefers-reduced-motion`.
- **Asset & APK Footprint Budget**:
  - Only Onet, Match 3, Shared UI, Theme, and Audio assets are packaged into the production Vite bundle (`dist/`), excluding unused legacy game engines (`matter-js`, `phaser`, `express`, `@supabase/supabase-js`) from the runtime client bundle to minimize JS parse time and WebView memory usage (`< 120 MB` RSS on Android).

---

## 5. Release Verification Checklist (Phase 8 Gate)

| Gate ID | Verification Check | Command / Method | Required Result |
| :--- | :--- | :--- | :--- |
| `GATE-01` | TypeScript Strict Compilation | `npm run typecheck` | `0` errors |
| `GATE-02` | Unit & Integration Test Suites (Suites 1–8) | `npm test` | `100%` passing (`0` failures) |
| `GATE-03` | 1,000-Board Onet + 1,000-Board Match 3 Stress Solver | `npm run test:stress` | `2,000 / 2,000` solvable & deadlock-free |
| `GATE-04` | 30-Day Economy & Progression Simulations | `npm run test:sim` | All 9 player profiles within target balance bounds; `0` negative balances |
| `GATE-05` | Production Web Bundle Build & Asset Audit | `npm run build` | Clean build; zero broken asset paths; zero external CDN dependencies |
| `GATE-06` | Capacitor Android Sync & Gradle APK Build | `npx cap sync android && cd android && ./gradlew assembleDebug` | Installable `.apk` generated and verified |
