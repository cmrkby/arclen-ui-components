"use client";
import type { CSSProperties, ReactNode } from "react";
import { createPageTransition } from "../core/engine";
import { resolveSettings, type Settings } from "../core/settings";
import { useTransitionController } from "./controller";
import "../motion.css";
export {
  createPageTransition,
  createPageTransition as createPixelSweepTransition,
} from "../core/engine";
export {
  defaults,
  resolveSettings,
  presetSettings,
  applicableSettings,
} from "../core/settings";
export type {
  NavigationOptions,
  PageTransitionController,
  TransitionResult,
  Phase,
} from "../core/engine";
export type { Settings } from "../core/settings";
export type PixelSweepTransitionProps = Partial<Settings> & {
  children: ReactNode;
  routeKey?: string | number;
  className?: string;
  style?: CSSProperties;
  paused?: boolean;
};
/** Reveal consumer content without importing demo artwork, fonts or controls. */
export function PixelSweepTransition({
  children,
  routeKey,
  className,
  style,
  paused = false,
  ...input
}: PixelSweepTransitionProps) {
  const settings = resolveSettings(input),
    host = useTransitionController(
      createPageTransition,
      settings,
      true,
      routeKey,
      paused,
    );
  return (
    <div
      ref={host}
      data-page-transitions
      data-pt-preset="pixels"
      className={className}
      style={
        {
          "--pt-bg": settings.background,
          "--pt-fg": settings.foreground,
          "--pt-height": `${settings.minHeight}px`,
          ...style,
        } as CSSProperties
      }
    >
      <div data-pt-content>{children}</div>
    </div>
  );
}
export const Component = PixelSweepTransition;
