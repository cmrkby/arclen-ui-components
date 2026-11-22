'use client';

import { useEffect, useId, useRef, useState, type CSSProperties } from 'react';
import manifest from '../../component.json';
import { defaults, mount, render, type Controller, type Settings } from '../core';
import '../styles.css';

export type QuickFindProps = Partial<Settings> & {
  className?: string;
  style?: CSSProperties;
  paused?: boolean;
  onSelect?: (title: string) => void;
};

export function QuickFind(props: QuickFindProps) {
  const { paused, openWidth = defaults.openWidth } = props;
  const settings = Object.fromEntries(manifest.settings.map(({ key }) => {
    const name = key as keyof Settings;
    return [key, props[name] === undefined ? defaults[name] : props[name]];
  }));
  const previous = useRef(settings);
  const id = useId();
  const host = useRef<HTMLDivElement>(null);
  const controller = useRef<Controller | null>(null);
  const callback = useRef(props.onSelect);
  const [initial] = useState(() => {
    return { settings, markup: { __html: render(settings, id) } };
  });

  useEffect(() => { callback.current = props.onSelect; }, [props.onSelect]);

  useEffect(() => {
    const instance = mount(host.current!, initial.settings, id, {
      onSelect: title => callback.current?.(title),
    });
    controller.current = instance;
    return () => {
      instance.destroy();
      controller.current = null;
    };
  }, [id, initial]);

  useEffect(() => {
    const changed = Object.entries(settings).filter(([key, value]) => previous.current[key] !== value);
    if (changed.length) controller.current?.update(Object.fromEntries(changed));
    previous.current = settings;
  });
  useEffect(() => {
    if (paused) controller.current?.pause();
    else controller.current?.resume();
  }, [paused]);

  return <div ref={host} className={props.className} style={{ width: '100%', maxWidth: openWidth, ...props.style }} dangerouslySetInnerHTML={initial.markup} />;
}

export const Component = QuickFind;
