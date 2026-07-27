import { readdir, readFile, writeFile, mkdir, copyFile, rm, stat } from 'node:fs/promises';
import { existsSync, watch } from 'node:fs';
import { join, extname, basename, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname as pdirname } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = pdirname(__filename);
const SRC = join(__dirname, 'src');
const DIST = join(__dirname, 'dist');
const PARTIALS_DIR = join(SRC, '_partials');
const SITE_URL = 'https://campogirasoles.org';
const STATIC_DIRS = ['css', 'js', 'assets'];

// --- Minificadores (carga perezosa, solo en build, no en --watch en caliente por rendimiento) ---
let minifyCss, minifyHtml;
async function loadMinifiers() {
  if (minifyCss && minifyHtml) return;
  ({ minify: minifyCss } = await import('csso'));
  ({ minify: minifyHtml } = await import('html-minifier-terser'));
}

async function loadPartials() {
  const partials = {};
  const files = await readdir(PARTIALS_DIR);
  for (const f of files) {
    if (f.endsWith('.html')) {
      const name = basename(f, '.html');
      partials[name] = await readFile(join(PARTIALS_DIR, f), 'utf8');
    }
  }
  return partials;
}

function applyIncludes(html, partials) {
  return html.replace(/<!--\s*include:(\w+)\s*-->/g, (m, name) => partials[name] || m);
}

async function processHtmlFile(srcPath, relPath, partials) {
  let html = await readFile(srcPath, 'utf8');
  // Guardián de codificación: si el archivo fuente no es UTF-8 válido
  // (p. ej. quedó guardado en Windows-1252), abortamos con un mensaje claro
  // en vez de publicar caracteres rotos («�») en producción.
  if (html.includes('�')) {
    throw new Error(
      `Codificación inválida en ${srcPath}: contiene caracteres de reemplazo (\\uFFFD). ` +
      `Vuelve a guardar el archivo como UTF-8 (sin BOM).`
    );
  }
  html = applyIncludes(html, partials);
  // Minificar HTML
  html = await minifyHtml(html, {
    collapseWhitespace: true,
    removeComments: true,
    removeRedundantAttributes: true,
    removeEmptyAttributes: true,
    minifyCSS: true,
    minifyJS: true,
    sortAttributes: true,
    sortClassName: true,
    // No tocar el HTML de los formularios (Netlify necesita name/data-*)
    ignoreCustomComments: [/^include:/, /^ANALYTICS/, /^===/, /^BOT/, /^paypal/i, /^Cuando/i]
  });
  const outPath = join(DIST, relPath);
  await mkdir(pdirname(outPath), { recursive: true });
  await writeFile(outPath, html, 'utf8');
}

async function copyStaticDir(dirName) {
  const srcDir = join(SRC, dirName);
  if (!existsSync(srcDir)) return;
  const outDir = join(DIST, dirName);
  await copyRecursive(srcDir, outDir);
}

async function copyRecursive(src, dest) {
  const entries = await readdir(src, { withFileTypes: true });
  await mkdir(dest, { recursive: true });
  for (const e of entries) {
    const s = join(src, e.name);
    const d = join(dest, e.name);
    if (e.isDirectory()) await copyRecursive(s, d);
    else if (e.name.endsWith('.css')) {
      // Minificar CSS en copia
      const css = await readFile(s, 'utf8');
      const min = minifyCss(css).css;
      await writeFile(d, min, 'utf8');
    } else {
      await copyFile(s, d);
    }
  }
}

async function copyRootFiles() {
  const entries = await readdir(SRC, { withFileTypes: true });
  for (const e of entries) {
    if (!e.isFile()) continue;
    if (e.name.endsWith('.php') || e.name === '.htaccess' || e.name.endsWith('.webmanifest')) {
      await copyFile(join(SRC, e.name), join(DIST, e.name));
      console.log('  STATIC ->', e.name);
    }
  }
}

async function collectHtmlFiles(dir, base = '') {
  const results = [];
  const entries = await readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    if (e.name.startsWith('_')) continue;
    const full = join(dir, e.name);
    const rel = base ? `${base}/${e.name}` : e.name;
    if (e.isDirectory()) {
      if (STATIC_DIRS.includes(e.name)) continue;
      results.push(...await collectHtmlFiles(full, rel));
    } else if (e.name.endsWith('.html')) {
      results.push(rel);
    }
  }
  return results;
}

