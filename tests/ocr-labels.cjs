const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const source = fs.readFileSync('source/Ultimate-RC-tools-5.14.txt', 'utf8');
const scope = {};
vm.createContext(scope);
vm.runInContext(source.slice(source.indexOf('    function splitQuestionBoxes('), source.indexOf('    function renderTextSeg(')), scope);
for (const label of ['Câu hỏi', 'Cau hoi', 'Câu hoi', 'Question', 'Questiong']) {
  const parts = scope.splitQuestionBoxes(`Intro\n${label}:\nWhich place?\nA) Ha Long Bay\nB) Grand Canyon\nPlease answer using this format:\nAnswer: [your answer]`);
  assert.equal(parts.filter(p => p.q).length, 1, label);
  assert.match(parts.find(p => p.q).t, /B\) Grand Canyon/);
  assert.doesNotMatch(parts.find(p => p.q).t, /Please answer|Answer:/);
}
assert.equal(scope.splitQuestionBoxes('Questioning the result is useful.').some(p => p.q), false);
assert.equal(scope.splitQuestionBoxes('Question: First?\nQuestion: Second?').filter(p => p.q).length, 2);
vm.runInContext(fs.readFileSync('source/ocr-fidelity.js', 'utf8'), scope);
for (const [input, expected] of [
  ['| am ready. | think so.', 'I am ready. I think so.'],
  ["|’m ready and | want to go.", "I’m ready and I want to go."],
  ['|x| = 2; A | B; ||; | 5', '|x| = 2; A | B; ||; | 5'],
  ['I am ready.', 'I am ready.'],
]) assert.equal(scope.repairOcrText(input), expected);
console.log('PASS: question label variants, box boundaries, pronoun repair, and literal bars.');
