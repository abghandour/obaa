import type { Entry } from "../types/index";
import type { RecordedMatch } from "../logic/RecordingSession";
import html2canvas from "html2canvas";
import { SwipeHandler } from "../logic/SwipeHandler";
import type { CurtainState } from "../logic/SwipeHandler";
import {
  iconTrophy, iconClipboard, iconMessage, iconShare,
  iconBan, iconRecord, iconStop,
  iconClose, iconTrash, addRipple, verdictIcon,
} from "./icons";

function preloadImage(url: string): Promise<void> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => resolve();
    img.src = url;
  });
}

export class MatchupScreenView {
  private container: HTMLElement;
  private swipeHandler = new SwipeHandler();

  private optionAElement: HTMLDivElement | null = null;
  private optionBElement: HTMLDivElement | null = null;
  private optionAImage: HTMLImageElement | null = null;
  private optionBImage: HTMLImageElement | null = null;
  private tapCallback: ((option: "a" | "b") => void) | null = null;
  private headerClickCallback: (() => void) | null = null;
  private resultsCallback: (() => void) | null = null;
  private recordCallback: (() => void) | null = null;
  private stopCallback: (() => void) | null = null;
  private ignoreCallback: ((side: "a" | "b") => void) | null = null;
  private recordButton: HTMLButtonElement | null = null;
  private battleCounter: HTMLSpanElement | null = null;
  private recordRow: HTMLDivElement | null = null;
  private topBar: HTMLDivElement | null = null;
  private battleLabel: HTMLSpanElement | null = null;

  constructor(container?: HTMLElement) {
    this.container = container ?? document.getElementById("app") ?? document.body;
  }

  onOptionTap(callback: (option: "a" | "b") => void): void { this.tapCallback = callback; }
  onHeaderClick(callback: () => void): void { this.headerClickCallback = callback; }
  onResultsClick(callback: () => void): void { this.resultsCallback = callback; }
  onRecord(callback: () => void): void { this.recordCallback = callback; }
  onStop(callback: () => void): void { this.stopCallback = callback; }
  onIgnore(callback: (side: "a" | "b") => void): void { this.ignoreCallback = callback; }

  setRecording(active: boolean): void {
    if (!this.recordButton) return;
    this.recordButton.innerHTML = active ? `${iconStop}<span>Stop</span>` : `${iconRecord}<span>Record</span>`;
    this.recordButton.classList.toggle("recording", active);
    if (this.battleCounter) {
      if (!active) {
        this.battleCounter.textContent = "";
        if (this.battleLabel) this.battleLabel.style.display = "none";
      } else if (this.battleLabel) {
        this.battleLabel.style.display = "";
      }
    }
    if (this.topBar) {
      this.topBar.classList.toggle("disabled", active);
    }
  }

  updateBattleCount(count: number): void {
    if (this.battleCounter) {
      this.battleCounter.textContent = String(count);
    }
  }

  setReplayProgress(current: number, total: number): void {
    if (!this.recordRow) return;
    this.recordRow.innerHTML = "";
    const label = document.createElement("span");
    label.className = "replay-progress";
    label.textContent = `Match ${current} / ${total}`;
    this.recordRow.appendChild(label);
  }

  showRecordButton(): void {
    if (!this.recordRow) return;
    this.recordRow.innerHTML = "";
    const recordButton = document.createElement("button");
    recordButton.className = "record-button";
    recordButton.innerHTML = `${iconRecord}<span>Record</span>`;
    recordButton.addEventListener("click", () => {
      if (recordButton.classList.contains("recording")) {
        this.stopCallback?.();
      } else {
        this.recordCallback?.();
      }
    });
    addRipple(recordButton);
    this.recordButton = recordButton;
    const counter = document.createElement("span");
    counter.className = "battle-counter";
    counter.textContent = "";
    this.battleCounter = counter;
    const label = document.createElement("span");
    label.className = "battle-label";
    label.textContent = "Matches";
    label.style.display = "none";
    this.battleLabel = label;
    this.recordRow.appendChild(recordButton);
    const meta = document.createElement("div");
    meta.className = "record-meta";
    meta.appendChild(label);
    meta.appendChild(counter);
    this.recordRow.appendChild(meta);
  }

  async preloadEntries(optionA: Entry, optionB: Entry): Promise<void> {
    await Promise.all([preloadImage(optionA.imageUrl), preloadImage(optionB.imageUrl)]);
  }

