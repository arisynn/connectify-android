# Connectify Android — Match 3 Technical Specification

**Document Path:** `docs/MATCH3_TECHNICAL_SPEC.md`  
**Author:** Agent 04 — Match 3 Gameplay Engineer (`@match3-eng`)  
**Source Repository Audited (READ-ONLY):** `/root/.gemini/antigravity/scratch/connectify-new`  
**Target Android Repository:** `/root/.gemini/antigravity/scratch/connectify-android`  

---

## 1. Source Repository Audit: Exact Files & Line References in `connectify-new`

A comprehensive inspection of `/root/.gemini/antigravity/scratch/connectify-new` reveals that the current repository divides Match-style and Grid-Cascade puzzle mechanics across two implementations plus shared core modules:

1. **`TripleGame` (`src/game/minigames/TripleGame.tsx`)**: Registered as `"Triple Match"` (`id: 'triple'`), currently implemented as a 31-line stack-to-tray tile-matching minigame without a 2D swap grid.
2. **`BlockPuzzle` (`src/game/block-puzzle/*` and `SPEC.md`)**: Contains the repository's existing 2D grid obstacle engine, gravity compaction loop, recursive cascade resolver, 3-star level objective evaluator, Dynamic Difficulty Adjustment (DDA), constructive Procedural Content Generation (PCG), and in-game booster system (`Shuffle`, `Hammer`, `Bomb`). Because Connectify Android ships **exclusively Onet and Match 3**, the level progression, obstacle overlays (`ice`, `wood`, `metal-2`, `metal-1`, `stone`, `gem`), gravity/cascade architecture, DDA, PCG, and booster hooks from `src/game/block-puzzle/*` are directly adapted and upgraded into the production Match 3 engine.

### 1.1 Exact File & Line Map in `connectify-new`

