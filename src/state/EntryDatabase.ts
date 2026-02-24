import type { Arena, Entry } from "../types";
import { battlegrounds } from "../data/battlegrounds";

/**
 * Check if an image URL is reachable (non-404).
 * Uses a HEAD request first; falls back to loading an Image element.
 */
function validateImage(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = url;
  });
}

export class EntryDatabase {
  private arenas: Arena[];
  private arenaMap: Map<string, Arena>;

  constructor() {
    this.arenas = battlegrounds.flatMap((bg) => bg.arenas);
    this.arenaMap = new Map(this.arenas.map((a) => [a.id, a]));
  }

  /**
   * Validate all entry images in parallel and remove entries whose images 404.
   * Call once at startup before any matchups are picked.
   */
  async validateImages(): Promise<void> {
    // Collect all unique URLs to avoid duplicate checks
    const urlStatus = new Map<string, Promise<boolean>>();
    for (const arena of this.arenas) {
      for (const entry of arena.entries) {
        if (!urlStatus.has(entry.imageUrl)) {
          urlStatus.set(entry.imageUrl, validateImage(entry.imageUrl));
        }
      }
    }

    // Resolve all checks
    const resolved = new Map<string, boolean>();
    await Promise.all(
      [...urlStatus.entries()].map(async ([url, promise]) => {
        resolved.set(url, await promise);
      }),
    );

    // Filter out broken entries from each arena
    for (const arena of this.arenas) {
      const before = arena.entries.length;
      arena.entries = arena.entries.filter((e) => resolved.get(e.imageUrl) !== false);
      if (arena.entries.length < before) {
        console.warn(
          `[EntryDatabase] Removed ${before - arena.entries.length} entries with broken images from "${arena.name}"`,
        );
      }
    }

    // Rebuild map
    this.arenaMap = new Map(this.arenas.map((a) => [a.id, a]));
  }

  private static VISIBLE_ARENAS = new Set([
    "top-100-alternative-albums",
    "imdb-top-100-movies",
  ]);

  getAllArenas(): Arena[] {
    return this.arenas.filter(a => EntryDatabase.VISIBLE_ARENAS.has(a.id));
  }

  getArena(arenaId: string): Arena | undefined {
    return this.arenaMap.get(arenaId);
  }

  getEntries(arenaId: string): Entry[] {
    return this.arenaMap.get(arenaId)?.entries ?? [];
  }
}
