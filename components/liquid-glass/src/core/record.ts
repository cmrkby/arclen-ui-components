// Cache the grooves and sleeve. Only the paper label and spindle turn each frame.
export function recordPlayer(context: CanvasRenderingContext2D) {
  const {canvas} = context;
  const width = 768, height = 512, cx = 447, cy = 216, radius = 338;
  canvas.width = width;
  canvas.height = height;
  const plate = canvas.ownerDocument.createElement('canvas');
  plate.width = width;
  plate.height = height;
  const c = plate.getContext('2d')!;
  const sleeve = c.createLinearGradient(0, 0, width, height);
  sleeve.addColorStop(0, '#eb8c40');
  sleeve.addColorStop(.45, '#a9361a');
  sleeve.addColorStop(1, '#34172e');
  c.fillStyle = sleeve;
  c.fillRect(0, 0, width, height);
  c.save();
  c.translate(cx, cy);
  c.shadowColor = '#140d0e'; c.shadowBlur = 25; c.shadowOffsetY = 9;
  c.fillStyle = '#141419'; c.beginPath(); c.arc(0,0,radius,0,Math.PI*2); c.fill();
  c.shadowBlur = 0; c.shadowOffsetY = 0;
  c.clip();
  const shine = c.createConicGradient(.1, 0, 0);
  for (const [p, color] of [[0,'#1d191e'],[.1,'#343039'],[.22,'#858594'],[.28,'#34333c'],[.4,'#131319'],[.54,'#30282b'],[.66,'#85615a'],[.74,'#242028'],[.91,'#121218'],[1,'#1d191e']] as const) shine.addColorStop(p,color);
  c.fillStyle = shine; c.fillRect(-radius,-radius,2*radius,2*radius);
  for (let r=108; r<radius; r+=1.6) {
    c.beginPath(); c.arc(0,0,r,0,Math.PI*2);
    c.strokeStyle = Math.floor(r/38)%2 ? '#ffffff28' : '#00000050';
    c.lineWidth = .65; c.stroke();
  }
  c.restore();
  return (time: number) => {
    context.drawImage(plate,0,0);
    context.save(); context.translate(cx,cy); context.rotate(time * Math.PI / 10);
    context.fillStyle = '#f47b36'; context.beginPath(); context.arc(0,0,102,0,Math.PI*2); context.fill();
    context.clip(); context.fillStyle = '#f8bb7a'; context.fillRect(-102,-84,204,29);
    context.fillStyle = '#452123'; context.fillRect(-102,42,204,1.25);
    context.textAlign='center'; context.font='bold 23px system-ui'; context.fillText('SIDE  A',0,-18);
    context.font='10px monospace'; context.fillText('ARCLEN   /   RECORDINGS',0,67);
    context.fillStyle = '#aaa7a6'; context.beginPath(); context.arc(0,0,5,0,Math.PI*2); context.fill();
    context.restore();
  };
}
