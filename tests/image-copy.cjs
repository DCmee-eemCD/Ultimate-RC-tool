const assert = require('node:assert/strict');
const {launchExtension} = require('./lib/browser.cjs');

(async () => {
  const context = await launchExtension('image-copy');
  try {
    await context.route('https://images.example/**', route => route.fulfill({
      contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="120" height="60"><rect width="120" height="60" fill="red"/></svg>',
    }));
    await context.route('https://fsc-edunext.fpt.edu.vn/**', route => route.fulfill({
      contentType: 'text/html', body: `<!doctype html><body>
        <div data-testid="chat-canvas-zoom-target" style="position:relative;width:240px">
          <canvas data-testid="chat-canvas-message" width="120" height="60" style="display:block;width:240px;height:120px"></canvas>
        </div><script>
        window.zoomClicks=0;
        const c=document.querySelector('canvas');
        c.onclick=()=>window.zoomClicks++;
        c.oncontextmenu=e=>e.preventDefault();
        const img=new Image(); img.onload=()=>{c.getContext('2d').drawImage(img,0,0);window.drawn=true};
        img.src='https://images.example/answer.svg';
        </script>`,
    }));
    const page = await context.newPage();
    await page.goto('https://fsc-edunext.fpt.edu.vn/image-copy-test');
    await page.waitForFunction(() => window.drawn && document.querySelector('#rc-kit'));
    assert.equal(await page.evaluate(() => {
      try {document.querySelector('canvas').toDataURL(); return false;} catch(e) {return e.name === 'SecurityError';}
    }), true, 'fixture must reproduce a cross-origin canvas that cannot be copied');
    const box = await page.locator('canvas').boundingBox();
    await page.mouse.move(box.x + 50, box.y + 30);
    await page.waitForFunction(() => document.querySelector('[data-rc-copy-image]')?.complete);
    const hit = await page.evaluate(() => {
      const r=document.querySelector('canvas').getBoundingClientRect();
      const el=document.elementFromPoint(r.x+50,r.y+30);
      return {tag:el.tagName,src:el.getAttribute('src'),allowed:el.dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,cancelable:true,button:2}))};
    });
    assert.equal(hit.tag, 'IMG', 'right-click must target the original image, not the tainted canvas');
    assert.equal(hit.src, 'https://images.example/answer.svg');
    assert.equal(hit.allowed, true, 'native image menu must not be cancelled');
    await page.mouse.click(box.x + 50, box.y + 30);
    assert.equal(await page.evaluate(() => window.zoomClicks), 1, 'left-click must still open the site zoom');
    await page.mouse.move(400,300);
    assert.equal(await page.locator('[data-rc-copy-image]').count(), 0, 'temporary image must leave with the pointer');
    // Images drawn after the storage handshake use the later app hook.
    await page.evaluate(async () => {
      const img=new Image(); img.src='https://images.example/second.svg'; await img.decode();
      document.querySelector('canvas').getContext('2d').drawImage(img,0,0);
    });
    await page.mouse.move(box.x+50,box.y+30);
    assert.equal(await page.locator('[data-rc-copy-image]').getAttribute('src'), 'https://images.example/second.svg');
    await page.evaluate(async () => {GM_setValue('chatKit',{...GM_getValue('chatKit',{}),antiCopy:false});await RC.flush();});
    await page.reload();
    await page.waitForFunction(() => window.drawn && document.querySelector('#rc-kit'));
    await page.mouse.move(400,300);
    await page.mouse.move(box.x+50,box.y+30);
    assert.equal(await page.locator('[data-rc-copy-image]').count(),0,'disabled bypass must not add an image');
    assert.equal(await page.locator('canvas').evaluate(c=>c.dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,cancelable:true}))),false,'disabled bypass must preserve site blocking');
    console.log('Image copy: tainted canvas, native image target, zoom and cleanup passed.');
  } finally {await context.close();}
})().catch(e => {console.error(e);process.exitCode=1;});
