import type { BattleResult } from "../types";

interface PersistedBattleHistory {
  version: 1;
  results: BattleResult[];
}

const STORAGE_KEY = "battleHistory";

export class BattleHistory {
  private results: BattleResult[] = [];

  /**
   * Create a canonical pair key by sorting names alphabetically and joining with "|".
   * Ensures "A vs B" and "B vs A" produce the same key.
   */
  static makePairKey(a: string, b: string): string {
    return a < b ? `${a}|${b}` : `${b}|${a}`;
  }

  addResult(result: BattleResult): void {
    this.results.push(result);
  }

  getResults(arenaId?: string): BattleResult[] {
    if (arenaId === undefined) {
      return [...this.results];
    }
    return this.results.filter((r) => r.arenaId === arenaId);
  }

  getPlayedPairs(arenaId: string): Set<string> {
    const pairs = new Set<string>();
    for (const r of this.results) {
      if (r.arenaId === arenaId) {
        pairs.add(BattleHistory.makePairKey(r.entryA, r.entryB));
      }
    }
    return pairs;
  }

  async save(): Promise<void> {
    const data: PersistedBattleHistory = { version: 1, results: this.results };
    try {
      const encoded = await compress(data);
      localStorage.setItem(STORAGE_KEY, encoded);
    } catch (e) {
      console.warn("BattleHistory: failed to save to localStorage", e);
    }
  }

  async load(): Promise<void> {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw === null) {
        this.results = [];
        return;
      }
      const data = await decompress(raw);
      this.results = data.results;
    } catch (e) {
      console.warn("BattleHistory: corrupted data in localStorage, initializing empty", e);
      this.results = [];
    }
  }

  clear(): void {
    this.results = [];
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.warn("BattleHistory: failed to clear localStorage", e);
    }
  }

  clearArena(arenaId: string): void {
    this.results = this.results.filter(r => r.arenaId !== arenaId);
  }
}

// --- Compression helpers ---

function supportsCompressionStream(): boolean {
  return typeof CompressionStream !== "undefined" && typeof DecompressionStream !== "undefined";
}

async function compress(data: PersistedBattleHistory): Promise<string> {
  const json = JSON.stringify(data);

  if (!supportsCompressionStream()) {
    return json;
  }

  const encoder = new TextEncoder();
  const inputBytes = encoder.encode(json);

  const cs = new CompressionStream("gzip");
  const writer = cs.writable.getWriter();
  writer.write(inputBytes);
  writer.close();

  const reader = cs.readable.getReader();
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }

  const totalLength = chunks.reduce((sum, c) => sum + c.length, 0);
  const compressed = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    compressed.set(chunk, offset);
    offset += chunk.length;
  }

  // Base64 encode
  let binary = "";
  for (let i = 0; i < compressed.length; i++) {
    binary += String.fromCharCode(compressed[i]);
  }
  return btoa(binary);
}

async function decompress(stored: string): Promise<PersistedBattleHistory> {
  // Try Base64 + gzip first
  if (supportsCompressionStream()) {
    try {
      const binary = atob(stored);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }

      const ds = new DecompressionStream("gzip");
      const writer = ds.writable.getWriter();
      writer.write(bytes);
      writer.close();

      const reader = ds.readable.getReader();
      const chunks: Uint8Array[] = [];
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }

      const totalLength = chunks.reduce((sum, c) => sum + c.length, 0);
      const decompressed = new Uint8Array(totalLength);
      let offset = 0;
      for (const chunk of chunks) {
        decompressed.set(chunk, offset);
        offset += chunk.length;
      }

      const json = new TextDecoder().decode(decompressed);
      return JSON.parse(json) as PersistedBattleHistory;
    } catch {
      // Fall through to raw JSON parse
    }
  }

  // Fallback: try parsing as raw JSON (for browsers without CompressionStream or data stored without compression)
  return JSON.parse(stored) as PersistedBattleHistory;
}
