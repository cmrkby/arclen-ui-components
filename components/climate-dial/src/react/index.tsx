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

export type ClimateDialProps = Partial<Settings> &
  MountOptions & {
    replayKey?: string | number;
    className?: string;
    style?: CSSProperties;
  };

export function ClimateDial({
  onValueChange,
  onDialChange,
  className,
  style,
  paused = false,
  replayKey,
  ...settings
}: ClimateDialProps) {
  const lastReplay = useRef(replayKey);
  const host = useRef<HTMLDivElement>(null);
  const controller = useRef<Controller | null>(null);
  const callback = useRef({ onValueChange, onDialChange });
  const [initial] = useState(() => ({
    settings: resolveSettings(settings),
    paused,
  }));
  const [markup] = useState(() => ({ __html: render(initial.settings) }));
  const previous = useRef(settings);

  useLayoutEffect(() => {
    callback.current = { onValueChange, onDialChange };
  }, [onValueChange, onDialChange]);
  useLayoutEffect(() => {
    const api = mount(host.current!, initial.settings, {
      paused: initial.paused,
      onValueChange: (next, season) => callback.current.onValueChange?.(next, season),
      onDialChange: (value, mode) => callback.current.onDialChange?.(value, mode),
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
  useEffect(() => {
    if (lastReplay.current !== replayKey) controller.current?.replay();
    lastReplay.current = replayKey;
  }, [replayKey]);
  return (
    <div
      ref={host}
      className={className}
      style={style}
      dangerouslySetInnerHTML={markup}
    />
  );
}
export { ClimateDial as HeartRateDial, ClimateDial as Component };
export type HeartRateDialProps = ClimateDialProps;
