import type { TournamentRound, Entry } from "../types/index";
import html2canvas from "html2canvas";
import { addFastTap, addRipple, iconClose, iconClipboard, iconMessage } from "./icons";

const NS = "http://www.w3.org/2000/svg";

interface MatchPos {
  roundIndex: number;
  matchIndex: number;
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Renders an SVG tournament bracket in the classic "tree" style.
 * Left half feeds into center finals, right half mirrors.
 *
 * Supports two modes:
 * - mini: compact version shown inline during gameplay
 * - full: large version shown in a modal at tournament end
 */
export class BracketSvgView {
  /**
   * Build the SVG element for a bracket.
   */
  static buildSvg(
    rounds: TournamentRound[],
    opts: {
      highlightRound?: number;
      highlightMatch?: number;
      compact?: boolean;
      champion?: Entry | null;
    } = {},
  ): SVGSVGElement {
    const { highlightRound, highlightMatch, compact = false, champion } = opts;
    const totalRounds = rounds.length;
    if (totalRounds === 0) return document.createElementNS(NS, "svg");

    // Layout constants
    const matchW = compact ? 60 : 120;
    const matchH = compact ? 16 : 28;
    const matchGapY = compact ? 4 : 8;
    const roundGapX = compact ? 20 : 40;
    const fontSize = compact ? 6 : 10;
    const lineWidth = compact ? 1 : 1.5;
    const labelFontSize = compact ? 5 : 9;
    const champFontSize = compact ? 7 : 12;

    // Split rounds into left half and right half (mirrored)
    // For a 16-bracket: Rd16(8 matches) → Rd8(4) → Semi(2) → Finals(1)
    // Left side gets top half of matches, right side gets bottom half
    // We'll do a single-elimination left-to-right layout

    const firstRoundMatches = rounds[0]?.matches.length ?? 0;
    const halfMatches = Math.ceil(firstRoundMatches / 2);

    // Calculate dimensions
    // Each side has halfMatches in round 0
    const sideHeight = halfMatches * (matchH + matchGapY) * Math.pow(2, 0) - matchGapY;
    const totalHeight = Math.max(sideHeight, 100) + (compact ? 20 : 60);

    // Width: left rounds + center finals + right rounds
    const sideRounds = totalRounds - 1; // rounds before finals
    const sideWidth = sideRounds * (matchW + roundGapX);
    const centerWidth = matchW + roundGapX * 2;
    const totalWidth = sideWidth * 2 + centerWidth;

    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("viewBox", `0 0 ${totalWidth} ${totalHeight}`);
    svg.setAttribute("width", "100%");
    svg.setAttribute("height", "100%");
    svg.style.display = "block";

    // Background
    const bg = document.createElementNS(NS, "rect");
    bg.setAttribute("width", String(totalWidth));
    bg.setAttribute("height", String(totalHeight));
    bg.setAttribute("fill", "transparent");
    svg.appendChild(bg);

    const positions: MatchPos[] = [];

    // Helper: compute Y positions for matches in a round on one side
    function computeYPositions(matchCount: number, parentPositions?: number[]): number[] {
      if (!parentPositions) {
        // First round: evenly spaced
        const blockH = matchH + matchGapY;
        const totalBlockH = matchCount * blockH - matchGapY;
        const offsetY = (totalHeight - totalBlockH) / 2;
        return Array.from({ length: matchCount }, (_, i) => offsetY + i * blockH);
      }
      // Subsequent rounds: centered between their two feeder matches
      return Array.from({ length: matchCount }, (_, i) => {
        const y1 = parentPositions[i * 2] ?? 0;
        const y2 = parentPositions[i * 2 + 1] ?? y1;
        return (y1 + y2) / 2;
      });
    }

    // --- LEFT SIDE (top half of bracket, rounds flow left→right) ---
    const leftYByRound: number[][] = [];
    for (let r = 0; r < sideRounds; r++) {
      const round = rounds[r];
      if (!round) continue;
      // Left side takes first half of matches in each round
      const matchesInRound = Math.ceil(round.matches.length / 2);
      const yPositions = computeYPositions(
        matchesInRound,
        r > 0 ? leftYByRound[r - 1] : undefined,
      );
      leftYByRound.push(yPositions);

      const x = r * (matchW + roundGapX);

      // Round label
      const labelY = (compact ? 4 : 12);
      const label = document.createElementNS(NS, "text");
      label.setAttribute("x", String(x + matchW / 2));
      label.setAttribute("y", String(labelY));
      label.setAttribute("text-anchor", "middle");
      label.setAttribute("fill", "rgba(148,163,184,0.6)");
      label.setAttribute("font-size", String(labelFontSize));
      label.setAttribute("font-family", "Inter, sans-serif");
      label.textContent = round.name;
      svg.appendChild(label);

      for (let m = 0; m < matchesInRound; m++) {
        const match = round.matches[m];
        if (!match) continue;
        const y = yPositions[m]!;

        const isHighlighted = highlightRound === r && highlightMatch === match.matchIndex;
        drawMatchBox(svg, x, y, matchW, matchH, match, isHighlighted, fontSize, compact);
        positions.push({ roundIndex: r, matchIndex: match.matchIndex, x, y, w: matchW, h: matchH });
      }
    }

    // --- RIGHT SIDE (bottom half of bracket, rounds flow right→left) ---
    const rightYByRound: number[][] = [];
    for (let r = 0; r < sideRounds; r++) {
      const round = rounds[r];
      if (!round) continue;
      const totalMatchesInRound = round.matches.length;
      const leftCount = Math.ceil(totalMatchesInRound / 2);
      const rightCount = totalMatchesInRound - leftCount;
      if (rightCount === 0) continue;

      const yPositions = computeYPositions(
        rightCount,
        r > 0 ? rightYByRound[r - 1] : undefined,
      );
      rightYByRound.push(yPositions);

      const x = totalWidth - (r + 1) * (matchW + roundGapX) + roundGapX;

      // Round label (right side)
      const labelY = (compact ? 4 : 12);
      const label = document.createElementNS(NS, "text");
      label.setAttribute("x", String(x + matchW / 2));
      label.setAttribute("y", String(labelY));
      label.setAttribute("text-anchor", "middle");
      label.setAttribute("fill", "rgba(148,163,184,0.6)");
      label.setAttribute("font-size", String(labelFontSize));
      label.setAttribute("font-family", "Inter, sans-serif");
      label.textContent = round.name;
      svg.appendChild(label);

      for (let m = 0; m < rightCount; m++) {
        const matchIdx = leftCount + m;
        const match = round.matches[matchIdx];
        if (!match) continue;
        const y = yPositions[m]!;

        const isHighlighted = highlightRound === r && highlightMatch === match.matchIndex;
        drawMatchBox(svg, x, y, matchW, matchH, match, isHighlighted, fontSize, compact);
        positions.push({ roundIndex: r, matchIndex: match.matchIndex, x, y, w: matchW, h: matchH });
      }
    }

    // --- FINALS (center) ---
    if (totalRounds > 0) {
      const finalsRound = rounds[totalRounds - 1];
      if (finalsRound && finalsRound.matches.length > 0) {
        const finalsMatch = finalsRound.matches[0]!;
        const fx = sideWidth + roundGapX;
        const fy = totalHeight / 2 - matchH / 2;

        const isHighlighted = highlightRound === totalRounds - 1 && highlightMatch === 0;
        drawMatchBox(svg, fx, fy, matchW, matchH, finalsMatch, isHighlighted, fontSize, compact);

        // Finals label
        const label = document.createElementNS(NS, "text");
        label.setAttribute("x", String(fx + matchW / 2));
        label.setAttribute("y", String(compact ? 4 : 12));
        label.setAttribute("text-anchor", "middle");
        label.setAttribute("fill", "rgba(148,163,184,0.6)");
        label.setAttribute("font-size", String(labelFontSize));
        label.setAttribute("font-family", "Inter, sans-serif");
        label.textContent = finalsRound.name;
        svg.appendChild(label);

        // Champion label
        if (champion) {
          const champLabel = document.createElementNS(NS, "text");
          champLabel.setAttribute("x", String(fx + matchW / 2));
          champLabel.setAttribute("y", String(fy + matchH + (compact ? 8 : 16)));
          champLabel.setAttribute("text-anchor", "middle");
          champLabel.setAttribute("fill", "#fbbf24");
          champLabel.setAttribute("font-size", String(champFontSize));
          champLabel.setAttribute("font-weight", "700");
          champLabel.setAttribute("font-family", "Inter, sans-serif");
          champLabel.textContent = `🏆 ${champion.name}`;
          svg.appendChild(champLabel);
        }
      }
    }

    // --- Draw connector lines ---
    drawConnectors(svg, rounds, leftYByRound, rightYByRound, {
      matchW, matchH, roundGapX, totalWidth, totalHeight, sideRounds, totalRounds, lineWidth, compact,
      highlightRound, highlightMatch,
    });

    return svg;
  }

