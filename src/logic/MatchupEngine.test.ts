import { describe, it, expect, beforeEach } from "vitest";
import { MatchupEngine } from "./MatchupEngine";
import { EntryDatabase } from "../state/EntryDatabase";
import { BattleHistory } from "../state/BattleHistory";
import type { Entry } from "../types";

describe("MatchupEngine", () => {
  let db: EntryDatabase;
  let history: BattleHistory;
  let engine: MatchupEngine;

  beforeEach(() => {
    db = new EntryDatabase();
    history = new BattleHistory();
    engine = new MatchupEngine(db, history);
  });

  describe("pickInitialMatchup", () => {
    it("returns a matchup with two different entries from the arena", () => {
      const pick = engine.pickInitialMatchup("albums");
      expect(pick).not.toBeNull();
      const entries = db.getEntries("albums");
      const names = entries.map((e) => e.name);
      expect(names).toContain(pick!.optionA.name);
      expect(names).toContain(pick!.optionB.name);
      expect(pick!.optionA.name).not.toBe(pick!.optionB.name);
    });

    it("returns null for a non-existent arena", () => {
      expect(engine.pickInitialMatchup("nonexistent")).toBeNull();
    });

    it("returns null when all pairs are exhausted", () => {
      const entries = db.getEntries("albums");
      // Play all pairs
      for (let i = 0; i < entries.length; i++) {
        for (let j = i + 1; j < entries.length; j++) {
          engine.recordResult("albums", entries[i], entries[j], entries[i]);
        }
      }
      expect(engine.pickInitialMatchup("albums")).toBeNull();
    });
  });

  describe("pickNextContender", () => {
    it("returns an entry different from the winner", () => {
      const entries = db.getEntries("albums");
      const winner = entries[0];
      const contender = engine.pickNextContender("albums", winner);
      expect(contender).not.toBeNull();
      expect(contender!.name).not.toBe(winner.name);
    });

    it("excludes entries that form already-played pairs with the winner", () => {
      const entries = db.getEntries("albums");
      const winner = entries[0];
      // Play winner vs entries[1]
      engine.recordResult("albums", winner, entries[1], winner);
      // Pick contender many times — should never be entries[1]
      for (let i = 0; i < 20; i++) {
        const contender = engine.pickNextContender("albums", winner);
        if (contender) {
          expect(contender.name).not.toBe(entries[1].name);
        }
      }
    });

    it("returns null when all pairs for the winner are exhausted", () => {
      const entries = db.getEntries("albums");
      const winner = entries[0];
      for (let i = 1; i < entries.length; i++) {
        engine.recordResult("albums", winner, entries[i], winner);
      }
      expect(engine.pickNextContender("albums", winner)).toBeNull();
    });
  });

  describe("recordResult", () => {
    it("stores the result with alphabetically ordered entry names", () => {
      const a: Entry = { name: "Zebra", imageUrl: "" };
      const b: Entry = { name: "Apple", imageUrl: "" };
      engine.recordResult("albums", a, b, a);
      const results = history.getResults("albums");
      expect(results).toHaveLength(1);
      expect(results[0].entryA).toBe("Apple");
      expect(results[0].entryB).toBe("Zebra");
      expect(results[0].winner).toBe("Zebra");
    });

    it("returns true when more matchups are available", () => {
      const entries = db.getEntries("albums");
      const hasMore = engine.recordResult("albums", entries[0], entries[1], entries[0]);
      expect(hasMore).toBe(true);
    });

    it("returns false when arena is exhausted after recording", () => {
      const entries = db.getEntries("albums");
      // Play all pairs except the last one
      let lastA: Entry | null = null;
      let lastB: Entry | null = null;
      for (let i = 0; i < entries.length; i++) {
        for (let j = i + 1; j < entries.length; j++) {
          if (i === entries.length - 2 && j === entries.length - 1) {
            lastA = entries[i];
            lastB = entries[j];
            continue;
          }
          engine.recordResult("albums", entries[i], entries[j], entries[i]);
        }
      }
      // The last pair should exhaust the arena
      const hasMore = engine.recordResult("albums", lastA!, lastB!, lastA!);
      expect(hasMore).toBe(false);
    });
  });

  describe("isPairPlayed", () => {
    it("returns false for an unplayed pair", () => {
      expect(engine.isPairPlayed("albums", "A", "B")).toBe(false);
    });

    it("returns true after recording a result for that pair", () => {
      const entries = db.getEntries("albums");
      engine.recordResult("albums", entries[0], entries[1], entries[0]);
      expect(engine.isPairPlayed("albums", entries[0].name, entries[1].name)).toBe(true);
    });

    it("is order-independent", () => {
      const entries = db.getEntries("albums");
      engine.recordResult("albums", entries[0], entries[1], entries[0]);
      // Check both orderings
      expect(engine.isPairPlayed("albums", entries[1].name, entries[0].name)).toBe(true);
    });
  });

  describe("isArenaExhausted", () => {
    it("returns false for a fresh arena", () => {
      expect(engine.isArenaExhausted("albums")).toBe(false);
    });

    it("returns true when all pairs are played", () => {
      const entries = db.getEntries("albums");
      for (let i = 0; i < entries.length; i++) {
        for (let j = i + 1; j < entries.length; j++) {
          engine.recordResult("albums", entries[i], entries[j], entries[i]);
        }
      }
      expect(engine.isArenaExhausted("albums")).toBe(true);
    });
  });
});
