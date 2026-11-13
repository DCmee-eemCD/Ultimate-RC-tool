const fs=require('node:fs/promises');
const path=require('node:path');
const https=require('node:https');
const assert=require('node:assert/strict');
const {chromium}=require(process.env.RC_PLAYWRIGHT||'playwright');
const forge=require(process.env.RC_FORGE||'node-forge');
const root=path.resolve(__dirname,'..');
(async()=>{
  const keys=forge.pki.rsa.generateKeyPair(2048),cert=forge.pki.createCertificate();
  cert.publicKey=keys.publicKey;cert.serialNumber='01';cert.validity.notBefore=new Date();
  cert.validity.notAfter=new Date(Date.now()+86400000);
  const attrs=[{name:'commonName',value:'fsc-edunext.fpt.edu.vn'}];cert.setSubject(attrs);cert.setIssuer(attrs);
  cert.sign(keys.privateKey,forge.md.sha256.create());
  let video;
  const html='<!doctype html><html><head><meta charset="utf-8"></head><body><div class="chat-overlay"><div class="chat-popup"><div class="chat-window"><div class="chat-messages"></div></div></div></div></body></html>';
  const server=https.createServer({key:forge.pki.privateKeyToPem(keys.privateKey),cert:forge.pki.certificateToPem(cert)},(req,res)=>{
    if(req.url==='/wallpaper.webm'){res.writeHead(200,{'content-type':'video/webm'});return res.end(video);}
    res.writeHead(200,{'content-type':'text/html','cache-control':'no-store',
      'content-security-policy':"default-src 'self'; media-src 'none'; script-src 'self'; style-src 'self'",
      'content-security-policy-report-only':"media-src 'none'"});res.end(html);
  });
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const port=server.address().port;
  const profile=await fs.mkdtemp(path.join(root,'.transfer','video-run-'));
  const context=await chromium.launchPersistentContext(profile,{
    executablePath:process.env.RC_CHROME,headless:true,ignoreHTTPSErrors:true,
    args:['--disable-extensions-except='+path.join(root,'extension'),'--load-extension='+path.join(root,'extension'),
      '--ignore-certificate-errors','--no-proxy-server','--host-resolver-rules=MAP fsc-edunext.fpt.edu.vn 127.0.0.1:'+port+', MAP other.invalid 127.0.0.1:'+port]
  });
  const results=[];const pass=name=>{results.push({name,status:'passed'});console.log('PASS',name);};
  try{
    const sw=context.serviceWorkers()[0]||await context.waitForEvent('serviceworker');
    await sw.evaluate(()=>chrome.storage.local.clear());
    const page=await context.newPage();page.setDefaultTimeout(20000);await page.goto('about:blank');
    video=await fs.readFile(path.join(__dirname,'fixtures','wallpaper.webm'));
    await sw.evaluate(()=>chrome.declarativeNetRequest.updateEnabledRulesets({disableRulesetIds:['edunext_csp']}));
    await page.goto('https://fsc-edunext.fpt.edu.vn/video-test');
    await page.evaluate(bytes=>{
      window.mediaBlocked=false;document.addEventListener('securitypolicyviolation',e=>{if(e.effectiveDirective==='media-src')window.mediaBlocked=true;});
      const v=document.createElement('video');v.muted=true;v.src=URL.createObjectURL(new Blob([new Uint8Array(bytes)],{type:'video/webm'}));document.body.append(v);v.play().catch(()=>{});
    },Array.from(video));
    await page.waitForFunction(()=>window.mediaBlocked);pass('Baseline: media-src none blocks blob video without rule');
    await sw.evaluate(()=>chrome.declarativeNetRequest.updateEnabledRulesets({enableRulesetIds:['edunext_csp']}));
    const response=await page.reload();
    assert.ok((await sw.evaluate(()=>chrome.declarativeNetRequest.getEnabledRulesets())).includes('edunext_csp'));
    // DevTools can expose the original response headers before DNR modifications.
    // Check the browser's actual enforcement and reporting behavior instead.
    const policyProbe=await page.evaluate(async bytes=>{
      const violations=[];const listener=e=>{if(e.effectiveDirective==='media-src')violations.push(e.disposition);};
      document.addEventListener('securitypolicyviolation',listener);
      const v=document.createElement('video');v.muted=true;
      const outcome=new Promise(r=>{v.onloadeddata=()=>r('loaded');v.onerror=()=>r('blocked');});
      v.src=URL.createObjectURL(new Blob([new Uint8Array(bytes)],{type:'video/webm'}));document.body.append(v);
      const state=await outcome;const error=v.error&&{code:v.error.code,message:v.error.message};v.remove();document.removeEventListener('securitypolicyviolation',listener);
      return {state,violations,error};
    },Array.from(video));
    console.log('Media probe',JSON.stringify(policyProbe),'bytes',video.length);
    assert.equal(policyProbe.state,'loaded');assert.deepEqual(policyProbe.violations,[]);
    pass('Real HTTPS response: CSP enforcement and report-only no longer block/report media');
    await page.locator('#rc-kit #gear').click();
    await page.locator('#rc-kit #file').setInputFiles({name:'wallpaper.webm',mimeType:'video/webm',buffer:video});
    await page.waitForFunction(()=>{const v=document.querySelector('.chat-popup > video.rc-bgvid');return v&&!v.paused&&v.currentTime>0.1&&v.videoWidth===320;});
    assert.deepEqual(await page.locator('video.rc-bgvid').evaluate(v=>[v.muted,v.loop,v.autoplay,v.playsInline]),[true,true,true,true]);
    pass('Local uploaded wallpaper plays in normal chat mode');
    await page.locator('#rc-kit [data-tg="glass"]').click();
    await page.waitForFunction(()=>{const v=document.querySelector('.chat-overlay > video.rc-bgvid');return v&&!v.paused&&v.currentTime>0.1;});
    assert.equal(await page.locator('video.rc-bgvid').count(),1);pass('Glass mode moves the same playing video to overlay');
    await page.evaluate(()=>RC.flush());await page.reload();
    await page.waitForFunction(()=>{const v=document.querySelector('.chat-overlay > video.rc-bgvid');return v&&!v.paused&&v.currentTime>0.1;});
    pass('Uploaded wallpaper and glass setting survive reload');
    await page.locator('#rc-kit #gear').click();
    const oldVideoUrl=await page.locator('video.rc-bgvid').getAttribute('src');
    await page.locator('#rc-kit input[data-k="bgImage"]').fill('https://fsc-edunext.fpt.edu.vn/wallpaper.webm');
    await page.waitForFunction(old=>{const v=document.querySelector('video.rc-bgvid');return v&&v.src!==old&&!v.paused&&v.currentTime>0.1&&GM_getValue('chatKit').bgImage.endsWith('/wallpaper.webm');},oldVideoUrl);
    pass('URL wallpaper download plays through existing media bridge');
    const other=await context.newPage();const otherResponse=await other.goto('https://other.invalid/check');
    assert.ok((await otherResponse.allHeaders())['content-security-policy']);pass('Unrelated host keeps its CSP header');
    const childHeaders=await page.evaluate(async()=>{
      const frame=document.createElement('iframe');frame.src='/child';document.body.append(frame);
      await new Promise(r=>frame.onload=r);return new Promise(resolve=>{
        const v=frame.contentDocument.createElement('video');v.muted=true;v.src='/wallpaper.webm';frame.contentDocument.body.append(v);
        v.onloadeddata=()=>resolve(v.videoWidth);v.onerror=()=>resolve(0);
      });
    });assert.equal(childHeaders,320);pass('EduNext sub-frame media is also unblocked');
    const manifest=JSON.parse(await fs.readFile(path.join(root,'extension','manifest.json'),'utf8'));
    // A cached poster correctly skips auto-theme after reload; explicitly refresh it.
    await page.locator('#rc-kit #rk-pal').click();
    await page.waitForFunction(()=>RC.paletteBackend==='rust');pass('Video background color matching uses Rust palette');
    await fs.writeFile(path.join(root,'VIDEO-TEST-RESULTS.json'),JSON.stringify({version:manifest.version,browser:context.browser()?.version(),results},null,2));
  }finally{await context.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
