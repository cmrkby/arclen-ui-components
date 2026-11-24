'use client';
import {useEffect,useRef,useState,type CSSProperties,type ReactNode} from 'react';
import {mount,render,resolveSettings,type Settings} from '../core';
import '../styles.css';

export type PrismFlowProps=Partial<Settings>&{children?:ReactNode;className?:string;style?:CSSProperties;paused?:boolean};
export function PrismFlow({children,className,style,paused=false,...input}:PrismFlowProps) {
  const host=useRef<HTMLDivElement>(null);
  const controller=useRef<ReturnType<typeof mount>|null>(null);
  const settings=resolveSettings(children==null?input:{...input,caption:''});
  const key=JSON.stringify(settings);
  const [first]=useState(()=>({settings,paused,markup:{__html:render(settings)}}));
  useEffect(()=>{
    const api=mount(host.current!,first.settings,undefined,{paused:first.paused});
    controller.current=api;
    return ()=>{api.destroy();controller.current=null;};
  },[first]);
  useEffect(()=>{controller.current?.update(JSON.parse(key));},[key]);
  useEffect(()=>{if(paused)controller.current?.pause();else controller.current?.resume();},[paused]);
  return <div className={'pf-host'+(className?' '+className:'')} style={style}>
    <div className="pf-field" ref={host} dangerouslySetInnerHTML={first.markup}/>
    {children!=null && <div className="pf-children" data-entrance={settings.entrance}>{children}</div>}
  </div>;
}
export const Component=PrismFlow;
export const SpectralRibbon = Component;
