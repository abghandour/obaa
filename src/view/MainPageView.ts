import type { Arena } from "../types/index";
import { AdBannerView } from "./AdBannerView";

/**
 * MainPageView renders the landing screen: title, sub-header, arena grid,
 * and the ad banner.
 *
 * The arena grid is a flat two-column grid of buttons — no battleground
 * category headers. Each button is labeled with the arena name and fires
 * the registered `onArenaSelect` callback when clicked.
 *
 * @requirements 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 4.1, 4.2
 */
export class MainPageView {
  private container: HTMLElement;
  private arenaSelectCallback: ((arenaId: string) => void) | null = null;
  private adBanner = new AdBannerView();

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
      button.textContent = arena.name;
      button.addEventListener("click", () => {
        this.arenaSelectCallback?.(arena.id);
      });
      grid.appendChild(button);
    }

    this.container.appendChild(grid);
    this.adBanner.render(this.container);
  }
}
