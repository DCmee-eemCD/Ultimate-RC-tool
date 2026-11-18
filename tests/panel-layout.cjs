const assert = require('node:assert/strict');
const {launchExtension} = require('./lib/browser.cjs');
(async () => {
  const ctx = await launchExtension('panel-motion', {viewport:{width:1440,height:900}});
  try {
    await ctx.route('https://fsc-edunext.fpt.edu.vn/**', r => r.fulfill({contentType:'text/html',body:'<html><body><div class="chat-messages"></div></body></html>'}));
    const page = await ctx.newPage();
    await page.goto('https://fsc-edunext.fpt.edu.vn/test');
    await page.locator('#rc-kit #gear').click();
    await page.waitForTimeout(300);
    await page.locator('#rc-kit #rc-music-toggle').click();
    await page.locator('.rc-answer-host #ai-toggle').click();
    await page.waitForTimeout(250);
    const assistant = page.locator('.rc-answer-host #ai-panel');
    const before = await assistant.boundingBox();
    await page.locator('#rc-kit .music-heading button').evaluate(e => e.click());
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const during = await assistant.boundingBox();
    assert.ok(during.x > before.x - 330 && during.x <= before.x, 'closing a column should move the remaining panel smoothly, not snap');
    await page.waitForTimeout(250);
    const after = await assistant.boundingBox();
    assert.equal(after.x, before.x - 352);
    await page.emulateMedia({reducedMotion:'reduce'});
    await page.locator('#rc-kit #rc-music-toggle').click();
    await page.waitForTimeout(50);
    const music = page.locator('#rc-kit #rc-music-settings');
    assert.equal((await music.boundingBox()).x, after.x + after.width + 12);
    await page.locator('.rc-answer-host #ai-close').click();
    await page.waitForTimeout(50);
    assert.equal((await music.boundingBox()).x, after.x);
    assert.equal(await music.evaluate(e => e.getAnimations().length), 0);
    console.log('PASS: smooth column compaction, opening order, reduced-motion immediate layout');
  } finally { await ctx.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
