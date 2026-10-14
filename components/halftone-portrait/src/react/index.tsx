"use client";
import {useEffect,useRef,useState,type CSSProperties} from 'react';
import {mount,render,resolveSettings,type Settings} from '../core';
import '../styles.css';
export type {Settings} from '../core';
export type HalftonePortraitProps = Partial<Settings> & {className?:string;style?:CSSProperties;paused?:boolean};
export function HalftonePortrait({className='',style,paused=false,...input}:HalftonePortraitProps) {
 const root=useRef<HTMLDivElement>(null);
 const controller=useRef<ReturnType<typeof mount>|null>(null);
 const settings=resolveSettings(input);
 const serialized=JSON.stringify(settings);
 const [initialMarkup]=useState(()=>render(settings));
 useEffect(()=>{if(!root.current)return;controller.current=mount(root.current,JSON.parse(serialized));return ()=>{controller.current?.destroy();controller.current=null;};},[]);
 useEffect(()=>{controller.current?.update(JSON.parse(serialized));if(paused)controller.current?.pause();else controller.current?.resume();},[serialized,paused]);
 return <div ref={root} className={"aui-halftone-portrait "+className} style={style} dangerouslySetInnerHTML={{__html:initialMarkup}}/>;
}
export {HalftonePortrait as Component};
export default HalftonePortrait;
