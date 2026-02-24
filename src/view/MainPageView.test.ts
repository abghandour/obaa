import { describe, it, expect, beforeEach, vi } from "vitest";
import { MainPageView } from "./MainPageView";
import type { Arena } from "../types/index";

function makeArena(id: string, name: string, battleground = "Test"): Arena {
  return { id, name, battleground, entries: [] };
}

describe("MainPageView", () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement("div");
  });

  it("renders h1 with 'One Battle After Another'", () => {
    const view = new MainPageView(container);
    view.render([]);

    const h1 = container.querySelector("h1");
    expect(h1).not.toBeNull();
    expect(h1!.textContent).toBe("One Battle After Another");
  });

  it("renders h2 with 'Pick a Battleground'", () => {
    const view = new MainPageView(container);
    view.render([]);

    const h2 = container.querySelector("h2");
    expect(h2).not.toBeNull();
    expect(h2!.textContent).toBe("Pick a Battleground");
  });

  it("renders an arena-grid div", () => {
    const view = new MainPageView(container);
    view.render([]);

    const grid = container.querySelector(".arena-grid");
    expect(grid).not.toBeNull();
  });

  it("renders one button per arena with correct labels", () => {
    const arenas = [
      makeArena("bands", "Bands", "Music"),
      makeArena("actors", "Actors", "Movie"),
      makeArena("albums", "Albums", "Music"),
    ];

    const view = new MainPageView(container);
    view.render(arenas);

    const buttons = container.querySelectorAll(".arena-button");
    expect(buttons.length).toBe(3);
    expect(buttons[0].textContent).toBe("Bands");
    expect(buttons[1].textContent).toBe("Actors");
    expect(buttons[2].textContent).toBe("Albums");
  });

  it("sets data-arena-id on each button", () => {
    const arenas = [makeArena("films", "Films"), makeArena("singers", "Singers")];

    const view = new MainPageView(container);
    view.render(arenas);

    const buttons = container.querySelectorAll<HTMLButtonElement>(".arena-button");
    expect(buttons[0].dataset.arenaId).toBe("films");
    expect(buttons[1].dataset.arenaId).toBe("singers");
  });

  it("fires onArenaSelect callback with the correct arenaId on click", () => {
    const arenas = [makeArena("bands", "Bands"), makeArena("actors", "Actors")];
    const callback = vi.fn();

    const view = new MainPageView(container);
    view.onArenaSelect(callback);
    view.render(arenas);

    const buttons = container.querySelectorAll<HTMLButtonElement>(".arena-button");
    buttons[1].click();

    expect(callback).toHaveBeenCalledOnce();
    expect(callback).toHaveBeenCalledWith("actors");
  });

  it("does not throw when clicking a button with no callback registered", () => {
    const arenas = [makeArena("bands", "Bands")];

    const view = new MainPageView(container);
    view.render(arenas);

    const button = container.querySelector<HTMLButtonElement>(".arena-button")!;
    expect(() => button.click()).not.toThrow();
  });

  it("renders the ad banner at the bottom", () => {
    const view = new MainPageView(container);
    view.render([]);

    const banner = container.querySelector(".ad-banner");
    expect(banner).not.toBeNull();
    expect(banner!.textContent).toBe("Advertisement");
    // Banner should be the last child
    expect(container.lastElementChild).toBe(banner);
  });

  it("does not render battleground category headers", () => {
    const arenas = [
      makeArena("bands", "Bands", "Music"),
      makeArena("actors", "Actors", "Movie"),
    ];

    const view = new MainPageView(container);
    view.render(arenas);

    // No elements should contain battleground names as headers
    const allText = container.innerHTML;
    // The only h-tags should be h1 and h2 (title and sub-header)
    const headings = container.querySelectorAll("h3, h4, h5, h6");
    expect(headings.length).toBe(0);
  });

  it("clears previous content on re-render", () => {
    const view = new MainPageView(container);
    view.render([makeArena("a", "A")]);
    view.render([makeArena("b", "B"), makeArena("c", "C")]);

    const buttons = container.querySelectorAll(".arena-button");
    expect(buttons.length).toBe(2);
    expect(buttons[0].textContent).toBe("B");
  });
});
