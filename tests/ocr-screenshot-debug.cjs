const fs=require('node:fs'),assert=require('node:assert/strict');
const {launchExtension}=require('./lib/browser.cjs');
const input='C:\\Users\\LAPTOP\\AppData\\Local\\Temp\\codex-clipboard-kFgn5h.png';
(async()=>{
  const context=await launchExtension('ocr-screenshot-debug');
  try {
    const sw=context.serviceWorkers()[0]||await context.waitForEvent('serviceworker');
    const page=await context.newPage();
    await page.goto('chrome-extension://'+new URL(sw.url()).host+'/offscreen.html');
    const result=await page.evaluate(async b64=>{
      const core=await RCOcrReady,scheduler=Tesseract.createScheduler();
      scheduler.addWorker(await Tesseract.createWorker('vie+eng',1,RC.workerOptions));
      try {
        const recognize=async c=>(await scheduler.addJob('recognize',c.toDataURL(),{},{blocks:true,text:true})).data;
        const im=new Image();im.src='data:image/png;base64,'+b64;await im.decode();
        const r=await core.ocrPipeline(im,recognize,1);
        return {text:r.text,segments:r.segments.map(s=>({type:s.type,preserved:s.preserved,reason:s.reason,parts:s.type==='rich'?s.parts.map(p=>p.type):undefined}))};
      }finally{await scheduler.terminate();}
    },fs.readFileSync(input).toString('base64'));
    console.log(JSON.stringify(result,null,2));
    assert.match(result.text,/According to the conversation/i);
    assert.match(result.text,/Câu hỏi|Cau hoi/i);
  }finally{await context.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
