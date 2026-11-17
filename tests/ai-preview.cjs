const assert = require('node:assert/strict');
const path = require('node:path');
const {launchExtension, TRANSFER} = require('./lib/browser.cjs');

const fixture = `<!doctype html>
<html><body>
  <div class="chat-window">
    <div class="message-container message-assistant">
      <div class="exercise-question-block">
        <div>Question:</div>
        <p>Solve <span class="katex"><annotation encoding="application/x-tex">x^2 + 1 = 0</annotation><span class="katex-html" aria-hidden="true">x² + 1 = 0</span></span></p>
        <p>A. x = i</p>
        <p>B. x = -i</p>
      </div>
    </div>
    <div class="w-chat-input">
      <textarea></textarea>
      <button data-intent="SUBMIT_ANSWER" type="button" disabled>Submit</button>
    </div>
  </div>
</body></html>`;

const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
async function waitFor(check, label, timeout = 5000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    if (await check()) return;
    await pause(25);
  }
  throw new Error(`Timed out waiting for ${label}`);
}

(async () => {
  const context = await launchExtension('ai-preview');
  try {
    await context.route('https://fsc-edunext.fpt.edu.vn/**', route => route.fulfill({
      contentType: 'text/html; charset=utf-8',
      body: fixture,
    }));

    // Keep this test hermetic even if a regression accidentally starts answer().
    const worker = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker');
    await worker.evaluate(() => {
      globalThis.__rcPreviewTest = {calls: []};
      globalThis.RCLLM = Object.freeze({
        handle: async message => {
          if (message.op === 'llm-config-get') return {endpoint:'https://api.openai.com/v1', model:'', hasKey:false};
          __rcPreviewTest.calls.push(message);
          throw new Error('Unexpected provider call in preview test');
        },
      });
    });

    const page = await context.newPage();
    await page.goto('https://fsc-edunext.fpt.edu.vn/rc-ai-preview');

    const host = page.locator('.rc-answer-host');
    await host.waitFor({state: 'attached'});
    const gear = page.locator('#rc-kit #gear');
    await gear.waitFor({state: 'visible'});
    await gear.click();
    await page.locator('#rc-kit #panel').waitFor({state: 'visible'});

    const toggle = host.locator('#ai-toggle');
    await toggle.waitFor({state: 'visible'});
    await toggle.click();
    const panel = host.locator('#ai-panel');
    await panel.waitFor({state: 'visible'});

    const contextBlock = host.locator('#question-context');
    const preview = host.locator('#question-preview');
    const refresh = host.locator('#refresh-question');
    const settings = host.locator('#settings');
    const frame = host.locator('#api-frame');
    await contextBlock.waitFor({state: 'visible'});
    await preview.waitFor({state: 'visible'});
    await refresh.waitFor({state: 'visible'});
    assert.equal(await refresh.isEnabled(), true);

    // Opening the panel immediately reads the latest supported question and
    // keeps the KaTeX annotation while discarding rendered helper markup.
    await waitFor(async () => (await preview.textContent()).includes('$x^2 + 1 = 0$'), 'initial question preview');
    const initial = await preview.textContent();
    assert.match(initial, /Solve/);
    assert.match(initial, /\$x\^2 \+ 1 = 0\$/);
    assert.doesNotMatch(initial, /x² \+ 1 = 0/);
    await page.screenshot({path: path.join(TRANSFER, 'ai-preview-ready.png'), animations: 'disabled'});

    // Explicit refresh reads a changed question but does not call the provider.
    await page.evaluate(() => {
      const box = document.querySelector('.exercise-question-block');
      box.innerHTML = '<p>Changed question: <span class="katex"><annotation encoding="application/x-tex">2x + 3 = 7</annotation><span class="katex-html" aria-hidden="true">2x + 3 = 7</span></span></p><p>A. x = 2</p>';
    });
    await refresh.click();
    await waitFor(async () => (await preview.textContent()).includes('Changed question'), 'refreshed question preview');
    const changed = await preview.textContent();
    assert.match(changed, /Changed question/);
    assert.match(changed, /\$2x \+ 3 = 7\$/);
    assert.doesNotMatch(changed, /Solve/);

    // Escaped hostile markup stays literal text in the preview, rather than
    // becoming a child element or running an event handler.
    await page.evaluate(() => {
      window.__rcPreviewXss = false;
      document.querySelector('.exercise-question-block').innerHTML =
        '<p>Literal: &lt;img src=x onerror="window.__rcPreviewXss=1"&gt;</p>';
    });
    await refresh.click();
    await waitFor(async () => (await preview.textContent()).includes('<img src=x'), 'literal HTML preview');
    const literal = await preview.textContent();
    assert.match(literal, /<img src=x onerror="window.__rcPreviewXss=1">/);
    assert.equal(await preview.locator('img, script, iframe').count(), 0, 'preview must contain text, not active markup');
    assert.equal(await page.evaluate(() => window.__rcPreviewXss), false, 'preview must not execute markup handlers');

    // Settings replaces the question context with the embedded form, then
    // returns to the context and puts focus back on the settings control.
    await settings.click();
    await frame.waitFor({state: 'visible'});
    await contextBlock.waitFor({state: 'hidden'});
    assert.equal(await frame.isVisible(), true);
    await settings.click();
    await contextBlock.waitFor({state: 'visible'});
    await frame.waitFor({state: 'hidden'});
    await page.waitForFunction(() => document.querySelector('.rc-answer-host')?.shadowRoot?.activeElement?.id === 'settings');

    // Removing the supported message leaves an actionable empty state rather
    // than stale question text, and refresh remains available to try again.
    await page.evaluate(() => document.querySelector('.message-container.message-assistant')?.remove());
    await refresh.click();
    await waitFor(async () => {
      const text = (await preview.textContent()).trim();
      return text.length > 0 && !text.includes('<img src=x');
    }, 'empty question state');
    const empty = await preview.textContent();
    assert.match(empty, /question|chat|open|refresh|found|câu hỏi|khung chat|mở|đọc lại|tìm thấy/i);
    assert.equal(await refresh.isEnabled(), true);

    const providerCalls = await worker.evaluate(() => __rcPreviewTest.calls.slice());
    assert.equal(providerCalls.length, 0, 'preview actions must not call a provider');
    console.log('PASS: AI preview opens with cleaned math text, refreshes changed and hostile text safely, restores settings context/focus, and exposes an actionable empty state without provider calls.');
  } finally {
    await context.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
