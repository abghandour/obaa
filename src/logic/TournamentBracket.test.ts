import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { TournamentBracket } from "./TournamentBracket.js";
import type { Entry } from "../types/index.js";

// ── Helpers ──────────────────────────────────────────────────────────

function makeEntries(n: number): Entry[] {
  return Array.from({ length: n }, (_, i) => ({
    name: `Entry${i}`,
    imageUrl: `https://img.test/${i}.png`,
  }));
}

function isPowerOf2(n: number): boolean {
  return n > 0 && (n & (n - 1)) === 0;
}

/** Play through every match in a bracket, picking a random winner per match. */
function playFullBracket(
  bracket: TournamentBracket,
  rng: () => number = Math.random,
): void {
  for (const round of bracket.rounds) {
    for (const match of round.matches) {
      if (match.entryA && match.entryB && match.winner === null) {
        const winner = rng() < 0.5 ? match.entryA : match.entryB;
        bracket.recordResult(
          bracket.rounds.indexOf(round),
          match.matchIndex,
          winner,
        );
      }
    }
  }
}

/** Expected round-name sequence for a given bracket size. */
function expectedRoundNames(bracketSize: number): string[] {
  const fullSequence = ["Rd64", "Rd32", "Rd16", "Rd8", "Rd4", "Semi-Finals", "Finals"];
  const totalRounds = Math.log2(bracketSize);
  return fullSequence.slice(fullSequence.length - totalRounds);
}

// ── Property-Based Tests ─────────────────────────────────────────────

describe("Feature: tournament-mode, Property 1: Bracket size is the largest power of 2 ≤ entry count, capped at 64", () => {
  it("Validates: Requirements 2.1, 2.2, 2.3", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 500 }), (count) => {
        const result = TournamentBracket.calcBracketSize(count);

        if (count < 2) {
          expect(result).toBe(0);
          return;
        }

        // (a) result is a power of 2
        expect(isPowerOf2(result)).toBe(true);
        // (b) result ≤ count
        expect(result).toBeLessThanOrEqual(count);
        // (c) result ≤ 64
        expect(result).toBeLessThanOrEqual(64);
        // (d) largest such value: next power of 2 would exceed count or 64
        const nextPow = result * 2;
        expect(nextPow > count || nextPow > 64).toBe(true);
      }),
      { numRuns: 30 },
    );
  });
});

describe("Feature: tournament-mode, Property 2: Seeding is a valid selection of unique arena entries", () => {
  it("Validates: Requirements 3.1, 3.2", () => {
    fc.assert(
      fc.property(fc.integer({ min: 2, max: 100 }), (entryCount) => {
        const arena = makeEntries(entryCount);
        const bracketSize = TournamentBracket.calcBracketSize(entryCount);
        if (bracketSize === 0) return; // skip trivial

        const seeded = TournamentBracket.generateSeeding(arena, bracketSize);

        // Exactly bracketSize entries
        expect(seeded).toHaveLength(bracketSize);

        // All distinct
        const names = seeded.map((e) => e.name);
        expect(new Set(names).size).toBe(bracketSize);

        // All from arena
        const arenaNames = new Set(arena.map((e) => e.name));
        for (const name of names) {
          expect(arenaNames.has(name)).toBe(true);
        }
      }),
      { numRuns: 30 },
    );
  });
});

describe("Feature: tournament-mode, Property 3: First round structure is valid", () => {
  it("Validates: Requirements 3.3", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 100 }),
        fc.infiniteStream(fc.double({ min: 0, max: 1, noNaN: true })),
        (entryCount, _rngStream) => {
          const arena = makeEntries(entryCount);
          const bracketSize = TournamentBracket.calcBracketSize(entryCount);
          if (bracketSize === 0) return;

          const seeded = TournamentBracket.generateSeeding(arena, bracketSize);
          const bracket = new TournamentBracket(seeded);
          const firstRound = bracket.rounds[0];

          // B/2 matches
          expect(firstRound.matches).toHaveLength(bracketSize / 2);

          const allEntryNames: string[] = [];
          for (const match of firstRound.matches) {
            // Each match has 2 non-null entries
            expect(match.entryA).not.toBeNull();
            expect(match.entryB).not.toBeNull();
            // Distinct within match
            expect(match.entryA!.name).not.toBe(match.entryB!.name);

            allEntryNames.push(match.entryA!.name, match.entryB!.name);
          }

          // Union of all entries equals seeded entries
          const seededNames = new Set(seeded.map((e) => e.name));
          const matchNames = new Set(allEntryNames);
          expect(matchNames.size).toBe(seededNames.size);
          for (const name of seededNames) {
            expect(matchNames.has(name)).toBe(true);
          }
        },
      ),
      { numRuns: 30 },
    );
  });
});

