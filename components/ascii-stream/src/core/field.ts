type RibbonNumber = 1|2|3|4|5|6;
type RibbonKey = `ribbon${RibbonNumber}`;
type ShapeKey = 'Spread'|'Bend'|'Width';
type IndividualSettings = Record<`${RibbonKey}${''|'Start'|'End'}${ShapeKey}` | `${RibbonKey}${'Ink'|'Offset'}`,number>
  & Record<`${RibbonKey}${'Visible'|'Custom'}`,boolean> & Record<`${RibbonKey}Color`,string>;
const ribbonKeys = ['ribbon1','ribbon2','ribbon3','ribbon4','ribbon5','ribbon6'] as const;
export interface FieldSettings extends IndividualSettings {
  axisCenter:number; axisRise:number; flarePosition:number; startSpread:number; endSpread:number; haze:number; rimWidth:number;
  patchCount:number; patchLength:number; patchSpeed:number; patchSoftness:number;
  twinkleSpeed:number; twinkleDuration:number; beamTwinkle:number; rowGap:number; glyphBlur:number; glyphGlow:number;
  beamWidth:number; beamTint:string; beamHalo:number; flareReach:number; flareHeight:number;
  pointerRadius:number; pointerDuration:number; pointerPower:number; pointerTravel:number; revealFeather:number; beamEntranceOffset:number;
  colourway:'ember-rose'|'violet-ember'|'silver-ember'|'ultraviolet'|'glacier'|'verdigris'|'custom';
  background:string; inner:string; outer:string; flareColor:string; axis:string; streams:number;
  spread:number; curve:number; pinch:number; lines:number; sheen:number; alphabet:string;
  message:string; size:number; spacing:number; rows:number; ink:number; speed:number; shuffle:number;
  beam:number; glow:number; flare:number; pulse:number; pulseSpeed:number; burstInterval:number;
  patches:number; twinkle:number; depth:number; filaments:number; beamType:number; grain:number; interactive:boolean; intro:boolean; delay:number; duration:number;
}
type RGB = [number,number,number];
type Flash = {x:number; born:number; lane:number};
const white:RGB=[249,248,255];
const rgb=(hex:string):RGB=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)) as RGB;
const mix=(a:RGB,b:RGB,t:number):RGB=>a.map((v,i)=>Math.round(v+(b[i]-v)*t)) as RGB;
const rgba=(c:RGB,a:number)=>'rgba('+c.join(',')+','+Math.min(1,a)+')';
// Each longitudinal section has its own tilt, bend and perspective at the mouth.
const sections=[
  [-.184,-.040,-.040], [.231,.069,.065], [.105,.002,.008],
  [-.252,-.152,-.116], [-.093,0,-.008], [.306,.188,.162]
];
const ridges=sections.map(([tilt,bend,lip])=>tilt+bend+lip);
const panelWidths=[.142,.090,.057,.118,.052,.097];
const typeOffsets=[-.86,-.02,.36,-.25,.36,.02];
const tintAcrossLanes=[.04,.72,.14,.61,.10,.66];