  render(battleground: string, arena: string, optionA: Entry, optionB: Entry): void {
    this.container.innerHTML = "";

    const topBar = document.createElement("div");
    topBar.className = "matchup-top-bar";

    const header = document.createElement("h1");
    header.className = "matchup-header";
    header.textContent = `${battleground} › ${arena}`;
    header.style.cursor = "pointer";
    header.addEventListener("click", () => this.headerClickCallback?.());

    const resultsBtn = document.createElement("button");
    resultsBtn.className = "results-button";
    resultsBtn.innerHTML = iconTrophy;
    resultsBtn.title = "Results";
    resultsBtn.addEventListener("click", () => this.resultsCallback?.());
    addRipple(resultsBtn);

    topBar.appendChild(header);
    topBar.appendChild(resultsBtn);
    this.topBar = topBar;
    this.container.appendChild(topBar);

    const matchupArea = document.createElement("div");
    matchupArea.className = "matchup-area";

    this.optionAElement = this.createOptionElement(optionA, "a");
    this.optionBElement = this.createOptionElement(optionB, "b");
    matchupArea.appendChild(this.optionAElement);
    matchupArea.appendChild(this.optionBElement);
    this.container.appendChild(matchupArea);

    const labelsRow = document.createElement("div");
    labelsRow.className = "labels-row";

    const colA = document.createElement("div");
    colA.className = "label-col";
    const labelA = document.createElement("span");
    labelA.className = "option-label";
    labelA.innerHTML = optionA.name.replace(/\s*-\s*/g, "<br>");
    const ignoreLeftBtn = document.createElement("button");
    ignoreLeftBtn.className = "ignore-button";
    ignoreLeftBtn.innerHTML = `${iconBan}<span>Don't Know</span>`;
    ignoreLeftBtn.addEventListener("click", () => this.ignoreCallback?.("a"));
    addRipple(ignoreLeftBtn);
    colA.append(labelA, ignoreLeftBtn);

    const colB = document.createElement("div");
    colB.className = "label-col";
    const labelB = document.createElement("span");
    labelB.className = "option-label";
    labelB.innerHTML = optionB.name.replace(/\s*-\s*/g, "<br>");
    const ignoreRightBtn = document.createElement("button");
    ignoreRightBtn.className = "ignore-button";
    ignoreRightBtn.innerHTML = `${iconBan}<span>Don't Know</span>`;
    ignoreRightBtn.addEventListener("click", () => this.ignoreCallback?.("b"));
    addRipple(ignoreRightBtn);
    colB.append(labelB, ignoreRightBtn);

    labelsRow.append(colA, colB);
    this.container.appendChild(labelsRow);

    this.optionAImage = this.optionAElement.querySelector<HTMLImageElement>(".option-image");
    this.optionBImage = this.optionBElement.querySelector<HTMLImageElement>(".option-image");

    this.optionAElement.style.clipPath = "inset(0 50% 0 0)";
    this.optionBElement.style.clipPath = "inset(0 0 0 50%)";

    this.swipeHandler.attach(matchupArea);

    const recordRow = document.createElement("div");
    recordRow.className = "record-row";
    this.recordRow = recordRow;

    const recordButton = document.createElement("button");
    recordButton.className = "record-button";
    recordButton.innerHTML = `${iconRecord}<span>Record</span>`;
    recordButton.addEventListener("click", () => {
      if (recordButton.classList.contains("recording")) {
        this.stopCallback?.();
      } else {
        this.recordCallback?.();
      }
    });
    addRipple(recordButton);
    this.recordButton = recordButton;

    const counter = document.createElement("span");
    counter.className = "battle-counter";
    counter.textContent = "";
    this.battleCounter = counter;

    const label = document.createElement("span");
    label.className = "battle-label";
    label.textContent = "Matches";
    label.style.display = "none";
    this.battleLabel = label;

    recordRow.appendChild(recordButton);

    const meta = document.createElement("div");
    meta.className = "record-meta";
    meta.appendChild(label);
    meta.appendChild(counter);
    recordRow.appendChild(meta);
    this.container.appendChild(recordRow);
  }

