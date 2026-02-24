import type { Arena, Entry } from "../types";
import { battlegrounds } from "../data/battlegrounds";

export class EntryDatabase {
  private arenas: Arena[];
  private arenaMap: Map<string, Arena>;

  constructor() {
    this.arenas = battlegrounds.flatMap((bg) => bg.arenas);
    this.arenaMap = new Map(this.arenas.map((a) => [a.id, a]));
  }

  getAllArenas(): Arena[] {
    return this.arenas;
  }

  getArena(arenaId: string): Arena | undefined {
    return this.arenaMap.get(arenaId);
  }

  getEntries(arenaId: string): Entry[] {
    return this.arenaMap.get(arenaId)?.entries ?? [];
  }
}
