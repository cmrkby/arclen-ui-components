"use client";
import {useEffect, useId, useRef,useState, type CSSProperties} from 'react';
import manifest from '../../component.json';
import {mount, render, resolveSettings, type Settings, type Controller} from '../core';
import '../styles.css';
export type TacticalButtonProps = Partial<Settings> & {className?: string; style?: CSSProperties; paused?: boolean; onAction?: (event: MouseEvent) => void};
export function TacticalButton({className, style, paused = false, onAction, ...input}: TacticalButtonProps) {
  const host = useRef<HTMLDivElement>(null), controller = useRef<Controller | null>(null), id = useId();
  const settings = resolveSettings(input), latest = useRef(onAction), initial = useRef(settings);
  useEffect(() => { latest.current = onAction; });
  const [markup] = useState(() => ({__html: render(resolveSettings(input), `tactical-${id}`)}));
  const settingsKey = JSON.stringify(settings);
  useEffect(() => {
    const api = mount(host.current!, initial.current, `tactical-${id}`); controller.current = api;
    const button = host.current!.querySelector<HTMLButtonElement>('[data-tb-trigger]')!;
    const action = (event: MouseEvent) => { if (!button.disabled) latest.current?.(event); };
    button.addEventListener('click', action);
    return () => { button.removeEventListener('click', action); api.destroy(); controller.current = null; };
  }, [id]);
  useEffect(() => { controller.current?.update(JSON.parse(settingsKey)); }, [settingsKey]);
  useEffect(() => { if (paused) controller.current?.pause(); else controller.current?.resume(); }, [paused]);
  return <div ref={host} className={className} style={style} data-arclen-component={manifest.id} dangerouslySetInnerHTML={markup}/>;
}
export const Component = TacticalButton;
