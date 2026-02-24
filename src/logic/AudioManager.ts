import type { SoundEffect } from "../types/index.js";
import tapUrl from "../assets/sounds/tap.mp3?url";
import swipeUrl from "../assets/sounds/swipe.mp3?url";
import transitionUrl from "../assets/sounds/transition.mp3?url";
import contenderUrl from "../assets/sounds/contender.mp3?url";

/**
 * Manages game sound effects using the Web Audio API.
 *
 * If the Web Audio API is unavailable, all methods silently no-op.
 * All playback errors are caught and logged as warnings — never thrown.
 */
export class AudioManager {
  private context: AudioContext | null = null;
  private buffers: Map<SoundEffect, AudioBuffer> = new Map();
  private muted = false;

  private static readonly SOUND_FILES: Record<SoundEffect, string> = {
    tap: tapUrl,
    swipe: swipeUrl,
    transition: transitionUrl,
    contenderAppear: contenderUrl,
  };

  constructor() {
    try {
      const AudioCtx =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (AudioCtx) {
        this.context = new AudioCtx();
      }
    } catch {
      // Web Audio API unavailable — silent fallback
      console.warn("AudioManager: Web Audio API is not available.");
    }
  }

  /**
   * Fetch and decode all sound effect files into AudioBuffers.
   * Errors for individual files are caught so one bad file doesn't
   * prevent the others from loading.
   */
  async loadSounds(): Promise<void> {
    if (!this.context) return;

    const entries = Object.entries(AudioManager.SOUND_FILES) as Array<
      [SoundEffect, string]
    >;

    await Promise.all(
      entries.map(async ([effect, path]) => {
        try {
          const response = await fetch(path);
          if (!response.ok) {
            console.warn(
              `AudioManager: Failed to fetch ${path} (${response.status})`
            );
            return;
          }
          const arrayBuffer = await response.arrayBuffer();
          const audioBuffer = await this.context!.decodeAudioData(arrayBuffer);
          this.buffers.set(effect, audioBuffer);
        } catch (err) {
          console.warn(`AudioManager: Could not load sound "${effect}":`, err);
        }
      })
    );
  }

  /**
   * Play a sound effect. If muted, the context is unavailable, or the
   * buffer was never loaded, this is a silent no-op.
   */
  play(effect: SoundEffect): void {
    if (this.muted || !this.context) return;

    const buffer = this.buffers.get(effect);
    if (!buffer) return;

    try {
      // Resume context if it was suspended (autoplay policy)
      if (this.context.state === "suspended") {
        this.context.resume().catch(() => {});
      }

      const source = this.context.createBufferSource();
      source.buffer = buffer;
      source.connect(this.context.destination);
      source.start(0);
    } catch (err) {
      console.warn(`AudioManager: Playback error for "${effect}":`, err);
    }
  }

  /** Toggle mute state. When muted, `play()` calls are skipped. */
  setMuted(muted: boolean): void {
    this.muted = muted;
  }
}