  /**
   * Create a mini bracket element to embed in the tournament matchup screen.
   */
  static createMini(
    rounds: TournamentRound[],
    currentRound: number,
    currentMatch: number,
  ): HTMLElement {
    const wrapper = document.createElement("div");
    wrapper.className = "bracket-svg-mini";
    const svg = BracketSvgView.buildSvg(rounds, {
      highlightRound: currentRound,
      highlightMatch: currentMatch,
      compact: true,
    });
    wrapper.appendChild(svg);
    return wrapper;
  }

  /**
   * Show a full-screen modal with the complete bracket.
   * onCopyLink: copies the replay URL to clipboard.
   * onMessage: called to get the share URL; the modal will screenshot the bracket
   *            and share via native share / SMS with the image + link.
   */
  static showModal(
    rounds: TournamentRound[],
    champion: Entry | null,
    opts: {
      shareUrl?: string;
      arenaName?: string;
      onCopyLink?: () => void;
      onDismiss?: () => void;
    } = {},
  ): void {
    const { shareUrl, arenaName, onCopyLink, onDismiss } = opts;

    document.querySelector(".bracket-svg-overlay")?.remove();

    const overlay = document.createElement("div");
    overlay.className = "bracket-svg-overlay";
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) onDismiss?.();
    });

    const modal = document.createElement("div");
    modal.className = "bracket-svg-modal";

    // Champion header
    if (champion) {
      const champEl = document.createElement("div");
      champEl.className = "bracket-champion";
      champEl.innerHTML = `
        <img class="bracket-champion-img" src="${champion.imageUrl}" alt="${champion.name}" />
        <div class="bracket-champion-name">${champion.name}</div>
        <div class="bracket-champion-label">Champion</div>
      `;
      modal.appendChild(champEl);
    }

    // SVG bracket
    const svgContainer = document.createElement("div");
    svgContainer.className = "bracket-svg-container";
    const svg = BracketSvgView.buildSvg(rounds, { champion, compact: false });
    svgContainer.appendChild(svg);
    modal.appendChild(svgContainer);

    // Button row
    const btnRow = document.createElement("div");
    btnRow.className = "bracket-btn-row";

    // Copy link button
    if (onCopyLink) {
      const copyBtn = document.createElement("button");
      copyBtn.className = "bracket-share-btn";
      copyBtn.innerHTML = `${iconClipboard}<span>Copy Link</span>`;
      addFastTap(copyBtn, () => onCopyLink());
      addRipple(copyBtn);
      btnRow.appendChild(copyBtn);
    }

    // Message share button (screenshot + link)
    if (shareUrl) {
      const msgBtn = document.createElement("button");
      msgBtn.className = "bracket-share-btn";
      msgBtn.innerHTML = `${iconMessage}<span>Message</span>`;
      addFastTap(msgBtn, async () => {
        const messageText = `${arenaName ? arenaName + " " : ""}Tournament${champion ? " — Champion: " + champion.name : ""} ${shareUrl}`;
        try {
          // Hide buttons for a clean screenshot
          btnRow.style.visibility = "hidden";
          const canvas = await html2canvas(modal, {
            backgroundColor: "#161628",
            scale: 2,
            useCORS: true,
          });
          btnRow.style.visibility = "";

          const blob = await new Promise<Blob | null>((res) =>
            canvas.toBlob(res, "image/png"),
          );
          if (!blob) {
            window.open(`sms:?&body=${encodeURIComponent(messageText)}`, "_self");
            return;
          }

          if (navigator.share) {
            const file = new File([blob], "bracket.png", { type: "image/png" });
            await navigator.share({ files: [file], text: messageText });
          } else {
            // Fallback: download image + open SMS
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "bracket.png";
            a.click();
            URL.revokeObjectURL(url);
            window.open(`sms:?&body=${encodeURIComponent(messageText)}`, "_self");
          }
        } catch {
          window.open(`sms:?&body=${encodeURIComponent(messageText)}`, "_self");
        }
      });
      addRipple(msgBtn);
      btnRow.appendChild(msgBtn);
    }

    const closeBtn = document.createElement("button");
    closeBtn.className = "bracket-close-btn";
    closeBtn.innerHTML = `${iconClose}<span>Close</span>`;
    addFastTap(closeBtn, () => onDismiss?.());
    addRipple(closeBtn);
    btnRow.appendChild(closeBtn);

    modal.appendChild(btnRow);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
  }

  static hideModal(): void {
    document.querySelector(".bracket-svg-overlay")?.remove();
  }
}


