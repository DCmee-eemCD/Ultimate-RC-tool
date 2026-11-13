const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const {chromium}=require(process.env.RC_PLAYWRIGHT||'../.transfer/package');
const root=path.resolve(__dirname,'..');
const sandbox={Node:class {},Element:class {}};
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(root,'source/text-source.js'),'utf8')+'\nglobalThis.read=latexSourceOf;',sandbox);
const sample='🎉 Chúc mừng! S_q = πR²; C = 2πR. 💪';
assert.equal(sandbox.read({__reactFiber$x:{memoizedProps:{canvas:{url:'https://test'},content:sample}}}),sample);
assert.equal(sandbox.read({__reactFiber$x:{memoizedProps:{messages:[{content:sample}],url:'https://test'}}}),null);
assert.equal(sandbox.read({__reactFiber$x:{memoizedProps:{content:'Current bubble'},return:{memoizedProps:{content:sample}}}}),'Current bubble');
assert.equal(sandbox.read({__reactFiber$x:{memoizedProps:{content:'https://test'}}}),null);
(async()=>{
 const context=await chromium.launchPersistentContext(fs.mkdtempSync(path.join(root,'.transfer','fidelity-')),{executablePath:process.env.RC_CHROME||path.join(root,'.transfer/chrome-win64/chrome.exe'),headless:true,args:['--disable-extensions-except='+path.join(root,'extension'),'--load-extension='+path.join(root,'extension')]});
 try{
 const sw=context.serviceWorkers()[0]||await context.waitForEvent('serviceworker');
 const page=await context.newPage();await page.goto('chrome-extension://'+new URL(sw.url()).host+'/offscreen.html');
 const result=await page.evaluate(async original=>{
   const core=await RCOcrReady, scheduler=Tesseract.createScheduler();
   for(let i=0;i<2;i++)scheduler.addWorker(await Tesseract.createWorker('vie+eng',1,RC.workerOptions));
   try{
    const recognize=async c=>(await scheduler.addJob('recognize',c.toDataURL(),{},{blocks:true,text:true})).data;
    const c=document.createElement('canvas');c.width=960;c.height=350;const x=c.getContext('2d');
    x.fillStyle='white';x.fillRect(0,0,960,350);x.fillStyle='black';x.font='26px Arial';
    x.fillText('🎉 Chúc mừng em hoàn thành buổi học!',28,50);
    x.fillText('🔥 Kỷ lục chuỗi đúng liên tiếp: 5 câu',28,110);
    x.fillText('💪 Điểm mạnh',28,170);
    x.fillText('Normal plain text remains selectable.',28,230);
    x.fillText('Hẹn gặp em ở buổi học tiếp theo! 💪',28,290);
    const one=await core.ocrPipeline(c,recognize,1),two=await core.ocrPipeline(c,recognize,2);
    const bitmap=await createImageBitmap(new Blob([Uint8Array.from(atob(original),s=>s.charCodeAt(0))]));
    const math=await core.ocrPipeline(bitmap,recognize,2);
    return {one,two,math};
   }finally{await scheduler.terminate();}
 },fs.readFileSync(path.join(root,'.transfer/accuracy/original.png')).toString('base64'));
 for(const k of ['one','two']){
   assert.ok(result[k].segments.some(s=>s.type==='rich'),k+' inline emoji');
   assert.match(result[k].text,/Normal plain text/);
   assert.match(result[k].text,/Kỷ lục/);
   assert.ok(result[k].segments.filter(s=>s.type==='rich').flatMap(s=>s.parts).filter(p=>p.type==='icon').length>=4);
 }
 assert.ok(result.math.segments.some(s=>s.preserved&&s.reason==='math'));
 const app=fs.readFileSync(path.join(root,'extension/app.js'),'utf8');
 const renderCode=app.slice(app.indexOf('    function splitQuestionBoxes('),app.indexOf('    function showInBubble('));
 const rendered=await page.evaluate(({renderCode,result,sample})=>{
   const host=document.createElement('div'),cont=document.createElement('div');cont.dataset.testid='chat-canvas-container';host.append(cont);document.body.append(host);
   const cfg={qBox:false,latexSource:false};let copied='';
   const apply=new Function('cfg','latexSourceOf','GM_setClipboard','toast',renderCode+';return applyToContainer;')(cfg,()=>sample,t=>copied=t,()=>{});
   apply(cont,result.two.text,result.two.segments);
   const icons=host.querySelectorAll('.rc-ocr-body img').length;
   host.querySelector('[data-a="copy"]').click();const copiedOcr=copied;
   cfg.latexSource=true;apply(cont,result.two.text,result.two.segments);
   host.querySelector('[data-a="copy"]').click();
   return {icons,copiedOcr,copiedSource:copied,remainingIcons:host.querySelectorAll('.rc-ocr-body img').length};
 },{renderCode,result,sample});
 assert.ok(rendered.icons>=4);assert.match(rendered.copiedOcr,/Kỷ lục/);assert.equal(rendered.copiedSource,sample);assert.equal(rendered.remainingIcons,0);
 const summary={sourceTests:'passed',rendered,one:result.one.text,two:result.two.text,math:result.math.text,counts:Object.fromEntries(Object.entries(result).map(([k,v])=>[k,v.segments.filter(s=>s.preserved).length]))};
 fs.writeFileSync(path.join(root,'tests/results/FIDELITY-TEST-RESULTS.json'),JSON.stringify(summary,null,2));console.log(JSON.stringify(summary,null,2));
 }finally{await context.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
