"use client";
import { useEffect, useId, useRef,useState, type CSSProperties } from 'react';
import manifest from '../../component.json';
import { mount, render, resolveSettings, type Controller, type Settings } from '../core';
import '../styles.css';
export type StatusSwapProps = Partial<Settings> & { className?: string; style?: CSSProperties; paused?: boolean };
export function StatusSwap({ className, style, paused = false, ...input }: StatusSwapProps) {
  const host = useRef<HTMLDivElement>(null), controller = useRef<Controller | null>(null), id = useId();
  const settings = resolveSettings(input), initial = useRef(settings);
  // React always sees the same markup object; the core owns its descendants after mount.
  const [markup] = useState(() => ({ __html: render(resolveSettings(input), `status-swap-${id}`) }));
  useEffect(() => { const instance = mount(host.current!, initial.current, `status-swap-${id}`); controller.current = instance; return () => { instance.destroy(); controller.current = null; }; }, [id]);
  useEffect(() => { controller.current?.update(settings); });
  useEffect(() => { if (paused) controller.current?.pause(); else controller.current?.resume(); }, [paused]);
  return <div ref={host} className={className} style={style} data-arclen-component={manifest.id} dangerouslySetInnerHTML={markup} />;
}
export const Component = StatusSwap;
