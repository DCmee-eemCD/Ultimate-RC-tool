import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

/** Absolute project root, so the build works from any working directory. */
export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

export const resolve = rel => path.join(ROOT, rel);
export const readText = rel => fs.readFile(resolve(rel), 'utf8');
export const readBase64 = async rel => (await fs.readFile(resolve(rel))).toString('base64');
export const writeText = (rel, text) => fs.writeFile(resolve(rel), text);
export const copy = (from, to) => fs.copyFile(resolve(from), resolve(to));
