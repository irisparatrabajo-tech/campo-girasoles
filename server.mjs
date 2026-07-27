// Servidor local simple para Campo de Girasoles — sin dependencias externas
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, resolve, normalize } from 'node:path';
import { existsSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const DIST = fileURLToPath(new URL('./dist/', import.meta.url));
const PORT = 4321;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.js':   'text/javascript; charset=utf-8',
  '.mjs':  'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg':  'image/svg+xml',
  '.webp': 'image/webp',
  '.ico':  'image/x-icon',
  '.xml':  'application/xml; charset=utf-8',
  '.txt':  'text/plain; charset=utf-8',
  '.php':  'text/plain; charset=utf-8',
  '.webmanifest': 'application/manifest+json'
};

createServer(async (req, res) => {
  try {
    let urlPath = decodeURIComponent(req.url.split('?')[0]);
    if (urlPath === '/') urlPath = '/index.html';

    // Resolver la ruta final y evitar path traversal
    const filePath = resolve(DIST, '.' + normalize(urlPath));
    if (!filePath.startsWith(DIST)) {
      res.writeHead(403);
      res.end('403 Forbidden');
      return;
    }

    // Si la ruta es un directorio, intentar /index.html dentro del mismo
    if (existsSync(filePath) && statSync(filePath).isDirectory()) {
      const dirIndex = join(filePath, 'index.html');
      if (existsSync(dirIndex) && statSync(dirIndex).isFile()) {
        const data = await readFile(dirIndex);
        res.writeHead(200, { 'Content-Type': TYPES['.html'] });
        res.end(data);
        return;
      }
      res.writeHead(403);
      res.end('403 Forbidden');
      return;
    }

    // Si no existe como archivo, intentar fallback a index.html de la raíz
    // (solo para rutas desconocidas, no para /blog/ que ya es directorio)
    if (!existsSync(filePath) || !statSync(filePath).isFile()) {
      // Probar .html implícito (URLs limpias: /problema → /problema.html)
      const withHtml = filePath + '.html';
      if (existsSync(withHtml) && statSync(withHtml).isFile()) {
        const data = await readFile(withHtml);
        res.writeHead(200, { 'Content-Type': TYPES['.html'] });
        res.end(data);
        return;
      }
      const notFound = join(DIST, '404.html');
      if (existsSync(notFound) && statSync(notFound).isFile()) {
        const data = await readFile(notFound);
        res.writeHead(404, { 'Content-Type': TYPES['.html'] });
        res.end(data);
        return;
      }
      const fallback = join(DIST, 'index.html');
      if (existsSync(fallback) && statSync(fallback).isFile()) {
        const data = await readFile(fallback);
        res.writeHead(404, { 'Content-Type': TYPES['.html'] });
        res.end(data);
        return;
      }
      res.writeHead(404);
      res.end('404 Not Found');
      return;
    }

    const data = await readFile(filePath);
    const ext = extname(filePath).toLowerCase();
    const headers = { 'Content-Type': TYPES[ext] || 'application/octet-stream' };
    // Cache para estáticos (CSS/JS/imágenes); HTML siempre fresco
    if (['.css', '.js', '.mjs', '.png', '.jpg', '.jpeg', '.svg', '.ico', '.webmanifest'].includes(ext)) {
      headers['Cache-Control'] = 'public, max-age=86400';
    } else {
      headers['Cache-Control'] = 'no-cache';
    }
    // CSP: solo fonts de Google, bloquea iframes y recursos de terceros
    headers['Content-Security-Policy'] =
      "default-src 'self'; " +
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
      "font-src 'self' https://fonts.gstatic.com data:; " +
      "img-src 'self' data:; " +
      "script-src 'self' 'unsafe-inline'; " +
      "frame-ancestors 'none';";
    headers['X-Content-Type-Options'] = 'nosniff';
    headers['Referrer-Policy'] = 'strict-origin-when-cross-origin';
    res.writeHead(200, headers);
    res.end(data);
  } catch (err) {
    res.writeHead(500);
    res.end('500 Internal Error');
  }
}).listen(PORT, () => {
  console.log(`OK — Campo de Girasoles`);
  console.log('   Abre tu navegador en:');
  console.log(`   http://localhost:${PORT}`);
  console.log('   Ctrl+C para detener.');
});
