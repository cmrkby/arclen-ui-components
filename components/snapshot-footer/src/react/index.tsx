"use client";
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import manifest from '../../component.json';
import { mount, render, resolveSettings, type Settings } from '../core';
import '../styles.css';

export type SnapshotFooterProps = Partial<Settings> & {className?: string; style?: CSSProperties; paused?: boolean};
export function SnapshotFooter({className,style,paused=false,...props}: SnapshotFooterProps) {
  const host = useRef<HTMLDivElement>(null);
  const controller = useRef<ReturnType<typeof mount> | null>(null);
  const serialized = JSON.stringify(resolveSettings(props));
  const initial = useRef(serialized);
  const [markup] = useState(() => ({__html: render(JSON.parse(serialized))}));
  useEffect(() => {
    const instance = mount(host.current!, JSON.parse(initial.current));
    controller.current = instance;
    return () => { instance.destroy(); controller.current = null; };
  }, []);
  useEffect(() => { controller.current?.update(JSON.parse(serialized)); }, [serialized]);
  useEffect(() => { if (paused) controller.current?.pause(); else controller.current?.resume(); }, [paused]);
  return <div ref={host} data-component={manifest.id} className={className} style={style} dangerouslySetInnerHTML={markup} />;
}
export { SnapshotFooter as Component };