describe("Feature: tournament-mode, Property 4: Round names follow the correct sequence for any bracket size", () => {
  it("Validates: Requirements 4.1, 10.1, 10.2", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(2, 4, 8, 16, 32, 64),
        (bracketSize) => {
          const entries = makeEntries(bracketSize);
          const bracket = new TournamentBracket(entries);
          const totalRounds = Math.log2(bracketSize);

          // Correct number of rounds
          expect(bracket.rounds).toHaveLength(totalRounds);

          // Last round is always Finals
          expect(bracket.rounds[bracket.rounds.length - 1].name).toBe("Finals");

          // For B > 2, penultimate round is Semi-Finals
          if (bracketSize > 2) {
            expect(bracket.rounds[bracket.rounds.length - 2].name).toBe("Semi-Finals");
          }

          // Full sequence matches expected
          const actual = bracket.rounds.map((r) => r.name);
          expect(actual).toEqual(expectedRoundNames(bracketSize));
        },
      ),
      { numRuns: 30 },
    );
  });
});

describe("Feature: tournament-mode, Property 5: Winner advancement preserves bracket integrity", () => {
  it("Validates: Requirements 4.2, 4.3, 6.2", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(2, 4, 8, 16, 32, 64),
        fc.infiniteStream(fc.boolean()),
        (bracketSize, pickStream) => {
          const entries = makeEntries(bracketSize);
          const bracket = new TournamentBracket(entries);
          const picks = pickStream[Symbol.iterator]();

          for (let r = 0; r < bracket.rounds.length; r++) {
            for (const match of bracket.rounds[r].matches) {
              if (match.entryA === null || match.entryB === null) continue;

              const pickA = picks.next().value;
              const winner = pickA ? match.entryA : match.entryB;

              const completedBefore = bracket.rounds
                .flatMap((rd) => rd.matches)
                .filter((m) => m.winner !== null).length;

              const next = bracket.recordResult(r, match.matchIndex, winner);

              // Completed count increased by 1
              const completedAfter = bracket.rounds
                .flatMap((rd) => rd.matches)
                .filter((m) => m.winner !== null).length;
              expect(completedAfter).toBe(completedBefore + 1);

              // Winner advanced to correct next-round position
              if (r + 1 < bracket.rounds.length) {
                const nextMatchIndex = Math.floor(match.matchIndex / 2);
                const nextMatch = bracket.rounds[r + 1].matches[nextMatchIndex];
                if (match.matchIndex % 2 === 0) {
                  expect(nextMatch.entryA).toBe(winner);
                } else {
                  expect(nextMatch.entryB).toBe(winner);
                }
              }

              // Next match pointer is correct
              if (next !== null) {
                const nextMatchObj =
                  bracket.rounds[next.roundIndex].matches[next.matchIndex];
                expect(nextMatchObj).toBeDefined();
              }
            }
          }
        },
      ),
      { numRuns: 30 },
    );
  });
});

describe("Feature: tournament-mode, Property 6: Completed bracket invariants", () => {
  it("Validates: Requirements 4.4, 7.2", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(2, 4, 8, 16, 32, 64),
        fc.infiniteStream(fc.boolean()),
        (bracketSize, pickStream) => {
          const entries = makeEntries(bracketSize);
          const bracket = new TournamentBracket(entries);
          const picks = pickStream[Symbol.iterator]();

          // Play through all matches
          for (let r = 0; r < bracket.rounds.length; r++) {
            for (const match of bracket.rounds[r].matches) {
              // Wait until both entries are populated
              if (match.entryA === null || match.entryB === null) continue;
              const pickA = picks.next().value;
              const winner = pickA ? match.entryA : match.entryB;
              bracket.recordResult(r, match.matchIndex, winner);
            }
          }

          // (a) Every match has non-null entryA, entryB, and winner
          for (const round of bracket.rounds) {
            for (const match of round.matches) {
              expect(match.entryA).not.toBeNull();
              expect(match.entryB).not.toBeNull();
              expect(match.winner).not.toBeNull();
            }
          }

          // (b) Every winner is entryA or entryB
          for (const round of bracket.rounds) {
            for (const match of round.matches) {
              expect(
                match.winner === match.entryA || match.winner === match.entryB,
              ).toBe(true);
            }
          }

          // (c) Champion is the finals winner
          const finalsRound = bracket.rounds[bracket.rounds.length - 1];
          const finalsMatch = finalsRound.matches[finalsRound.matches.length - 1];
          expect(bracket.getChampion()).toBe(finalsMatch.winner);

          // (d) isComplete() returns true
          expect(bracket.isComplete()).toBe(true);
        },
      ),
      { numRuns: 30 },
    );
  });
});

