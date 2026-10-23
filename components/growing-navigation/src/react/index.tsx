"use client";

import { useEffect, useId, useRef, useState, type CSSProperties } from 'react';
import manifest from '../../component.json';
import { mount, render, resolveSettings, type Controller, type Settings } from '../core';
import '../styles.css';

export type GrowingNavigationProps = Partial<Settings> & {
  className?: string;
  style?: CSSProperties;
  paused?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export function GrowingNavigation({ className, style, paused = false, onOpenChange, ...input }: GrowingNavigationProps) {
  const host = useRef<HTMLDivElement>(null);
  const controller = useRef<Controller | null>(null);
  const instanceId = `growing-navigation-${useId()}`;
  const settings = resolveSettings(input);
  const settingsKey = JSON.stringify(settings);
  const initial = useRef(settings);
  const callback = useRef(onOpenChange);
  callback.current = onOpenChange;
  const [markup] = useState(() => ({ __html: render(initial.current, instanceId) }));

  useEffect(() => {
    const target = host.current!;
    const change = (event: Event) => callback.current?.((event as CustomEvent<{ open: boolean }>).detail.open);
    target.addEventListener('growing-navigation-change', change);
    const api = mount(target, initial.current, instanceId);
    controller.current = api;
    return () => {
      target.removeEventListener('growing-navigation-change', change);
      api.destroy();
      controller.current = null;
    };
  }, [instanceId]);

  useEffect(() => { controller.current?.update(settings); }, [settingsKey]);
  useEffect(() => {
    if (paused) controller.current?.pause();
    else controller.current?.resume();
  }, [paused]);

  return <div ref={host} className={className} style={style} data-arclen-component={manifest.id} dangerouslySetInnerHTML={markup} />;
}

export const Component = GrowingNavigation;
