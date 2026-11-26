/* Action Labo: millimetre geometry, Clipper integer grid = 0.001 mm. */
(function(root){
const C=root.ClipperLib, S=1000;
const pt=(x,y)=>({X:Math.round(x*S),Y:Math.round(y*S)});
function boolean(a,b,type){let cl=new C.Clipper();cl.AddPaths(a,C.PolyType.ptSubject,true);if(b.length)cl.AddPaths(b,C.PolyType.ptClip,true);let out=[];cl.Execute(type,out,C.PolyFillType.pftNonZero,C.PolyFillType.pftNonZero);return C.Clipper.CleanPolygons(out,2);}
const union=a=>boolean(a,[],C.ClipType.ctUnion);
function offset(a,d){let o=new C.ClipperOffset(2,12),r=[];o.AddPaths(a,C.JoinType.jtRound,C.EndType.etClosedPolygon);o.Execute(r,d*S);return r;}
function circle(x,y,r,n=64){return Array.from({length:n},(_,i)=>pt(x+r*Math.cos(i*2*Math.PI/n),y+r*Math.sin(i*2*Math.PI/n)));}
function capsule(x1,y1,x2,y2,r){let dx=x2-x1,dy=y2-y1,l=Math.hypot(dx,dy);if(l<.001)return [circle(x1,y1,r)];let nx=-dy/l*r,ny=dx/l*r;return union([circle(x1,y1,r),circle(x2,y2,r),[pt(x1+nx,y1+ny),pt(x1-nx,y1-ny),pt(x2-nx,y2-ny),pt(x2+nx,y2+ny)]]);}
function bounds(paths){let xs=paths.flat().map(p=>p.X/S),ys=paths.flat().map(p=>p.Y/S);return {minX:Math.min(...xs),maxX:Math.max(...xs),minY:Math.min(...ys),maxY:Math.max(...ys)};}
function flatten(commands){let paths=[],path=[],last=[0,0],first;const add=(x,y)=>{path.push(pt(x,-y));last=[x,y]};for(let c of commands){if(c.type==='M'){if(path.length>2)paths.push(path);path=[];add(c.x,c.y);first=last;}else if(c.type==='L')add(c.x,c.y);else if(c.type==='Q'||c.type==='C'){let [x,y]=last;let n=Math.max(8,Math.ceil((Math.hypot(c.x-x,c.y-y)+Math.hypot(c.x1-x,c.y1-y))/.25));for(let k=1;k<=n;k++){let t=k/n,u=1-t;if(c.type==='Q')add(u*u*x+2*u*t*c.x1+t*t*c.x,u*u*y+2*u*t*c.y1+t*t*c.y);else add(u*u*u*x+3*u*u*t*c.x1+3*u*t*t*c.x2+t*t*t*c.x,u*u*u*y+3*u*u*t*c.y1+3*u*t*t*c.y2+t*t*t*c.y);}}else if(c.type==='Z'){if(path.length>2)paths.push(path);path=[];last=first;}}if(path.length>2)paths.push(path);return paths;}
function make(font,name,width,playful,plate=false){
 name=name.normalize('NFC');
 let all=[],glyphs=[],lastRight=0;
 Array.from(name).forEach((ch,i)=>{
  let g=font.charToGlyph(ch);if(g.index===0)throw Error('使えない文字があります：'+ch+'。ひらがな・カタカナ・英数字で試してください。');
  let paths=flatten(g.getPath(0,0,20).commands),b=bounds(paths),cx=(b.minX+b.maxX)/2,cy=(b.minY+b.maxY)/2;
  let angle=playful?[-5,3,-4,4,-2,3][i%6]*Math.PI/180:0;
  let rotated=paths.map(path=>path.map(p=>{let x=p.X/S-cx,y=p.Y/S-cy;return pt(x*Math.cos(angle)-y*Math.sin(angle)+cx,x*Math.sin(angle)+y*Math.cos(angle)+cy+(playful?[0,.55,-.25,.4][i%4]:0));}));
  let rb=bounds(rotated),dx=i?lastRight-rb.minX+(plate?1.5:.05):-rb.minX;
  let positioned=rotated.map(path=>path.map(p=>({X:p.X+Math.round(dx*S),Y:p.Y})));
  all.push(...positioned);glyphs.push(positioned);lastRight=rb.maxX+dx;
 });
 let b=bounds(all);if(!Number.isFinite(b.minX))throw Error('名前を入力してください。');
 // Keep an actual printable gap AFTER the 0.22 mm outward face rounding.
 // The previous 0.05 nominal-unit gap shrank to roughly 0.039 mm and vanished.
 // Reflow glyphs individually into the selected width rather than compressing gaps.
 const minFaceGap=0.65, faceGrowth=.22, layoutGap=minFaceGap+2*faceGrowth+.08;
 const n=glyphs.length;
 const glyphBounds=glyphs.map(bounds);
 const totalGlyphWidth=glyphBounds.reduce((v,g)=>v+g.maxX-g.minX,0);
 const room=width-(plate?10.8:8.3)-(n-1)*layoutGap;
 if(room<=0)throw Error('この幅では文字間の隙間を確保できません。横幅を大きくしてください。');
 let factor=room/totalGlyphWidth;
 if(n===1)factor=Math.min(factor,24/(b.maxY-b.minY));
 let cursor=0,scaledGlyphs=[];
 for(let i=0;i<n;i++){
  const gb=glyphBounds[i],g=glyphs[i];
  const positioned=g.map(path=>path.map(p=>pt(cursor+(p.X/S-gb.minX)*factor,(p.Y/S-b.minY)*factor)));
  scaledGlyphs.push(positioned);
  cursor+=(gb.maxX-gb.minX)*factor+layoutGap;
 }
 const scaled=scaledGlyphs.flat();
 // A gently rounded, bold letter face; the preview and mesh share this outline.
 let roundRadius=Math.min(1.05,(b.maxY-b.minY)*factor*.055);
 // Round each disconnected face separately so dakuten, handakuten and i dots
 // survive erosion. Reduce the radius until a substantial core remains.
 let rounded=scaledGlyphs.flatMap(glyph=>groups(union(glyph)).flatMap(g=>{
  const face=[g.outer,...g.holes],area=Math.abs(face.reduce((n,p)=>n+C.Clipper.Area(p),0));
  let radius=roundRadius,core;
  for(let attempt=0;attempt<12;attempt++){
   core=offset(face,-radius);
   const remaining=Math.abs(core.reduce((n,p)=>n+C.Clipper.Area(p),0));
   if(groups(core).length===1&&remaining>=area*.45)break;
   radius/=2;
  }
  return core.length?offset(core,radius+.22):offset(face,.22);
 }));
 let letters=union(rounded);let lb=bounds(letters);
 if(lb.maxY-lb.minY>34)throw Error('文字が大きすぎます。横幅を小さくするか、文字数を増やしてください。');
 // Follow the letter contours. Join only adjacent islands, never a bar across the name.
 let base;
 if(plate){let x=lb.minX-2,y=lb.minY-2,w=lb.maxX-lb.minX+4,h=lb.maxY-lb.minY+4,r=2.6;
 base=offset([[pt(x+r,y+r),pt(x+w-r,y+r),pt(x+w-r,y+h-r),pt(x+r,y+h-r)]],r);
 }else base=union(offset(offset(offset(letters,1.05),.65),-.65));
 for(let round=0;round<30;round++){
  let outer=base.filter(p=>C.Clipper.Area(p)>0);if(outer.length<=1)break;
  outer.sort((a,b)=>Math.abs(C.Clipper.Area(b))-Math.abs(C.Clipper.Area(a)));
  let a=outer[0],others=outer.slice(1),best=Infinity,pa,pb;
  for(let q of others)for(let x of a)for(let y of q){let d=(x.X-y.X)**2+(x.Y-y.Y)**2;if(d<best){best=d;pa=x;pb=y;}}
  base=union([...base,...capsule(pa.X/S,pa.Y/S,pb.X/S,pb.Y/S,1.25)]);
 }
 // Local bridges between neighbouring glyphs reinforce narrow necks without
 // changing any raised letter face or adding a full-width backing bar.
 if(!plate){
  for(let i=1;i<scaledGlyphs.length;i++){
   let pa,pb,best=Infinity;
   const a=groups(union(scaledGlyphs[i-1])).flatMap(g=>g.outer),q=groups(union(scaledGlyphs[i])).flatMap(g=>g.outer);
   for(const x of a)for(const y of q){const d=(x.X-y.X)**2+(x.Y-y.Y)**2;if(d<best){best=d;pa=x;pb=y;}}
   if(pa&&pb)base=union([...base,...capsule(pa.X/S,pa.Y/S,pb.X/S,pb.Y/S,2.1)]);
  }
 }
 // Reinforced eyelet: 4 mm bore, 2.3 mm radial wall and a broad local neck.
 let ringX=lb.minX-(plate?4.5:3.2),ringY=lb.minY+(lb.maxY-lb.minY)*(plate?.5:.46);
 let nearest,best=Infinity;
 for(let path of (plate?base:letters).filter(p=>C.Clipper.Area(p)>0))for(let p of path){let d=(p.X/S-ringX)**2+(p.Y/S-ringY)**2;if(d<best){best=d;nearest=p;}}
 base=union([...base,...(plate?[]:capsule(ringX,ringY,nearest.X/S,nearest.Y/S,2.4)),circle(ringX,ringY,4.3)]);
 base=boolean(base,[circle(ringX,ringY,2)],C.ClipType.ctDifference);
 let bb=bounds(base),shift=p=>p.map(q=>({X:q.X-Math.round(bb.minX*S),Y:q.Y-Math.round(bb.minY*S)}));
 return {base:base.map(shift),letters:letters.map(shift),width:bb.maxX-bb.minX,height:bb.maxY-bb.minY,thickness:2.4};
}
function groups(paths){let tree=new C.PolyTree(),cl=new C.Clipper();cl.AddPaths(paths,C.PolyType.ptSubject,true);cl.Execute(C.ClipType.ctUnion,tree,C.PolyFillType.pftNonZero,C.PolyFillType.pftNonZero);let out=[];function walk(node){for(let ch of node.Childs()){if(!ch.IsHole())out.push({outer:ch.Contour(),holes:ch.Childs().filter(n=>n.IsHole()).map(n=>n.Contour())});walk(ch);}}walk(tree);return out;}
function caps(paths,z,up){let tris=[];for(let g of groups(paths)){let p=[g.outer,...g.holes],data=[],holes=[];for(let i=0;i<p.length;i++){if(i)holes.push(data.length/2);for(let q of p[i])data.push(q.X/S,q.Y/S);}let idx=root.earcut(data,holes,2);for(let i=0;i<idx.length;i+=3){let t=[idx[i],idx[i+1],idx[i+2]].map(j=>[data[j*2],data[j*2+1],z]);let cross=(t[1][0]-t[0][0])*(t[2][1]-t[0][1])-(t[1][1]-t[0][1])*(t[2][0]-t[0][0]);if((cross>0)!==up)t.reverse();tris.push(t);}}return tris;}
function walls(paths,z0,z1){let tris=[];for(let g of groups(paths))for(let [i,path] of [g.outer,...g.holes].entries()){if((C.Clipper.Area(path)>0)!==(i===0))path=path.slice().reverse();for(let j=0;j<path.length;j++){let a=path[j],b=path[(j+1)%path.length],p=[a.X/S,a.Y/S,z0],q=[b.X/S,b.Y/S,z0],r=[b.X/S,b.Y/S,z1],s=[a.X/S,a.Y/S,z1];tris.push([p,q,r],[p,r,s]);}}return tris;}
function repair(tris){
const key=p=>p.map(x=>x.toFixed(5)).join(',');
for(let pass=0;pass<4;pass++){
 let es=new Map();tris.forEach((t,ti)=>{for(let e=0;e<3;e++){let a=key(t[e]),b=key(t[(e+1)%3]),k=[a,b].sort().join('|');if(!es.has(k))es.set(k,[]);es.get(k).push([ti,e]);}});
 let bad=[...es.values()].filter(v=>v.length===1).flat();if(!bad.length)return tris;
 let points=new Map();for(let [ti,e] of bad)for(let j of [e,(e+1)%3])points.set(key(tris[ti][j]),tris[ti][j]);
 let edits=new Map();for(let [ti,e] of bad){if(edits.has(ti))continue;let t=tris[ti],a=t[e],b=t[(e+1)%3],v=b.map((x,i)=>x-a[i]),l=v.reduce((s,x)=>s+x*x,0),inside=[];for(let p of points.values()){let u=p.reduce((s,x,i)=>s+(x-a[i])*v[i],0)/l;if(u>1e-7&&u<1-1e-7&&p.every((x,i)=>Math.abs(x-a[i]-u*v[i])<1e-7))inside.push([u,p]);}if(inside.length){inside.sort((a,b)=>a[0]-b[0]);let chain=[a,...inside.map(x=>x[1]),b],c=t[(e+2)%3];edits.set(ti,chain.slice(0,-1).map((p,i)=>[p,chain[i+1],c]));}}
 if(!edits.size)return tris;tris=tris.flatMap((t,i)=>edits.get(i)||[t]);
}return tris;}
function solid(paths,z0,z1){return repair([...caps(paths,z0,false),...walls(paths,z0,z1),...caps(paths,z1,true)]);}
function mesh(model){return repair([...caps(model.base,0,false),...walls(model.base,0,1.2),...caps(boolean(model.base,model.letters,C.ClipType.ctDifference),1.2,true),...walls(model.letters,1.2,2.4),...caps(model.letters,2.4,true)]);}
function stl(model){let t=mesh(model),buf=new ArrayBuffer(84+t.length*50),v=new DataView(buf);v.setUint32(80,t.length,true);t.forEach((f,i)=>{let o=84+i*50+12;for(let p of f)for(let x of p){v.setFloat32(o,x,true);o+=4;}});return new Uint8Array(buf);}
function meshXML(tris){let verts=[],faces=[],map=new Map();for(let tri of tris){let f=tri.map(p=>{let key=p.join(',');if(!map.has(key)){map.set(key,verts.length);verts.push(p);}return map.get(key);});faces.push(f);}return '<mesh><vertices>'+verts.map(p=>`<vertex x="${p[0]}" y="${p[1]}" z="${p[2]}"/>`).join('')+'</vertices><triangles>'+faces.map(f=>`<triangle v1="${f[0]}" v2="${f[1]}" v3="${f[2]}"/>`).join('')+'</triangles></mesh>';}
function threeMF(model,bc,tc){let enc=root.fflate.strToU8;let xml=`<?xml version="1.0" encoding="UTF-8"?><model unit="millimeter" xml:lang="ja-JP" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02"><metadata name="Title">Action Labo Name</metadata><resources><basematerials id="1"><base name="Base" displaycolor="${bc.toUpperCase()}FF"/><base name="Letters" displaycolor="${tc.toUpperCase()}FF"/></basematerials><object id="2" type="model" name="Base" pid="1" pindex="0">${meshXML(solid(model.base,0,1.2))}</object><object id="3" type="model" name="Letters" pid="1" pindex="1">${meshXML(solid(model.letters,1.2,2.4))}</object><object id="4" type="model" name="Action Labo Name"><components><component objectid="2"/><component objectid="3"/></components></object></resources><build><item objectid="4"/></build></model>`;return root.fflate.zipSync({'[Content_Types].xml':enc('<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/></Types>'),'_rels/.rels':enc('<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Target="/3D/3dmodel.model" Id="rel0" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/></Relationships>'),'3D/3dmodel.model':enc(xml)},{level:6});}
function pathD(paths){return paths.map(p=>'M'+p.map(q=>(q.X/S).toFixed(3)+','+(q.Y/S).toFixed(3)).join('L')+'Z').join('');}
root.NameGeometry={make,mesh,solid,stl,threeMF,pathD,groups};
})(typeof window==='undefined'?globalThis:window);
