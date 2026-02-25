/**
 * Inline SVG icons — no emojis, no external libraries.
 * Each returns an SVG string wrapped in a span.btn-icon.
 */

const wrap = (svg: string): string => `<span class="btn-icon">${svg}</span>`;

/** Trophy icon for results button */
export const iconTrophy = wrap(
  `<svg viewBox="0 0 24 24"><path d="M6 9H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h2"/><path d="M18 9h2a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2h-2"/><path d="M6 3h12v7a6 6 0 0 1-12 0V3z"/><path d="M9 21h6"/><path d="M12 16v5"/></svg>`
);

/** Clipboard/copy icon */
export const iconClipboard = wrap(
  `<svg viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`
);

/** Chat/message icon */
export const iconMessage = wrap(
  `<svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`
);

/** Twitter bird share icon */
export const iconShare = wrap(
  `<svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M23 3a10.9 10.9 0 0 1-3.14 1.53A4.48 4.48 0 0 0 22.43.36a9 9 0 0 1-2.88 1.1A4.52 4.52 0 0 0 16.11 0c-2.5 0-4.52 2.03-4.52 4.52 0 .35.04.7.11 1.03C7.69 5.37 4.07 3.58 1.64.83a4.52 4.52 0 0 0-.61 2.27c0 1.57.8 2.95 2.01 3.76a4.49 4.49 0 0 1-2.05-.57v.06c0 2.19 1.56 4.02 3.63 4.43a4.55 4.55 0 0 1-2.04.08c.57 1.79 2.24 3.09 4.21 3.13A9.06 9.06 0 0 1 0 19.54a12.8 12.8 0 0 0 6.92 2.03c8.3 0 12.85-6.88 12.85-12.85 0-.2 0-.39-.01-.58A9.17 9.17 0 0 0 23 3z"/></svg>`
);

/** Grid/arena icon */
export const iconGrid = wrap(
  `<svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>`
);

/** Skip/pass icon (forward arrows) */
export const iconSkip = wrap(
  `<svg viewBox="0 0 24 24"><polyline points="13 17 18 12 13 7"/><polyline points="6 17 11 12 6 7"/></svg>`
);

/** Ban/ignore icon (circle with line) */
export const iconBan = wrap(
  `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>`
);

/** Record circle icon */
export const iconRecord = wrap(
  `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8" fill="currentColor" stroke="none"/></svg>`
);

/** Stop square icon */
export const iconStop = wrap(
  `<svg viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12" rx="1" fill="currentColor" stroke="none"/></svg>`
);

/** X/close icon */
export const iconClose = wrap(
  `<svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`
);

/** Trash/clear icon */
export const iconTrash = wrap(
  `<svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>`
);

/**
 * Attach a ripple effect to a button on click.
 */
export function addRipple(button: HTMLElement): void {
  button.addEventListener("click", (e) => {
    const rect = button.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = (e as MouseEvent).clientX - rect.left - size / 2;
    const y = (e as MouseEvent).clientY - rect.top - size / 2;

    const ripple = document.createElement("span");
    ripple.className = "ripple";
    ripple.style.width = ripple.style.height = `${size}px`;
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;

    button.appendChild(ripple);
    ripple.addEventListener("animationend", () => ripple.remove());
  });
}

/* ── Verdict icons (larger, used inline in title text) ──── */

const verdictWrap = (svg: string): string =>
  `<span class="verdict-icon">${svg}</span>`;

/** Hearts — Absolute Soulmates (>=80) */
export const iconSoulmates = verdictWrap(
  `<svg viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z" fill="currentColor" stroke="none"/></svg>`
);

/** Handshake — On the Same Page (>=50) */
export const iconSamePage = verdictWrap(
  `<svg viewBox="0 0 24 24"><path d="M11 17l-1.5 1.5a2.12 2.12 0 0 1-3 0L3.6 15.6a2.12 2.12 0 0 1 0-3L7 9"/><path d="M13 7l1.5-1.5a2.12 2.12 0 0 1 3 0l2.9 2.9a2.12 2.12 0 0 1 0 3L17 15"/><path d="M8 12h8"/></svg>`
);

/** Shrug / meh — Respectfully Disagree (>=20) */
export const iconDisagree = verdictWrap(
  `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="8" y1="15" x2="16" y2="15"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>`
);

/** Explosion / comet — From Different Planets (<20) */
export const iconDifferentPlanets = verdictWrap(
  `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="M4.93 4.93l1.41 1.41"/><path d="M17.66 17.66l1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="M4.93 19.07l1.41-1.41"/><path d="M17.66 6.34l1.41-1.41"/></svg>`
);

/** Pick the right verdict icon based on Jaccard score. */
export function verdictIcon(score: number): string {
  if (score >= 80) return iconSoulmates;
  if (score >= 50) return iconSamePage;
  if (score >= 20) return iconDisagree;
  return iconDifferentPlanets;
}
