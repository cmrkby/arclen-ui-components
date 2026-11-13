"use client";
import { useEffect, useRef,useState, type CSSProperties } from 'react';
import manifest from '../../component.json';
import { mount, render, resolveSettings, type Controller, type Selection, type Settings } from '../core';
import '../styles.css';
export type GooeyMenuProps = Partial<Settings> & { className?: string; style?: CSSProperties; paused?: boolean; onSelect?: (selection: Selection) => void; onOpenChange?: (open: boolean) => void };
export function GooeyMenu({ className, style, paused = false, onSelect, onOpenChange, ...input }: GooeyMenuProps) {
  const host = useRef<HTMLDivElement>(null);
  const controller = useRef<Controller | null>(null);
  const initial = useRef(resolveSettings(input));
  const [markup] = useState(() => ({ __html: render(resolveSettings(input)) }));
  useEffect(() => { const instance = mount(host.current!, initial.current); controller.current = instance; return () => { instance.destroy(); controller.current = null; }; }, []);
  useEffect(() => { controller.current?.update(input); });
  useEffect(() => {
    if (paused) controller.current?.pause();
    else controller.current?.resume();
  }, [paused]);
  useEffect(() => {
    const node = host.current!;
    const select = (event: Event) => onSelect?.((event as CustomEvent<Selection>).detail);
    const toggle = (event: Event) => onOpenChange?.((event as CustomEvent<{open:boolean}>).detail.open);
    node.addEventListener('gooey-select', select); node.addEventListener('gooey-toggle', toggle);
    return () => { node.removeEventListener('gooey-select', select); node.removeEventListener('gooey-toggle', toggle); };
  }, [onSelect, onOpenChange]);
  return <div ref={host} className={className} style={style} data-arclen-component={manifest.id} suppressHydrationWarning dangerouslySetInnerHTML={markup} />;
}
export const Component = GooeyMenu;
