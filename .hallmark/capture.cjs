const fs = require('node:fs');
const path = require('node:path');
const {launchExtension} = require('../tests/lib/browser.cjs');
(async()=>{
 const phase=process.argv[2]||'after';
 const dir=path.join(__dirname,phase);fs.mkdirSync(dir,{recursive:true});
 const ctx=await launchExtension('hallmark',{viewport:{width:1280,height:800}});
 try{
 await ctx.route('https://fsc-edunext.fpt.edu.vn/**',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><html><body><div class="chat-messages"></div></body></html>'}));
 const p=await ctx.newPage();await p.goto('https://fsc-edunext.fpt.edu.vn/hallmark-preview');
 await p.locator('#rc-kit #gear').click();
 for(const mode of ['dark','light']){
 await p.locator('#rc-kit [data-tab="theme"]').click();await p.locator('#rc-kit [data-theme-mode="'+mode+'"]').click();
 for(const tab of ['theme','feat','ocr','music']){
 await p.locator('#rc-kit [data-tab="'+tab+'"]').click();
 await p.locator('#rc-kit #panel').screenshot({path:path.join(dir,mode+'-'+tab+'.png'),animations:'disabled'});
 }
 }
 await p.locator('#rc-kit [data-tab="theme"]').click();
 await p.setViewportSize({width:360,height:640});
 await p.screenshot({path:path.join(dir,'mobile.png'),animations:'disabled'});
 await p.setViewportSize({width:1280,height:900});
 await p.locator('#rc-kit [data-size-preset="2"]').click();
 await p.locator('#rc-kit #panel').screenshot({path:path.join(dir,'wide.png'),animations:'disabled'});
 for(const tab of ['theme','feat','ocr','music']){
 await p.locator('#rc-kit [data-tab="'+tab+'"]').click();
 await p.locator('#rc-kit .body').evaluate(e=>e.scrollTop=e.scrollHeight);
 await p.locator('#rc-kit #panel').screenshot({path:path.join(dir,'wide-'+tab+'-end.png'),animations:'disabled'});
 const overflow=await p.locator('#rc-kit .body').evaluate(e=>({width:e.clientWidth,content:e.scrollWidth}));
 if(overflow.content>overflow.width+1) throw new Error('Horizontal overflow in '+tab+': '+JSON.stringify(overflow));
 }
 const hooks=await p.locator('#rc-kit').evaluate(e=>{const r=e.shadowRoot;return {ids:[...r.querySelectorAll('[id]')].map(e=>e.id).sort(),fields:[...r.querySelectorAll('[data-k]')].map(e=>e.dataset.k).sort(),buttons:[...r.querySelectorAll('button')].map(e=>[e.id,e.dataset.tab,e.dataset.pre,e.textContent.trim()])}});
 fs.writeFileSync(path.join(dir,'hooks.json'),JSON.stringify(hooks,null,2));
 console.log('Captured '+phase+' console screens and wiring inventory.');
 }finally{await ctx.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