| File Path in `connectify-new` | Exact Lines | Role & Mechanics Implemented |
| :--- | :--- | :--- |
| `src/game/minigames/TripleGame.tsx` | L1–L31 | Current `"Triple Match"` screen. L11–L15: 12 stacks of 3 layered tiles (`36` tiles = `12` trios) sampled from `tileIdsFor(activeTheme.id).slice(0, 6)`. L16–L25: 7-slot holding tray (`tray`), 1-use `undo`, trio removal when `items.filter(t => t === id).length === 3`, flat scoring `cleared * 150`. |
| `src/game/minigames/useMiniRound.ts` | L1–L21 | Shared round lifecycle hook for `memory` and `triple`. L6–L8: Fisher-Yates `randomize`. L9–L13: 120s countdown timer & `visibilitychange` auto-pause. L14–L19: `finish()` dispatches `RewardEngine.processWin` and `cde.queueMutation('PROCESS_WIN', payload)` with hardcoded `level: 1`. |
| `src/game/components/PuzzleGameFrame.tsx` | L1–L23 | Shared wrapper frame for `TripleGame` and `MemoryGame`: header with back button, countdown timer (`urgent` at `<= 15s`), pause button, ready/pause overlay (`L17`), and result modal with `<VictoryBurst/>` (`L21`). |
| `src/core/games.ts` | L1–L35 | Game hub registry. L19–L22: `block` metadata & stats. L27–L30: `triple` metadata (`name: 'Triple Match'`, palette `#f6efff` / `#a77bff`, cover art `bakery` `[1,4,7,9,10,12]`, stats `tripleGames`, `tripleWins`, `tripleHighScore`, `tripleMatches`). |
| `src/game/block-puzzle/hooks/useBlockPuzzle.ts` | L1–L568 | Grid puzzle state machine. L35–L68: board, obstacles, score, combo, level, mission state, and DDA skill state. L90–L150: 3-mission/3-star evaluation & `PROCESS_WIN` dispatch. L167–L222: `initGame()` with seeded level config & DDA bracket. L256–L413: `executeClearAndCascade()` recursive cascade loop, obstacle damage (`L365–L376`), columnar gravity (`L384–L399`), combo banners (`L339–L352`). L450–L530: `shuffleTray`, `useHammerAt` (1x1 clear), `useBombAt` (3x3 clear). |
| `src/game/block-puzzle/hooks/usePowerups.ts` | L1–L71 | Booster inventory & activation state (`activePowerup: 'hammer' \| 'bomb' \| null`). L16–L53: `requestShuffle`, `toggleHammer`/`consumeHammer`, `toggleBomb`/`consumeBomb` dispatching `cde.queueMutation('USE_ITEM', { itemId })`. |
| `src/game/block-puzzle/core/levelConfig.ts` | L1–L66 | Defines `ObstacleType` (`'ice' \| 'wood' \| 'metal-2' \| 'metal-1' \| 'stone' \| 'gem' \| ''`), `MissionType` (`'score' \| 'clear_lines' \| 'destroy_gems' \| 'destroy_ice' \| 'destroy_wood' \| 'max_moves'`), `validateLevelConfig()` (L23–L41), and `getLevelConfig()` with safe fallback (L43–L66). |
| `src/game/block-puzzle/core/levels.json` | L1–L555 | 20 hand-tuned levels (`"1"` to `"20"`) with obstacle layouts, `gravity` flags, and 3-star mission tuples. |
| `src/game/block-puzzle/core/pcg.ts` | L1–L38 | Constructive seeded procedural level generator (`generateProceduralLevel`) for levels `21+` using `seededRandom`, chapter rotation every 5 levels, recovery pacing (`level % 5 === 1`), and obstacle budget scaling. |
| `src/game/block-puzzle/core/dda.ts` | L1–L90 | Dynamic Difficulty Adjustment (`DDA_CONFIG`). L18–L29: `calculateMatchSkill` & EMA skill tracker (`SKILL_EMA_ALPHA = 0.3`). L31–L36: `getBracket` (`'pity' \| 'easy' \| 'normal' \| 'hard'`, pity triggered at `retryCount >= 3`). L38–L90: `applyDDAToLevel` adjusts move targets and obstacle counts. |
| `src/game/block-puzzle/BlockPuzzleScreen.tsx` | L1–L432 | Grid UI & pointer gesture handling. L22–L31: `ObstacleOverlay` visual components for `ice`, `wood`, `metal-2`, `metal-1`, `stone`, and `gem`. L128–L213: pointer drag/drop & coordinate mapping. L245–L316: grid rendering, clearing cell flash, `<GameParticles/>`, and floating combo text. |
| `src/game/block-puzzle/components/BlockPuzzleHeader.tsx` | L1–L7 | Top HUD displaying current level, score, move counter, and 3-mission checklist with `<Star/>` / `<Check/>` indicators. |
| `src/game/block-puzzle/components/BlockPuzzleFooter.tsx` | L1–L6 | Bottom booster bar (`Shuffle`, `Hammer`, `Bomb`) with badge counts and active toggle highlight. |
| `src/game/block-puzzle/components/BlockResults.tsx` | L1–L22 | Pause, Victory, and Defeat modal displaying `<VictoryBurst/>`, final score, `+XP`, 3-star mission breakdown, level-up notice, and Next Level / Retry actions. |
| `src/core/tileCatalog.js` | L1–L6 | Maps all 19 themes to tile ID arrays (`BEACH_TILES` 15 tiles; 9 standard/premium sets × 16 tiles; 5 reward sets × 10 tiles; 4 seasonal sets × 16 tiles) via `tileIdsFor(theme)`. |
| `src/core/theme/registry.ts` | L1–L34 | Builds `DEFAULT_THEMES` mapping each tile ID to `/art/<theme>/<i>.webp` or `/art/premium/<theme>/<i>.webp` and defining theme color tokens. |
| `src/components/theme/DynamicIcon.tsx` | L1–L32 | Renders themed tile sprite `activeTheme.assets.tiles[name]` with `object-contain` aspect preservation. |
| `src/core/cosmetics.js` | L1–L82 | Defines surface skins (`tile1_*`, `block_*`), victory effects (`effect_*`), and match animations (`anim_onet_*`, `anim_block_*`) with ownership and equip helpers (`equippedCosmetic`). |
| `src/game/components/TileBurst.tsx` | L1–L22 | Match burst effect: expanding ring (`burst-ring`), 8 radial particles (or `<GameParticles/>` cosmetic), and 4 polygon-clipped image shards. |
| `src/core/audio/AudioEngine.tsx` & `ClubSynth.ts` | L1–L22, L1–L52 | Procedural Web Audio synthesizer (`ClubSynth`). L47 of `ClubSynth.ts` defines SFX frequency patterns: `click`, `place`, `match`, `split`, `clear`, `combo`, `win`, `lose`, `wrong`, `shuffle`, `purchase`. |
| `src/core/reward.js` | L1–L104 | `RewardEngine.processWin`: idempotent `runId` check (`L14`), XP formula (`L15`), statistics aggregation (`L20–L57`), level advancement (`L39`, `L56`), mission progress (`L87–L97`), and achievement unlock notifications (`L99–L101`). |
| `src/core/economy.js` | L1–L37 | Item prices (`hint: 8`, `shuffle: 12`, `hammer: 14`, `bomb: 18`), theme prices (`60–150`), daily cap (`100`), and ledger recording. |
| `src/core/misiHarian.js` & `src/core/achievements.js` | L1–L179, L1–L287 | Daily/weekly mission pools (`d_triple_*`, `d_block_*`) and tiered achievements (`triple_trios`, `triple_master`, `block_stars`, `block_lines`, `blocks_cleared`). |

---

## 2. How the Current Implementation Works

### 2.1 Board Initialization
* **In `TripleGame.tsx` (L11–L15)**: Selects 6 tile IDs from `tileIdsFor(activeTheme.id)` using `randomize()`, constructs 3 layers of 12 tiles each (3 copies of 4 tile IDs per layer), and distributes them into 12 vertical stacks of depth 3 (`36` tiles total). There is no 2D coordinate grid.
* **In `useBlockPuzzle.ts` (L190–L204)**: Generates a seed `${profile?.id || 'guest'}_${levelToPlay}_${retryCount.current}`, loads or procedurally generates a `LevelConfig` (`getLevelConfig(levelToPlay, bracket, seed)`), initializes a `10×10` `emptyBoard` and `initialObstacles` matrix, and populates predefined obstacles (`ice`, `wood`, `metal-2`, `metal-1`, `stone`, `gem`) at `{ r, c }`.

### 2.2 Swap / Move Validation
* **In `TripleGame.tsx` (L19–L25)**: There is no tile swapping; tapping stack `i` pops its top tile into a 7-slot array (`tray`) as long as `stacks[i].length > 0` and `tray.length < 7`.
* **In `useBlockPuzzle.ts` (L70–L83, L415–L420)**: Validates whether a polyomino piece fits empty cells not blocked by `['wood', 'metal-2', 'metal-1', 'stone']`, while allowing placement over `'ice'` and `'gem'`.

