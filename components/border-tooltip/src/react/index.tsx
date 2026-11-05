'use client';
import {useEffect,useRef,useId,type CSSProperties} from 'react';
import {mount,render,resolveSettings,type Settings} from '../core';
import manifest from '../../component.json';
import '../styles.css';
export type BorderTooltipProps=Partial<Settings>&{className?:string;style?:CSSProperties;paused?:boolean};
export function BorderTooltip({className,style,paused=false,...input}:BorderTooltipProps){
 const host=useRef<HTMLDivElement>(null),controller=useRef<ReturnType<typeof mount>|null>(null),id=useId();
 const settings=resolveSettings(input),serialized=JSON.stringify(settings);
 const initial=useRef({__html:render(settings,`bt-${id.replace(/[^a-zA-Z0-9_-]/g,'')}`)});
 useEffect(()=>{controller.current=mount(host.current!,JSON.parse(serialized));return()=>{controller.current?.destroy();controller.current=null;};},[]);
 useEffect(()=>{controller.current?.update(JSON.parse(serialized));},[serialized]);
 useEffect(()=>{if(paused)controller.current?.pause();else controller.current?.resume();},[paused]);
 return <div ref={host} className={className} style={style} data-component={manifest.id} dangerouslySetInnerHTML={initial.current}/>;
}
export {BorderTooltip as Component};
