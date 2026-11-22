'use client';

import { useEffect, useId, useRef, useState, type CSSProperties } from 'react';
import manifest from '../../component.json';
import {
  mount,
  render,
  resolveSettings,
  type Controller,
  type LegacyModel,
  type Model,
  type SendDetail,
  type Settings,
} from '../core';
import '../styles.css';

export type ActionComposerProps = Partial<Omit<Settings, 'model'>> & {
  model?: Model | LegacyModel;
  className?: string;
  style?: CSSProperties;
  paused?: boolean;
  onSend?: (detail: SendDetail) => void;
};

export type { Action, Model, SendDetail } from '../core';

export function ActionComposer({ paused, className, style, onSend, ...props }: ActionComposerProps) {
  const host = useRef<HTMLDivElement>(null);
  const controller = useRef<Controller | null>(null);
  const callback = useRef(onSend);
  const id = useId();
  const supplied = Object.fromEntries(
    manifest.settings.flatMap(({ key }) => {
      const value = props[key as keyof Settings];
      return value === undefined ? [] : [[key, value]];
    }),
  );
  const resolved = resolveSettings(supplied);
  const previous = useRef(resolved);
  const [initial] = useState(() => ({ settings: resolved, html: { __html: render(resolved, id) } }));

  useEffect(() => {
    callback.current = onSend;
  }, [onSend]);
  useEffect(() => {
    const instance = mount(host.current!, initial.settings, id, {
      onSend: (detail) => callback.current?.(detail),
    });
    controller.current = instance;
    return () => {
      controller.current = null;
      instance.destroy();
    };
  }, [id, initial]);
  useEffect(() => {
    const changed = Object.fromEntries(
      manifest.settings.flatMap(({ key }) => {
        const name = key as keyof Settings;
        const before = previous.current[name],
          after = resolved[name];
        const equal =
          Array.isArray(before) && Array.isArray(after)
            ? before.length === after.length && before.every((v, i) => v === after[i])
            : before === after;
        return equal ? [] : [[key, after]];
      }),
    );
    if (Object.keys(changed).length) controller.current?.update(changed);
    previous.current = resolved;
  });
  useEffect(() => {
    if (paused) controller.current?.pause();
    else controller.current?.resume();
  }, [paused]);

  return <div ref={host} className={className} style={style} dangerouslySetInnerHTML={initial.html} />;
}

export const Component = ActionComposer;