/* ── Private drawing helpers ──────────────────────────────── */

interface ConnectorOpts {
  matchW: number;
  matchH: number;
  roundGapX: number;
  totalWidth: number;
  totalHeight: number;
  sideRounds: number;
  totalRounds: number;
  lineWidth: number;
  compact: boolean;
  highlightRound?: number;
  highlightMatch?: number;
}

function drawMatchBox(
  svg: SVGSVGElement,
  x: number,
  y: number,
  w: number,
  h: number,
  match: { entryA: Entry | null; entryB: Entry | null; winner: Entry | null; matchIndex: number },
  highlighted: boolean,
  fontSize: number,
  compact: boolean,
): void {
  const halfH = h / 2;
  const borderColor = highlighted ? "#fbbf24" : "rgba(255,255,255,0.12)";
  const bgColor = highlighted ? "rgba(251,191,36,0.08)" : "rgba(255,255,255,0.04)";
  const strokeWidth = highlighted ? (compact ? 1.5 : 2) : (compact ? 0.5 : 1);

  // Box background
  const rect = document.createElementNS(NS, "rect");
  rect.setAttribute("x", String(x));
  rect.setAttribute("y", String(y));
  rect.setAttribute("width", String(w));
  rect.setAttribute("height", String(h));
  rect.setAttribute("rx", compact ? "2" : "4");
  rect.setAttribute("fill", bgColor);
  rect.setAttribute("stroke", borderColor);
  rect.setAttribute("stroke-width", String(strokeWidth));
  svg.appendChild(rect);

  // Divider line
  const divider = document.createElementNS(NS, "line");
  divider.setAttribute("x1", String(x));
  divider.setAttribute("y1", String(y + halfH));
  divider.setAttribute("x2", String(x + w));
  divider.setAttribute("y2", String(y + halfH));
  divider.setAttribute("stroke", borderColor);
  divider.setAttribute("stroke-width", String(compact ? 0.3 : 0.5));
  svg.appendChild(divider);

  // Entry A text
  const textA = document.createElementNS(NS, "text");
  textA.setAttribute("x", String(x + (compact ? 2 : 4)));
  textA.setAttribute("y", String(y + halfH / 2 + fontSize * 0.35));
  textA.setAttribute("font-size", String(fontSize));
  textA.setAttribute("font-family", "Inter, sans-serif");
  textA.setAttribute("fill", getEntryColor(match.entryA, match.winner));
  textA.setAttribute("font-weight", isWinner(match.entryA, match.winner) ? "700" : "400");
  textA.textContent = truncateName(match.entryA?.name ?? "TBD", compact ? 10 : 16);
  svg.appendChild(textA);

  // Entry B text
  const textB = document.createElementNS(NS, "text");
  textB.setAttribute("x", String(x + (compact ? 2 : 4)));
  textB.setAttribute("y", String(y + halfH + halfH / 2 + fontSize * 0.35));
  textB.setAttribute("font-size", String(fontSize));
  textB.setAttribute("font-family", "Inter, sans-serif");
  textB.setAttribute("fill", getEntryColor(match.entryB, match.winner));
  textB.setAttribute("font-weight", isWinner(match.entryB, match.winner) ? "700" : "400");
  textB.textContent = truncateName(match.entryB?.name ?? "TBD", compact ? 10 : 16);
  svg.appendChild(textB);

  // Highlight glow
  if (highlighted) {
    const glow = document.createElementNS(NS, "rect");
    glow.setAttribute("x", String(x - 1));
    glow.setAttribute("y", String(y - 1));
    glow.setAttribute("width", String(w + 2));
    glow.setAttribute("height", String(h + 2));
    glow.setAttribute("rx", compact ? "3" : "5");
    glow.setAttribute("fill", "none");
    glow.setAttribute("stroke", "#fbbf24");
    glow.setAttribute("stroke-width", String(compact ? 1 : 1.5));
    glow.setAttribute("opacity", "0.4");
    glow.setAttribute("filter", "url(#glow)");
    svg.appendChild(glow);

    // Add glow filter if not present
    if (!svg.querySelector("#glow")) {
      const defs = document.createElementNS(NS, "defs");
      const filter = document.createElementNS(NS, "filter");
      filter.setAttribute("id", "glow");
      const blur = document.createElementNS(NS, "feGaussianBlur");
      blur.setAttribute("stdDeviation", compact ? "2" : "3");
      blur.setAttribute("result", "coloredBlur");
      const merge = document.createElementNS(NS, "feMerge");
      const mergeNode1 = document.createElementNS(NS, "feMergeNode");
      mergeNode1.setAttribute("in", "coloredBlur");
      const mergeNode2 = document.createElementNS(NS, "feMergeNode");
      mergeNode2.setAttribute("in", "SourceGraphic");
      merge.appendChild(mergeNode1);
      merge.appendChild(mergeNode2);
      filter.appendChild(blur);
      filter.appendChild(merge);
      defs.appendChild(filter);
      svg.insertBefore(defs, svg.firstChild);
    }
  }
}

