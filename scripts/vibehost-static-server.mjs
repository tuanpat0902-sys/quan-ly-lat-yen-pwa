import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const port = Number.parseInt(process.env.PORT || '3000', 10);
const host = process.env.HOST || '0.0.0.0';

const contentTypes = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.html', 'text/html; charset=utf-8'],
  ['.ico', 'image/x-icon'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.map', 'application/json; charset=utf-8'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml; charset=utf-8'],
  ['.txt', 'text/plain; charset=utf-8'],
  ['.webmanifest', 'application/manifest+json; charset=utf-8'],
  ['.woff', 'font/woff'],
  ['.woff2', 'font/woff2'],
]);

function sendText(response, statusCode, body) {
  response.writeHead(statusCode, {
    'Cache-Control': 'no-store',
    'Content-Type': 'text/plain; charset=utf-8',
  });
  response.end(body);
}

async function findFile(pathname) {
  const relativePath = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  const candidate = resolve(root, relativePath);
  if (candidate !== root && !candidate.startsWith(`${root}${sep}`)) return null;

  try {
    const details = await stat(candidate);
    if (details.isFile()) return { path: candidate, size: details.size };
    if (details.isDirectory()) {
      const indexPath = resolve(candidate, 'index.html');
      const indexDetails = await stat(indexPath);
      if (indexDetails.isFile()) return { path: indexPath, size: indexDetails.size };
    }
  } catch {
    return null;
  }
  return null;
}

const server = createServer(async (request, response) => {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.setHeader('Allow', 'GET, HEAD');
    return sendText(response, 405, 'Method Not Allowed');
  }

  let pathname;
  try {
    pathname = decodeURIComponent(new URL(request.url || '/', 'http://localhost').pathname);
  } catch {
    return sendText(response, 400, 'Bad Request');
  }

  if (pathname === '/healthz') return sendText(response, 200, 'ok');

  const file = await findFile(pathname);
  if (!file) return sendText(response, 404, 'Not Found');

  const extension = extname(file.path).toLowerCase();
  response.writeHead(200, {
    'Cache-Control': /(?:index\.html|sw\.js|manifest\.webmanifest)$/.test(file.path)
      ? 'no-cache'
      : 'public, max-age=3600',
    'Content-Length': file.size,
    'Content-Type': contentTypes.get(extension) || 'application/octet-stream',
    'X-Content-Type-Options': 'nosniff',
  });
  if (request.method === 'HEAD') return response.end();
  createReadStream(file.path).pipe(response);
});

server.listen(port, host, () => {
  console.log(`Static PWA server listening on http://${host}:${port}`);
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