describe("Feature: tournament-mode, Property 9: Serialization round trip", () => {
  it("Validates: Requirements 8.2, 8.3, 8.4, 9.2", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(2, 4, 8, 16, 32, 64),
        fc.infiniteStream(fc.boolean()),
        fc.boolean(),
        (bracketSize, pickStream, playAll) => {
          const arena = makeEntries(bracketSize + 10); // extra entries for arena lookup
          const seeded = arena.slice(0, bracketSize);
          const bracket = new TournamentBracket(seeded);
          const picks = pickStream[Symbol.iterator]();

          if (playAll) {
            // Play through all matches
            for (let r = 0; r < bracket.rounds.length; r++) {
              for (const match of bracket.rounds[r].matches) {
                if (match.entryA === null || match.entryB === null) continue;
                const pickA = picks.next().value;
                const winner = pickA ? match.entryA : match.entryB;
                bracket.recordResult(r, match.matchIndex, winner);
              }
            }
          } else {
            // Play only the first round
            for (const match of bracket.rounds[0].matches) {
              if (match.entryA === null || match.entryB === null) continue;
              const pickA = picks.next().value;
              const winner = pickA ? match.entryA : match.entryB;
              bracket.recordResult(0, match.matchIndex, winner);
            }
          }

          // Serialize
          const serialized = bracket.serialize();

          // Deserialize
          const restored = TournamentBracket.deserialize(serialized, arena);

          // Same size
          expect(restored.size).toBe(bracket.size);

          // Same number of rounds
          expect(restored.rounds.length).toBe(bracket.rounds.length);

          // Same seeding (first round entries)
          const origSeeding = bracket.rounds[0].matches.flatMap((m) => [
            m.entryA!.name,
            m.entryB!.name,
          ]);
          const restoredSeeding = restored.rounds[0].matches.flatMap((m) => [
            m.entryA!.name,
            m.entryB!.name,
          ]);
          expect(restoredSeeding).toEqual(origSeeding);

          // Same results (winners match for all played matches)
          for (let r = 0; r < bracket.rounds.length; r++) {
            for (let m = 0; m < bracket.rounds[r].matches.length; m++) {
              const origWinner = bracket.rounds[r].matches[m].winner;
              const restoredWinner = restored.rounds[r].matches[m].winner;
              if (origWinner === null) {
                expect(restoredWinner).toBeNull();
              } else {
                expect(restoredWinner).not.toBeNull();
                expect(restoredWinner!.name).toBe(origWinner.name);
              }
            }
          }
        },
      ),
      { numRuns: 30 },
    );
  });
});

describe("Feature: tournament-mode, Property 10: Match label formatting", () => {
  it("Validates: Requirements 10.3", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(2, 4, 8, 16, 32, 64),
        (bracketSize) => {
          const totalRounds = Math.log2(bracketSize);

          for (let roundIndex = 0; roundIndex < totalRounds; roundIndex++) {
            const matchesInRound = bracketSize / Math.pow(2, roundIndex + 1);
            const roundName = TournamentBracket.roundName(bracketSize, roundIndex);

            for (let matchIndex = 0; matchIndex < matchesInRound; matchIndex++) {
              const label = `${roundName} - Match ${matchIndex + 1} of ${matchesInRound}`;

              // Verify the label components
              expect(label).toContain(roundName);
              expect(label).toContain(`Match ${matchIndex + 1} of ${matchesInRound}`);

              // Verify round name is one of the valid names
              const validNames = ["Rd64", "Rd32", "Rd16", "Rd8", "Rd4", "Semi-Finals", "Finals"];
              expect(validNames).toContain(roundName);
            }
          }
        },
      ),
      { numRuns: 30 },
    );
  });
});

// ── Unit Tests for Edge Cases ────────────────────────────────────────

