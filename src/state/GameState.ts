import type { Entry, GameState as IGameState } from "../types/index";

/**
 * Mutable state container for the application's in-memory game state.
 * Not persisted — only BattleHistory survives page reloads.
 */
export class GameState implements IGameState {
  currentScreen: "main" | "matchup" = "main";
  selectedArenaId: string | null = null;
  currentMatchup: { optionA: Entry; optionB: Entry } | null = null;
  winner: Entry | null = null;
  isTransitioning: boolean = false;
  ignoredEntries: Set<string> = new Set();

  /** Reset state back to defaults (main screen, nothing selected). */
  reset(): void {
    this.currentScreen = "main";
    this.selectedArenaId = null;
    this.currentMatchup = null;
    this.winner = null;
    this.isTransitioning = false;
    this.ignoredEntries = new Set();
  }
}
