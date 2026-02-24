import { describe, it, expect, vi, beforeEach } from "vitest";
import { SwipeHandler } from "./SwipeHandler";
import type { CurtainState } from "./SwipeHandler";

function createMockElement(): HTMLElement & { __dispatch: (type: string, event: unknown) => void } {
  const listeners: Record<string, EventListener[]> = {};
  const el = {
    style: {} as CSSStyleDeclaration,
    addEventListener(type: string, fn: EventListener) {
      if (!listeners[type]) listeners[type] = [];
      listeners[type].push(fn);
    },
    removeEventListener(type: string, fn: EventListener) {
      if (listeners[type]) {
        listeners[type] = listeners[type].filter((f) => f !== fn);
      }
    },
    setPointerCapture: vi.fn(),
    __dispatch(type: string, event: unknown) {
      (listeners[type] ?? []).forEach((fn) => fn(event as Event));
    },
  } as unknown as HTMLElement & { __dispatch: (type: string, event: unknown) => void };
  return el;
}

function pe(clientX: number, pointerId = 1): Partial<PointerEvent> {
  return { clientX, pointerId, currentTarget: null } as unknown as Partial<PointerEvent>;
}

describe("SwipeHandler", () => {
  let handler: SwipeHandler;
  let el: ReturnType<typeof createMockElement>;

  beforeEach(() => {
    handler = new SwipeHandler();
    el = createMockElement();
  });

  describe("computeState", () => {
    it("returns null revealing and 0 progress for deltaX=0", () => {
      expect(handler.computeState(0)).toEqual({ revealing: null, progress: 0 });
    });

    it("returns revealing=a for positive deltaX (swipe right)", () => {
      const s = handler.computeState(75);
      expect(s.revealing).toBe("a");
      expect(s.progress).toBeCloseTo(0.5);
    });

    it("returns revealing=b for negative deltaX (swipe left)", () => {
      const s = handler.computeState(-75);
      expect(s.revealing).toBe("b");
      expect(s.progress).toBeCloseTo(0.5);
    });

    it("clamps progress to 1", () => {
      expect(handler.computeState(300).progress).toBe(1);
      expect(handler.computeState(-999).progress).toBe(1);
    });
  });

  describe("attach / detach", () => {
    it("attaches pointer listeners", () => {
      const spy = vi.spyOn(el, "addEventListener");
      handler.attach(el);
      expect(spy).toHaveBeenCalledWith("pointerdown", expect.any(Function));
      expect(spy).toHaveBeenCalledWith("pointermove", expect.any(Function));
      expect(spy).toHaveBeenCalledWith("pointerup", expect.any(Function));
      expect(spy).toHaveBeenCalledWith("pointercancel", expect.any(Function));
    });

    it("removes listeners on detach", () => {
      const spy = vi.spyOn(el, "removeEventListener");
      handler.attach(el);
      handler.detach();
      expect(spy).toHaveBeenCalledWith("pointerdown", expect.any(Function));
      expect(spy).toHaveBeenCalledWith("pointerup", expect.any(Function));
    });
  });

  describe("swipe update callback", () => {
    it("fires onSwipeUpdate with curtain state during drag", () => {
      const updates: CurtainState[] = [];
      handler.onSwipeUpdate((s) => updates.push(s));
      handler.attach(el);

      el.__dispatch("pointerdown", pe(200));
      el.__dispatch("pointermove", pe(125)); // deltaX = -75

      expect(updates).toHaveLength(1);
      expect(updates[0]!.revealing).toBe("b");
      expect(updates[0]!.progress).toBeCloseTo(0.5);
    });
  });

  describe("swipe complete", () => {
    it("fires onSwipeComplete when progress reaches 1", () => {
      const completions: string[] = [];
      handler.onSwipeComplete((s) => completions.push(s));
      handler.attach(el);

      el.__dispatch("pointerdown", pe(200));
      el.__dispatch("pointermove", pe(400)); // deltaX = +200, progress clamped to 1

      expect(completions).toEqual(["a"]);
    });

    it("does not fire cancel after complete", () => {
      const cancels: number[] = [];
      handler.onSwipeCancel(() => cancels.push(1));
      handler.onSwipeComplete(() => {});
      handler.attach(el);

      el.__dispatch("pointerdown", pe(200));
      el.__dispatch("pointermove", pe(400)); // triggers complete, sets active=false
      el.__dispatch("pointerup", pe(400));

      expect(cancels).toHaveLength(0);
    });
  });

  describe("swipe cancel", () => {
    it("fires onSwipeCancel when released before full reveal", () => {
      const cancels: number[] = [];
      handler.onSwipeCancel(() => cancels.push(1));
      handler.attach(el);

      el.__dispatch("pointerdown", pe(200));
      el.__dispatch("pointermove", pe(220)); // small drag
      el.__dispatch("pointerup", pe(220));

      expect(cancels).toHaveLength(1);
    });
  });

  describe("edge cases", () => {
    it("does not fire update without pointerdown", () => {
      const updates: CurtainState[] = [];
      handler.onSwipeUpdate((s) => updates.push(s));
      handler.attach(el);

      el.__dispatch("pointermove", pe(150));
      expect(updates).toHaveLength(0);
    });
  });
});