async function fileLastMod(relPath) {
  // mtime real del archivo fuente -> YYYY-MM-DD
  try {
    const s = await stat(join(SRC, relPath));
    return s.mtime.toISOString().slice(0, 10);
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

async function generateSitemap(htmlFiles) {
  const priorities = {
    'index.html': '1.0',
    'proyecto.html': '0.9',
    'problema.html': '0.8',
    'equipo.html': '0.7',
    'contacto.html': '0.7',
    'blog/index.html': '0.6'
  };

  // lastmod real por archivo (mtime del .html en src/)
  const entries = [];
  for (const f of htmlFiles) {
    if (['404.html', 'gracias.html', 'privacidad.html'].includes(f)) continue;
    const url = f.replace(/\\/g, '/')
      .replace(/index\.html$/, '')
      .replace(/\.html$/, '.html');
    const priority = priorities[f] || '0.5';
    const lastmod = await fileLastMod(f);
    entries.push(`  <url>\n    <loc>${SITE_URL}/${url}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <priority>${priority}</priority>\n  </url>`);
  }
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join('\n')}\n</urlset>`;
  await writeFile(join(DIST, 'sitemap.xml'), xml, 'utf8');
}

async function generateRobots() {
  const txt = `User-agent: *\nAllow: /\nDisallow: /gracias.html\nDisallow: /gracias\nDisallow: /privacidad.html\nDisallow: /privacidad\nDisallow: /404.html\nDisallow: /404\n\nSitemap: ${SITE_URL}/sitemap.xml`;
  await writeFile(join(DIST, 'robots.txt'), txt, 'utf8');
}

async function generateRSS() {
  // Lee los artículos del blog y genera /rss.xml para lectores de feeds.
  const blogDir = join(SRC, 'blog');
  let files = [];
  try {
    files = (await readdir(blogDir)).filter(f => /^articulo-.*\.html$/.test(f));
  } catch { return; }

  const items = [];
  for (const f of files) {
    const html = await readFile(join(blogDir, f), 'utf8');
    const pick = (re) => (html.match(re) || [])[1] || '';
    const title = pick(/property="og:title" content="([^"]*)"/) || pick(/<title>([^<]*)<\/title>/);
    const desc  = pick(/property="og:description" content="([^"]*)"/) || pick(/name="description" content="([^"]*)"/);
    const link  = pick(/rel="canonical" href="([^"]*)"/) || `${SITE_URL}/blog/${f}`;
    const date  = pick(/"datePublished":\s*"([^"]*)"/) || await fileLastMod(`blog/${f}`);
    const pubDate = new Date(date + 'T12:00:00Z').toUTCString();
    const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    items.push({ date, xml:
      `    <item>\n      <title>${esc(title)}</title>\n      <link>${link}</link>\n      <guid>${link}</guid>\n      <description>${esc(desc)}</description>\n      <pubDate>${pubDate}</pubDate>\n    </item>` });
  }
  items.sort((a, b) => b.date.localeCompare(a.date)); // más reciente primero

  const now = new Date().toUTCString();
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">\n  <channel>\n    <title>Campo de Girasoles — Blog</title>\n    <link>${SITE_URL}/blog/</link>\n    <atom:link href="${SITE_URL}/rss.xml" rel="self" type="application/rss+xml"/>\n    <description>Historias, aprendizajes y voces de los salones ludo-creativos de Campo de Girasoles en Cuba.</description>\n    <language>es</language>\n    <lastBuildDate>${now}</lastBuildDate>\n${items.map(i => i.xml).join('\n')}\n  </channel>\n</rss>`;
  await writeFile(join(DIST, 'rss.xml'), xml, 'utf8');
  console.log('  RSS ->', `rss.xml (${items.length} artículos)`);
}

async function build() {
  console.log('Construyendo Campo de Girasoles...');
  if (existsSync(DIST)) await rm(DIST, { recursive: true, force: true });
  await mkdir(DIST, { recursive: true });
  await loadMinifiers();
  const partials = await loadPartials();
  for (const dir of STATIC_DIRS) await copyStaticDir(dir);
  await copyRootFiles();
  const htmlFiles = await collectHtmlFiles(SRC);
  for (const rel of htmlFiles) {
    await processHtmlFile(join(SRC, rel), rel, partials);
    console.log('  HTML ->', rel);
  }
  await generateSitemap(htmlFiles);
  await generateRobots();
  await generateRSS();
  console.log('OK. Generado en dist/');
}

const isWatch = process.argv.includes('--watch');
if (isWatch) {
  await build();
  console.log('Observando cambios...');
  watch(SRC, { recursive: true }, async () => {
    try { await build(); } catch (e) { console.error(e); }
  });
} else {
  await build();
}
