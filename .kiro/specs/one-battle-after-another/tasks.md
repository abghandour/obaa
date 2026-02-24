# Implementation Plan: One Battle After Another

## Overview

Build a mobile-optimized web game using vanilla TypeScript + Vite where players select arenas and vote on head-to-head matchups. Implementation follows a bottom-up approach: data layer first, then logic, then views, then styling/audio, then integration. Each task builds on the previous, ensuring no orphaned code.

## Tasks

- [x] 1. Project scaffolding and core types
  - [x] 1.1 Initialize Vite + TypeScript project
    - Run `npm create vite@latest . -- --template vanilla-ts` (or scaffold manually)
    - Configure `tsconfig.json` with strict mode
    - Install dev dependencies: `vitest`, `fast-check`, `jsdom`
    - Configure `vitest.config.ts` with jsdom environment
    - Create `src/` directory structure: `src/state/`, `src/logic/`, `src/view/`, `src/data/`, `src/types/`
    - _Requirements: N/A (infrastructure)_

  - [x] 1.2 Define core TypeScript interfaces and types
    - Create `src/types/index.ts` with all shared interfaces: `Entry`, `Arena`, `Battleground`, `BattleResult`, `MatchupPick`, `SwipeState`, `GameState`, `Route`, `SoundEffect`
    - Ensure `BattleResult.entryA` and `entryB` are documented as alphabetically ordered
    - _Requirements: 7.1, 7.2, 10.1, 15.1_

- [x] 2. Entry database and static data
  - [x] 2.1 Create the EntryDatabase class and battleground data
    - Create `src/data/battlegrounds.ts` with predefined battlegrounds: Music (Albums, Bands, Singers) and Movie (Films, Actors, Actresses)
    - Each arena must have a minimum of 10 entries with real names and Wikipedia/Wikimedia image URLs
    - Add at least one additional battleground beyond Music and Movie (e.g., Books, Fighters)
    - Create `src/state/EntryDatabase.ts` implementing `getAllArenas()`, `getArena(arenaId)`, `getEntries(arenaId)`
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 12.1, 12.2, 12.3, 12.4_

  - [ ]* 2.2 Write property test: Entry database integrity (Property 10)
    - **Property 10: Entry database integrity**
    - Iterate all arenas, assert each has ≥ 10 entries with non-empty names and Wikipedia/Wikimedia URLs
    - **Validates: Requirements 12.1, 12.2, 12.3**

- [x] 3. Battle history with compression
  - [x] 3.1 Implement BattleHistory class with gzip compression
    - Create `src/state/BattleHistory.ts` implementing `addResult()`, `getResults()`, `getPlayedPairs()`, `save()`, `load()`, `clear()`
    - Implement canonical pair key generation (sort names alphabetically, join with `|`)
    - Implement `compress()`: JSON.stringify → CompressionStream gzip → Base64 encode
    - Implement `decompress()`: Base64 decode → DecompressionStream gzip → JSON.parse
    - Add fallback for browsers without CompressionStream (store raw JSON)
    - Handle corrupted localStorage gracefully: catch errors, initialize empty history
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5, 15.6_

  - [ ]* 3.2 Write property test: Battle history compression round-trip (Property 12)
    - **Property 12: Battle history compression round-trip**
    - Generate random lists of BattleResults, compress then decompress, assert equality
    - **Validates: Requirements 15.3, 15.4, 15.5**

  - [ ]* 3.3 Write property test: Battle result completeness (Property 11)
    - **Property 11: Battle result completeness**
    - Generate random matchup outcomes, call `recordResult` via MatchupEngine (or directly on BattleHistory), assert the result appears in history with all required fields and alphabetical ordering
    - **Validates: Requirements 15.1, 15.2, 16.3**

- [x] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. MatchupEngine and game logic
  - [x] 5.1 Implement GameState
    - Create `src/state/GameState.ts` holding current screen, selected arena, current matchup, winner, and transition flag
    - _Requirements: 7.2, 11.4_

  - [x] 5.2 Implement MatchupEngine
    - Create `src/logic/MatchupEngine.ts` implementing `pickInitialMatchup()`, `pickNextContender()`, `recordResult()`, `isPairPlayed()`, `isArenaExhausted()`
    - Use BattleHistory.getPlayedPairs() to filter out already-played matchup pairs
    - Implement random selection from available (unplayed) pairs
    - Return null when winner pairs or arena pairs are exhausted
    - _Requirements: 7.2, 12.5, 16.1, 16.2, 16.3, 16.4, 16.5, 16.6_

  - [ ]* 5.3 Write property test: Picked entries belong to arena (Property 3)
    - **Property 3: Picked entries belong to arena**
    - Generate random arena databases, call `pickInitialMatchup`, assert both entries are in the arena
    - **Validates: Requirements 7.2**

  - [ ]* 5.4 Write property test: New matchup pairs are never repeated (Property 8)
    - **Property 8: New matchup pairs are never repeated**
    - Generate random arenas with histories containing some played pairs, call pick functions, assert returned pairs are not in history
    - **Validates: Requirements 12.5, 16.1, 16.2, 16.4**

  - [ ]* 5.5 Write property test: Contender excludes current winner (Property 9)
    - **Property 9: Contender excludes current winner**
    - Generate random arenas with a winner, call `pickNextContender`, assert contender is not the winner and is in the arena database
    - **Validates: Requirements 11.4**

  - [ ]* 5.6 Write property test: Winner exhaustion detection (Property 13)
    - **Property 13: Winner exhaustion detection**
    - Generate arenas with n entries, fill history with n-1 pairs for a specific winner, assert `pickNextContender` returns null
    - **Validates: Requirements 16.5**

  - [ ]* 5.7 Write property test: Arena exhaustion detection (Property 14)
    - **Property 14: Arena exhaustion detection**
    - Generate arenas with n entries, fill history with all n*(n-1)/2 pairs, assert `isArenaExhausted` returns true and `pickInitialMatchup` returns null
    - **Validates: Requirements 16.6**