### 2.3 Match Detection
* **In `TripleGame.tsx` (L23)**: Checks if the 1D `tray` array contains 3 occurrences of the picked tile ID (`items.filter(t => t === id).length === 3`).
* **In `useBlockPuzzle.ts` (L266–L285)**: Scans all `10` rows and `10` columns for full lines (`rowsToClear`, `colsToClear`). It does **not** detect 3-in-a-row, 4-in-a-row, 5-in-a-row, L-shape, or T-shape contiguous same-tile clusters.

### 2.4 Gravity & Refill
* **In `useBlockPuzzle.ts` (L384–L399)**: When `currentLevelConfig.gravity` is `true`, iterates column-by-column (`c = 0..9`) from bottom to top (`readR = BOARD_SIZE - 1` down to `0`) with a write pointer `writeR = BOARD_SIZE - 1`. Whenever `nextBoard[readR][c] !== '' || nextObstacles[readR][c] !== ''`, it moves both the board cell and obstacle to `writeR` and decrements `writeR`.
* **Refill**: Neither `TripleGame.tsx` nor `useBlockPuzzle.ts` refills empty top cells with newly spawned tiles after gravity compaction.

### 2.5 Cascades & Combo Chains
* **In `useBlockPuzzle.ts` (L256–L413)**: `executeClearAndCascade(currentBoard, currentObstacles, currentTray, currentCombo, iteration)` highlights matched cells in `clearingCells` for `400ms` (`L356, L412`), clears the cells and degrades obstacles (`L365–L376`), compacts columns via gravity (`L384–L399`), waits `250ms` (`L408`), and recursively invokes `executeClearAndCascade(..., newCombo, iteration + 1)` until `linesCleared === 0 || iteration >= 5` (`L293`).

### 2.6 Special Tiles & Obstacles
* **Special Tiles**: Neither `TripleGame.tsx` nor `useBlockPuzzle.ts` creates in-grid special tiles (Striped Horizontal/Vertical Line Blasters, 3×3 Wrapped Bombs, or Rainbow Color Bombs) from 4/5/L/T matches.
* **Obstacles (`useBlockPuzzle.ts` L365–L376)**:
  * `ice`: Cleared in 1 hit (`nextObstacles[r][c] = ''`; `iceDestroyed++`).
  * `wood`: Cleared in 1 hit (`nextObstacles[r][c] = ''`; `woodDestroyed++`).
  * `metal-2`: Degrades to `metal-1` on first hit (`nextObstacles[r][c] = 'metal-1'`), protecting the underlying cell.
  * `metal-1`: Cleared on second hit (`nextObstacles[r][c] = ''`).
  * `stone`: Indestructible by normal clears (`obs !== 'stone'`).
  * `gem`: Collected in 1 hit (`nextObstacles[r][c] = ''`; `gemsDestroyed++`; `+100` bonus score).

### 2.7 Boosters
* **In `TripleGame.tsx` (L16, L26)**: Single `Undo` button per round (restores previous `stacks`, `tray`, and `cleared` state).
* **In `usePowerups.ts` (L1–L71) & `useBlockPuzzle.ts` (L450–L530)**:
  * `shuffle` (`profile.shuffles`): Consumes 1 `shuffle` via `USE_ITEM` and regenerates the tray.
  * `hammer` (`profile.hammers`): Toggles targeting mode (`activePowerup === 'hammer'`); tapping a non-empty cell clears `board[row][col] = ''`, adds `+2` score, and consumes 1 `hammer`.
  * `bomb` (`profile.bombs`): Toggles targeting mode (`activePowerup === 'bomb'`); tapping `(row, col)` clears a `3×3` region (`row-1..row+1`, `col-1..col+1`), adds `+5` score per cell, and consumes 1 `bomb`.

### 2.8 Deadlock / No-Moves Detection
* **In `TripleGame.tsx` (L18)**: Fails immediately when `tray.length >= 7` or `round.time === 0`.
* **In `useBlockPuzzle.ts` (L224–L254)**: `checkGameOver` checks whether any remaining piece in `currentTray` satisfies `canPlace(piece, r, c, currentBoard, currentObstacles)`. There is no swap-based deadlock detection (`findValidSwaps`) or automatic board shuffle when no moves remain.

### 2.9 Scoring & Level Objectives
* **In `TripleGame.tsx` (L17–L18)**: Flat `score = cleared * 150`; single fixed objective (clear all 12 trios within 120s).
* **In `useBlockPuzzle.ts` (L90–L150, L315–L354)**:
  * Placement base score: `cellsPlaced * 10`.
  * Clear score: `((linesCleared * (linesCleared + 1)) / 2) * 100 + (newCombo > 1 ? (newCombo - 1) * 200 : 0)`.
  * Gem bonus: `+100` per gem; Perfect Clear bonus: `+2000`.
  * 3 Missions per level (`currentLevelConfig.missions[0..2]`): `missions[0]` is the primary objective required to win the level (1 Star); `missions[1]` and `missions[2]` grant the 2nd and 3rd Stars upon completion.

---

## 3. Identified Bugs, Input Locks, Cascade Timing Issues & Algorithmic Gaps

