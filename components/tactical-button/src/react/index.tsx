"use client";
import {useEffect, useId, useRef, type CSSProperties} from 'react';
import manifest from '../../component.json';
import {mount, render, resolveSettings, type Settings, type Controller} from '../core';
import '../styles.css';
export type TacticalButtonProps = Partial<Settings> & {className?: string; style?: CSSProperties; paused?: boolean; onAction?: (event: MouseEvent) => void};
export function TacticalButton({className, style, paused = false, onAction, ...input}: TacticalButtonProps) {
  const host = useRef<HTMLDivElement>(null), controller = useRef<Controller | null>(null), id = useId();
  const settings = resolveSettings(input), latest = useRef(onAction), initial = useRef(settings);
  latest.current = onAction;
  const markup = useRef({__html: render(initial.current, `tactical-${id}`)});
  const settingsKey = JSON.stringify(manifest.settings.map(setting => settings[setting.key as keyof Settings]));
  useEffect(() => {
    const api = mount(host.current!, initial.current, `tactical-${id}`); controller.current = api;
    const button = host.current!.querySelector<HTMLButtonElement>('[data-tb-trigger]')!;
    const action = (event: MouseEvent) => { if (!button.disabled) latest.current?.(event); };
    button.addEventListener('click', action);
    return () => { button.removeEventListener('click', action); api.destroy(); controller.current = null; };
  }, [id]);
  useEffect(() => { controller.current?.update(settings); }, [settingsKey]);
  useEffect(() => { if (paused) controller.current?.pause(); else controller.current?.resume(); }, [paused]);
  return <div ref={host} className={className} style={style} data-arclen-component={manifest.id} dangerouslySetInnerHTML={markup.current}/>;
}
export const Component = TacticalButton;
