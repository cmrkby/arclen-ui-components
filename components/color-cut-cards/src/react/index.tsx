'use client';

import {useEffect, useRef, useState, type CSSProperties} from 'react';
import {mount, render, resolveSettings, type CardSettings} from '../core';
import '../styles.css';

type Props={className?:string;style?:CSSProperties;paused?:boolean;settings?:CardSettings} & Partial<Record<ControlName,string|number>>;
type ControlName = 'collection' | 'frame' | 'stage' | 'width' | 'gap' | 'radius' | 'inset' | 'titleSize' | 'rest' | 'active' | 'mobile' | 'badgeHeight' | 'circleSize' | 'glyphSize' | 'controlFill' | 'controlHover' | 'controlInk' | 'duration' | 'photoDuration' | 'zoom' | 'title1' | 'logoScale1' | 'wordmarkScale1' | 'brandGap1' | 'body1' | 'cta1' | 'href1' | 'colour1' | 'ink1' | 'crop1' | 'title2' | 'logoScale2' | 'wordmarkScale2' | 'brandGap2' | 'body2' | 'cta2' | 'href2' | 'colour2' | 'ink2' | 'crop2' | 'title3' | 'logoScale3' | 'wordmarkScale3' | 'brandGap3' | 'body3' | 'cta3' | 'href3' | 'colour3' | 'ink3' | 'crop3' | 'wideHeight' | 'midHeight' | 'phoneHeight' | 'bodySize' | 'rowGap' | 'columnGap' | 'bodyInset' | 'footGap' | 'footInset' | 'footSize' | 'badgePad' | 'badgeType' | 'arrowTravel' | 'copyLift' | 'cropX1' | 'cropX2' | 'cropX3';

export function ColorCutCards({settings,className,style,paused=false,...overrides}:Props) {
  const values=resolveSettings({...settings,...overrides});
  const [first]=useState(()=>({values,markup:{__html:render(values)}}));
  const host=useRef<HTMLDivElement>(null);
  const controller=useRef<ReturnType<typeof mount>|null>(null);
  const previous=useRef(first.values);
  useEffect(()=>{
    controller.current=mount(host.current!,first.values);
    return ()=>{controller.current?.destroy();controller.current=null;};
  },[first]);
  useEffect(()=>{
    const patch=Object.fromEntries(Object.entries(values).filter(([k,v])=>v!==previous.current[k]));
    if(Object.keys(patch).length)controller.current?.update(patch);
    previous.current=values;
  });
  useEffect(()=>{if(paused)controller.current?.pause();else controller.current?.resume();},[paused]);
  return <div ref={host} className={className} style={style} dangerouslySetInnerHTML={first.markup}/>;
}
export const Component=ColorCutCards;
export const CutawayCards = Component;