| # | Issue Category | Exact Location in `connectify-new` | Root Cause & Impact | How We Fix & Improve It in `connectify-android` |
| :- | :--- | :--- | :--- | :--- |
| **1** | **Architectural Gap: Tray Minigame vs. True Grid-Swap Match 3** | `src/game/minigames/TripleGame.tsx` (L11–L30), `useMiniRound.ts` (L16) | `TripleGame.tsx` is a 31-line stack-to-tray minigame locked to `level: 1` with no 2D board, no swaps, no special tiles, no gravity, and no level tree. Meanwhile, `BlockPuzzle` (`src/game/block-puzzle/*`) has the 2D grid, gravity, cascade loop, obstacles, 3-star missions, DDA, PCG, and boosters, but is being retired as a game mode. | Replace the stack-tray `TripleGame` with a full, deterministic **2D Grid-Swap Match 3 Engine** (`src/game/match3/*`) that inherits and upgrades `BlockPuzzle`'s level tree, obstacles, 3-star missions, DDA, seeded PCG, and boosters (`Hint`, `Hammer`, `Bomb`, `Shuffle`), while using Connectify's themed tile sets (`tileIdsFor(activeTheme.id)`). |
| **2** | **Un-Epoch'd Timeout Race & Stale Closures** | `useBlockPuzzle.ts` (L31–L34, L360–L412) | `delayed.current.push(setTimeout(fn, ms))` does not track a game-session `epoch` counter (unlike `useOnetGame.ts` L24 & L29). If the player restarts, pauses, or triggers a booster near a timeout boundary, queued callbacks still execute with stale `currentBoard` closures. | Introduce a monotonic `epochRef` + deterministic phase state machine (`'idle' \| 'swapping' \| 'reverting' \| 'flashing' \| 'cascading' \| 'shuffling' \| 'bonus_drain' \| 'won' \| 'lost'`). Every scheduled step checks `epochRef.current === capturedEpoch` and pauses cleanly when the app backgrounds or opens a modal. |
| **3** | **Input Lock Bypass & Missing Cascade Trigger on Boosters** | `useBlockPuzzle.ts` (L457–L530) | `useHammerAt` (L458) and `useBombAt` (L491) do not check `actionLock.current`, do not damage `obstacles[r][c]` (cannot break `ice`, `wood`, `metal`, or collect `gem`), and **never call `executeClearAndCascade`** after removing cells—leaving floating tiles in mid-air when gravity is enabled! | Route `Hammer` (single-tile/obstacle smash) and `Bomb` (3×3 area blast + special detonation) through the unified Match 3 resolution pipeline: acquire input lock, apply obstacle/tile destruction, trigger special tiles caught in the blast, and run the full Gravity → Refill → Cascade loop. |
| **4** | **Hardcoded 5-Iteration Cascade Cap Leaves Unresolved Matches** | `useBlockPuzzle.ts` (L293, L410) | `if (linesCleared === 0 \|\| iteration >= 5)` forcibly halts cascade resolution after 5 steps. In Match 3 with top refills, stopping at iteration 5 leaves visible 3-in-a-row matches sitting unpopped on the board. | Remove the artificial 5-step cap. Because new tiles are generated via a seeded PRNG (with anti-infinite-loop entropy on deep cascades `cascadeDepth > 12`), cascades always terminate naturally when `findMatches(board).length === 0`, while capping *combo multiplier growth* (e.g., max `×8` score multiplier) so scores cannot explode. |
| **5** | **Shared Inner Row Reference on Initial Render** | `useBlockPuzzle.ts` (L35) | `Array(BOARD_SIZE).fill(Array(BOARD_SIZE).fill(''))` aliases all 10 rows to the same array reference before `initGame()` runs. | Always allocate 2D matrices via `Array.from({ length: rows }, () => Array.from({ length: cols }, ...))`. |
| **6** | **Gravity Compaction Lacks Top Refill & Per-Tile Drop Metadata** | `useBlockPuzzle.ts` (L384–L399) | Column compaction teleports cells to `writeR` in a single React state jump with no refill of vacated upper cells and no `dropDistance` metadata, making smooth CSS/Spring drop acceleration impossible. | Compute explicit `dropRows: number` for every surviving tile and spawn new themed tiles for the `emptyCount` cells at the top of each column (`spawnOffsetRows = emptyCount`), enabling hardware-accelerated `transform: translateY(...)` drop animations with gravity acceleration (`cubic-bezier(0.32, 0, 0.67, 0)` + landing bounce). |
| **7** | **Stone / Fixed Obstacles Fall with Gravity** | `useBlockPuzzle.ts` (L388–L395) | All obstacles (`stone`, `ice`, `wood`, `metal`) fall down columns identically. In Match 3, `ice` (frozen tile) and `stone` (fixed rock blocker) should anchor in place while tiles above or below settle, or segment the column cleanly. | Distinguish **Cell Modifiers / Fixed Blockers** (`ice` overlay, `stone` blocker, `wood` crate) that stay anchored at `(r, c)` from **Movable Elements** (`gem` collectibles, `metal` heavy blocks, and standard/special tiles) that obey gravity, with diagonal slip-around into empty cells below fixed blockers so columns never starve. |
| **8** | **Premature Win/Loss Evaluation Mid-Cascade** | `useBlockPuzzle.ts` (L90–L150) | Mission evaluation runs in a reactive `useEffect` whenever `score` or `moves` changes. If the last move triggers a multi-step cascade, loss can be evaluated before cascades finish, or win can cut off a satisfying combo chain. | Evaluate Win/Loss **exclusively in the `'checking_end'` state** after all cascades, special tile chain reactions, and refills have completely settled (`cascadeDepth` finished). If `movesRemaining === 0` and objectives are met, award Victory; if objectives are met with `movesRemaining > 0`, convert remaining moves into bonus points/special blasts before showing Victory. |

