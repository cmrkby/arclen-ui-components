"use client";
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import manifest from '../../component.json';
import { mount, render, resolveSettings, type Settings, type Controller } from '../core';
import '../styles.css';

export type { Settings } from '../core';
export type TestimonialSwipeProps = Partial<Settings> & { className?: string; style?: CSSProperties; paused?: boolean };

export function TestimonialSwipe({ className = '', style, paused = false, ...input }: TestimonialSwipeProps) {
  const host = useRef<HTMLDivElement>(null);
  const controller = useRef<Controller | null>(null);
  const settings = resolveSettings(input);
  const serialized = JSON.stringify(settings);
  const [initialMarkup] = useState(() => render(settings));
  useEffect(() => {
    if (!host.current) return;
    const instance = mount(host.current, JSON.parse(serialized));
    controller.current = instance;
    return () => { instance.destroy(); if (controller.current === instance) controller.current = null; };
    // Initial markup is stable across hydration; later props use update below.
  }, []);
  useEffect(() => {
    controller.current?.update(JSON.parse(serialized));
    if (paused) controller.current?.pause(); else controller.current?.resume();
  }, [serialized, paused]);
  return <div ref={host} className={className} style={{ height: settings.sizing === 'fill' ? '100%' : undefined, ...style }} data-component={manifest.id} dangerouslySetInnerHTML={{ __html: initialMarkup }} />;
}
export { TestimonialSwipe as Component };
export default TestimonialSwipe;
