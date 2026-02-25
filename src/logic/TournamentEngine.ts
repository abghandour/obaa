import type { Entry } from "../types/index.js";
import type { EntryDatabase } from "../state/EntryDatabase.js";
import type { TournamentBracket } from "./TournamentBracket.js";

export class TournamentEngine {
  constructor(
    private entryDb: EntryDatabase,
    private bracket: TournamentBracket,
  ) {}

  /** Whether we're still in the first round (replacements allowed). */
  isFirstRound(): boolean {
    return this.bracket.getCurrentRoundIndex() === 0;
  }

  /** Check if replacement is available for the current arena. */
  canReplace(arenaId: string): boolean {
    if (!this.isFirstRound()) return false;

    const arenaEntries = this.entryDb.getEntries(arenaId);
    const bracketEntryNames = new Set(
      this.bracket.getAllEntries().map((e) => e.name),
    );

    return arenaEntries.some((e) => !bracketEntryNames.has(e.name));
  }

  /** Find a replacement entry not already in the bracket. */
  findReplacement(arenaId: string): Entry | null {
    if (!this.canReplace(arenaId)) return null;

    const arenaEntries = this.entryDb.getEntries(arenaId);
    const bracketEntryNames = new Set(
      this.bracket.getAllEntries().map((e) => e.name),
    );

    const pool = arenaEntries.filter((e) => !bracketEntryNames.has(e.name));
    if (pool.length === 0) return null;

    return pool[Math.floor(Math.random() * pool.length)];
  }
}