- [x] 6. SwipeHandler
  - [x] 6.1 Implement SwipeHandler
    - Create `src/logic/SwipeHandler.ts` implementing `attach()`, `detach()`, `onSwipeUpdate()`, `onSwipeComplete()`, `onSwipeCancel()`, `getRevealPercent()`
    - Handle `touchstart`, `touchmove`, `touchend` events
    - Calculate reveal progress: `clamp(swipeDistance / (containerWidth * 0.25), 0, 1)`
    - Auto-select at revealProgress >= 0.6 (90% total visibility)
    - Fire snap-back callback when released below threshold
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

  - [ ]* 6.2 Write property test: Swipe reveal is proportional to distance (Property 5)
    - **Property 5: Swipe reveal is proportional to distance**
    - Generate random swipe distances and container widths, assert reveal progress matches `clamp(swipeDistance / (containerWidth * 0.25), 0, 1)`
    - **Validates: Requirements 10.1, 10.2**

  - [ ]* 6.3 Write property test: Reveal threshold triggers selection or snap-back (Property 6)
    - **Property 6: Reveal threshold triggers selection or snap-back**
    - Generate random reveal progress values, assert threshold detection matches the 90% rule
    - **Validates: Requirements 10.4, 10.5**

- [x] 7. Router and AudioManager
  - [x] 7.1 Implement Router
    - Create `src/logic/Router.ts` with hash-based routing (`#/` for main, `#/arena/{arenaId}` for matchup)
    - Implement `navigate()`, `getCurrentRoute()`, `onRouteChange()`
    - Listen to `hashchange` events
    - _Requirements: 4.1_

  - [x] 7.2 Implement AudioManager
    - Create `src/logic/AudioManager.ts` using Web Audio API
    - Implement `loadSounds()`, `play()`, `setMuted()`
    - Support sound effects: "tap", "swipe", "transition", "contenderAppear"
    - Handle missing Web Audio API gracefully (silent fallback)
    - Catch and swallow playback errors
    - _Requirements: 9.3, 10.6, 11.6, 13.1, 13.2, 13.3, 13.4_

  - [ ]* 7.3 Write property test: Sound effects are triggered for game events (Property 7)
    - **Property 7: Sound effects are triggered for game events**
    - Generate random game event sequences, assert each event triggers the correct AudioManager.play call
    - **Validates: Requirements 9.3, 10.6, 11.6, 13.1, 13.2, 13.3, 13.4**

- [x] 8. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. View layer - MainPageView and AdBannerView
  - [x] 9.1 Implement AdBannerView
    - Create `src/view/AdBannerView.ts`
    - Render a fixed-bottom banner with placeholder text "Advertisement"
    - Ensure banner does not overlap game content (use padding/margin on parent)
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [x] 9.2 Implement MainPageView
    - Create `src/view/MainPageView.ts`
    - Render header "One Battle After Another" and sub-header "Pick a Battleground"
    - Render Arena_Grid as a two-column grid of buttons, one per arena, labeled with arena name
    - Flat list with no battleground category headers
    - Wire arena button clicks to trigger `onArenaSelect` callback with visual feedback (CSS active state)
    - Include AdBannerView at the bottom
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 4.1, 4.2_

  - [ ]* 9.3 Write property test: Arena grid completeness (Property 1)
    - **Property 1: Arena grid completeness**
    - Generate random lists of arenas, render the grid, assert button count equals arena count and labels match names, no battleground headers present
    - **Validates: Requirements 1.3, 2.1, 2.2, 2.3, 3.4**

