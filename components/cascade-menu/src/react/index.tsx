"use client";
import { useEffect, useRef, type CSSProperties } from 'react';
import manifest from '../../component.json';
import { mount, render, resolveSettings, type Controller, type Settings } from '../core';
import '../styles.css';

export interface Selection { index: number; label: string; href: string; newTab: boolean }
export type CascadeMenuProps = Partial<Settings> & {
  className?: string;
  style?: CSSProperties;
  paused?: boolean;
  onSelect?: (selection: Selection) => void;
  onOpenChange?: (open: boolean) => void;
};

export function CascadeMenu({ className, style, paused = false, onSelect, onOpenChange, ...input }: CascadeMenuProps) {
  const host = useRef<HTMLDivElement>(null);
  const controller = useRef<Controller | null>(null);
  const initial = useRef(resolveSettings(input));
  const markup = useRef({ __html: render(initial.current) });
  useEffect(() => {
    const node = host.current!;
    controller.current = mount(node, initial.current);
    return () => { controller.current?.destroy(); controller.current = null; };
  }, []);
  useEffect(() => { controller.current?.update(resolveSettings(input)); });
  useEffect(() => { if (paused) controller.current?.pause(); else controller.current?.resume(); }, [paused]);
  useEffect(() => {
    const node = host.current!;
    const selected = (event: Event) => onSelect?.((event as CustomEvent<Selection>).detail);
    const toggled = (event: Event) => onOpenChange?.((event as CustomEvent<{ open: boolean }>).detail.open);
    node.addEventListener('radial-select', selected);
    node.addEventListener('radial-toggle', toggled);
    return () => { node.removeEventListener('radial-select', selected); node.removeEventListener('radial-toggle', toggled); };
  }, [onSelect, onOpenChange]);
  return <div ref={host} className={className} style={style} data-arclen-component={manifest.id} dangerouslySetInnerHTML={markup.current} />;
}
export const Component = CascadeMenu;
