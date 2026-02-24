/**
 * AdBannerView renders a fixed-bottom advertisement banner.
 *
 * The banner displays placeholder text "Advertisement" and is appended
 * to the provided container. CSS styling (fixed positioning, dimensions)
 * is handled in the main stylesheet.
 *
 * @requirements 6.1, 6.2, 6.3, 6.4, 6.5
 */
export class AdBannerView {
  private element: HTMLDivElement | null = null;

  /** Render the ad banner and append it to the given container. */
  render(container: HTMLElement): void {
    // Avoid duplicate banners in the same container
    if (this.element && this.element.parentElement === container) {
      return;
    }

    const banner = document.createElement("div");
    banner.className = "ad-banner";
    banner.textContent = "Advertisement";

    this.element = banner;
    container.appendChild(banner);
  }
}
