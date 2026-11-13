'use client';
import { useEffect, useId, useRef,useState, type CSSProperties } from 'react';
import manifest from '../../component.json';
import { mount, render, resolveSettings, type Settings } from '../core';
import '../styles.css';

export type SplitFAQProps = Partial<Settings> & { className?: string; style?: CSSProperties; paused?: boolean };
export function SplitFAQ({ className, style, paused = false, ...values }: SplitFAQProps) {
  const id = useId();
  const host = useRef<HTMLDivElement>(null);
  const controller = useRef<ReturnType<typeof mount> | null>(null);
  const settings = resolveSettings(values);
  const latest = useRef(settings); useEffect(() => { latest.current = settings; });
  const signature = JSON.stringify(settings);
  const [initial] = useState(() => ({ __html: render(settings, id) }));
  useEffect(() => {
    const instance = mount(host.current!, latest.current, id); controller.current = instance;
    return () => { instance.destroy(); controller.current = null; };
  }, [id]);
  useEffect(() => { controller.current?.update(JSON.parse(signature)); }, [signature]);
  useEffect(() => { if (paused) controller.current?.pause(); else controller.current?.resume(); }, [paused]);
  return <div ref={host} className={className} style={style} data-arclen-component={manifest.id} dangerouslySetInnerHTML={initial} />;
}
export { SplitFAQ as Component };
export default SplitFAQ;
