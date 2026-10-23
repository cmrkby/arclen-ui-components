"use client";
import {useEffect, useId, useRef, type CSSProperties} from 'react';
import {mount, render, resolveSettings, type Settings, type Controller} from '../core';
import '../styles.css';
export type FilterPopoverProps = Partial<Settings> & {className?: string; style?: CSSProperties; paused?: boolean; onValueChange?: (value: string) => void; onCuisineChange?: (value: string) => void};
export function FilterPopover({className, style, paused = false, onValueChange, onCuisineChange, ...input}: FilterPopoverProps) {
  const host = useRef<HTMLDivElement>(null), controller = useRef<Controller | null>(null), id = useId();
  const settings = resolveSettings(input), initial = useRef(settings), callback = useRef(onValueChange), cuisineCallback = useRef(onCuisineChange);
  callback.current = onValueChange; cuisineCallback.current = onCuisineChange;
  const markup = useRef({__html: render(initial.current, `filter-${id}`)}), key = JSON.stringify(settings);
  useEffect(() => {
    const target = host.current!, api = mount(target, initial.current, `filter-${id}`); controller.current = api;
    const change = (event: Event) => callback.current?.((event as CustomEvent<{value: string}>).detail.value);
    const cuisineChange = (event: Event) => cuisineCallback.current?.((event as CustomEvent<{value: string}>).detail.value);
    target.addEventListener('filterchange', change); target.addEventListener('cuisinechange', cuisineChange);
    return () => { target.removeEventListener('filterchange', change); target.removeEventListener('cuisinechange', cuisineChange); api.destroy(); controller.current = null; };
  }, [id]);
  useEffect(() => { controller.current?.update(settings); }, [key]);
  useEffect(() => { if (paused) controller.current?.pause(); else controller.current?.resume(); }, [paused]);
  return <div ref={host} className={className} style={style} data-arclen-component="filter-popover" dangerouslySetInnerHTML={markup.current}/>;
}
export const Component = FilterPopover;
