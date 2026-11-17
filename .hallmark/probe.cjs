const fs=require('node:fs'),path=require('node:path'),Module=require('node:module');
const filename=path.resolve('tests/ai-panel.cjs');
let source=fs.readFileSync(filename,'utf8').replace('assertInViewport(await locator.boundingBox(), viewport, label);','console.log(label, await locator.boundingBox()); assertInViewport(await locator.boundingBox(), viewport, label);');
const m=new Module(filename,module);m.filename=filename;m.paths=Module._nodeModulePaths(path.dirname(filename));m._compile(source,filename);
