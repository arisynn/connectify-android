# Connectify Android — Onet Connect Technical Specification (`ONET_TECHNICAL_SPEC.md`)

**Author:** Agent 03 — Onet Gameplay Engineer (`@onet-eng`)  
**Source Repository Audited (Read-Only):** `/root/.gemini/antigravity/scratch/connectify-new`  
**Target Android Project:** `/root/.gemini/antigravity/scratch/connectify-android`  
**Status:** Phase 1 & 2 Complete Technical Specification

---

## 1. Exact File & Line Inventory in `connectify-new`

Every Onet-related file, component, helper, test, CSS rule, and animation backup in `/root/.gemini/antigravity/scratch/connectify-new` was inspected. Below is the authoritative file-by-file and line-range mapping:

### 1.1 Core Onet Engine, Config & Progression Files

| File | Exact Lines | Responsibility |
| :--- | :--- | :--- |
| `src/core/config.js` | `L1–L4` | Board dimensions (`ROWS = 10`, `COLS = 6`). |
| `src/core/difficulty.js` | `L1–L8` | `getTileVarietyCount(_level, maxAvailable)` (currently stubbed to return `maxAvailable`) and `getOnetDifficulty(input)` computing `tier` (1–5), `label`, `groups` (`0`, `1`, `2`), `time` (`max(75, 150 - (level-1)*2)`), `separation` (`min(8, 2 + floor(level/3))`), and `arrowPairs` (`level < 8 ? 0 : min(6, 1 + floor((level-8)/4))`). |
| `src/core/board.js` | `L1–L182` | Core Onet puzzle engine: `groupSize` (`L5`), `getTileCells` (`L6–L9`), `canMatch` (`L10`), `shuffle` (`L11–L15`), `getPath` BFS (`L16–L43`), `findHint` (`L44–L54`), `countRemaining` (`L55`), `getMatchAction` (`L56–L59`), `placeGroup` (`L60–L62`), `clearMatchedGroups` (`L65–L86`), `isBoardSolvable` (`L87–L95`), `generateBoard` (`L96–L117`), `addDirectionTiles` (`L119–L135`), `constructPairs` (`L137–L156`), `guaranteedShuffle` (`L157–L177`), and `placeTilesSmartly` (`L178–L182`). |
| `src/core/random.js` | `L1–L10` | FNV-1a + Mulberry32 deterministic PRNG `seededRandom(seed)` used by Daily Sprint (`useOnetGame.ts:36`). |
| `src/core/tileCatalog.js` | `L1–L6` | `BEACH_TILES` (15 legacy PNG keys), `TILE_SETS` (16 keys each for `candy`, `ocean`, `forest`, `space`, `sakura`, `bakery`, `galaxy`, `meadow`, `fruit`, and 4 `SEASONAL_THEMES`; 10 keys each for `reward_*`), and `tileIdsFor(theme)`. |
| `src/core/games.ts` | `L14–L18` | `GAMES.onet` metadata, copy, palettes, mode list (`onet` classic & `sprint` daily), and statistics formatting. |
| `src/core/reward.js` | `L8–L104` | `RewardEngine.processWin`: Onet XP calculation (`L15`), Onet win progression (`highestLevel` / `currentLevel` at `L39`), speedrun/survivor/near-death stats (`L40–L42`), daily sprint tracking (`L33`, `L78–L85`), and mission event updates (`L88–L97`). |
| `src/core/economy.js` | `L7–L17` | Booster prices (`hint: 8`, `shuffle: 12`), `DAILY_CHALLENGE_TIME = 90`, `DEFAULT_ITEM_COUNT = 3`, `calcWinPermen = () => 0`. |
| `src/core/cosmetics.js` | `L9–L68` | Onet cosmetic slots (`tile1`, `tile2`, `tile4`, `arrow`, `effect`, `onetAnimation`) and `SKIN_PACKS` (`L50–L63`) granting `tile1`+`tile2`+`tile4` together. |
| `src/core/artAssets.js` | `L1–L13` | `artIcon('onet' | 'hint' | 'shuffle')` -> `/art/premium/ui/*.webp` and `cosmeticImage(item)` -> `/art/premium/surfaces/*.webp`. |
| `src/core/audio/AudioEngine.tsx` & `ClubSynth.ts` | `AudioEngine: L1–L22`, `ClubSynth: L44–L49` | Procedural Web Audio SFX patterns used by Onet (`click`, `match`, `split`, `shuffle`, `win`, `lose`, `wrong`) and BGM scenes (`menu`, `game`, `off`). |

### 1.2 Onet React Hook, UI Components & CSS

