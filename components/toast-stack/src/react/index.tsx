'use client';
import { useEffect, useRef, type CSSProperties } from 'react';
import manifest from '../../component.json';
import { mount, render, resolveSettings, setPropPaused, type Settings, type Callbacks, type Controller } from '../core';
import '../styles.css';
export type ToastStackProps = Partial<Settings> & Callbacks & { className?: string; style?: CSSProperties; paused?: boolean; onReady?: (controller: Controller) => void };
export function ToastStack({ className, style, paused = false, onAction, onDismiss, onReady, ...settings }: ToastStackProps) {
  const host = useRef<HTMLDivElement>(null);
  const controller = useRef<Controller | null>(null);
  const handlers = useRef({ onAction, onDismiss, onReady }); handlers.current = { onAction, onDismiss, onReady };
  const current = useRef(settings); current.current = settings;
  const currentPaused = useRef(paused); currentPaused.current = paused;
  const initialHtml = useRef({ __html: render(settings) });
  const serialized = JSON.stringify(Object.fromEntries(manifest.settings.filter(d => settings[d.key as keyof Settings] !== undefined).map(d => [d.key, settings[d.key as keyof Settings]])));
  const appliedSettings = useRef<string | null>(null);
  useEffect(() => {
    const api = mount(host.current!, current.current, {
      get onAction() { return handlers.current.onAction; },
      get onDismiss() { return handlers.current.onDismiss; }
    });
    controller.current = api; appliedSettings.current = serialized; setPropPaused(api, currentPaused.current); handlers.current.onReady?.(api);
    return () => { api.destroy(); controller.current = null; };
  }, []);
  useEffect(() => {
    if (controller.current && appliedSettings.current !== serialized) {
      controller.current.update(resolveSettings(current.current)); appliedSettings.current = serialized;
    }
  }, [serialized]);
  useEffect(() => { controller.current?.update({}); }, [onAction, onDismiss]);
  useEffect(() => { if (controller.current) setPropPaused(controller.current, paused); }, [paused]);
  return <div ref={host} className={className} style={style} dangerouslySetInnerHTML={initialHtml.current} />;
}
export const Component = ToastStack;
