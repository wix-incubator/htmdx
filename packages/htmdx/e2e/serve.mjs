import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { extname, isAbsolute, relative, resolve } from 'node:path';

const dir = import.meta.dirname;
const EXAMPLES = resolve(dir, '../../../examples');
const BROWSER_JS = resolve(dir, '../dist/browser.js');
const PORT = 4321;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
};

createServer((req, res) => {
  const name = new URL(req.url, `http://127.0.0.1:${PORT}`).pathname.slice(1) || 'index.html';
  const file = name === 'browser.js' ? BROWSER_JS : resolve(EXAMPLES, name);
  const fromExamples = relative(EXAMPLES, file);
  if (file !== BROWSER_JS && (fromExamples.startsWith('..') || isAbsolute(fromExamples))) {
    res.writeHead(404);
    res.end();
    return;
  }
  try {
    const body = readFileSync(file);
    res.writeHead(200, { 'Content-Type': TYPES[extname(file)] ?? 'text/plain' });
    res.end(body);
  } catch {
    res.writeHead(404);
    res.end();
  }
}).listen(PORT, '127.0.0.1');