| File | Exact Lines | Responsibility |
| :--- | :--- | :--- |
| `src/game/hooks/useOnetGame.ts` | `L1–L104` | React game loop hook: `getDailyChallengeLevel` (`L13`), board/timer/combo/lock state (`L18–L28`), `later` timeout tracking (`L29`), `initGame` (`L31–L38`), visibility auto-pause (`L40`), 1s countdown (`L41`), win/loss/deadlock `useEffect` (`L42–L55`), `handleTileClick` (`L56–L92`), `useHint` (`L93–L97`), and `useShuffle` (`L98–L102`). |
| `src/game/GameplayScreen.tsx` | `L1–L27` | Single-player Onet screen wrapper (`GameLoader` + `GameplayContent`), desktop-first 2-column `.onet-play-layout` with `.onet-round-status`, `<OnetBoard />`, `.onet-theme-note`, and `.onet-boosters`. |
| `src/game/components/OnetBoard.tsx` | `L1–L75` | Production board renderer: `ResizeObserver` aspect-fit (`L22–L29`), master-only cell rendering (`L36–L63`), `split-tile-half` clip-path animation (`L56–L58`), `openSide` directional arrow badge (`L60`), `group-tag` (`L61`), simple straight-line SVG path layer (`L64–L70`), `<TileBurst />` (`L71`), and floating combo text (`L72`). |
| `src/game/components/TileBurst.tsx` | `L1–L22` | Deterministic burst ring + 8 themed particles (or cosmetic `<GameParticles />`) + 4 clip-path image shards on `1×1` clears. |
| `src/game/components/OnetModals.tsx` | `L1–L26` | Pause, Win (`VictoryBurst`), Defeat, and Toast UI. **Note (`L25`):** `onNextLevel` in `GameplayScreen.tsx` calls `navigate('game-hub')` rather than advancing to `level + 1`. |
| `src/game/components/OnetHeader.tsx` | `L1–L5` | Orphan mobile header component (implemented, styled in `index.css:249`, unused by `GameplayScreen.tsx`). |
| `src/game/components/OnetFooter.tsx` | `L1–L6` | Orphan mobile booster footer component (implemented, styled in `index.css:249`, unused by `GameplayScreen.tsx`). |
| `src/game/MultiplayerGameplay.tsx` | `L1–L122` | 2-player multiplayer Onet wrapper (out of scope / excluded in offline Android build). |
| `src/index.css`, `src/seasonal-club.css`, `src/club-v3.css` | `index.css: L205–L217, L226, L248–L249, L258`, `seasonal-club.css: L23, L27–L28`, `club-v3.css: L13` | Grid sizing, `.onet-cell` states (`selected`, `hinted`, `invalid`, `joined-unified`, `empty`), `.onet-arrow`, `.tile-burst`, `.onet-combo`, and responsive breakpoints. |

### 1.3 Animation Backup & Tests

| File | Exact Lines | Responsibility |
| :--- | :--- | :--- |
| `backup_onet_animation/OnetBoard.tsx` & `src/game/components/OnetBoard.backup.tsx` | `L1–L453` / `L1–L454` | Legacy pre-split `OnetBoard` with rounded-corner SVG paths (`generateRoundedPath`), directional entry/exit square rings (`getStartSide`, `generateRingPath`), `onPointerDown`, and `border-0` directional gate styling. |
| `backup_onet_animation/ConnectAnimationSnippet.tsx` | `L1–L349` | Modular `<ConnectAnimationLayer />` extracting `getStartSide`, `generateRingPath`, `generateRoundedPath`, and `tileMatchingMotionConfig`. |
| `backup_onet_animation/useOnetGame_animation_logic.ts` | `L1–L55` | Timing constants for the `600ms` Ring-A (`0–100ms`) -> Line (`100–280ms`) -> Ring-B (`280–380ms`) -> Fade/Shrink (`380–580ms`) sequence. |
| `backup_onet_animation/PANDUAN_RESTORE.md` | `L1–L48` | Documentation for restoring the rounded SVG ring/path animation. |
| `tests/game_semantics_check.ts` | `L1–L139` | Verifies 60-cell board occupancy, `isBoardSolvable`, `findHint`, even group parity, `openSide` non-slave/1×1 constraints, `guaranteedShuffle`, and lower-vs-higher tier adjacency/distance trends. |
| `tests/final_regression.ts` | `L18–L156` | Verifies deterministic seeded `generateBoard`, `countRemaining === 60`, no orphan slaves, full solve to 0 across themes, and `2×2` / `1×2` / `2×1` split child ID semantics. |
| `tests/verify_onet_helpers.mjs` | `L1–L116` | Legacy Onet stress test script (**currently fails** at `L66` with `Missing 1x2 pair at level 3+` because `board.js:101` spawns a `2×2` quad rather than a `1×2` domino at `level = 3`). |

### 1.4 Onet Assets Referenced in `connectify-new`

- **Tile Art Pools (`public/art/` & `src/assets/vanilla/tiles/`):**
  - `sweets` (Default / Summer Club): 15 PNG icons in `src/assets/vanilla/tiles/*.png` (`BEACH_TILES`).
  - Standard Themes (16 `.webp` tiles each, `0.webp`–`15.webp`): `public/art/ocean/`, `public/art/forest/`, `public/art/candy/`, `public/art/space/`.
  - Atelier / Premium Themes (16 `.webp` tiles each): `public/art/premium/meadow/`, `public/art/premium/sakura/`, `public/art/premium/bakery/`, `public/art/premium/galaxy/`, `public/art/premium/fruit/`.
  - Seasonal Themes (16 `.webp` tiles each): `public/art/premium/autumn_harvest/`, `magic_atelier/`, `retro_arcade/`, `alpine_winter/`.
  - Reward Themes (10 `.webp` tiles each, `0.webp`–`9.webp`): `public/art/sakura/`, `bakery/`, `galaxy/`, `meadow/`, `fruit/`.
- **Tile Surface & Arrow Skins (`public/art/premium/surfaces/` & `public/art/skins/`):**
  - `cream.webp`, `candy.webp`, `opal.webp`, `night.webp`, `mint.webp`, `sunset.webp`, `amber.webp`, `enchanted.webp`, `pixel.webp`, `frost.webp` (used by `tile1_*`, `tile2_*`, `tile4_*`, `arrow_*` cosmetics).
