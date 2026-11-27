const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');

const source = fs.readFileSync('source/ocr-tables.js', 'utf8');

class FakeContext {
  constructor(canvas) { this.canvas = canvas; this.fillStyle = '#fff'; }

  getImageData() { return {data: this.canvas.pixels}; }

  fillRect(x, y, width, height) {
    const color = parseColor(this.fillStyle);
    for (let yy = Math.max(0, Math.floor(y)); yy < Math.min(this.canvas.height, Math.ceil(y + height)); yy++) {
      for (let xx = Math.max(0, Math.floor(x)); xx < Math.min(this.canvas.width, Math.ceil(x + width)); xx++) {
        this.canvas.setPixel(xx, yy, color);
      }
    }
  }

  drawImage(source, sx, sy, sw, sh, dx, dy, dw, dh) {
    const src = source instanceof FakeCanvas ? source : source.canvas;
    for (let y = 0; y < Math.max(0, Math.floor(dh)); y++) {
      for (let x = 0; x < Math.max(0, Math.floor(dw)); x++) {
        const fromX = Math.min(src.width - 1, Math.max(0, Math.floor(sx + x * sw / Math.max(1, dw))));
        const fromY = Math.min(src.height - 1, Math.max(0, Math.floor(sy + y * sh / Math.max(1, dh))));
        const from = (fromY * src.width + fromX) * 4;
        this.canvas.setPixel(Math.floor(dx + x), Math.floor(dy + y), src.pixels.slice(from, from + 4));
      }
    }
  }
}

class FakeCanvas {
  constructor(width, height) {
    this._width = width; this._height = height;
    this.pixels = new Uint8ClampedArray(width * height * 4);
    this.getContext('2d').fillStyle = '#fff';
    this.getContext('2d').fillRect(0, 0, width, height);
  }

  get width() { return this._width; }
  set width(value) {
    this._width = Math.max(1, Math.floor(value));
    this.pixels = new Uint8ClampedArray(this._width * this._height * 4);
  }
  get height() { return this._height; }
  set height(value) {
    this._height = Math.max(1, Math.floor(value));
    this.pixels = new Uint8ClampedArray(this._width * this._height * 4);
  }

  getContext() {
    if (!this.context) this.context = new FakeContext(this);
    return this.context;
  }

  setPixel(x, y, color) {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return;
    const i = (y * this.width + x) * 4;
    this.pixels.set(color, i);
  }
}

function parseColor(value) {
  const text = String(value || '').trim().toLowerCase();
  if (text === '#fff' || text === '#ffffff' || text === 'white') return [255, 255, 255, 255];
  const match = /^#([0-9a-f]{6})$/.exec(text);
  if (!match) return [255, 255, 255, 255];
  return [parseInt(match[1].slice(0, 2), 16), parseInt(match[1].slice(2, 4), 16), parseInt(match[1].slice(4, 6), 16), 255];
}

function horizontal(canvas, y, x0, x1, color = [156, 163, 175, 255]) {
  for (let x = x0; x <= x1; x++) canvas.setPixel(x, y, color);
}

function vertical(canvas, x, y0, y1, color = [156, 163, 175, 255]) {
  for (let y = y0; y <= y1; y++) canvas.setPixel(x, y, color);
}

function ink(canvas, x0, y0, x1, y1, color = [25, 25, 25, 255]) {
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) canvas.setPixel(x, y, color);
}

function makeFixture() {
  const canvas = new FakeCanvas(190, 135);
  // A two-sided rounded-question-box stand-in: it must not become a table.
  vertical(canvas, 5, 4, 14, [25, 25, 25, 255]);
  vertical(canvas, 184, 4, 14, [25, 25, 25, 255]);
  horizontal(canvas, 4, 8, 181, [25, 25, 25, 255]);
  horizontal(canvas, 14, 8, 181, [25, 25, 25, 255]);

  const xs = [20, 90, 160], ys = [20, 50, 80, 110];
  canvas.getContext('2d').fillStyle = '#e5e7eb';
  canvas.getContext('2d').fillRect(xs[0] + 1, ys[0] + 1, xs[2] - xs[0] - 1, ys[1] - ys[0] - 1);
  for (const x of xs) vertical(canvas, x, ys[0], ys[ys.length - 1]);
  for (const y of ys) horizontal(canvas, y, xs[0], xs[xs.length - 1]);
  // Five visible cells and one intentionally empty cell.
  ink(canvas, 30, 31, 40, 38);
  ink(canvas, 101, 31, 116, 38);
  ink(canvas, 30, 61, 44, 68);
  ink(canvas, 101, 61, 118, 68);
  ink(canvas, 30, 91, 42, 98);
  return {canvas, xs, ys};
}

(async () => {
  const fixture = makeFixture();
  const context = vm.createContext({
    console,
    document: {createElement: tag => tag === 'canvas' ? new FakeCanvas(1, 1) : null},
  });
  vm.runInContext(source, context);

  const grids = context.detectOcrTableGrids(fixture.canvas);
  assert.equal(grids.length, 1, 'only the three-rule table should be detected');
  assert.deepEqual([...grids[0].xLines], fixture.xs);
  assert.deepEqual([...grids[0].yLines], fixture.ys);
  assert.equal(grids[0].header, true, 'pale first-row fill is reported as a header');

  const merged = makeFixture();
  for (let y = merged.ys[0] + 1; y < merged.ys[1]; y++) merged.canvas.setPixel(merged.xs[1], y, [255, 255, 255, 255]);
  assert.equal(context.detectOcrTableGrids(merged.canvas).length, 0, 'merged header edge must fail closed');

  let active = 0, peak = 0;
  const tables = await context.extractOcrTables(fixture.canvas, fixture.canvas, async () => {
    active++;
    peak = Math.max(peak, active);
    await new Promise(resolve => setTimeout(resolve, 1));
    active--;
    return {text: 'cell'};
  }, 1, 8);
  assert.equal(tables.length, 1);
  assert.deepEqual(JSON.parse(JSON.stringify(tables[0].rows)), [['cell', 'cell'], ['cell', 'cell'], ['cell', '']]);
  assert.equal(tables[0].header, true);
  assert.deepEqual([tables[0].x0, tables[0].y0, tables[0].x1, tables[0].y1], [20, 20, 160, 110]);
  assert.ok(peak <= 4, `cell OCR concurrency must stay <= 4, got ${peak}`);

  const rejected = await context.extractOcrTables(fixture.canvas, fixture.canvas, async () => ({text: ''}), 1, 8);
  assert.equal(rejected.length, 0, 'a visible unreadable cell rejects the whole table');
  console.log('PASS: ruled-table detection, question-box exclusion, header/empty-cell preservation, bounded cell OCR, and fail-closed fallback.');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
