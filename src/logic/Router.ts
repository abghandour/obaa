import type { Route } from "../types/index.js";

/**
 * Hash-based router for navigating between main page and matchup screen.
 *
 * Routes:
 *   `#/`              → main screen
 *   `#/arena/{arenaId}` → matchup screen for the given arena
 */
export class Router {
  private callbacks: Array<(route: Route) => void> = [];
  private boundHandler: () => void;

  constructor() {
    this.boundHandler = () => this.notifyListeners();
    window.addEventListener("hashchange", this.boundHandler);
  }

  /** Set window.location.hash based on the given route. */
  /** Set window.location.hash based on the given route. */
    navigate(route: Route): void {
      if (route.screen === "matchup" && route.arenaId) {
        if (route.mode === "tournament") {
          window.location.hash = `#/tournament/${route.arenaId}`;
        } else {
          window.location.hash = `#/arena/${route.arenaId}`;
        }
      } else {
        window.location.hash = "#/";
      }
    }

  /** Parse the current hash and return a Route object. */
  getCurrentRoute(): Route {
    return Router.parseHash(window.location.hash);
  }

  /** Register a callback that fires whenever the route changes. */
  onRouteChange(callback: (route: Route) => void): void {
    this.callbacks.push(callback);
  }

  /** Stop listening to hashchange events and clear callbacks. */
  destroy(): void {
    window.removeEventListener("hashchange", this.boundHandler);
    this.callbacks = [];
  }

  /** Parse a hash string into a Route. Exported as static for testability. */
  /** Parse a hash string into a Route. Exported as static for testability. */
    static parseHash(hash: string): Route {
      const normalized = hash.startsWith("#") ? hash.slice(1) : hash;

      // Tournament routes
      const tournamentReplayMatch = normalized.match(/^\/tournament\/([^?]+)\?replay=(.+)$/);
      if (tournamentReplayMatch && tournamentReplayMatch[1] && tournamentReplayMatch[2]) {
        return { screen: "matchup", arenaId: tournamentReplayMatch[1], replayData: tournamentReplayMatch[2], mode: "tournament" };
      }
      const tournamentMatch = normalized.match(/^\/tournament\/(.+)$/);
      if (tournamentMatch && tournamentMatch[1]) {
        return { screen: "matchup", arenaId: tournamentMatch[1], mode: "tournament" };
      }

      // Arena (battle) routes
      const replayMatch = normalized.match(/^\/arena\/([^?]+)\?replay=(.+)$/);
      if (replayMatch && replayMatch[1] && replayMatch[2]) {
        return { screen: "matchup", arenaId: replayMatch[1], replayData: replayMatch[2] };
      }
      const arenaMatch = normalized.match(/^\/arena\/(.+)$/);
      if (arenaMatch && arenaMatch[1]) {
        return { screen: "matchup", arenaId: arenaMatch[1] };
      }

      return { screen: "main" };
    }

  private notifyListeners(): void {
    const route = this.getCurrentRoute();
    for (const cb of this.callbacks) {
      cb(route);
    }
  }
}