- **Match Burst Particle Textures (`public/art/premium/effects/`):**
  - `blossom.webp`, `stars.webp`, `confetti.webp`, `autumn.webp`, `magic.webp`, `pixel.webp`, `snow.webp` (rendered by `GameParticles.tsx` inside `TileBurst.tsx`).
- **UI & Booster Icons (`public/art/premium/ui/`):**
  - `onet.webp`, `hint.webp`, `shuffle.webp`, `permen.webp`, `achievements.webp`.

---

## 2. How Onet Currently Works in `connectify-new`

### 2.1 Grid Coordinate Model & Tile Representation

The board is stored as a 2D array of size `(ROWS + 2) × (COLS + 2)` (`12 × 8` in `connectify-new`, where `ROWS = 10`, `COLS = 6`).
- **Playable area:** `1 <= r <= ROWS` and `1 <= c <= COLS`.
- **Outer border gutter:** `r = 0`, `r = ROWS + 1`, `c = 0`, `c = COLS + 1` are permanently `0` (empty), allowing paths to route outside the tile perimeter with at most 2 turns.
- **Multi-cell Group Representation (`groupSize` & `placeGroup`, `board.js:5-9, 60-62`):**
  - Each tile occupies `groupRows × groupCols` cells: `1×1` (unit), `1×2` (horizontal domino), `2×1` (vertical domino), or `2×2` (quad).
  - The top-left cell `(r, c)` holds the **Master** object (`{ id, themeKey, groupRows, groupCols, isSplit, openSide, splitAxis, splitDepth, justSplit, splitAnimKey, splitFromX, splitFromY }`).
  - Remaining occupied cells hold lightweight **Slave** pointers (`{ id, isSlave: true, masterR: r, masterC: c }`).
  - On tap (`useOnetGame.ts:58`), tapping any slave cell immediately resolves to its master coordinates: `if (t.isSlave) { r = t.masterR; c = t.masterC; }`.

### 2.2 Tile Matching & Multi-Cell Split Rules

1. **Match Eligibility (`canMatch(a, b)`, `board.js:10`):**
   - Both `a` and `b` must be non-falsy, neither may have `isSlave: true`, `a.id === b.id`, and `groupSize(a)` must equal `groupSize(b)` (`rows` and `cols` identical).
   - Selection UX (`useOnetGame.ts:59-64`):
     - Tapping an empty cell does nothing.
     - Tapping the already-selected tile deselects it (`setSelected(null)`).
     - Tapping a second tile that fails `canMatch` switches selection to the newly tapped tile *without* counting a mistake.
     - Tapping a second tile that passes `canMatch` runs `getPath(board, a.r, a.c, r, c)`. If no valid path exists, `mistakes.current++`, `errors` highlights `[a, b]` for `400ms`, and selection clears.
2. **Clear & Deterministic Split (`clearMatchedGroups`, `board.js:65-86`):**
   - `1×1` (`area === 1`, `action === 'clear'`): Both cells are set to `0`.
   - `2×2` (`area === 4`, `action === 'split_to_1x2'`): Each parent splits along `tile.splitAxis` (`'horizontal'` -> two stacked `1×2` dominoes; `'vertical'` -> two side-by-side `2×1` dominoes).
   - `1×2` or `2×1` (`area === 2`, `action === 'split_to_1x1'`): Each parent splits into two `1×1` unit tiles.
   - **Deterministic Child ID Formula (`board.js:79`):**
     ```js
     id = pool[(parentIndex + 1 + depth * 2 + i * (depth + 2)) % pool.length]
     ```
     Both matched parents use the exact same `parentIndex`, `depth`, and `pool`, guaranteeing child `i=0` of parent A matches child `i=0` of parent B, child `i=1` matches child `i=1`, and siblings (`i=0` vs `i=1`) have distinct IDs (provided `pool.length > depth + 2`).

### 2.3 BFS Pathfinding (Max 2 Turns / 3 Straight Line Segments)

Implemented in `getPath(board, r1, c1, r2, c2, ignoredTiles)` (`board.js:16-43`):
1. Computes `starts = getTileCells(r1, c1, a)` and `ends = getTileCells(r2, c2, b)`.
2. Builds `endpoint` set from `ends`, and `allowed` set from `starts ∪ ends ∪ ignoredTiles`.
3. Runs an independent BFS per `start` cell in `starts`, queuing `{ r, c, dir: -1, turns: 0, points: [start] }`:
   - Iterates 4 orthogonal directions (`up`, `right`, `down`, `left`).
   - **Departure gate (`L29`):** On step 0 (`cur.dir === -1`), if `a.openSide` is set, only direction `name === a.openSide` is permitted.
   - **Turn counting (`L30-L31`):** `turns = cur.turns + (cur.dir !== -1 && cur.dir !== dir ? 1 : 0)`. Prunes if `turns > 2`.
   - **Bounds & Obstacle Check (`L33`):** Rejects out-of-bounds or non-zero cells not in `allowed`.
   - **Collinear Path Compression (`L34`):** When continuing in the same direction (`cur.dir === dir`), replaces the last vertex in `points` so `points` holds only corner/endpoint vertices (length 2 to 4, representing 1 to 3 segments).
   - **Arrival gate (`L35`):** If `(r, c) ∈ endpoint` AND `(!b.openSide || b.openSide === opposite)`, returns `{ path: points }`.
   - **Visited Pruning (`L36-L38`):** Keyed by `"${r},${c},${dir}"` storing minimum `turns` seen so far; skips if `(seen.get(key) ?? 3) <= turns`.

