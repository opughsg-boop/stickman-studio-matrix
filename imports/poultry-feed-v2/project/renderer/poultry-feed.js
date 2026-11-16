import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
export function poultryFeed(p={},lib){
 const {pbrMaterial,shadowed}=lib,g=new T.Group(),metal=pbrMaterial('metal_plate','#d8dcdd',[2,2]);metal.map=null;metal.color.set('#c8cdd0');metal.metalness=.24;metal.roughness=.58;if(metal.normalMap)metal.normalScale.set(.035,.035);
 const fill=new T.HemisphereLight('#dce6ed','#9b8267',.50);g.add(fill);
 const concrete=pbrMaterial('concrete_floor_02','#d5d0c1',[3,2]),red=new T.MeshStandardMaterial({color:'#943728',roughness:.67}),steel=new T.MeshStandardMaterial({color:'#748088',metalness:.7,roughness:.32}),dark=new T.MeshStandardMaterial({color:'#343c3c',roughness:.8}),grain=new T.MeshStandardMaterial({color:'#b59959',roughness:1});
 const woodCanvas=document.createElement('canvas');woodCanvas.width=256;woodCanvas.height=256;const wc=woodCanvas.getContext('2d');wc.fillStyle='#a57547';wc.fillRect(0,0,256,256);for(let i=0;i<90;i++){const yy=i*3;wc.strokeStyle=i%4===0?'rgba(48,28,15,.28)':'rgba(235,190,132,.16)';wc.lineWidth=i%5===0?2:1;wc.beginPath();wc.moveTo(0,yy);wc.bezierCurveTo(70,yy+2,170,yy-2,256,yy+1);wc.stroke()}const woodTex=new T.CanvasTexture(woodCanvas);woodTex.colorSpace=T.SRGBColorSpace;woodTex.wrapS=woodTex.wrapT=T.RepeatWrapping;woodTex.repeat.set(4,2);const wood=new T.MeshStandardMaterial({map:woodTex,color:'#ffffff',roughness:.92});
 const add=(geo,mat,pos,par=g)=>{const m=new T.Mesh(geo,mat);m.position.set(...pos);par.add(m);return m},box=(s,mat,pos,par=g)=>add(new T.BoxGeometry(...s),mat,pos,par),cyl=(r1,r2,h,mat,pos,par=g)=>add(new T.CylinderGeometry(r1,r2,h,20),mat,pos,par);
 function rod(a,b,r,mat,par=g){const A=new T.Vector3(...a),B=new T.Vector3(...b),d=B.clone().sub(A),m=cyl(r,r,d.length(),mat,A.clone().add(B).multiplyScalar(.5).toArray(),par);m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),d.normalize());return m}
 // Open-front timber poultry house. The roof and side panels are wood; one roof half is removed to expose the line.
 box([9.2,.16,5],concrete,[0,.08,0]);box([9.2,.56,.15],wood,[0,.44,-2.4]);
 for(const x of[-4.4,4.4])for(const z of[-2.35,2.35])box([.16,3.25,.16],wood,[x,1.78,z]);
 for(const x of[-4.4,0,4.4]){rod([x,3.2,-2.4],[x,3.95,0],.075,wood);rod([x,3.95,0],[x,3.2,2.4],.075,wood)}
 const roof=box([9.35,.14,2.6],wood,[0,3.60,-1.2]);roof.rotation.x=-.30;
 for(const x of[-4.4,4.4])box([.14,.7,2.5],wood,[x,.53,-1.15]);
 // External storage silo, tapered hopper, and inclined auger to the inside receiving hopper.
 const sx=-5.55,sz=-.75;cyl(.72,.72,2.3,metal,[sx,3.15,sz]);cyl(.04,.74,.62,metal,[sx,4.60,sz]);cyl(.74,.19,.95,metal,[sx,1.53,sz]);
 for(const dx of[-.48,.48])for(const dz of[-.48,.48])rod([sx+dx,.04,sz+dz],[sx+dx,2.35,sz+dz],.055,steel);
 for(let i=0;i<7;i++){const ring=add(new T.TorusGeometry(.73,.013,5,40),steel,[sx,2.1+i*.32,sz]);ring.rotation.x=Math.PI/2}
 // Continuous downpipe from the silo outlet to the elevated auger inlet.
 rod([sx,1.05,sz],[-3.82,2.75,.1],.18,metal);
 rod([-3.82,2.75,.1],[-3.82,1.05,.1],.16,metal);
 const inletSocket=add(new T.TorusGeometry(.17,.026,7,24),steel,[-3.82,1.05,.1]);
 inletSocket.rotation.y=Math.PI/2;
 // A shaftless spiral auger: a wound wire/flight, never a moving belt.
 const x0=-3.82,x1=3.70,y=1.05,z=.1,L=x1-x0,auger=new T.Group();auger.position.set(x0,y,z);g.add(auger);
 const turns=L/.25,pts=[];for(let i=0;i<=Math.ceil(turns*24);i++){const u=i/Math.ceil(turns*24),a=u*turns*Math.PI*2;pts.push(new T.Vector3(u*L,Math.sin(a)*.064,Math.cos(a)*.064))}
 const helix=add(new T.TubeGeometry(new T.CatmullRomCurve3(pts),Math.ceil(turns*24),.014,5,false),steel,[0,0,0],auger);
 // Rear shell plus removable front half, allowing a meaningful longitudinal section.
 const shell=add(new T.CylinderGeometry(.102,.102,L,20,1,true,Math.PI*.32,Math.PI*1.36),metal,[(x0+x1)/2,y,z]);shell.rotation.z=-Math.PI/2;shell.material=shell.material.clone();shell.material.side=T.DoubleSide;
 const cover=add(new T.CylinderGeometry(.103,.103,L,12,1,true,-Math.PI*.32,Math.PI*.64),metal,[(x0+x1)/2,y,z]);cover.rotation.z=-Math.PI/2;cover.material=metal.clone();cover.material.side=T.DoubleSide;
 for(const x of[-3.6,-1.0,1.6,3.5]){rod([x,3.5,.1],[x,1.17,.1],.013,steel);const band=add(new T.TorusGeometry(.117,.012,5,20),steel,[x,y,z]);band.rotation.y=Math.PI/2}
 box([.36,.28,.25],dark,[3.95,y,z]);const motor=cyl(.135,.135,.35,steel,[4.15,y,z]);motor.rotation.z=Math.PI/2;
 const pellets=new T.InstancedMesh(new T.IcosahedronGeometry(.023,0),grain,160);g.add(pellets);pellets.castShadow=false;const dummy=new T.Object3D();
 const pans=[];
 for(let j=0;j<5;j++){
  const x=-2.9+j*1.42,pan=new T.Group();pan.position.set(x,0,z);g.add(pan);
  cyl(.37,.32,.08,red,[0,.24,0],pan);const edge=add(new T.TorusGeometry(.35,.025,7,32),red,[0,.28,0],pan);edge.rotation.x=Math.PI/2;
  cyl(.115,.19,.25,red,[0,.435,0],pan);box([.18,.13,.18],metal,[0,1.05,0],pan);rod([0,.55,0],[0,1.05,0],.065,metal,pan);
  const grillGeos=[];for(let k=0;k<8;k++){const a=k*Math.PI/4,A=new T.Vector3(Math.cos(a)*.13,.54,Math.sin(a)*.13),B=new T.Vector3(Math.cos(a)*.31,.29,Math.sin(a)*.31),d=B.clone().sub(A),geo=new T.CylinderGeometry(.008,.008,d.length(),5);geo.applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),d.normalize()));geo.translate(...A.add(B).multiplyScalar(.5).toArray());grillGeos.push(geo)}
  add(mergeGeometries(grillGeos),red,[0,0,0],pan);
  const feed=cyl(.315,.315,.055,grain,[0,.285,0],pan);pans.push({x,feed});
 }
 // Last-pan diaphragm level switch, indicated by a neutral wordless control ring.
 const sensor=box([.10,.13,.09],dark,[pans.at(-1).x+.22,.49,z+.10]);const indicator=add(new T.TorusGeometry(.08,.016,6,24),new T.MeshBasicMaterial({color:'#89bba0'}),[pans.at(-1).x+.22,.51,z+.157]);
 rod([pans.at(-1).x+.22,.56,z+.10],[3.95,1.05,z],.009,dark);
 const falls=new T.InstancedMesh(new T.IcosahedronGeometry(.019,0),grain,45);g.add(falls);falls.castShadow=false;
 // Smooth low-poly-count hens with fine feather texture, articulated necks and grounded feet.
 const canvas=document.createElement('canvas');canvas.width=canvas.height=256;const c=canvas.getContext('2d');c.fillStyle='#d4c3a5';c.fillRect(0,0,256,256);for(let yy=0;yy<256;yy+=12)for(let xx=0;xx<256;xx+=11){c.strokeStyle=((xx+yy)%3)?'#aa947155':'#f6eadb99';c.lineWidth=1;c.beginPath();c.ellipse(xx+(yy%24?5:0),yy,5,9,0,0,Math.PI);c.stroke()}const tex=new T.CanvasTexture(canvas);tex.colorSpace=T.SRGBColorSpace;
 const feather=new T.MeshStandardMaterial({map:tex,color:'#f4e5cb',roughness:.95}),skin=new T.MeshStandardMaterial({color:'#c5a16b',roughness:.95}),combMat=new T.MeshStandardMaterial({color:'#9c2d25',roughness:.85}),eyeMat=new T.MeshStandardMaterial({color:'#181811',roughness:.4}),hens=[];
 const ellipsoid=(r,s,pos)=>{const q=new T.SphereGeometry(r,14,10);q.scale(...s);q.translate(...pos);return q};
 for(let j=0;j<10;j++){
  const bird=new T.Group(),side=j%2?1:-1,pan=pans[Math.floor(j/2)],px=pan.x+(j%3-.8)*.13,pz=z+side*.57;bird.position.set(px,.16,pz);bird.rotation.y=side<0?0:Math.PI;g.add(bird);
  const parts=[ellipsoid(.24,[.82,.95,1.22],[0,.30,0]),ellipsoid(.19,[.28,.8,1.13],[.18,.31,-.03]),ellipsoid(.19,[.28,.8,1.13],[-.18,.31,-.03]),ellipsoid(.13,[.65,1.3,.6],[0,.43,-.26])];add(mergeGeometries(parts),feather,[0,0,0],bird);
  const neck=new T.Group();neck.position.set(0,.32,.13);bird.add(neck);add(mergeGeometries([ellipsoid(.082,[.8,1.6,.8],[0,.08,.02]),ellipsoid(.09,[.9,1.0,1.0],[0,.19,.06])]),feather,[0,0,0],neck);
  const beak=add(new T.ConeGeometry(.027,.085,7),skin,[0,.17,.17],neck);beak.rotation.x=Math.PI/2;
  add(mergeGeometries([ellipsoid(.031,[.65,1,1],[0,.286,.06]),ellipsoid(.025,[.65,1,1],[0,.28,.025])]),combMat,[0,0,0],neck);
  for(const xx of[-.068,.068])add(new T.SphereGeometry(.012,6,4),eyeMat,[xx,.21,.10],neck);
  const legs=[];for(const xx of[-.068,.068]){const q=new T.CylinderGeometry(.013,.017,.15,6);q.translate(xx,.105,.015);legs.push(q);const foot=new T.BoxGeometry(.07,.015,.12);foot.translate(xx,.027,.055);legs.push(foot)}add(mergeGeometries(legs),skin,[0,0,0],bird);hens.push({bird,neck,phase:j*.91,base:bird.position.clone()});
 }
 const drive=p.drive||[[0,19.48],[23.4,30.12]],timeRunning=t=>drive.reduce((sum,[a,b])=>sum+Math.max(0,Math.min(t,b)-a),0),running=t=>drive.some(([a,b])=>t>=a&&t<b);
 g.userData.tick=(t)=>{
  const mo=g.userData.mode||{},prev=g.userData.prevMode||{},age=g.userData.modeAge||0,u=Math.max(0,Math.min(1,age/(mo.duration||1.4))),smooth=u*u*(3-2*u),baseLevel=(prev.level??p.level??.35)+((mo.level??.65)-(prev.level??p.level??.35))*smooth;
  let level=baseLevel;if(mo.control){if(t<20.4)level=.85+(t-19.48)/.92*.15;else if(t<23.7)level=1-(t-20.4)/3.3*.65;else level=.35+(t-23.7)/1.62*.35;}const run=running(t),rt=timeRunning(t);auger.rotation.x=rt*5.2;cover.visible=true;cover.material.transparent=!!mo.cutaway;cover.material.opacity=mo.cutaway?.16:1;cover.material.depthWrite=!mo.cutaway;
  for(let i=0;i<160;i++){const f=((i/160+rt*.12)%1),a=i*2.399;dummy.position.set(x0+f*L,y-.045+Math.sin(a)*.018,z+.03+Math.cos(a)*.045);dummy.rotation.set(a,a*.7,0);dummy.scale.set(1,.7,1.4);dummy.updateMatrix();pellets.setMatrixAt(i,dummy.matrix)}pellets.instanceMatrix.needsUpdate=true;pellets.visible=!!mo.cutaway;
  for(let j=0;j<pans.length;j++){const f=Math.max(.08,level*(.93+j*.017));pans[j].feed.position.y=.267+f*.055;pans[j].feed.scale.y=.3+f;}
  indicator.material.color.set(run?'#83bea5':'#e6b45b');indicator.scale.setScalar(run?1+Math.sin(t*4)*.08:1.12);
  for(let i=0;i<45;i++){const j=Math.floor(i/9),f=((rt*1.6+i/9)%1);dummy.position.set(pans[j].x+Math.sin(i*2.1)*.025,.63-f*.30,z+Math.cos(i)*.025);dummy.scale.setScalar(run?.9:0);dummy.updateMatrix();falls.setMatrixAt(i,dummy.matrix)}falls.instanceMatrix.needsUpdate=true;
  hens.forEach(h=>{const cyc=(t*1.65+h.phase)%Math.PI;h.neck.rotation.x=.16+Math.pow(Math.max(0,Math.sin(cyc)),7)*1.1;h.bird.position.y=h.base.y+Math.sin(t*2+h.phase)*.003});
 };return shadowed(g);
}
