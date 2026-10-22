"use client";
import {useEffect, useId, useRef, type CSSProperties} from 'react';
import manifest from '../../component.json';
import {mount, render, resolveSettings, type Settings, type Controller} from '../core';
import '../styles.css';
export type GrainGradientProps = Partial<Settings> & {className?: string; style?: CSSProperties; paused?: boolean};
export function GrainGradient({className, style, paused = false, ...input}: GrainGradientProps) {
  const host = useRef<HTMLDivElement>(null), controller = useRef<Controller | null>(null), id = useId();
  const settings = resolveSettings(input);
  const latest = useRef({settings, paused}); latest.current = {settings, paused};
  const markup = useRef({__html: render(settings, id)});
  const settingsKey = JSON.stringify(manifest.settings.map(setting => settings[setting.key as keyof Settings]));
  useEffect(() => {
    const api = mount(host.current!, latest.current.settings, id, {paused: latest.current.paused});
    controller.current = api;
    return () => { api.destroy(); if (controller.current === api) controller.current = null; };
  }, [id]);
  useEffect(() => { controller.current?.update(latest.current.settings); }, [settingsKey]);
  useEffect(() => { if (paused) controller.current?.pause(); else controller.current?.resume(); }, [paused]);
  return <div ref={host} className={className} style={style} data-arclen-component={manifest.id} dangerouslySetInnerHTML={markup.current}/>;
}
export const Component = GrainGradient;
