const assert = require('node:assert/strict');
const {launchExtension} = require('./lib/browser.cjs');

(async () => {
  const context = await launchExtension('chat-surfaces');
  try {
    await context.route('https://fsc-edunext.fpt.edu.vn/**', route => route.fulfill({contentType: 'text/html', body: '<!doctype html><body></body>'}));
    const page = await context.newPage();
    await page.goto('https://fsc-edunext.fpt.edu.vn/rc-chat-surfaces');
    await page.evaluate(() => {
      const add = (parent, tag, cls) => {
        const el = document.createElement(tag); el.className = cls; parent.append(el); return el;
      };
      const bubble = add(document.body, 'div', 'message-container message-user');
      add(bubble, 'p', 'sample-text').textContent = 'Message text';
      const input = add(document.body, 'div', 'w-chat-input');
      add(input, 'div', 'w-chat-input__card');
      const panel = add(input, 'aside', 'w-chat-input__intent-panel');
      const item = add(panel, 'button', 'exercise-intent-column__item');
      item.style.setProperty('--intent-background', '#fff7ed');
      item.style.setProperty('--intent-color', '#f59e0b');
      add(item, 'span', 'exercise-intent-column__button').textContent = 'Utility';
      const style = add(document.head, 'style', '');
      style.textContent = '.w-chat-input__intent-panel {background:white} .exercise-intent-column__button {background:#e8efff}';
    });
    await page.locator('#rc-kit #gear').click();
    for (const mode of ['dark', 'light']) {
      await page.locator(`#rc-kit [data-theme-mode="${mode}"]`).click();
      await page.locator('#rc-kit .pre[data-pre="0"]').click();
      const result = await page.evaluate(() => {
        const bg = selector => getComputedStyle(document.querySelector(selector)).backgroundColor;
        return {text: bg('.sample-text'), card: bg('.w-chat-input__card'), panel: bg('.w-chat-input__intent-panel'), tile: bg('.exercise-intent-column__button'), icon: getComputedStyle(document.querySelector('.exercise-intent-column__button')).color};
      });
      assert.equal(result.text, 'rgba(0, 0, 0, 0)', `${mode}: no text highlight`);
      assert.equal(result.panel, result.card, `${mode}: utilities follows composer surface`);
      assert.equal(result.tile, 'rgb(255, 247, 237)', `${mode}: utility keeps its intent pastel`);
      assert.equal(result.icon, 'rgb(245, 158, 11)', `${mode}: utility keeps its intent icon color`);
    }
    console.log('PASS: user text stays transparent and utilities surfaces follow dark/light themes.');
  } finally { await context.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
