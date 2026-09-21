import { createReadStream } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { brotliCompress, constants as zlibConstants, gzip } from 'node:zlib';
import { promisify } from 'node:util';
import { handleSnapshotApi } from './vibehost-snapshot-api.mjs';
import { handleIposBootstrap } from './vibehost-ipos-bootstrap.mjs';
import { handleAuthApi } from './vibehost-auth-api.mjs';
import { handleIngredientCategoryApi } from './vibehost-ingredient-category-api.mjs';
import { handleBusinessMutationApi } from './vibehost-business-mutation-api.mjs';
import { handleMenuSecurityApi } from './vibehost-menu-security-api.mjs';
import { handleHealthApi } from './vibehost-health-api.mjs';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const port = Number.parseInt(process.env.PORT || '3000', 10);
const host = process.env.HOST || '0.0.0.0';
const brotliAsync=promisify(brotliCompress),gzipAsync=promisify(gzip);
const compressedAssets=new Map();
const textExtensions=new Set(['.css','.html','.js','.json','.svg','.txt','.webmanifest']);

function acceptsEncoding(header,name){
  return String(header||'').split(',').some(part=>{const [encoding,...parameters]=part.trim().split(';');if(encoding.trim().toLowerCase()!==name)return false;const quality=parameters.map(value=>/^q\s*=\s*([\d.]+)/i.exec(value.trim())?.[1]).find(value=>value!==undefined);return quality===undefined||Number(quality)>0;});
}
function preferredEncoding(header){return acceptsEncoding(header,'br')?'br':acceptsEncoding(header,'gzip')?'gzip':'';}
async function compressedAsset(file,encoding){
  const key=`${file.path}:${file.mtimeMs}:${encoding}`;
  let pending=compressedAssets.get(key);
  if(!pending){
    pending=readFile(file.path).then(body=>encoding==='br'?brotliAsync(body,{params:{[zlibConstants.BROTLI_PARAM_QUALITY]:5}}):gzipAsync(body,{level:6}));
    compressedAssets.set(key,pending);
    pending.catch(()=>compressedAssets.delete(key));
  }
  return pending;
}

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
    if (details.isFile()) return { path: candidate, size: details.size, mtimeMs: details.mtimeMs };
    if (details.isDirectory()) {
      const indexPath = resolve(candidate, 'index.html');
      const indexDetails = await stat(indexPath);
      if (indexDetails.isFile()) return { path: indexPath, size: indexDetails.size, mtimeMs: indexDetails.mtimeMs };
    }
  } catch {
    return null;
  }
  return null;
}

const server = createServer(async (request, response) => {
  response.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self' data:; connect-src 'self'; worker-src 'self' blob:; manifest-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'");
  response.setHeader('Cross-Origin-Opener-Policy','same-origin');
  response.setHeader('Permissions-Policy','camera=(), microphone=(), geolocation=(), payment=()');
  response.setHeader('Referrer-Policy','strict-origin-when-cross-origin');
  response.setHeader('Strict-Transport-Security','max-age=31536000; includeSubDomains');
  response.setHeader('X-Content-Type-Options','nosniff');
  response.setHeader('X-Frame-Options','DENY');
  let pathname;
  let requestUrl;
  try {
    requestUrl = new URL(request.url || '/', 'http://localhost');
    pathname = decodeURIComponent(requestUrl.pathname);
  } catch {
    return sendText(response, 400, 'Bad Request');
  }

  if (await handleIposBootstrap(request, response, pathname)) return;
  if (await handleAuthApi(request, response, pathname)) return;
  if (await handleMenuSecurityApi(request, response, pathname)) return;
  if (await handleIngredientCategoryApi(request, response, pathname)) return;
  if (await handleBusinessMutationApi(request, response, pathname)) return;
  if (await handleHealthApi(request, response, pathname)) return;
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.setHeader('Allow', 'GET, HEAD');
    return sendText(response, 405, 'Method Not Allowed');
  }
  if (await handleSnapshotApi(request, response, pathname, requestUrl)) return;

  const file = await findFile(pathname);
  if (!file) return sendText(response, 404, 'Not Found');

  const extension = extname(file.path).toLowerCase();
  const canCompress=textExtensions.has(extension)&&file.size>=1024&&file.size<=3_000_000;
  const encoding=canCompress?preferredEncoding(request.headers['accept-encoding']):'';
  let compressed;
  if(encoding)try{compressed=await compressedAsset(file,encoding);}catch(error){console.warn('[static-compression]',error?.code||error?.message||error);}
  response.writeHead(200, {
    'Cache-Control': /(?:index\.html|sw\.js|manifest\.webmanifest)$/.test(file.path)
      ? 'no-store, max-age=0, must-revalidate'
      : requestUrl.searchParams.has('v')?'public, max-age=31536000, immutable':'public, max-age=3600',
    'Content-Length': compressed?.length||file.size,
    'Content-Type': contentTypes.get(extension) || 'application/octet-stream',
    ...(canCompress?{'Vary':'Accept-Encoding'}:{}),
    ...(compressed?{'Content-Encoding':encoding}:{}),
    'X-Content-Type-Options': 'nosniff',
  });
  if (request.method === 'HEAD') return response.end();
  if(compressed)return response.end(compressed);
  createReadStream(file.path).pipe(response);
});

await Promise.all(['br','gzip'].map(async encoding=>{
  try{const path=resolve(root,'index.html'),details=await stat(path);await compressedAsset({path,size:details.size,mtimeMs:details.mtimeMs},encoding);}catch(error){console.warn('[static-compression-warm]',error?.code||error?.message||error);}
}));
server.listen(port, host, () => {
  console.log(`Static PWA server listening on http://${host}:${server.address().port}`);
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
