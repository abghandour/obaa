import { describe, it, expect, beforeEach, vi } from "vitest";
import { BattleHistory } from "./BattleHistory";
import type { BattleResult } from "../types";

function makeResult(overrides: Partial<BattleResult> = {}): BattleResult {
  return {
    arenaId: "actors",
    entryA: "Brad Pitt",
    entryB: "Tom Hanks",
    winner: "Tom Hanks",
    timestamp: Date.now(),
    ...overrides,
  };
}

describe("BattleHistory", () => {
  let history: BattleHistory;

  beforeEach(() => {
    history = new BattleHistory();
    localStorage.clear();
  });

  describe("makePairKey", () => {
    it("sorts names alphabetically and joins with |", () => {
      expect(BattleHistory.makePairKey("Tom Hanks", "Brad Pitt")).toBe("Brad Pitt|Tom Hanks");
    });

    it("produces the same key regardless of argument order", () => {
      const key1 = BattleHistory.makePairKey("Alice", "Bob");
      const key2 = BattleHistory.makePairKey("Bob", "Alice");
      expect(key1).toBe(key2);
      expect(key1).toBe("Alice|Bob");
    });

    it("handles identical names", () => {
      expect(BattleHistory.makePairKey("Same", "Same")).toBe("Same|Same");
    });
  });

  describe("addResult / getResults", () => {
    it("stores and retrieves results", () => {
      const result = makeResult();
      history.addResult(result);
      expect(history.getResults()).toEqual([result]);
    });

    it("filters results by arenaId", () => {
      history.addResult(makeResult({ arenaId: "actors" }));
      history.addResult(makeResult({ arenaId: "bands" }));
      history.addResult(makeResult({ arenaId: "actors" }));

      expect(history.getResults("actors")).toHaveLength(2);
      expect(history.getResults("bands")).toHaveLength(1);
      expect(history.getResults("films")).toHaveLength(0);
    });

    it("returns all results when no arenaId is provided", () => {
      history.addResult(makeResult({ arenaId: "actors" }));
      history.addResult(makeResult({ arenaId: "bands" }));
      expect(history.getResults()).toHaveLength(2);
    });
  });

  describe("getPlayedPairs", () => {
    it("returns canonical pair keys for an arena", () => {
      history.addResult(makeResult({ arenaId: "actors", entryA: "Brad Pitt", entryB: "Tom Hanks" }));
      history.addResult(makeResult({ arenaId: "actors", entryA: "Al Pacino", entryB: "Tom Hanks" }));
      history.addResult(makeResult({ arenaId: "bands", entryA: "Beatles", entryB: "Queen" }));

      const pairs = history.getPlayedPairs("actors");
      expect(pairs.size).toBe(2);
      expect(pairs.has("Brad Pitt|Tom Hanks")).toBe(true);
      expect(pairs.has("Al Pacino|Tom Hanks")).toBe(true);
    });

    it("returns empty set for unknown arena", () => {
      expect(history.getPlayedPairs("unknown").size).toBe(0);
    });
  });

  describe("save / load", () => {
    it("persists and restores results via localStorage", async () => {
      const result = makeResult();
      history.addResult(result);
      await history.save();

      const loaded = new BattleHistory();
      await loaded.load();
      expect(loaded.getResults()).toEqual([result]);
    });

    it("loads empty when localStorage has no data", async () => {
      await history.load();
      expect(history.getResults()).toEqual([]);
    });

    it("handles corrupted localStorage gracefully", async () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      localStorage.setItem("battleHistory", "not-valid-data!!!");

      await history.load();
      expect(history.getResults()).toEqual([]);
      warnSpy.mockRestore();
    });
  });

  describe("clear", () => {
    it("empties results and removes from localStorage", async () => {
      history.addResult(makeResult());
      await history.save();

      history.clear();
      expect(history.getResults()).toEqual([]);
      expect(localStorage.getItem("battleHistory")).toBeNull();
    });
  });
});
