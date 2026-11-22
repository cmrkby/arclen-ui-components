'use client';

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
import manifest from '../../component.json';
import {
  mount,
  render,
  resolveSettings,
  type Controller,
  type MountOptions,
  type Settings,
} from '../core';
import '../styles.css';

export type CartRevealProps = Partial<Settings> &
  MountOptions & {
    className?: string;
    style?: CSSProperties;
  };

export function CartReveal({
  onConfirm,
  className,
  style,
  paused = false,
  ...settings
}: CartRevealProps) {
  const host = useRef<HTMLDivElement>(null);
  const controller = useRef<Controller | null>(null);
  const callback = useRef(onConfirm);
  const [initial] = useState(() => ({
    settings: resolveSettings(settings),
    paused,
  }));
  const [markup] = useState(() => ({ __html: render(initial.settings) }));
  const previous = useRef(settings);

  useLayoutEffect(() => {
    callback.current = onConfirm;
  }, [onConfirm]);
  useLayoutEffect(() => {
    const api = mount(host.current!, initial.settings, {
      paused: initial.paused,
      onConfirm: (detail) => callback.current?.(detail),
    });
    controller.current = api;
    return () => {
      api.destroy();
      controller.current = null;
    };
  }, [initial]);
  useEffect(() => {
    const changes = Object.fromEntries(
      manifest.settings.flatMap(({ key }) => {
        const k = key as keyof Settings;
        return settings[k] === previous.current[k] ? [] : [[k, settings[k]]];
      }),
    ) as Partial<Settings>;
    if (Object.keys(changes).length) controller.current?.update(changes);
    previous.current = settings;
  });
  useEffect(() => {
    if (paused) controller.current?.pause();
    else controller.current?.resume();
  }, [paused]);
  return (
    <div
      ref={host}
      className={className}
      style={style}
      dangerouslySetInnerHTML={markup}
    />
  );
}
export const Component = CartReveal;
