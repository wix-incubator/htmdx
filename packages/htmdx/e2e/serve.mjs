import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { extname, resolve } from 'node:path';

const dir = import.meta.dirname;
const EXAMPLES = resolve(dir, '../../../examples');
const BROWSER_JS = resolve(dir, '../dist/browser.js');
const PORT = 4321;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
};

createServer((req, res) => {
  const name = req.url.slice(1) || 'index.html';
  const file = name === 'browser.js' ? BROWSER_JS : resolve(EXAMPLES, name);
  try {
    res.writeHead(200, { 'Content-Type': TYPES[extname(file)] ?? 'text/plain' });
    res.end(readFileSync(file));
  } catch {
    res.writeHead(404);
    res.end();
  }
}).listen(PORT);
