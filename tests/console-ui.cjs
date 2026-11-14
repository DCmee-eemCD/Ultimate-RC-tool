const fs = require('node:fs/promises'), path = require('node:path'), assert = require('node:assert/strict');
const {chromium} = require(process.env.RC_PLAYWRIGHT || '../.transfer/package');
(async () => {
    const root = path.resolve(__dirname, '..');
    const profile = await fs.mkdtemp(path.join(root, '.transfer', 'console-ui-'));
    const ctx = await chromium.launchPersistentContext(profile, {headless:true, viewport:{width:1280,height:900},
        executablePath:process.env.RC_CHROME || path.join(root,'.transfer/chrome-win64/chrome.exe'),
        args:['--disable-extensions-except='+path.join(root,'extension'),'--load-extension='+path.join(root,'extension')]});
    try {
        await ctx.route('https://fsc-edunext.fpt.edu.vn/**', r => r.fulfill({contentType:'text/html',body:'<html><body style="background:#e7ecf2"><div class="chat-messages"></div></body></html>'}));
        const p=await ctx.newPage(), errors=[]; p.on('pageerror',e=>errors.push(e.message));
        await p.goto('https://fsc-edunext.fpt.edu.vn/rc-console-test');
        await p.locator('#rc-kit #gear').click();
        const dimensions=()=>p.locator('#rc-kit #panel').evaluate(e=>({width:parseFloat(getComputedStyle(e).width),height:parseFloat(getComputedStyle(e).height)}));
        assert.deepEqual(await dimensions(),{width:380,height:620});
        await p.locator('#rc-kit [data-size-preset="2"]').click();
        assert.deepEqual(await dimensions(),{width:560,height:804});
        await p.evaluate(()=>RC.flush()); await p.reload();await p.locator('#rc-kit #gear').click();
        assert.deepEqual(await dimensions(),{width:560,height:804});
        await p.setViewportSize({width:360,height:640});
        assert.deepEqual(await dimensions(),{width:328,height:544});
        await p.locator('#rc-kit #rc-size-grip').click();
        await p.setViewportSize({width:1280,height:900});
        assert.deepEqual(await dimensions(),{width:560,height:804});
        await p.locator('#rc-kit #rc-size-reset').click();
        assert.deepEqual(await dimensions(),{width:380,height:620});
        const grip=p.locator('#rc-kit #rc-size-grip');
        await grip.focus(); await p.keyboard.press('ArrowRight'); await p.keyboard.press('Shift+ArrowUp');
        assert.deepEqual(await dimensions(),{width:390,height:660});
        await p.keyboard.press('Home');
        const corner=await grip.boundingBox(), start={x:corner.x+14,y:corner.y+14};
        await p.mouse.move(start.x,start.y); await p.mouse.down();
        await p.mouse.move(start.x+100,start.y-70,{steps:5}); await p.mouse.up();
        assert.deepEqual(await dimensions(),{width:480,height:690});
        assert.equal(await p.locator('#rc-kit .console-size-readout').textContent(),'480 × 690');
        await p.evaluate(()=>RC.flush()); await p.reload(); await p.locator('#rc-kit #gear').click();
        assert.deepEqual(await dimensions(),{width:480,height:690});
        const cancelCorner=await grip.boundingBox();
        await p.mouse.move(cancelCorner.x+14,cancelCorner.y+14); await p.mouse.down();
        await p.mouse.move(cancelCorner.x+54,cancelCorner.y-26,{steps:3});
        await p.keyboard.press('Escape'); await p.mouse.up();
        assert.deepEqual(await dimensions(),{width:480,height:690});
        assert.equal(await p.locator('#rc-kit #gear').getAttribute('aria-expanded'),'true');
        await p.mouse.move(cancelCorner.x+14,cancelCorner.y+14); await p.mouse.down();
        await p.mouse.move(cancelCorner.x+54,cancelCorner.y-26,{steps:3});
        await grip.dispatchEvent('pointercancel'); await p.mouse.up();
        assert.deepEqual(await dimensions(),{width:480,height:690});
        assert.equal(await p.locator('#rc-kit #panel').evaluate(e=>e.classList.contains('is-resizing')),false);
        await p.locator('#rc-kit #rc-size-reset').click();
        assert.equal(await p.locator('#rc-kit [data-k="sourceFirst"]').isChecked(),true);
        await p.screenshot({path:path.join(root,'.transfer','console-custom-size.png'),animations:'disabled'});
        const tabs=p.locator('#rc-kit [role="tab"]'), body=p.locator('#rc-kit .body');
        assert.equal(await tabs.count(),4);
        assert.equal(await p.locator('#rc-kit [role="tabpanel"]:visible').count(),1);
        await tabs.nth(0).focus(); await p.keyboard.press('ArrowRight');
        await p.keyboard.press('Enter');
        assert.equal(await tabs.nth(1).getAttribute('aria-selected'),'true');
        await tabs.nth(0).click(); await body.evaluate(e=>e.scrollTop=200);
        const offset=await body.evaluate(e=>e.scrollTop);
        await tabs.nth(2).click(); assert.equal(await body.evaluate(e=>e.scrollTop),0);
        await tabs.nth(0).click(); assert.equal(await body.evaluate(e=>e.scrollTop),offset);
        await body.evaluate(e=>e.scrollTop=0);
        for(const mode of ['dark','light']) {
            await tabs.nth(0).click();
            await p.locator('#rc-kit [data-k="imageThemeMode"]').selectOption(mode);
            for(const key of ['theme','feat','ocr','music']) {
                await p.locator('#rc-kit [data-tab="'+key+'"]').click();
                await body.evaluate(e=>e.scrollTop=0);
                await p.screenshot({path:path.join(root,'.transfer','console-'+mode+'-'+key+'.png'),animations:'disabled'});
            }
        }
        await p.emulateMedia({reducedMotion:'reduce'});
        await tabs.nth(0).click();
        assert.equal(await p.locator('#rc-kit .sec.act').evaluate(e=>getComputedStyle(e).animationName),'none');
        await p.setViewportSize({width:360,height:640});
        const bounds=await p.locator('#rc-kit #panel').boundingBox();
        assert.ok(bounds.x>=0 && bounds.x+bounds.width<=360 && bounds.y>=0 && bounds.y+bounds.height<=640);
        const selected=await tabs.nth(0).boundingBox(), strip=await p.locator('#rc-kit .tabs').boundingBox();
        assert.ok(selected.x >= strip.x && selected.x+selected.width <= strip.x+strip.width);
        await p.screenshot({path:path.join(root,'.transfer','console-mobile.png'),animations:'disabled'});
        await p.locator('#rc-kit [data-k="consolePrimary"]').fill('#3366ff');
        await p.locator('#rc-kit [data-k="consoleSecondary"]').fill('#9955dd');
        await p.evaluate(()=>RC.flush()); await p.reload();
        await p.locator('#rc-kit #gear').click();
        assert.equal(await p.locator('#rc-kit [data-k="consolePrimary"]').inputValue(),'#3366ff');
        assert.equal(await p.locator('#rc-kit [data-k="consoleSecondary"]').inputValue(),'#9955dd');
        await p.keyboard.press('Escape');
        assert.equal(await p.locator('#rc-kit #gear').getAttribute('aria-expanded'),'false');
        assert.deepEqual(errors,[]);
        console.log('PASS: size presets, pointer drag/cancel, Escape rollback, keyboard resize, saved dimensions, viewport clamping, size-only reset, keyboard tabs, scroll, themes, reduced motion, mobile bounds, saved accents, Escape focus.');
    } finally {await ctx.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
