import type {
  Entry,
  TournamentMatch,
  TournamentRound,
  SerializedBracket,
} from "../types/index.js";

const MAX_BRACKET_SIZE = 16;

export class TournamentBracket {
  readonly rounds: TournamentRound[];
  readonly size: number;

  constructor(entries: Entry[]) {
    this.size = entries.length;
    this.rounds = [];

    const totalRounds = Math.log2(this.size);

    for (let r = 0; r < totalRounds; r++) {
      const matchCount = this.size / Math.pow(2, r + 1);
      const name = TournamentBracket.roundName(this.size, r);
      const matches: TournamentMatch[] = [];

      for (let m = 0; m < matchCount; m++) {
        if (r === 0) {
          // First round: pair seeded entries
          matches.push({
            matchIndex: m,
            entryA: entries[m * 2],
            entryB: entries[m * 2 + 1],
            winner: null,
          });
        } else {
          // Subsequent rounds: empty matches (TBD)
          matches.push({
            matchIndex: m,
            entryA: null,
            entryB: null,
            winner: null,
          });
        }
      }

      this.rounds.push({ name, matches });
    }
  }

  /**
   * Calculate the largest power of 2 ≤ count, capped at MAX_BRACKET_SIZE.
   * Returns 0 for count < 2.
   */
  static calcBracketSize(entryCount: number): number {
    if (entryCount < 2) return 0;

    // Largest power of 2 ≤ entryCount
    let size = 1;
    while (size * 2 <= entryCount) {
      size *= 2;
    }

    // Cap at MAX_BRACKET_SIZE
    return Math.min(size, MAX_BRACKET_SIZE);
  }

  /**
     * Get the round name for a given bracket size and round index.
     * Round index is 0-based from the first round.
     *
     * For a bracket of size B, round i has B / 2^i entries.
     * - If entries == 2 and it's the last round → "Finals"
     * - If entries == 2 and it's the penultimate round → "Semi-Finals"
     * - Otherwise → "Rd{entries}"
     *
     * Special case: bracket size 2 has only "Finals".
     */
    static roundName(bracketSize: number, roundIndex: number): string {
      const totalRounds = Math.log2(bracketSize);
      const entriesInRound = bracketSize / Math.pow(2, roundIndex);

      // Last round is always Finals
      if (roundIndex === totalRounds - 1) {
        return "Finals";
      }

      // Penultimate round with 2 entries remaining per match pair → Semi-Finals
      // This happens when entriesInRound === 4 (2 matches of 2 entries each)
      // but more precisely: the round before Finals
      if (roundIndex === totalRounds - 2) {
        return "Semi-Finals";
      }

      return `Rd${entriesInRound}`;
    }

  static generateSeeding(
      arenaEntries: Entry[],
      bracketSize: number,
    ): Entry[] {
      // Copy the array to avoid mutating the original
      const pool = [...arenaEntries];

      // Fisher-Yates shuffle on the copy
      for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
      }

      // Take the first bracketSize entries
      return pool.slice(0, bracketSize);
    }

  recordResult(
      roundIndex: number,
      matchIndex: number,
      winner: Entry,
    ): { roundIndex: number; matchIndex: number } | null {
      // 1. Record the winner on the match
      const match = this.rounds[roundIndex].matches[matchIndex];
      match.winner = winner;

      // 2. Advance the winner to the next round (if there is one)
      if (roundIndex + 1 < this.rounds.length) {
        const nextMatchIndex = Math.floor(matchIndex / 2);
        const nextMatch = this.rounds[roundIndex + 1].matches[nextMatchIndex];
        if (matchIndex % 2 === 0) {
          nextMatch.entryA = winner;
        } else {
          nextMatch.entryB = winner;
        }
      }

      // 3. Return the next match pointer
      const currentRoundMatches = this.rounds[roundIndex].matches;

      // More matches in the current round?
      if (matchIndex + 1 < currentRoundMatches.length) {
        return { roundIndex, matchIndex: matchIndex + 1 };
      }

      // Current round done — more rounds to play?
      if (roundIndex + 1 < this.rounds.length) {
        return { roundIndex: roundIndex + 1, matchIndex: 0 };
      }

      // Last match of the last round — tournament complete
      return null;
    }

  replaceEntry(
      matchIndex: number,
      side: "a" | "b",
      newEntry: Entry,
    ): void {
      const match = this.rounds[0].matches[matchIndex];
      if (side === "a") {
        match.entryA = newEntry;
      } else {
        match.entryB = newEntry;
      }
    }

  getCurrentRoundIndex(): number {
    for (let i = 0; i < this.rounds.length; i++) {
      if (this.rounds[i].matches.some((m) => m.winner === null)) {
        return i;
      }
    }
    // All rounds complete — return last round index
    return this.rounds.length - 1;
  }

  getNextMatch(): { roundIndex: number; matchIndex: number } | null {
    for (let r = 0; r < this.rounds.length; r++) {
      for (const match of this.rounds[r].matches) {
        if (
          match.entryA !== null &&
          match.entryB !== null &&
          match.winner === null
        ) {
          return { roundIndex: r, matchIndex: match.matchIndex };
        }
      }
    }
    return null;
  }

  getChampion(): Entry | null {
    const lastRound = this.rounds[this.rounds.length - 1];
    const finalsMatch = lastRound.matches[lastRound.matches.length - 1];
    return finalsMatch.winner;
  }

  isComplete(): boolean {
    return this.rounds.every((round) =>
      round.matches.every((match) => match.winner !== null),
    );
  }

  getAllEntries(): Entry[] {
    const entries: Entry[] = [];
    for (const match of this.rounds[0].matches) {
      if (match.entryA !== null) entries.push(match.entryA);
      if (match.entryB !== null) entries.push(match.entryB);
    }
    return entries;
  }

  serialize(): SerializedBracket {
      const seeding: string[] = [];
      for (const match of this.rounds[0].matches) {
        seeding.push(match.entryA!.name);
        seeding.push(match.entryB!.name);
      }

      const results: (string | null)[] = [];
      for (const round of this.rounds) {
        for (const match of round.matches) {
          results.push(match.winner?.name ?? null);
        }
      }

      return {
        arenaId: "",
        size: this.size,
        seeding,
        results,
      };
    }

  static deserialize(
      data: SerializedBracket,
      arenaEntries: Entry[],
    ): TournamentBracket {
      const lookup = new Map<string, Entry>();
      for (const entry of arenaEntries) {
        lookup.set(entry.name, entry);
      }

      const seededEntries: Entry[] = data.seeding.map((name) => lookup.get(name)!);
      const bracket = new TournamentBracket(seededEntries);

      // Flatten all matches across rounds in order
      const allMatches: { roundIndex: number; match: TournamentMatch }[] = [];
      for (let r = 0; r < bracket.rounds.length; r++) {
        for (const match of bracket.rounds[r].matches) {
          allMatches.push({ roundIndex: r, match });
        }
      }

      // Replay results
      for (let i = 0; i < data.results.length; i++) {
        const winnerName = data.results[i];
        if (winnerName !== null) {
          const winnerEntry = lookup.get(winnerName)!;
          const { roundIndex, match } = allMatches[i];
          bracket.recordResult(roundIndex, match.matchIndex, winnerEntry);
        }
      }

      return bracket;
    }
}
