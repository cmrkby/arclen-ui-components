"use client";
import { useEffect, useId, useRef, type CSSProperties } from 'react';
import manifest from '../../component.json';
import { mount, render, resolveSettings, type Controller, type Settings } from '../core';
import '../styles.css';
export type StatusSwapProps = Partial<Settings> & { className?: string; style?: CSSProperties; paused?: boolean };
export function StatusSwap({ className, style, paused = false, ...input }: StatusSwapProps) {
  const host = useRef<HTMLDivElement>(null), controller = useRef<Controller | null>(null), id = useId();
  const settings = resolveSettings(input), initial = useRef(settings);
  // React always sees the same markup object; the core owns its descendants after mount.
  const markup = useRef({ __html: render(initial.current, `status-swap-${id}`) });
  useEffect(() => { controller.current = mount(host.current!, initial.current, `status-swap-${id}`); return () => { controller.current?.destroy(); controller.current = null; }; }, [id]);
  useEffect(() => { controller.current?.update(settings); });
  useEffect(() => { if (paused) controller.current?.pause(); else controller.current?.resume(); }, [paused]);
  return <div ref={host} className={className} style={style} data-arclen-component={manifest.id} dangerouslySetInnerHTML={markup.current} />;
}
export const Component = StatusSwap;
