"use client";
import {useEffect,useRef,useState,type CSSProperties} from 'react';
import manifest from '../../component.json';
import {mount,render,resolveSettings,type Settings} from '../core';
import '../styles.css';
export type {Settings} from '../core';
export type EditorialFAQProps=Partial<Settings>&{className?:string;style?:CSSProperties;paused?:boolean};
export function EditorialFAQ({className='',style,paused=false,...input}:EditorialFAQProps){
 const host=useRef<HTMLDivElement>(null),controller=useRef<ReturnType<typeof mount>|null>(null);
 const serialized=JSON.stringify(resolveSettings(input));
 const [markup]=useState(()=>({__html:render(JSON.parse(serialized))}));
 useEffect(()=>{if(!host.current)return;const instance=mount(host.current,JSON.parse(serialized));controller.current=instance;return()=>{instance.destroy();controller.current=null}},[]);
 useEffect(()=>{controller.current?.update(JSON.parse(serialized));if(paused)controller.current?.pause();else controller.current?.resume()},[serialized,paused]);
 return <div ref={host} data-component={manifest.id} className={className} style={style} dangerouslySetInnerHTML={markup}/>;
}
export {EditorialFAQ as Component};
export default EditorialFAQ;
