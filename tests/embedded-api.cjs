const assert = require('node:assert/strict');
const {launchExtension, TRANSFER} = require('./lib/browser.cjs');
const path = require('node:path');
(async () => {
  const context = await launchExtension('embedded-api');
  try {
    await context.route('https://fsc-edunext.fpt.edu.vn/**', r => r.fulfill({contentType:'text/html',body:'<body><div class="chat-messages"></div></body>'}));
    const page = await context.newPage();
    await page.setViewportSize({width:1000,height:600});
    await page.goto('https://fsc-edunext.fpt.edu.vn/rc-embedded-api');
    await page.locator('#rc-kit #gear').click();
    await page.locator('.rc-answer-host #ai-toggle').click();
    const panel = page.locator('.rc-answer-host #ai-panel');
    assert.equal(await panel.evaluate(e => getComputedStyle(e).transitionDuration), '0.18s');
    await panel.evaluate(e => Promise.allSettled(e.getAnimations().map(a => a.finished)));
    await page.locator('.rc-answer-host #settings').click();
    assert.equal(await panel.evaluate(e => getComputedStyle(e).scrollbarWidth), 'thin');
    assert.notEqual(await panel.evaluate(e => getComputedStyle(e).scrollbarColor), 'auto');
    const frame = page.frameLocator('.rc-answer-host #api-frame');
    await frame.locator('#model').waitFor();
    await panel.evaluate(e => { e.scrollTop = 0; });
    const panelBox = await panel.boundingBox();
    assert.ok(await panel.evaluate(e => e.scrollHeight > e.clientHeight), 'fixture must overflow');
    await page.mouse.move(panelBox.x + panelBox.width / 2, panelBox.y + panelBox.height / 2);
    await page.mouse.wheel(0, 300);
    await page.waitForFunction(() =>
      document.querySelector('.rc-answer-host').shadowRoot.querySelector('#ai-panel').scrollTop > 0,
      null, {timeout:3000});
    await frame.locator('#model').fill('fixture-model');
    await frame.locator('#key').fill('fixture-key');
    await frame.locator('#save').click();
    await frame.locator('#key-status[data-state="saved"]').waitFor();
    assert.equal(await frame.locator('#key').inputValue(), '');
    assert.equal(await page.locator('.rc-answer-host #api-frame').evaluate(e => e.contentDocument), null);
    await frame.locator('#clear-key').click();
    await frame.locator('#key-status[data-state="empty"]').waitFor();
    await page.screenshot({path:path.join(TRANSFER,'embedded-api.png'),animations:'disabled'});
    await page.setViewportSize({width:360,height:800});
    await page.waitForFunction(() => {
      const frame = document.querySelector('.rc-answer-host')?.shadowRoot?.querySelector('#api-frame');
      return frame && parseFloat(frame.style.height) > 0;
    }, null, {timeout:3000});
    assert.equal(await frame.locator('html').evaluate(e => e.scrollHeight <= e.clientHeight + 1), true,
      'embedded API form must fit its frame instead of creating a second scroll area');
    await page.screenshot({path:path.join(TRANSFER,'embedded-api-mobile.png'),animations:'disabled'});
    const box = await panel.boundingBox(); assert.ok(box.x >= 0 && box.x + box.width <= 360);
    await page.emulateMedia({reducedMotion:'reduce'});
    await panel.evaluate(e => Promise.allSettled(e.getAnimations().map(a => a.finished)));
    assert.equal(await panel.evaluate(e => getComputedStyle(e).transitionDuration), '0.06s');
    assert.equal(await panel.evaluate(e => getComputedStyle(e).transform), 'none');
    console.log('PASS embedded API save/delete, origin isolation, mobile bounds and reduced motion.');
  } finally { await context.close(); }
})().catch(e => {console.error(e);process.exitCode=1;});
