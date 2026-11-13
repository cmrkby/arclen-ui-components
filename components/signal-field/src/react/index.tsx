"use client";
import {useEffect,useRef,useState,type CSSProperties} from 'react';
import {mount,render,resolveSettings,type Settings} from '../core';
import '../styles.css';
export type {Settings} from '../core';
export type SignalFieldProps = Partial<Settings> & {className?:string;style?:CSSProperties;paused?:boolean};
export function SignalField({className='',style,paused=false,...input}:SignalFieldProps) {
 const root=useRef<HTMLDivElement>(null);
 const controller=useRef<ReturnType<typeof mount>|null>(null);
 const settings=resolveSettings(input);
 const serialized=JSON.stringify(settings);
 const initialSettings=useRef(serialized);
 const [initialMarkup]=useState(()=>({__html:render(settings)}));
 useEffect(()=>{if(!root.current)return;const instance = mount(root.current,JSON.parse(initialSettings.current)); controller.current = instance;return ()=>{instance.destroy();controller.current=null;};},[]);
 useEffect(()=>{controller.current?.update(JSON.parse(serialized));if(paused)controller.current?.pause();else controller.current?.resume();},[serialized,paused]);
 return <div ref={root} className={"aui-signal-field "+className} style={style} dangerouslySetInnerHTML={initialMarkup}/>;
}
export {SignalField as Component};
export default SignalField;
