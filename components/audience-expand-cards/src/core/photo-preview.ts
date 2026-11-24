type PhotoFrame = {
  x:number; y:number; width:number; height:number; radius:number;
  imageX:number; imageY:number; imageWidth:number; shade:number;
};

// Keep the photograph at its natural aspect ratio as its clipping window changes.
function cardFrame(media:HTMLElement, image:HTMLImageElement, focus:number):PhotoFrame {
  const box=media.getBoundingClientRect();
  const imageBox=image.getBoundingClientRect(); // Includes the current hover zoom.
  const ratio=image.naturalWidth && image.naturalHeight ? image.naturalWidth/image.naturalHeight : 1.5;
  const width=Math.max(imageBox.width,imageBox.height*ratio);
  return {x:box.left,y:box.top,width:box.width,height:box.height,
    radius:parseFloat(getComputedStyle(media).borderTopLeftRadius)||0,
    imageX:imageBox.left-box.left+(imageBox.width-width)/2,
    imageY:imageBox.top-box.top+(imageBox.height-width/ratio)*focus,
    imageWidth:width,shade:1};
}

function previewFrame(panel:HTMLElement,image:HTMLImageElement):PhotoFrame {
  const box=image.getBoundingClientRect(),clip=panel.getBoundingClientRect();
  const top=Math.max(box.top,clip.top);
  return {x:box.left,y:top,width:box.width,height:Math.max(0,Math.min(box.bottom,clip.bottom)-top),
    radius:parseFloat(getComputedStyle(panel).borderTopLeftRadius)||0,
    imageX:0,imageY:box.top-top,imageWidth:box.width,shade:0};
}

function easedProgress(t:number,curve:string,power:number) {
  if(curve==='ease-in')return t**power;
  if(curve==='ease-in-out')return t<.5 ? (2*t)**power/2 : 1-(2*(1-t))**power/2;
  return 1-(1-t)**power;
}

export function photoPreview(dialog:HTMLDialogElement,signal:AbortSignal) {
  const doc=dialog.ownerDocument,win=doc.defaultView!;
  const panel=dialog.querySelector<HTMLElement>('.aud-study-panel')!;
  const destination=panel.querySelector('img')!;
  const reduced=win.matchMedia('(prefers-reduced-motion: reduce)');
  const flight=doc.createElement('div'),photo=doc.createElement('img'),shade=doc.createElement('span');
  flight.className='aud-flight';flight.setAttribute('aria-hidden','true');photo.alt='';
  shade.className='aud-flight-shade';flight.append(photo,shade);
  let origin:HTMLElement|null=null,frame:PhotoFrame|null=null,progress=0,raf=0,closing=false;
  const value=(key:string)=>parseFloat(win.getComputedStyle(dialog).getPropertyValue('--aud-'+key));
  const blend=(a:number,b:number,t:number)=>a+(b-a)*t;

  function paint(from:PhotoFrame,to:PhotoFrame,t:number,amount:number) {
    const at=(key:keyof PhotoFrame)=>blend(from[key],to[key],t);
    frame={x:at('x'),y:at('y'),width:at('width'),height:at('height'),radius:at('radius'),
      imageX:at('imageX'),imageY:at('imageY'),imageWidth:at('imageWidth'),shade:at('shade')};
    Object.assign(flight.style,{transform:'translate('+frame.x+'px,'+frame.y+'px)',left:'0',top:'0',
      width:frame.width+'px',height:frame.height+'px',borderRadius:frame.radius+'px'});
    Object.assign(photo.style,{left:frame.imageX+'px',top:frame.imageY+'px',width:frame.imageWidth+'px'});
    shade.style.opacity=String(frame.shade);
    progress=amount;
    if(closing && !dialog.hasAttribute('data-photo-arriving'))panel.style.opacity=String(amount);
    origin!.style.opacity=String(amount);
    dialog.style.setProperty('--aud-shade-visible',String(amount));
  }

  function settle() {
    win.cancelAnimationFrame(raf);raf=0;
    if(closing && dialog.open)dialog.close();
    flight.remove();frame=null;
    destination.style.visibility='';
    if(origin)origin.style.opacity='';
    panel.style.opacity='';
    dialog.removeAttribute('data-photo-arriving');
    dialog.style.removeProperty('--aud-shade-visible');
    progress=dialog.open?1:0;
    if(!dialog.open)origin=null;
  }

  function play(opening:boolean,start:PhotoFrame,end:PhotoFrame) {
    win.cancelAnimationFrame(raf);
    closing=!opening;
    const target=opening?1:0,initial=progress;
    const timing=opening?'dialogIn':'dialogOut';
    const duration=value(timing)*value('unit')*Math.abs(target-initial);
    const curve=win.getComputedStyle(dialog).getPropertyValue('--aud-'+timing+'Curve').trim();
    const power=value(timing+'Power');
    if(!duration || reduced.matches || dialog.closest('[data-paused="true"]')){settle();return;}
    dialog.append(flight);
    destination.style.visibility='hidden';
    paint(start,end,0,initial);
    const began=win.performance.now();
    function tick(now:number){
      const elapsed=Math.min(1,Math.max(0,(now-began)/duration));
      const eased=easedProgress(elapsed,curve,power);
      paint(start,end,eased,blend(initial,target,eased));
      if(elapsed===1)settle();else raf=win.requestAnimationFrame(tick);
    }
    raf=win.requestAnimationFrame(tick);
  }

  function originFrame() {
    const focus=parseFloat(win.getComputedStyle(origin!).getPropertyValue('--aud-focus'))/100;
    return cardFrame(origin!,origin!.querySelector('img')!,focus);
  }
  function close(event:Event) {
    event.preventDefault();
    if(!dialog.open || !origin || closing)return;
    const start=frame??previewFrame(panel,destination);
    play(false,start,originFrame());
  }
  dialog.addEventListener('cancel',close,{signal});
  dialog.querySelector('form')!.addEventListener('submit',close,{signal});
  dialog.addEventListener('close',()=>{if(!dialog.open)settle();},{signal});
  win.addEventListener('resize',()=>{if(raf)settle();},{signal});
  reduced.addEventListener('change',()=>{if(reduced.matches && raf)settle();},{signal});
  signal.addEventListener('abort',()=>{closing=true;settle();},{once:true});
  return {settle,open(card:HTMLElement){
    if(dialog.open)return;
    origin=card.querySelector<HTMLElement>('.aud-media')!;
    const start=originFrame();
    photo.src=origin.querySelector('img')!.src;
    flight.style.setProperty('--aud-tint',win.getComputedStyle(origin).getPropertyValue('--aud-tint'));
    dialog.setAttribute('data-photo-arriving','');
    dialog.showModal();panel.scrollTop=0;
    play(true,start,previewFrame(panel,destination));
  }};
}
