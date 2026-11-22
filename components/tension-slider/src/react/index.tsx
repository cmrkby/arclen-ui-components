'use client';

import { useEffect, useId, useRef, useState, type CSSProperties } from 'react';
import manifest from '../../component.json';
import { mount, render, resolveSettings, type Controller, type Settings } from '../core';
import '../styles.css';

export type TensionSliderProps = Partial<Settings> & {
  className?: string;
  style?: CSSProperties;
  paused?: boolean;
  onValueChange?: (value: number) => void;
};

export function TensionSlider(props: TensionSliderProps) {
  const { paused } = props;
  const resolved = resolveSettings(Object.fromEntries(manifest.settings.flatMap(({ key }) => {
    const v = props[key as keyof Settings];
    return v === undefined ? [] : [[key, v]];
  })));
  const previous = useRef(resolved);
  const id = useId();
  const host = useRef<HTMLDivElement>(null);
  const controller = useRef<Controller | null>(null);
  const callback = useRef(props.onValueChange);
  const [initial] = useState(() => ({ settings: resolved, markup: { __html: render(resolved, id) } }));

  useEffect(() => { callback.current = props.onValueChange; }, [props.onValueChange]);

  useEffect(() => {
    const instance = mount(host.current!, initial.settings, id, {
      onValueChange: value => callback.current?.(value),
    });
    controller.current = instance;
    return () => {
      instance.destroy();
      controller.current = null;
    };
  }, [id, initial]);

  useEffect(() => {
    const changes = Object.fromEntries(manifest.settings.flatMap(({ key }) => {
      const name = key as keyof Settings;
      // An uncontrolled value belongs to the core after mount.
      if (name === 'value') return [];
      return previous.current[name] === resolved[name] ? [] : [[name, resolved[name]]];
    }));
    if (Object.keys(changes).length) controller.current?.update(changes);
    previous.current = resolved;
  });
  useEffect(() => {
    if (props.value !== undefined) controller.current?.update({ value: props.value });
  }, [props.value]);
  useEffect(() => {
    if (paused) controller.current?.pause();
    else controller.current?.resume();
  }, [paused]);

  return <div ref={host} className={props.className} style={{ width: '100%', ...props.style }} dangerouslySetInnerHTML={initial.markup} />;
}

export const Component = TensionSlider;