  applyCurtainClip(state: CurtainState): void {
    const { revealing, progress } = state;
    const clipPercent = 50 * (1 - (revealing ? progress : 0));

    if (this.optionAElement) {
      const rightClip = revealing === "a" ? clipPercent : 50;
      this.optionAElement.style.clipPath = `inset(0 ${rightClip}% 0 0)`;
      this.optionAElement.style.zIndex = revealing === "a" ? "2" : "1";
    }
    if (this.optionBElement) {
      const leftClip = revealing === "b" ? clipPercent : 50;
      this.optionBElement.style.clipPath = `inset(0 0 0 ${leftClip}%)`;
      this.optionBElement.style.zIndex = revealing === "b" ? "2" : "1";
    }
  }

  resetCurtain(): void {
    if (this.optionAElement) {
      this.optionAElement.style.transition = "clip-path 0.3s ease-out";
      this.optionAElement.style.clipPath = "inset(0 50% 0 0)";
      this.optionAElement.style.zIndex = "1";
    }
    if (this.optionBElement) {
      this.optionBElement.style.transition = "clip-path 0.3s ease-out";
      this.optionBElement.style.clipPath = "inset(0 0 0 50%)";
      this.optionBElement.style.zIndex = "1";
    }
    setTimeout(() => {
      if (this.optionAElement) this.optionAElement.style.transition = "";
      if (this.optionBElement) this.optionBElement.style.transition = "";
    }, 300);
  }

