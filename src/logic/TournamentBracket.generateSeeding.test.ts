import { describe, it, expect } from "vitest";
import { TournamentBracket } from "./TournamentBracket.js";
import type { Entry } from "../types/index.js";

function makeEntries(count: number): Entry[] {
  return Array.from({ length: count }, (_, i) => ({
    name: `Entry ${i}`,
    imageUrl: `https://example.com/${i}.jpg`,
  }));
}

describe("TournamentBracket.generateSeeding", () => {
  it("returns exactly bracketSize entries", () => {
    const entries = makeEntries(10);
    const seeded = TournamentBracket.generateSeeding(entries, 8);
    expect(seeded).toHaveLength(8);
  });

  it("returns all distinct entries", () => {
    const entries = makeEntries(20);
    const seeded = TournamentBracket.generateSeeding(entries, 16);
    const names = seeded.map((e) => e.name);
    expect(new Set(names).size).toBe(16);
  });

  it("all returned entries come from the original arena", () => {
    const entries = makeEntries(10);
    const seeded = TournamentBracket.generateSeeding(entries, 4);
    for (const s of seeded) {
      expect(entries).toContainEqual(s);
    }
  });

  it("does not mutate the original array", () => {
    const entries = makeEntries(8);
    const original = [...entries];
    TournamentBracket.generateSeeding(entries, 4);
    expect(entries).toEqual(original);
  });

  it("works when bracketSize equals arenaEntries length", () => {
    const entries = makeEntries(4);
    const seeded = TournamentBracket.generateSeeding(entries, 4);
    expect(seeded).toHaveLength(4);
    const names = seeded.map((e) => e.name);
    expect(new Set(names).size).toBe(4);
  });

  it("works with bracketSize of 2", () => {
    const entries = makeEntries(5);
    const seeded = TournamentBracket.generateSeeding(entries, 2);
    expect(seeded).toHaveLength(2);
    expect(seeded[0].name).not.toBe(seeded[1].name);
  });
});