### 2.4 Board Generation, Solvability Verification & Directional Arrows

Implemented in `generateBoard(themeKey, level, rng)` (`board.js:96-117`):
1. Shuffles `tileIdsFor(themeKey)` with `rng` (`seededRandom` for Daily Sprint, `Math.random` otherwise).
2. Places `difficulty.groups` pairs of multi-cell split tiles (`2×2`, `2×1`, or `1×2`) on top/bottom edges (`r = 1` or `ROWS - rows + 1`), synchronized with identical `splitAxis`.
3. Collects remaining empty coordinates (`positions`) and generates matching `1×1` pairs (`tiles`).
4. Runs up to `4` attempts of `constructPairs(board, positions, tiles, rng, difficulty.separation)` (`L137-L156`):
   - Creates a `probe` board filled with `{ id: 'probe' }` at `positions`.
   - Repeatedly samples up to `8` shuffled remaining cells `a` against all remaining `b`, looking for a valid `getPath` on `probe` with Manhattan distance `d = |a.r - b.r| + |a.c - b.c|`, stopping early if `d >= difficulty.separation`.
   - Assigns the current pair's tile ID to `(best.a, best.b)` in `result` and clears them from `probe`.
   - Verifies `isBoardSolvable(candidate)` (`L87-L95`), which simulates up to `150` greedy `findHint` -> `clearMatchedGroups` steps down to `0` remaining cells.
5. Calls `addDirectionTiles(candidate, difficulty.arrowPairs)` (`L119-L135`):
   - Replays the greedy `findHint` solution on `simulation`.
   - For up to `arrowPairs` pairs of `1×1` tiles, computes the exact exit side `side(path[0], path[1])` and `side(path[last], path[last-1])` from the verified solution path and locks `openSide` on `candidate`, mathematically guaranteeing the arrows remain solvable along that sequence.

### 2.5 Deadlock Detection, Free Auto-Shuffle, Hints & Boosters

- **Deadlock Detection (`useOnetGame.ts:51-54`):** After every state update where `board.length > 0 && !processed && gameState === 'playing' && !lock`, if `remaining > 0` and `findHint(board)` returns `null`, `useOnetGame` locks input (`lock.current = true`), shows `"Jalur habis. Papan diacak gratis!"`, and after `700ms` clears `selected` and applies `guaranteedShuffle(b, Math.random, level.current)`.
- **Paid / Inventory Hint (`useHint`, `useOnetGame.ts:93-97`):** Checks `CDE` state `hints > 0`, finds `findHint(board)`, queues `USE_ITEM` (`itemId: 'hint'`), and sets `hintTiles`.
- **Paid / Inventory Shuffle (`useShuffle`, `useOnetGame.ts:98-102`):** Checks `CDE` state `shuffles > 0`, queues `USE_ITEM` (`itemId: 'shuffle'`), plays `'shuffle'` SFX, calls `guaranteedShuffle`, and clears `selected` & `hintTiles`.

### 2.6 Timers, Scoring, Combos & Level Progression

- **Timer (`useOnetGame.ts:17, 40-41`):**
  - Standard levels: `Math.max(75, 150 - (level - 1) * 2)` seconds (`150s` at L1 down to `75s` at L39+).
  - Daily Sprint: `DAILY_CHALLENGE_TIME = 90` seconds; deterministic level `6 + (floor(Date.parse(todayKey)/86400000) % 10)`.
  - Pauses on `document.hidden` (`visibilitychange`, except in multiplayer).
- **Combo & Scoring (`useOnetGame.ts:65-87`):**
  - `4000ms` chain window (`Date.now() - lastMatch.current < 4000 ? combo + 1 : 1`).
  - Base score: `100` (`1×1` clear), `150` (`1×2` / `2×1` split), `200` (`2×2` split), plus `(chain - 1) * 10`.
- **Level Progression (`reward.js:39`, `GameplayScreen.tsx:25`):**
  - Winning a non-daily standard level increments `highestLevel` and `currentLevel` to `level + 1` via `RewardEngine.processWin`.
  - No 1–3 star rating exists for Onet yet, and `OnetModals` `onNextLevel` navigates back to `game-hub` instead of launching Level `N+1`.

---

## 3. Bugs, Edge Cases & Deadlocks Found (with Exact Fixes)

