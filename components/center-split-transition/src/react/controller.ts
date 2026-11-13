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
    latest = useRef({create, settings, paused}),
    last = useRef(settings),
    firstRoute = useRef(routeKey);
  const serialized = JSON.stringify(settings);
  useEffect(() => { latest.current = {create, settings, paused}; });
  useEffect(() => {
    if (!host.current) return;
    const {create: factory, settings: current, paused: stopped} = latest.current;
    const api = factory(host.current, current);
    controller.current = api;
    if (stopped) api.pause();
    else if (current.autoplay) void api.replay();
    return () => {
      api.destroy();
      controller.current = null;
    };
  }, [isCustom]);
  useEffect(() => {
    const current = JSON.parse(serialized) as Settings;
    if (JSON.stringify(last.current) !== serialized) {
      controller.current?.update(current);
      if (isCustom && current.autoplay && !paused)
        void controller.current?.replay();
      last.current = current;
    }
  }, [settingsKey, serialized, isCustom, paused]);
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
