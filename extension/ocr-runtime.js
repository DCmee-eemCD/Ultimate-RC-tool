(() => {
  const cache=Object.create(null),listeners=new Map();let next=0,tail=Promise.resolve();
  const write=(fn)=>{tail=tail.then(fn,fn);tail.catch(e=>console.error('[RC storage]',e));return tail;};
  const ready=chrome.storage.local.get(null).then(values=>Object.assign(cache,values));
  chrome.storage.onChanged.addListener((changes,area)=>{
    if(area!=='local')return;
    for(const [key,c]of Object.entries(changes)){
      if('newValue'in c)cache[key]=c.newValue;else delete cache[key];
      for(const l of listeners.values())if(l.key===key)l.fn(key,c.oldValue,c.newValue,true);
    }
  });
  window.RC={ready,workerOptions:{
    workerPath:chrome.runtime.getURL('vendor/worker.min.js'),
    corePath:chrome.runtime.getURL('vendor/core/'),
    langPath:chrome.runtime.getURL('vendor/lang/'),
    workerBlobURL:false,gzip:true
  },closeSelf:()=>tail.then(()=>chrome.runtime.sendMessage({op:'close-self'}))};
  window.GM_getValue=(k,d)=>Object.hasOwn(cache,k)?structuredClone(cache[k]):d;
  window.GM_setValue=(k,v)=>{cache[k]=structuredClone(v);write(()=>chrome.storage.local.set({[k]:v}));};
  window.GM_deleteValue=k=>{delete cache[k];write(()=>chrome.storage.local.remove(k));};
  window.GM_addValueChangeListener=(key,fn)=>{const id=++next;listeners.set(id,{key,fn});return id;};
  window.GM_removeValueChangeListener=id=>listeners.delete(id);
  window.GM_xmlhttpRequest=o=>{
    const controller=new AbortController();
    fetch(o.url,{credentials:'omit',signal:controller.signal}).then(async r=>o.onload?.({status:r.status,response:await r.blob()})).catch(e=>o.onerror?.(e));
    return{abort:()=>controller.abort()};
  };
})();
