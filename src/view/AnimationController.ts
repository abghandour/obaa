import type { AudioManager } from "../logic/AudioManager";

/**
 * Coordinates CSS-class-driven animations and sequences them via Promises.
 *
 * Each method adds a CSS class to trigger a GPU-accelerated animation
 * (CSS transforms only), listens for `animationend` or `transitionend`,
 * removes the class, and resolves. The AudioManager is called where
 * appropriate to play sound effects in sync with the visuals.
 *
 * @requirements 14.1, 14.2, 14.3, 14.4, 14.5, 11.1, 11.2, 11.3, 11.6
 */
export class AnimationController {
  private audio: AudioManager;

  constructor(audio: AudioManager) {
    this.audio = audio;
  }

  /**
   * Highlight the selected option with a pulse/glow animation.
   * Plays the "tap" sound effect.
   *
   * @requirements 14.1, 9.3
   */
  playSelectionHighlight(element: HTMLElement): Promise<void> {
    this.audio.play("tap");
    return this.animate(element, "anim-selection-highlight");
  }

  /**
   * Animate the losing option sliding off-screen.
   *
   * @requirements 11.1
   */
  playLoserExit(
    element: HTMLElement,
    direction: "left" | "right",
  ): Promise<void> {
    const cls =
      direction === "left" ? "anim-loser-exit-left" : "anim-loser-exit-right";
    return this.animate(element, cls);
  }

  /**
   * Animate the winner sliding to the opposite side.
   * Plays the "transition" sound effect.
   *
   * @requirements 11.2, 14.3, 11.6
   */
  playWinnerSlide(
    element: HTMLElement,
    from: "left" | "right",
  ): Promise<void> {
    this.audio.play("transition");
    const cls =
      from === "left"
        ? "anim-winner-slide-from-left"
        : "anim-winner-slide-from-right";
    return this.animate(element, cls);
  }

  /**
   * Fade in a new contender.
   * Plays the "contenderAppear" sound effect.
   *
   * @requirements 11.3, 14.4
   */
  playContenderEntrance(element: HTMLElement): Promise<void> {
    this.audio.play("contenderAppear");
    return this.animate(element, "anim-contender-entrance");
  }

  /**
   * Snap-back animation for a cancelled swipe.
   *
   * @requirements 14.2
   */
  playSnapBack(element: HTMLElement): Promise<void> {
    return this.animate(element, "anim-snap-back");
  }

  // ---------------------------------------------------------------------------
  // Internal helper
  // ---------------------------------------------------------------------------

  /**
   * Add `className` to `element`, wait for the first `animationend` or
   * `transitionend` event, remove the class, and resolve.
   *
   * A safety timeout (2 s) ensures the Promise always resolves even if
   * the CSS animation is missing or the event never fires.
   */
  private animate(element: HTMLElement, className: string): Promise<void> {
    return new Promise<void>((resolve) => {
      const SAFETY_TIMEOUT_MS = 2000;

      const cleanup = () => {
        element.classList.remove(className);
        element.removeEventListener("animationend", onEnd);
        element.removeEventListener("transitionend", onEnd);
        clearTimeout(timer);
        resolve();
      };

      const onEnd = () => cleanup();

      element.addEventListener("animationend", onEnd, { once: true });
      element.addEventListener("transitionend", onEnd, { once: true });

      // Safety net — resolve even if the CSS event never fires
      const timer = setTimeout(cleanup, SAFETY_TIMEOUT_MS);

      element.classList.add(className);
    });
  }
}
