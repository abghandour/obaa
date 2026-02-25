import { describe, it, expect } from "vitest";
import { TournamentBracket } from "./TournamentBracket.js";
import type { Entry } from "../types/index.js";

function makeEntries(n: number): Entry[] {
  return Array.from({ length: n }, (_, i) => ({
    name: `Entry${i}`,
    imageUrl: `img${i}.png`,
  }));
}

describe("TournamentBracket.roundName", () => {
  it("size 2 → Finals", () => {
    expect(TournamentBracket.roundName(2, 0)).toBe("Finals");
  });

  it("size 4 → Semi-Finals, Finals", () => {
    expect(TournamentBracket.roundName(4, 0)).toBe("Semi-Finals");
    expect(TournamentBracket.roundName(4, 1)).toBe("Finals");
  });

  it("size 8 → Rd8, Semi-Finals, Finals", () => {
    expect(TournamentBracket.roundName(8, 0)).toBe("Rd8");
    expect(TournamentBracket.roundName(8, 1)).toBe("Semi-Finals");
    expect(TournamentBracket.roundName(8, 2)).toBe("Finals");
  });

  it("size 16 → Rd16, Rd8, Semi-Finals, Finals", () => {
    expect(TournamentBracket.roundName(16, 0)).toBe("Rd16");
    expect(TournamentBracket.roundName(16, 1)).toBe("Rd8");
    expect(TournamentBracket.roundName(16, 2)).toBe("Semi-Finals");
    expect(TournamentBracket.roundName(16, 3)).toBe("Finals");
  });

  it("size 32 → Rd32, Rd16, Rd8, Semi-Finals, Finals", () => {
    expect(TournamentBracket.roundName(32, 0)).toBe("Rd32");
    expect(TournamentBracket.roundName(32, 1)).toBe("Rd16");
    expect(TournamentBracket.roundName(32, 2)).toBe("Rd8");
    expect(TournamentBracket.roundName(32, 3)).toBe("Semi-Finals");
    expect(TournamentBracket.roundName(32, 4)).toBe("Finals");
  });

  it("size 64 → Rd64, Rd32, Rd16, Rd8, Semi-Finals, Finals", () => {
    expect(TournamentBracket.roundName(64, 0)).toBe("Rd64");
    expect(TournamentBracket.roundName(64, 1)).toBe("Rd32");
    expect(TournamentBracket.roundName(64, 2)).toBe("Rd16");
    expect(TournamentBracket.roundName(64, 3)).toBe("Rd8");
    expect(TournamentBracket.roundName(64, 4)).toBe("Semi-Finals");
    expect(TournamentBracket.roundName(64, 5)).toBe("Finals");
  });
});

describe("TournamentBracket constructor", () => {
  it("sets size from entries length", () => {
    const bracket = new TournamentBracket(makeEntries(8));
    expect(bracket.size).toBe(8);
  });

  it("creates correct number of rounds", () => {
    expect(new TournamentBracket(makeEntries(2)).rounds).toHaveLength(1);
    expect(new TournamentBracket(makeEntries(4)).rounds).toHaveLength(2);
    expect(new TournamentBracket(makeEntries(8)).rounds).toHaveLength(3);
    expect(new TournamentBracket(makeEntries(16)).rounds).toHaveLength(4);
    expect(new TournamentBracket(makeEntries(32)).rounds).toHaveLength(5);
    expect(new TournamentBracket(makeEntries(64)).rounds).toHaveLength(6);
  });

  it("first round pairs entries correctly for size 8", () => {
    const entries = makeEntries(8);
    const bracket = new TournamentBracket(entries);
    const r0 = bracket.rounds[0];
    expect(r0.name).toBe("Rd8");
    expect(r0.matches).toHaveLength(4);
    expect(r0.matches[0].entryA).toBe(entries[0]);
    expect(r0.matches[0].entryB).toBe(entries[1]);
    expect(r0.matches[1].entryA).toBe(entries[2]);
    expect(r0.matches[1].entryB).toBe(entries[3]);
    expect(r0.matches[3].entryA).toBe(entries[6]);
    expect(r0.matches[3].entryB).toBe(entries[7]);
  });

  it("subsequent rounds have null entries", () => {
    const bracket = new TournamentBracket(makeEntries(8));
    for (let r = 1; r < bracket.rounds.length; r++) {
      for (const match of bracket.rounds[r].matches) {
        expect(match.entryA).toBeNull();
        expect(match.entryB).toBeNull();
        expect(match.winner).toBeNull();
      }
    }
  });

  it("subsequent rounds have correct match counts", () => {
    const bracket = new TournamentBracket(makeEntries(16));
    expect(bracket.rounds[0].matches).toHaveLength(8); // Rd16
    expect(bracket.rounds[1].matches).toHaveLength(4); // Rd8
    expect(bracket.rounds[2].matches).toHaveLength(2); // Semi-Finals
    expect(bracket.rounds[3].matches).toHaveLength(1); // Finals
  });

  it("round names are correct for size 16", () => {
    const bracket = new TournamentBracket(makeEntries(16));
    expect(bracket.rounds.map((r) => r.name)).toEqual([
      "Rd16", "Rd8", "Semi-Finals", "Finals",
    ]);
  });

  it("bracket size 2 has single Finals round", () => {
    const entries = makeEntries(2);
    const bracket = new TournamentBracket(entries);
    expect(bracket.rounds).toHaveLength(1);
    expect(bracket.rounds[0].name).toBe("Finals");
    expect(bracket.rounds[0].matches).toHaveLength(1);
    expect(bracket.rounds[0].matches[0].entryA).toBe(entries[0]);
    expect(bracket.rounds[0].matches[0].entryB).toBe(entries[1]);
  });

  it("match indices are sequential within each round", () => {
    const bracket = new TournamentBracket(makeEntries(16));
    for (const round of bracket.rounds) {
      round.matches.forEach((match, i) => {
        expect(match.matchIndex).toBe(i);
      });
    }
  });
});
