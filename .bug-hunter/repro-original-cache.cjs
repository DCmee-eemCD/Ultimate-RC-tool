const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const app = fs.readFileSync('extension/app.js', 'utf8');
const url = 'https://cdn.example/chats-artifacts/chat-assistant:one:part-1';
const canvas = {url, object_key: 'one'};
const cont = {__reactFiber$x: {memoizedProps: {canvas}, return: {memoizedProps: {messages: [{role: 'assistant', content: 'Correct original', metadata: {canvas}}]}}}, parentElement: {querySelector: () => null}};
let copied, displayed;
const ctx = vm.createContext({cfg: {sourceFirst: true, replaceBubble: true}, containers: () => [cont], urlOfContainer: () => url,
  textByUrl: new Map([[url, 'Wrong OCR']]), segByUrl: new Map([[url, [{type:'text',text:'Wrong OCR'}]]]),
  urlState: new Map([[url,'done']]), groupId: () => 'one', partNo: () => 1,
  allChatUrls: () => [url], GM_setClipboard: text => copied = text,
  applyToContainer: (c, text) => displayed = text, showInBubble() {}, toast() {}, enqueue() {}});
vm.runInContext(fs.readFileSync('source/text-source.js', 'utf8'), ctx);
vm.runInContext(app.slice(app.indexOf('    function partsFor('), app.indexOf('    // ----------', app.indexOf('    function partsFor('))), ctx);
vm.runInContext(app.slice(app.indexOf('    function forceScan('), app.indexOf('    // L', app.indexOf('    function forceScan('))), ctx);
ctx.recoverOriginals();
ctx.forceScan();
assert.equal(displayed, 'Correct original');
assert.equal(copied, 'Correct original', 'Copy latest must use recovered original, not stale OCR');
console.log('PASS recovered original is also used by Copy latest');
