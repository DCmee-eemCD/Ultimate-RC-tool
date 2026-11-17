const fs = require('node:fs');
const path = 'source/Ultimate-RC-tools-5.14.txt';
const old = fs.readFileSync(path, 'utf8').replace(/\r\n/g, '\n');
const changes = [
  [
    ['    let enterHandledTarget = null;', '    let enterHandledTarget = null;\n    let enterAttempt = 0;'],
    ['    function onEnterKey(e) {', '    function onEnterKey(e) {\n        const attempt = ++enterAttempt;'],
    ['        if (!findSendTarget(t)) return;', '        const requestedTarget = findSendTarget(t);\n        const requestedDraft = valueOf(t);\n        if (!requestedTarget) return;'],
    ['            if (!cfg.enterSend || !t.isConnected) return;', '            if (!cfg.enterSend || !t.isConnected || attempt !== enterAttempt || valueOf(t) !== requestedDraft) return;'],
    ['            const btn = findSendTarget(t);', '            const btn = findSendTarget(t);\n            if (btn !== requestedTarget) return;'],
    ["    window.addEventListener('keydown', onEnterKey, true);", "    window.addEventListener('keydown', onEnterKey, true);\n    window.addEventListener('input', e => { if (e.target?.matches?.(ENTER_SEL)) enterAttempt++; }, true);"],
  ],
  [["cfg.ocrVie = true; t.checked = true; if (k === 'ocrVie') { /* giữ lại tick */ }", 'cfg[k] = true; t.checked = true;']],
];
let candidate = old;
for (const [index, edits] of changes.entries()) {
  let preview = `--- a/${path}\n+++ b/${path}\n`;
  let offset = 0;
  for (const [before, after] of edits) {
    if (old.split(before).length !== 2) throw Error('Ambiguous anchor: ' + before);
    const start = old.indexOf(before);
    const lineStart = old.lastIndexOf('\n', start) + 1;
    const lineEnd = old.indexOf('\n', start + before.length);
    const line = old.slice(lineStart, lineEnd);
    const next = line.replace(before, after);
    const number = old.slice(0, lineStart).split('\n').length;
    const lines = next.split('\n');
    preview += `@@ -${number},1 +${number + offset},${lines.length} @@\n-${line}\n${lines.map(s => '+' + s).join('\n')}\n`;
    offset += lines.length - 1;
    candidate = candidate.replace(before, after);
  }
  fs.writeFileSync(`.bug-hunter/BUG-${index + 1}.patch`, preview);
}
fs.writeFileSync('.bug-hunter/candidate-base.txt', candidate);
console.log('Prepared two patch previews and candidate base; production unchanged.');
