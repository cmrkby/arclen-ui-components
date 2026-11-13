"use client";
import { useEffect, useId, useRef,useState, type CSSProperties } from 'react';
import manifest from '../../component.json';
import { mount, render, resolveSettings, type Controller, type Settings } from '../core';
import '../styles.css';

export type SnapDrawerProps = Partial<Settings> & {
  className?: string; style?: CSSProperties; paused?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSnapChange?: (index: number) => void;
  onAction?: (event: CustomEvent<{ settings: Settings }>) => void;
};
export function SnapDrawer({ className, style, paused = false, onOpenChange, onSnapChange, onAction, ...input }: SnapDrawerProps) {
  const host = useRef<HTMLDivElement>(null), controller = useRef<Controller | null>(null);
  const id = useId(), initial = useRef(resolveSettings(input));
  const [markup] = useState(() => ({ __html: render(resolveSettings(input), id) }));
  useEffect(() => { const instance = mount(host.current!, initial.current, id); controller.current = instance; return () => { instance.destroy(); controller.current = null; }; }, [id]);
  useEffect(() => { controller.current?.update(resolveSettings(input)); });
  useEffect(() => { if (paused) controller.current?.pause(); else controller.current?.resume(); }, [paused]);
  useEffect(() => {
    const node = host.current!;
    const toggle = (event: Event) => onOpenChange?.((event as CustomEvent<{ open: boolean }>).detail.open);
    const snap = (event: Event) => onSnapChange?.((event as CustomEvent<{ index: number }>).detail.index);
    const action = (event: Event) => onAction?.(event as CustomEvent<{ settings: Settings }>);
    node.addEventListener('snap-drawer:open-change', toggle); node.addEventListener('snap-drawer:snap-change', snap); node.addEventListener('snap-drawer:action', action);
    return () => { node.removeEventListener('snap-drawer:open-change', toggle); node.removeEventListener('snap-drawer:snap-change', snap); node.removeEventListener('snap-drawer:action', action); };
  }, [onOpenChange, onSnapChange, onAction]);
  return <div ref={host} className={className} style={style} data-arclen-component={manifest.id} dangerouslySetInnerHTML={markup} />;
}
export const Component = SnapDrawer;
