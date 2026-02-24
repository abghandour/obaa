import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { AudioManager } from "./AudioManager.js";

// Minimal stubs for Web Audio API
function createMockAudioContext() {
  return {
    state: "running" as AudioContextState,
    destination: {} as AudioDestinationNode,
    resume: vi.fn().mockResolvedValue(undefined),
    decodeAudioData: vi.fn().mockResolvedValue({ duration: 1 } as AudioBuffer),
    createBufferSource: vi.fn(() => ({
      buffer: null as AudioBuffer | null,
      connect: vi.fn(),
      start: vi.fn(),
    })),
  };
}

describe("AudioManager", () => {
  let originalAudioContext: typeof window.AudioContext;

  beforeEach(() => {
    originalAudioContext = window.AudioContext;
  });

  afterEach(() => {
    window.AudioContext = originalAudioContext;
    vi.restoreAllMocks();
  });

  it("should construct without errors when AudioContext is available", () => {
    const mock = createMockAudioContext();
    window.AudioContext = vi.fn(() => mock) as unknown as typeof AudioContext;
    const manager = new AudioManager();
    expect(manager).toBeDefined();
  });

  it("should construct without errors when AudioContext is unavailable (silent fallback)", () => {
    // @ts-expect-error — intentionally removing AudioContext
    delete window.AudioContext;
    delete (window as unknown as Record<string, unknown>).webkitAudioContext;

    const manager = new AudioManager();
    expect(manager).toBeDefined();
  });

  it("loadSounds should be a no-op when AudioContext is unavailable", async () => {
    // @ts-expect-error — intentionally removing AudioContext
    delete window.AudioContext;
    delete (window as unknown as Record<string, unknown>).webkitAudioContext;

    const manager = new AudioManager();
    // Should resolve without errors
    await expect(manager.loadSounds()).resolves.toBeUndefined();
  });

  it("play should be a no-op when AudioContext is unavailable", () => {
    // @ts-expect-error — intentionally removing AudioContext
    delete window.AudioContext;
    delete (window as unknown as Record<string, unknown>).webkitAudioContext;

    const manager = new AudioManager();
    // Should not throw
    expect(() => manager.play("tap")).not.toThrow();
  });

  it("play should be a no-op when muted", () => {
    const mock = createMockAudioContext();
    window.AudioContext = vi.fn(() => mock) as unknown as typeof AudioContext;

    const manager = new AudioManager();
    manager.setMuted(true);
    manager.play("tap");

    expect(mock.createBufferSource).not.toHaveBeenCalled();
  });

  it("play should be a no-op when buffer is not loaded", () => {
    const mock = createMockAudioContext();
    window.AudioContext = vi.fn(() => mock) as unknown as typeof AudioContext;

    const manager = new AudioManager();
    // Don't call loadSounds — buffers are empty
    manager.play("tap");

    expect(mock.createBufferSource).not.toHaveBeenCalled();
  });

  it("loadSounds should fetch and decode all four sound files", async () => {
    const mock = createMockAudioContext();
    window.AudioContext = vi.fn(() => mock) as unknown as typeof AudioContext;

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(
      async () => new Response(new ArrayBuffer(8), { status: 200 })
    );

    const manager = new AudioManager();
    await manager.loadSounds();

    expect(fetchSpy).toHaveBeenCalledTimes(4);
    const calledPaths = fetchSpy.mock.calls.map(c => String(c[0]));
    expect(calledPaths.some(p => p.includes("tap.mp3"))).toBe(true);
    expect(calledPaths.some(p => p.includes("swipe.mp3"))).toBe(true);
    expect(calledPaths.some(p => p.includes("transition.mp3"))).toBe(true);
    expect(calledPaths.some(p => p.includes("contender.mp3"))).toBe(true);
    expect(mock.decodeAudioData).toHaveBeenCalledTimes(4);
  });

  it("loadSounds should handle fetch failures gracefully", async () => {
    const mock = createMockAudioContext();
    window.AudioContext = vi.fn(() => mock) as unknown as typeof AudioContext;

    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(null, { status: 404 })
    );
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const manager = new AudioManager();
    await expect(manager.loadSounds()).resolves.toBeUndefined();
    expect(warnSpy).toHaveBeenCalled();
  });

  it("loadSounds should handle decode errors gracefully", async () => {
    const mock = createMockAudioContext();
    mock.decodeAudioData.mockRejectedValue(new Error("decode error"));
    window.AudioContext = vi.fn(() => mock) as unknown as typeof AudioContext;

    vi.spyOn(globalThis, "fetch").mockImplementation(
      async () => new Response(new ArrayBuffer(8), { status: 200 })
    );
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const manager = new AudioManager();
    await expect(manager.loadSounds()).resolves.toBeUndefined();
    expect(warnSpy).toHaveBeenCalled();
  });

  it("play should create a buffer source, connect, and start when loaded", async () => {
    const sourceNode = {
      buffer: null as AudioBuffer | null,
      connect: vi.fn(),
      start: vi.fn(),
    };
    const mock = createMockAudioContext();
    mock.createBufferSource.mockReturnValue(sourceNode);
    window.AudioContext = vi.fn(() => mock) as unknown as typeof AudioContext;

    vi.spyOn(globalThis, "fetch").mockImplementation(
      async () => new Response(new ArrayBuffer(8), { status: 200 })
    );

    const manager = new AudioManager();
    await manager.loadSounds();
    manager.play("tap");

    expect(mock.createBufferSource).toHaveBeenCalled();
    expect(sourceNode.connect).toHaveBeenCalledWith(mock.destination);
    expect(sourceNode.start).toHaveBeenCalledWith(0);
  });

  it("play should resume a suspended AudioContext", async () => {
    const mock = createMockAudioContext();
    mock.state = "suspended" as AudioContextState;
    window.AudioContext = vi.fn(() => mock) as unknown as typeof AudioContext;

    vi.spyOn(globalThis, "fetch").mockImplementation(
      async () => new Response(new ArrayBuffer(8), { status: 200 })
    );

    const manager = new AudioManager();
    await manager.loadSounds();
    manager.play("tap");

    expect(mock.resume).toHaveBeenCalled();
  });

  it("play should catch and swallow playback errors", async () => {
    const mock = createMockAudioContext();
    mock.createBufferSource.mockImplementation(() => {
      throw new Error("playback error");
    });
    window.AudioContext = vi.fn(() => mock) as unknown as typeof AudioContext;

    vi.spyOn(globalThis, "fetch").mockImplementation(
      async () => new Response(new ArrayBuffer(8), { status: 200 })
    );
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const manager = new AudioManager();
    await manager.loadSounds();

    expect(() => manager.play("tap")).not.toThrow();
    expect(warnSpy).toHaveBeenCalled();
  });

  it("setMuted should toggle mute state", async () => {
    const mock = createMockAudioContext();
    window.AudioContext = vi.fn(() => mock) as unknown as typeof AudioContext;

    vi.spyOn(globalThis, "fetch").mockImplementation(
      async () => new Response(new ArrayBuffer(8), { status: 200 })
    );

    const manager = new AudioManager();
    await manager.loadSounds();

    manager.setMuted(true);
    manager.play("tap");
    expect(mock.createBufferSource).not.toHaveBeenCalled();

    manager.setMuted(false);
    manager.play("tap");
    expect(mock.createBufferSource).toHaveBeenCalled();
  });
});
