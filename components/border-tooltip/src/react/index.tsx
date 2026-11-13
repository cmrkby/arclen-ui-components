'use client';
import {useEffect,useRef,useState,useId,type CSSProperties} from 'react';
import {mount,render,resolveSettings,type Settings} from '../core';
import manifest from '../../component.json';
import '../styles.css';
export type BorderTooltipProps=Partial<Settings>&{className?:string;style?:CSSProperties;paused?:boolean};
export function BorderTooltip({className,style,paused=false,...input}:BorderTooltipProps){
 const host=useRef<HTMLDivElement>(null),controller=useRef<ReturnType<typeof mount>|null>(null),id=useId();
 const settings=resolveSettings(input),serialized=JSON.stringify(settings);
 const initialSettings=useRef(serialized);
 const [initial]=useState(()=>({__html:render(settings,`bt-${id.replace(/[^a-zA-Z0-9_-]/g,'')}`)}));
 useEffect(()=>{const instance = mount(host.current!,JSON.parse(initialSettings.current)); controller.current = instance;return()=>{instance.destroy();controller.current=null;};},[]);
 useEffect(()=>{controller.current?.update(JSON.parse(serialized));},[serialized]);
 useEffect(()=>{if(paused)controller.current?.pause();else controller.current?.resume();},[paused]);
 return <div ref={host} className={className} style={style} data-component={manifest.id} dangerouslySetInnerHTML={initial}/>;
}
export {BorderTooltip as Component};