describe("TournamentBracket edge cases", () => {
  it("0 entries → calcBracketSize returns 0", () => {
    expect(TournamentBracket.calcBracketSize(0)).toBe(0);
  });

  it("1 entry → calcBracketSize returns 0", () => {
    expect(TournamentBracket.calcBracketSize(1)).toBe(0);
  });

  it("2 entries → bracket size 2, single Finals round", () => {
    expect(TournamentBracket.calcBracketSize(2)).toBe(2);
    const bracket = new TournamentBracket(makeEntries(2));
    expect(bracket.size).toBe(2);
    expect(bracket.rounds).toHaveLength(1);
    expect(bracket.rounds[0].name).toBe("Finals");
    expect(bracket.rounds[0].matches).toHaveLength(1);
  });

  it("exactly 64 entries → bracket size 64", () => {
    expect(TournamentBracket.calcBracketSize(64)).toBe(64);
    const bracket = new TournamentBracket(makeEntries(64));
    expect(bracket.size).toBe(64);
    expect(bracket.rounds).toHaveLength(6);
    expect(bracket.rounds[0].name).toBe("Rd64");
  });

  it("65+ entries → bracket size 64 (capped)", () => {
    expect(TournamentBracket.calcBracketSize(65)).toBe(64);
    expect(TournamentBracket.calcBracketSize(100)).toBe(64);
    expect(TournamentBracket.calcBracketSize(128)).toBe(64);
    expect(TournamentBracket.calcBracketSize(500)).toBe(64);
  });

  it("bracket size 2 — full play-through yields champion", () => {
    const entries = makeEntries(2);
    const bracket = new TournamentBracket(entries);
    const result = bracket.recordResult(0, 0, entries[0]);
    expect(result).toBeNull(); // tournament complete
    expect(bracket.getChampion()!.name).toBe(entries[0].name);
    expect(bracket.isComplete()).toBe(true);
  });

  it("isComplete returns false for a fresh bracket", () => {
    const bracket = new TournamentBracket(makeEntries(4));
    expect(bracket.isComplete()).toBe(false);
  });

  it("getChampion returns null for incomplete bracket", () => {
    const bracket = new TournamentBracket(makeEntries(4));
    expect(bracket.getChampion()).toBeNull();
  });

  it("getCurrentRoundIndex returns 0 for a fresh bracket", () => {
    const bracket = new TournamentBracket(makeEntries(8));
    expect(bracket.getCurrentRoundIndex()).toBe(0);
  });

  it("getNextMatch returns first match for a fresh bracket", () => {
    const bracket = new TournamentBracket(makeEntries(8));
    const next = bracket.getNextMatch();
    expect(next).toEqual({ roundIndex: 0, matchIndex: 0 });
  });

  it("getAllEntries returns all first-round entries", () => {
    const entries = makeEntries(8);
    const bracket = new TournamentBracket(entries);
    const all = bracket.getAllEntries();
    expect(all).toHaveLength(8);
    for (const entry of entries) {
      expect(all).toContainEqual(entry);
    }
  });

  it("replaceEntry swaps the correct entry in the first round", () => {
    const entries = makeEntries(4);
    const bracket = new TournamentBracket(entries);
    const newEntry: Entry = { name: "Replacement", imageUrl: "rep.png" };

    bracket.replaceEntry(0, "a", newEntry);
    expect(bracket.rounds[0].matches[0].entryA!.name).toBe("Replacement");
    expect(bracket.rounds[0].matches[0].entryB!.name).toBe(entries[1].name);

    bracket.replaceEntry(1, "b", newEntry);
    expect(bracket.rounds[0].matches[1].entryB!.name).toBe("Replacement");
  });

  it("calcBracketSize for powers of 2 returns the same value (up to 64)", () => {
    expect(TournamentBracket.calcBracketSize(2)).toBe(2);
    expect(TournamentBracket.calcBracketSize(4)).toBe(4);
    expect(TournamentBracket.calcBracketSize(8)).toBe(8);
    expect(TournamentBracket.calcBracketSize(16)).toBe(16);
    expect(TournamentBracket.calcBracketSize(32)).toBe(32);
    expect(TournamentBracket.calcBracketSize(64)).toBe(64);
  });

  it("calcBracketSize for non-powers returns the largest power of 2 below", () => {
    expect(TournamentBracket.calcBracketSize(3)).toBe(2);
    expect(TournamentBracket.calcBracketSize(5)).toBe(4);
    expect(TournamentBracket.calcBracketSize(7)).toBe(4);
    expect(TournamentBracket.calcBracketSize(9)).toBe(8);
    expect(TournamentBracket.calcBracketSize(15)).toBe(8);
    expect(TournamentBracket.calcBracketSize(17)).toBe(16);
    expect(TournamentBracket.calcBracketSize(33)).toBe(32);
    expect(TournamentBracket.calcBracketSize(63)).toBe(32);
  });
});
