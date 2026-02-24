import { describe, it, expect, beforeEach, vi } from "vitest";
import { MatchupScreenView } from "./MatchupScreenView";
import type { Entry } from "../types/index";

function makeEntry(name: string): Entry {
  return { name, imageUrl: `https://upload.wikimedia.org/wikipedia/${name}.jpg` };
}

describe("MatchupScreenView", () => {
  let container: HTMLElement;
  const entryA = makeEntry("Tom Hanks");
  const entryB = makeEntry("Brad Pitt");

  beforeEach(() => {
    container = document.createElement("div");
  });

  it("renders matchup header", () => {
    const view = new MatchupScreenView(container);
    view.render("Movies", "Actors", entryA, entryB);
    expect(container.querySelector(".matchup-header")!.textContent).toBe("Movies > Actors");
  });

  it("renders both option containers", () => {
    const view = new MatchupScreenView(container);
    view.render("Movies", "Actors", entryA, entryB);
    expect(container.querySelector(".option-a")).not.toBeNull();
    expect(container.querySelector(".option-b")).not.toBeNull();
  });

  it("renders images with correct src and alt", () => {
    const view = new MatchupScreenView(container);
    view.render("Movies", "Actors", entryA, entryB);
    const images = container.querySelectorAll<HTMLImageElement>(".option-image");
    expect(images[0]!.src).toContain("Tom");
    expect(images[0]!.alt).toBe("Tom Hanks");
    expect(images[1]!.src).toContain("Brad");
    expect(images[1]!.alt).toBe("Brad Pitt");
  });

  it("renders name labels in a labels row", () => {
    const view = new MatchupScreenView(container);
    view.render("Movies", "Actors", entryA, entryB);
    const labels = container.querySelectorAll(".labels-row .option-label");
    expect(labels[0]!.textContent).toBe("Tom Hanks");
    expect(labels[1]!.textContent).toBe("Brad Pitt");
  });

  it("applies initial curtain clip — A shows left half, B shows right half", () => {
    const view = new MatchupScreenView(container);
    view.render("Movies", "Actors", entryA, entryB);
    const optA = container.querySelector<HTMLElement>(".option-a")!;
    const optB = container.querySelector<HTMLElement>(".option-b")!;
    expect(optA.style.clipPath).toBe("inset(0 50% 0 0)");
    expect(optB.style.clipPath).toBe("inset(0 0 0 50%)");
  });

  it("applyCurtainClip reveals option A (right inset shrinks)", () => {
    const view = new MatchupScreenView(container);
    view.render("Movies", "Actors", entryA, entryB);
    view.applyCurtainClip({ revealing: "a", progress: 0.5 });
    const optA = container.querySelector<HTMLElement>(".option-a")!;
    const optB = container.querySelector<HTMLElement>(".option-b")!;
    expect(optA.style.clipPath).toBe("inset(0 25% 0 0)");
    expect(optB.style.clipPath).toBe("inset(0 0 0 50%)");
  });

  it("applyCurtainClip fully reveals option B (left inset goes to 0)", () => {
    const view = new MatchupScreenView(container);
    view.render("Movies", "Actors", entryA, entryB);
    view.applyCurtainClip({ revealing: "b", progress: 1 });
    const optA = container.querySelector<HTMLElement>(".option-a")!;
    const optB = container.querySelector<HTMLElement>(".option-b")!;
    expect(optA.style.clipPath).toBe("inset(0 50% 0 0)");
    expect(optB.style.clipPath).toBe("inset(0 0 0 0%)");
  });

  it("renders a Pass button", () => {
    const view = new MatchupScreenView(container);
    view.render("Movies", "Actors", entryA, entryB);
    expect(container.querySelector(".pass-button")!.textContent).toBe("Pass");
  });

  it("fires onPass callback", () => {
    const cb = vi.fn();
    const view = new MatchupScreenView(container);
    view.onPass(cb);
    view.render("Movies", "Actors", entryA, entryB);
    container.querySelector<HTMLButtonElement>(".pass-button")!.click();
    expect(cb).toHaveBeenCalledOnce();
  });

  it("fires onOptionTap with 'a'", () => {
    const cb = vi.fn();
    const view = new MatchupScreenView(container);
    view.onOptionTap(cb);
    view.render("Movies", "Actors", entryA, entryB);
    container.querySelector<HTMLImageElement>(".option-a .option-image")!.click();
    expect(cb).toHaveBeenCalledWith("a");
  });

  it("fires onOptionTap with 'b'", () => {
    const cb = vi.fn();
    const view = new MatchupScreenView(container);
    view.onOptionTap(cb);
    view.render("Movies", "Actors", entryA, entryB);
    container.querySelector<HTMLImageElement>(".option-b .option-image")!.click();
    expect(cb).toHaveBeenCalledWith("b");
  });

  it("showExhaustedMessage replaces content", () => {
    const view = new MatchupScreenView(container);
    view.render("Movies", "Actors", entryA, entryB);
    view.showExhaustedMessage("All done!");
    expect(container.querySelector(".exhausted-message")!.textContent).toBe("All done!");
    expect(container.querySelector(".matchup-area")).toBeNull();
  });

  it("renders ad banner at the bottom", () => {
    const view = new MatchupScreenView(container);
    view.render("Movies", "Actors", entryA, entryB);
    expect(container.querySelector(".ad-banner")).not.toBeNull();
    expect(container.lastElementChild).toBe(container.querySelector(".ad-banner"));
  });

  it("exposes option elements via getters", () => {
    const view = new MatchupScreenView(container);
    view.render("Movies", "Actors", entryA, entryB);
    expect(view.getOptionAElement()!.classList.contains("option-a")).toBe(true);
    expect(view.getOptionBElement()!.classList.contains("option-b")).toBe(true);
  });

  it("clears previous content on re-render", () => {
    const view = new MatchupScreenView(container);
    view.render("Movies", "Actors", entryA, entryB);
    view.render("Music", "Bands", makeEntry("Beatles"), makeEntry("Queen"));
    expect(container.querySelector(".matchup-header")!.textContent).toBe("Music > Bands");
    const labels = container.querySelectorAll(".labels-row .option-label");
    expect(labels[0]!.textContent).toBe("Beatles");
    expect(labels[1]!.textContent).toBe("Queen");
  });
});
