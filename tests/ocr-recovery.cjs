const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const {test} = require('node:test');
const app = fs.readFileSync('extension/app.js', 'utf8');
const source = fs.readFileSync('source/text-source.js', 'utf8');
const url = (id, signature = 'fresh') => `https://cdn-lab.fpt.edu.vn/chats-artifacts/chat-assistant:${id}:part-1.webp?sig=${signature}`;

function setup({visible = [], history = [], recognize = async () => ({text: 'Recovered'})} = {}) {
  const calls = [], messages = [];
  const ctx = vm.createContext({
    cfg: {sourceFirst: false, autoCopy: false}, Date, setTimeout, clearTimeout,
    containers: () => visible, urlOfContainer: c => c.url,
    performance: {getEntriesByType: () => history.map(name => ({name}))},
    toast: text => messages.push(text), log() {}, showInBubble() {}, GM_setClipboard() {},
    ocrUrl: async u => { calls.push(u); return recognize(u); }
  });
  vm.runInContext(app.slice(app.indexOf('    const RES_RE ='), app.indexOf('    const withTimeout =')), ctx);
  vm.runInContext(source, ctx);
  vm.runInContext(app.slice(app.indexOf('    function partsFor('), app.indexOf('    // ---------- Thay')), ctx);
  vm.runInContext(app.slice(app.indexOf('    const queue = [];'), app.indexOf('    // Lưới 1:')), ctx);
  return {ctx, calls, messages};
}
const settle = () => new Promise(resolve => setImmediate(resolve));

test('manual scan uses the currently mounted conversation, not old resource history', async () => {
  const current = url('current'), old = url('old');
  const {ctx, calls} = setup({visible: [{url: current}], history: [current, old]});
  ctx.forceScan(); await settle();
  assert.deepEqual(calls, [current]);
});

test('manual source recovery works even without a resource timing entry', () => {
  const canvas = {object_key: 'current', url: url('current')};
  const cont = {url: canvas.url, __reactFiber$test: {memoizedProps: {canvas}, return: {
    memoizedProps: {messages: [{role: 'assistant', content: 'Exact original', metadata: {canvas}}]}
  }}};
  const {ctx, calls} = setup({visible: [cont]});
  ctx.cfg.sourceFirst = true;
  ctx.forceScan();
  assert.equal(vm.runInContext('textByUrl.get(containers()[0].url)', ctx), 'Exact original');
  assert.equal(calls.length, 0);
});

test('manual retry uses the renewed image URL instead of an expired same-part URL', async () => {
  const expired = url('same', 'expired'), fresh = url('same');
  const {ctx, calls} = setup({visible: [{url: fresh}], history: [expired, fresh]});
  ctx.forceScan(); await settle();
  assert.deepEqual(calls, [fresh]);
});

test('manual scan retains other parts of the current message', async () => {
  const first = url('multi'), second = first.replace('part-1', 'part-2');
  const {ctx, calls} = setup({visible: [{url: first}], history: [first, second, url('old')]});
  ctx.forceScan(); await settle();
  assert.deepEqual(calls, [first, second]);
});

test('resource history remains a fallback when React URLs are unavailable', async () => {
  const expired = url('fallback', 'expired'), fresh = url('fallback');
  const {ctx, calls} = setup({history: [expired, fresh]});
  ctx.forceScan(); await settle();
  assert.deepEqual(calls, [fresh]);
});

test('empty OCR results remain retryable and do not enter the successful text cache', async () => {
  const image = url('empty'); let attempts = 0;
  const {ctx, calls} = setup({visible: [{url: image}], history: [image],
    recognize: async () => ({text: ++attempts === 1 ? '   ' : 'Recovered'})});
  ctx.forceScan(); await settle();
  assert.equal(vm.runInContext('textByUrl.size', ctx), 0);
  ctx.forceScan(); await settle();
  assert.equal(calls.length, 2);
  assert.equal(vm.runInContext('combinedFor(groupId(containers()[0].url))', ctx), 'Recovered');
});

test('network failure can be retried and a successful result stays cached', async () => {
  const image = url('retry'); let attempts = 0;
  const {ctx, calls} = setup({visible: [{url: image}], history: [image],
    recognize: async () => { if (++attempts === 1) throw Error('Failed to fetch'); return {text: 'Recovered'}; }});
  ctx.forceScan(); await settle();
  ctx.forceScan(); await settle();
  ctx.forceScan(); await settle();
  assert.equal(calls.length, 2);
});

test('offscreen OCR reruns blank recognition instead of returning a cached blank', async () => {
  let attempts = 0;
  const ctx = vm.createContext({
    chrome: {runtime: {sendMessage: async () => {}, onMessage: {addListener() {}}}},
    RC: {workerOptions: {}}, navigator: {hardwareConcurrency: 2},
    performance, crypto: require('node:crypto').webcrypto, AbortSignal, structuredClone,
    setTimeout, clearTimeout, setInterval() {},
    fetch: async () => new Response(new Uint8Array([1, 2, 3])),
    createImageBitmap: async () => ({width: 200, height: 100, close() {}}),
    Tesseract: {createScheduler: () => ({addWorker() {}, terminate: async () => {}}), createWorker: async () => ({})},
    RCOcrReady: Promise.resolve({ocrPipeline: async () => ({text: ++attempts === 1 ? '' : 'Recovered', ms: {}})})
  });
  vm.runInContext(fs.readFileSync('extension/offscreen.js', 'utf8'), ctx);
  const job = {url: url('blank'), langs: 'eng', threads: 1, keepWarm: false, idle: 0};
  assert.equal((await ctx.enqueue(job)).text, '');
  assert.equal((await ctx.enqueue(job)).text, 'Recovered');
  assert.equal(attempts, 2);
});
