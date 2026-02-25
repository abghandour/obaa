import type { Entry, TournamentRound } from "../types/index";
import { addFastTap, addRipple, iconClose, iconShare } from "./icons";

/**
 * Popup overlay that displays the full tournament bracket tree.
 * Shows rounds as columns, match boxes with entries and highlighted winners,
 * the champion at the top, and share/dismiss buttons.
 */
export class BracketView {
  private overlay: HTMLElement | null = null;
  private shareCallback: (() => void) | null = null;
  private dismissCallback: (() => void) | null = null;

  constructor(private container: HTMLElement) {}

  onShare(callback: () => void): void {
    this.shareCallback = callback;
  }

  onDismiss(callback: () => void): void {
    this.dismissCallback = callback;
  }

  /** Show the bracket popup with the given rounds and champion. */
  show(rounds: TournamentRound[], champion: Entry | null): void {
    this.hide(); // remove any existing overlay

    // 1. Full-screen overlay
    const overlay = document.createElement("div");
    overlay.className = "bracket-overlay";
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) this.dismissCallback?.();
    });
    this.overlay = overlay;

    // 2. Scrollable bracket container
    const container = document.createElement("div");
    container.className = "bracket-container";
    container.addEventListener("click", (e) => e.stopPropagation());
    overlay.appendChild(container);

    // 3. Champion display
    if (champion) {
      const champEl = document.createElement("div");
      champEl.className = "bracket-champion";
      champEl.innerHTML = `
        <img class="bracket-champion-img" src="${champion.imageUrl}" alt="${champion.name}" />
        <div class="bracket-champion-name">${champion.name}</div>
        <div class="bracket-champion-label">Champion</div>
      `;
      container.appendChild(champEl);
    }

    // 4. Rounds as columns
    const roundsRow = document.createElement("div");
    roundsRow.className = "bracket-rounds";

    for (const round of rounds) {
      const roundCol = document.createElement("div");
      roundCol.className = "bracket-round";

      const roundHeader = document.createElement("div");
      roundHeader.className = "bracket-round-name";
      roundHeader.textContent = round.name;
      roundCol.appendChild(roundHeader);

      for (const match of round.matches) {
        const matchBox = document.createElement("div");
        matchBox.className = "bracket-match";

        const entryAEl = document.createElement("div");
        entryAEl.className = "bracket-entry";
        entryAEl.textContent = match.entryA?.name ?? "TBD";
        if (match.winner && match.entryA && match.winner.name === match.entryA.name) {
          entryAEl.classList.add("winner");
        }

        const entryBEl = document.createElement("div");
        entryBEl.className = "bracket-entry";
        entryBEl.textContent = match.entryB?.name ?? "TBD";
        if (match.winner && match.entryB && match.winner.name === match.entryB.name) {
          entryBEl.classList.add("winner");
        }

        matchBox.appendChild(entryAEl);
        matchBox.appendChild(entryBEl);
        roundCol.appendChild(matchBox);
      }

      roundsRow.appendChild(roundCol);
    }

    container.appendChild(roundsRow);

    // 5. Button row
    const btnRow = document.createElement("div");
    btnRow.className = "bracket-btn-row";

    const shareBtn = document.createElement("button");
    shareBtn.className = "bracket-share-btn";
    shareBtn.innerHTML = `${iconShare}<span>Share</span>`;
    addFastTap(shareBtn, () => this.shareCallback?.());
    addRipple(shareBtn);

    const closeBtn = document.createElement("button");
    closeBtn.className = "bracket-close-btn";
    closeBtn.innerHTML = `${iconClose}<span>Close</span>`;
    addFastTap(closeBtn, () => this.dismissCallback?.());
    addRipple(closeBtn);

    btnRow.appendChild(shareBtn);
    btnRow.appendChild(closeBtn);
    container.appendChild(btnRow);

    this.container.appendChild(overlay);
  }

  /** Remove the bracket popup from the DOM. */
  hide(): void {
    if (this.overlay) {
      this.overlay.remove();
      this.overlay = null;
    }
  }
}
