// Synchronous GM-compatible cache backed by an isolated extension bridge.
// This file runs in MAIN world so React fibers, MathLive and canvas hooks stay accessible.
(() => {
  if (window.RC) return;
  const pending = new Map(), listeners = new Map(), cache = Object.create(null);
  let serial = 0, listenerSerial = 0, writeTail = Promise.resolve(), resolveReady;
  const ready = new Promise(r => { resolveReady = r; });
  const call = (op, args = {}) => new Promise((resolve, reject) => {
    const id = ++serial;
    const timer = setTimeout(() => { pending.delete(id); reject(new Error('Extension request timed out: '+op)); }, 180000);
    pending.set(id, {resolve,reject,timer});
    window.postMessage({rcExtension:'request', id, op, ...args}, location.origin);
  });
  const fail = e => { console.error('[RC extension]', e); };
  const write = (op,args) => { const run=()=>call(op,args); writeTail = writeTail.then(run,run); writeTail.catch(fail); return writeTail; };
  window.addEventListener('message', e => {
    if(e.source!==window || e.origin!==location.origin) return;
    const m=e.data;
    if(m?.rcExtension==='response') {
      const p=pending.get(m.id); if(!p) return;
      pending.delete(m.id); clearTimeout(p.timer);
      m.error ? p.reject(new Error(m.error)) : p.resolve(m.result);
    } else if(m?.rcExtension==='changes') {
      for(const [key,c] of Object.entries(m.changes)) {
        if('newValue' in c) cache[key]=c.newValue; else delete cache[key];
        for(const l of listeners.values()) if(l.key===key) { try{l.fn(key,c.oldValue,c.newValue,true);}catch(err){fail(err);} }
      }
    }
  });
  const earlyUrls=[];
  const originalDrawImage=CanvasRenderingContext2D.prototype.drawImage;
  CanvasRenderingContext2D.prototype.drawImage=function(s,...args){
    if(s?.tagName==='IMG') {earlyUrls.push(s.currentSrc||s.src); if(earlyUrls.length>1000)earlyUrls.shift();}
    return originalDrawImage.call(this,s,...args);
  };
  window.RC={ready,earlyUrls,originalDrawImage,flush:()=>writeTail,postJob:job=>write('post-job',{job})};
  RC.palette=pixels=>call('palette',{pixels}).then(r=>{RC.paletteBackend=r.backend;return r.colors;});
  RC.ocr=options=>call('ocr',options);
  RC.ocrStop=()=>call('ocr-stop');
  RC.themeImport=(theme,video)=>write('theme-import',{theme,video});
  window.unsafeWindow=window;
  window.GM_getValue=(key,fallback)=>Object.hasOwn(cache,key)?structuredClone(cache[key]):fallback;
  window.GM_setValue=(key,value)=>{cache[key]=structuredClone(value); write('set',{key,value});};
  window.GM_deleteValue=key=>{delete cache[key]; write('delete',{key});};
  window.GM_addValueChangeListener=(key,fn)=>{const id=++listenerSerial;listeners.set(id,{key,fn});return id;};
  window.GM_removeValueChangeListener=id=>listeners.delete(id);
  window.GM_setClipboard=text=>{call('clipboard',{text:String(text)}).catch(fail);};
  window.GM_openInTab=(url,options={})=>{
    const p=call('open',{url,active:!!options.active});p.catch(fail);
    return {close:()=>p.then(id=>call('close',{tabId:id})).catch(fail)};
  };
  window.GM_xmlhttpRequest=options=>{
    let aborted=false;
    call('fetch',{url:options.url}).then(r=>{
      if(aborted)return;
      options.onload?.({status:r.status,response:r.blob});
    }).catch(e=>{if(!aborted)options.onerror?.(e);});
    return {abort(){aborted=true;}};
  };
  // Retry handshake because Chrome may start the two worlds in either order.
  const hello=()=>window.postMessage({rcExtension:'hello'},location.origin);
  const timer=setInterval(hello,100);
  const onInit=e=>{
    if(e.source!==window || e.origin!==location.origin || e.data?.rcExtension!=='init')return;
    Object.assign(cache,e.data.values); clearInterval(timer); window.removeEventListener('message',onInit); resolveReady();
  };
  window.addEventListener('message',onInit); hello();
})();
