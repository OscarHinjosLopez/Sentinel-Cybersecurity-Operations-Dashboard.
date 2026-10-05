import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { gzipSync } from 'node:zlib';

const root = resolve('dist/sentinel/browser');
const port = Number(process.env.PORT ?? 4400);
const types = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.json': 'application/json',
};
createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    let file = resolve(root, `.${pathname}`);
    if (file !== root && !file.startsWith(root + sep)) {
      response.writeHead(403).end();
      return;
    }
    try {
      if (!(await stat(file)).isFile()) file = resolve(root, 'index.html');
    } catch {
      if (extname(pathname)) {
        response.writeHead(404).end();
        return;
      }
      file = resolve(root, 'index.html');
    }
    const body = await readFile(file);
    const gzip = /\bgzip\b/.test(request.headers['accept-encoding'] ?? '');
    response.writeHead(200, {
      'Content-Type': `${types[extname(file)] ?? 'application/octet-stream'}; charset=utf-8`,
      'Cache-Control': 'no-store',
      Vary: 'Accept-Encoding',
      ...(gzip ? { 'Content-Encoding': 'gzip' } : {}),
    });
    response.end(gzip ? gzipSync(body) : body);
  } catch {
    response.writeHead(500).end();
  }
}).listen(port, '127.0.0.1', () => console.info(`Production preview: http://127.0.0.1:${port}`));
