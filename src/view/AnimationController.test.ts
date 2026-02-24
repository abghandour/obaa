import { describe, it, expect, vi, beforeEach } from "vitest";
import { AnimationController } from "./AnimationController";
import type { AudioManager } from "../logic/AudioManager";

/** Minimal AudioManager stub — only `play` is used by AnimationController. */
function createMockAudio(): AudioManager {
  return { play: vi.fn() } as unknown as AudioManager;
}

/** Simulate the browser firing `animationend` on the element. */
function fireAnimationEnd(el: HTMLElement) {
  el.dispatchEvent(new Event("animationend"));
}

/** Simulate the browser firing `transitionend` on the element. */
function fireTransitionEnd(el: HTMLElement) {
  el.dispatchEvent(new Event("transitionend"));
}

describe("AnimationController", () => {
  let audio: AudioManager;
  let controller: AnimationController;
  let el: HTMLElement;

  beforeEach(() => {
    audio = createMockAudio();
    controller = new AnimationController(audio);
    el = document.createElement("div");
  });

  // ---------- playSelectionHighlight ----------

  it("adds anim-selection-highlight class and plays tap sound", () => {
    const promise = controller.playSelectionHighlight(el);
    expect(el.classList.contains("anim-selection-highlight")).toBe(true);
    expect(audio.play).toHaveBeenCalledWith("tap");
    fireAnimationEnd(el);
    return promise;
  });

  it("removes class after animationend", async () => {
    const promise = controller.playSelectionHighlight(el);
    fireAnimationEnd(el);
    await promise;
    expect(el.classList.contains("anim-selection-highlight")).toBe(false);
  });

  // ---------- playLoserExit ----------

  it("adds anim-loser-exit-left for left direction", () => {
    const promise = controller.playLoserExit(el, "left");
    expect(el.classList.contains("anim-loser-exit-left")).toBe(true);
    fireAnimationEnd(el);
    return promise;
  });

  it("adds anim-loser-exit-right for right direction", () => {
    const promise = controller.playLoserExit(el, "right");
    expect(el.classList.contains("anim-loser-exit-right")).toBe(true);
    fireAnimationEnd(el);
    return promise;
  });

  it("does not play any sound for loser exit", () => {
    const promise = controller.playLoserExit(el, "left");
    expect(audio.play).not.toHaveBeenCalled();
    fireAnimationEnd(el);
    return promise;
  });

  // ---------- playWinnerSlide ----------

  it("adds anim-winner-slide-from-left and plays transition sound", () => {
    const promise = controller.playWinnerSlide(el, "left");
    expect(el.classList.contains("anim-winner-slide-from-left")).toBe(true);
    expect(audio.play).toHaveBeenCalledWith("transition");
    fireAnimationEnd(el);
    return promise;
  });

  it("adds anim-winner-slide-from-right for right", () => {
    const promise = controller.playWinnerSlide(el, "right");
    expect(el.classList.contains("anim-winner-slide-from-right")).toBe(true);
    fireAnimationEnd(el);
    return promise;
  });

  // ---------- playContenderEntrance ----------

  it("adds anim-contender-entrance and plays contenderAppear sound", () => {
    const promise = controller.playContenderEntrance(el);
    expect(el.classList.contains("anim-contender-entrance")).toBe(true);
    expect(audio.play).toHaveBeenCalledWith("contenderAppear");
    fireAnimationEnd(el);
    return promise;
  });

  // ---------- playSnapBack ----------

  it("adds anim-snap-back class and resolves on transitionend", async () => {
    const promise = controller.playSnapBack(el);
    expect(el.classList.contains("anim-snap-back")).toBe(true);
    fireTransitionEnd(el);
    await promise;
    expect(el.classList.contains("anim-snap-back")).toBe(false);
  });

  it("does not play any sound for snap-back", () => {
    const promise = controller.playSnapBack(el);
    expect(audio.play).not.toHaveBeenCalled();
    fireTransitionEnd(el);
    return promise;
  });

  // ---------- Safety timeout ----------

  it("resolves even if no animation event fires (safety timeout)", async () => {
    vi.useFakeTimers();
    const promise = controller.playSelectionHighlight(el);
    vi.advanceTimersByTime(2000);
    await promise;
    expect(el.classList.contains("anim-selection-highlight")).toBe(false);
    vi.useRealTimers();
  });
});
