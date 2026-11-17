const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const {ROOT: root, launchExtension} = require('./lib/browser.cjs');
const sandbox={Node:class {},Element:class {}};
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(root,'source/text-source.js'),'utf8')+'\nglobalThis.read=latexSourceOf;',sandbox);
const sample='🎉 Chúc mừng! S_q = πR²; C = 2πR. 💪';
const canvas={object_key:'test-image',url:'https://test'};
const message={role:'assistant',content:sample,metadata:{canvas}};
const owner={memoizedProps:{messages:[message]}};
const exact={__reactFiber$x:{memoizedProps:{canvas},return:owner}};
assert.equal(sandbox.read(exact),sample);
assert.equal(sandbox.read({__reactFiber$x:{memoizedProps:{canvas:{object_key:'other'}},return:owner}}),null);
assert.equal(sandbox.read({__reactFiber$x:{memoizedProps:{canvas},return:{memoizedProps:{messages:[{...message,role:'user'}]}}}}),null);
assert.equal(sandbox.read({__reactFiber$x:{memoizedProps:{canvas},return:{memoizedProps:{messages:[message,{...message,content:'another'}]}}}}),null);
(async()=>{
 const context=await launchExtension('fidelity');
 try{
 const sw=context.serviceWorkers()[0]||await context.waitForEvent('serviceworker');
 const page=await context.newPage();await page.goto('chrome-extension://'+new URL(sw.url()).host+'/offscreen.html');
 const result=await page.evaluate(async()=>{
   const core=await RCOcrReady, scheduler=Tesseract.createScheduler();
   for(let i=0;i<2;i++)scheduler.addWorker(await Tesseract.createWorker('vie+eng',1,RC.workerOptions));
   try{
    const recognize=async c=>(await scheduler.addJob('recognize',c.toDataURL(),{},{blocks:true,text:true})).data;
    const compact=r=>({text:r.text,segments:r.segments.map(s=>s.type==='img'?{type:s.type,w:s.w,h:s.h,preserved:s.preserved,reason:s.reason}:s)});
    const c=document.createElement('canvas');c.width=960;c.height=350;const x=c.getContext('2d');
    x.fillStyle='white';x.fillRect(0,0,960,350);x.fillStyle='black';x.font='26px Arial';
    x.fillText('🎉 Chúc mừng em hoàn thành buổi học!',28,50);
    x.fillText('🔥 Kỷ lục chuỗi đúng liên tiếp: 5 câu',28,110);
    x.fillText('💪 Điểm mạnh',28,170);
    x.fillText('Normal plain text remains selectable.',28,230);
    x.fillText('Hẹn gặp em ở buổi học tiếp theo! 💪',28,290);
    const one=await core.ocrPipeline(c,recognize,1),two=await core.ocrPipeline(c,recognize,2);
    const formulaCanvas=document.createElement('canvas');formulaCanvas.width=960;formulaCanvas.height=250;
    const f=formulaCanvas.getContext('2d');f.fillStyle='white';f.fillRect(0,0,960,250);f.fillStyle='black';f.font='26px Arial';
    f.fillText('Formula one: S = A + B',28,50);
    f.fillText('Formula two: C = D + E',28,110);
    f.fillText('Formula three: x = y + 1',28,170);
    f.fillText('Formula text stays selectable.',28,230);
    const formula=await core.ocrPipeline(formulaCanvas,recognize,2);
    const diagramCanvas=document.createElement('canvas');diagramCanvas.width=640;diagramCanvas.height=360;
    const d=diagramCanvas.getContext('2d');d.fillStyle='white';d.fillRect(0,0,640,360);d.strokeStyle='black';d.lineWidth=10;
    d.beginPath();d.arc(320,180,110,0,Math.PI*2);d.moveTo(320,70);d.lineTo(320,290);d.moveTo(210,180);d.lineTo(430,180);d.stroke();
    d.beginPath();d.moveTo(110,280);d.lineTo(180,100);d.lineTo(250,280);d.closePath();d.stroke();
    const diagram=await core.ocrPipeline(diagramCanvas,recognize,2);
    return {one:compact(one),two:compact(two),formula:compact(formula),diagram:compact(diagram)};
   }finally{await scheduler.terminate();}
 });
 for(const k of ['one','two']){
   assert.ok(result[k].segments.length>0,k+' OCR output');
   assert.ok(result[k].segments.some(s=>s.type==='rich'&&s.parts.some(p=>p.type==='icon')),k+' colored glyphs stay visual');
   assert.ok(result[k].segments.filter(s=>s.type==='rich').every(s=>s.parts.some(p=>p.type==='text')),k+' rich lines keep selectable words');
   assert.match(result[k].text,/Normal plain text/);
   assert.match(result[k].text,/Kỷ lục/);
 }
 assert.ok(result.formula.segments.some(s=>s.type==='text'&&/[=+]/.test(s.text)),'formula remains selectable text');
 for(const [name,data] of Object.entries(result))
   assert.equal(data.segments.some(s=>s.type==='img'&&s.preserved),false,name+' has no rejected glyph/whole-line crop');
 assert.ok(result.diagram.segments.some(s=>s.type==='img'),'actual diagram remains an image segment');
 assert.ok(result.diagram.segments.filter(s=>s.type==='img').every(s=>s.w>0&&s.h>0),'diagram image has dimensions');
 const app=fs.readFileSync(path.join(root,'extension/app.js'),'utf8');
 const renderCode=app.slice(app.indexOf('    function splitQuestionBoxes('),app.indexOf('    function showInBubble('));
 const rendered=await page.evaluate(({renderCode,result,sample})=>{
   const host=document.createElement('div'),cont=document.createElement('div');cont.dataset.testid='chat-canvas-container';host.append(cont);document.body.append(host);
   const cfg={qBox:false,sourceFirst:false};let copied='';
   const apply=new Function('cfg','latexSourceOf','GM_setClipboard','toast',renderCode+';return applyToContainer;')(cfg,()=>sample,t=>copied=t,()=>{});
   apply(cont,result.two.text,result.two.segments);
   const ocrImages=host.querySelectorAll('.rc-ocr-body img').length;
   host.querySelector('[data-a="copy"]').click();const copiedOcr=copied;
   cfg.sourceFirst=true;apply(cont,result.two.text,result.two.segments);
   host.querySelector('[data-a="copy"]').click();
   return {ocrImages,copiedOcr,copiedSource:copied,sourceImages:host.querySelectorAll('.rc-ocr-body img').length};
 },{renderCode,result,sample});
 assert.ok(rendered.ocrImages>=4);assert.equal(rendered.copiedOcr,result.two.text);assert.equal(rendered.copiedSource,sample);assert.equal(rendered.sourceImages,0);
 const summary={sourceTests:'passed',rendered,one:result.one.text,two:result.two.text,formula:result.formula.text,diagram:result.diagram.segments};
 fs.writeFileSync(path.join(root,'tests/results/FIDELITY-TEST-RESULTS.json'),JSON.stringify(summary,null,2));console.log(JSON.stringify(summary,null,2));
 }finally{await context.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