---

## 4. Target Match 3 Engine Architecture & Mechanics Specification

### 4.1 Grid Dimensions & Coordinate System
* **Grid Size**: Standard `8×8` (`ROWS = 8, COLS = 8`), configurable per level (`7×7` for early onboarding levels 1–5, `8×8` for standard levels 6–30, `9×9` for expert levels 31+).
* **Coordinates**: Zero-indexed `{ r: 0..rows-1, c: 0..cols-1 }` where `r = 0` is the top row (spawn entry) and `r = rows - 1` is the bottom row.

### 4.2 Tile Colors / Theme Mapping
* Each level specifies `tileColorCount: 4 | 5 | 6` (4 colors on onboarding levels 1–3, 5 colors on levels 4–15, 6 colors on levels 16+).
* On board initialization, the engine selects the first `tileColorCount` tile IDs from `tileIdsFor(activeTheme.id)` (e.g., `['candy_0', 'candy_1', 'candy_2', 'candy_3', 'candy_4']` or `BEACH_TILES.slice(0, tileColorCount)`).
* Because every tile stores a logical `colorIndex: 0..tileColorCount-1` and resolves its visual sprite dynamically via `tileIdsFor(activeTheme.id)[tile.colorIndex]`, **the player can switch themes at any time—even mid-level—and every tile on the board immediately updates its artwork without altering board state or solvability.**

### 4.3 Match Detection & Special Tile Synthesis Rules
After any valid swap or cascade refill, the engine scans all horizontal and vertical contiguous runs of $\ge 3$ matching `colorIndex` tiles (excluding `stone`, `wood`, and empty cells) and merges intersecting runs into connected match components:

| Match Shape / Length | Condition | Synthesized Special Tile | Activation Effect |
| :--- | :--- | :--- | :--- |
| **Standard Match-3** | 3-in-a-row (Horizontal or Vertical) | None (`'none'`) | Clears the 3 matched tiles; damages adjacent `wood` / overlaid `ice`. |
| **Match-4 Horizontal** | 4-in-a-row Horizontal | **Vertical Line Blaster** (`'striped_v'`) | Clears the entire column `c` (`0..rows-1`) with a vertical laser beam. |
| **Match-4 Vertical** | 4-in-a-row Vertical | **Horizontal Line Blaster** (`'striped_h'`) | Clears the entire row `r` (`0..cols-1`) with a horizontal laser beam. |
| **L-Shape or T-Shape** | Orthogonal intersection of a horizontal run ($\ge 3$) and vertical run ($\ge 3$) sharing a corner/center tile (`5` or `6` tiles) | **Wrapped Bomb** (`'bomb_3x3'`) | Explodes in a `3×3` area around `(r, c)`, clearing all tiles and damaging obstacles in `r±1, c±1`. |
| **Match-5+ in a Line** | $\ge 5$ tiles in a single straight row or column | **Rainbow Color Bomb** (`'rainbow'`) | Swapping with any colored tile `X` clears **every tile of color `X`** across the entire board. |

* **Special Tile Spawn Position Rule**: When a match group of $\ge 4$ tiles is formed by a player swap, the synthesized special tile spawns at the **focal swap coordinate** (the destination cell of the moved tile that belongs to the match group). If formed during an automated cascade, it spawns at the geometric intersection cell (for L/T) or the center-most cell of the run.

### 4.4 Special + Special Swap Combination Matrix
Swapping **any two adjacent special tiles** (or a `rainbow` tile with any adjacent normal/special tile) is **always a valid move**, even without forming a 3-of-a-kind color match:

| Swap Pair | Combined Activation Choreography |
| :--- | :--- |
| **`striped_h/v` + `striped_h/v`** | **Cross Laser Blast**: Immediately clears both the full row `r` AND the full column `c` centered on the swap destination. |
| **`striped_h/v` + `bomb_3x3`** | **Giant 3-Lane Beam**: Transforms into a giant blaster that clears **3 full rows** (`r-1, r, r+1`) AND **3 full columns** (`c-1, c, c+1`). |
| **`bomb_3x3` + `bomb_3x3`** | **Mega 5×5 Detonation**: Detonates a massive `5×5` area (`r-2..r+2, c-2..c+2`) with double obstacle damage (`metal-2` shatters in one blast). |
| **`rainbow` + Normal Tile (Color `C`)** | **Color Wipe**: Lightning arcs from the Rainbow tile to every tile of `colorIndex === C` on the board, popping them all simultaneously. |
| **`rainbow` + `striped_h/v`** | **Prism Line Storm**: Converts every tile on the board matching the Striped tile's `colorIndex` into a random `striped_h` or `striped_v` blaster, then detonates all of them in a staggered wave (`60ms` interval). |
| **`rainbow` + `bomb_3x3`** | **Prism Bomb Storm**: Converts every tile on the board matching the Bomb's `colorIndex` into a `bomb_3x3`, then detonates all of them in sequence. |
| **`rainbow` + `rainbow`** | **Supernova Full-Board Clear**: Clears every single tile on the board and deals 1 hit of damage to every obstacle on the board! |

* **Chain Reactions**: If a special tile's blast wave hits another special tile on the board, that secondary special tile is queued and detonated automatically before gravity runs.

