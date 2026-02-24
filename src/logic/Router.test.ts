import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { Router } from "./Router.js";

describe("Router", () => {
  let router: Router;

  beforeEach(() => {
    window.location.hash = "";
    router = new Router();
  });

  afterEach(() => {
    router.destroy();
    window.location.hash = "";
  });

  describe("parseHash (static)", () => {
    it("returns main screen for empty hash", () => {
      expect(Router.parseHash("")).toEqual({ screen: "main" });
    });

    it("returns main screen for '#/'", () => {
      expect(Router.parseHash("#/")).toEqual({ screen: "main" });
    });

    it("returns main screen for '#'", () => {
      expect(Router.parseHash("#")).toEqual({ screen: "main" });
    });

    it("returns matchup screen with arenaId for '#/arena/actors'", () => {
      expect(Router.parseHash("#/arena/actors")).toEqual({
        screen: "matchup",
        arenaId: "actors",
      });
    });

    it("returns matchup screen for arena with hyphens", () => {
      expect(Router.parseHash("#/arena/sci-fi-films")).toEqual({
        screen: "matchup",
        arenaId: "sci-fi-films",
      });
    });

    it("returns main screen for unrecognized hash", () => {
      expect(Router.parseHash("#/unknown/path")).toEqual({ screen: "main" });
    });
  });

  describe("navigate()", () => {
    it("sets hash to #/ for main screen", () => {
      router.navigate({ screen: "main" });
      expect(window.location.hash).toBe("#/");
    });

    it("sets hash to #/arena/{id} for matchup screen", () => {
      router.navigate({ screen: "matchup", arenaId: "bands" });
      expect(window.location.hash).toBe("#/arena/bands");
    });

    it("falls back to #/ for matchup screen without arenaId", () => {
      router.navigate({ screen: "matchup" });
      expect(window.location.hash).toBe("#/");
    });
  });

  describe("getCurrentRoute()", () => {
    it("returns main route when hash is empty", () => {
      window.location.hash = "";
      expect(router.getCurrentRoute()).toEqual({ screen: "main" });
    });

    it("returns matchup route when hash is #/arena/singers", () => {
      window.location.hash = "#/arena/singers";
      expect(router.getCurrentRoute()).toEqual({
        screen: "matchup",
        arenaId: "singers",
      });
    });
  });

  describe("onRouteChange()", () => {
    it("fires callback on hashchange", async () => {
      const routes: Array<{ screen: string; arenaId?: string }> = [];
      router.onRouteChange((route) => routes.push(route));

      const countBefore = routes.length;
      window.location.hash = "#/arena/albums";
      // hashchange is async in jsdom, give it a tick
      await new Promise((r) => setTimeout(r, 0));

      const newRoutes = routes.slice(countBefore);
      expect(newRoutes.length).toBeGreaterThanOrEqual(1);
      expect(newRoutes[newRoutes.length - 1]).toEqual({
        screen: "matchup",
        arenaId: "albums",
      });
    });

    it("fires multiple callbacks", async () => {
      let count = 0;
      router.onRouteChange(() => count++);
      router.onRouteChange(() => count++);

      const countBefore = count;
      window.location.hash = "#/arena/films";
      await new Promise((r) => setTimeout(r, 0));

      // Each hashchange should fire both callbacks; at least 2 new calls
      expect(count - countBefore).toBeGreaterThanOrEqual(2);
      // Both callbacks fire the same number of times
      expect((count - countBefore) % 2).toBe(0);
    });
  });

  describe("destroy()", () => {
    it("stops firing callbacks after destroy", async () => {
      let called = false;
      router.onRouteChange(() => {
        called = true;
      });

      router.destroy();
      window.location.hash = "#/arena/actors";
      await new Promise((r) => setTimeout(r, 0));

      expect(called).toBe(false);
    });
  });
});
