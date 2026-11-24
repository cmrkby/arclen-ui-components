'use client';
import {useEffect,useRef,type CSSProperties} from 'react';
import {mount,resolveSettings,type FieldSettings} from '../core';
import '../styles.css';
export type AsciiStreamProps=Partial<FieldSettings>&{paused?:boolean;className?:string;style?:CSSProperties};
export function AsciiStream({paused=false,className,style,...props}:AsciiStreamProps){
  const ref=useRef<HTMLDivElement>(null),api=useRef<ReturnType<typeof mount>|null>(null);
  const values=JSON.stringify(resolveSettings(props));
  const initial=useRef({values,paused});
  useEffect(()=>{
    const instance=mount(ref.current!,JSON.parse(initial.current.values),undefined,{paused:initial.current.paused});
    api.current=instance;return ()=>{instance.destroy();api.current=null;};
  },[]);
  useEffect(()=>{api.current?.update(JSON.parse(values));},[values]);
  useEffect(()=>{if(paused)api.current?.pause();else api.current?.resume();},[paused]);
  return <div ref={ref} className={className} style={{height:'100%',...style}}/>;
}
export const Component=AsciiStream;
export const GlyphFunnel = Component;
