'use client';
import {useEffect,useRef,useState,type CSSProperties} from 'react';
import {mount,render,resolveSettings,type Settings} from '../core';
import '../styles.css';

export type LiquidGlassProps=Partial<Settings>&{videoSrc?:string;imageSrc?:string;paused?:boolean;className?:string;style?:CSSProperties;onChange?:(patch:Partial<Settings>)=>void};
export function LiquidGlass({videoSrc,imageSrc,paused=false,className,style,onChange,...input}:LiquidGlassProps){
  const host=useRef<HTMLDivElement>(null);
  const api=useRef<ReturnType<typeof mount>|null>(null);
  const settings=JSON.stringify(resolveSettings(input));
  const [initial]=useState(()=>({__html:render(input)}));
  const latest=useRef({settings,paused,onChange});
  useEffect(()=>{latest.current={settings,paused,onChange};},[settings,paused,onChange]);
  useEffect(()=>{
    const instance=mount(host.current!,JSON.parse(latest.current.settings),undefined,{videoSrc,imageSrc,paused:latest.current.paused,onChange:p=>latest.current.onChange?.(p)});
    api.current=instance;return ()=>{instance.destroy();api.current=null;};
  },[videoSrc,imageSrc]);
  useEffect(()=>{api.current?.update(JSON.parse(settings));},[settings]);
  useEffect(()=>{if(paused)api.current?.pause();else api.current?.resume();},[paused]);
  return <div ref={host} className={className} style={{height:'100%',...style}} dangerouslySetInnerHTML={initial}/>;
}
export const Component=LiquidGlass;
export const TidalGlass = Component;