| # | Location in `connectify-new` | Concrete Bug / Edge Case | Impact in Production | Fix in `connectify-android` |
| :--- | :--- | :--- | :--- | :--- |
| **B1** | `src/core/board.js:157-177` (`guaranteedShuffle`) | 1) Only shuffles `1×1` master cells; multi-cell groups (`1×2`, `2×1`, `2×2`) remain frozen in place.<br>2) `rebuilt = constructPairs(...)` only checks `if (findHint(rebuilt))` (L169) instead of `isBoardSolvable(rebuilt)`.<br>3) Emergency fallback (`L171-L176`) iterates `if (board[r][c])` **including `isSlave` cells**, overwrites cells with `1×1` `{id, openSide: null}` **without clearing old slaves or preserving `themeKey`**, creating **orphan slave cells**, odd pair counts, and broken tile theme fallbacks (`'vanilla'`). | Deadlocked multi-cell boards corrupt into orphan slaves, mismatched tile textures, or unsolvable boards. | **3-Tier Multi-Cell Safe Shuffle:**<br>1. Attempt up to 8 permutations of `1×1` tiles AND same-footprint multi-cell groups (keeping `themeKey` and `splitAxis`), accepting only if `isBoardSolvable(board, themeKey)` is `true`.<br>2. Run `constructPairs` on `1×1` slots; if multi-cell groups block paths, extract all active master groups (`!isSlave`), clear board, relocate multi-cell pairs to exposed edges via `placeGroup`, then `constructPairs` on remaining cells.<br>3. Emergency fallback strips *only* master groups cleanly (`placeGroup` / zeroing old footprint first), splits any jammed multi-cell pair into matched `1×1` pairs cleanly, never leaves orphan slaves, and guarantees `isBoardSolvable === true`. |
| **B2** | `src/core/board.js:111-116, 151` (`generateBoard` & `constructPairs`) | `constructPairs` can break early (`L151`) if `probe` deadlocks mid-peeling, leaving `0` holes on a fresh board. `generateBoard` only retries `4` times and returns `candidate` even if `!isBoardSolvable(candidate)` or holes exist. | Fresh level can spawn with empty cells or an unsolvable starting layout. | Validate `countRemaining(candidate) === rows * cols && isBoardSolvable(candidate, themeKey)` after `constructPairs`. Retry up to 16 attempts (perturbing RNG seed deterministically); if still needed, fall back to `guaranteedShuffle` on a valid full paired layout. |
| **B3** | `src/core/board.js:16-43` (`getPath`) | 1) `allowed` set (`L21`) includes `starts`, allowing BFS to step **internally through other cells of the starting multi-cell tile** before exiting (creating unnecessary turns or ugly inside-tile bends).<br>2) Standard FIFO queue returns on first arrival rather than guaranteed minimum turns (`0`, `1`, `2`).<br>3) Returns `null` on invalid pair (`L18`) vs `{ error: 'NO_PATH' }` (`L42`). | Multi-cell paths can bend awkwardly inside the starting tile; path length/turn count may be suboptimal. | Exclude `starts` from `allowed` after step 0 (every cell of `starts` already begins its own 0-turn BFS root). Use a 3-bucket 0-1-2 turn queue (`buckets[0]`, `buckets[1]`, `buckets[2]`) so minimum-turn paths are always discovered first. Standardize return type `OnetPathResult`. |
| **B4** | `src/core/board.js:71, 87-95` (`clearMatchedGroups` & `isBoardSolvable`) | `isBoardSolvable` calls `clearMatchedGroups(board, hint.p1, hint.p2)` without `themeKey`, and line 71 regex only recognizes `candy|ocean|forest|space` — failing for `sakura`, `bakery`, `galaxy`, `meadow`, `fruit`, and seasonal themes if `tile.themeKey` is missing. | Split children in newer themes could fall back to `BEACH_TILES` (`vanilla`) during solver simulation or emergency shuffle. | Always pass `tileIds` / `themeKey` explicitly into `clearMatchedGroups`, `isBoardSolvable`, and `guaranteedShuffle`, and attach `themeKey` on every generated/recovered tile. |
| **B5** | `src/core/difficulty.js:1` & `tests/verify_onet_helpers.mjs:66` | `getTileVarietyCount` is a stub returning `maxAvailable`, forcing all 16 distinct tile graphics onto Level 1. Also `board.js:101` spawns `2×2` at Level 3 (`verify_onet_helpers.mjs:66` incorrectly asserted `1×2` at L3). | Early onboarding levels feel visually cluttered instead of ramping smoothly. | Implement dynamic `getOnetLevelConfig(level)` supporting progressive grid sizes (`6×4` L1–5, `8×6` L6–15, `10×6` L16–30, `12×6` L31+), ramped `tileVariety` (`6 -> 16`), `gravityMode`, and star thresholds. |
| **B6** | `src/game/hooks/useOnetGame.ts:29, 41, 43-55` (Timers, Pause & Race) | 1) `later()` (`setTimeout`) does not pause when `isPaused` becomes `true` or Android `appStateChange` fires, allowing matches/auto-shuffles to mutate board while paused.<br>2) `setInterval(..., 1000)` drops sub-second progress on pause/resume.<br>3) `useEffect` at `L43` skips `time === 0` check while `lock.current === true`, delaying defeat by 480ms or letting a non-final match resolve after `0s`.<br>4) Zero mid-round state persistence (`ActiveOnetSessionState`). | Pausing mid-animation causes state mutation in background; process kill wipes in-progress game; rapid pause/unpause cheats timer. | Replace `1000ms` counter with sub-second high-resolution `remainingMs` accumulator (`100ms` tick or `requestAnimationFrame` delta clamped when paused), pause/freeze pending match/shuffle step timers cleanly on `pause`, snapshot `ActiveOnetSessionState` on every settled move and Android `pause`/`visibilitychange`, and resolve final-match victory cleanly. |
| **B7** | `src/game/hooks/useOnetGame.ts:64, 93-102` (Audio, Haptics & Boosters) | 1) Invalid path (`L64`) never triggers `audio.playWrong()` or error haptic.<br>2) `useHint` (`L95`) & `useShuffle` (`L100`) read stale `CDE.getState()`, charge another Hint if `hintTiles` is already displayed, play no sound on Hint, and `useShuffle` resets/does not extend combo window.<br>3) Free auto-shuffle (`L51-54`) can cause the `4s` combo window to expire while the player is locked (`700ms`). | Missing tactile/audio error feedback; accidental double-tap wastes Hint; involuntary deadlock breaks player's combo streak. | Play `playSfx('wrong')` + `triggerHaptic('invalidMove')` on invalid path; make `useHint` idempotent while `hintTiles` is already showing; play `playSfx('hint')`; extend `lastMatchAt` by `+1000ms` on free deadlock shuffle; route all booster checks/deductions through `LocalPersistenceEngine`. |
| **B8** | `src/game/components/OnetBoard.tsx:30-32, 49` & `GameplayScreen.tsx:25` | 1) `OnetBoard` hardcodes `ROWS` & `COLS` (`10×6`) instead of reading board dimensions.<br>2) Uses `onClick` instead of fast `onPointerDown` (feel lag on mobile touch) and lacks `backup_onet_animation`'s beloved rounded SVG path + Ring-A -> Line -> Ring-B choreography.<br>3) `onNextLevel` in `GameplayScreen.tsx:25` navigates back to `game-hub` instead of starting `level + 1`. | Cannot render `6×4` / `8×6` / `12×6` grids; sluggish tap response on Android; frustrating UX after winning a level. | Derive `rows = board.length - 2`, `cols = board[0].length - 2` dynamically; restore `backup_onet_animation` rounded SVG paths + dual-ring pulse merged with `TileBurst` shards and split-domino animations; use `onPointerDown` with `touch-action: manipulation`; wire `onNextLevel` to `startLevel(currentLevel + 1)`. |

