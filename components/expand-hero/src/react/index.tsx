"use client";
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { mount, render, type Settings } from '../core';
import manifest from '../../component.json';
import '../styles.css';

export type ExpandHeroProps = Partial<Settings> & { className?: string; style?: CSSProperties; paused?: boolean };
export function ExpandHero({ className, style, paused = false, ...settings }: ExpandHeroProps) {
  const host = useRef<HTMLDivElement>(null);
  const controller = useRef<ReturnType<typeof mount> | null>(null);
  const serialized = JSON.stringify(settings);
  // React owns the host; the controller owns its descendants after mount.
  // Keep the SSR HTML prop stable so reconciliation cannot overwrite a reveal.
  const [initial] = useState(() => ({ serialized, markup: { __html: render(settings) } }));
  const appliedSettings = useRef(initial.serialized);
  useEffect(() => {
    if (!host.current) return;
    const instance = mount(host.current, JSON.parse(initial.serialized)); controller.current = instance;
    appliedSettings.current = initial.serialized;
    return () => { instance.destroy(); controller.current = null; };
  }, [initial]);
  useEffect(() => {
    const instance = controller.current;
    if (!instance) return;
    // Pause first when content and playback change in the same React commit.
    if (paused) instance.pause();
    if (appliedSettings.current !== serialized) {
      instance.update(JSON.parse(serialized));
      appliedSettings.current = serialized;
    }
    if (!paused) instance.resume();
  }, [paused, serialized]);
  return <div ref={host} className={className} style={style} data-component={manifest.id} dangerouslySetInnerHTML={initial.markup} />;
}
export const Component = ExpandHero;
export default ExpandHero;
