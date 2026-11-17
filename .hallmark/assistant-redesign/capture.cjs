const fs = require('node:fs');
const path = require('node:path');
const {launchExtension} = require('../../tests/lib/browser.cjs');
const phase = process.argv[2] || 'after';
const dir = path.join(__dirname, phase);
fs.mkdirSync(dir, {recursive:true});
const contrastReport = [];
async function checkContrast(target, selector, mode) {
  const result = await target.locator(selector).evaluate(el => {
    const style = getComputedStyle(el);
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 1;
    const ctx = canvas.getContext('2d', {willReadFrequently:true});
    const luminance = color => {
      ctx.clearRect(0,0,1,1); ctx.fillStyle = color; ctx.fillRect(0,0,1,1);
      const rgb = [...ctx.getImageData(0,0,1,1).data].slice(0,3).map(v => v/255).map(v => v<=.04045?v/12.92:((v+.055)/1.055)**2.4);
      return .2126*rgb[0]+.7152*rgb[1]+.0722*rgb[2];
    };
    const fg = luminance(style.color), bg = luminance(style.backgroundColor);
    return {color:style.color,background:style.backgroundColor,ratio:(Math.max(fg,bg)+.05)/(Math.min(fg,bg)+.05)};
  });
  contrastReport.push({mode,selector,...result});
  if(phase === 'after' && result.ratio < 4.5) throw new Error(mode+' '+selector+' text contrast below 4.5: '+result.ratio);
}
(async () => {
  const context = await launchExtension('assistant-design', {viewport:{width:1280,height:900}});
  try {
    await context.route('https://fsc-edunext.fpt.edu.vn/**', r => r.fulfill({contentType:'text/html; charset=utf-8',body:'<!doctype html><html lang="vi"><body><div class="chat-window"><div class="message-container message-assistant"><div class="exercise-question-block"><p>Câu hỏi: Một vật chuyển động đều với vận tốc 12 m/s. Quãng đường vật đi được trong 5 giây là bao nhiêu?</p><p>A. 24 m</p><p>B. 60 m</p><p>C. 120 m</p></div></div><div class="w-chat-input"><textarea>Bản nháp mẫu</textarea><button type="button" data-intent="SUBMIT_ANSWER">Nộp</button></div></div></body></html>'}));
    const page = await context.newPage();
    await page.goto('https://fsc-edunext.fpt.edu.vn/assistant-design');
    await page.locator('#rc-kit #gear').click();
    const panel = page.locator('.rc-answer-host #ai-panel');
    for (const mode of ['dark','light']) {
      await page.locator('#rc-kit [data-tab="theme"]').click();
      await page.locator('#rc-kit [data-theme-mode="'+mode+'"]').click();
      await page.locator('.rc-answer-host #ai-toggle').click();
      await panel.screenshot({path:path.join(dir,'assistant-'+mode+'.png'),animations:'disabled'});
      await checkContrast(page,'.rc-answer-host #answer',mode);
      await page.locator('.rc-answer-host #settings').click();
      await page.frameLocator('.rc-answer-host #api-frame').locator('#model').waitFor();
      await page.waitForFunction(() => parseFloat(document.querySelector('.rc-answer-host').shadowRoot.querySelector('#api-frame').style.height) > 0);
      await panel.evaluate(e=>e.scrollTop=0);
      await panel.screenshot({path:path.join(dir,'api-'+mode+'.png'),animations:'disabled'});
      await checkContrast(page.frameLocator('.rc-answer-host #api-frame'),'#save',mode);
      await page.locator('.rc-answer-host #settings').click();
      await page.locator('.rc-answer-host #ai-close').click();
    }
    await page.setViewportSize({width:360,height:800});
    await page.locator('.rc-answer-host #ai-toggle').click();
    await panel.screenshot({path:path.join(dir,'assistant-mobile.png'),animations:'disabled'});
    await page.locator('.rc-answer-host #settings').click();
    await panel.evaluate(e=>e.scrollTop=0);
    await page.screenshot({path:path.join(dir,'api-mobile.png'),animations:'disabled'});
    await panel.evaluate(e=>e.scrollTop=e.scrollHeight);
    await page.screenshot({path:path.join(dir,'api-mobile-bottom.png'),animations:'disabled'});
    await page.locator('.rc-answer-host #settings').click();
    await page.locator('.exercise-question-block').evaluate(e=>e.remove());
    await page.locator('.rc-answer-host #refresh-question').click();
    await panel.screenshot({path:path.join(dir,'assistant-empty.png'),animations:'disabled'});
    const worker = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker');
    const standalone = await context.newPage();
    await standalone.goto(new URL('llm-settings.html',worker.url()).href);
    await standalone.locator('#model').waitFor();
    await standalone.screenshot({path:path.join(dir,'api-standalone.png'),fullPage:true,animations:'disabled'});
    await standalone.locator('#save').click();
    await standalone.locator('#model-error').waitFor();
    await standalone.screenshot({path:path.join(dir,'api-error.png'),fullPage:true,animations:'disabled'});
    await checkContrast(standalone,'#save','standalone');
    await page.setViewportSize({width:320,height:640});
    const overflow = await panel.evaluate(e=>e.scrollWidth>e.clientWidth+1);
    if(overflow) throw new Error('Assistant horizontally overflows at 320px');
    fs.writeFileSync(path.join(dir,'contrast.json'),JSON.stringify(contrastReport,null,2));
    console.log('Captured '+phase+' assistant/API in dark, light, mobile, empty and error states.');
  } finally { await context.close(); }
})().catch(e=>{console.error(e);process.exitCode=1});
