import exhibit01_160 from '../../assets/exhibition-01-160.webp';
import exhibit01_480 from '../../assets/exhibition-01-480.webp';
import exhibit01_960 from '../../assets/exhibition-01-960.webp';
import exhibit01_1600 from '../../assets/exhibition-01-1600.webp';
import exhibit01_2400 from '../../assets/exhibition-01-2400.webp';
import exhibit02_160 from '../../assets/exhibition-02-160.webp';
import exhibit02_480 from '../../assets/exhibition-02-480.webp';
import exhibit02_960 from '../../assets/exhibition-02-960.webp';
import exhibit02_1600 from '../../assets/exhibition-02-1600.webp';
import exhibit02_2400 from '../../assets/exhibition-02-2400.webp';
import exhibit03_160 from '../../assets/exhibition-03-160.webp';
import exhibit03_480 from '../../assets/exhibition-03-480.webp';
import exhibit03_960 from '../../assets/exhibition-03-960.webp';
import exhibit03_1600 from '../../assets/exhibition-03-1600.webp';
import exhibit03_2400 from '../../assets/exhibition-03-2400.webp';
import exhibit04_160 from '../../assets/exhibition-04-160.webp';
import exhibit04_480 from '../../assets/exhibition-04-480.webp';
import exhibit04_960 from '../../assets/exhibition-04-960.webp';
import exhibit04_1600 from '../../assets/exhibition-04-1600.webp';
import exhibit04_2400 from '../../assets/exhibition-04-2400.webp';
import exhibit05_160 from '../../assets/exhibition-05-160.webp';
import exhibit05_480 from '../../assets/exhibition-05-480.webp';
import exhibit05_960 from '../../assets/exhibition-05-960.webp';
import exhibit05_1600 from '../../assets/exhibition-05-1600.webp';
import exhibit05_2400 from '../../assets/exhibition-05-2400.webp';
import exhibit06_160 from '../../assets/exhibition-06-160.webp';
import exhibit06_480 from '../../assets/exhibition-06-480.webp';
import exhibit06_960 from '../../assets/exhibition-06-960.webp';
import exhibit06_1600 from '../../assets/exhibition-06-1600.webp';
import exhibit06_2400 from '../../assets/exhibition-06-2400.webp';
import exhibit07_160 from '../../assets/exhibition-07-160.webp';
import exhibit07_480 from '../../assets/exhibition-07-480.webp';
import exhibit07_960 from '../../assets/exhibition-07-960.webp';
import exhibit07_1600 from '../../assets/exhibition-07-1600.webp';
import exhibit07_2400 from '../../assets/exhibition-07-2400.webp';
import exhibit08_160 from '../../assets/exhibition-08-160.webp';
import exhibit08_480 from '../../assets/exhibition-08-480.webp';
import exhibit08_960 from '../../assets/exhibition-08-960.webp';
import exhibit08_1600 from '../../assets/exhibition-08-1600.webp';
import exhibit08_2400 from '../../assets/exhibition-08-2400.webp';
import exhibit09_160 from '../../assets/exhibition-09-160.webp';
import exhibit09_480 from '../../assets/exhibition-09-480.webp';
import exhibit09_960 from '../../assets/exhibition-09-960.webp';
import exhibit09_1600 from '../../assets/exhibition-09-1600.webp';
import exhibit09_2400 from '../../assets/exhibition-09-2400.webp';
import exhibit10_160 from '../../assets/exhibition-10-160.webp';
import exhibit10_480 from '../../assets/exhibition-10-480.webp';
import exhibit10_960 from '../../assets/exhibition-10-960.webp';
import exhibit10_1600 from '../../assets/exhibition-10-1600.webp';
import exhibit10_2400 from '../../assets/exhibition-10-2400.webp';
import exhibit11_160 from '../../assets/exhibition-11-160.webp';
import exhibit11_480 from '../../assets/exhibition-11-480.webp';
import exhibit11_960 from '../../assets/exhibition-11-960.webp';
import exhibit11_1600 from '../../assets/exhibition-11-1600.webp';
import exhibit11_2400 from '../../assets/exhibition-11-2400.webp';
import exhibit12_160 from '../../assets/exhibition-12-160.webp';
import exhibit12_480 from '../../assets/exhibition-12-480.webp';
import exhibit12_960 from '../../assets/exhibition-12-960.webp';
import exhibit12_1600 from '../../assets/exhibition-12-1600.webp';
import exhibit12_2400 from '../../assets/exhibition-12-2400.webp';
// Bundlers emit URL strings; Next.js static image imports emit { src, ...metadata }.
// Normalize once so the portable core always receives actual URL strings.
const assetUrl = (asset: string | { src: string }): string => typeof asset === 'string' ? asset : asset.src;
export const collectionPhotos = [
  {id:"EX01",title:"Atlantic edge \u00b7 Iceland",alt:"Dark volcanic coastal ridge above black sand, straw-coloured grass and pale Atlantic surf in Iceland.",width:3504,height:2336,category:"Coast",categories:["Coast"],sources:[{src:assetUrl(exhibit01_160),width:160,height:107},{src:assetUrl(exhibit01_480),width:480,height:320},{src:assetUrl(exhibit01_960),width:960,height:640},{src:assetUrl(exhibit01_1600),width:1600,height:1067},{src:assetUrl(exhibit01_2400),width:2400,height:1600}]},
  {id:"EX02",title:"Wind lines \u00b7 Namibia",alt:"Asymmetric Namib dune crests with fine wind ripples and cool shadows across copper sand.",width:3504,height:2336,category:"Desert",categories:["Desert"],sources:[{src:assetUrl(exhibit02_160),width:160,height:107},{src:assetUrl(exhibit02_480),width:480,height:320},{src:assetUrl(exhibit02_960),width:960,height:640},{src:assetUrl(exhibit02_1600),width:1600,height:1067},{src:assetUrl(exhibit02_2400),width:2400,height:1600}]},
  {id:"EX03",title:"A break in the cloud \u00b7 Italian Dolomites",alt:"Pale limestone towers above an autumn meadow and small larch group in the Italian Dolomites.",width:3504,height:2336,category:"Mountains",categories:["Mountains"],sources:[{src:assetUrl(exhibit03_160),width:160,height:107},{src:assetUrl(exhibit03_480),width:480,height:320},{src:assetUrl(exhibit03_960),width:960,height:640},{src:assetUrl(exhibit03_1600),width:1600,height:1067},{src:assetUrl(exhibit03_2400),width:2400,height:1600}]},
  {id:"EX04",title:"After the rain \u00b7 Japan",alt:"Beech trunks, mossy stones and a shallow stream in a damp Japanese mountain forest.",width:3504,height:2336,category:"Forest",categories:["Forest"],sources:[{src:assetUrl(exhibit04_160),width:160,height:107},{src:assetUrl(exhibit04_480),width:480,height:320},{src:assetUrl(exhibit04_960),width:960,height:640},{src:assetUrl(exhibit04_1600),width:1600,height:1067},{src:assetUrl(exhibit04_2400),width:2400,height:1600}]},
  {id:"EX05",title:"Quiet water \u00b7 Norway",alt:"A quiet Norwegian fjord between granite slopes with birch, conifers and distant snow patches.",width:3504,height:2336,category:"Coast",categories:["Coast"],sources:[{src:assetUrl(exhibit05_160),width:160,height:107},{src:assetUrl(exhibit05_480),width:480,height:320},{src:assetUrl(exhibit05_960),width:960,height:640},{src:assetUrl(exhibit05_1600),width:1600,height:1067},{src:assetUrl(exhibit05_2400),width:2400,height:1600}]},
  {id:"EX06",title:"Mineral country \u00b7 Chile \u00b7 Atacama",alt:"Pale eroded clay ridges above an open Atacama mineral basin and muted mauve mountains.",width:3504,height:2336,category:"Desert",categories:["Desert"],sources:[{src:assetUrl(exhibit06_160),width:160,height:107},{src:assetUrl(exhibit06_480),width:480,height:320},{src:assetUrl(exhibit06_960),width:960,height:640},{src:assetUrl(exhibit06_1600),width:1600,height:1067},{src:assetUrl(exhibit06_2400),width:2400,height:1600}]},
  {id:"EX07",title:"Southern weather \u00b7 Argentina \u00b7 Patagonia",alt:"Snow-streaked Patagonian granite peaks above a wind-rippled lake and tawny autumn shore.",width:3504,height:2336,category:"Mountains",categories:["Mountains"],sources:[{src:assetUrl(exhibit07_160),width:160,height:107},{src:assetUrl(exhibit07_480),width:480,height:320},{src:assetUrl(exhibit07_960),width:960,height:640},{src:assetUrl(exhibit07_1600),width:1600,height:1067},{src:assetUrl(exhibit07_2400),width:2400,height:1600}]},
  {id:"EX08",title:"Under the canopy \u00b7 Canada \u00b7 Pacific coast",alt:"A large cedar trunk, mossy fallen wood and layered sword ferns in a Canadian coastal rainforest.",width:3504,height:2336,category:"Forest",categories:["Forest"],sources:[{src:assetUrl(exhibit08_160),width:160,height:107},{src:assetUrl(exhibit08_480),width:480,height:320},{src:assetUrl(exhibit08_960),width:960,height:640},{src:assetUrl(exhibit08_1600),width:1600,height:1067},{src:assetUrl(exhibit08_2400),width:2400,height:1600}]},
  {id:"EX09",title:"Tide marks \u00b7 New Zealand",alt:"Angled waves meet a broad sandy beach beneath a layered rock headland in New Zealand.",width:3504,height:2336,category:"Coast",categories:["Coast"],sources:[{src:assetUrl(exhibit09_160),width:160,height:107},{src:assetUrl(exhibit09_480),width:480,height:320},{src:assetUrl(exhibit09_960),width:960,height:640},{src:assetUrl(exhibit09_1600),width:1600,height:1067},{src:assetUrl(exhibit09_2400),width:2400,height:1600}]},
  {id:"EX10",title:"Stone and silence \u00b7 United States \u00b7 Southwest",alt:"Weathered sandstone benches and canyon walls beneath distant mesas in the American Southwest.",width:3504,height:2336,category:"Desert",categories:["Desert"],sources:[{src:assetUrl(exhibit10_160),width:160,height:107},{src:assetUrl(exhibit10_480),width:480,height:320},{src:assetUrl(exhibit10_960),width:960,height:640},{src:assetUrl(exhibit10_1600),width:1600,height:1067},{src:assetUrl(exhibit10_2400),width:2400,height:1600}]},
  {id:"EX11",title:"The still interval \u00b7 Canada \u00b7 Rockies",alt:"Pale Canadian Rocky Mountain ridges above dark spruce and a softly rippled blue-green lake.",width:3504,height:2336,category:"Mountains",categories:["Mountains"],sources:[{src:assetUrl(exhibit11_160),width:160,height:107},{src:assetUrl(exhibit11_480),width:480,height:320},{src:assetUrl(exhibit11_960),width:960,height:640},{src:assetUrl(exhibit11_1600),width:1600,height:1067},{src:assetUrl(exhibit11_2400),width:2400,height:1600}]},
  {id:"EX12",title:"Cloud forest \u00b7 Costa Rica",alt:"Wet broad leaves, moss and epiphytes frame misty forested hills in Costa Rica.",width:3504,height:2336,category:"Forest",categories:["Forest"],sources:[{src:assetUrl(exhibit12_160),width:160,height:107},{src:assetUrl(exhibit12_480),width:480,height:320},{src:assetUrl(exhibit12_960),width:960,height:640},{src:assetUrl(exhibit12_1600),width:1600,height:1067},{src:assetUrl(exhibit12_2400),width:2400,height:1600}]}
] as const;
