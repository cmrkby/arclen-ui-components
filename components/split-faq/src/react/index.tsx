'use client';
import { useEffect, useId, useRef, type CSSProperties } from 'react';
import manifest from '../../component.json';
import { mount, render, resolveSettings, type Settings } from '../core';
import '../styles.css';

export type SplitFAQProps = Partial<Settings> & { className?: string; style?: CSSProperties; paused?: boolean };
export function SplitFAQ({ className, style, paused = false, ...values }: SplitFAQProps) {
  const id = useId();
  const host = useRef<HTMLDivElement>(null);
  const controller = useRef<ReturnType<typeof mount> | null>(null);
  const settings = resolveSettings(values);
  const latest = useRef(settings); latest.current = settings;
  const signature = JSON.stringify(settings);
  const initial = useRef<{ __html: string } | null>(null);
  if (!initial.current) initial.current = { __html: render(settings, id) };
  useEffect(() => {
    controller.current = mount(host.current!, latest.current, id);
    return () => { controller.current?.destroy(); controller.current = null; };
  }, [id]);
  useEffect(() => { controller.current?.update(latest.current); }, [signature]);
  useEffect(() => { if (paused) controller.current?.pause(); else controller.current?.resume(); }, [paused]);
  return <div ref={host} className={className} style={style} data-arclen-component={manifest.id} dangerouslySetInnerHTML={initial.current} />;
}
export { SplitFAQ as Component };
export default SplitFAQ;
