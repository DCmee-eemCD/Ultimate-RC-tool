// Only runtime messaging is used here: offscreen documents do not have storage API access.
let scheduler=null,workers=0,langs='',tail=Promise.resolve(),pending=0,idleTimer,stopRequested=false;
const inFlight=new Map(),cache=new Map();let cacheBytes=0;
const status=()=>chrome.runtime.sendMessage({op:'ocr-status',status:{workers,langs,pending,backend:RC.pixelBackend||'loading'}}).catch(()=>{});
// Keep the reply channel alive only while OCR requests are in flight.
setInterval(()=>{if(pending)chrome.runtime.sendMessage({op:'ocr-heartbeat'}).catch(()=>{});},20000);
async function dispose(){
  const old=scheduler;scheduler=null;workers=0;langs='';
  if(old)await old.terminate();await status();
}
async function pool(language,count){
  if(scheduler&&(langs!==language||workers!==count))await dispose();
  if(scheduler)return;
  const sc=Tesseract.createScheduler();scheduler=sc;langs=language;
  const created=await Promise.allSettled(Array.from({length:count},()=>Tesseract.createWorker(language,1,RC.workerOptions)));
  for(const r of created)if(r.status==='fulfilled'){sc.addWorker(r.value);workers++;}
  if(!workers){await dispose();throw Error('Không khởi tạo được OCR worker.');}
  await status();
}
function remember(key,result){
  const bytes=JSON.stringify(result).length*2;if(bytes>16*1024*1024)return;
  cache.set(key,{result:structuredClone(result),bytes});cacheBytes+=bytes;
  while(cache.size>16||cacheBytes>16*1024*1024){const k=cache.keys().next().value;cacheBytes-=cache.get(k).bytes;cache.delete(k);}
}
async function run(job){
  const start=performance.now();let bmp;
  try{
    const core=await RCOcrReady;
    const r=await fetch(job.url,{credentials:'omit',signal:AbortSignal.timeout(30000)});
    if(!r.ok)throw Error('HTTP '+r.status);
    const blob=await r.blob();if(blob.size>32*1024*1024)throw Error('Ảnh OCR vượt 32 MB.');
    const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await blob.arrayBuffer())),v=>v.toString(16).padStart(2,'0')).join('');
    const key=job.langs+':'+job.threads+':'+hash;
    if(cache.has(key)){
      const hit=cache.get(key);cache.delete(key);cache.set(key,hit);
      const res=structuredClone(hit.result);res.ms={...res.ms,cached:true,load:Math.round(performance.now()-start),pool:0,ocr:0,post:0,total:Math.round(performance.now()-start)};return res;
    }
    bmp=await createImageBitmap(blob);
    const area=bmp.width*bmp.height;if(area>16000000||bmp.width>16000||bmp.height>16000)throw Error('Ảnh OCR quá lớn.');
    const cpu=Math.max(1,(navigator.hardwareConcurrency||4)-1),memory=navigator.deviceMemory||8;
    const processedArea=area*(bmp.width<1400?4:1);
    const count=job.threads||Math.max(1,Math.min(cpu,memory<=4?2:4,processedArea<500000?1:processedArea<2000000?2:4));
    const loaded=performance.now();await pool(job.langs,count);const ready=performance.now();
    let timer;
    const activeScheduler=scheduler;
    let result;
    try { result=await Promise.race([core.ocrPipeline(bmp,async canvas=>{
      // Explicit Blob encoding with a failure path; the bundled loader also supports Blob.
      const image=await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('Canvas encoding failed')),'image/png'));
      return (await activeScheduler.addJob('recognize',image,{}, {blocks:true,text:true})).data;
    },workers),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('OCR quá lâu (>120s)')),120000);})]);
    } finally {clearTimeout(timer);}
    result.ms={...result.ms,load:Math.round(loaded-start),pool:Math.round(ready-loaded),total:Math.round(performance.now()-start),workers,backend:core.backend,cached:false};
    remember(key,result);return result;
  }finally{bmp?.close();}
}
function enqueue(job){
  const key=JSON.stringify([job.url,job.langs,job.threads,job.keepWarm,job.idle]);
  if(inFlight.has(key))return inFlight.get(key);
  if(pending>=24)return Promise.reject(Error('Hàng đợi OCR đầy. Thử lại sau.'));
  pending++;clearTimeout(idleTimer);status();const queued=performance.now();
  const task=tail.then(async()=>{
    try{
      const result=await run(job);
      result.ms.queue=Math.round(performance.now()-queued-result.ms.total);return result;
    }catch(e){await dispose();throw e;}
  });
  // Cleanup is part of the queue so a newly arriving job cannot race pool termination.
  const complete=task.finally(async()=>{
    pending--;inFlight.delete(key);
    if(!pending){
      if(stopRequested||!job.keepWarm){stopRequested=false;await dispose();}
      else if(job.idle>0)idleTimer=setTimeout(()=>{tail=tail.then(dispose,dispose);},job.idle*60000);
    }
    await status();
  });
  tail=complete.catch(()=>{});inFlight.set(key,complete);return complete;
}
chrome.runtime.onMessage.addListener((m,sender,reply)=>{
  if(m?.target!=='rc-ocr'||sender.id!==chrome.runtime.id)return;
  if(m.action==='stop'){
    clearTimeout(idleTimer);cache.clear();cacheBytes=0;
    if(pending){stopRequested=true;reply({result:{deferred:true}});}
    else {tail=tail.then(dispose,dispose);tail.then(()=>reply({result:{deferred:false}}),e=>reply({error:e.message}));}
  }else if(m.action==='run')enqueue(m).then(result=>reply({result}),e=>reply({error:e.message}));
  else reply({error:'Unknown OCR action'});
  return true;
});
