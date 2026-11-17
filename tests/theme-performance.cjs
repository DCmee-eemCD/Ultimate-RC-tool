const {launchExtension} = require('./lib/browser.cjs');

const URL = 'https://fsc-edunext.fpt.edu.vn/rc-theme-performance';

(async () => {
  const context = await launchExtension('theme-performance', {viewport: {width: 1280, height: 900}});
  try {
    await context.route('https://fsc-edunext.fpt.edu.vn/**', route => route.fulfill({
      contentType: 'text/html',
      body: '<!doctype html><html><body><div class="chat-messages"></div></body></html>',
    }));
    const page = await context.newPage();
    await page.goto(URL);
    const gear = page.locator('#rc-kit #gear');
    await gear.waitFor({state: 'visible'});
    await gear.click();
    const modeButtons = page.locator('#rc-kit [data-theme-mode]');
    await modeButtons.first().waitFor({state: 'visible'});
    const result = await page.evaluate(async () => {
      const host = document.querySelector('#rc-kit');
      const buttons = {};
      for (const button of host.shadowRoot.querySelectorAll('[data-theme-mode]')) {
        buttons[button.dataset.themeMode] = button;
      }
      const writes = {style: 0, sheet: 0};
      const textContent = Object.getOwnPropertyDescriptor(Node.prototype, 'textContent');
      Object.defineProperty(Node.prototype, 'textContent', {
        configurable: textContent.configurable,
        enumerable: textContent.enumerable,
        get: textContent.get,
        set(value) {
          if (this.id === 'rc-kit-style') writes.style++;
          return textContent.set.call(this, value);
        },
      });
      const replaceSync = CSSStyleSheet.prototype.replaceSync;
      CSSStyleSheet.prototype.replaceSync = function (...args) {
        writes.sheet++;
        return replaceSync.apply(this, args);
      };
      const samples = [];
      const waitFrame = () => new Promise(resolve => requestAnimationFrame(resolve));
      for (let i = 0; i < 24; i++) {
        buttons[i % 2 ? 'dark' : 'light'].click();
        const start = performance.now();
        await waitFrame();
        samples.push(performance.now() - start);
      }
      return {samples, writes};
    });
    console.log(JSON.stringify({...result, sorted: [...result.samples].sort((a, b) => a - b)}));
    if (result.writes.style !== 0 || result.writes.sheet !== 24) {
      throw new Error(`Theme switch published ${result.writes.style} legacy style sheets and ${result.writes.sheet} adopted sheets; expected 0 and 24.`);
    }
  } finally {
    await context.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
