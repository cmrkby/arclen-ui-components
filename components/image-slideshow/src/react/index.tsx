'use client';
import {useEffect, useRef, type CSSProperties} from 'react';
import {mount, render, resolveSettings, type Settings, type Controller} from '../core';
import '../styles.css';
export type ImageSlideshowProps = Partial<Settings> & {className?: string; style?: CSSProperties; paused?: boolean};
export function ImageSlideshow(props: ImageSlideshowProps) {
  const host = useRef<HTMLDivElement>(null), controller = useRef<Controller | null>(null), latest = useRef(props);
  latest.current = props;
  const initial = useRef<{__html: string} | null>(null);
  if (!initial.current) initial.current = {__html: render(resolveSettings(props))};
  useEffect(() => {
    controller.current = mount(host.current!, latest.current);
    return () => {controller.current?.destroy(); controller.current = null;};
  }, []);
  const settingsKey = JSON.stringify(resolveSettings(props));
  useEffect(() => {controller.current?.update(resolveSettings(latest.current));}, [settingsKey]);
  useEffect(() => {if (props.paused) controller.current?.pause(); else controller.current?.resume();}, [props.paused]);
  return <div ref={host} className={props.className} style={{width: '100%', minWidth: 0, ...(resolveSettings(props).heightMode === 'fill' ? {height: '100%'} : {}), ...props.style}} dangerouslySetInnerHTML={initial.current}/>;
}
export const Component = ImageSlideshow;
