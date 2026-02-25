import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { TournamentBracket } from "./TournamentBracket.js";
import { TournamentEngine } from "./TournamentEngine.js";
import type { Entry } from "../types/index.js";
import type { EntryDatabase } from "../state/EntryDatabase.js";

// ── Helpers ──────────────────────────────────────────────────────────

function makeEntries(n: number): Entry[] {
  return Array.from({ length: n }, (_, i) => ({
    name: `Entry${i}`,
    imageUrl: `https://img.test/${i}.png`,
  }));
}

function mockEntryDb(arenaEntries: Entry[]): EntryDatabase {
  return {
    getEntries: (_arenaId: string) => arenaEntries,
  } as unknown as EntryDatabase;
}

/** Play through every match in a given round, picking entryA as winner. */
function playRound(bracket: TournamentBracket, roundIndex: number): void {
  for (const match of bracket.rounds[roundIndex].matches) {
    if (match.entryA && match.entryB && match.winner === null) {
      bracket.recordResult(roundIndex, match.matchIndex, match.entryA);
    }
  }
}

// ── Property-Based Tests ─────────────────────────────────────────────

describe("Feature: tournament-mode, Property 7: Replacement is restricted to the first round", () => {
  it("**Validates: Requirements 5.1, 5.5**", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(4, 8, 16, 32, 64),
        (bracketSize) => {
          const arenaEntries = makeEntries(bracketSize + 10);
          const seeded = arenaEntries.slice(0, bracketSize);
          const bracket = new TournamentBracket(seeded);
          const engine = new TournamentEngine(mockEntryDb(arenaEntries), bracket);
          const arenaId = "test-arena";

          // Fresh bracket: first round → replacements allowed
          expect(engine.isFirstRound()).toBe(true);
          expect(engine.canReplace(arenaId)).toBe(true);
          expect(engine.findReplacement(arenaId)).not.toBeNull();

          // Play through the entire first round
          playRound(bracket, 0);

          // After first round: getCurrentRoundIndex() > 0
          expect(bracket.getCurrentRoundIndex()).toBeGreaterThan(0);

          // Replacements must now be blocked
          expect(engine.isFirstRound()).toBe(false);
          expect(engine.canReplace(arenaId)).toBe(false);
          expect(engine.findReplacement(arenaId)).toBeNull();
        },
      ),
      { numRuns: 30 },
    );
  });
});


describe("Feature: tournament-mode, Property 8: Replacement produces a valid bracket entry (from arena, not in bracket, correct position)", () => {
  it("**Validates: Requirements 5.2, 5.4**", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(4, 8, 16, 32, 64),
        fc.constantFrom<"a" | "b">("a", "b"),
        (bracketSize, side) => {
          // Arena must have more entries than bracket size so replacements exist
          const arenaEntries = makeEntries(bracketSize + 10);
          const seeded = arenaEntries.slice(0, bracketSize);
          const bracket = new TournamentBracket(seeded);
          const engine = new TournamentEngine(mockEntryDb(arenaEntries), bracket);
          const arenaId = "test-arena";

          // Pick a match to replace in
          const matchIndex = 0;
          const originalEntry =
            side === "a"
              ? bracket.rounds[0].matches[matchIndex].entryA!
              : bracket.rounds[0].matches[matchIndex].entryB!;

          const bracketNamesBefore = new Set(
            bracket.getAllEntries().map((e) => e.name),
          );

          // Find a replacement
          const replacement = engine.findReplacement(arenaId);
          expect(replacement).not.toBeNull();

          // (a) Replacement is from the arena
          const arenaNames = new Set(arenaEntries.map((e) => e.name));
          expect(arenaNames.has(replacement!.name)).toBe(true);

          // (b) Replacement is NOT already in the bracket
          expect(bracketNamesBefore.has(replacement!.name)).toBe(false);

          // Perform the replacement
          bracket.replaceEntry(matchIndex, side, replacement!);

          // (c) After replacement, the new entry appears at the correct position
          const matchAfter = bracket.rounds[0].matches[matchIndex];
          if (side === "a") {
            expect(matchAfter.entryA!.name).toBe(replacement!.name);
          } else {
            expect(matchAfter.entryB!.name).toBe(replacement!.name);
          }

          // The old entry is no longer in the bracket
          const bracketNamesAfter = new Set(
            bracket.getAllEntries().map((e) => e.name),
          );
          expect(bracketNamesAfter.has(originalEntry.name)).toBe(false);
          expect(bracketNamesAfter.has(replacement!.name)).toBe(true);
        },
      ),
      { numRuns: 30 },
    );
  });
});
