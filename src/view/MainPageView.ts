import type { Arena } from "../types/index";
import { addRipple } from "./icons";

/**
 * MainPageView renders the landing screen: title, sub-header, mode toggle,
 * and arena grid.
 *
 * The arena grid is a flat two-column grid of buttons — no battleground
 * category headers. Each button is labeled with the arena name and fires
 * the registered `onArenaSelect` callback when clicked.
 */
export class MainPageView {
  private container: HTMLElement;
  private arenaSelectCallback: ((arenaId: string) => void) | null = null;
  private modeChangeCallback: ((mode: "battle" | "tournament") => void) | null = null;
  private currentMode: "battle" | "tournament" = "tournament";

  constructor(container?: HTMLElement) {
    this.container = container ?? document.getElementById("app") ?? document.body;
  }

  /** Register a callback fired when the player taps an arena button. */
  onArenaSelect(callback: (arenaId: string) => void): void {
    this.arenaSelectCallback = callback;
  }

  /** Register a callback fired when the player switches between Battle and Tournament mode. */
  onModeChange(callback: (mode: "battle" | "tournament") => void): void {
    this.modeChangeCallback = callback;
  }

  /** Get the currently selected mode. */
  getMode(): "battle" | "tournament" {
    return this.currentMode;
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

    // Mode toggle
    const modeToggle = document.createElement("div");
    modeToggle.className = "mode-toggle";

    const battleBtn = document.createElement("button");
    battleBtn.className = "mode-btn";
    battleBtn.textContent = "Battle";
    battleBtn.setAttribute("data-mode", "battle");

    const tournamentBtn = document.createElement("button");
    tournamentBtn.className = "mode-btn active";
    tournamentBtn.textContent = "Tournament";
    tournamentBtn.setAttribute("data-mode", "tournament");

    const setActiveMode = (mode: "battle" | "tournament") => {
      this.currentMode = mode;
      if (mode === "battle") {
        battleBtn.classList.add("active");
        tournamentBtn.classList.remove("active");
      } else {
        tournamentBtn.classList.add("active");
        battleBtn.classList.remove("active");
      }
      this.modeChangeCallback?.(mode);
    };

    battleBtn.addEventListener("click", () => setActiveMode("battle"));
    tournamentBtn.addEventListener("click", () => setActiveMode("tournament"));

    modeToggle.appendChild(battleBtn);
    modeToggle.appendChild(tournamentBtn);
    this.container.appendChild(modeToggle);

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
