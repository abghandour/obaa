import type { Entry, BattleResult, MatchupPick } from "../types";
import { EntryDatabase } from "../state/EntryDatabase";
import { BattleHistory } from "../state/BattleHistory";

/**
 * Picks matchups, records results, and tracks pair exhaustion.
 * Uses BattleHistory to ensure no matchup pair is repeated within an arena.
 */
export class MatchupEngine {
  constructor(
    private entryDb: EntryDatabase,
    private history: BattleHistory,
  ) {}

  /**
   * Pick two entries that haven't been matched before in this arena.
   * Returns null if all pairs are exhausted.
   */
  pickInitialMatchup(arenaId: string, ignored?: Set<string>): MatchupPick | null {
    let entries = this.entryDb.getEntries(arenaId);
    if (ignored && ignored.size > 0) {
      entries = entries.filter(e => !ignored.has(e.name));
    }
    if (entries.length < 2) return null;

    const played = this.history.getPlayedPairs(arenaId);
    const unplayed = this.getUnplayedPairs(entries, played);
    if (unplayed.length === 0) return null;

    const [a, b] = unplayed[Math.floor(Math.random() * unplayed.length)];
    return { optionA: a, optionB: b };
  }

  /**
   * Pick a new contender for the winner, excluding already-played pairs.
   * Returns null if all pairs involving the winner are exhausted.
   */
  pickNextContender(arenaId: string, winner: Entry, ignored?: Set<string>): Entry | null {
    const entries = this.entryDb.getEntries(arenaId);
    const played = this.history.getPlayedPairs(arenaId);

    const candidates = entries.filter((e) => {
      if (e.name === winner.name) return false;
      if (ignored && ignored.has(e.name)) return false;
      const key = BattleHistory.makePairKey(winner.name, e.name);
      return !played.has(key);
    });

    if (candidates.length === 0) return null;
    return candidates[Math.floor(Math.random() * candidates.length)];
  }

  /**
   * Record a battle result with alphabetically ordered entryA/entryB.
   * Returns true if more matchups are available in the arena, false otherwise.
   */
  recordResult(
    arenaId: string,
    optionA: Entry,
    optionB: Entry,
    winner: Entry,
  ): boolean {
    const [entryA, entryB] =
      optionA.name < optionB.name
        ? [optionA.name, optionB.name]
        : [optionB.name, optionA.name];

    const result: BattleResult = {
      arenaId,
      entryA,
      entryB,
      winner: winner.name,
      timestamp: Date.now(),
    };

    this.history.addResult(result);
    return !this.isArenaExhausted(arenaId);
  }

  /** Check if a matchup pair already exists in history for the given arena. */
  isPairPlayed(arenaId: string, entryA: string, entryB: string): boolean {
    const key = BattleHistory.makePairKey(entryA, entryB);
    return this.history.getPlayedPairs(arenaId).has(key);
  }

  /** Check if all possible pairs in an arena have been played. */
  isArenaExhausted(arenaId: string): boolean {
    const n = this.entryDb.getEntries(arenaId).length;
    const totalPairs = (n * (n - 1)) / 2;
    const playedCount = this.history.getPlayedPairs(arenaId).size;
    return playedCount >= totalPairs;
  }

  /**
   * Find a replacement entry for an ignored entry, given the opponent that stays.
   * The replacement must not be ignored and must not have already battled the opponent.
   * Returns null if no valid replacement exists.
   */
  findReplacement(arenaId: string, opponent: Entry, ignored: Set<string>): Entry | null {
    const entries = this.entryDb.getEntries(arenaId);
    const played = this.history.getPlayedPairs(arenaId);

    const candidates = entries.filter((e) => {
      if (e.name === opponent.name) return false;
      if (ignored.has(e.name)) return false;
      const key = BattleHistory.makePairKey(opponent.name, e.name);
      return !played.has(key);
    });

    if (candidates.length === 0) return null;
    return candidates[Math.floor(Math.random() * candidates.length)];
  }

  /** Get all unplayed entry pairs for an arena. */
  private getUnplayedPairs(
    entries: Entry[],
    played: Set<string>,
  ): [Entry, Entry][] {
    const pairs: [Entry, Entry][] = [];
    for (let i = 0; i < entries.length; i++) {
      for (let j = i + 1; j < entries.length; j++) {
        const key = BattleHistory.makePairKey(entries[i].name, entries[j].name);
        if (!played.has(key)) {
          pairs.push([entries[i], entries[j]]);
        }
      }
    }
    return pairs;
  }
}
