const assert = require('node:assert/strict');
const {launchExtension} = require('./lib/browser.cjs');

async function main() {
  const context = await launchExtension('enter-send');
  try {
    await context.route('https://fsc-edunext.fpt.edu.vn/**', route => route.fulfill({
      contentType: 'text/html; charset=utf-8',
      body: '<!doctype html><html><body></body></html>',
    }));
    const page = await context.newPage();
    await page.goto('https://fsc-edunext.fpt.edu.vn/rc-enter-send');
    await page.locator('#rc-kit #gear').waitFor({state: 'attached'});
    await page.evaluate(() => {
      const add = (parent, tag, props = {}) => {
        const el = document.createElement(tag);
        Object.assign(el, props);
        parent.append(el);
        return el;
      };
      const exerciseWindow = add(document.body, 'div', {className: 'chat-window', id: 'exercise-window'});
      const exerciseInput = add(exerciseWindow, 'div', {className: 'w-chat-input', id: 'exercise-input'});
      const exerciseEditor = add(exerciseInput, 'textarea', {id: 'exercise-editor'});
      const exerciseSubmit = add(exerciseInput, 'button', {
        className: 'exercise-intent-column__item',
        id: 'exercise-submit',
        type: 'button',
        textContent: 'Nộp',
      });
      exerciseSubmit.dataset.intent = 'SUBMIT_ANSWER';
      window.__enterFixture = {exercise: 0, normal: 0};
      exerciseSubmit.addEventListener('click', () => { window.__enterFixture.exercise += 1; });
      exerciseEditor.focus();
    });

    const exerciseEditor = page.locator('#exercise-editor');
    await exerciseEditor.fill('answer');
    await exerciseEditor.press('Enter');
    assert.equal(await page.evaluate(() => window.__enterFixture.exercise), 1, 'Enter should click the exercise submit button');

    // A Shift+Enter immediately after a successful Enter must still insert a newline.
    await exerciseEditor.press('Shift+Enter');
    assert.equal(await page.evaluate(() => window.__enterFixture.exercise), 1, 'Shift+Enter must not submit a second time');
    assert.equal(await exerciseEditor.inputValue(), 'answer\n', 'Shift+Enter should insert a newline after Enter');

    // IME composition and Chrome's keyCode 229 are text composition, not submit.
    await exerciseEditor.fill('composing');
    await exerciseEditor.evaluate(editor => {
      const event = new KeyboardEvent('keydown', {key: 'Enter', code: 'Enter', bubbles: true, cancelable: true});
      Object.defineProperty(event, 'isComposing', {value: true});
      editor.dispatchEvent(event);
    });
    await exerciseEditor.evaluate(editor => {
      const event = new KeyboardEvent('keydown', {key: 'Enter', code: 'Enter', bubbles: true, cancelable: true});
      Object.defineProperty(event, 'keyCode', {value: 229});
      Object.defineProperty(event, 'which', {value: 229});
      editor.dispatchEvent(event);
    });
    assert.equal(await page.evaluate(() => window.__enterFixture.exercise), 1, 'IME Enter must not submit');

    // aria-disabled is a disabled target even when the native disabled property is false.
    await exerciseEditor.fill('aria disabled');
    await page.locator('#exercise-submit').evaluate(button => button.setAttribute('aria-disabled', 'true'));
    await exerciseEditor.press('Enter');
    // Allow all four 80 ms readiness retries to run while the button stays disabled.
    await page.waitForTimeout(400);
    assert.equal(await page.evaluate(() => window.__enterFixture.exercise), 1, 'aria-disabled submit must not be clicked');
    await page.locator('#exercise-submit').evaluate(button => button.removeAttribute('aria-disabled'));

    await page.evaluate(() => {
      const add = (parent, tag, props = {}) => {
        const el = document.createElement(tag);
        Object.assign(el, props);
        parent.append(el);
        return el;
      };
      const normalPopup = add(document.body, 'div', {className: 'chat-popup', id: 'normal-popup'});
      const normalEditor = add(normalPopup, 'textarea', {className: 'w-md-editor-text-input', id: 'normal-editor'});
      const normalSend = add(normalPopup, 'button', {className: 'w-send-btn', id: 'normal-send', type: 'button', textContent: 'Gửi'});
      normalSend.addEventListener('click', () => { window.__enterFixture.normal += 1; });

      const unrelatedWindow = add(document.body, 'div', {className: 'chat-window', id: 'unrelated-window'});
      const unrelatedInput = add(unrelatedWindow, 'div', {className: 'w-chat-input'});
      add(unrelatedInput, 'textarea', {id: 'unrelated-editor'});
      normalEditor.focus();
    });

    const normalEditor = page.locator('#normal-editor');
    await normalEditor.fill('normal message');
    await normalEditor.press('Enter');
    assert.equal(await page.evaluate(() => window.__enterFixture.normal), 1, 'Enter should click a normal w-send-btn');

    const unrelatedEditor = page.locator('#unrelated-editor');
    await unrelatedEditor.fill('unrelated message');
    await unrelatedEditor.press('Enter');
    assert.equal(await page.evaluate(() => window.__enterFixture.normal), 1, 'An unrelated composer must not click another composer send button');

    console.log('PASS: Enter sends exercise and normal messages once, preserves Shift+Enter, ignores IME/229/aria-disabled, and scopes unrelated composers.');
  } finally {
    await context.close();
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
