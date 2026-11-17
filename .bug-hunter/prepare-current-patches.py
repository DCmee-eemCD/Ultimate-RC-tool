from pathlib import Path
import difflib

base = Path('source/Ultimate-RC-tools-5.14.txt')
old = base.read_text(encoding='utf-8')
new = old.replace('    let enterHandledTarget = null;', '    let enterHandledTarget = null;\n    let enterAttempt = 0;', 1)
new = new.replace('    function onEnterKey(e) {\n', '    function onEnterKey(e) {\n        const attempt = ++enterAttempt;\n', 1)
new = new.replace("        if (!findSendTarget(t)) return;", "        const requestedTarget = findSendTarget(t);\n        const requestedDraft = valueOf(t);\n        if (!requestedTarget) return;", 1)
new = new.replace('            if (!cfg.enterSend || !t.isConnected) return;', '            if (!cfg.enterSend || !t.isConnected || attempt !== enterAttempt || valueOf(t) !== requestedDraft) return;', 1)
new = new.replace('            const btn = findSendTarget(t);\n', '            const btn = findSendTarget(t);\n            if (btn !== requestedTarget) return;\n', 1)
new = new.replace("    window.addEventListener('keydown', onEnterKey, true);", "    window.addEventListener('keydown', onEnterKey, true);\n    window.addEventListener('input', e => { if (e.target?.matches?.(ENTER_SEL)) enterAttempt++; }, true);", 1)
out = Path('.bug-hunter')
out.joinpath('BUG-1.patch').write_text(''.join(difflib.unified_diff(old.splitlines(True), new.splitlines(True), fromfile='a/'+base.as_posix(), tofile='b/'+base.as_posix())), encoding='utf-8')
lang_old = "cfg.ocrVie = true; t.checked = true; if (k === 'ocrVie') { /* giữ lại tick */ }"
assert old.count(lang_old) == 1
lang_new = 'cfg[k] = true; t.checked = true;'
lang = old.replace(lang_old, lang_new)
out.joinpath('BUG-2.patch').write_text(''.join(difflib.unified_diff(old.splitlines(True), lang.splitlines(True), fromfile='a/'+base.as_posix(), tofile='b/'+base.as_posix())), encoding='utf-8')
out.joinpath('candidate-base.txt').write_text(new.replace(lang_old, lang_new), encoding='utf-8')
print('Prepared BUG-1.patch, BUG-2.patch and candidate-base.txt; production files unchanged.')
