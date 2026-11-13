/* Run with RC_PLAYWRIGHT and RC_CHROME pointing to your test installations. */
const fs=require('node:fs/promises');
const path=require('node:path');
const assert=require('node:assert/strict');
const {chromium}=require(process.env.RC_PLAYWRIGHT||'playwright');
const root=path.resolve(__dirname,'..');
(async()=>{
  const profile=await fs.mkdtemp(path.join(root,'.transfer','smoke-run-'));
  const context=await chromium.launchPersistentContext(profile,{
    executablePath:process.env.RC_CHROME,headless:true,
    args:['--disable-extensions-except='+path.join(root,'extension'),'--load-extension='+path.join(root,'extension')]
  });
  const results=[];
  const check=(name,details)=>{results.push({name,details,status:'passed'});console.log('PASS',name,details||'');};
  try{
    const sw=context.serviceWorkers()[0]||await context.waitForEvent('serviceworker',{timeout:20000});
    await sw.evaluate(()=>chrome.storage.local.clear());
    const id=new URL(sw.url()).host;
    await sw.evaluate(()=>ensureOffscreen());
    const cdp=await context.browser().newBrowserCDPSession();
    const targets=await cdp.send('Target.getTargets');
    const offscreenTarget=targets.targetInfos.find(t=>t.url.endsWith('/offscreen.html'));
    assert.ok(offscreenTarget);
    const attached=await cdp.send('Target.attachToTarget',{targetId:offscreenTarget.targetId,flatten:false});
    let cdpId=0;
    const evaluateOffscreen=expression=>new Promise(async(resolve,reject)=>{
      const id=++cdpId;
      const receive=m=>{if(m.sessionId!==attached.sessionId)return;const data=JSON.parse(m.message);if(data.id!==id)return;cdp.off('Target.receivedMessageFromTarget',receive);data.error?reject(Error(data.error.message)):resolve(data.result);};
      cdp.on('Target.receivedMessageFromTarget',receive);
      await cdp.send('Target.sendMessageToTarget',{sessionId:attached.sessionId,message:JSON.stringify({id,method:'Runtime.evaluate',params:{expression,awaitPromise:true,returnByValue:true}})});
    });
    const blank=await context.newPage();
    await blank.goto('about:blank');
    const png=Buffer.from(await blank.evaluate(()=>{
      const c=document.createElement('canvas');c.width=1000;c.height=300;
      const x=c.getContext('2d');x.fillStyle='white';x.fillRect(0,0,c.width,c.height);x.fillStyle='black';x.font='32px Arial';
      x.fillText('Ultimate RC tools extension test',30,65);x.fillText('Hello world. Vietnamese and English OCR.',30,120);
      x.fillText('Multiple workers preserve the original features.',30,180);x.fillText('The answer is forty two.',30,240);
      return c.toDataURL().split(',')[1];
    }),'base64');
    await blank.close();
    // Offscreen targets are not Playwright pages, so context.route does not reach them.
    await evaluateOffscreen(`globalThis.fetch=((original)=> (input,options)=>String(input).startsWith('https://cdn-lab.fpt.edu.vn/') ? Promise.resolve(new Response(Uint8Array.from(atob(${JSON.stringify(png.toString('base64'))}),c=>c.charCodeAt(0)),{headers:{'content-type':'image/png'}})) : original(input,options))(globalThis.fetch)`);
    await evaluateOffscreen(`(async()=>{
      const bmp=await createImageBitmap(await (await fetch('https://cdn-lab.fpt.edu.vn/fixture')).blob());
      const c=document.createElement('canvas');c.width=bmp.width;c.height=bmp.height;const x=c.getContext('2d');x.drawImage(bmp,0,0);bmp.close();x.fillStyle='white';x.fillRect(0,0,60,80);x.fillStyle='black';x.font='32px Arial';x.fillText('A',4,65);
      const fresh=await new Promise(r=>c.toBlob(r,'image/png')),original=globalThis.fetch;
      globalThis.fetch=(input,options)=>String(input).includes('?fresh=1')?Promise.resolve(new Response(fresh)):original(input,options);
    })()`);
    // Playwright routing does not intercept this service worker's own fetches.
    // Mock only its network boundary; the real chunking/message bridge is exercised.
    await sw.evaluate(base64=>{
      const originalFetch=globalThis.fetch;
      globalThis.fetch=(input,options)=>{
        if(String(input).startsWith('https://cdn-lab.fpt.edu.vn/')){
          const s=atob(base64),bytes=Uint8Array.from(s,c=>c.charCodeAt(0));
          return Promise.resolve(new Response(bytes,{headers:{'content-type':'image/png'}}));
        }
        return originalFetch(input,options);
      };
    },png.toString('base64'));
    await context.route('https://cdn-lab.fpt.edu.vn/**',r=>r.fulfill({contentType:'image/png',body:png}));
    const html=`<!doctype html><html><head><meta charset="utf-8"></head><body>
      <div class="chat-overlay"><div class="chat-popup"><div class="chat-window"><div class="chat-messages">
      <div class="message-container message-assistant"><div data-testid="chat-canvas-container"><canvas></canvas></div></div></div>
      <div class="w-chat-input"><textarea class="w-md-editor-text-input"></textarea><button class="w-send-btn">Send</button><math-field></math-field></div>
      </div></div></div>
      <script nonce="fixture">window.sends=0;document.querySelector('.w-send-btn').onclick=()=>window.sends++;
      window.blockedPaste=0;window.addEventListener('paste',()=>window.blockedPaste++,true);</script></body></html>`;
    await context.route('https://fsc-edunext.fpt.edu.vn/**',r=>r.fulfill({contentType:'text/html',body:html,headers:{
      'Content-Security-Policy':"default-src 'self'; script-src 'nonce-fixture'; style-src 'self'; img-src 'self' data: https://cdn-lab.fpt.edu.vn; media-src blob: data:; connect-src 'self'; worker-src 'none'"
    }}));
    const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto('https://fsc-edunext.fpt.edu.vn/rc-extension-test');
    await page.locator('#rc-kit #gear').waitFor();
    await page.locator('#rc-kit #gear').click();
    assert.equal(await page.locator('#rc-kit .tab').count(),4);
    assert.equal(await page.locator('#rc-kit [data-k]').count(),30);
    await page.screenshot({path:path.join(root,'.transfer','gui.png'),animations:'disabled'});
    check('Original three-tab GUI loads with strict page CSP');
    await page.locator('#rc-kit [data-pre="1"]').click();
    await page.evaluate(()=>RC.flush());
    assert.equal(await page.locator('body').evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(11, 17, 32)');
    await page.reload();await page.locator('#rc-kit #gear').waitFor();
    assert.equal(await page.evaluate(()=>GM_getValue('chatKit').primary),'#6366f1');
    check('Theme applied under CSP and persisted across reload');
    const input=page.locator('textarea');await input.fill('hello');await input.press('Enter');
    assert.equal(await page.evaluate(()=>sends),1);
    await input.press('Shift+Enter');assert.equal(await page.evaluate(()=>sends),1);
    await page.evaluate(()=>{const m=document.querySelector('math-field');m.value='x+1';m.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}));});
    assert.equal(await page.evaluate(()=>sends),2);
    await page.evaluate(()=>document.querySelector('textarea').dispatchEvent(new Event('paste',{bubbles:true})));
    assert.equal(await page.evaluate(()=>blockedPaste),0);
    check('Enter sends; Shift+Enter does not; early paste guard works');
    await page.locator('#rc-kit #gear').click();await page.locator('#rc-kit [data-tab="ocr"]').click();
    await page.locator('#rc-kit [data-k="ocrThreads"]').selectOption('2');
    // Keep LaTeX extraction enabled; the mocked React fiber contains the exact source.
    const url='https://cdn-lab.fpt.edu.vn/chats-artifacts/chat-canvas/chat-assistant:test-one:part-0.png';
    await page.evaluate(async url=>{
      const container=document.querySelector('[data-testid="chat-canvas-container"]');
      container.__reactFiber$fixture={memoizedProps:{canvas:{url},content:'Exact formula: \\frac{1}{2} + \\sqrt{4}'}};
      const im=new Image();im.src=url;await im.decode();document.querySelector('canvas').getContext('2d').drawImage(im,0,0);
    },url);
    await page.locator('#rc-kit #pill').click();
    await page.locator('.rc-ocr-text').waitFor({timeout:150000});
    assert.match(await page.locator('.rc-ocr-body').innerText(),/\\frac/);
    assert.equal(await page.locator('.rc-ocr-text').getAttribute('data-src'),'latex');
    assert.ok(!context.pages().some(p=>p.url().includes('/ocr.html')),'No OCR tab opened');
    const info=await page.evaluate(()=>GM_getValue('rc_ocr_hub_info'));
    assert.equal(await page.evaluate(()=>GM_getValue('rc_ocr_status').backend),'rust');
    const paletteBackend=await page.evaluate(async()=>{await RC.palette(new Uint8ClampedArray([255,0,0,255]));return RC.paletteBackend;});
    assert.equal(paletteBackend,'rust');check('Rust WASM is used for OCR pixels and background color palette');
    assert.match(info,/2 /);check('Real bundled WASM OCR, two workers, React LaTeX recovery',info);
    const downloaded=await page.evaluate(url=>new Promise((resolve,reject)=>GM_xmlhttpRequest({url,responseType:'blob',onload:r=>resolve({status:r.status,size:r.response.size,type:r.response.type}),onerror:reject})),url);
    assert.equal(downloaded.status,200);assert.equal(downloaded.size,png.length);check('Cross-origin media bridge preserves binary image data');
    await page.locator('#rc-kit #rk-close').click();
    await page.locator('[data-a="img"]').click();assert.equal(await page.locator('[data-rc-hidden]').getAttribute('data-rc-hidden'),'0');
    await page.locator('[data-a="img"]').click();
    await context.grantPermissions(['clipboard-read'],{origin:'https://fsc-edunext.fpt.edu.vn'});
    await page.locator('[data-a="copy"]').click();
    await page.waitForFunction(async()=> (await navigator.clipboard.readText()).includes('\\frac'));
    check('Original-image toggle and actual clipboard contents');
    await page.locator('#rc-kit #gear').click();
    await page.locator('#rc-kit #rk-hubclose').click();
    await page.waitForFunction(()=>GM_getValue('rc_ocr_status').workers===0);
    check('Offscreen workers released without opening tabs');
    // Exercise the no-hub fallback with the same real image and packaged models.
    await page.locator('#rc-kit [data-tg="ocrHub"]').click();
    const url2=url.replace('test-one','test-two');
    await page.evaluate(async url=>{
      document.querySelector('.rc-ocr-text')?.remove();
      document.querySelector('[data-testid="chat-canvas-container"]').__reactFiber$fixture={memoizedProps:{canvas:{url}}};
      const im=new Image();im.src=url;await im.decode();document.querySelector('canvas').getContext('2d').drawImage(im,0,0);
    },url2);
    await page.waitForFunction(()=>document.querySelector('.rc-ocr-text')?.dataset.src==='ocr' && /Ultimate RC/i.test(document.querySelector('.rc-ocr-body')?.textContent||''),{},{timeout:150000});
    check('Single-image OCR fallback returns recognized text');
    await require('./v6-features.cjs')({context,page,sw,url,root,check});
    assert.deepEqual(errors,[]);check('No page JavaScript errors');
    await fs.writeFile(path.join(root,'tests/results/TEST-RESULTS.json'),JSON.stringify({browser:context.browser()?.version(),results},null,2));
  }finally{await context.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
