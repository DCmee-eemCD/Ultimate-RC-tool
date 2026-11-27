const fs = require('node:fs');
const assert = require('node:assert/strict');
const {launchExtension} = require('./lib/browser.cjs');

(async () => {
  const context = await launchExtension('ocr-table-style');
  try {
    const page = await context.newPage();
    await page.goto('about:blank');
    await page.addScriptTag({content:fs.readFileSync('source/ocr-table-render.js', 'utf8')});
    const app = fs.readFileSync('extension/app.js', 'utf8');
    const start = app.indexOf('            .rc-ocr-table-wrap {');
    assert.ok(start >= 0);
    await page.addStyleTag({content:app.slice(start, app.indexOf('            .rc-ocr-fig {', start))});
    // Late page CSS and a white-text chat over wallpaper reproduced the report.
    await page.addStyleTag({content:`
      body { margin:20px; background:linear-gradient(30deg,#564159,#a5a3aa); }
      .message-container { color:white; font:600 14px/1.65 'Segoe UI',sans-serif; }
      .markdown table tr:nth-child(2n) {background:#f8f8f8;}
      .markdown table th, .markdown table td {color:inherit;}
    `});
    await page.evaluate(() => {
      const host = document.createElement('div'); host.className='message-container markdown rc-ocr-body';
      document.body.append(host);
      renderOcrTable(host, {header:true,rows:[['Phân đoạn','Ứng dụng'],['Khí hoá lỏng','Nhiên liệu (sưởi ấm, bếp gas)'],['Dầu nhẹ','Dung môi'],['Naphtha nhẹ','Dung môi'],['Xăng','Nhiên liệu cho động cơ đốt trong']]});
    });
    const cells = await page.locator('td').evaluateAll(nodes => nodes.map(node => {
      const css = getComputedStyle(node);
      return {color:css.color,background:css.backgroundColor,weight:css.fontWeight};
    }));
    for (const cell of cells) {
      assert.equal(cell.color, 'rgb(31, 41, 55)', 'every cell has dark readable text over wallpaper');
      assert.equal(cell.background, 'rgb(255, 255, 255)', 'every body cell has an opaque white background');
      assert.equal(cell.weight, '400', 'body cells do not inherit bold chat text');
    }
    await page.setViewportSize({width:960,height:550});
    await page.screenshot({path:'.transfer/ocr-table-style-fixed.png'});
    await page.setViewportSize({width:390,height:550});
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    console.log('PASS: readable table cells with late striped page CSS, white chat text, wallpaper, and narrow viewport.');
  } finally {await context.close();}
})().catch(error => {console.error(error);process.exitCode=1;});
