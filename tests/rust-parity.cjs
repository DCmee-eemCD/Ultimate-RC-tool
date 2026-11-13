const fs=require('node:fs/promises'),vm=require('node:vm'),assert=require('node:assert/strict');
const {performance}=require('node:perf_hooks');
(async()=>{
  const source=await fs.readFile('source/Ultimate-RC-tools-5.14.txt','utf8');
  const bytes=await fs.readFile('extension/wasm/rc_kernels.wasm');
  const {instance}=await WebAssembly.instantiate(bytes);
  const loader=await fs.readFile('extension/wasm-kernels.js','utf8');
  const loaderCtx=vm.createContext({console,WebAssembly,Uint8Array,Uint32Array,ArrayBuffer,fetch:async()=>({ok:true,arrayBuffer:async()=>bytes}),chrome:{runtime:{getURL:x=>x}}});
  vm.runInContext(loader,loaderCtx);const kernels=await loaderCtx.RCWasm.ready;assert.ok(kernels);
  const crops=[];
  const document={createElement:()=>({getContext(){return {fillRect(){},drawImage(_orig,x,y,w,h){this.owner.crop=[x,y,w,h];},owner:this};},toDataURL(){return JSON.stringify(this.crop);}})};
  const ctx=vm.createContext({console,performance,document});
  vm.runInContext(source.slice(source.indexOf('    function buildResult'),source.indexOf('    async function ocrPipeline'))+source.slice(source.indexOf('    function rgb2hsl'),source.indexOf('    let syncInputs')),ctx);
  const generated=await fs.readFile('extension/ocr-engine.js','utf8');
  const fallback=vm.createContext({console,performance,document,kernels:null});
  vm.runInContext(generated.slice(generated.indexOf('    function buildResult'),generated.indexOf('    async function ocrPipeline')),fallback);
  let state=12345;const random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};
  const equal=(a,b)=>assert.equal(JSON.stringify(a),JSON.stringify(b));
  const reports=[];const pass=name=>{console.log('PASS',name);reports.push({name,status:'passed'});};
  const preprocessSource=source.slice(source.indexOf('        const lut = new Uint8ClampedArray(256);'),source.indexOf('        x.putImageData(id, 0, 0);'));
  const jsPreprocess=new Function('pixels','const x={getImageData:()=>({data:pixels})}, c={width:pixels.length/4,height:1};'+preprocessSource);
  for(let i=0;i<20;i++){
    const original=Uint8ClampedArray.from({length:4096},()=>Math.floor(random()*256));const expected=original.slice(),actual=original.slice();
    jsPreprocess(expected);kernels.preprocess(actual);equal(actual,expected);
  }pass('Gamma/grayscale pixels exactly match original JavaScript');
  for(let i=0;i<150;i++){
    const pixels=Uint8ClampedArray.from({length:48*48*4},()=>Math.floor(random()*256));
    if(i<8)for(let p=0;p<pixels.length;p+=4)pixels.set([i*32,i*32,i*32,255],p);
    if(i===8)pixels.fill(0);
    equal(kernels.palette(pixels),ctx.paletteFromPixels(pixels));
  }pass('150 palettes match original colors, including grayscale and transparency');
  for(let i=0;i<30;i++){
    const w=240,h=320,pixels=new Uint8ClampedArray(w*h*4).fill(255),covered=new Uint8Array(h);
    const y0=20+(i%3)*10,y1=y0+15;
    for(let y=y0-3;y<y1+3;y++)covered[y]=1;
    for(let y=10;y<h-10;y++)for(let x=5;x<w-5;x++){
      if((y>=y0&&y<=y1&&x<160)||(y>100&&y<220&&x>30&&x<180&&random()<0.3)||x===5){const p=(y*w+x)*4;pixels[p]=pixels[p+1]=pixels[p+2]=20;}
    }
    const data={blocks:[{paragraphs:[{lines:[{text:'Valid OCR text',confidence:95,bbox:{y0,y1}}]}]}]};
    const orig={width:w,height:h,getContext:()=>({getImageData:()=>({data:pixels})})};
    const expected=ctx.buildResult(data,orig,1).segments.filter(x=>x.type==='img').map(x=>JSON.parse(x.src));
    equal(fallback.buildResult(data,orig,1).segments,ctx.buildResult(data,orig,1).segments);
    const out=kernels.figures(pixels,w,h,covered),actual=[];for(let j=0;j<out.length;j+=6)actual.push(out.slice(j,j+4));equal(actual,expected);
    // Compare actual crop calls performed by the original text-strip implementation.
    const stripPixels=new Uint8ClampedArray(w*h*4).fill(255);
    for(let y=15;y<h-15;y++)if(y%35<14)for(let x=12;x<120+(i%4)*15;x++)stripPixels[(y*w+x)*4]=20;
    const seen=[];const canvas={width:w,height:h};
    await ctx.recognizeStrips(canvas,{getImageData:()=>({data:stripPixels})},async c=>{if(c.crop)seen.push(c.crop);return {blocks:[],text:''};},2+(i%3));
    const fallbackCrops=[];
    await fallback.recognizeStrips(canvas,{getImageData:()=>({data:stripPixels})},async c=>{if(c.crop)fallbackCrops.push(c.crop);return {blocks:[],text:''};},2+(i%3));equal(fallbackCrops,seen);
    const boxes=kernels.strips(stripPixels,w,h,2+(i%3)),rustCrops=[];
    for(let j=0;j<boxes.length;j+=4)rustCrops.push([boxes[j],boxes[j+1],boxes[j+2]-boxes[j]+1,boxes[j+3]-boxes[j+1]+1]);equal(rustCrops,seen);
  }pass('30 figure layouts and text-strip crop sets match original bounding boxes');
  pass('Generated JavaScript fallback preserves figure and strip results');
  const failedLoader=vm.createContext({console:{warn(){}},chrome:{runtime:{getURL:x=>x}},fetch:async()=>{throw new Error('Test load failure');}});
  vm.runInContext(loader,failedLoader);assert.equal(await failedLoader.RCWasm.ready,null);pass('WASM loading failure activates fallback without rejecting startup');
  assert.equal(instance.exports.figures(999,999),-1);assert.equal(instance.exports.input_resize(65*1024*1024),0);
  pass('Malformed dimensions and oversized allocation are rejected');
  const sample=Uint8ClampedArray.from({length:1400*900*4},()=>Math.floor(random()*256));
  for(let i=0;i<3;i++){kernels.preprocess(sample.slice());jsPreprocess(sample.slice());}
  function measure(fn){const values=[];for(let i=0;i<8;i++){const data=sample.slice(),t=performance.now();fn(data);values.push(performance.now()-t);}values.sort((a,b)=>a-b);return values[4];}
  const timings={pixels:1400*900,rustWithCopiesMs:measure(p=>kernels.preprocess(p)),originalJsMs:measure(jsPreprocess)};
  console.log('Preprocess timings (Node, not end-to-end OCR):',timings);
  await fs.writeFile('tests/results/RUST-TEST-RESULTS.json',JSON.stringify({version:'5.15.0',wasmBytes:bytes.length,reports,timings},null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
