'use client';
import {useEffect,useRef,useState,type CSSProperties} from 'react';
import {mount,render,resolveSettings,type Settings,type Subscribe} from '../core';
import '../styles.css';

export function NudgeFooter({settings={},paused=false,onSubscribe,className,style,...individual}:{
  settings?:Settings;paused?:boolean;onSubscribe?:Subscribe;style?:CSSProperties;className?:string;[key:string]:unknown;
}){
  const host=useRef<HTMLDivElement>(null);
  const instance=useRef<ReturnType<typeof mount>|null>(null);
  const resolved=JSON.stringify(resolveSettings({...settings,...individual}));
  const [markup]=useState(()=>({__html:render(JSON.parse(resolved))}));
  const initial=useRef({resolved,paused});
  const subscribe=useRef(onSubscribe);
  useEffect(()=>{subscribe.current=onSubscribe;},[onSubscribe]);
  const connected=!!onSubscribe;
  useEffect(()=>{
    if(!host.current)return;
    const api=mount(host.current,JSON.parse(initial.current.resolved),undefined,{
      paused:initial.current.paused,onSubscribe:connected?email=>subscribe.current!(email):undefined
    });
    instance.current=api;return ()=>{api.destroy();instance.current=null;};
  },[connected]);
  useEffect(()=>{instance.current?.update(JSON.parse(resolved));},[resolved,connected]);
  useEffect(()=>{if (paused) instance.current?.pause(); else instance.current?.resume();},[paused,connected]);
  return <div ref={host} className={className} style={style} dangerouslySetInnerHTML={markup}/>;
}
export const Component=NudgeFooter;
export const StickerFooter = Component;
