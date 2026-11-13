'use client';
import {useEffect,useRef,useState,type CSSProperties} from 'react';
import manifest from '../../component.json';
import {mount,render,resolveSettings,type Settings} from '../core';
import '../styles.css';
export type NumberReelProps=Partial<Settings>&{className?:string;style?:CSSProperties;paused?:boolean};
export function NumberReel({className,style,paused=false,...input}:NumberReelProps){
  const host=useRef<HTMLSpanElement>(null),handle=useRef<ReturnType<typeof mount>|null>(null);
  const settings=resolveSettings(input),serialized=JSON.stringify(settings);
  const initialSettings=useRef(serialized);
  const [initial]=useState(()=><span ref={host} style={{display:'block'}} suppressHydrationWarning dangerouslySetInnerHTML={{__html:render(settings)}}/>);
  useEffect(()=>{const element=host.current!;element.innerHTML='';const instance=mount(element,JSON.parse(initialSettings.current));handle.current=instance;return()=>{instance.destroy();handle.current=null;};},[]);
  useEffect(()=>{handle.current?.update(JSON.parse(serialized));},[serialized]);
  useEffect(()=>{if(paused)handle.current?.pause();else handle.current?.resume();},[paused]);
  return <span className={className} style={{display:'block',...style}} data-number-reel-version={manifest.version}>{initial}</span>;
}
export const Component=NumberReel;
