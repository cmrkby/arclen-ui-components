/** Local responsive artwork. Desktop keeps the full-resolution master export. */
import card from '../../assets/hero-card.webp';
import mobile from '../../assets/hero-mobile.webp';
import desktop from '../../assets/reveal-hero.webp';
const source=(image:string|{src:string})=>typeof image==='string'?image:image.src;
const escape=(value:string)=>value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
export function renderHeroImage():string {
 return `<img class="pt-hero" data-pt-image src="${escape(source(desktop))}" srcset="${escape(source(card))} 640w, ${escape(source(mobile))} 960w, ${escape(source(desktop))} 1086w" sizes="(max-width: 600px) max(45vw, 22.5vh), max(32vw, 56.25vh)" width="1086" height="1448" decoding="async" alt=""/>`;
}