---

## 4. Target Onet Engine Enhancements for `connectify-android`

While preserving every enjoyable mechanic from `connectify-new` (`<= 2`-turn BFS, `2×2 -> 1×2/2×1 -> 1×1` splits, `openSide` directional arrows, rounded SVG path + Ring A/B + `TileBurst` shard choreography, free deadlock auto-shuffle, 4s combo chain, and all existing themes/cosmetics), `connectify-android` introduces:

1. **Dynamic Grid Dimensions & Level Config (`src/game/onet/core/levelConfig.ts`):**
   - `Levels 1–5` (Onboarding): `6 × 4` (`24` cells, `6–8` tile types, `90s`, `0` arrows, `1×2` split introduced at L3).
   - `Levels 6–15` (Focus): `8 × 6` (`48` cells, `10–12` tile types, `115s–130s`, `2×2` quad splits, `1–2` arrow pairs from L8+, optional `'down'` gravity from L11+).
   - `Levels 16–30` (Challenging): `10 × 6` (`60` cells, `14–16` tile types, `105s–120s`, up to `2` split groups, `2–4` arrow pairs, gravity modes `'down' | 'up' | 'left' | 'right'`).
   - `Levels 31+` (Expert/Master): `10 × 6` or `12 × 6` (`72` cells, `16` tile types, `75s–100s`, `2` split groups, up to `6` arrow pairs, including `'split_horizontal'` gravity).
2. **Optional Gravity Shift Pass (`applyOnetGravity(board, gravityMode)`):**
   - Executed deterministically *after* `clearMatchedGroups` (and included inside `isBoardSolvable` simulation!).
   - Slides `1×1` tiles along the active gravity vector while treating multi-cell groups (`1×2`, `2×1`, `2×2`) as immovable anchors until split.
   - Records `{ fromR, fromC, toR, toC }` shift metadata so `OnetBoard` can animate smooth spring slides.
3. **3-Star Mastery & Score Formula:**
   - Standard clear: `100` pts; `1×2`/`2×1` split: `150` pts; `2×2` split: `200` pts; combo bonus: `+(combo - 1) * 15` pts; victory time bonus: `+remainingSeconds * 20` pts.
   - Stars on victory:
     - **1 Star:** Clear board before `time <= 0`.
     - **2 Stars:** `score >= starThresholds[1]` OR `remainingTimeSec / totalTimeSec >= 0.25`.
     - **3 Stars:** `(remainingTimeSec / totalTimeSec >= 0.45) || (mistakes <= 2 && score >= starThresholds[2])`.
4. **Add-Time Booster (`extra_time`):**
   - Optional 3rd booster button (`+15 dtk`) alongside `Acak` (`shuffle`) and `Petunjuk` (`hint`), aligned with `DATA_PERSISTENCE_SPEC.md` and `UI_UX_SPECIFICATION.md`.

---

## 5. Clean TypeScript Integration Contract (`connectify-android`)

All Onet core logic (`src/game/onet/core/*`) must be **100% pure TypeScript** with zero React/DOM dependencies so `@qa-verifier` can execute 1,000-board deterministic Node/Vitest simulations directly. The React hook (`src/game/onet/hooks/useOnetGame.ts`) binds the pure engine to the shared systems below.

### 5.1 Core Onet Domain Types (`src/game/onet/core/types.ts`)

