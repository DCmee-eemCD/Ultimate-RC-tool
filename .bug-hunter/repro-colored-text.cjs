const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict');
const pixels = new Uint8ClampedArray(200 * 40 * 4).fill(255);
for (let y = 10; y < 25; y++) for (let x = 10; x < 180; x++) {
  const i = (y * 200 + x) * 4; pixels[i] = 20; pixels[i+1] = 80; pixels[i+2] = 220;
}
const canvas = () => ({width:200,height:40,getContext:()=>({getImageData:()=>({data:pixels}),drawImage(){}}),toDataURL:()=> 'data:image/png;base64,fixture'});
const ctx = vm.createContext({document:{createElement:canvas}});
vm.runInContext(fs.readFileSync('source/ocr-fidelity.js','utf8'),ctx);
const line={text:'A normal colored answer option',bbox:{x0:10,y0:10,x1:180,y1:25},confidence:95,words:[{text:'A normal colored answer option',bbox:{x0:10,y0:10,x1:180,y1:25}}]};
ctx.protectGlyphs({blocks:[{paragraphs:[{lines:[line]}]}]},canvas(),1);
if (process.argv.includes('--expect-fixed')) {
  assert.equal(line.rcVisual, undefined);
  assert.equal(line.text, 'A normal colored answer option');
  console.log('PASS colored answer remains text.');
} else {
  assert.equal(line.rcVisual?.type,'img');
  assert.equal(line.rcVisual?.preserved,true);
  console.log('REPRODUCED colored answer converted to whole-line image placeholder.');
}
