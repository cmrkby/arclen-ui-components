"use client";
import { useEffect, useId, useRef, type CSSProperties } from 'react';
import { mount, render, resolveSettings, type Controller, type Settings } from '../core';
import '../styles.css';
export type LineRevealMenuProps = Partial<Settings> & { className?: string; style?: CSSProperties; paused?: boolean };
export function LineRevealMenu({ className, style, paused = false, ...input }: LineRevealMenuProps) {
  const host = useRef<HTMLDivElement>(null), controller = useRef<Controller | null>(null), id = useId();
  const settings = resolveSettings(input), initial = useRef(settings);
  const markup = useRef({ __html: render(initial.current, id) });
  useEffect(() => { controller.current = mount(host.current!, initial.current, id); return () => { controller.current?.destroy(); controller.current = null; }; }, [id]);
  const serialized = JSON.stringify(settings);
  useEffect(() => { controller.current?.update(JSON.parse(serialized)); }, [serialized]);
  useEffect(() => { if (paused) controller.current?.pause(); else controller.current?.resume(); }, [paused]);
  return <div ref={host} className={className} style={style} data-arclen-component="line-reveal-menu" dangerouslySetInnerHTML={markup.current}/>;
}
export const Component = LineRevealMenu;
