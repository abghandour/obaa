import type { Entry, GameState as IGameState, TournamentState } from "../types/index";

/**
 * Mutable state container for the application's in-memory game state.
 * Not persisted — only BattleHistory survives page reloads.
 */
export class GameState implements IGameState {
  currentScreen: "main" | "matchup" = "main";
  mode: "battle" | "tournament" = "tournament";
  selectedArenaId: string | null = null;
  currentMatchup: { optionA: Entry; optionB: Entry } | null = null;
  winner: Entry | null = null;
  isTransitioning: boolean = false;
  ignoredEntries: Set<string> = new Set();
  tournament: TournamentState | null = null;

  /** Reset state back to defaults (main screen, nothing selected). */
  reset(): void {
    this.currentScreen = "main";
    this.mode = "tournament";
    this.selectedArenaId = null;
    this.currentMatchup = null;
    this.winner = null;
    this.isTransitioning = false;
    this.ignoredEntries = new Set();
    this.tournament = null;
  }
}
