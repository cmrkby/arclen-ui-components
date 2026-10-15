// Adapted from the owner-approved Cascade standalone package (2026-10-03).
export function installCascadeMenu() {
  if (customElements.get('arclen-radial-menu')) return;
/** Arclen public radial menu. Original geometry and lighting, refined interaction. */
const arclenLogo = "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz4KPHN2ZyBpZD0iTGF5ZXJfMSIgZGF0YS1uYW1lPSJMYXllciAxIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2MzIuMzkgNjk5LjQ2Ij4KICA8ZGVmcz4KICAgIDxzdHlsZT4KICAgICAgLmNscy0xIHsKICAgICAgICBmaWxsOiAjZmY1YTFmOwogICAgICAgIGZpbGwtcnVsZTogZXZlbm9kZDsKICAgICAgfQogICAgPC9zdHlsZT4KICA8L2RlZnM+CiAgPHBhdGggY2xhc3M9ImNscy0xIiBkPSJNMzQ4Ljg4LjQ5QzI0My41MiwxOC4yNywxNDAuNywxNTMuMzYsNTIuODMsMzg5LjQ1LDQuOTUsNTE4LjA5LTguNjcsNTkwLjk4LDUuMDcsNjQ1LjE1YzEyLjM2LDQ4Ljc2LDUyLjUyLDY3LjMxLDk3LjE1LDQ0Ljg3LDMwLjIyLTE1LjE5LDcyLjUzLTUxLjUxLDE0Ni4zNS0xMjUuNjMsOTcuOS05OC4yOSwxNDEuNDgtMTM0LjQyLDE4Ny43My0xNTUuNjIsMTIuNDctNS43MiwxMS40OC02LjMyLDEzLjcyLDguMzEsMjIuNjksMTQ4LjI1LDM5Ljk0LDIwNC42Myw3MS4xMSwyMzIuNSw1My4yNiw0Ny42MywxMTMuNTYtMjAuMTIsMTExLjItMTI0LjkzLTEuNjYtNzMuODctMzMuNzYtMTMzLjQxLTg0LjExLTE1Ni0xMy4zNi01Ljk5LTMzLjQtMTAuNjEtNDYuMDUtMTAuNjEtNC4yOCwwLTYuNDQtLjQ3LTYuNjktMS40NS0uMi0uOC0xLjM3LTE3Ljk0LTIuNTktMzguMS02LjM4LTEwNS4wNy0xMS43NC0xNDkuMjgtMjQuMDgtMTk4LjM0LTE3LjE1LTY4LjE2LTQyLjIyLTEwNi4wOS03Ny4zOS0xMTcuMDYtNy4zNi0yLjMtMzQuNS0zLjk2LTQyLjUzLTIuNk0zMTkuOTEsMTU1LjY4Yy02NC41NSwxMy40OS0xNTUuMTIsMTI3LjEzLTIxMi4xMywyNjYuMTYtNDMuNzQsMTA2LjY3LTQ1LjE1LDE3Ni40NS0zLjM2LDE2Ni42NiwyMS44My01LjExLDQyLjE0LTE5Ljk4LDExNy43OC04Ni4xOSw1Ni41Ny00OS41Miw4MC44MS02OC44MSwxMTMuNzItOTAuNDksMzMuNTUtMjIuMSw2Ny45Mi0zOC43MSw5NC41Ny00NS43LDUuNjQtMS40OCwxMC40Mi0zLjI4LDEwLjYyLTMuOTkuNTYtMS45NS04LjY3LTUwLjUyLTEzLjIxLTY5LjQ5LTE4LjU3LTc3LjcxLTQzLjczLTEyMi40Ni03NS43LTEzNC43Mi03LjMxLTIuOC0yNC4wMi0zLjk2LTMyLjI3LTIuMjNNNDk3LjYzLDM5NS43NWMwLDIuNjUsNC43OCw1Ny4zNiw2LjEsNjkuODksOC44Niw4My43NiwyMy4zLDEyMS45MSw0OC4yNSwxMjcuNDYsMTguMTEsNC4wMywzNi4zNy0xNy4yMyw0My4xNC01MC4yNSwyLjU4LTEyLjU2LDIuMTItMzkuMTktLjkyLTUzLjk1LTEwLjI4LTQ5LjktNDAuMTItODMuNjItODEuMjgtOTEuODQtOC43Ni0xLjc1LTE1LjI5LTIuMzEtMTUuMjktMS4zMSIvPgo8L3N2Zz4=";
const items = [
  {label:'Home', x:0,y:60,w:100,h:60,px:48,py:85,angle:-57,delay:100,scale:true,path:'M4 9 12 3 20 9 18 21H6Z M9 17h6'},
  {label:'Back', x:0,y:120,w:60,h:60,px:30,py:150,angle:-90,delay:200,scale:true,path:'M14 7 9 12 14 17 M9 12h9 M8 3h8q5 0 5 5v8q0 5-5 5H8q-5 0-5-5V8q0-5 5-5'},
  {label:'Profile',x:0,y:180,w:100,h:60,px:48,py:215,angle:-122,delay:300,scale:true,path:'M8 3h8q5 0 5 5v8q0 5-5 5H8q-5 0-5-5V8q0-5 5-5 M16 9a4 4 0 1 1-8 0 4 4 0 1 1 8 0 M6 20c0-7 12-7 12 0'},
  {label:'Notes',x:75,y:240,w:75,h:60,px:108.5,py:266,angle:-160,delay:400,path:'M13 21H5q-2 0-2-2V5q0-2 2-2h12q2 0 2 2v8 M7 8h8 M7 12h6 M7 16h3 M12 21l1-5 6-6 3 3-6 6Z'},
  {label:'Chat',x:150,y:240,w:75,h:60,px:191.5,py:266,angle:-200,delay:500,path:'M21 12a9 9 0 0 1-12 8l-6 1 1-6a9 9 0 1 1 17-3Z'},
  {label:'Mail',x:200,y:180,w:100,h:60,px:252,py:215,angle:-238,delay:600,path:'M3 9 12 3 21 9v10q0 2-2 2H5q-2 0-2-2Z M3 9l9 5 9-5'},
  {label:'Forward',x:240,y:120,w:60,h:60,px:270,py:150,angle:-271,delay:700,path:'M10 7 15 12 10 17 M6 12h9 M8 3h8q5 0 5 5v8q0 5-5 5H8q-5 0-5-5V8q0-5 5-5'},
  {label:'Phone',x:200,y:60,w:100,h:60,px:252,py:85,angle:-304,delay:700,path:'M4 3 9 8 7 11q2 4 6 6l3-2 5 5q-2 4-6 1C8 19 3 14 2 7q-1-3 2-4Z'}
];
const svg = path => `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="${path}"/></svg>`;
// Rounded annular sector generated from radii/angles; does not embed reference asset paths.
function annulus(start=-48,end=228) {
  const outer=150,inner=94.5,round=6.7;
  const p=(r,a)=>[150+r*Math.cos(a*Math.PI/180),150+r*Math.sin(a*Math.PI/180)].map(n=>n.toFixed(3)).join(' ');
  const dO=round/outer*180/Math.PI,dI=round/inner*180/Math.PI;
  return `M${p(outer,start+dO)} A${outer} ${outer} 0 1 1 ${p(outer,end-dO)} Q${p(outer,end)} ${p(outer-round,end)} L${p(inner+round,end)} Q${p(inner,end)} ${p(inner,end-dI)} A${inner} ${inner} 0 1 0 ${p(inner,start+dI)} Q${p(inner,start)} ${p(inner+round,start)} L${p(outer-round,start)} Q${p(outer,start)} ${p(outer,start+dO)}Z`;
}
function mask(path) {return `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 300 300'><path fill='white' d='${path}'/></svg>`)}")`;}
// Approximate duration/bounce spring. Deliberately isolated for swapping to Motion's spring.
function spring(progress,bounce=.2){
  if(progress>=1)return 1;
  const damping=1-bounce,omega=10/Math.max(.1,damping),wd=omega*Math.sqrt(1-damping*damping);
  return 1-Math.exp(-damping*omega*progress)*(Math.cos(wd*progress)+damping/Math.sqrt(1-damping*damping)*Math.sin(wd*progress));
}
const styles=`
:host{display:inline-block;width:136px;height:136px;--wheel-light:#2f3034;--button-light:#e7e7e7;--idle-light:#c5c6ca;--active-light:#fff;--glyph-light:#2f3034;--beam-light:#fff;--brand-light:#ff5a1f;--caption-background-light:#2f3034;--caption-color-light:#fff;--focus-light:#ff975e;--ring-light:#2f3035;--wheel-dark:#262626;--button-dark:#262626;--idle-dark:#a3a3a3;--active-dark:#fff;--glyph-dark:#fff;--beam-dark:#fff;--brand-dark:#ff5a1f;--caption-background-dark:#262626;--caption-color-dark:#fff;--focus-dark:#ff975e;--ring-dark:#2f3035;--wheel:var(--wheel-light);--button:var(--button-light);--idle:var(--idle-light);--active:var(--active-light);--glyph:var(--glyph-light);--beam:var(--beam-light);--brand:var(--brand-light);--caption-background:var(--caption-background-light);--caption-color:var(--caption-color-light);--focus:var(--focus-light);--ring-border:var(--ring-light);--strength:.2;color:var(--idle)}
:host([theme=dark]){--wheel:var(--wheel-dark);--button:var(--button-dark);--idle:var(--idle-dark);--active:var(--active-dark);--glyph:var(--glyph-dark);--beam:var(--beam-dark);--brand:var(--brand-dark);--caption-background:var(--caption-background-dark);--caption-color:var(--caption-color-dark);--focus:var(--focus-dark);--ring-border:var(--ring-dark)}
:host([theme=system]){--wheel:light-dark(var(--wheel-light),var(--wheel-dark));--button:light-dark(var(--button-light),var(--button-dark));--idle:light-dark(var(--idle-light),var(--idle-dark));--active:light-dark(var(--active-light),var(--active-dark));--glyph:light-dark(var(--glyph-light),var(--glyph-dark));--beam:light-dark(var(--beam-light),var(--beam-dark));--brand:light-dark(var(--brand-light),var(--brand-dark));--caption-background:light-dark(var(--caption-background-light),var(--caption-background-dark));--caption-color:light-dark(var(--caption-color-light),var(--caption-color-dark));--focus:light-dark(var(--focus-light),var(--focus-dark));--ring-border:light-dark(var(--ring-light),var(--ring-dark))}
*{box-sizing:border-box} .root{position:relative;width:136px;height:136px;isolation:isolate}
.wheel{position:absolute;width:300px;height:300px;left:-82px;top:-82px;z-index:1;transform-origin:center;overflow:clip}
.fill,.overlay{position:absolute;inset:0;mask:var(--mask) center/cover no-repeat;-webkit-mask:var(--mask) center/cover no-repeat}
.fill{background:var(--wheel)} .overlay{--mask:var(--overlay-mask);z-index:2;pointer-events:none;display:grid;place-items:center}
.light-wrapper{width:64px;height:64px;position:relative;transform:rotate(-160deg)}
.light{position:absolute;width:518px;height:44px;left:calc(50% - 259px);bottom:90px;background:var(--beam);border:.5px solid color-mix(in srgb,var(--beam) 50%,transparent);filter:blur(1px);opacity:var(--strength);transform:perspective(500px) rotate(90deg) rotateY(81deg);mix-blend-mode:hue}
.link{position:absolute;display:block;color:var(--idle);text-decoration:none;overflow:clip;outline:none;z-index:1;-webkit-tap-highlight-color:transparent}
.icon{position:absolute;width:24px;height:24px;display:block;transform:rotate(var(--counter))}
svg{display:block;width:24px;height:24px} .link[data-active]{color:var(--active)}
.link[aria-current=page] .icon::after{content:'';position:absolute;left:10px;top:29px;width:4px;height:4px;border-radius:50%;background:var(--current-marker,var(--active));pointer-events:none}
.link:focus-visible{background:#ffffff19;box-shadow:inset 0 0 0 2px var(--focus)}
.logo{left:100px;top:0;width:100px;height:60px;display:grid;place-items:center}
.logo-art{width:37.56px;height:28px;display:grid;place-items:center;transform:rotate(var(--counter));color:var(--brand)}
.logo-art img,.logo-mark{width:37.56px;height:28px;max-width:100%;max-height:28px;object-fit:contain}.logo-mark{display:block;background:var(--brand)}
.center{appearance:none;border:0;padding:16px;width:136px;height:136px;display:flex;align-items:center;justify-content:center;position:relative;z-index:3;border-radius:999px;background:var(--button);color:var(--glyph);cursor:pointer;-webkit-tap-highlight-color:transparent}
.center::after,.ring::after{content:'';position:absolute;inset:0;pointer-events:none;border-radius:inherit;border:1px solid var(--ring-border)}
.center::after{border-color:#ffffff4d} .ring{display:flex;align-items:center;justify-content:center;border-radius:999px;position:relative;flex:none}
.r1{width:104px;height:104px;padding:2px;transition:transform var(--press-release-duration,160ms) cubic-bezier(.2,.8,.2,1),box-shadow var(--center-duration,.4s),translate var(--press-release-duration,160ms) cubic-bezier(.2,.8,.2,1);box-shadow:0 1.209px .847px -.5px #00000014,0 2.866px 2.006px -1px #00000014,0 5.228px 3.660px -1.5px #00000014,0 8.692px 6.085px -2px #00000012,0 14.037px 9.826px -2.5px #00000012,0 22.978px 16.084px -3px #0000000f,0 39.566px 27.696px -3.5px #0000000d,0 72px 50.4px -4px #00000005}
.r2{width:100px;height:100px;padding:2px;opacity:.8}
.r3{width:96px;height:96px;opacity:.5;overflow:clip;transition:transform var(--press-release-duration,160ms) cubic-bezier(.2,.8,.2,1);box-shadow:inset .094px .754px .760px -.625px #0000002e,inset .241px 1.927px 1.942px -1.25px #0000002e,inset .483px 3.863px 3.893px -1.875px #0000002b,inset .915px 7.323px 7.380px -2.5px #00000029,inset 1.820px 14.557px 14.670px -3.125px #00000021,inset 4px 32px 32.249px -3.75px #0000000f}
.center-glyph{position:absolute;inset:0;display:grid;place-items:center;pointer-events:none;opacity:var(--glyph-opacity,.72);transition:transform var(--press-release-duration,160ms) cubic-bezier(.2,.8,.2,1)}
@media(hover:hover) and (pointer:fine){.center:hover .r1{translate:0 -1px;box-shadow:0 2.15px 1.935px -.375px #0000000f,0 5.096px 4.586px -.75px #0000000f,0 9.295px 8.365px -1.125px #0000000f,0 15.453px 13.908px -1.5px #0000000f,0 24.955px 22.46px -1.875px #0000000f,0 40.849px 36.764px -2.25px #0000000d,0 70.339px 63.305px -2.625px #0000000d,0 128px 115.2px -3px #0000000a}}
.center:active .r1{translate:0 2px;transform:scale(var(--press-scale,.96));transition-duration:var(--press-down-duration,120ms),var(--center-duration,.4s),var(--press-down-duration,120ms)} .center:active .r3{transform:scale(var(--press-scale,.96));transition-duration:var(--press-down-duration,120ms)}
.center:active .center-glyph{transform:translateY(2px) scale(var(--press-scale,.96));transition-duration:var(--press-down-duration,120ms)}
.center:focus-visible{outline:2px solid var(--focus);outline-offset:5px}
.caption{position:absolute;left:50%;top:234px;z-index:4;pointer-events:none;opacity:0;transform:translate(-50%,4px);transition:opacity 120ms ease-out,transform 120ms ease-out;max-width:min(260px,85vw);padding:6px 10px;border-radius:7px;background:var(--caption-background);color:var(--caption-color);font:12px/1.4 -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.caption[data-visible]{opacity:1;transform:translate(-50%,0)}
.root{touch-action:manipulation}.link{border-radius:7px}.center svg,.link svg{pointer-events:none}
:host([reduce-motion]) *, :host([reduce-motion]) *::after{transition:none!important;animation:none!important}
@media(prefers-reduced-motion:reduce){*,*::before,*::after{transition:none!important;animation:none!important}}
`;
/** Allow links, not scriptable URL schemes. Relative paths must start with /, ./, ../ or #. */
function safeHref(value){
  const href=String(value||'').trim();
  if(!href||/[\u0000-\u001f\u007f]/.test(href))return '';
  return /^(https?:|mailto:|tel:|#|\/(?!\/)|\.\/|\.\.\/)/i.test(href)?href:'';
}
const bounded=(value,fallback,min,max)=>value!==null&&value!==''&&Number.isFinite(Number(value))?Math.min(max,Math.max(min,Number(value))):fallback;
class RadialMenu extends HTMLElement {
  static observedAttributes=['theme','rotation','duration','bounce','logo-src','logo-href','logo-label','closed','active-index','current-index','reveal','labels','close-on-select','outside-close','reduce-motion','playback-speed'];
  constructor(){super();this.attachShadow({mode:'open'});this._animations=new Map();this._reveal=[];this._progress=1;this._angle=-160;this._open=true;this._active=3;this._lastLabel=0;}
  connectedCallback(){
    if(this._ready)return;this._ready=true;this._abort=new AbortController();
    this._motion=matchMedia('(prefers-reduced-motion: reduce)');
    this._motion.addEventListener('change',()=>this._settleIfReduced(),{signal:this._abort.signal});
    this._render();
  }
  disconnectedCallback(){this._cancelAnimations();this._abort?.abort();clearTimeout(this._captionTimer);this._ready=false;}
  attributeChangedCallback(name,old,value){
    if(!this._ready||old===value)return;
    if(name==='closed'){this.setOpen(value===null);return;}
    if(name==='active-index'){this.select(Number(value));return;}
    this._configure();if(name==='reduce-motion')this._settleIfReduced();
  }
  get rotation(){return bounded(this.getAttribute('rotation'),0,-360,360);}
  get duration(){return bounded(this.getAttribute('duration'),.4,0,2);}
  get bounce(){return bounded(this.getAttribute('bounce'),.2,.01,.8);}
  get reduced(){return this.hasAttribute('reduce-motion')||Boolean(this._motion?.matches);}
  get open(){return this._open;}
  set open(value){this.setOpen(Boolean(value));}
  get destinations(){return (this._destinations||[]).map(item=>({...item}));}
  set destinations(value){
    this._destinations=Array.isArray(value)?value.slice(0,8).map((d,i)=>({label:String(d?.label||items[i].label).slice(0,80),href:safeHref(d?.href),newTab:d?.newTab===true,icon:items.some(item=>item.label.toLowerCase()===d?.icon)?d.icon:items[i].label.toLowerCase()})):[];
    if(this._ready)this._configure();
  }
  _on(node,event,handler){node.addEventListener(event,handler,{signal:this._abort.signal});}
  _render(){
    this.shadowRoot.innerHTML=`<style>${styles}</style><div class="root"><button class="center" type="button" aria-label="Close navigation" aria-expanded="true" aria-controls="radial-nav"><span class="ring r1" aria-hidden="true"><span class="ring r2"><span class="ring r3"></span></span></span><span class="center-glyph" aria-hidden="true"></span></button><div class="wheel"><div class="fill"></div><nav id="radial-nav" aria-label="Radial navigation"><a class="link logo" aria-label="Arclen home"><span class="logo-art"></span></a>${items.map((item,i)=>`<a class="link item" data-index="${i}" aria-label="${item.label}" style="left:${item.x}px;top:${item.y}px;width:${item.w}px;height:${item.h}px"><span class="icon" style="left:${item.px-item.x-12}px;top:${item.py-item.y-12}px">${svg(item.path)}</span></a>`).join('')}</nav><div class="overlay"><div class="light-wrapper"><div class="light"></div></div></div></div><span class="caption" aria-hidden="true"></span></div>`;
    this._wheel=this.shadowRoot.querySelector('.wheel');this._nav=this.shadowRoot.querySelector('nav');this._center=this.shadowRoot.querySelector('.center');this._light=this.shadowRoot.querySelector('.light-wrapper');this._plane=this.shadowRoot.querySelector('.light');this._caption=this.shadowRoot.querySelector('.caption');this._links=[...this.shadowRoot.querySelectorAll('.item')];this._icons=this._links.map(link=>link.querySelector('.icon'));
    this.style.setProperty('--mask',mask(annulus()));this.style.setProperty('--overlay-mask',mask(annulus(-54,234)));
    this._on(this._center,'click',event=>this.setOpen(!this._open,{instant:event.detail===0}));
    this._links.forEach((link,i)=>{
      this._on(link,'pointerenter',event=>{if(this._open&&event.pointerType!=='touch'&&matchMedia('(hover:hover) and (pointer:fine)').matches){this.select(i);this._showCaption(i);}});
      this._on(link,'pointerleave',event=>{if(event.pointerType!=='touch'&&!link.matches(':focus-visible'))this._hideCaption();});
      this._on(link,'focus',()=>{if(this._open){this.select(i,{instant:link.matches(':focus-visible')});this._showCaption(i,true);}});
      this._on(link,'blur',()=>this._hideCaption());
      this._on(link,'click',event=>{
        // Touch has no hover state, and mobile browsers do not reliably focus links on tap.
        // Make every activation update the light and label before emitting the action.
        this.select(i,{instant:event.detail===0});
        this._showCaption(i,true);
        const destination=this._destinations?.[i];
        const accepted=this.dispatchEvent(new CustomEvent('radial-select',{detail:{index:i,label:destination?.label||items[i].label,href:destination?.href||'',newTab:destination?.newTab||false},bubbles:true,composed:true,cancelable:true}));
        if(!destination?.href||!accepted)event.preventDefault();
        if(this.hasAttribute('close-on-select'))this.setOpen(false,{instant:event.detail===0});
      });
    });
    this._on(this.shadowRoot.querySelector('.logo'),'click',event=>{
      const href=safeHref(this.getAttribute('logo-href'));
      const accepted=this.dispatchEvent(new CustomEvent('radial-brand',{detail:{href},bubbles:true,composed:true,cancelable:true}));
      if(!href||!accepted)event.preventDefault();
    });
    this._on(this.shadowRoot,'keydown',event=>this._key(event));
    this._on(document,'pointerdown',event=>{if(this.hasAttribute('outside-close')&&this._open&&!event.composedPath().includes(this))this.setOpen(false);});
    this._open=!this.hasAttribute('closed');this._progress=this._open?1:0;this._hasOpened??=this._open;
    const index=Number(this.getAttribute('active-index')??3);this._active=Number.isInteger(index)&&index>=0&&index<8?index:3;
    this._configure();this._syncOpen();this._drawSelection();this._drawWheel();
  }
  _configure(){
    this.style.setProperty('--counter',`${-this.rotation}deg`);
    this.style.setProperty('--center-duration',`${.4/bounded(this.getAttribute('playback-speed'),1,.25,1)}s`);
    const speed=bounded(this.getAttribute('playback-speed'),1,.25,1);
    this.style.setProperty('--press-down-duration',`${120/speed}ms`);this.style.setProperty('--press-release-duration',`${160/speed}ms`);
    const logo=this.shadowRoot.querySelector('.logo-art');logo.replaceChildren();
    const source=this.getAttribute('logo-src');
    if(source){const img=document.createElement('img');img.src=source;img.alt='';logo.append(img);}
    else {const mark=document.createElement('span');mark.className='logo-mark';mark.style.mask=`url("${arclenLogo}") center / contain no-repeat`;mark.style.webkitMask=mark.style.mask;logo.append(mark);}
    const brand=this.shadowRoot.querySelector('.logo');brand.href=safeHref(this.getAttribute('logo-href'))||'#';brand.setAttribute('aria-label',this.getAttribute('logo-label')||'Arclen home');
    this._links.forEach((link,i)=>{const d=this._destinations?.[i];this._icons[i].innerHTML=svg((items.find(item=>item.label.toLowerCase()===d?.icon)||items[i]).path);link.href=d?.href||'#';link.setAttribute('aria-label',d?.label||items[i].label);link.target=d?.newTab?'_blank':'_self';link.rel='noopener noreferrer';if(this.hasAttribute('current-index')&&Number(this.getAttribute('current-index'))===i)link.setAttribute('aria-current','page');else link.removeAttribute('aria-current');});
    this._drawWheel();this._hideCaption();if(this.getAttribute('labels')==='always'&&this._open)this._showCaption(this._active,true);
  }
  _key(event){
    if(event.metaKey||event.ctrlKey||event.altKey)return;
    if(event.key==='Escape'){event.preventDefault();event.stopPropagation();this.setOpen(false,{instant:true});this._center.focus();return;}
    if(!['ArrowDown','ArrowUp','ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
    event.preventDefault();event.stopPropagation();if(!this._open)this.setOpen(true,{instant:true});
    const i=this._links.indexOf(event.target),next=event.key==='Home'?0:event.key==='End'?7:i<0?0:(i+(['ArrowRight','ArrowDown'].includes(event.key)?1:-1)+8)%8;
    this._links[next].focus();
  }
  _showCaption(index,immediate=false){
    clearTimeout(this._captionTimer);
    if(this.getAttribute('labels')==='hidden'||!this._open||!items[index])return;
    const show=()=>{this._caption.textContent=this._destinations?.[index]?.label||items[index].label;this._caption.toggleAttribute('data-visible',true);this._lastLabel=performance.now();};
    if(immediate||this.getAttribute('labels')==='always'||performance.now()-this._lastLabel<500)show();else this._captionTimer=setTimeout(show,160);
  }
  _hideCaption(){clearTimeout(this._captionTimer);if(this.getAttribute('labels')!=='always'||!this._open)this._caption?.removeAttribute('data-visible');}
  _cancelAnimations(){for(const id of this._animations.values())cancelAnimationFrame(id);this._animations.clear();for(const a of this._reveal)a.cancel();this._reveal=[];}
  _settleIfReduced(){if(this.reduced){this._cancelAnimations();this._progress=this._open?1:0;this._drawWheel();this._drawSelection();}}
  _animate(key,from,to,seconds,draw){
    cancelAnimationFrame(this._animations.get(key));
    if(this.reduced||seconds===0){draw(to);this._animations.delete(key);return;}
    seconds/=bounded(this.getAttribute('playback-speed'),1,.25,1);
    const start=performance.now(),bounce=this.bounce;
    const frame=now=>{const p=Math.min(1,(now-start)/(seconds*1000));draw(from+(to-from)*spring(p,bounce));if(p<1)this._animations.set(key,requestAnimationFrame(frame));else this._animations.delete(key)};
    this._animations.set(key,requestAnimationFrame(frame));
  }
  _drawWheel(){const p=this._progress;this._wheel.style.transform=`rotate(${this.rotation}deg) scale(${.4+.6*p})`;this._wheel.style.opacity=Math.max(0,Math.min(1,p));this._wheel.style.filter=`blur(${Math.max(0,5*(1-p))}px)`;}
  _syncOpen(){this._nav.inert=!this._open;this._nav.setAttribute('aria-hidden',String(!this._open));this._wheel.style.pointerEvents=this._open?'auto':'none';this._center.setAttribute('aria-expanded',String(this._open));this._center.setAttribute('aria-label',this._open?'Close navigation':'Open navigation');this.shadowRoot.querySelector('.center-glyph').innerHTML=svg(this._open?'M5 5 19 19 M19 5 5 19':'M5 7h14 M5 12h14 M5 17h14');this.toggleAttribute('closed',!this._open);this._hideCaption();}
  _drawSelection(){this._links.forEach((link,i)=>link.toggleAttribute('data-active',i===this._active));this._plane.style.opacity=this._active>=0?'var(--strength)':'0';if(this._active>=0){this._angle=items[this._active].angle;this._light.style.transform=`rotate(${this._angle}deg)`;}}
  select(index,options={}){if(!Number.isInteger(index)||index<0||index>=items.length)return;this._active=index;this._links?.forEach((link,i)=>link.toggleAttribute('data-active',i===index));if(!this._ready)return;this._plane.style.opacity='var(--strength)';this._animate('light',this._angle,items[index].angle,options.instant?0:this.duration,v=>{this._angle=v;this._light.style.transform=`rotate(${v}deg)`});if(this.getAttribute('labels')==='always')this._showCaption(index,true);}
  setOpen(next,options={}){
    next=Boolean(next);
    if(!this._ready){this.toggleAttribute('closed',!next);return;}if(next===this._open)return;
    const accepted=this.dispatchEvent(new CustomEvent('radial-beforetoggle',{detail:{open:next},bubbles:true,composed:true,cancelable:true}));
    if(!accepted){this.toggleAttribute('closed',!this._open);return;}
    if(!next&&this._nav.contains(this.shadowRoot.activeElement))this._center.focus({preventScroll:true});
    this._open=next;for(const a of this._reveal)a.cancel();this._reveal=[];
    this._syncOpen();if(next){cancelAnimationFrame(this._animations.get('light'));this._animations.delete('light');this._active=-1;this._drawSelection();this._angle=0;this._light.style.transform='rotate(0deg)';}
    const speed=bounded(this.getAttribute('playback-speed'),1,.25,1);
    const logo=this.shadowRoot.querySelector('.logo-art'),reveal=this.getAttribute('reveal')||'original';
    const everyday=reveal==='everyday',quick=reveal==='quick'||(everyday&&this._hasOpened);
    const duration=everyday?Math.min(this.duration,next?(quick ? .4 : this.duration):.2):this.duration;
    this._animate('wheel',this._progress,next?1:0,options.instant?0:duration,v=>{this._progress=v;this._drawWheel()});
    if(next)this._hasOpened=true;
    [...this._icons,logo].forEach((element,i)=>{
      element.style.opacity=next?'1':'0';
      if(next&&!this.reduced&&!options.instant&&reveal!=='instant'){
        const isLogo=i===8,scale=isLogo||items[i]?.scale;
        const start={opacity:0,filter:'blur(5px)',transform:`rotate(${-this.rotation}deg) scale(${scale?.4:1})`};
        const end={opacity:1,filter:'blur(0px)',transform:`rotate(${-this.rotation}deg) scale(1)`};
        this._reveal.push(element.animate([start,end],{duration:(quick?220:isLogo?600:300)/speed,delay:(quick?i*20:isLogo?1000:items[i].delay)/speed,easing:'cubic-bezier(.62,0,.17,.99)',fill:'backwards'}));
      }
    });
    this.dispatchEvent(new CustomEvent('radial-toggle',{detail:{open:next},bubbles:true,composed:true}));
  }
}
customElements.define('arclen-radial-menu',RadialMenu);

}
