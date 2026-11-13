(() => {
  const allowedKey = k => typeof k==='string' && /^(chatKit|chatKitBgVid|rc_ocr_[\w-]+)$/.test(k);
  const send=m=>window.postMessage(m,location.origin);
  let initialized=false;
  const valuesPromise=chrome.storage.local.get(null);
  chrome.storage.onChanged.addListener((changes,area)=>{
    if(area==='local' && initialized)send({rcExtension:'changes',changes});
  });
  const background=async m=>{
    const r=await chrome.runtime.sendMessage(m);
    if(r?.error)throw new Error(r.error);return r?.result;
  };
  const fetchBlob=url=>new Promise((resolve,reject)=>{
    const port=chrome.runtime.connect({name:'rc-fetch'}), chunks=[];
    let settled=false;
    port.onMessage.addListener(m=>{
      if(m.chunk) { const s=atob(m.chunk),a=new Uint8Array(s.length);for(let i=0;i<s.length;i++)a[i]=s.charCodeAt(i);chunks.push(a); }
      if(m.done||m.error){settled=true;port.disconnect();m.error?reject(new Error(m.error)):resolve({status:m.status,blob:new Blob(chunks,{type:m.type})});}
    });
    port.onDisconnect.addListener(()=>{if(!settled)reject(new Error(chrome.runtime.lastError?.message||'Download disconnected'));});
    port.postMessage({url});
  });
  const clipboard=async text=>{
    try {await navigator.clipboard.writeText(text);return;}catch{}
    const t=document.createElement('textarea');t.value=text;t.style.cssText='position:fixed;left:-10000px;top:0';
    const active=document.activeElement;document.documentElement.append(t);t.select();
    // Prevent page copy handlers from replacing the requested text.
    const copy=e=>{e.clipboardData.setData('text/plain',text);e.preventDefault();};
    t.addEventListener('copy',copy);
    const ok=document.execCommand('copy');t.remove();active?.focus();
    if(!ok)throw new Error('Không copy được; hãy giữ tab EduNext đang mở rồi thử lại.');
  };
  window.addEventListener('message',async e=>{
    if(e.source!==window || e.origin!==location.origin)return;
    const m=e.data;
    if(m?.rcExtension==='hello'){
      await valuesPromise;
      // Fresh snapshot also covers changes that arrived before the handshake.
      const values=await chrome.storage.local.get(null);initialized=true;
      send({rcExtension:'init',values});return;
    }
    if(m?.rcExtension!=='request' || !Number.isInteger(m.id))return;
    try{
      let result;
      switch(m.op){
        case 'palette': {
          if(!(m.pixels instanceof Uint8ClampedArray) || m.pixels.length>48*48*4 || m.pixels.length%4)throw new Error('Invalid palette pixels');
          result=await background({op:'palette',pixels:Array.from(m.pixels)});break;
        }
        case 'set': if(!allowedKey(m.key))throw new Error('Invalid storage key');await chrome.storage.local.set({[m.key]:m.value});break;
        case 'delete': if(!allowedKey(m.key))throw new Error('Invalid storage key');await chrome.storage.local.remove(m.key);break;
        case 'clipboard': await clipboard(m.text);break;
        case 'fetch': result=await fetchBlob(m.url);break;
        case 'theme-import':
          if(!m.theme || typeof m.theme!=='object')throw new Error('Invalid theme');
          await chrome.storage.local.set({chatKit:m.theme,chatKitBgVid:m.video||''});break;
        case 'ocr': case 'ocr-stop': case 'open': case 'close': case 'post-job': result=await background(m);break;
        default:throw new Error('Unsupported operation');
      }
      send({rcExtension:'response',id:m.id,result});
    }catch(err){send({rcExtension:'response',id:m.id,error:String(err.message||err)});}
  });
})();