```ts
export type OnetDirection = 'up' | 'right' | 'down' | 'left';
export type OnetSplitAxis = 'horizontal' | 'vertical';
export type OnetGravityMode = 'none' | 'down' | 'up' | 'left' | 'right' | 'split_horizontal';
export type OnetFootprint = '1x1' | '1x2' | '2x1' | '2x2';
export type OnetMatchAction = 'clear' | 'split_to_1x2' | 'split_to_1x1';

export interface GridCoord {
  r: number;
  c: number;
}

export interface OnetTileMaster {
  id: string;
  themeKey: string;
  isSlave?: false;
  groupRows: 1 | 2;
  groupCols: 1 | 2;
  isSplit?: boolean;
  splitAxis?: OnetSplitAxis;
  splitDepth?: number;
  openSide: OnetDirection | null;
  justSplit?: boolean;
  splitAnimKey?: string;
  splitFromX?: number;
  splitFromY?: number;
}

export interface OnetTileSlave {
  id: string;
  isSlave: true;
  masterR: number;
  masterC: number;
}

export type OnetCell = 0 | OnetTileMaster | OnetTileSlave;
export type OnetBoard = OnetCell[][]; // (rows + 2) x (cols + 2) padded matrix

export interface OnetPathResult {
  path: GridCoord[] | null;
  turns: number;
  error?: 'INVALID_PAIR' | 'SAME_TILE' | 'NO_PATH';
}

export interface OnetHint {
  p1: GridCoord;
  p2: GridCoord;
  path: GridCoord[];
  turns: number;
}

export interface OnetDifficultyConfig {
  level: number;
  tier: 1 | 2 | 3 | 4 | 5;
  label: string;
  rows: number;               // e.g. 6, 8, 10, 12
  cols: number;               // e.g. 4, 6
  tileVariety: number;        // distinct icon IDs sampled from active theme
  groups: number;             // number of initial multi-cell split pairs (0..2)
  timeSec: number;            // initial level countdown in seconds
  separation: number;         // target minimum Manhattan distance for constructPairs
  arrowPairs: number;         // max openSide directional pairs injected
  gravityMode: OnetGravityMode;
  starThresholds: [number, number, number];
}

export interface OnetMatchResolution {
  nextBoard: OnetBoard;
  action: OnetMatchAction;
  path: GridCoord[];
  baseScore: number;
  comboChain: number;
  comboBonus: number;
  pointsAwarded: number;
  gravityShifts: Array<{ from: GridCoord; to: GridCoord; tileId: string }>;
  deadlocked: boolean;
  clearedBoard: boolean;
}
```

### 5.2 Pure Engine API (`src/game/onet/core/engine.ts`)

```ts
export interface IOnetPureEngine {
  getDifficultyConfig(level: number, isDailyChallenge?: boolean): OnetDifficultyConfig;

  generateBoard(params: {
    themeKey: string;
    tilePool: string[];       // from ThemeProvider / tileCatalog
    level: number;
    rng?: () => number;
    isDailyChallenge?: boolean;
  }): OnetBoard;

  canMatch(a: OnetCell | undefined, b: OnetCell | undefined): boolean;

  getPath(
    board: OnetBoard,
    r1: number,
    c1: number,
    r2: number,
    c2: number,
    ignoredTiles?: GridCoord[]
  ): OnetPathResult;

  findHint(board: OnetBoard): OnetHint | null;

  clearMatchedGroups(
    board: OnetBoard,
    a: GridCoord,
    b: GridCoord,
    tilePool: string[],
    themeKey: string
  ): OnetBoard;

  applyGravity(board: OnetBoard, mode: OnetGravityMode): {
    board: OnetBoard;
    shifts: Array<{ from: GridCoord; to: GridCoord; tileId: string }>;
  };

  isBoardSolvable(
    board: OnetBoard,
    tilePool: string[],
    themeKey: string,
    gravityMode?: OnetGravityMode
  ): boolean;

  guaranteedShuffle(params: {
    board: OnetBoard;
    tilePool: string[];
    themeKey: string;
    level: number;
    rng?: () => number;
    gravityMode?: OnetGravityMode;
  }): OnetBoard;

  computeStars(params: {
    won: boolean;
    score: number;
    remainingTimeSec: number;
    totalTimeSec: number;
    mistakes: number;
    starThresholds: [number, number, number];
  }): 0 | 1 | 2 | 3;
}
```

### 5.3 Shared Systems Integration Contract (`src/game/onet/types/integration.ts`)

Defines the exact boundary between `useOnetGame` and Connectify Android's shared **Persistence**, **Currency/Economy**, **Progression**, **Theme/Cosmetics**, and **Audio/Haptics** services (aligned with `DATA_PERSISTENCE_SPEC.md`, `GAME_FEEL_AND_AUDIO_SPEC.md`, and `GAME_DESIGN_DOCUMENT.md`):

