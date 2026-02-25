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
import { TournamentBracket } from "./logic/TournamentBracket";
import { TournamentEngine } from "./logic/TournamentEngine";
import { TournamentMatchupView } from "./view/TournamentMatchupView";
import { BracketView } from "./view/BracketView";
import { BracketSvgView } from "./view/BracketSvgView";

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

  // Tournament instances
  const tournamentMatchupView = new TournamentMatchupView();
  const bracketView = new BracketView(document.getElementById("app") ?? document.body);
  let tournamentEngine: TournamentEngine | null = null;

  // Replay state
  let replayMatches: RecordedMatch[] | null = null;
  let replayIndex = 0;
  let replayUserPicks: RecordedMatch[] = [];
  let replayIgnored: Set<string> = new Set();

  /** Find the next replay index that doesn't involve an ignored entry. Returns -1 if none. */
  function nextValidReplayIndex(fromIndex: number): number {
    if (!replayMatches) return -1;
    for (let i = fromIndex; i < replayMatches.length; i++) {
      const m = replayMatches[i]!;
      if (!replayIgnored.has(m.entryA) && !replayIgnored.has(m.entryB)) return i;
    }
    return -1;
  }

  /** Filter replay matches to only those not involving ignored entries. */
  function nonIgnoredReplayMatches(): RecordedMatch[] {
    if (!replayMatches) return [];
    return replayMatches.filter(m => !replayIgnored.has(m.entryA) && !replayIgnored.has(m.entryB));
  }

  /** Count remaining valid (non-ignored) replay matches from current index onward. */
  function countRemainingValidMatches(): number {
    if (!replayMatches) return 0;
    let count = 0;
    for (let i = replayIndex; i < replayMatches.length; i++) {
      const m = replayMatches[i]!;
      if (!replayIgnored.has(m.entryA) && !replayIgnored.has(m.entryB)) count++;
    }
    return count;
  }

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

  // --- Helper: shorten a URL via CleanURI, fallback to original ---
  async function shortenUrl(url: string): Promise<string> {
    try {
      const res = await fetch("https://cleanuri.com/api/v1/shorten", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `url=${encodeURIComponent(url)}`,
      });
      if (!res.ok) return url;
      const data = await res.json() as { result_url?: string };
      return data.result_url ?? url;
    } catch {
      return url;
    }
  }

  // --- Helper: stop recording and show share modal ---
  async function stopRecordingAndShare(): Promise<void> {
    recording.stop();
    matchupScreenView.setRecording(false);
    const matches = recording.recordedMatches;
    if (matches.length === 0 || !gameState.selectedArenaId) return;

    const arena = entryDb.getArena(gameState.selectedArenaId);
    const arenaName = arena?.name ?? "Arena";
    const encoded = await RecordingSession.encode(gameState.selectedArenaId, matches);
    const longUrl = `${window.location.origin}${window.location.pathname}#/arena/${gameState.selectedArenaId}?replay=${encoded}`;
    const shareUrl = await shortenUrl(longUrl);

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

    const winnerElement = option === "a"
      ? matchupScreenView.getOptionAElement()
      : matchupScreenView.getOptionBElement();

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

    // Selection highlight
    if (winnerElement) {
      await animationController.playSelectionHighlight(winnerElement);
    }

    // --- Replay mode ---
    if (replayMatches) {
      replayIndex++;
      const nextIdx = nextValidReplayIndex(replayIndex);
      if (nextIdx === -1) {
        const validOriginals = nonIgnoredReplayMatches();
        const score = RecordingSession.jaccardSimilarity(validOriginals, replayUserPicks);
        const verdictText = RecordingSession.verdict(score);
        const arena = entryDb.getArena(gameState.selectedArenaId);
        const arenaName = arena?.name ?? "Arena";
        matchupScreenView.showReplayResult(score, verdictText, validOriginals, replayUserPicks, arenaName, () => {
          matchupScreenView.showRecordButton();
        });
        replayMatches = null;
        replayIndex = 0;
        replayUserPicks = [];
        replayIgnored = new Set();
        gameState.isTransitioning = false;
        return;
      }

      replayIndex = nextIdx;
      const arena = entryDb.getArena(gameState.selectedArenaId);
      if (!arena) { gameState.isTransitioning = false; return; }

      const nextReplay = replayMatches[replayIndex]!;
      const nextA = arena.entries.find(e => e.name === nextReplay.entryA);
      const nextB = arena.entries.find(e => e.name === nextReplay.entryB);
      if (!nextA || !nextB) { gameState.isTransitioning = false; return; }

      const validTotal = nonIgnoredReplayMatches().length;
      const validDone = replayUserPicks.length;

      gameState.currentMatchup = { optionA: nextA, optionB: nextB };
      await matchupScreenView.preloadEntries(nextA, nextB);
      matchupScreenView.render(arena.battleground, arena.name, nextA, nextB);
      wireGameplayLoop();
      matchupScreenView.setReplayProgress(validDone + 1, validTotal);
      gameState.isTransitioning = false;
      return;
    }

    // --- Normal + Recording mode: pick 2 fresh random entries and slide them in ---
    const freshMatchup = matchupEngine.pickInitialMatchup(gameState.selectedArenaId, gameState.ignoredEntries);
    if (!freshMatchup) {
      if (recording.active) {
        gameState.isTransitioning = false;
        await stopRecordingAndShare();
      } else {
        const arena = entryDb.getArena(gameState.selectedArenaId);
        matchupScreenView.showExhaustedMessage(`All matchups complete in ${arena?.name ?? "this arena"}!`);
        gameState.isTransitioning = false;
        setTimeout(() => router.navigate({ screen: "main" }), 2000);
      }
      return;
    }

    const arena = entryDb.getArena(gameState.selectedArenaId);
    if (!arena) { gameState.isTransitioning = false; return; }

    gameState.currentMatchup = freshMatchup;
    await matchupScreenView.preloadEntries(freshMatchup.optionA, freshMatchup.optionB);

    const { newA, newB } = matchupScreenView.swapMatchupEntries(freshMatchup.optionA, freshMatchup.optionB);
    wireGameplayLoop();
    await animationController.playSlideDownEntrance(newA, newB);
    matchupScreenView.cleanupOldOptions();

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

    // Ignore button — ban an entry and replace it
    matchupScreenView.onIgnore(async (side) => {
      if (gameState.isTransitioning || !gameState.currentMatchup || !gameState.selectedArenaId) return;

      const { optionA, optionB } = gameState.currentMatchup;
      const ignored = side === "a" ? optionA : optionB;

      gameState.ignoredEntries.add(ignored.name);

      // --- Replay mode: skip all matches involving the ignored entry ---
      if (replayMatches) {
        replayIgnored.add(ignored.name);

        const nextIdx = nextValidReplayIndex(replayIndex + 1);
        if (nextIdx === -1) {
          // No more valid matches — show verdict excluding ignored
          const validOriginals = nonIgnoredReplayMatches();
          const score = RecordingSession.jaccardSimilarity(validOriginals, replayUserPicks);
          const verdictText = RecordingSession.verdict(score);
          const arena = entryDb.getArena(gameState.selectedArenaId);
          const arenaName = arena?.name ?? "Arena";
          matchupScreenView.showReplayResult(score, verdictText, validOriginals, replayUserPicks, arenaName, () => {
            matchupScreenView.showRecordButton();
          });
          replayMatches = null;
          replayIndex = 0;
          replayUserPicks = [];
          replayIgnored = new Set();
          return;
        }

        replayIndex = nextIdx;
        const arena = entryDb.getArena(gameState.selectedArenaId);
        if (!arena) return;

        const nextReplay = replayMatches[replayIndex]!;
        const nextA = arena.entries.find(e => e.name === nextReplay.entryA);
        const nextB = arena.entries.find(e => e.name === nextReplay.entryB);
        if (!nextA || !nextB) return;

        const validTotal = nonIgnoredReplayMatches().length;
        const validDone = replayUserPicks.length;

        gameState.currentMatchup = { optionA: nextA, optionB: nextB };
        await matchupScreenView.preloadEntries(nextA, nextB);
        matchupScreenView.render(arena.battleground, arena.name, nextA, nextB);
        wireGameplayLoop();
        matchupScreenView.setReplayProgress(validDone + 1, validTotal);
        return;
      }

      // --- Normal mode ---
      const opponent = side === "a" ? optionB : optionA;

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

    // Record/Stop button — restarts a fresh recording session
    matchupScreenView.onRecord(async () => {
      if (!gameState.selectedArenaId) return;
      await startRecordingSession(gameState.selectedArenaId);
    });

    matchupScreenView.onStop(async () => {
      await stopRecordingAndShare();
    });

    // Update record button state if recording is active
    if (recording.active) {
      matchupScreenView.setRecording(true);
      matchupScreenView.updateBattleCount(recording.recordedMatches.length);
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
    replayIgnored = new Set();

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

  // --- Helper: start a fresh recording session for an arena ---
  async function startRecordingSession(arenaId: string): Promise<void> {
    const arena = entryDb.getArena(arenaId);
    if (!arena) return;

    history.clearArena(arenaId);
    await history.save();
    gameState.ignoredEntries.clear();
    gameState.currentScreen = "matchup";
    gameState.selectedArenaId = arenaId;

    recording.start();

    const matchup = matchupEngine.pickInitialMatchup(arenaId, gameState.ignoredEntries);
    if (!matchup) {
      matchupScreenView.showExhaustedMessage(`All matchups complete in ${arena.name}!`);
      return;
    }

    gameState.currentMatchup = matchup;
    await matchupScreenView.preloadEntries(matchup.optionA, matchup.optionB);
    matchupScreenView.render(arena.battleground, arena.name, matchup.optionA, matchup.optionB);
    wireGameplayLoop();
    matchupScreenView.setRecording(true);
    matchupScreenView.updateBattleCount(0);
  }

  // --- Tournament: start a new tournament (Task 9.2) ---
  async function startTournament(arenaId: string): Promise<void> {
    const arena = entryDb.getArena(arenaId);
    if (!arena) { router.navigate({ screen: "main" }); return; }

    const bracketSize = TournamentBracket.calcBracketSize(arena.entries.length);
    if (bracketSize === 0) {
      router.navigate({ screen: "main" });
      return;
    }

    const seeded = TournamentBracket.generateSeeding(arena.entries, bracketSize);
    const bracket = new TournamentBracket(seeded);

    gameState.currentScreen = "matchup";
    gameState.mode = "tournament";
    gameState.selectedArenaId = arenaId;
    gameState.tournament = {
      active: true,
      arenaId,
      bracket,
      currentRoundIndex: 0,
      currentMatchIndex: 0,
    };

    tournamentEngine = new TournamentEngine(entryDb, bracket);

    // Start recording (Task 9.6)
    recording.start();

    // Show first match
    const nextMatch = bracket.getNextMatch();
    if (!nextMatch) return;

    const match = bracket.rounds[nextMatch.roundIndex].matches[nextMatch.matchIndex];
    if (!match.entryA || !match.entryB) return;

    gameState.currentMatchup = { optionA: match.entryA, optionB: match.entryB };
    await tournamentMatchupView.getMatchupView().preloadEntries(match.entryA, match.entryB);
    tournamentMatchupView.render(arena.battleground, arena.name, match.entryA, match.entryB);

    const roundName = TournamentBracket.roundName(bracket.size, nextMatch.roundIndex);
    const totalMatches = bracket.rounds[nextMatch.roundIndex].matches.length;
    tournamentMatchupView.setRoundLabel(roundName, nextMatch.matchIndex + 1, totalMatches);
    tournamentMatchupView.updateMiniBracket(bracket.rounds, nextMatch.roundIndex, nextMatch.matchIndex);
    tournamentMatchupView.setReplacementEnabled(tournamentEngine.isFirstRound());

    wireTournamentGameplay();
  }

  // --- Tournament: wire gameplay callbacks (Task 9.3) ---
  function wireTournamentGameplay(): void {
    const matchupView = tournamentMatchupView.getMatchupView();

    matchupView.onOptionTap(async (option) => {
      await handleTournamentSelection(option);
    });

    matchupView.onHeaderClick(() => {
      router.navigate({ screen: "main" });
    });

    // Wire swipe
    const swipeHandler = matchupView.getSwipeHandler();
    swipeHandler.onSwipeUpdate((state) => {
      if (gameState.isTransitioning) return;
      matchupView.applyCurtainClip(state);
    });
    swipeHandler.onSwipeComplete((selected) => {
      if (gameState.isTransitioning) return;
      handleTournamentSelection(selected);
    });
    swipeHandler.onSwipeCancel(() => {
      matchupView.resetCurtain();
    });

    // Wire replace buttons (Task 9.4)
    tournamentMatchupView.onReplace(async (side) => {
      await handleTournamentReplace(side);
    });
  }

  // --- Tournament: handle match selection (Task 9.3) ---
  async function handleTournamentSelection(option: "a" | "b"): Promise<void> {
    if (gameState.isTransitioning || !gameState.currentMatchup || !gameState.selectedArenaId || !gameState.tournament) return;
    gameState.isTransitioning = true;

    const bracket = gameState.tournament.bracket as TournamentBracket;
    const { optionA, optionB } = gameState.currentMatchup;
    const winner = option === "a" ? optionA : optionB;

    const matchupView = tournamentMatchupView.getMatchupView();
    const winnerElement = option === "a" ? matchupView.getOptionAElement() : matchupView.getOptionBElement();

    // Record in recording session (Task 9.6)
    if (recording.active) {
      recording.addMatch(optionA.name, optionB.name, winner.name);
    }

    // Selection highlight
    if (winnerElement) {
      await animationController.playSelectionHighlight(winnerElement);
    }

    // Record result in bracket
    const currentRound = gameState.tournament.currentRoundIndex;
    const currentMatch = gameState.tournament.currentMatchIndex;
    const next = bracket.recordResult(currentRound, currentMatch, winner);

    if (next === null) {
      // Tournament complete
      gameState.isTransitioning = false;
      await completeTournament();
      return;
    }

    // Update tournament state
    gameState.tournament.currentRoundIndex = next.roundIndex;
    gameState.tournament.currentMatchIndex = next.matchIndex;

    // Show next match
    const nextMatchData = bracket.rounds[next.roundIndex].matches[next.matchIndex];
    if (!nextMatchData.entryA || !nextMatchData.entryB) {
      gameState.isTransitioning = false;
      return;
    }

    const arena = entryDb.getArena(gameState.selectedArenaId);
    if (!arena) { gameState.isTransitioning = false; return; }

    gameState.currentMatchup = { optionA: nextMatchData.entryA, optionB: nextMatchData.entryB };
    await matchupView.preloadEntries(nextMatchData.entryA, nextMatchData.entryB);
    tournamentMatchupView.render(arena.battleground, arena.name, nextMatchData.entryA, nextMatchData.entryB);

    const roundName = TournamentBracket.roundName(bracket.size, next.roundIndex);
    const totalMatches = bracket.rounds[next.roundIndex].matches.length;
    tournamentMatchupView.setRoundLabel(roundName, next.matchIndex + 1, totalMatches);
    tournamentMatchupView.updateMiniBracket(bracket.rounds, next.roundIndex, next.matchIndex);
    tournamentMatchupView.setReplacementEnabled(tournamentEngine?.isFirstRound() ?? false);

    wireTournamentGameplay();
    gameState.isTransitioning = false;
  }

  // --- Tournament: handle first-round replacement (Task 9.4) ---
  async function handleTournamentReplace(side: "a" | "b"): Promise<void> {
    if (!gameState.selectedArenaId || !gameState.tournament || !tournamentEngine) return;

    const bracket = gameState.tournament.bracket as TournamentBracket;
    const replacement = tournamentEngine.findReplacement(gameState.selectedArenaId);
    if (!replacement) return;

    const matchIndex = gameState.tournament.currentMatchIndex;
    bracket.replaceEntry(matchIndex, side, replacement);

    // Re-render current match
    const match = bracket.rounds[0].matches[matchIndex];
    if (!match.entryA || !match.entryB) return;

    const arena = entryDb.getArena(gameState.selectedArenaId);
    if (!arena) return;

    gameState.currentMatchup = { optionA: match.entryA, optionB: match.entryB };
    await tournamentMatchupView.getMatchupView().preloadEntries(match.entryA, match.entryB);
    tournamentMatchupView.render(arena.battleground, arena.name, match.entryA, match.entryB);

    const roundName = TournamentBracket.roundName(bracket.size, 0);
    const totalMatches = bracket.rounds[0].matches.length;
    tournamentMatchupView.setRoundLabel(roundName, matchIndex + 1, totalMatches);
    tournamentMatchupView.updateMiniBracket(bracket.rounds, 0, matchIndex);
    tournamentMatchupView.setReplacementEnabled(true);

    wireTournamentGameplay();
  }

  // --- Tournament: completion handler (Task 9.5) ---
  async function completeTournament(): Promise<void> {
    if (!gameState.tournament || !gameState.selectedArenaId) return;

    const bracket = gameState.tournament.bracket as TournamentBracket;
    const champion = bracket.getChampion();

    // Stop recording (Task 9.6)
    recording.stop();
    const serialized = bracket.serialize();
    serialized.arenaId = gameState.selectedArenaId;

    bracketView.show(bracket.rounds, champion);

    const tournamentPayload = JSON.stringify({
      a: gameState.selectedArenaId,
      t: { s: serialized.size, seed: serialized.seeding, r: serialized.results }
    });
    const encodedData = await encodeTournamentRecord(tournamentPayload);
    const shareUrl = `${window.location.origin}${window.location.pathname}#/tournament/${gameState.selectedArenaId}?replay=${encodedData}`;
    const arena = entryDb.getArena(gameState.selectedArenaId);
    const arenaName = arena?.name ?? "Arena";

    BracketSvgView.showModal(bracket.rounds, champion, {
      shareUrl,
      arenaName,
      onCopyLink: async () => {
        try {
          await navigator.clipboard.writeText(shareUrl);
          alert("Tournament link copied to clipboard!");
        } catch {
          prompt("Copy this link:", shareUrl);
        }
      },
      onDismiss: () => {
        BracketSvgView.hideModal();
        bracketView.hide();
        router.navigate({ screen: "main" });
      },
    });

    bracketView.onShare(async () => {
      try {
        await navigator.clipboard.writeText(shareUrl);
        alert("Tournament link copied to clipboard!");
      } catch {
        prompt("Copy this link:", shareUrl);
      }
    });

    bracketView.onDismiss(() => {
      bracketView.hide();
      router.navigate({ screen: "main" });
    });
  }

  // --- Tournament: encode/decode helpers (Task 9.6) ---
  async function encodeTournamentRecord(payload: string): Promise<string> {
    if (typeof CompressionStream !== "undefined") {
      try {
        const bytes = new TextEncoder().encode(payload);
        const cs = new CompressionStream("deflate-raw");
        const writer = cs.writable.getWriter();
        writer.write(bytes);
        writer.close();
        const reader = cs.readable.getReader();
        const chunks: Uint8Array[] = [];
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
        }
        const total = chunks.reduce((s, c) => s + c.length, 0);
        const compressed = new Uint8Array(total);
        let off = 0;
        for (const c of chunks) { compressed.set(c, off); off += c.length; }
        let binary = "";
        for (let i = 0; i < compressed.length; i++) binary += String.fromCharCode(compressed[i]!);
        return "1" + btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
      } catch { /* fall through */ }
    }
    return "0" + btoa(payload).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }

  async function decodeTournamentRecord(encoded: string): Promise<{ arenaId: string; size: number; seeding: string[]; results: (string | null)[] }> {
    const flag = encoded[0];
    const data = encoded.slice(1);
    let json: string;
    if (flag === "1" && typeof DecompressionStream !== "undefined") {
      const padded = data.replace(/-/g, "+").replace(/_/g, "/");
      const binary = atob(padded);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const ds = new DecompressionStream("deflate-raw");
      const writer = ds.writable.getWriter();
      writer.write(bytes);
      writer.close();
      const reader = ds.readable.getReader();
      const chunks: Uint8Array[] = [];
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }
      const total = chunks.reduce((s, c) => s + c.length, 0);
      const decompressed = new Uint8Array(total);
      let off = 0;
      for (const c of chunks) { decompressed.set(c, off); off += c.length; }
      json = new TextDecoder().decode(decompressed);
    } else {
      const padded = data.replace(/-/g, "+").replace(/_/g, "/");
      json = atob(padded);
    }
    const parsed = JSON.parse(json) as { a: string; t: { s: number; seed: string[]; r: (string | null)[] } };
    return { arenaId: parsed.a, size: parsed.t.s, seeding: parsed.t.seed, results: parsed.t.r };
  }

  // --- Tournament: replay from shared URL (Task 9.7) ---
  async function startTournamentReplay(decoded: { arenaId: string; size: number; seeding: string[]; results: (string | null)[] }): Promise<void> {
    const arena = entryDb.getArena(decoded.arenaId);
    if (!arena) { router.navigate({ screen: "main" }); return; }

    // Reconstruct seeded entries from arena
    const lookup = new Map(arena.entries.map(e => [e.name, e]));
    const seededEntries = decoded.seeding.map(name => lookup.get(name)).filter((e): e is NonNullable<typeof e> => e != null);
    if (seededEntries.length !== decoded.size) {
      console.error("Tournament replay: missing entries in arena");
      router.navigate({ screen: "main" });
      return;
    }

    const bracket = new TournamentBracket(seededEntries);

    gameState.currentScreen = "matchup";
    gameState.mode = "tournament";
    gameState.selectedArenaId = decoded.arenaId;
    gameState.tournament = {
      active: true,
      arenaId: decoded.arenaId,
      bracket,
      currentRoundIndex: 0,
      currentMatchIndex: 0,
    };

    tournamentEngine = new TournamentEngine(entryDb, bracket);
    recording.start();

    // Show first match
    const nextMatch = bracket.getNextMatch();
    if (!nextMatch) return;

    const match = bracket.rounds[nextMatch.roundIndex].matches[nextMatch.matchIndex];
    if (!match.entryA || !match.entryB) return;

    gameState.currentMatchup = { optionA: match.entryA, optionB: match.entryB };
    await tournamentMatchupView.getMatchupView().preloadEntries(match.entryA, match.entryB);
    tournamentMatchupView.render(arena.battleground, arena.name, match.entryA, match.entryB);

    const roundName = TournamentBracket.roundName(bracket.size, nextMatch.roundIndex);
    const totalMatches = bracket.rounds[nextMatch.roundIndex].matches.length;
    tournamentMatchupView.setRoundLabel(roundName, nextMatch.matchIndex + 1, totalMatches);
    tournamentMatchupView.updateMiniBracket(bracket.rounds, nextMatch.roundIndex, nextMatch.matchIndex);
    tournamentMatchupView.setReplacementEnabled(false);

    wireTournamentGameplay();
  }

  // --- Route change handler ---
  router.onRouteChange(async (route) => {
    // Reset replay state on any navigation
    replayMatches = null;
    replayIndex = 0;
    replayUserPicks = [];
    replayIgnored = new Set();

    if (route.screen === "main") {
      gameState.reset();
      bracketView.hide();
      mainPageView.render(entryDb.getAllArenas());
    } else if (route.screen === "matchup" && route.arenaId) {
      if (route.mode === "tournament") {
        // Tournament mode (Task 9.7)
        if (route.replayData) {
          try {
            const decoded = await decodeTournamentRecord(route.replayData);
            await startTournamentReplay(decoded);
          } catch (e) {
            console.error("Failed to decode tournament replay:", e);
            router.navigate({ screen: "main" });
          }
        } else {
          await startTournament(route.arenaId);
        }
      } else {
        // Existing battle mode handling
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

        await startRecordingSession(route.arenaId);
      }
    }
  });

  // --- Wire mode toggle → update gameState.mode (Task 9.1) ---
  mainPageView.onModeChange((mode) => {
    gameState.mode = mode;
  });

  // --- Wire arena selection → navigate to matchup screen ---
  mainPageView.onArenaSelect((arenaId) => {
    if (mainPageView.getMode() === "tournament") {
      router.navigate({ screen: "matchup", arenaId, mode: "tournament" });
    } else {
      router.navigate({ screen: "matchup", arenaId });
    }
  });

  // --- Render initial route ---
  const initialRoute = router.getCurrentRoute();
  if (initialRoute.screen === "matchup" && initialRoute.arenaId) {
    if (initialRoute.mode === "tournament") {
      // Tournament initial route (Task 9.7)
      if (initialRoute.replayData) {
        try {
          const decoded = await decodeTournamentRecord(initialRoute.replayData);
          await startTournamentReplay(decoded);
        } catch (e) {
          console.error("Failed to decode tournament replay:", e);
          router.navigate({ screen: "main" });
        }
      } else {
        await startTournament(initialRoute.arenaId);
      }
    } else {
      // Existing battle mode initial route
      if (initialRoute.replayData) {
        try {
          const decoded = await RecordingSession.decode(initialRoute.replayData);
          await startReplay(decoded.arenaId, decoded.matches);
        } catch (e) {
          console.error("Failed to decode replay data:", e);
          router.navigate({ screen: "main" });
        }
      } else {
        await startRecordingSession(initialRoute.arenaId);
      }
    }
  } else {
    mainPageView.render(entryDb.getAllArenas());
  }
}

main().catch((err) => {
  console.error("Failed to initialize application:", err);
});
