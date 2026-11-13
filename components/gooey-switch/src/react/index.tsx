'use client';
import {useEffect,useId,useRef,useState,type CSSProperties} from 'react';
import manifest from '../../component.json';
import {mount,render,resolveSettings,defaults,type Settings,type Controller,type ChangeDetail} from '../core';
import '../styles.css';
export type GooeySwitchProps = Partial<Settings> & {className?:string;style?:CSSProperties;paused?:boolean;defaultChecked?:boolean;onCheckedChange?:(checked:boolean,detail:ChangeDetail)=>void};
export function GooeySwitch(props:GooeySwitchProps) {
  const id=useId(),host=useRef<HTMLSpanElement>(null),controller=useRef<Controller|null>(null),latest=useRef(props);
  useEffect(() => { latest.current = props; });
  const [initial] = useState(() => ({__html:render(resolveSettings({...Object.fromEntries(manifest.settings.map(s=>[s.key,s.default])),...props,checked:props.checked??props.defaultChecked??defaults.checked}),id)}));
  useEffect(()=>{
    const p=latest.current;
    const instance=mount(host.current!,resolveSettings({...p,checked:p.checked??p.defaultChecked??defaults.checked}),{get controlled(){return latest.current.checked!==undefined;},onCheckedChange:(checked,detail)=>latest.current.onCheckedChange?.(checked,detail)}); controller.current=instance;
    return()=>{instance.destroy();controller.current=null;};
  },[]);
  useEffect(()=>{
    const settings:Partial<Settings>=resolveSettings(props);
    if(props.checked===undefined)delete settings.checked;
    controller.current?.update(settings);
    if(props.paused)controller.current?.pause();else controller.current?.resume();
  });
  return <span ref={host} className={props.className} style={{display:'inline-block',maxWidth:'100%',...props.style}} dangerouslySetInnerHTML={initial}/>;
}
export const Component=GooeySwitch;