  showResultsModal(results: Array<{ name: string; wins: number }>, arenaName: string, onClearHistory?: () => void): void {
    document.querySelector(".results-overlay")?.remove();

    const overlay = document.createElement("div");
    overlay.className = "results-overlay";
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) overlay.remove();
    });

    const modal = document.createElement("div");
    modal.className = "results-modal";

    const title = document.createElement("h2");
    title.className = "results-title";
    title.textContent = `${arenaName} — Results`;
    modal.appendChild(title);

    if (results.length === 0) {
      const empty = document.createElement("p");
      empty.className = "results-empty";
      empty.textContent = "No battles yet.";
      modal.appendChild(empty);
    } else {
      const table = document.createElement("table");
      table.className = "recording-table results-leaderboard";
      for (const entry of results) {
        const tr = document.createElement("tr");
        const tdName = document.createElement("td");
        tdName.textContent = entry.name;
        const tdWins = document.createElement("td");
        tdWins.className = "results-wins";
        tdWins.textContent = `${entry.wins}`;
        tr.append(tdName, tdWins);
        table.appendChild(tr);
      }
      modal.appendChild(table);
    }

    const btnRow = document.createElement("div");
    btnRow.className = "results-btn-row";

    if (onClearHistory) {
      const clearBtn = document.createElement("button");
      clearBtn.className = "results-clear";
      clearBtn.innerHTML = `${iconTrash}<span>Clear History</span>`;
      clearBtn.addEventListener("click", () => {
        if (confirm(`Clear all battle history for ${arenaName}?`)) {
          onClearHistory();
          overlay.remove();
        }
      });
      addRipple(clearBtn);
      btnRow.appendChild(clearBtn);
    }

    const closeBtn = document.createElement("button");
    closeBtn.className = "results-close";
    closeBtn.innerHTML = `${iconClose}<span>Close</span>`;
    closeBtn.addEventListener("click", () => overlay.remove());
    addRipple(closeBtn);
    btnRow.appendChild(closeBtn);

    modal.appendChild(btnRow);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
  }

  showRecordingModal(matches: RecordedMatch[], arenaName: string, shareUrl: string, onCopy: () => void): void {
    document.querySelector(".results-overlay")?.remove();

    const overlay = document.createElement("div");
    overlay.className = "results-overlay";
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) overlay.remove();
    });

    const modal = document.createElement("div");
    modal.className = "results-modal recording-modal";

    const titleRow = document.createElement("div");
    titleRow.className = "recording-modal-header";
    const title = document.createElement("h2");
    title.className = "results-title";
    title.textContent = "Recording Results";

    const shareGroup = document.createElement("div");
    shareGroup.className = "share-group";

    const copyBtn = document.createElement("button");
    copyBtn.className = "share-button";
    copyBtn.innerHTML = iconClipboard;
    copyBtn.title = "Copy link";
    copyBtn.addEventListener("click", () => onCopy());
    addRipple(copyBtn);

    const messageText = `Hey I would like to battle you at ${arenaName} ${shareUrl}`;

    const msgBtn = document.createElement("button");
    msgBtn.className = "share-button";
    msgBtn.innerHTML = iconMessage;
    msgBtn.title = "Message";
    msgBtn.addEventListener("click", () => {
      window.open(`sms:?&body=${encodeURIComponent(messageText)}`, "_self");
    });
    addRipple(msgBtn);

    const xBtn = document.createElement("button");
    xBtn.className = "share-button";
    xBtn.innerHTML = iconShare;
    xBtn.title = "Post on X";
    xBtn.addEventListener("click", () => {
      window.open(`https://x.com/intent/tweet?text=${encodeURIComponent(messageText)}`, "_blank");
    });
    addRipple(xBtn);

    shareGroup.append(copyBtn, msgBtn, xBtn);
    titleRow.appendChild(title);
    titleRow.appendChild(shareGroup);
    modal.appendChild(titleRow);

    const table = document.createElement("table");
    table.className = "recording-table";
    for (const m of matches) {
      const tr = document.createElement("tr");
      const tdA = document.createElement("td");
      tdA.textContent = m.entryA;
      if (m.winner === m.entryA) tdA.className = "recording-winner";
      const tdB = document.createElement("td");
      tdB.textContent = m.entryB;
      if (m.winner === m.entryB) tdB.className = "recording-winner";
      tr.append(tdA, tdB);
      table.appendChild(tr);
    }
    modal.appendChild(table);

    const closeBtn = document.createElement("button");
    closeBtn.className = "results-close";
    closeBtn.innerHTML = `${iconClose}<span>Close</span>`;
    closeBtn.addEventListener("click", () => overlay.remove());
    addRipple(closeBtn);
    modal.appendChild(closeBtn);

    overlay.appendChild(modal);
    document.body.appendChild(overlay);
  }

  showReplayResult(score: number, verdict: string, matches: RecordedMatch[], userMatches: RecordedMatch[], arenaName: string, onClose?: () => void): void {
    document.querySelector(".results-overlay")?.remove();

    const overlay = document.createElement("div");
    overlay.className = "results-overlay";
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) { overlay.remove(); onClose?.(); }
    });

    const modal = document.createElement("div");
    modal.className = "results-modal replay-verdict";

    const title = document.createElement("h2");
    title.className = "results-title";
    title.innerHTML = `${verdictIcon(score)}${verdict}`;
    modal.appendChild(title);

    const scoreEl = document.createElement("div");
    scoreEl.className = "replay-score";
    scoreEl.textContent = `Jaccard Similarity: ${score}%`;
    modal.appendChild(scoreEl);

    const table = document.createElement("table");
    table.className = "recording-table";
    const thead = document.createElement("tr");
    thead.innerHTML = "<th>Match</th><th>Original</th><th>You</th><th></th>";
    table.appendChild(thead);
    for (let i = 0; i < matches.length; i++) {
      const orig = matches[i]!;
      const user = userMatches[i];
      const tr = document.createElement("tr");
      const tdMatch = document.createElement("td");
      tdMatch.textContent = `${orig.entryA} vs ${orig.entryB}`;
      const tdOrig = document.createElement("td");
      tdOrig.textContent = orig.winner;
      const tdUser = document.createElement("td");
      tdUser.textContent = user?.winner ?? "—";
      const tdIcon = document.createElement("td");
      tdIcon.textContent = user && user.winner === orig.winner ? "✓" : "✗";
      tdIcon.className = user && user.winner === orig.winner ? "match-agree" : "match-disagree";
      tr.append(tdMatch, tdOrig, tdUser, tdIcon);
      table.appendChild(tr);
    }
    modal.appendChild(table);

    const lines: string[] = [`${arenaName} — ${verdict} (${score}%)\n`];
    for (let i = 0; i < matches.length; i++) {
      const orig = matches[i]!;
      const user = userMatches[i];
      const agree = user && user.winner === orig.winner ? "✓" : "✗";
      lines.push(`${orig.entryA} vs ${orig.entryB} → Original: ${orig.winner} | You: ${user?.winner ?? "—"} ${agree}`);
    }
    const resultText = lines.join("\n");

    const shareGroup = document.createElement("div");
    shareGroup.className = "share-group verdict-share";

    const copyBtn = document.createElement("button");
    copyBtn.className = "share-button";
    copyBtn.innerHTML = iconClipboard;
    copyBtn.title = "Copy results";
    copyBtn.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(resultText);
        alert("Copied to clipboard!");
      } catch {
        prompt("Copy this:", resultText);
      }
    });
    addRipple(copyBtn);

    const msgBtn = document.createElement("button");
    msgBtn.className = "share-button";
    msgBtn.innerHTML = iconMessage;
    msgBtn.title = "Message";
    msgBtn.addEventListener("click", async () => {
      try {
        // Hide share buttons temporarily for a clean screenshot
        shareGroup.style.visibility = "hidden";
        closeBtn.style.visibility = "hidden";

        const canvas = await html2canvas(modal, {
          backgroundColor: "#161628",
          scale: 2,
          useCORS: true,
        });

        shareGroup.style.visibility = "";
        closeBtn.style.visibility = "";

        const blob = await new Promise<Blob | null>((res) =>
          canvas.toBlob(res, "image/png")
        );
        if (!blob) {
          window.open(`sms:?&body=${encodeURIComponent(resultText)}`, "_self");
          return;
        }

        if (navigator.share) {
          const file = new File([blob], "verdict.png", { type: "image/png" });
          await navigator.share({ files: [file] });
        } else {
          // Fallback: download + open SMS
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = "verdict.png";
          a.click();
          URL.revokeObjectURL(url);
          window.open(`sms:?&body=${encodeURIComponent(resultText)}`, "_self");
        }
      } catch {
        window.open(`sms:?&body=${encodeURIComponent(resultText)}`, "_self");
      }
    });
    addRipple(msgBtn);

    const xBtn = document.createElement("button");
    xBtn.className = "share-button";
    xBtn.innerHTML = iconShare;
    xBtn.title = "Post on X";
    xBtn.addEventListener("click", () => {
      window.open(`https://x.com/intent/tweet?text=${encodeURIComponent(resultText)}`, "_blank");
    });
    addRipple(xBtn);

    shareGroup.append(copyBtn, msgBtn, xBtn);
    modal.appendChild(shareGroup);

    const closeBtn = document.createElement("button");
    closeBtn.className = "results-close";
    closeBtn.innerHTML = `${iconClose}<span>Close</span>`;
    closeBtn.addEventListener("click", () => { overlay.remove(); onClose?.(); });
    addRipple(closeBtn);
    modal.appendChild(closeBtn);

    overlay.appendChild(modal);
    document.body.appendChild(overlay);
  }

  showExhaustedMessage(message: string): void {
    this.swipeHandler.detach();
    this.container.innerHTML = "";
    const msgElement = document.createElement("div");
    msgElement.className = "exhausted-message";
    msgElement.textContent = message;
    this.container.appendChild(msgElement);
  }

  getSwipeHandler(): SwipeHandler { return this.swipeHandler; }
  getOptionAElement(): HTMLDivElement | null { return this.optionAElement; }
  getOptionBElement(): HTMLDivElement | null { return this.optionBElement; }
  getOptionAImage(): HTMLImageElement | null { return this.optionAImage; }
  getOptionBImage(): HTMLImageElement | null { return this.optionBImage; }

  /** Set a temporary background image on the matchup area (used during slide-down transitions). */
  setMatchupBackground(imageUrl: string | null): void {
    const area = this.container.querySelector<HTMLElement>(".matchup-area");
    if (!area) return;
    if (imageUrl) {
      area.style.backgroundImage = `url(${imageUrl})`;
      area.style.backgroundSize = "cover";
      area.style.backgroundPosition = "center";
    } else {
      area.style.backgroundImage = "";
      area.style.backgroundSize = "";
      area.style.backgroundPosition = "";
    }
  }

  /**
   * Replace only the loser's side with a new contender element,
   * keeping the winner fully visible in place.
   * Returns the new contender element for animation.
   */
  swapContender(contender: Entry, loserSide: "a" | "b"): HTMLDivElement {
    const area = this.container.querySelector<HTMLElement>(".matchup-area");
    if (!area) throw new Error("No matchup area found");

    // Make winner fully visible (no clip-path)
    const winnerEl = loserSide === "a" ? this.optionBElement : this.optionAElement;
    if (winnerEl) {
      winnerEl.style.clipPath = "none";
      winnerEl.style.zIndex = "1";
    }

    // Create new contender on the loser's side with its curtain clip-path
    const side = loserSide;
    const newEl = this.createOptionElement(contender, side);
    newEl.style.clipPath = side === "a" ? "inset(0 50% 0 0)" : "inset(0 0 0 50%)";
    newEl.style.zIndex = "10";
    area.appendChild(newEl);

    // Update label for the replaced side
    const labels = this.container.querySelectorAll<HTMLElement>(".option-label");
    const labelIdx = side === "a" ? 0 : 1;
    if (labels[labelIdx]) labels[labelIdx]!.innerHTML = contender.name.replace(/\s*-\s*/g, "<br>");

    // Update refs
    if (side === "a") {
      this.optionAElement = newEl;
      this.optionAImage = newEl.querySelector<HTMLImageElement>(".option-image");
    } else {
      this.optionBElement = newEl;
      this.optionBImage = newEl.querySelector<HTMLImageElement>(".option-image");
    }

    return newEl;
  }

  /**
   * Swap the option entries inside the existing matchup area.
   * Old options stay visible underneath while new ones are added on top
   * (ready for a slide-down animation). Also updates labels.
   * Returns the new option elements for animation.
   */
  swapMatchupEntries(optionA: Entry, optionB: Entry): { newA: HTMLDivElement; newB: HTMLDivElement } {
    const area = this.container.querySelector<HTMLElement>(".matchup-area");
    if (!area) throw new Error("No matchup area found");

    // Make old options fully visible as background (remove clip-path)
    if (this.optionAElement) {
      this.optionAElement.style.clipPath = "none";
      this.optionAElement.style.zIndex = "1";
    }
    if (this.optionBElement) {
      this.optionBElement.style.clipPath = "none";
      this.optionBElement.style.zIndex = "1";
    }

    // Create new option elements on top with curtain clip-path so both
    // halves are visible side-by-side as they slide down together.
    const newA = this.createOptionElement(optionA, "a");
    const newB = this.createOptionElement(optionB, "b");
    newA.style.clipPath = "inset(0 50% 0 0)";
    newB.style.clipPath = "inset(0 0 0 50%)";
    newA.style.zIndex = "10";
    newB.style.zIndex = "10";

    area.appendChild(newA);
    area.appendChild(newB);

    // Update labels
    const labels = this.container.querySelectorAll<HTMLElement>(".option-label");
    if (labels[0]) labels[0].innerHTML = optionA.name.replace(/\s*-\s*/g, "<br>");
    if (labels[1]) labels[1].innerHTML = optionB.name.replace(/\s*-\s*/g, "<br>");

    // Store references — old elements will be cleaned up after animation
    this.optionAElement = newA;
    this.optionBElement = newB;
    this.optionAImage = newA.querySelector<HTMLImageElement>(".option-image");
    this.optionBImage = newB.querySelector<HTMLImageElement>(".option-image");

    return { newA, newB };
  }

  /**
   * Remove only the old element for a specific side (used after swapContender).
   * The new element for that side has already been appended and stored in the ref.
   * Also restores curtain clip-path on both current elements.
   */
  cleanupLoserElement(): void {
    const area = this.container.querySelector<HTMLElement>(".matchup-area");
    if (!area) return;
    const all = area.querySelectorAll<HTMLElement>(".option-container");
    all.forEach(el => {
      if (el !== this.optionAElement && el !== this.optionBElement) {
        el.remove();
      }
    });
    // Restore curtain clip-path and z-index
    if (this.optionAElement) {
      this.optionAElement.style.clipPath = "inset(0 50% 0 0)";
      this.optionAElement.style.zIndex = "1";
    }
    if (this.optionBElement) {
      this.optionBElement.style.clipPath = "inset(0 0 0 50%)";
      this.optionBElement.style.zIndex = "1";
    }
  }

  /**
   * Remove old (stale) option containers from the matchup area,
   * keeping only the current ones. Resets z-index.
   */
  cleanupOldOptions(): void {
    const area = this.container.querySelector<HTMLElement>(".matchup-area");
    if (!area) return;
    const allContainers = area.querySelectorAll<HTMLElement>(".option-container");
    // Keep only the last two (the new ones)
    for (let i = 0; i < allContainers.length - 2; i++) {
      allContainers[i]!.remove();
    }
    // Reset z-index now that old elements are gone
    if (this.optionAElement) {
      this.optionAElement.style.zIndex = "1";
    }
    if (this.optionBElement) {
      this.optionBElement.style.zIndex = "1";
    }
  }

  private createOptionElement(entry: Entry, side: "a" | "b"): HTMLDivElement {
    const el = document.createElement("div");
    el.className = `option-container option-${side}`;
    const img = document.createElement("img");
    img.className = "option-image";
    img.src = entry.imageUrl;
    img.alt = entry.name;
    img.addEventListener("click", () => this.tapCallback?.(side));
    el.appendChild(img);
    return el;
  }
}