- [x] 10. View layer - MatchupScreenView and AnimationController
  - [x] 10.1 Implement AnimationController
    - Create `src/view/AnimationController.ts`
    - Implement `playSelectionHighlight()`, `playLoserExit()`, `playWinnerSlide()`, `playContenderEntrance()`, `playSnapBack()`
    - All methods return Promises (resolve on `transitionend`/`animationend`)
    - Use CSS transforms for GPU-accelerated 30+ fps animations
    - Integrate AudioManager calls for transition and contender-appear sounds
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 11.1, 11.2, 11.3, 11.6_

  - [x] 10.2 Implement MatchupScreenView
    - Create `src/view/MatchupScreenView.ts`
    - Render matchup header in format "Battleground > Arena" (e.g., "Movies > Actors")
    - Render Option_A (left) and Option_B (right) with entry images and name labels below
    - Implement `updateReveal()` to adjust CSS transform based on swipe progress
    - Implement `showExhaustedMessage()` for when matchups run out
    - Wire tap events on option images to `onOptionTap` callback
    - Delegate swipe gestures to SwipeHandler
    - Include AdBannerView at the bottom
    - _Requirements: 7.1, 7.3, 7.4, 7.5, 8.1, 8.2, 8.3, 8.4, 9.1, 9.2, 9.4_

  - [ ]* 10.3 Write property test: Matchup header format (Property 2)
    - **Property 2: Matchup header format**
    - Generate random battleground/arena name pairs, assert header format matches `"{battlegroundName} > {arenaName}"`
    - **Validates: Requirements 7.1**

  - [ ]* 10.4 Write property test: Tap selects the tapped option (Property 4)
    - **Property 4: Tap selects the tapped option**
    - Generate random matchups, simulate tap on each option, assert winner matches tapped option
    - **Validates: Requirements 9.1, 9.2**

  - [ ]* 10.5 Write property test: Image crop offset calculation (Property 15)
    - **Property 15: Image crop offset calculation**
    - Generate random image widths and option sides, assert the crop offset equals 25% of image width in the correct direction, leaving exactly 75% visible
    - **Validates: Requirements 8.1, 8.2, 8.3**

- [x] 11. CSS styling - mobile-optimized layout and animations
  - [x] 11.1 Create main stylesheet with CSS custom properties
    - Create `src/style.css` with CSS custom properties for theming (colors, spacing, font sizes)
    - Style the main page: header, sub-header, arena grid (two-column), responsive layout (320px-480px)
    - Style arena buttons with minimum 44x44px touch targets and tap feedback (`:active` state)
    - Style the ad banner: fixed bottom, full width, non-overlapping
    - Ensure portrait orientation usability, no horizontal scrolling
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 6.3, 6.5_

  - [x] 11.2 Create matchup screen styles and image cropping CSS
    - Style matchup screen layout: header, two-column option containers
    - Implement image cropping: `overflow: hidden` containers, images at 133.33% width
    - Option A: `transform: translateX(-25%)` to crop left edge
    - Option B: default position with overflow hidden cropping right edge
    - Style entry name labels centered below images
    - Add snap-back transition: `transition: transform 0.3s ease-out`
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

  - [x] 11.3 Create animation CSS classes
    - Define CSS keyframes and classes for: selection highlight (pulse/glow), loser exit (slide off-screen), winner slide (move to opposite side), contender entrance (fade in), snap-back
    - Use CSS transforms exclusively for GPU acceleration (no layout-triggering properties)
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5_

- [x] 12. Sound effect assets
  - [x] 12.1 Create or source sound effect audio files
    - Add audio files to `public/sounds/`: `tap.mp3`, `swipe.mp3`, `transition.mp3`, `contender.mp3`
    - Use short, lightweight audio clips (< 50KB each)
    - Update AudioManager to load these specific file paths
    - _Requirements: 13.1, 13.2, 13.3, 13.4_

- [x] 13. Integration and wiring
  - [x] 13.1 Wire up the application entry point
    - Update `src/main.ts` to initialize all components: EntryDatabase, BattleHistory, GameState, Router, MatchupEngine, AudioManager, views
    - Load battle history from localStorage on startup
    - Set up Router to switch between MainPageView and MatchupScreenView
    - Wire arena selection → Router.navigate → MatchupEngine.pickInitialMatchup → MatchupScreenView.render
    - _Requirements: 1.1, 1.2, 1.3, 4.1_

  - [x] 13.2 Wire up the matchup gameplay loop
    - Connect tap selection: onOptionTap → MatchupEngine.recordResult → AnimationController sequence → pickNextContender → render new matchup
    - Connect swipe: SwipeHandler → MatchupScreenView.updateReveal → auto-select or snap-back
    - Play appropriate sound effects at each step (tap, swipe, transition, contender appear)
    - Handle exhaustion: show message and navigate back to main page
    - Reset images to 25% crop state after each transition
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 16.3, 16.4, 16.5, 16.6_

  - [x] 13.3 Wire up battle history persistence
    - Call BattleHistory.save() after each recordResult
    - Call BattleHistory.load() on app startup
    - Ensure matchup pair uniqueness check uses loaded history
    - _Requirements: 15.2, 15.3, 15.5, 15.6, 16.1, 16.2_

- [x] 14. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The design uses TypeScript with Vite — all code examples and implementations use TypeScript
