const fs = require('node:fs');
const assert = require('node:assert/strict');
const {launchExtension} = require('./lib/browser.cjs');

(async () => {
  const context = await launchExtension('ocr-glyphs');
  try {
    const page = await context.newPage();
    await page.goto('about:blank');
    await page.addScriptTag({content: fs.readFileSync('source/ocr-fidelity.js', 'utf8')});
    const results = await page.evaluate(() => {
      function fixture(label, scale, token) {
        const canvas = document.createElement('canvas');
        canvas.width = 420 * scale; canvas.height = 70 * scale;
        const ctx = canvas.getContext('2d');
        ctx.scale(scale, scale);
        ctx.fillStyle = 'white'; ctx.fillRect(0, 0, 420, 70);
        ctx.font = '26px Arial'; ctx.fillStyle = '#d02020';
        ctx.fillText(label, 20, 42);
        const end = 20 + ctx.measureText(label).width;
        const emojiX = end + 35;
        ctx.fillText('🔥', emojiX, 42);
        const bb = (x0, x1) => ({x0:x0*scale, x1:x1*scale, y0:16*scale, y1:46*scale});
        const line = {text:label + ' ' + token, bbox:bb(20, emojiX+30), words:[
          {text:label, bbox:bb(20, end)}, {text:token, bbox:bb(emojiX, emojiX+29)},
        ]};
        protectGlyphs({blocks:[{paragraphs:[{lines:[line]}]}]}, canvas, scale);
        return {label, visual:line.rcVisual};
      }
      return [1, 2].flatMap(scale => ['Red', 'Congratulations', 'Go', 'a', '2'].flatMap(label =>
        ['@', 'A', '🔥'].map(token => ({scale, token, ...fixture(label, scale, token)}))));
    });
    for (const result of results) {
      assert.ok(result.visual, 'colored heading must not disable emoji repair');
      assert.equal(result.visual.copyText, result.label + ' 🔥', 'preserve colored words exactly once and recover flame');
      assert.equal(result.visual.parts.some(p => p.type === 'icon'), false, 'ordinary colored text must not become an image');
    }
    console.log('PASS: 30 cases preserve colored words, numbers, wide headings and emoji at both scales');
  } finally { await context.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
