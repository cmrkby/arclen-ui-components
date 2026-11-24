'use client';
import { useEffect, useId, useRef, useState, type CSSProperties } from 'react';
import { mount, render } from '../core';
import { resolveSettings, type Settings } from '../core/settings';
import '../styles.css';

type Props = Partial<Settings> & { paused?: boolean; className?: string; style?: CSSProperties };

export function AlloyAccordion({ paused = false, className, style, ...options }: Props) {
  const id = useId();
  const host = useRef<HTMLDivElement>(null);
  const instance = useRef<ReturnType<typeof mount> | null>(null);
  const settings = JSON.stringify(resolveSettings(options));
  const initial = useRef({ settings, paused });

  const [markup] = useState(() => ({ __html: render(JSON.parse(settings), id) }));

  useEffect(() => {
    if (!host.current) return;
    const component = mount(host.current, JSON.parse(initial.current.settings), id, { paused: initial.current.paused });
    instance.current = component;
    return () => { component.destroy(); instance.current = null; };
  }, [id]);
  useEffect(() => { instance.current?.update(JSON.parse(settings)); }, [settings]);
  useEffect(() => { if (paused) instance.current?.pause(); else instance.current?.resume(); }, [paused]);
  return <div ref={host} className={className} style={style} dangerouslySetInnerHTML={markup} />;
}

export const Component = AlloyAccordion;
export const RelayAccordion = Component;