function drawConnectors(
  svg: SVGSVGElement,
  rounds: TournamentRound[],
  leftYByRound: number[][],
  rightYByRound: number[][],
  opts: ConnectorOpts,
): void {
  const { matchW, matchH, roundGapX, totalWidth, totalHeight, sideRounds, totalRounds, lineWidth, highlightRound, highlightMatch } = opts;
  const halfH = matchH / 2;

  // Left side connectors
  for (let r = 0; r < sideRounds - 1; r++) {
    const yPositions = leftYByRound[r];
    const nextYPositions = leftYByRound[r + 1];
    if (!yPositions || !nextYPositions) continue;

    const x1 = r * (matchW + roundGapX) + matchW;
    const x2 = (r + 1) * (matchW + roundGapX);
    const midX = (x1 + x2) / 2;

    for (let m = 0; m < yPositions.length; m += 2) {
      const topY = yPositions[m]! + halfH;
      const botY = (yPositions[m + 1] ?? topY) + halfH;
      const nextM = Math.floor(m / 2);
      const nextY = nextYPositions[nextM]! + halfH;

      // Check if this connector leads to the highlighted match
      const nextRound = rounds[r + 1];
      const leftCount = Math.ceil((nextRound?.matches.length ?? 0) / 2);
      const isHL = highlightRound === r + 1 && highlightMatch !== undefined && highlightMatch < leftCount && highlightMatch === nextM;
      const color = isHL ? "#fbbf24" : "rgba(255,255,255,0.15)";
      const sw = isHL ? lineWidth * 1.5 : lineWidth;

      drawBracketLine(svg, x1, topY, midX, topY, color, sw);
      drawBracketLine(svg, x1, botY, midX, botY, color, sw);
      drawBracketLine(svg, midX, topY, midX, botY, color, sw);
      drawBracketLine(svg, midX, nextY, x2, nextY, color, sw);
    }
  }

  // Left side → Finals connector
  if (sideRounds > 0 && leftYByRound[sideRounds - 1]) {
    const lastLeftY = leftYByRound[sideRounds - 1]!;
    if (lastLeftY.length > 0) {
      const x1 = (sideRounds - 1) * (matchW + roundGapX) + matchW;
      const finalsX = sideRounds * (matchW + roundGapX);
      // Use the first (and likely only) match position from the last left round
      const fromY = lastLeftY[0]! + halfH;
      const toY = totalHeight / 2;

      const isHL = highlightRound === totalRounds - 1 && highlightMatch === 0;
      const color = isHL ? "#fbbf24" : "rgba(255,255,255,0.15)";
      const sw = isHL ? lineWidth * 1.5 : lineWidth;

      // If there are two matches in the last left round, draw bracket
      if (lastLeftY.length >= 2) {
        const topY = lastLeftY[0]! + halfH;
        const botY = lastLeftY[1]! + halfH;
        const midX = (x1 + finalsX) / 2;
        drawBracketLine(svg, x1, topY, midX, topY, color, sw);
        drawBracketLine(svg, x1, botY, midX, botY, color, sw);
        drawBracketLine(svg, midX, topY, midX, botY, color, sw);
        drawBracketLine(svg, midX, toY, finalsX, toY, color, sw);
      } else {
        drawBracketLine(svg, x1, fromY, finalsX, toY, color, sw);
      }
    }
  }

  // Right side connectors
  for (let r = 0; r < rightYByRound.length - 1; r++) {
    const yPositions = rightYByRound[r];
    const nextYPositions = rightYByRound[r + 1];
    if (!yPositions || !nextYPositions) continue;

    const x1 = totalWidth - (r + 1) * (matchW + roundGapX) + roundGapX;
    const x2 = totalWidth - (r + 2) * (matchW + roundGapX) + roundGapX + matchW;
    const midX = (x1 + x2) / 2;

    for (let m = 0; m < yPositions.length; m += 2) {
      const topY = yPositions[m]! + halfH;
      const botY = (yPositions[m + 1] ?? topY) + halfH;
      const nextM = Math.floor(m / 2);
      const nextY = nextYPositions[nextM]! + halfH;

      const round = rounds[r + 1];
      const leftCount = Math.ceil((round?.matches.length ?? 0) / 2);
      const actualMatchIdx = leftCount + nextM;
      const isHL = highlightRound === r + 1 && highlightMatch === actualMatchIdx;
      const color = isHL ? "#fbbf24" : "rgba(255,255,255,0.15)";
      const sw = isHL ? lineWidth * 1.5 : lineWidth;

      // Right side: connectors go right-to-left (from x1 leftward to x2)
      drawBracketLine(svg, x1, topY, midX, topY, color, sw);
      drawBracketLine(svg, x1, botY, midX, botY, color, sw);
      drawBracketLine(svg, midX, topY, midX, botY, color, sw);
      drawBracketLine(svg, midX, nextY, x2, nextY, color, sw);
    }
  }

  // Right side → Finals connector
  if (rightYByRound.length > 0) {
    const lastIdx = rightYByRound.length - 1;
    const lastRightY = rightYByRound[lastIdx]!;
    if (lastRightY.length > 0) {
      const rIdx = lastIdx;
      const x1 = totalWidth - (rIdx + 1) * (matchW + roundGapX) + roundGapX;
      const finalsX = sideRounds * (matchW + roundGapX) + matchW;
      const toY = totalHeight / 2;

      const isHL = highlightRound === totalRounds - 1 && highlightMatch === 0;
      const color = isHL ? "#fbbf24" : "rgba(255,255,255,0.15)";
      const sw = isHL ? lineWidth * 1.5 : lineWidth;

      if (lastRightY.length >= 2) {
        const topY = lastRightY[0]! + halfH;
        const botY = lastRightY[1]! + halfH;
        const midX = (x1 + finalsX) / 2;
        drawBracketLine(svg, x1, topY, midX, topY, color, sw);
        drawBracketLine(svg, x1, botY, midX, botY, color, sw);
        drawBracketLine(svg, midX, topY, midX, botY, color, sw);
        drawBracketLine(svg, midX, toY, finalsX, toY, color, sw);
      } else {
        const fromY = lastRightY[0]! + halfH;
        drawBracketLine(svg, x1, fromY, finalsX, toY, color, sw);
      }
    }
  }
}

function drawBracketLine(
  svg: SVGSVGElement,
  x1: number, y1: number,
  x2: number, y2: number,
  color: string,
  strokeWidth: number,
): void {
  const line = document.createElementNS(NS, "line");
  line.setAttribute("x1", String(x1));
  line.setAttribute("y1", String(y1));
  line.setAttribute("x2", String(x2));
  line.setAttribute("y2", String(y2));
  line.setAttribute("stroke", color);
  line.setAttribute("stroke-width", String(strokeWidth));
  svg.appendChild(line);
}

function getEntryColor(entry: Entry | null, winner: Entry | null): string {
  if (!entry) return "rgba(148,163,184,0.4)";
  if (winner && entry.name === winner.name) return "#f43f5e";
  if (winner && entry.name !== winner.name) return "rgba(148,163,184,0.4)";
  return "rgba(241,245,249,0.9)";
}

function isWinner(entry: Entry | null, winner: Entry | null): boolean {
  return !!(entry && winner && entry.name === winner.name);
}

function truncateName(name: string, maxLen: number): string {
  if (name.length <= maxLen) return name;
  return name.slice(0, maxLen - 1) + "…";
}
