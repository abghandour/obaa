import type { Entry, TournamentRound } from "../types/index";
import { MatchupScreenView } from "./MatchupScreenView";
import { BracketSvgView } from "./BracketSvgView";
import { addFastTap, addRipple } from "./icons";

/**
 * Wraps MatchupScreenView to add tournament-specific UI:
 * - Round label display ("{roundName} - Match {n} of {total}")
 * - Replace buttons for the first round (instead of "Don't Know")
 */
export class TournamentMatchupView {
  private matchupView: MatchupScreenView;
  private container: HTMLElement;
  private roundLabelEl: HTMLElement | null = null;
  private replaceCallback: ((side: "a" | "b") => void) | null = null;
  private replaceBtnA: HTMLButtonElement | null = null;
  private replaceBtnB: HTMLButtonElement | null = null;
  private isFirstRound: boolean = true;
  private bracketMiniEl: HTMLElement | null = null;

  constructor(container?: HTMLElement) {
    this.container =
      container ?? document.getElementById("app") ?? document.body;
    this.matchupView = new MatchupScreenView(this.container);
  }

  /** Get the underlying MatchupScreenView for wiring existing callbacks. */
  getMatchupView(): MatchupScreenView {
    return this.matchupView;
  }

  /** Register callback for replace button clicks. */
  onReplace(callback: (side: "a" | "b") => void): void {
    this.replaceCallback = callback;
  }

  /** Update the round label text. */
  setRoundLabel(
    roundName: string,
    matchNumber: number,
    totalMatches: number,
  ): void {
    if (this.roundLabelEl) {
      this.roundLabelEl.textContent = `${roundName} - Match ${matchNumber} of ${totalMatches}`;
    }
  }

  /** Update the mini bracket SVG shown below the round label. */
  updateMiniBracket(
    rounds: TournamentRound[],
    currentRound: number,
    currentMatch: number,
  ): void {
    // Remove existing mini bracket
    this.container.querySelector(".bracket-svg-mini")?.remove();

    const mini = BracketSvgView.createMini(rounds, currentRound, currentMatch);
    this.bracketMiniEl = mini;

    // Insert after the round label
    if (this.roundLabelEl) {
      this.roundLabelEl.insertAdjacentElement("afterend", mini);
    }
  }

  /** Enable or disable replacement buttons. */
  setReplacementEnabled(enabled: boolean): void {
    this.isFirstRound = enabled;
    if (this.replaceBtnA) {
      this.replaceBtnA.disabled = !enabled;
      this.replaceBtnA.style.display = enabled ? "" : "none";
    }
    if (this.replaceBtnB) {
      this.replaceBtnB.disabled = !enabled;
      this.replaceBtnB.style.display = enabled ? "" : "none";
    }
  }

  /**
   * Render a tournament match.
   * Delegates to MatchupScreenView.render() then adds tournament UI.
   */
  render(
    battleground: string,
    arena: string,
    optionA: Entry,
    optionB: Entry,
  ): void {
    this.matchupView.render(battleground, arena, optionA, optionB);

    // Hide the record row — tournaments are always recorded implicitly
    const recordRow = this.container.querySelector<HTMLElement>(".record-row");
    if (recordRow) recordRow.style.display = "none";

    this.injectRoundLabel();
    this.injectReplaceButtons();
  }

  /* ── private helpers ─────────────────────────────────── */

  /** Insert the round label element at the top of the matchup screen. */
  private injectRoundLabel(): void {
    const topBar = this.container.querySelector(".matchup-top-bar");
    if (!topBar) return;

    // Remove any existing round label
    this.container.querySelector(".round-label")?.remove();

    const label = document.createElement("div");
    label.className = "round-label";
    label.textContent = "";
    this.roundLabelEl = label;

    // Insert right after the top bar
    topBar.insertAdjacentElement("afterend", label);
  }

  /**
   * Replace the "Don't Know" ignore buttons with "Replace" buttons
   * when in the first round, or hide them otherwise.
   */
  private injectReplaceButtons(): void {
    const ignoreButtons =
      this.container.querySelectorAll<HTMLButtonElement>(".ignore-button");

    ignoreButtons.forEach((btn) => {
      btn.style.display = "none";
    });

    // Find the label columns to append replace buttons
    const labelCols =
      this.container.querySelectorAll<HTMLElement>(".label-col");

    // Side A replace button
    if (labelCols[0]) {
      this.replaceBtnA = this.createReplaceButton("a");
      labelCols[0].appendChild(this.replaceBtnA);
    }

    // Side B replace button
    if (labelCols[1]) {
      this.replaceBtnB = this.createReplaceButton("b");
      labelCols[1].appendChild(this.replaceBtnB);
    }

    // Apply current first-round state
    this.setReplacementEnabled(this.isFirstRound);
  }

  private createReplaceButton(side: "a" | "b"): HTMLButtonElement {
    const btn = document.createElement("button");
    btn.className = "replace-button";
    btn.innerHTML = `<span>Replace</span>`;
    addFastTap(btn, () => this.replaceCallback?.(side));
    addRipple(btn);
    return btn;
  }
}
