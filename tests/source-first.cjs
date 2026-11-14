const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const source = fs.readFileSync('source/text-source.js', 'utf8');
const app = fs.readFileSync('extension/app.js', 'utf8');
const canvas = {object_key: 'correct-image', url: 'https://example.test/image'};
const message = {role: 'assistant', content: 'Original $d = R$ ✨', metadata: {canvas}};
const other = {role: 'assistant', content: 'WRONG MESSAGE', metadata: {canvas: {object_key: 'other'}}};
const owner = {memoizedProps: {messages: [other, message]}};
let fiber = owner;
for (let i = 7; i >= 0; i--) fiber = {memoizedProps: i === 1 ? {canvas} : {}, return: fiber};
const cont = {__reactFiber$test: fiber};
let ocrCalls = 0;
const ctx = vm.createContext({cfg: {sourceFirst: true}, containers: () => [cont], urlOfContainer: () => canvas.url,
    groupId: () => 'group', partNo: () => 1, Date, queue: [], grpPending: new Map(), grpFailed: new Set(),
    textByUrl: new Map(), segByUrl: new Map(), urlState: new Map(), toast() {}, log() {},
    ocrUrl: async () => { ocrCalls++; return {text: 'OCR fallback'}; },
    combinedFor: () => '', showInBubble() {}, finalizeGroup() {}});
vm.runInContext(source, ctx);
const run = app.slice(app.indexOf('    async function runJob('), app.indexOf('\n    // Tự động:', app.indexOf('    async function runJob(')));
vm.runInContext(run, ctx);
(async () => {
    assert.equal(ctx.texCandidates(cont)[0].path, 'L8.messages[matched].content');
    await ctx.runJob(canvas.url);
    assert.equal(ocrCalls, 0);
    assert.equal(ctx.textByUrl.get(canvas.url), message.content);
    owner.memoizedProps.messages.reverse();
    assert.equal(ctx.latexSourceOf(cont), message.content);
    message.content = '';
    message.beforeContent = 'USER ANSWER';
    message.metadata.question_block = {content: 'PARTIAL QUESTION'};
    await ctx.runJob(canvas.url);
    assert.equal(ocrCalls, 1);
    assert.equal(ctx.textByUrl.get(canvas.url), 'OCR fallback');
    message.content = 'Later original';
    assert.equal(ctx.latexSourceOf(cont), 'Later original');
    owner.memoizedProps.messages.push({...message});
    assert.equal(ctx.latexSourceOf(cont), null);
    owner.memoizedProps.messages.pop();
    ctx.cfg.sourceFirst = false;
    await ctx.runJob(canvas.url);
    assert.equal(ocrCalls, 2);
    ctx.cfg.sourceFirst = true;
    message.metadata.canvas = {object_key: 'different'};
    assert.equal(ctx.latexSourceOf(cont), null);
    console.log('PASS: exact L8 matching, reordering, original skips OCR, empty/partial fallback, late text, ambiguous/mismatched rejection, manual OCR mode.');
})().catch(e => {console.error(e); process.exitCode = 1;});