```ts
import type {
  ActiveOnetSessionState,
  BoosterId,
  ConnectifySaveDataV1,
  MutationResult,
} from '../../../core/persistence/types';
import type { ThemeManifest } from '../../../core/theme/types';
import type { BgmScene, HapticPatternKey, SfxKey } from '../../../core/audio/types';

/** 1. Shared Theme & Cosmetic Adapter */
export interface OnetThemeAdapter {
  activeTheme: ThemeManifest;
  /** Ordered tile IDs & image URIs resolved for activeTheme (Onet override or global) */
  tilePoolIds: string[];
  resolveTileImage: (tileId: string) => string;
  /** Equipped Onet cosmetic surface & FX slots */
  cosmetics: {
    tile1SkinUrl: string;
    tile2SkinUrl: string;
    tile4SkinUrl: string;
    arrowSkinUrl: string;
    matchAnimId: string;
    matchPathColor: string;
    victoryEffectId: string;
  };
  reducedMotion: boolean;
}

/** 2. Shared Audio & Haptics Adapter (matches GAME_FEEL_AND_AUDIO_SPEC.md Section 8) */
export interface OnetAudioHapticsAdapter {
  setBgmScene: (scene: BgmScene) => void; // 'game' on mount, 'menu' on exit
  playSfx: (key: SfxKey) => void;         // 'select', 'match', 'split', 'wrong', 'hint', 'shuffle', 'win', 'lose'
  playComboMatch: (comboChain: number) => void;
  triggerHaptic: (pattern: HapticPatternKey) => void; // 'tileSelect', 'matchClear', 'comboOrSpecial', 'invalidMove', 'levelVictory'
}

/** 3. Shared Currency, Booster & Progression Adapter */
export interface OnetRoundCompletionPayload {
  game: 'onet';
  runId: string;
  level: number;
  isDailyChallenge: boolean;
  dailyDateKey: string | null;
  isWinner: boolean;
  stars: 0 | 1 | 2 | 3;
  score: number;
  isFlawless: boolean;
  timeElapsedMs: number;
  remainingTimeSec: number;
  totalTimeSec: number;
  highestCombo: number;
  matches: number;
  splits: number;
  mistakes: number;
  boostersUsed: Partial<Record<BoosterId, number>>;
}

export interface OnetRewardSummary {
  coinsEarned: number;
  xpEarned: number;
  starsEarned: 0 | 1 | 2 | 3;
  leveledUp: boolean;
  newAccountLevel: number;
  newHighestUnlockedLevel: number;
  unlockedAchievementIds: string[];
  completedMissionIds: string[];
}

export interface OnetPersistenceEconomyAdapter {
  /** Read current Onet progression & booster inventory */
  getCurrentLevel: () => number;
  getHighestUnlockedLevel: () => number;
  getBoosterStock: (booster: Extract<BoosterId, 'hint' | 'shuffle' | 'extra_time'>) => number;
  getBoosterPrice: (booster: Extract<BoosterId, 'hint' | 'shuffle' | 'extra_time'>) => number;
  getCoinsBalance: () => number;
  isDailySprintCompletedToday: (dateKey: string) => boolean;

  /** Consume 1 owned booster (atomic transaction with idempotency key) */
  consumeBooster: (
    booster: Extract<BoosterId, 'hint' | 'shuffle' | 'extra_time'>,
    runId: string,
    moveIndex: number
  ) => MutationResult<ConnectifySaveDataV1>;

  /** Quick-buy + consume when stock is 0 (only if coins >= price) */
  purchaseAndUseBooster?: (
    booster: Extract<BoosterId, 'hint' | 'shuffle' | 'extra_time'>,
    runId: string,
    moveIndex: number
  ) => MutationResult<ConnectifySaveDataV1>;

  /** Mid-round session save/restore/clear for Android pause & process kill */
  saveActiveSession: (session: ActiveOnetSessionState | null) => void;
  loadActiveSession: () => ActiveOnetSessionState | null;
  flushNow: () => void;

  /** Idempotent end-of-round settlement (awards coins, XP, stars, missions, achievements) */
  submitRoundResult: (payload: OnetRoundCompletionPayload) => OnetRewardSummary;
}
```

### 5.4 Hook Output Interface (`useOnetGame` -> UI Layer)

```ts
export interface UseOnetGameReturn {
  // Board & visual animation state
  board: OnetBoard;
  rows: number;
  cols: number;
  selected: GridCoord | null;
  activePaths: Array<{ id: number; path: GridCoord[]; color: string }>;
  hintTiles: OnetHint | null;
  errorTiles: GridCoord[];
  matchingTiles: GridCoord[];
  floatingTexts: Array<{ id: number; text: string; x: number; y: number }>;

  // Round telemetry & HUD
  level: number;
  difficultyLabel: string;
  isDailyChallenge: boolean;
  score: number;
  combo: number;
  highestCombo: number;
  remainingCells: number;
  remainingTimeSec: number;
  totalTimeSec: number;
  starThresholds: [number, number, number];
  isPaused: boolean;
  gameState: 'playing' | 'won' | 'lost';
  toastMessage: string | null;
  rewardSummary: OnetRewardSummary | null;

  // Booster counts
  boosterStocks: { hint: number; shuffle: number; extra_time: number };

  // Actions
  handleTilePress: (r: number, c: number) => void;
  useHint: () => void;
  useShuffle: () => void;
  useExtraTime: () => void;
  pauseGame: () => void;
  resumeGame: () => void;
  restartLevel: () => void;
  startNextLevel: () => void;
  abandonAndExit: () => void;
}
```

---

## 6. Verification Checklist for Phase 3 & Phase 4

Aligned with `docs/TESTING_STRATEGY.md` (Suites 1 & 2):
- **Pathfinding (`ONET-PF-01..10`):** 0/1/2-turn paths, `>2`-turn rejection, border gutter routing, multi-cell master/slave routing without internal self-stepping, deterministic split child IDs across all themes, and `openSide` exit/entry constraints.
- **1,000-Board Solvability & Shuffle (`ONET-BG-01..05`):** Seeded determinism, full cell occupancy (zero holes), zero orphan slave cells, `1,000 / 1,000` solvable boards across Levels `1–100` and all themes, and `1,000`-board adversarial playthroughs resolving every deadlock via `guaranteedShuffle` (`< 10ms`) with zero orphan slaves.
- **Lifecycle & Pause Safety:** Sub-second timer accuracy across repeated pause/resume cycles, immediate `ActiveOnetSessionState` snapshot on Android `appStateChange` / `visibilitychange` / `pagehide`, and idempotent `runId` reward settlement.
