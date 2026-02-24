/**
 * A recorded match: the two entry names and who won.
 */
export interface RecordedMatch {
  entryA: string;
  entryB: string;
  winner: string;
}

/**
 * Manages a recording session — tracks matches during Record mode,
 * encodes them to a compressed URL-safe string, and decodes them back.
 * Also computes Jaccard similarity between two sets of results.
 */
export class RecordingSession {
  private matches: RecordedMatch[] = [];
  private _active = false;

  get active(): boolean { return this._active; }
  get recordedMatches(): RecordedMatch[] { return [...this.matches]; }

  start(): void {
    this.matches = [];
    this._active = true;
  }

  stop(): void {
    this._active = false;
  }

  addMatch(entryA: string, entryB: string, winner: string): void {
    if (!this._active) return;
    this.matches.push({ entryA, entryB, winner });
  }

  /**
   * Encode an arena ID + matches into a URL-safe base64 string.
   * Format: JSON → UTF-8 → deflate-raw via CompressionStream → base64url.
   * Falls back to plain base64url(JSON) if CompressionStream unavailable.
   */
  static async encode(arenaId: string, matches: RecordedMatch[]): Promise<string> {
    const payload = JSON.stringify({ a: arenaId, m: matches.map(m => [m.entryA, m.entryB, m.winner]) });

    if (typeof CompressionStream !== "undefined") {
      try {
        const bytes = new TextEncoder().encode(payload);
        const cs = new CompressionStream("deflate-raw");
        const writer = cs.writable.getWriter();
        writer.write(bytes);
        writer.close();
        const reader = cs.readable.getReader();
        const chunks: Uint8Array[] = [];
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
        }
        const total = chunks.reduce((s, c) => s + c.length, 0);
        const compressed = new Uint8Array(total);
        let off = 0;
        for (const c of chunks) { compressed.set(c, off); off += c.length; }
        return "1" + toBase64Url(compressed);
      } catch { /* fall through */ }
    }
    // Fallback: uncompressed
    return "0" + btoa(payload).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }

  /**
   * Decode a URL-safe string back into arena ID + matches.
   */
  static async decode(encoded: string): Promise<{ arenaId: string; matches: RecordedMatch[] }> {
    const flag = encoded[0];
    const data = encoded.slice(1);

    let json: string;
    if (flag === "1" && typeof DecompressionStream !== "undefined") {
      const bytes = fromBase64Url(data);
      const ds = new DecompressionStream("deflate-raw");
      const writer = ds.writable.getWriter();
      writer.write(bytes);
      writer.close();
      const reader = ds.readable.getReader();
      const chunks: Uint8Array[] = [];
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }
      const total = chunks.reduce((s, c) => s + c.length, 0);
      const decompressed = new Uint8Array(total);
      let off = 0;
      for (const c of chunks) { decompressed.set(c, off); off += c.length; }
      json = new TextDecoder().decode(decompressed);
    } else {
      // flag "0" or no DecompressionStream
      const padded = data.replace(/-/g, "+").replace(/_/g, "/");
      json = atob(padded);
    }

    const parsed = JSON.parse(json) as { a: string; m: [string, string, string][] };
    return {
      arenaId: parsed.a,
      matches: parsed.m.map(([entryA, entryB, winner]) => ({ entryA, entryB, winner })),
    };
  }

  /**
   * Compute Jaccard similarity between two sets of match results.
   * Each match is keyed as "entryA|entryB=winner".
   * Returns a value 0–100.
   */
  static jaccardSimilarity(setA: RecordedMatch[], setB: RecordedMatch[]): number {
    const toKey = (m: RecordedMatch) => `${m.entryA}|${m.entryB}=${m.winner}`;
    const a = new Set(setA.map(toKey));
    const b = new Set(setB.map(toKey));
    let intersection = 0;
    for (const k of a) { if (b.has(k)) intersection++; }
    const union = new Set([...a, ...b]).size;
    if (union === 0) return 100;
    return Math.round((intersection / union) * 100);
  }

  /**
   * Return a human-readable verdict for a Jaccard score.
   */
  static verdict(score: number): string {
    if (score >= 80) return "Absolute Soulmates";
    if (score >= 50) return "On the Same Page";
    if (score >= 20) return "Respectfully Disagree";
    return "From Different Planets";
  }
}

// ── Helpers ──────────────────────────────────────────────

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(str: string): Uint8Array {
  const padded = str.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
