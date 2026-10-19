import {describe,it,expect} from 'vitest';
import {PointIndex} from './point-index';
import type {Point} from './math';

describe('Halftone home-coordinate lookup',()=>{
  it('returns every bounded sample in paint order, including moved dots and empty rows',()=>{
    const points:Point[]=[];
    for(let y=0;y<240;y+=3)for(let x=0;x<360;x+=3){
      if(y%15===0||(x+y)%7===0)continue;
      points.push({homeX:x,homeY:y,x:x+19,y:y-11,size:1,alpha:.4,color:'#ffffff'});
    }
    const index=new PointIndex();index.rebuild(points,3);
    for(const [left,top,right,bottom] of [[-100,-100,600,600],[20.2,17.8,189.1,96.2],[0,15,359,15],[357,237,357,237],[361,241,500,500]]){
      const found:Point[]=[];index.forEach(left!,top!,right!,bottom!,p=>found.push(p));
      expect(found).toEqual(points.filter(p=>p.homeX>=left!&&p.homeX<=right!&&p.homeY>=top!&&p.homeY<=bottom!));
    }
    index.rebuild([],2);const empty:Point[]=[];index.forEach(-100,-100,600,600,p=>empty.push(p));expect(empty).toEqual([]);
  });
});
