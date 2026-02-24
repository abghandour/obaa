/**
 * Handles pointer-based swipe gestures for the curtain-reveal mechanic.
 *
 * Swipe left → option B (right) reveals like curtains opening.
 * Swipe right → option A (left) reveals like curtains opening.
 * Progress is clamped to [0, 1]. At 1 the option is fully revealed and selected.
 * Reversing direction closes the curtain back toward 0.
 */

function clamp(v: number, min: number, max: number): number {
  return Math.min(Math.max(v, min), max);
}

export interface CurtainState {
  /** Which option is being revealed, or null if no movement yet. */
  revealing: "a" | "b" | null;
  /** 0 = fully clipped (initial), 1 = fully revealed. */
  progress: number;
}

export class SwipeHandler {
  private element: HTMLElement | null = null;
  private active = false;
  private startX = 0;

  /**
   * How many pixels of horizontal drag maps to a full reveal (progress 0→1).
   * Defaults to 150px — feels natural on mobile.
   */
  private swipeRange = 150;

  private updateCallback: ((state: CurtainState) => void) | null = null;
  private completeCallback: ((selected: "a" | "b") => void) | null = null;
  private cancelCallback: (() => void) | null = null;

  private handlePointerDown = this._onPointerDown.bind(this);
  private handlePointerMove = this._onPointerMove.bind(this);
  private handlePointerUp = this._onPointerUp.bind(this);

  attach(element: HTMLElement): void {
    this.detach();
    this.element = element;
    element.addEventListener("pointerdown", this.handlePointerDown);
    element.addEventListener("pointermove", this.handlePointerMove);
    element.addEventListener("pointerup", this.handlePointerUp);
    element.addEventListener("pointercancel", this.handlePointerUp);
    element.style.touchAction = "pan-y";
  }

  detach(): void {
    if (this.element) {
      this.element.removeEventListener("pointerdown", this.handlePointerDown);
      this.element.removeEventListener("pointermove", this.handlePointerMove);
      this.element.removeEventListener("pointerup", this.handlePointerUp);
      this.element.removeEventListener("pointercancel", this.handlePointerUp);
      this.element = null;
    }
    this.active = false;
  }

  /** Fired on every pointermove with the current curtain state. */
  onSwipeUpdate(callback: (state: CurtainState) => void): void {
    this.updateCallback = callback;
  }

  /** Fired when progress reaches 1 — the option is fully revealed. */
  onSwipeComplete(callback: (selected: "a" | "b") => void): void {
    this.completeCallback = callback;
  }

  /** Fired on pointer release when progress < 1 — snap curtain closed. */
  onSwipeCancel(callback: () => void): void {
    this.cancelCallback = callback;
  }

  /** Compute curtain state from a raw deltaX. Exported for testability. */
  computeState(deltaX: number): CurtainState {
    if (deltaX === 0) return { revealing: null, progress: 0 };
    // Swipe left (negative) → reveal B; swipe right (positive) → reveal A
    const revealing: "a" | "b" = deltaX > 0 ? "a" : "b";
    const progress = clamp(Math.abs(deltaX) / this.swipeRange, 0, 1);
    return { revealing, progress };
  }

  // ── Private ──────────────────────────────────────────────

  private _onPointerDown(e: PointerEvent): void {
    this.active = true;
    this.startX = e.clientX;
    (e.currentTarget as HTMLElement)?.setPointerCapture?.(e.pointerId);
  }

  private _onPointerMove(e: PointerEvent): void {
    if (!this.active) return;
    const deltaX = e.clientX - this.startX;
    const state = this.computeState(deltaX);
    this.updateCallback?.(state);

    // Auto-select when fully revealed
    if (state.progress >= 1 && state.revealing) {
      this.active = false;
      this.completeCallback?.(state.revealing);
    }
  }

  private _onPointerUp(): void {
    if (!this.active) return;
    this.active = false;
    this.cancelCallback?.();
  }
}
