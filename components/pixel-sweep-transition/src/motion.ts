/** Motion-only entry: no hero artwork, demo markup or replay controls. */
export {
  createPageTransition,
  createPageTransition as createPixelSweepTransition,
} from "./core/engine";
export {
  defaults,
  resolveSettings,
  presetSettings,
  applicableSettings,
  type Settings,
} from "./core/settings";
export type {
  NavigationOptions,
  PageTransitionController,
  TransitionResult,
  Phase,
} from "./core/engine";
import "./motion.css";
