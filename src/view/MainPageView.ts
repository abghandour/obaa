import type { Arena } from "../types/index";
import { addRipple } from "./icons";

/**
 * MainPageView renders the landing screen: title, sub-header, and arena grid.
 *
 * The arena grid is a flat two-column grid of buttons — no battleground
 * category headers. Each button is labeled with the arena name and fires
 * the registered `onArenaSelect` callback when clicked.
 */
export class MainPageView {
  private container: HTMLElement;
  private arenaSelectCallback: ((arenaId: string) => void) | null = null;

  constructor(container?: HTMLElement) {
    this.container = container ?? document.getElementById("app") ?? document.body;
  }

  /** Register a callback fired when the player taps an arena button. */
  onArenaSelect(callback: (arenaId: string) => void): void {
    this.arenaSelectCallback = callback;
  }

  /** Render the main page with the given list of arenas. */
  render(arenas: Arena[]): void {
    this.container.innerHTML = "";

    const header = document.createElement("h1");
    header.textContent = "One Battle After Another";
    this.container.appendChild(header);

    const subHeader = document.createElement("h2");
    subHeader.textContent = "Pick a Battleground";
    this.container.appendChild(subHeader);

    const grid = document.createElement("div");
    grid.className = "arena-grid";

    for (const arena of arenas) {
      const button = document.createElement("button");
      button.className = "arena-button";
      button.dataset.arenaId = arena.id;
      button.innerHTML = `<span>${arena.name}</span>`;
      button.addEventListener("click", () => {
        this.arenaSelectCallback?.(arena.id);
      });
      addRipple(button);
      grid.appendChild(button);
    }

    this.container.appendChild(grid);
  }
}