### 4.5 Obstacles & Blockers (Reusing & Enhancing `connectify-new` Mechanics)
All 6 obstacle types from `src/game/block-puzzle/core/levelConfig.ts` and `BlockPuzzleScreen.tsx` (`ObstacleOverlay`) are preserved and adapted to Match 3 rules:
1. **`ice` (1-Layer Frost Overlay)**: Sits on top of a colored tile. The tile inside **cannot be swapped directly**, but **can be matched** with two other tiles of the same color or hit by a special/booster blast. Matching or blasting shatters the `ice` (`iceDestroyed++`) and clears the tile.
2. **`wood` (Crate Blocker)**: Occupies a cell with no colored tile inside; cannot be swapped. Breaks when **any orthogonal adjacent match** (`r±1, c` or `r, c±1`) occurs next to it, or when hit by a special tile / booster (`woodDestroyed++`).
3. **`metal-2` → `metal-1` (2-Hit Armored Blocker)**: Occupies a cell; takes 2 adjacent matches or special/booster hits to destroy (`metal-2` degrades to `metal-1` on hit 1; `metal-1` shatters on hit 2).
4. **`stone` (Heavy Rock Blocker)**: Cannot be destroyed by adjacent normal matches; **can only be destroyed by Special Tile blasts (`striped`, `bomb_3x3`, `rainbow`) or `Hammer`/`Bomb` boosters**.
5. **`gem` (Collectible Crystal)**: Movable collectible tile that falls with gravity. Collected either by **dropping to the bottom collector row (`r === rows - 1`)** or by being caught in a Special Tile / Booster blast (`gemsDestroyed++`, `+150` bonus score).

### 4.6 Board Initialization & Deadlock / Auto-Shuffle Guarantee
1. **No Initial Matches + Guaranteed Playable Moves (`generateMatch3Board`)**:
   * Iterates top-to-bottom, left-to-right using `seededRandom(seed)`.
   * At each playable cell `(r, c)`, filters out any `colorIndex` that would immediately create a 3-in-a-row horizontally (`board[r][c-1]` and `board[r][c-2]`) or vertically (`board[r-1][c]` and `board[r-2][c]`).
   * After populating the grid, runs `findAllValidSwaps(board)`. If `validSwaps.length < 2`, runs `injectGuaranteedPlayableTriplet(board, rng)` to place a valid 1-swap triplet V-pattern (`[c, c+1]` + `[r+1, c+2]`) without creating an existing match.
2. **Deadlock Detection (`findAllValidSwaps`)**:
   * Scans every cell `(r, c)` and tests swapping with `(r, c+1)` and `(r+1, c)`.
   * A swap `(A, B)` is valid if neither `A` nor `B` is locked/immovable (`ice`, `wood`, `metal-1`, `metal-2`, `stone`, empty) AND either:
     * `A` or `B` is a `'rainbow'` tile, OR
     * Both `A` and `B` are special tiles (`special !== 'none'`), OR
     * Swapping `A` and `B` creates at least one horizontal or vertical run of $\ge 3$ matching `colorIndex` tiles.
3. **Guaranteed Solvable Auto-Shuffle (`shuffleMatch3Board`)**:
   * Whenever the board settles into `'idle'` and `findAllValidSwaps(board).length === 0`, the engine enters `'shuffling'` for `550ms`, displays a toast (`"Tidak ada langkah! Papan diacak otomatis"`), plays `audio.playSfx('shuffle')`, and permutes all movable colored tiles using Fisher-Yates + constraint repair so that:
     * All obstacles (`ice`, `wood`, `metal`, `stone`) and `gem` positions remain intact,
     * All existing special tiles on the board are preserved,
     * Zero pre-existing 3-in-a-row matches are formed, and
     * At least 1 valid swap (`findAllValidSwaps(board).length >= 1`) is guaranteed (even if only 3 tiles of a single color exist, by placing them in a 1-move L/V configuration).

