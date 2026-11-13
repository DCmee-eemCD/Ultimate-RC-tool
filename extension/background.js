importScripts('wasm-kernels.js');
const extensionRoot=chrome.runtime.getURL('');
const trusted=sender=>sender.id===chrome.runtime.id &&
  (sender.url?.startsWith(extensionRoot)||new URL(sender.url||'https://invalid').origin==='https://fsc-edunext.fpt.edu.vn');
let inboxTail=Promise.resolve();
let creating;
async function ensureOffscreen(){
  if(creating)return creating;
  creating=(async()=>{
    const contexts=await chrome.runtime.getContexts({contextTypes:['OFFSCREEN_DOCUMENT']});
    if(!contexts.length)await chrome.offscreen.createDocument({url:'offscreen.html',reasons:['WORKERS','BLOBS'],justification:'Run local OCR workers and decode images without opening a browser tab.'});
  })();
  try{await creating;}finally{creating=null;}
}
async function offscreen(action,options={}){
  await ensureOffscreen();
  const r=await chrome.runtime.sendMessage({target:'rc-ocr',action,...options});
  if(r?.error)throw Error(r.error);return r?.result;
}
function appendJob(job){
  const run=async()=>{
    if(!job || typeof job.id!=='string')throw new Error('Invalid OCR job');
    if(job.cmd!=='quit')validateImageUrl(job.url);
    const data=await chrome.storage.local.get('rc_ocr_inbox');
    let list=[];try{list=JSON.parse(data.rc_ocr_inbox||'[]');}catch{}
    list=(Array.isArray(list)?list:[]).filter(j=>Date.now()-j.ts<300000).slice(-30);
    list.push(job);await chrome.storage.local.set({rc_ocr_inbox:JSON.stringify(list)});
  };
  const p=inboxTail.then(run,run);inboxTail=p;return p;
}
function validateImageUrl(raw){
  const u=new URL(raw);
  if(u.protocol!=='https:'||u.hostname!=='cdn-lab.fpt.edu.vn')throw new Error('OCR only accepts FPT CDN images');
  return u;
}
async function handle(m,sender){
  if(!trusted(sender))throw new Error('Untrusted sender');
  switch(m.op){
    case 'ocr': {
      validateImageUrl(m.url);
      if(!['eng','vie','vie+eng'].includes(m.langs)||!Number.isInteger(m.threads)||m.threads<0||m.threads>8||!Number.isFinite(m.idle)||m.idle<0||m.idle>120)throw Error('Invalid OCR options');
      return offscreen('run',{url:m.url,langs:m.langs,threads:m.threads,idle:m.idle,keepWarm:!!m.keepWarm});
    }
    case 'ocr-stop':return offscreen('stop');
    case 'ocr-heartbeat':return;
    case 'ocr-status':
      if(sender.url!==extensionRoot+'offscreen.html')throw Error('Invalid status sender');
      await chrome.storage.local.set({rc_ocr_status:m.status,rc_ocr_hub_info:m.status.workers+' luồng · '+(m.status.langs||'—')+' · '+m.status.backend});return;
    case 'palette': {
      if(!Array.isArray(m.pixels)||m.pixels.length>48*48*4||m.pixels.length%4||m.pixels.some(v=>!Number.isInteger(v)||v<0||v>255))throw new Error('Invalid palette pixels');
      const kernels=await RCWasm.ready;if(!kernels)throw new Error('Rust palette unavailable');
      return {colors:kernels.palette(new Uint8ClampedArray(m.pixels)),backend:'rust'};
    }
    case 'post-job':return appendJob(m.job);
    case 'open':{
      const u=validateImageUrl(m.url),hash=u.hash.slice(1);u.hash='';
      if(!/^rc-hub(?:&|$)|^rc-ocr=[\w-]+(?:&|$)/.test(hash))throw new Error('Invalid OCR mode');
      const tab=await chrome.tabs.create({url:extensionRoot+'ocr.html#'+hash+'&src='+encodeURIComponent(u.href),active:!!m.active});
      await chrome.storage.session.set({['tab-owner-'+tab.id]:sender.tab?.id});return tab.id;
    }
    case 'close':{
      const key='tab-owner-'+m.tabId,owner=(await chrome.storage.session.get(key))[key];
      if(owner!==sender.tab?.id)throw new Error('Cannot close unrelated tab');
      await chrome.tabs.remove(m.tabId);await chrome.storage.session.remove(key);return;
    }
    case 'close-self':
      if(!sender.url.startsWith(extensionRoot+'ocr.html'))throw new Error('Invalid OCR tab');
      if(sender.tab?.id)await chrome.tabs.remove(sender.tab.id);return;
    default:throw new Error('Unsupported operation');
  }
}
chrome.runtime.onMessage.addListener((m,sender,reply)=>{
  if(m?.target==='rc-ocr')return;
  handle(m,sender).then(result=>reply({result}),e=>reply({error:String(e.message||e)}));return true;
});
chrome.runtime.onConnect.addListener(port=>{
  if(port.name!=='rc-fetch'||!trusted(port.sender)){port.disconnect();return;}
  const controller=new AbortController();port.onDisconnect.addListener(()=>controller.abort());
  port.onMessage.addListener(async m=>{
    try{
      const u=new URL(m.url);if(!['https:','http:'].includes(u.protocol))throw new Error('Expected an HTTP(S) media URL');
      const r=await fetch(u,{credentials:'omit',signal:controller.signal});
      const reader=r.body.getReader();let bytes=0;
      while(true){
        const {done,value}=await reader.read();if(done)break;
        bytes+=value.length;if(bytes>64*1024*1024)throw new Error('Media exceeds 64 MB');
        for(let i=0;i<value.length;i+=32768)port.postMessage({chunk:btoa(String.fromCharCode(...value.subarray(i,i+32768)))});
      }
      port.postMessage({done:true,status:r.status,type:r.headers.get('content-type')||'application/octet-stream'});
    }catch(e){try{port.postMessage({error:String(e.message||e)});}catch{}}
  });
});
chrome.tabs.onRemoved.addListener(id=>chrome.storage.session.remove('tab-owner-'+id));
