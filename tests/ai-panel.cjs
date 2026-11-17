const path = require('node:path');
const assert = require('node:assert/strict');
const {launchExtension, TRANSFER} = require('./lib/browser.cjs');

const BOT_PATHS = ['M12 8V4H8', 'M2 14h2', 'M20 14h2', 'M15 13v2', 'M9 13v2'];
const THEME_TOKENS = ['--bg', '--fg', '--surface', '--line', '--acc', '--secondary', '--mut'];
const fixture = '<!doctype html><html><body><div class="w-chat-input"><textarea></textarea></div></body></html>';

function assertInViewport(box, viewport, label) {
  assert.ok(box, `${label} should have a box`);
  assert.ok(box.x >= -0.5, `${label} should stay inside the left edge`);
  assert.ok(box.y >= -0.5, `${label} should stay inside the top edge`);
  assert.ok(box.x + box.width <= viewport.width + 0.5, `${label} should stay inside the right edge`);
  assert.ok(box.y + box.height <= viewport.height + 0.5, `${label} should stay inside the bottom edge`);
}

async function readThemeTokens(page) {
  return page.evaluate(tokens => {
    const main = document.querySelector('#rc-kit')?.shadowRoot?.querySelector('.w');
    const ai = document.querySelector('.rc-answer-host')?.shadowRoot?.querySelector('.w');
    const read = node => Object.fromEntries(tokens.map(name => [name, node ? getComputedStyle(node).getPropertyValue(name).trim() : '']));
    return {main: read(main), ai: read(ai)};
  }, THEME_TOKENS);
}

async function assertVisibleBounds(locator, viewport, label) {
  await locator.waitFor({state: 'visible'});
  assertInViewport(await locator.boundingBox(), viewport, label);
}

(async () => {
  const context = await launchExtension('ai-panel', {viewport: {width: 1280, height: 900}});
  try {
    await context.route('https://fsc-edunext.fpt.edu.vn/**', route => route.fulfill({
      contentType: 'text/html; charset=utf-8',
      body: fixture,
    }));
    const page = await context.newPage();
    await page.goto('https://fsc-edunext.fpt.edu.vn/rc-ai-panel');

    const host = page.locator('.rc-answer-host');
    const gear = page.locator('#rc-kit #gear');
    const mainPanel = page.locator('#rc-kit #panel');
    const toggle = host.locator('#ai-toggle');
    const aiPanel = host.locator('#ai-panel');
    const close = host.locator('#ai-close');

    await host.waitFor({state: 'attached'});
    await gear.waitFor({state: 'visible'});
    assert.equal(await aiPanel.isHidden(), true, 'AI panel should start closed');

    await gear.click();
    await mainPanel.waitFor({state: 'visible'});
    await toggle.waitFor({state: 'visible'});
    assert.deepEqual(
      await toggle.locator('svg path').evaluateAll(nodes => nodes.map(node => node.getAttribute('d'))),
      BOT_PATHS,
      'AI toggle should use the bot icon paths',
    );

    await toggle.click();
    await aiPanel.waitFor({state: 'visible'});
    await mainPanel.evaluate(e => Promise.allSettled(e.getAnimations().map(a => a.finished)));
    await aiPanel.evaluate(e => Promise.allSettled(e.getAnimations().map(a => a.finished)));
    const mainDesktop = await mainPanel.boundingBox();
    const aiDesktop = await aiPanel.boundingBox();
    assert.ok(mainDesktop && aiDesktop, 'desktop panels should have boxes');
    assert.ok(Math.abs(aiDesktop.x - (mainDesktop.x + mainDesktop.width + 12)) < 2, 'AI panel should sit 12px to the right of the main panel');
    assert.ok(Math.abs(aiDesktop.y - mainDesktop.y) < 2, 'AI panel should align to the main panel top');
    await page.screenshot({path: path.join(TRANSFER, 'ai-panel-desktop.png'), animations: 'disabled'});

    await page.keyboard.press('Escape');
    await aiPanel.waitFor({state:'hidden'});
    assert.equal(await aiPanel.isHidden(), true, 'Escape should close only the AI panel');
    assert.equal(await mainPanel.isVisible(), true, 'Escape should leave the main console open');

    await toggle.click();
    await aiPanel.waitFor({state: 'visible'});
    await close.click();
    await page.waitForFunction(() => {
      const host = document.querySelector('.rc-answer-host');
      return host?.shadowRoot?.activeElement?.id === 'ai-toggle';
    });
    await aiPanel.waitFor({state:'hidden'});
    assert.equal(await aiPanel.isHidden(), true, 'close should hide the AI panel');

    await toggle.click();
    await aiPanel.waitFor({state: 'visible'});
    await gear.click();
    await mainPanel.waitFor({state: 'hidden'});
    await page.waitForFunction(() => {
      const root = document.querySelector('.rc-answer-host')?.shadowRoot;
      return root?.querySelector('#ai-toggle')?.hidden && root?.querySelector('#ai-panel')?.hidden;
    });
    assert.equal(await toggle.isHidden(), true, 'main console close should hide the AI toggle');
    await aiPanel.waitFor({state:'hidden'});
    assert.equal(await aiPanel.isHidden(), true, 'main console close should hide the AI panel');

    await gear.click();
    await mainPanel.waitFor({state: 'visible'});
    await toggle.waitFor({state: 'visible'});
    await toggle.click();
    await aiPanel.waitFor({state: 'visible'});
    for (const mode of ['dark', 'light']) {
      await page.locator(`#rc-kit [data-theme-mode="${mode}"]`).click();
      const colors = await readThemeTokens(page);
      assert.deepEqual(colors.ai, colors.main, `${mode} theme tokens should track the main console`);
    }

    await page.setViewportSize({width: 360, height: 640});
    await page.waitForFunction(() => document.querySelector('.rc-answer-host')?.shadowRoot?.querySelector('#ai-panel')?.getBoundingClientRect().width > 0);
    const mobileViewport = {width: 360, height: 640};
    await assertVisibleBounds(aiPanel, mobileViewport, 'mobile AI panel');
    await assertVisibleBounds(close, mobileViewport, 'mobile close control');
    await assertVisibleBounds(host.locator('#answer'), mobileViewport, 'mobile answer control');
    await assertVisibleBounds(host.locator('#settings'), mobileViewport, 'mobile settings control');
    await close.click();
    await assertVisibleBounds(toggle, mobileViewport, 'mobile AI toggle');
    await toggle.click();
    await aiPanel.waitFor({state: 'visible'});
    await page.screenshot({path: path.join(TRANSFER, 'ai-panel-mobile.png'), animations: 'disabled'});

    console.log('PASS: AI panel icon, desktop placement, Escape/focus behavior, main-console visibility, theme tokens, and mobile bounds.');
  } finally {
    await context.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
