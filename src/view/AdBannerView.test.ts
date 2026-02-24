import { describe, it, expect, beforeEach } from "vitest";
import { AdBannerView } from "./AdBannerView";

describe("AdBannerView", () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement("div");
  });

  it("renders a div with class 'ad-banner'", () => {
    const view = new AdBannerView();
    view.render(container);

    const banner = container.querySelector(".ad-banner");
    expect(banner).not.toBeNull();
    expect(banner!.tagName).toBe("DIV");
  });

  it("displays 'Advertisement' as text content", () => {
    const view = new AdBannerView();
    view.render(container);

    const banner = container.querySelector(".ad-banner");
    expect(banner!.textContent).toBe("Advertisement");
  });

  it("appends the banner to the provided container", () => {
    const view = new AdBannerView();
    view.render(container);

    expect(container.children.length).toBe(1);
    expect(container.children[0].className).toBe("ad-banner");
  });

  it("does not duplicate the banner on repeated render calls", () => {
    const view = new AdBannerView();
    view.render(container);
    view.render(container);

    const banners = container.querySelectorAll(".ad-banner");
    expect(banners.length).toBe(1);
  });
});