### 4.7 Scoring, Combo Multipliers & 3-Star Rating Formula
* **Base Tile Clear**: `50` points per tile cleared (`150` for a standard Match-3, matching `TripleGame.tsx` L17's `150` points per trio!).
* **Special Tile Creation Bonus**:
  * Match-4 (`striped_h` / `striped_v`): `+100` bonus (`300` total).
  * Match-L / Match-T (`bomb_3x3`): `+200` bonus (`450` total).
  * Match-5 (`rainbow`): `+350` bonus (`600` total).
* **Special Tile Detonation Bonus**: `+60` per cell cleared by the blast + `+150` activation bonus.
* **Cascade Combo Multiplier**:
  * Cascade step `k = 1, 2, 3, ...` within a single move applies multiplier:
    $$\text{Multiplier}(k) = \min\left(4.0,\; 1.0 + 0.25 \times (k - 1)\right)$$
  * Consecutive moves that produce matches increment the **Move Streak Combo** (`+25 × (streak - 1)` bonus).
* **Remaining Moves Victory Bonus (Move-Drain Finale)**:
  * When the primary objective (`missions[0]`) is completed with `movesRemaining > 0`, each remaining move awards `+200` points and converts a random tile into a `striped_h`/`striped_v` blaster that detonates for final celebration points.
* **1–3 Star Thresholds**:
  * **1 Star**: Complete primary objective (`missions[0]`) within `maxMoves`.
  * **2 Stars**: Complete primary objective + 1 bonus mission (`missions[1]` or `missions[2]`, or reach `starThresholds[1]` score).
  * **3 Stars**: Complete all 3 missions (`missions[0..2]`, or reach `starThresholds[2]` score).

### 4.8 In-Game Boosters (Reusing `connectify-new` Inventory & Assets)
All 4 boosters from `src/core/economy.js` (`ITEM_PRICES`) and `src/core/artAssets.js` are supported in Match 3:
1. **Hint (`itemId: 'hint'`, cost `8` Coins, icon `/art/premium/ui/hint.webp`)**: Highlights the highest-scoring swap from `findAllValidSwaps(board)` (prioritizing Match-5 > L/T > Match-4 > obstacle-adjacent Match-3). Also triggers a subtle free idle-hint pulse if the player does not touch the screen for `8` seconds.
2. **Hammer (`itemId: 'hammer'`, cost `14` Coins, icon `/art/premium/ui/hammer.webp`)**: Targets any single cell `(r, c)`. Immediately clears a normal tile, triggers a special tile, or deals 1 damage to any obstacle (`ice`, `wood`, `metal-2`→`metal-1`, `stone`), then runs gravity & cascades without costing a move.
3. **Bomb (`itemId: 'bomb'`, cost `18` Coins, icon `/art/premium/ui/bomb.webp`)**: Targets any cell `(r, c)` and detonates a `3×3` area (`r±1, c±1`), clearing tiles, damaging obstacles, and triggering cascades without costing a move.
4. **Shuffle (`itemId: 'shuffle'`, cost `12` Coins, icon `/art/premium/ui/shuffle.webp`)**: Voluntarily shuffles all movable tiles via `shuffleMatch3Board` without costing a move.

---

## 5. Clean TypeScript Interfaces for Shared System Integration

Below is the authoritative TypeScript contract for `src/game/match3/types.ts` and the shared system adapters in `connectify-android`.

```typescript
// ============================================================================
// 1. CORE MATCH 3 DOMAIN & BOARD TYPES
// ============================================================================

export type SpecialTileType = 'none' | 'striped_h' | 'striped_v' | 'bomb_3x3' | 'rainbow';

export type ObstacleType = '' | 'ice' | 'wood' | 'metal-2' | 'metal-1' | 'stone' | 'gem';

export type MatchShapeType =
  | 'match_3'
  | 'match_4_h'
  | 'match_4_v'
  | 'match_L'
  | 'match_T'
  | 'match_5_line'
  | 'match_5_cross'
  | 'special_combo';

export interface GridCoord {
  r: number;
  c: number;
}

export interface Match3Tile {
  /** Unique monotonic instance ID for React key stability and drop animations */
  uid: string;
  /** Logical color index (0..tileColorCount-1); -1 for color-agnostic rainbow or blocker */
  colorIndex: number;
  /** Resolved theme tile key (e.g., 'candy_0', 'sakura_3') from tileIdsFor(activeTheme.id) */
  tileKey: string;
  /** Special booster status embedded on this tile */
  special: SpecialTileType;
  /** Animation metadata for smooth vertical/diagonal gravity drops */
  dropRows: number;
  /** True if spawned from the top refill chute on the current cascade step */
  isNewSpawn: boolean;
}

export interface Match3Cell {
  r: number;
  c: number;
  /** Playable tile in this cell, or null if empty / occupied by solid blocker (wood/metal/stone) */
  tile: Match3Tile | null;
  /** Obstacle or collectible modifier on this cell */
  obstacle: ObstacleType;
}

export interface MatchGroup {
  shape: MatchShapeType;
  colorIndex: number;
  cells: GridCoord[];
  /** Coordinate where a synthesized special tile should spawn, if any */
  spawnSpecialAt: GridCoord | null;
  spawnSpecialType: SpecialTileType;
}

export interface ValidSwapMove {
  from: GridCoord;
  to: GridCoord;
  /** Heuristic priority score for Hint selection (Match-5 > L/T > Match-4 > Obstacle hit > Match-3) */
  priorityScore: number;
  expectedShape: MatchShapeType;
}

export interface CascadeStepSnapshot {
  stepIndex: number;
  clearedCoords: GridCoord[];
  spawnedSpecials: { coord: GridCoord; type: SpecialTileType; colorIndex: number }[];
  obstaclesDamaged: { coord: GridCoord; from: ObstacleType; to: ObstacleType }[];
  scoreDelta: number;
  comboMultiplier: number;
  boardAfterGravityAndRefill: Match3Cell[][];
}

// ============================================================================
// 2. LEVEL OBJECTIVES, CONFIG & STATE MACHINE TYPES
// ============================================================================

export type Match3ObjectiveType =
  | 'score'
  | 'clear_tiles'
  | 'collect_color'
  | 'destroy_ice'
  | 'destroy_wood'
  | 'destroy_metal'
  | 'collect_gems'
  | 'create_specials'
  | 'max_moves';

export interface Match3Objective {
  type: Match3ObjectiveType;
  target: number;
  /** Optional target colorIndex when type === 'collect_color' */
  colorIndex?: number;
  description: string;
}

export interface Match3LevelConfig {
  level: number;
  rows: number;
  cols: number;
  tileColorCount: 4 | 5 | 6;
  maxMoves: number;
  /** Primary objective (index 0) wins the level; index 1 & 2 award 2nd and 3rd stars */
  missions: [Match3Objective, Match3Objective, Match3Objective];
  /** Score thresholds for 1, 2, and 3 stars */
  starScoreThresholds: [number, number, number];
  obstacles: { r: number; c: number; type: ObstacleType }[];
  seed?: string;
}

export type Match3Phase =
  | 'ready'
  | 'idle'
  | 'swapping'
  | 'reverting'
  | 'resolving'
  | 'shuffling'
  | 'bonus_drain'
  | 'paused'
  | 'won'
  | 'lost';

export interface Match3SessionState {
  runId: string;
  level: number;
  phase: Match3Phase;
  board: Match3Cell[][];
  score: number;
  movesUsed: number;
  movesRemaining: number;
  combo: number;
  highestCombo: number;
  cascadeDepth: number;
  selectedCoord: GridCoord | null;
  hintMove: ValidSwapMove | null;
  activeBooster: 'hammer' | 'bomb' | null;
  progress: {
    tilesCleared: number;
    colorCollected: Record<number, number>;
    iceDestroyed: number;
    woodDestroyed: number;
    metalDestroyed: number;
    gemsCollected: number;
    specialsCreated: number;
  };
  missionResults: [boolean, boolean, boolean];
  startedAtMs: number;
  elapsedMs: number;
}

// ============================================================================
// 3. SHARED SYSTEM INTEGRATION INTERFACES (CURRENCY, PROGRESSION, THEME, AUDIO, PERSISTENCE)
// ============================================================================

export type BoosterItemId = 'hint' | 'shuffle' | 'hammer' | 'bomb';

export interface Match3EconomyIntegration {
  /** Current unified currency balance (Connect Coins / Permen) */
  getBalance(): number;
  /** Current booster inventory counts */
  getBoosterInventory(): Record<BoosterItemId, number>;
  /** Atomically consumes 1 booster from inventory; returns false if count <= 0 */
  consumeBooster(itemId: BoosterItemId, runId: string, moveIndex: number): boolean;
  /** Atomically purchases a booster using unified currency; prevents negative balance */
  purchaseBooster(itemId: BoosterItemId, quantity?: number): {
    ok: boolean;
    newBalance: number;
    newCount: number;
    error?: 'INSUFFICIENT_FUNDS' | 'INVALID_ITEM';
  };
}

export interface Match3RoundResultPayload {
  game: 'match3';
  runId: string;
  level: number;
  isWinner: boolean;
  isFlawless: boolean;
  stars: 0 | 1 | 2 | 3;
  score: number;
  movesUsed: number;
  movesRemaining: number;
  highestCombo: number;
  tilesCleared: number;
  specialsCreated: number;
  obstaclesDestroyed: number;
  timeElapsedMs: number;
  isDailyChallenge: boolean;
}

export interface Match3RewardBreakdown {
  coinsEarned: number;
  xpEarned: number;
  starsEarned: 0 | 1 | 2 | 3;
  isNewBestScore: boolean;
  isFirstClear: boolean;
  previousAccountLevel: number;
  newAccountLevel: number;
  leveledUp: boolean;
  completedMissions: string[];
  unlockedAchievements: string[];
}

export interface Match3ProgressionIntegration {
  /** Current unlocked Match 3 level and per-level star/score records */
  getMatch3Progression(): {
    currentLevel: number;
    highestUnlockedLevel: number;
    starsByLevel: Record<number, 1 | 2 | 3>;
    bestScoreByLevel: Record<number, number>;
    skillScore: number;
  };
  /** Idempotently processes round win/loss (keyed by runId), awards XP & Coins, updates missions & achievements */
  recordRoundResult(payload: Match3RoundResultPayload): Match3RewardBreakdown;
}

export interface Match3ThemeIntegration {
  /** Active ThemeManifest ID (e.g., 'sweets', 'sakura', 'bakery', 'galaxy', 'ocean') */
  activeThemeId: string;
  activeThemeName: string;
  /** Returns the ordered array of 10-16 tile keys for the active theme */
  getTileKeysForActiveTheme(): string[];
  /** Resolves the asset URL for a given tileKey */
  getTileAssetUrl(tileKey: string): string;
  /** Equipped surface texture skin for Match 3 tiles ('tile1_*' or 'block_*') */
  getEquippedTileSurfaceUrl(): string | null;
  /** Equipped match particle cosmetic ('anim_block_*' / 'anim_onet_*') */
  getEquippedParticleCosmetic(): { id: string; image: string; motion: string; color: string } | null;
}

export type Match3SfxCue =
  | 'click'
  | 'swap'
  | 'wrong'
  | 'match'
  | 'combo'
  | 'special_create'
  | 'line_blast'
  | 'bomb_blast'
  | 'rainbow_blast'
  | 'ice_break'
  | 'shuffle'
  | 'win'
  | 'lose';

export type Match3HapticPattern = 'tick' | 'match' | 'combo' | 'special' | 'error' | 'victory';

export interface Match3AudioHapticsIntegration {
  playSfx(cue: Match3SfxCue, cascadeStep?: number): void;
  triggerHaptic(pattern: Match3HapticPattern): void;
}

export interface Match3PersistenceIntegration {
  /** Saves in-progress Match 3 session state on every settled move & on Android app pause/background */
  saveActiveSession(session: Match3SessionState): void;
  /** Restores an interrupted Match 3 session on launch/resume, or null if none exists */
  loadActiveSession(): Match3SessionState | null;
  /** Clears the active session slot upon round completion or explicit abandon */
  clearActiveSession(): void;
}
```
