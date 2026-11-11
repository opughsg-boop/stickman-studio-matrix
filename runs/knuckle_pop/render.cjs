// usage: node render.js out_dir fps t0 t1 [step]   (step = frame stride, for previews)
const path=require('path'),fs=require('fs'),http=require('http');
const {chromium}=require('./renderer/node_modules/playwright');
const [,,out,fpsA,t0A,t1A,stepA]=process.argv;
const fps=+fpsA,t0=+t0A,t1=+t1A,step=+(stepA||1);
fs.mkdirSync(out,{recursive:true});
const root=path.join(__dirname,'renderer');
const srv=http.createServer((q,r)=>{const f=path.join(root,decodeURIComponent(q.url.split('?')[0]));
  fs.readFile(f,(e,d)=>{if(e){r.writeHead(404);r.end();return;}
  r.writeHead(200,{'Content-Type':f.endsWith('.js')?'text/javascript':'text/html'});r.end(d);});});
(async()=>{
  await new Promise(r=>srv.listen(0,r));
  const b=await chromium.launch({args:['--use-angle=swiftshader','--use-gl=angle','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--no-sandbox']});
  const p=await b.newPage({viewport:{width:1080,height:1920}});
  p.on('pageerror',e=>console.log('ERR',e.message));
  await p.goto(`http://localhost:${srv.address().port}/knuckle_zd_30s.html`);
  await p.waitForFunction(()=>window.ready);
  const n0=Math.round(t0*fps),n1=Math.round(t1*fps);
  for(let n=n0,i=0;n<n1;n+=step,i++){
    await p.evaluate(t=>window.seekTo(t),n/fps);
    await p.locator('#wrap').screenshot({path:path.join(out,`f_${String(i).padStart(5,'0')}.jpg`),type:'jpeg',quality:92});
    if(i%30===0)console.log('frame',n);
  }
  await b.close();srv.close();
})();
