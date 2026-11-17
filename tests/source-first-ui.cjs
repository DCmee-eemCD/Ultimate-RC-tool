const path = require('node:path'), assert = require('node:assert/strict');
const {ROOT: root, launchExtension} = require('./lib/browser.cjs');
(async () => {
    const ctx = await launchExtension('source-first');
    try {
        await ctx.route('https://fsc-edunext.fpt.edu.vn/**', r => r.fulfill({contentType: 'text/html', body: '<html><body><div class="chat-messages"></div></body></html>'}));
        const p = await ctx.newPage();
        await p.goto('https://fsc-edunext.fpt.edu.vn/rc-source-test');
        const setting = p.locator('#rc-kit input[data-k="sourceFirst"]');
        const ocr = p.locator('#rc-kit input[data-k="wip"]');
        await p.locator('#rc-kit #gear').click();
        await p.locator('#rc-kit [data-tab="ocr"]').click();
        assert.equal(await setting.isChecked(), true);
        assert.equal(await ocr.isChecked(), false);
        await p.locator('#rc-kit [data-tg="wip"]').click();
        assert.equal(await setting.isChecked(), false);
        await p.locator('#rc-kit [data-tg="sourceFirst"]').click();
        assert.equal(await ocr.isChecked(), false);
        await p.evaluate(() => RC.flush());
        await p.reload();
        await setting.waitFor({state: 'attached'});
        assert.equal(await setting.isChecked(), true);
        assert.equal(await ocr.isChecked(), false);
        await p.locator('#rc-kit #gear').click();
        await p.screenshot({path: path.join(root, '.transfer/source-first-settings.png'), animations: 'disabled'});
        console.log('PASS: default, mutually exclusive modes, persisted settings, extension UI startup.');
    } finally {await ctx.close();}
})().catch(e => {console.error(e); process.exitCode = 1;});
