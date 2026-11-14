const fs = require('node:fs/promises'), path = require('node:path'), assert = require('node:assert/strict');
const {chromium} = require(process.env.RC_PLAYWRIGHT || '../.transfer/package');
(async () => {
    const root = path.resolve(__dirname, '..');
    const profile = await fs.mkdtemp(path.join(root, '.transfer', 'source-first-'));
    const ctx = await chromium.launchPersistentContext(profile, {headless: true,
        executablePath: process.env.RC_CHROME || path.join(root, '.transfer/chrome-win64/chrome.exe'),
        args: ['--disable-extensions-except=' + path.join(root, 'extension'), '--load-extension=' + path.join(root, 'extension')]});
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
