const assert = require('node:assert/strict');
const path = require('node:path');
const {ROOT, launchExtension} = require('./lib/browser.cjs');

(async () => {
  const ctx = await launchExtension('command-window', {viewport:{width:1280, height:900}});
  try {
    await ctx.route('https://fsc-edunext.fpt.edu.vn/**', route => route.fulfill({
      contentType: 'text/html',
      body: '<html><body><div class="chat-messages"></div></body></html>',
    }));
    const page = await ctx.newPage();
    await page.goto('https://fsc-edunext.fpt.edu.vn/command-test');
    await page.locator('#rc-kit #gear').click();
    await page.waitForTimeout(100);

    const command = page.locator('#rc-kit #rc-command-toggle');
    const assistant = page.locator('.rc-answer-host #ai-toggle');
    assert.equal(await command.getAttribute('data-rc-launcher'), '0');
    assert.equal(await assistant.getAttribute('data-rc-launcher'), '1');
    const commandBounds = await command.boundingBox();
    const assistantBounds = await assistant.boundingBox();
    assert.ok(commandBounds && assistantBounds && commandBounds.y < assistantBounds.y, 'command launcher should be above Assistant');

    await command.click();
    assert.equal(await page.locator('#rc-kit #rc-command-panel').getAttribute('hidden'), null);
    assert.equal(await page.locator('#rc-kit #rc-command-input').evaluate(input => input === input.getRootNode().activeElement), true);
    await page.screenshot({path:path.join(ROOT, '.transfer', 'command-window.png'), animations:'disabled'});

    const input = page.locator('#rc-kit #rc-command-input');
    const terminal = page.locator('#rc-kit #rc-command-panel');
    assert.equal(Math.round((await terminal.boundingBox()).width), 340);
    const settingsBounds = await page.locator('#rc-kit #panel').boundingBox();
    const terminalBounds = await terminal.boundingBox();
    assert.ok(Math.abs(terminalBounds.y - settingsBounds.y) < 2);
    assert.ok(Math.abs(terminalBounds.x - settingsBounds.x - settingsBounds.width - 12) < 2);

    await input.fill('help');
    await input.press('Enter');
    const history = page.locator('#rc-kit #rc-command-history');
    assert.match(await history.textContent(), /theme/);
    assert.match(await history.textContent(), /assistant/);

    // Theme help is a real, keyboard-operable palette rather than only a
    // line of usage text. Keep the direct command as the source of truth for
    // the preset values, then compare the visual choice against it below.
    await input.fill('theme pink');
    await input.press('Enter');
    const pinkPresetValues = await page.locator('#rc-kit .sec[data-sec="theme"] input[data-k]').evaluateAll(inputs =>
      Object.fromEntries(inputs.filter(input => ['primary', 'userBubble', 'botBubble', 'pageBg'].includes(input.dataset.k)).map(input => [input.dataset.k, input.value]))
    );
    await input.fill('theme discord');
    await input.press('Enter');

    await input.fill('help theme');
    await input.press('Enter');
    const themeChoices = page.locator('#rc-kit .rc-command-theme-choice');
    assert.equal(await themeChoices.count(), 6, 'help theme should render six palette choices');
    const themeHelp = page.locator('#rc-kit .rc-command-theme-help').last();
    assert.equal(await themeHelp.locator('.rc-command-theme-choice').count(), 6, 'help theme should group six palette choices');
    assert.ok(await themeChoices.first().isVisible(), 'theme palette choices should be visible');
    await page.screenshot({path:path.join(ROOT, '.transfer', 'help-theme.png'), animations:'disabled'});

    const pinkChoice = themeHelp.locator('.rc-command-theme-choice[aria-label*="theme pink"]');
    assert.equal(await pinkChoice.count(), 1, 'theme help should expose a pink choice');
    await pinkChoice.click();
    const clickedPinkValues = await page.locator('#rc-kit .sec[data-sec="theme"] input[data-k]').evaluateAll(inputs =>
      Object.fromEntries(inputs.filter(input => ['primary', 'userBubble', 'botBubble', 'pageBg'].includes(input.dataset.k)).map(input => [input.dataset.k, input.value]))
    );
    assert.deepEqual(clickedPinkValues, pinkPresetValues, 'clicking pink should match theme pink');

    await input.fill('help palette');
    await input.press('Enter');
    assert.equal(await themeChoices.count(), 12, 'help palette should render the same six palette choices');
    const paletteHelp = page.locator('#rc-kit .rc-command-theme-help').last();
    const paletteChoices = paletteHelp.locator('.rc-command-theme-choice');
    assert.equal(await paletteChoices.count(), 6, 'help palette alias should render six palette choices');
    const keyboardPinkChoice = paletteHelp.locator('.rc-command-theme-choice[aria-label*="theme pink"]');
    await keyboardPinkChoice.focus();
    assert.equal(await keyboardPinkChoice.evaluate(button => button === button.getRootNode().activeElement), true, 'palette choices should be keyboard focusable');
    await keyboardPinkChoice.press('Enter');
    const keyboardPinkValues = await page.locator('#rc-kit .sec[data-sec="theme"] input[data-k]').evaluateAll(inputs =>
      Object.fromEntries(inputs.filter(input => ['primary', 'userBubble', 'botBubble', 'pageBg'].includes(input.dataset.k)).map(input => [input.dataset.k, input.value]))
    );
    assert.deepEqual(keyboardPinkValues, pinkPresetValues, 'keyboard pink choice should match theme pink');

    await input.fill('tab text');
    await input.press('Enter');
    assert.equal(await page.locator('#rc-kit [role="tab"][aria-selected="true"]').getAttribute('data-tab'), 'ocr');

    await input.fill('ocr off');
    await input.press('Enter');
    assert.equal(await page.locator('#rc-kit input[data-k="wip"]').isChecked(), false);

    await input.fill('theme dark');
    await input.press('Enter');
    await input.press('ArrowUp');
    assert.equal(await input.inputValue(), 'theme dark', 'ArrowUp should restore the most recent command');

    await input.fill('assistant');
    await input.press('Enter');
    assert.equal(await page.locator('.rc-answer-host #ai-toggle').getAttribute('aria-expanded'), 'true');
    assert.equal(await terminal.isVisible(), true, 'command panel should stay open');
    await input.fill('assistant');
    await input.press('Enter');
    assert.equal(await page.locator('.rc-answer-host #ai-toggle').getAttribute('aria-expanded'), 'true');

    assert.equal(await terminal.isVisible(), true, 'command panel should stay open');
    await input.fill('music');
    await input.press('Enter');
    assert.equal(await page.locator('#rc-kit #rc-music-toggle').getAttribute('aria-expanded'), 'true');
    assert.equal(await terminal.isVisible(), true, 'command panel should stay open');
    await input.fill('music');
    await input.press('Enter');
    assert.equal(await page.locator('#rc-kit #rc-music-toggle').getAttribute('aria-expanded'), 'true');

    assert.equal(await terminal.isVisible(), true, 'command panel should stay open');
    await input.fill('not-a-command');
    await input.press('Enter');
    assert.match(await history.textContent(), /Không nhận ra/);

    await page.locator('#rc-kit .music-heading button').evaluate(button => button.click());
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#rc-kit #rc-command-panel').getAttribute('hidden'), '');
    assert.equal(await command.isVisible(), true);

    await page.locator('#rc-kit #rk-close').click();
    await page.keyboard.press('Alt+K');
    await page.waitForTimeout(100);
    assert.equal(await page.locator('#rc-kit #panel').evaluate(element => element.classList.contains('open')), true, 'Alt+K should open settings first');
    assert.equal(await page.locator('#rc-kit #rc-command-panel').getAttribute('hidden'), null);
    await page.keyboard.press('Escape');

    await page.setViewportSize({width:360, height:640});
    await page.waitForTimeout(100);
    const narrowCommand = await command.boundingBox();
    const narrowAssistant = await assistant.boundingBox();
    assert.ok(narrowCommand && narrowAssistant && narrowCommand.y < narrowAssistant.y, 'narrow launchers should keep Command above Assistant');
    await command.click();
    await input.fill('help theme');
    await input.press('Enter');
    const narrowThemeHelp = page.locator('#rc-kit .rc-command-theme-help').last();
    assert.equal(await narrowThemeHelp.locator('.rc-command-theme-choice').count(), 6, 'narrow theme help should keep all six choices');
    await page.screenshot({path:path.join(ROOT, '.transfer', 'help-theme-narrow.png'), animations:'disabled'});
    const narrowOverflow = await page.locator('#rc-kit #rc-command-panel').evaluate(panelElement => {
      const bodyElement = panelElement.querySelector('.rc-command-body');
      const gridElement = panelElement.querySelector('.rc-command-theme-grid');
      const panelRect = panelElement.getBoundingClientRect();
      return {
        viewport: window.innerWidth,
        pageScrollWidth: document.documentElement.scrollWidth,
        panelRight: panelRect.right,
        bodyOverflow: bodyElement.scrollWidth - bodyElement.clientWidth,
        gridOverflow: gridElement.scrollWidth - gridElement.clientWidth,
      };
    });
    assert.ok(narrowOverflow.pageScrollWidth <= narrowOverflow.viewport + 1, 'narrow picker should not create page horizontal overflow');
    assert.ok(narrowOverflow.panelRight <= narrowOverflow.viewport + 1, 'narrow picker should fit within the viewport');
    assert.ok(narrowOverflow.bodyOverflow <= 1, 'narrow command body should not overflow horizontally');
    assert.ok(narrowOverflow.gridOverflow <= 1, 'narrow theme choices should not overflow horizontally');
    console.log('PASS: command palette registry, visual theme help/alias, preset parity, keyboard access, narrow overflow, and launcher ordering');
  } finally {
    await ctx.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
