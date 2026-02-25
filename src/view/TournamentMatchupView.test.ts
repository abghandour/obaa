import { describe, it, expect, beforeEach, vi } from "vitest";
import { TournamentMatchupView } from "./TournamentMatchupView";
import type { Entry } from "../types/index";

function makeEntry(name: string): Entry {
  return { name, imageUrl: `https://example.com/${name}.jpg` };
}

describe("TournamentMatchupView", () => {
  let container: HTMLElement;
  const entryA = makeEntry("Tom Hanks");
  const entryB = makeEntry("Brad Pitt");

  beforeEach(() => {
    container = document.createElement("div");
  });

  it("delegates render to the underlying MatchupScreenView", () => {
    const view = new TournamentMatchupView(container);
    view.render("Movies", "Actors", entryA, entryB);
    expect(container.querySelector(".matchup-header")!.textContent).toBe(
      "Movies › Actors",
    );
    expect(container.querySelector(".option-a")).not.toBeNull();
    expect(container.querySelector(".option-b")).not.toBeNull();
  });

  it("exposes the underlying MatchupScreenView via getMatchupView()", () => {
    const view = new TournamentMatchupView(container);
    const inner = view.getMatchupView();
    expect(inner).toBeDefined();
    // Can wire callbacks on the inner view
    const cb = vi.fn();
    inner.onOptionTap(cb);
    view.render("Movies", "Actors", entryA, entryB);
    container
      .querySelector<HTMLImageElement>(".option-a .option-image")!
      .click();
    expect(cb).toHaveBeenCalledWith("a");
  });

  // ── Round label (Task 7.2) ──────────────────────────────

  it("injects a round-label element after the top bar on render", () => {
    const view = new TournamentMatchupView(container);
    view.render("Movies", "Actors", entryA, entryB);
    const label = container.querySelector(".round-label");
    expect(label).not.toBeNull();
  });

  it("setRoundLabel updates the round label text", () => {
    const view = new TournamentMatchupView(container);
    view.render("Movies", "Actors", entryA, entryB);
    view.setRoundLabel("Rd16", 3, 8);
    expect(container.querySelector(".round-label")!.textContent).toBe(
      "Rd16 - Match 3 of 8",
    );
  });

  it("setRoundLabel works for Semi-Finals", () => {
    const view = new TournamentMatchupView(container);
    view.render("Movies", "Actors", entryA, entryB);
    view.setRoundLabel("Semi-Finals", 1, 2);
    expect(container.querySelector(".round-label")!.textContent).toBe(
      "Semi-Finals - Match 1 of 2",
    );
  });

  it("setRoundLabel works for Finals", () => {
    const view = new TournamentMatchupView(container);
    view.render("Movies", "Actors", entryA, entryB);
    view.setRoundLabel("Finals", 1, 1);
    expect(container.querySelector(".round-label")!.textContent).toBe(
      "Finals - Match 1 of 1",
    );
  });

  // ── Replace buttons (Task 7.3) ─────────────────────────

  it("hides the ignore buttons and shows replace buttons on render", () => {
    const view = new TournamentMatchupView(container);
    view.render("Movies", "Actors", entryA, entryB);

    const ignoreButtons =
      container.querySelectorAll<HTMLElement>(".ignore-button");
    ignoreButtons.forEach((btn) => {
      expect(btn.style.display).toBe("none");
    });

    const replaceButtons = container.querySelectorAll(".replace-button");
    expect(replaceButtons.length).toBe(2);
  });

  it("replace buttons contain 'Replace' text", () => {
    const view = new TournamentMatchupView(container);
    view.render("Movies", "Actors", entryA, entryB);
    const replaceButtons = container.querySelectorAll(".replace-button");
    replaceButtons.forEach((btn) => {
      expect(btn.textContent).toContain("Replace");
    });
  });

  it("fires onReplace callback with 'a' when left replace button is clicked", () => {
    const cb = vi.fn();
    const view = new TournamentMatchupView(container);
    view.onReplace(cb);
    view.render("Movies", "Actors", entryA, entryB);

    const replaceButtons =
      container.querySelectorAll<HTMLButtonElement>(".replace-button");
    replaceButtons[0]!.click();
    expect(cb).toHaveBeenCalledWith("a");
  });

  it("fires onReplace callback with 'b' when right replace button is clicked", () => {
    const cb = vi.fn();
    const view = new TournamentMatchupView(container);
    view.onReplace(cb);
    view.render("Movies", "Actors", entryA, entryB);

    const replaceButtons =
      container.querySelectorAll<HTMLButtonElement>(".replace-button");
    replaceButtons[1]!.click();
    expect(cb).toHaveBeenCalledWith("b");
  });

  // ── Disable replace buttons (Task 7.4) ─────────────────

  it("setReplacementEnabled(false) hides replace buttons", () => {
    const view = new TournamentMatchupView(container);
    view.render("Movies", "Actors", entryA, entryB);
    view.setReplacementEnabled(false);

    const replaceButtons =
      container.querySelectorAll<HTMLButtonElement>(".replace-button");
    replaceButtons.forEach((btn) => {
      expect(btn.style.display).toBe("none");
      expect(btn.disabled).toBe(true);
    });
  });

  it("setReplacementEnabled(true) shows replace buttons again", () => {
    const view = new TournamentMatchupView(container);
    view.render("Movies", "Actors", entryA, entryB);
    view.setReplacementEnabled(false);
    view.setReplacementEnabled(true);

    const replaceButtons =
      container.querySelectorAll<HTMLButtonElement>(".replace-button");
    replaceButtons.forEach((btn) => {
      expect(btn.style.display).toBe("");
      expect(btn.disabled).toBe(false);
    });
  });

  it("replace buttons are hidden when isFirstRound is set to false before render", () => {
    const view = new TournamentMatchupView(container);
    view.setReplacementEnabled(false);
    view.render("Movies", "Actors", entryA, entryB);

    const replaceButtons =
      container.querySelectorAll<HTMLButtonElement>(".replace-button");
    replaceButtons.forEach((btn) => {
      expect(btn.style.display).toBe("none");
    });
  });

  it("re-render does not duplicate round labels", () => {
    const view = new TournamentMatchupView(container);
    view.render("Movies", "Actors", entryA, entryB);
    view.render("Music", "Bands", makeEntry("Beatles"), makeEntry("Queen"));
    const labels = container.querySelectorAll(".round-label");
    expect(labels.length).toBe(1);
  });
});
