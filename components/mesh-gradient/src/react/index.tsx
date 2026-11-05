'use client';

import { useEffect, useId, useRef, useState, type CSSProperties } from 'react';
import manifest from '../../component.json';
import { mount, render, resolveSettings, type Instance, type Settings } from '../core/index';
import '../styles.css';

export type MeshGradientProps = Partial<Settings> & { className?: string; style?: CSSProperties; paused?: boolean };

export function MeshGradient(props: MeshGradientProps) {
  const id = useId();
  const host = useRef<HTMLDivElement>(null);
  const instance = useRef<Instance | null>(null);
  const input = Object.fromEntries(manifest.settings.filter(setting =>
    props[setting.key as keyof Settings] !== undefined,
  ).map(setting => [setting.key, props[setting.key as keyof Settings]]));
  const settings = resolveSettings(input);
  const signature = JSON.stringify(settings);
  const latest = useRef(settings);
  latest.current = settings;
  // React owns the outer host; the core exclusively owns its inner DOM after mount.
  const [markup] = useState(() => ({ __html: render(settings, id) }));
  useEffect(() => {
    if (!host.current) return;
    const mounted = mount(host.current, latest.current, id);
    instance.current = mounted;
    return () => { mounted.destroy(); instance.current = null; };
  }, [id]);
  useEffect(() => { instance.current?.update(latest.current); }, [signature]);
  useEffect(() => {
    if (props.paused) instance.current?.pause(); else instance.current?.resume();
  }, [props.paused]);
  return <div ref={host} className={props.className} style={props.style} dangerouslySetInnerHTML={markup} />;
}

export const Component = MeshGradient;
