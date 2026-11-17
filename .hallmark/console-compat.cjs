// Supplemental check: exercise the existing suite beyond its obsolete width-animation assertion.
// The original test is untouched and its failure is reported separately.
const fs=require('node:fs'),path=require('node:path'),Module=require('node:module');
const filename=path.resolve('tests/console-ui.cjs');
const original=fs.readFileSync(filename,'utf8');
const lines=original.split('\n');
const removed=lines.filter(l=>l.includes("'size preset should animate the panel width'"));
if(removed.length!==1)throw new Error('Expected exactly one obsolete assertion');
const m=new Module(filename,module);m.filename=filename;m.paths=Module._nodeModulePaths(path.dirname(filename));
m._compile(lines.filter(l=>!removed.includes(l)).join('\n'),filename);