const hash=(n:number)=>{const h=Math.imul(n^(n>>>16),0x45d9f3b);return ((h^(h>>>16))>>>0)/4294967296;};
export function makeField(canvas:HTMLCanvasElement,ctx:CanvasRenderingContext2D){
  const plate=document.createElement('canvas'), plateCtx=plate.getContext('2d')!;
  const atlas=document.createElement('canvas'), glyphCtx=atlas.getContext('2d')!;
  let s:FieldSettings, length=1,cross=1,vertical=false,ratio=1;
  let colors:RGB[]=[], glyphs:string[]=[], stamps=new Map<string,number>(), sequence:string[]=[];
  type SideShape={spread:number;bend:number;width:number};
  let lanes:{start:SideShape;end:SideShape;ink:number;offset:number}[]=[];
  let visibleLanes:number[]=[];
  let axisY=0,slope=0;
  const axisAt=(x:number)=>axisY+slope*length*(x-s.pinch/100);
  function alignBeam(ctx:CanvasRenderingContext2D){
    ctx.transform(1,slope,0,1,0,-slope*length*s.pinch/100);
  }
  let beamLayer:CanvasRenderingContext2D|null=null;
  let flashes:Flash[]=[],lastLane=-1;
  const distance=(x:number)=>{const p=s.pinch/100;return (x-p)/(x<p?p:1-p);};
  const radius=(x:number)=>{
    const u=Math.abs(distance(x));
    return .64*Math.pow(u,s.curve*.77)+.36*Math.pow(u,s.curve*2.12);
  };
  function ordinate(x:number,lane:number,offset=0){
    const u=Math.pow(Math.abs(distance(x)),s.curve/1.45);
    const [tilt,bend,lip]=sections[lane];
    const start=x<s.pinch/100;
    const laneShape=start?lanes[lane].start:lanes[lane].end;
    const opening=start?s.startSpread:s.endSpread;
    const rise=u*(tilt+u*(bend+u*u*lip)*laneShape.bend)*s.spread*opening*laneShape.spread;
    // The near lip opens faster than the film behind it. The separation goes to
    // zero in the throat, so adjusting depth never creates a knot at the centre.
    const thickness=(.003*u+panelWidths[lane]*u*u)*s.depth*laneShape.width;
    return axisAt(x)+cross*(rise+offset*thickness);
  }
  const yAt=(x:number,i:number)=>ordinate(x,i);
  interface Profile {rim:Path2D;threads:Path2D[]}
  let profiles:Profile[]=[];
  // Each strip widens with distance from the waist. Adjacent bands meet at the same sample.
  function contour(lane:number,offset:number){
    const path=new Path2D();
    for(let j=0;j<=160;j++){
      const u=j/160;
      const y=ordinate(u,lane,offset*Math.sign(ridges[lane]));
      const x=u*length;
      if(j===0)path.moveTo(x,y);else path.lineTo(x,y);
    }
    return path;
  }
  function profile(lane:number):Profile{
    return {rim:contour(lane,0),threads:[-.54,.58,1.08].map(o=>contour(lane,o))};
  }
  // Colour channels add on an opaque ground, avoiding grey fringes at low alpha.
  function luminous(color:RGB,power:number,tint:number):string{
    return rgba(mix(color,white,tint),Math.max(0,power));
  }
  function halo(c:CanvasRenderingContext2D,x:number,y:number,rx:number,ry:number,color:RGB,power:number){
    if(power<=0 || rx<=0 || ry<=0)return;
    c.save();c.translate(x,y);c.scale(rx,ry);
    const g=c.createRadialGradient(0,0,0,0,0,1);
    for(const [p,a] of [[0,1],[.12,.78],[.34,.36],[.67,.075],[1,0]])g.addColorStop(p,rgba(color,a*power));
    c.fillStyle=g;c.fillRect(-1,-1,2,2);c.restore();
  }
  function cacheRibbons(){
    plate.width=Math.ceil(length*ratio);plate.height=Math.ceil(cross*ratio);
    const c=plateCtx;c.setTransform(ratio,0,0,ratio,0,0);
    c.globalCompositeOperation='lighter';
    // The scattered light from the full bundle broadens with its aperture.
    // A small transverse texture is stretched across the changing cross-section.
    const haze=document.createElement('canvas');haze.width=1;haze.height=256;
    const hazeCtx=haze.getContext('2d')!,fog=hazeCtx.createLinearGradient(0,0,0,256);
    const mist=mix(rgb(s.inner),rgb(s.outer),.26);
    for(const [stop,power] of [[0,0],[.14,.10],[.32,.20],[.48,.23],[.62,.21],[.84,.13],[1,0]]){
      fog.addColorStop(stop,rgba(mist,power*s.haze*Math.min(2,s.glow*s.sheen)*Math.min(1,visibleLanes.length/4)));
    }
    hazeCtx.fillStyle=fog;hazeCtx.fillRect(0,0,1,256);
    for(let col=0;col<plate.width;col+=2){
      const x=col/plate.width,u=Math.abs(distance(x));
      const width=cross*(.045+radius(x)*.87*s.spread);
      c.globalAlpha=.07+.53*u;c.drawImage(haze,col/ratio,axisAt(x)-width,2/ratio,width*2);
    }
    c.globalAlpha=1;
    profiles=[];
    for(const i of visibleLanes){
      const {rim,threads}=profiles[i]=profile(i);
      const color=colors[i];
      const innerLane=Math.abs(ridges[i])<.2;
      const sweep=c.createLinearGradient(0,0,length,0);
      const weight=innerLane?.70:(i===3||i===5?.82:1);
      const pinch=s.pinch/100;
      const lower=ridges[i]>0;
      const fineCore=lower?1-.70*s.patches:1;
      for(const [u,power] of [[0,.77],[.30,.94],[.50,.85],[.62,.62],[.73,.16],[.81,0],[1,0]]){
        sweep.addColorStop(u*pinch,luminous(color,power*weight,0));
        if(u<1)sweep.addColorStop(1-u*(1-pinch),luminous(color,power*weight,0));
      }
      // Warp a continuous transverse density profile along the ribbon. Samples share
      // device-pixel boundaries so the soft face has no seams between vector bands.
      if(s.sheen && s.depth){
        const film=document.createElement('canvas');film.width=1;film.height=256;
        const f=film.getContext('2d')!,gradient=f.createLinearGradient(0,0,0,256);
        for(let j=0;j<=64;j++){
          const k=-.56+1.96*j/64;
          const face=.32*Math.exp(-Math.pow((k-.25)/.83,2));
          const lip=.47*Math.exp(-Math.abs(k)*5.8);
          const stop=ridges[i]>0?j/64:1-j/64;
          const edgeDistance=Math.min(j,64-j)/12;
          const fade=1-s.patches*(1-Math.min(1,edgeDistance))**2;
          gradient.addColorStop(stop,rgba(color,(face+lip)*s.sheen*(lower?fade:1)));
        }
        f.fillStyle=gradient;f.fillRect(0,0,1,256);
        for(let col=0;col<plate.width;col+=2){
          const x=(col+1)/plate.width;
          const extent=ordinate(x,i,1)-yAt(x,i);
          const edge=yAt(x,i)-(ridges[i]>0?.56:1.4)*extent;
          c.globalAlpha=weight*Math.min(.93,Math.max(0,(Math.abs(distance(x))-.20)*2.15));
          c.drawImage(film,col/ratio,edge,2/ratio,extent*1.96);
        }
      }
      c.globalAlpha=1;
      for(const [index,path] of threads.entries()){
        c.strokeStyle=sweep;c.lineWidth=.9;
        c.globalAlpha=Math.min(1,fineCore*s.filaments*s.lines*(index===1?.43:.26));c.stroke(path);
        c.globalAlpha=Math.min(1,s.filaments*s.glow*.074);c.lineWidth=4.5;c.stroke(path);
      }
      c.globalAlpha=1;
      if(innerLane){
        const nearBeam=contour(i,-.54);
        const glint=c.createLinearGradient(0,0,length,0);
        glint.addColorStop(0,rgba(mix(color,rgb(s.flareColor),.38),.62));
        glint.addColorStop(pinch,rgba(color,0));glint.addColorStop(1,rgba(mix(color,rgb(s.flareColor),.38),.62));
        c.strokeStyle=glint;c.lineWidth=1.5;c.globalAlpha=Math.min(1,fineCore*s.lines*s.filaments*.85);
        c.stroke(nearBeam);
      }
      if(Math.abs(ridges[i])>.40){
        // Long, widely separated filaments skim the outside of each sheet.
        for(const [edge,strength] of [[1.9,.72],[3.4,.47],[5.1,.25]]){
          const thread=contour(i,edge);
          const threadLight=c.createLinearGradient(0,0,length,0);
          for(const position of [0,pinch*.40,pinch*.75,pinch,pinch+(1-pinch)*.25,pinch+(1-pinch)*.60,1]){
            const strength=Math.min(1,Math.max(0,(Math.abs(distance(position))-.22)*1.7));
            threadLight.addColorStop(position,rgba(rgb(s.inner),.84*strength));
          }
          c.strokeStyle=threadLight;
          for(const [width,gain] of [[7,.08],[2.8,.17],[1.1,.68]]){
            c.globalAlpha=Math.min(1,(width<3?fineCore:1)*s.filaments*s.lines*strength*gain);
            c.lineWidth=width;c.stroke(thread);
          }
        }
      }
      for(const [width,power] of [[48,.028],[30,.049],[16,.083],[8,.11],[4,.24],[2,.51],[1,.96]]){
        c.lineWidth=s.rimWidth*width*(.63+cross/1500);
        c.globalAlpha=Math.min(1,power*s.lines*(width>3?s.glow:fineCore));c.strokeStyle=sweep;c.stroke(rim);
      }
    }
    c.globalAlpha=1;
    if(s.grain>0){
      // source-atop confines grain to the light-bearing surfaces.
      const tile=document.createElement('canvas');tile.width=tile.height=96;
      const noise=tile.getContext('2d')!,bytes=noise.createImageData(96,96);
      for(let i=0;i<96*96;i++){
        const tone=hash(i*197)<.51?0:255;
        bytes.data.set([tone,tone,tone,Math.round(42*s.grain)],i*4);
      }
      noise.putImageData(bytes,0,0);c.globalCompositeOperation='source-atop';
      c.fillStyle=c.createPattern(tile,'repeat')!;c.fillRect(0,0,length,cross);
    }
    c.globalCompositeOperation='destination-over';c.fillStyle=s.background;c.fillRect(0,0,length,cross);
  }
  function cacheAlphabet(){
    sequence=Array.from(s.message||s.alphabet);
    glyphs=[...new Set(sequence)];stamps=new Map(glyphs.map((c,i)=>[c,i]));
    atlas.width=Math.max(1,glyphs.length)*32;atlas.height=32*6;
    glyphCtx.filter=s.glyphBlur?'blur('+s.glyphBlur+'px)':'none';glyphCtx.shadowBlur=s.glyphGlow;glyphCtx.font='700 24px ui-monospace, monospace';glyphCtx.textAlign='center';glyphCtx.textBaseline='middle';
    colors.forEach((color,row)=>{glyphCtx.shadowColor=rgba(color,.85);glyphCtx.fillStyle=rgba(mix(color,white,.45),1);
      glyphs.forEach((g,i)=>glyphCtx.fillText(g,i*32+16,row*32+16));});
  }
  function configure(settings:FieldSettings,w:number,h:number,dpr:number){
    const prev=s;
    const isVertical=settings.axis==='vertical'||(settings.axis==='auto'&&w/h<.85);
    const boundsChanged=!prev||vertical!==isVertical||length!==(isVertical?h:w)||cross!==(isVertical?w:h)||ratio!==dpr;
    const changed=(keys:(keyof FieldSettings)[])=>!prev||keys.some(key=>prev[key]!==settings[key]);
    const paletteChanged=changed(['inner','outer'])||ribbonKeys.some(key=>changed([`${key}Custom`,`${key}Color`]));
    const geometryChanged=boundsChanged||changed(['streams','spread','curve','pinch','axisCenter','axisRise','startSpread','endSpread','depth'])
      ||ribbonKeys.some(key=>changed([
        `${key}Visible`,`${key}Spread`,`${key}Bend`,`${key}Width`,
        `${key}StartSpread`,`${key}StartBend`,`${key}StartWidth`,`${key}EndSpread`,`${key}EndBend`,`${key}EndWidth`
      ]));
    s=settings;vertical=isVertical;length=vertical?h:w;cross=vertical?w:h;ratio=dpr;
    axisY=cross*s.axisCenter/100;slope=-cross*s.axisRise/(100*length);
    visibleLanes=ribbonKeys.flatMap((key,i)=>i<s.streams && s[`${key}Visible`]?[i]:[]);
    const sideShape=(key:RibbonKey,side:'Start'|'End'):SideShape=>({
      spread:s[`${key}Spread`]*s[`${key}${side}Spread`],
      bend:s[`${key}Bend`]*s[`${key}${side}Bend`],
      width:s[`${key}Width`]*s[`${key}${side}Width`]
    });
    lanes=ribbonKeys.map(key=>({
      start:sideShape(key,'Start'),end:sideShape(key,'End'),
      ink:s[`${key}Ink`],offset:s[`${key}Offset`]
    }));
    if(boundsChanged){
      canvas.width=Math.max(1,Math.round(w*ratio));canvas.height=Math.max(1,Math.round(h*ratio));
      canvas.dataset.axis=vertical?'vertical':'horizontal';
    }
    if(paletteChanged){
      const inner=rgb(s.inner),outer=rgb(s.outer);
      colors=ribbonKeys.map((key,i)=>{
        if(s[`${key}Custom`])return rgb(s[`${key}Color`]);
        const hue=mix(inner,outer,tintAcrossLanes[i]);
        return hue.map((v,j)=>Math.round(255*Math.pow(v/255,j===2?1:1.58))) as RGB;
      });
    }
    if(geometryChanged||paletteChanged||changed(['background','haze','glow','sheen','filaments','lines','rimWidth','patches','grain','flareColor']))cacheRibbons();
    if(paletteChanged||changed(['message','alphabet','glyphBlur','glyphGlow']))cacheAlphabet();
    if(geometryChanged){
      lastLane=-1;flashes=flashes.filter(f=>f.lane<0||visibleLanes.includes(f.lane));
    }
  }
  function pointer(x:number,y:number,t:number,click:boolean){
    const along=(vertical?y:x)/length, across=vertical?cross-x:y;
    let lane=-1,nearest=Infinity;
    for(const i of visibleLanes){const d=Math.abs(yAt(along,i)-across);if(d<nearest && d<s.pointerRadius){nearest=d;lane=i;}}
    if(click || (lane!==-1 && lane!==lastLane)){
      flashes.push({x:along,born:t,lane:click?-1:lane});if(flashes.length>12)flashes.shift();
    }
    lastLane=lane;
  }
  const wrap=(n:number)=>n-Math.floor(n);
  function highlight(x:number,phase:number){
    const d=Math.abs(wrap(x-phase+.5)-.5);
    return Math.exp(-d*d/.009);
  }
  function stampGlyph(ctx:CanvasRenderingContext2D,symbol:number,lane:number,x:number,y:number,angle:number,size:number,alpha:number){
    if(alpha<.012)return;
    const stamp=stamps.get(sequence[symbol])!;
    ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.globalAlpha=Math.min(1,alpha);
    ctx.drawImage(atlas,stamp*32,lane*32,32,32,-size*.69,-size*.69,size*1.38,size*1.38);ctx.restore();
  }
  function letters(ctx:CanvasRenderingContext2D,t:number,extent:number,ribbons:boolean,beamLight:boolean){
    if(!s.ink || !sequence.length)return;
    const pitch=s.size*.62*s.spacing;
    // The light on the axis has its own straight type rows. Curved ribbons dissolve before crossing them.
    const indices=ribbons?visibleLanes:[];
    for(let slot=beamLight?-1:0;slot<indices.length;slot++){
      const i=slot===-1?-1:indices[slot];
      const onAxis=i===-1,rows=onAxis?Math.min(4,s.rows+1):s.rows;
      for(let row=0;row<rows;row++){
        const seed=(i+2)*77+row,phase=wrap(t*s.pulseSpeed*.11+i*.213);
        const drift=t*s.speed*(.7+hash(seed)*.64);
        const start=-Math.floor(drift)-1;
        for(let cell=start;cell<start+Math.ceil(length*extent/pitch)+3;cell++){
          const lx=(cell+drift+hash(seed*349))*pitch,x=lx/length;
          if(x<0||x>1||x>extent)continue;
          const u=Math.abs(distance(x)),index=cell*71+seed*9751;
          const symbol=s.message?((cell%sequence.length)+sequence.length)%sequence.length:Math.floor(hash(index+Math.floor(t*s.shuffle+hash(index))*389)*sequence.length);
          // The phase travels with the glyph, so a bright character stays on its ribbon.
          const timing=hash(index+13007);
          const phaseInCycle=wrap(t*s.twinkleSpeed*(.78+1.2*timing)+hash(index+40037));
          const peak=Math.max(0,1-Math.abs(phaseInCycle-.5)*4.6/s.twinkleDuration);
          const glint=peak*peak*(3-2*peak);
          const twinkle=1+s.twinkle*(glint*(1.7+1.25*timing)-.24);
          if(onAxis){
            const shoulder=Math.exp(-u*u/.095)+.65*Math.pow(x,5);
            const y=axisAt(x)+(row-(rows-1)/2)*s.size*.91*s.rowGap;
            stampGlyph(ctx,symbol,0,lx,y,Math.atan(slope),s.size*.74,s.beam*s.beamType*s.ink*(.08+.54*shoulder)*(.47+.53*hash(index))*(1+(twinkle-1)*s.beamTwinkle/100));
          }else{
            const opened=Math.max(0,Math.min(1,(u-.23)/.4));
            const lowerSeparation=ridges[i]>0?.22*s.patches:0;
            const offset=typeOffsets[i]+lanes[i].offset+lowerSeparation+(row-(s.rows-1)/2)*.13*s.rowGap;
            const angle=Math.atan((ordinate(x+.001,i,offset)-ordinate(x-.001,i,offset))/(.002*length));
            const y=ordinate(x,i,offset);
            const light=highlight(x,phase);
            const alpha=twinkle*s.ink*opened*lanes[i].ink*(.06+.51*u*u+.57*s.pulse*light)*(.45+.55*hash(index));
            stampGlyph(ctx,symbol,i,lx,y,angle,s.size*(.38+.42*u),alpha);
          }
        }
      }
    }
  }
  function streak(lane:number,x:number,strength:number,reach=.15,softness=0){
    if(!strength)return;
    const color=colors[lane],g=ctx.createLinearGradient((x-reach)*length,0,(x+reach)*length,0);
    for(const [stop,a] of [[0,0],[.14,.045],[.28,.26],[.41,.79],[.5,1],[.59,.79],[.72,.26],[.86,.045],[1,0]]){
      g.addColorStop(stop,luminous(color,strength*a,.60*a));
    }
    ctx.strokeStyle=g;
    for(const [width,power] of [[18,.055],[9,.12],[4,.31],[1.9,.96]]){
      ctx.globalAlpha=Math.min(1,power*(width>4?s.glow:1)*(width<=2?1-.78*softness:1));
      ctx.lineWidth=width*(1+.85*softness);ctx.stroke(profiles[lane].rim);
    }
    ctx.globalAlpha=1;
  }
  function drawLayers(ctx:CanvasRenderingContext2D,t:number,progress:number,ribbons:boolean,beamLight:boolean){
    ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,canvas.width,canvas.height);
    if(progress<=0)return;
    if(vertical)ctx.setTransform(0,ratio,-ratio,0,canvas.width,0);else ctx.setTransform(ratio,0,0,ratio,0,0);
    ctx.globalCompositeOperation='source-over';
    if(ribbons)ctx.drawImage(plate,0,0,length,cross);
    ctx.globalCompositeOperation='lighter';
    const cy=axisY,blue=mix(rgb(s.inner),rgb(s.beamTint),.53),warm=rgb(s.flareColor);
    const centre=s.pinch/100;
    if(beamLight){
      ctx.save();alignBeam(ctx);
      // Broad scatter and a narrower blue core extend along the beam.
      halo(ctx,length*centre,cy,length*.48,cross*.27*s.beamHalo,mix(rgb(s.inner),blue,.20),.34*s.glow*s.beam);
      halo(ctx,length*centre,cy,length*.32,cross*.091*s.beamHalo,mix(rgb(s.inner),blue,.60),.75*s.glow*s.beam);
      halo(ctx,length*centre,cy,length*.19,cross*.037*s.beamHalo,mix(blue,white,.32),.93*s.beam);
      ctx.restore();
    }
    for(const i of ribbons?visibleLanes:[]){
      const cycle=t*s.pulseSpeed*.7+i*1.77;
      const crest=.26+.77*wrap(t*s.pulseSpeed*(.16+i*.007)+i*.217);
      const energy=s.pulse*(i===0||i===1?1.38:.79)*(.91+.24*Math.cos(cycle*.75));
      const width=.095+.038*(.5+.5*Math.cos(cycle));
      const envelope=Math.min(1,(crest-.26)*9,(1.03-crest)*11);
      const breakup=ridges[i]>0?s.patches:0;
      streak(i,centre*(1-crest),energy*envelope*(1-breakup),width);
      streak(i,centre+(1-centre)*crest,energy*envelope*(1-breakup),width);
      if(breakup && energy){
        // Offset the two walls. Soft pools of reflected light drift apart as the mouth opens.
        for(const side of [-1,1]){
          const span=side<0?centre:1-centre;
          for(let patch=0;patch<s.patchCount;patch++){
            const seed=i*73+side*11+patch*37;
            const phase=wrap(t*s.patchSpeed*s.pulseSpeed*(.13+.04*hash(seed))+hash(seed+31)+patch*.42);
            const radial=.21+.90*phase;
            const fade=Math.min(1,phase*8,(1-phase)*9);
            const reach=s.patchLength*span*(.047+.12*radial)*(.85+.45*hash(seed+53));
            streak(i,centre+side*span*radial,energy*breakup*fade*(.85+.32*hash(seed+14)),reach,Math.min(1.25,breakup*s.patchSoftness));
          }
        }
      }
    }
    const auto=s.burstInterval>0 && t>=s.burstInterval?t%s.burstInterval:Infinity;
    if(beamLight){
      const flareAt=s.flarePosition/100;
      ctx.save();alignBeam(ctx);
      const beam=ctx.createLinearGradient(0,0,length,0);
      for(const [p,a] of [[0,.68],[centre*.7,.52],[centre,1],[(1+centre)/2,.64],[1,1]])beam.addColorStop(p,rgba(mix([blue[0]*.74,blue[1]*1.23,blue[2]],white,a*.48),a*s.beam));
      ctx.fillStyle=beam;ctx.fillRect(0,cy-s.beamWidth/2,length,s.beamWidth);
      halo(ctx,centre*length,cy,length*.14,cross*.012,white,.94*s.beam);
      const arrival=Number.isFinite(auto)?Math.exp(-Math.pow((auto-flareAt*.96)/.19,2)):0;
      const intensity=s.flare*(.97+.08*Math.cos(t*1.4)+.30*arrival*s.pulse);
      halo(ctx,flareAt*length,cy,length*.38*s.flareReach,cross*.13*s.flareHeight,mix(warm,[255,134,156],.33),.98*intensity);
      halo(ctx,flareAt*length,cy,length*.29*s.flareReach,cross*.065*s.flareHeight,warm,1.1*intensity);
      halo(ctx,flareAt*length,cy,length*.21*s.flareReach,cross*.029*s.flareHeight,mix(warm,white,.6),intensity);
      ctx.restore();
    }
    letters(ctx,t,Math.min(1,progress+.06),ribbons,beamLight);
    function pulse(x:number,lane:number,age:number,strength=1){
      if(x<0||x>1)return;
      if(ribbons && lane>=0 && profiles[lane])streak(lane,x,(1-age)*s.pulse*strength);
      else if(beamLight && lane<0)halo(ctx,x*length,axisAt(x),length*.08,cross*.029,mix(warm,white,.45),.94*(1-age)*s.pulse*strength);
    }
    if(t>=s.burstInterval && auto<1)pulse(auto,-1,auto);
    for(const f of flashes){
      const elapsed=t-f.born,age=elapsed/s.pointerDuration,travel=elapsed*.76*s.pointerTravel;
      pulse(f.x+travel,f.lane,age,s.pointerPower);pulse(f.x-travel,f.lane,age,s.pointerPower);
    }
    if(progress<1){
      const feather=s.revealFeather/100, head=progress*(1+feather);
      const mask=ctx.createLinearGradient((head-feather)*length,0,head*length,0);
      mask.addColorStop(0,'white');mask.addColorStop(1,'transparent');
      ctx.globalCompositeOperation='destination-in';ctx.fillStyle=mask;ctx.fillRect(0,0,length,cross);
    }
    ctx.globalCompositeOperation='source-over';
  }
  function draw(t:number,ribbonProgress:number,beamProgress:number){
    flashes=flashes.filter(f=>t-f.born<s.pointerDuration);
    if(ribbonProgress===beamProgress){
      drawLayers(ctx,t,ribbonProgress,true,true);
      return;
    }
    drawLayers(ctx,t,ribbonProgress,true,false);
    if(beamProgress<=0)return;
    // Only a staggered entrance needs two independently feathered masks.
    beamLayer??=document.createElement('canvas').getContext('2d')!;
    if(beamLayer.canvas.width!==canvas.width)beamLayer.canvas.width=canvas.width;
    if(beamLayer.canvas.height!==canvas.height)beamLayer.canvas.height=canvas.height;
    drawLayers(beamLayer,t,beamProgress,false,true);
    ctx.setTransform(1,0,0,1,0,0);ctx.globalCompositeOperation='lighter';
    ctx.drawImage(beamLayer.canvas,0,0);ctx.globalCompositeOperation='source-over';
  }
  return {configure,draw,pointer,leave(){lastLane=-1;}};
}
