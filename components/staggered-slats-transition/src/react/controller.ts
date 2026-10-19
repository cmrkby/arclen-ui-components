"use client";
import { useEffect, useRef } from "react";
import type { Settings } from "../core/settings";
import type { PageTransitionController } from "../core/engine";
type Factory = (
  host: HTMLElement,
  settings: Settings,
) => PageTransitionController;
/** Shared lifecycle for the demo and the consumer-owned-content entry. */
export function useTransitionController(
  create: Factory,
  settings: Settings,
  isCustom: boolean,
  routeKey: string | number | undefined,
  paused: boolean,
  settingsKey = JSON.stringify(settings),
) {
  const host = useRef<HTMLDivElement>(null),
    controller = useRef<PageTransitionController | null>(null),
    latest = useRef(settings),
    last = useRef(settings),
    firstRoute = useRef(routeKey);
  latest.current = settings;
  useEffect(() => {
    if (!host.current) return;
    const api = create(host.current, latest.current);
    controller.current = api;
    if (paused) api.pause();
    else if (latest.current.autoplay) void api.replay();
    return () => {
      api.destroy();
      controller.current = null;
    };
  }, [isCustom]);
  useEffect(() => {
    if (JSON.stringify(last.current) !== JSON.stringify(latest.current)) {
      controller.current?.update(latest.current);
      if (isCustom && latest.current.autoplay && !paused)
        void controller.current?.replay();
      last.current = latest.current;
    }
  }, [settingsKey, isCustom, paused]);
  useEffect(() => {
    if (paused) controller.current?.pause();
    else controller.current?.resume();
  }, [paused]);
  useEffect(() => {
    if (routeKey !== firstRoute.current) {
      firstRoute.current = routeKey;
      if (!paused) void controller.current?.replay();
    }
  }, [routeKey, paused]);
  return host;
}
