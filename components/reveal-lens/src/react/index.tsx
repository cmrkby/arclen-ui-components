"use client";
import {useEffect,useRef,useState,type CSSProperties} from 'react';
import manifest from '../../component.json';
import {mount,render,resolveSettings,type Settings} from '../core';
import '../styles.css';
export type {Settings} from '../core';
export type RevealLensProps = Partial<Settings> & {className?:string;style?:CSSProperties;paused?:boolean};
export function RevealLens({className='',style,paused=false,...input}:RevealLensProps) {
 const host = useRef<HTMLDivElement>(null);
 const controller = useRef<ReturnType<typeof mount>|null>(null);
 const settings = resolveSettings(input);
 const serialized = JSON.stringify(settings);
 const [initial] = useState(() => ({markup:render(settings), serialized}));
 useEffect(() => {
  if (!host.current) return;
  const instance = mount(host.current, JSON.parse(initial.serialized));
  controller.current = instance;
  return () => { instance.destroy(); if (controller.current === instance) controller.current = null; };
 }, [initial]);
 useEffect(() => {
  controller.current?.update(JSON.parse(serialized));
  if (paused) controller.current?.pause(); else controller.current?.resume();
 }, [serialized,paused]);
 return <div ref={host} data-component={manifest.id} className={className} style={{width:'100%',height:'100%',minWidth:0,...style}} dangerouslySetInnerHTML={{__html:initial.markup}}/>;
}
export {RevealLens as Component};
export default RevealLens;
