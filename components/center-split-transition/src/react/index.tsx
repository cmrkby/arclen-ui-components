"use client";
import { useRef, type CSSProperties, type ReactNode } from "react";
import manifest from "../../component.json";
import { useTransitionController } from "./controller";
import {
  createPageTransition,
  mount,
  render,
  resolveSettings,
  type Settings,
} from "../core";
import "../styles.css";
export {
  createCenterSplitTransition,
  createPageTransition,
  presetSettings,
  applicableSettings,
} from "../core";
export type {
  NavigationOptions,
  PageTransitionController,
  TransitionResult,
  Settings,
} from "../core";
export type CenterSplitTransitionProps = Partial<Settings> & {
  children?: ReactNode;
  routeKey?: string | number;
  className?: string;
  style?: CSSProperties;
  paused?: boolean;
};
export function CenterSplitTransition({
  children,
  routeKey,
  className,
  style,
  paused = false,
  ...input
}: CenterSplitTransitionProps) {
  const settings = resolveSettings(input),
    initial = useRef(render(settings)),
    isCustom = children !== undefined;
  const host = useTransitionController(
    isCustom
      ? createPageTransition
      : (host, settings) => mount(host, { ...settings, autoplay: false }),
    settings,
    isCustom,
    routeKey,
    paused,
    JSON.stringify(
      manifest.settings.map((s) => settings[s.key as keyof Settings]),
    ),
  );
  return isCustom ? (
    <div
      ref={host}
      data-page-transitions
      data-pt-preset="center-split"
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
  ) : (
    <div
      ref={host}
      className={className}
      style={style}
      dangerouslySetInnerHTML={{ __html: initial.current }}
    />
  );
}
export const Component = CenterSplitTransition;
