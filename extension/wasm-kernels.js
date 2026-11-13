// Runs in the extension service worker and OCR document, never the page world.
(() => {
  function wrap(exports) {
    const {memory}=exports;
    const load=pixels=>{
      if(!ArrayBuffer.isView(pixels)||pixels.byteLength>64*1024*1024)throw new Error('Invalid pixel buffer');
      const ptr=exports.input_resize(pixels.byteLength);if(!ptr && pixels.byteLength)throw new Error('Pixel allocation failed');
      new Uint8Array(memory.buffer,ptr,pixels.byteLength).set(new Uint8Array(pixels.buffer,pixels.byteOffset,pixels.byteLength));return ptr;
    };
    const result=()=>Array.from(new Uint32Array(memory.buffer,exports.output_ptr(),exports.output_len()));
    const run=(name,...args)=>{if(exports[name](...args)!==0)throw new Error('Invalid input for '+name);return result();};
    return {
      preprocess(pixels){const ptr=load(pixels);run('preprocess');pixels.set(new Uint8Array(memory.buffer,ptr,pixels.byteLength));},
      figures(pixels,w,h,covered){load(pixels);const ptr=exports.mask_resize(covered.length);new Uint8Array(memory.buffer,ptr,covered.length).set(covered);return run('figures',w,h);},
      strips(pixels,w,h,k){load(pixels);return run('strips',w,h,k);},
      palette(pixels){load(pixels);const values=run('palette');return values.length?Object.fromEntries(['primary','userBubble','botBubble','msgBg','chatBg','panelBg','pageBg'].map((key,i)=>[key,'#'+values[i].toString(16).padStart(6,'0')])):null;}
    };
  }
  globalThis.RCWasm={wrap,ready:(async()=>{
    try{
      const response=await fetch(chrome.runtime.getURL('wasm/rc_kernels.wasm'));
      if(!response.ok)throw new Error('WASM HTTP '+response.status);
      const {instance}=await WebAssembly.instantiate(await response.arrayBuffer());return wrap(instance.exports);
    }catch(e){console.warn('[RC Rust] Using JavaScript fallback:',e);return null;}
  })()};
})();
