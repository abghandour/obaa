/** A single item within an arena's database (e.g., "Tom Hanks" in the Actors arena). */
export interface Entry {
  name: string;
  imageUrl: string;
}

/** A specific competition topic within a battleground (e.g., Bands, Albums). */
export interface Arena {
  id: string;
  name: string;
  battleground: string;
  entries: Entry[];
}

/** A top-level category that groups related arenas (e.g., Music, Movie). */
export interface Battleground {
  name: string;
  arenas: Arena[];
}

/**
 * A record of a single matchup outcome.
 *
 * `entryA` and `entryB` are always stored in alphabetical order to ensure
 * canonical pair identification — "A vs B" and "B vs A" resolve to the same
 * pair key (`"entryA|entryB"`).
 */
export interface BattleResult {
  arenaId: string;
  /** Alphabetically first of the two competing entry names. */
  entryA: string;
  /** Alphabetically second of the two competing entry names. */
  entryB: string;
  winner: string;
  /** Timestamp from Date.now(). */
  timestamp: number;
}

/** A pair of entries picked for a matchup. */
export interface MatchupPick {
  optionA: Entry;
  optionB: Entry;
}

/** Tracks the state of an in-progress swipe gesture. */
export interface SwipeState {
  active: boolean;
  direction: "left" | "right" | null;
  /** 0 to 1, representing how much of the cropped portion is revealed. */
  revealProgress: number;
  startX: number;
  currentX: number;
}

/** In-memory application state (not persisted). */
export interface GameState {
  currentScreen: "main" | "matchup";
  selectedArenaId: string | null;
  currentMatchup: {
    optionA: Entry;
    optionB: Entry;
  } | null;
  winner: Entry | null;
  isTransitioning: boolean;
}

/** Hash-based route descriptor. */
export interface Route {
  screen: "main" | "matchup";
  arenaId?: string;
  /** If present, this is a replay session with encoded match data. */
  replayData?: string;
}

/** Audio cue identifiers for game events. */
export type SoundEffect = "tap" | "swipe" | "transition" | "contenderAppear";
