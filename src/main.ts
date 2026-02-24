import { EntryDatabase } from "./state/EntryDatabase";
import { BattleHistory } from "./state/BattleHistory";
import { GameState } from "./state/GameState";
import { Router } from "./logic/Router";
import { MatchupEngine } from "./logic/MatchupEngine";
import { AudioManager } from "./logic/AudioManager";
import { AnimationController } from "./view/AnimationController";
import { MainPageView } from "./view/MainPageView";
import { MatchupScreenView } from "./view/MatchupScreenView";
import { RecordingSession } from "./logic/RecordingSession";
import type { RecordedMatch } from "./logic/RecordingSession";

async function main() {
  // --- Create instances ---
  const entryDb = new EntryDatabase();
  const history = new BattleHistory();
  const gameState = new GameState();
  const router = new Router();
  const matchupEngine = new MatchupEngine(entryDb, history);
  const audio = new AudioManager();
  const animationController = new AnimationController(audio);

  const mainPageView = new MainPageView();
  const matchupScreenView = new MatchupScreenView();
  const recording = new RecordingSession();

  // Replay state
  let replayMatches: RecordedMatch[] | null = null;
  let replayIndex = 0;
  let replayUserPicks: RecordedMatch[] = [];

  // --- Load persisted data ---
  await history.load();
  await audio.loadSounds();

  // Validate images in the background — don't block initial render.
  // When done, re-render the main page to drop any broken entries.
  entryDb.validateImages().then(() => {
    if (gameState.currentScreen === "main") {
      mainPageView.render(entryDb.getAllArenas());
    }
  });

  // --- Helper: stop recording and show share modal ---
  async function stopRecordingAndShare(): Promise<void> {
    recording.stop();
    matchupScreenView.setRecording(false);
    const matches = recording.recordedMatches;
    if (matches.length === 0 || !gameState.selectedArenaId) return;

    const arena = entryDb.getArena(gameState.selectedArenaId);
    const arenaName = arena?.name ?? "Arena";
    const encoded = await RecordingSession.encode(gameState.selectedArenaId, matches);
    const shareUrl = `${window.location.origin}${window.location.pathname}#/arena/${gameState.selectedArenaId}?replay=${encoded}`;

    matchupScreenView.showRecordingModal(matches, arenaName, shareUrl, async () => {
      try {
        await navigator.clipboard.writeText(shareUrl);
        alert("Link copied to clipboard!");
      } catch {
        prompt("Copy this link:", shareUrl);
      }
    });
  }

  // --- Shared selection handler (used by both tap and swipe) ---
  async function handleSelection(option: "a" | "b"): Promise<void> {
    if (gameState.isTransitioning || !gameState.currentMatchup || !gameState.selectedArenaId) return;
    gameState.isTransitioning = true;

    const { optionA, optionB } = gameState.currentMatchup;
    const winner = option === "a" ? optionA : optionB;
    const winnerSide: "left" | "right" = option === "a" ? "left" : "right";
    const loserSide: "left" | "right" = option === "a" ? "right" : "left";

    const winnerElement = option === "a"
      ? matchupScreenView.getOptionAElement()
      : matchupScreenView.getOptionBElement();
    const loserElement = option === "a"
      ? matchupScreenView.getOptionBElement()
      : matchupScreenView.getOptionAElement();

    // Record result and save history
    matchupEngine.recordResult(gameState.selectedArenaId, optionA, optionB, winner);
    gameState.winner = winner;
    await history.save();

    // Track in recording session if active
    if (recording.active) {
      recording.addMatch(optionA.name, optionB.name, winner.name);
      matchupScreenView.updateBattleCount(recording.recordedMatches.length);
    }

    // Track in replay session if active
    if (replayMatches) {
      replayUserPicks.push({ entryA: optionA.name, entryB: optionB.name, winner: winner.name });
    }

    // Animation sequence
    if (winnerElement) {
      await animationController.playSelectionHighlight(winnerElement);
    }
    if (loserElement) {
      await animationController.playLoserExit(loserElement, loserSide);
    }
    if (winnerElement) {
      await animationController.playWinnerSlide(winnerElement, winnerSide);
    }

    // --- Replay mode: advance to next replay match or show verdict ---
    if (replayMatches) {
      replayIndex++;
      if (replayIndex >= replayMatches.length) {
        // All replay matches done — show verdict
        const score = RecordingSession.jaccardSimilarity(replayMatches, replayUserPicks);
        const verdictText = RecordingSession.verdict(score);
        const arena = entryDb.getArena(gameState.selectedArenaId);
        const arenaName = arena?.name ?? "Arena";
        matchupScreenView.showReplayResult(score, verdictText, replayMatches, replayUserPicks, arenaName, () => {
          matchupScreenView.showRecordButton();
        });
        replayMatches = null;
        replayIndex = 0;
        replayUserPicks = [];
        gameState.isTransitioning = false;
        return;
      }

      // Show next replay match
      const arena = entryDb.getArena(gameState.selectedArenaId);
      if (!arena) { gameState.isTransitioning = false; return; }

      const nextReplay = replayMatches[replayIndex]!;
      const nextA = arena.entries.find(e => e.name === nextReplay.entryA);
      const nextB = arena.entries.find(e => e.name === nextReplay.entryB);
      if (!nextA || !nextB) { gameState.isTransitioning = false; return; }

      gameState.currentMatchup = { optionA: nextA, optionB: nextB };
      await matchupScreenView.preloadEntries(nextA, nextB);
      matchupScreenView.render(arena.battleground, arena.name, nextA, nextB);
      wireGameplayLoop();
      matchupScreenView.setReplayProgress(replayIndex + 1, replayMatches.length);
      gameState.isTransitioning = false;
      return;
    }

    // --- Normal mode: pick next contender ---
    const nextContender = matchupEngine.pickNextContender(gameState.selectedArenaId, winner, gameState.ignoredEntries);

    if (!nextContender) {
      // If recording, try a fresh random matchup instead of stopping
      if (recording.active) {
        const freshMatchup = matchupEngine.pickInitialMatchup(gameState.selectedArenaId, gameState.ignoredEntries);
        if (freshMatchup) {
          const arena = entryDb.getArena(gameState.selectedArenaId);
          if (arena) {
            gameState.currentMatchup = freshMatchup;
            await matchupScreenView.preloadEntries(freshMatchup.optionA, freshMatchup.optionB);
            matchupScreenView.render(arena.battleground, arena.name, freshMatchup.optionA, freshMatchup.optionB);
            wireGameplayLoop();
            gameState.isTransitioning = false;
            return;
          }
        }
        // Truly exhausted while recording — auto-stop and show share
        gameState.isTransitioning = false;
        await stopRecordingAndShare();
        return;
      }

      // Not recording — show exhausted message and navigate back
      const arena = entryDb.getArena(gameState.selectedArenaId);
      const arenaName = arena?.name ?? "this arena";
      matchupScreenView.showExhaustedMessage(
        `No more matchups for ${winner.name} in ${arenaName}!`
      );
      gameState.isTransitioning = false;
      setTimeout(() => {
        router.navigate({ screen: "main" });
      }, 2000);
      return;
    }

    // Re-render matchup: winner becomes Option A, new contender becomes Option B
    const arena = entryDb.getArena(gameState.selectedArenaId);
    if (!arena) {
      gameState.isTransitioning = false;
      return;
    }

    gameState.currentMatchup = { optionA: winner, optionB: nextContender };
    await matchupScreenView.preloadEntries(winner, nextContender);
    matchupScreenView.render(arena.battleground, arena.name, winner, nextContender);

    // Re-wire gameplay loop after re-render (new DOM elements)
    wireGameplayLoop();

    // Play contender entrance on the new Option B element
    const newContenderElement = matchupScreenView.getOptionBElement();
    if (newContenderElement) {
      await animationController.playContenderEntrance(newContenderElement);
    }

    // Images are already at 25% crop state from render()
    gameState.isTransitioning = false;
  }

  // --- Gameplay loop wiring helper ---
  // Called after each matchup screen render to wire tap, swipe, and cancel callbacks.
  function wireGameplayLoop() {
    // Tap selection
    matchupScreenView.onOptionTap((option) => {
      handleSelection(option);
    });

    // Header click — back to arena selection
    matchupScreenView.onHeaderClick(() => {
      router.navigate({ screen: "main" });
    });

    // Results button — show modal with win leaderboard for current arena
    matchupScreenView.onResultsClick(() => {
      if (!gameState.selectedArenaId) return;
      const arena = entryDb.getArena(gameState.selectedArenaId);
      const arenaName = arena?.name ?? "Arena";
      const results = history.getResults(gameState.selectedArenaId);

      // Tally wins per entry name
      const wins = new Map<string, number>();
      for (const r of results) {
        wins.set(r.winner, (wins.get(r.winner) ?? 0) + 1);
      }

      // Sort by wins descending
      const sorted = [...wins.entries()]
        .map(([name, w]) => ({ name, wins: w }))
        .sort((a, b) => b.wins - a.wins);

      matchupScreenView.showResultsModal(sorted, arenaName, async () => {
        history.clearArena(gameState.selectedArenaId!);
        await history.save();
      });
    });

    // Pass button — skip this matchup and load two new random entries
    matchupScreenView.onPass(async () => {
      if (gameState.isTransitioning || !gameState.selectedArenaId) return;

      const matchup = matchupEngine.pickInitialMatchup(gameState.selectedArenaId, gameState.ignoredEntries);
      if (!matchup) {
        const arena = entryDb.getArena(gameState.selectedArenaId);
        matchupScreenView.showExhaustedMessage(
          `All matchups complete in ${arena?.name ?? "this arena"}!`
        );
        return;
      }

      gameState.currentMatchup = matchup;
      const arena = entryDb.getArena(gameState.selectedArenaId);
      if (!arena) return;

      await matchupScreenView.preloadEntries(matchup.optionA, matchup.optionB);
      matchupScreenView.render(arena.battleground, arena.name, matchup.optionA, matchup.optionB);
      wireGameplayLoop();
    });

    // Ignore button — ban an entry and replace it
    matchupScreenView.onIgnore(async (side) => {
      if (gameState.isTransitioning || !gameState.currentMatchup || !gameState.selectedArenaId) return;

      const { optionA, optionB } = gameState.currentMatchup;
      const ignored = side === "a" ? optionA : optionB;
      const opponent = side === "a" ? optionB : optionA;

      gameState.ignoredEntries.add(ignored.name);

      const replacement = matchupEngine.findReplacement(gameState.selectedArenaId, opponent, gameState.ignoredEntries);
      if (!replacement) {
        const arena = entryDb.getArena(gameState.selectedArenaId);
        matchupScreenView.showExhaustedMessage(
          `No more contenders for ${opponent.name} in ${arena?.name ?? "this arena"}!`
        );
        return;
      }

      const newA = side === "a" ? replacement : optionA;
      const newB = side === "b" ? replacement : optionB;
      gameState.currentMatchup = { optionA: newA, optionB: newB };

      const arena = entryDb.getArena(gameState.selectedArenaId);
      if (!arena) return;

      await matchupScreenView.preloadEntries(newA, newB);
      matchupScreenView.render(arena.battleground, arena.name, newA, newB);
      wireGameplayLoop();
    });

    // Swipe callbacks — curtain reveal mechanic
    const swipeHandler = matchupScreenView.getSwipeHandler();

    swipeHandler.onSwipeUpdate((state) => {
      if (gameState.isTransitioning) return;
      matchupScreenView.applyCurtainClip(state);
    });

    swipeHandler.onSwipeComplete((selected) => {
      if (gameState.isTransitioning) return;
      handleSelection(selected);
    });

    swipeHandler.onSwipeCancel(() => {
      matchupScreenView.resetCurtain();
    });

    // Record/Stop button
    matchupScreenView.onRecord(async () => {
      if (!gameState.selectedArenaId) return;

      // Reset to a clean state: clear arena history, ignored entries
      history.clearArena(gameState.selectedArenaId);
      await history.save();
      gameState.ignoredEntries.clear();

      recording.start();
      matchupScreenView.setRecording(true);

      // Pick a fresh matchup
      const matchup = matchupEngine.pickInitialMatchup(gameState.selectedArenaId, gameState.ignoredEntries);
      if (!matchup) return;

      const arena = entryDb.getArena(gameState.selectedArenaId);
      if (!arena) return;

      gameState.currentMatchup = matchup;
      await matchupScreenView.preloadEntries(matchup.optionA, matchup.optionB);
      matchupScreenView.render(arena.battleground, arena.name, matchup.optionA, matchup.optionB);
      wireGameplayLoop();
    });

    matchupScreenView.onStop(async () => {
      await stopRecordingAndShare();
    });

    // Update record button state if recording is active
    if (recording.active) {
      matchupScreenView.setRecording(true);
    }
  }

  // --- Start replay mode from decoded data ---
  async function startReplay(arenaId: string, matches: RecordedMatch[]): Promise<void> {
    const arena = entryDb.getArena(arenaId);
    if (!arena || matches.length === 0) {
      router.navigate({ screen: "main" });
      return;
    }

    replayMatches = matches;
    replayIndex = 0;
    replayUserPicks = [];

    gameState.currentScreen = "matchup";
    gameState.selectedArenaId = arenaId;

    const first = matches[0]!;
    const optionA = arena.entries.find(e => e.name === first.entryA);
    const optionB = arena.entries.find(e => e.name === first.entryB);
    if (!optionA || !optionB) {
      router.navigate({ screen: "main" });
      return;
    }

    gameState.currentMatchup = { optionA, optionB };
    await matchupScreenView.preloadEntries(optionA, optionB);
    matchupScreenView.render(arena.battleground, arena.name, optionA, optionB);
    wireGameplayLoop();
    matchupScreenView.setReplayProgress(1, matches.length);
  }

  // --- Route change handler ---
  router.onRouteChange(async (route) => {
    // Reset replay state on any navigation
    replayMatches = null;
    replayIndex = 0;
    replayUserPicks = [];

    if (route.screen === "main") {
      gameState.reset();
      mainPageView.render(entryDb.getAllArenas());
    } else if (route.screen === "matchup" && route.arenaId) {
      // Check for replay data
      if (route.replayData) {
        try {
          const decoded = await RecordingSession.decode(route.replayData);
          await startReplay(decoded.arenaId, decoded.matches);
          return;
        } catch (e) {
          console.error("Failed to decode replay data:", e);
        }
      }

      const arena = entryDb.getArena(route.arenaId);
      if (!arena) {
        router.navigate({ screen: "main" });
        return;
      }

      gameState.currentScreen = "matchup";
      gameState.selectedArenaId = route.arenaId;

      const matchup = matchupEngine.pickInitialMatchup(route.arenaId, gameState.ignoredEntries);
      if (!matchup) {
        matchupScreenView.showExhaustedMessage(
          `All matchups complete in ${arena.name}!`
        );
        return;
      }

      gameState.currentMatchup = matchup;
      await matchupScreenView.preloadEntries(matchup.optionA, matchup.optionB);
      matchupScreenView.render(arena.battleground, arena.name, matchup.optionA, matchup.optionB);
      wireGameplayLoop();
    }
  });

  // --- Wire arena selection → navigate to matchup screen ---
  mainPageView.onArenaSelect((arenaId) => {
    router.navigate({ screen: "matchup", arenaId });
  });

  // --- Render initial route ---
  const initialRoute = router.getCurrentRoute();
  if (initialRoute.screen === "matchup" && initialRoute.arenaId) {
    // Check for replay data on initial load
    if (initialRoute.replayData) {
      try {
        const decoded = await RecordingSession.decode(initialRoute.replayData);
        await startReplay(decoded.arenaId, decoded.matches);
      } catch (e) {
        console.error("Failed to decode replay data:", e);
        router.navigate({ screen: "main" });
      }
    } else {
      const arena = entryDb.getArena(initialRoute.arenaId);
      if (arena) {
        gameState.currentScreen = "matchup";
        gameState.selectedArenaId = initialRoute.arenaId;

        const matchup = matchupEngine.pickInitialMatchup(initialRoute.arenaId, gameState.ignoredEntries);
        if (matchup) {
          gameState.currentMatchup = matchup;
          await matchupScreenView.preloadEntries(matchup.optionA, matchup.optionB);
          matchupScreenView.render(arena.battleground, arena.name, matchup.optionA, matchup.optionB);
          wireGameplayLoop();
        } else {
          matchupScreenView.showExhaustedMessage(`All matchups complete in ${arena.name}!`);
        }
      } else {
        router.navigate({ screen: "main" });
      }
    }
  } else {
    mainPageView.render(entryDb.getAllArenas());
  }
}

main().catch((err) => {
  console.error("Failed to initialize application:", err);
});
