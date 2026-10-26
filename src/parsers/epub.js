import AdmZip from 'adm-zip';
import path from 'node:path';
import {
  cleanTitle,
  decodeEntities,
  htmlToLines,
  splitChapters
} from './text.js';
import { ParseError } from './error.js';

function attrs(tag) {
  const out = {};
  for (const match of tag.matchAll(/([\w:.-]+)\s*=\s*"([^"]*)"/g)) {
    out[match[1]] = match[2];
  }
  return out;
}

function textOf(fragment) {
  return decodeEntities(fragment.replace(/<[^>]+>/g, '')).trim();
}

function resolveHref(baseFile, href) {
  const clean = decodeURIComponent(href.split('#')[0]);
  return path.posix.normalize(
    path.posix.join(path.posix.dirname(baseFile), clean)
  );
}

function readToc(zip, opfPath, manifest) {
  const navItem = Object.values(manifest).find((item) =>
    (item.properties || '').split(/\s+/).includes('nav')
  );
  if (navItem) {
    const navPath = resolveHref(opfPath, navItem.href);
    const entry = zip.getEntry(navPath);
    if (entry) {
      const html = entry.getData().toString('utf8');
      const entries = [];
      for (const match of html.matchAll(
        /<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi
      )) {
        const title = textOf(match[2]);
        if (title) {
          entries.push({ href: resolveHref(navPath, match[1]), title });
        }
      }
      if (entries.length > 0) return entries;
    }
  }

  const ncxItem = Object.values(manifest).find(
    (item) => item['media-type'] === 'application/x-dtbncx+xml'
  );
  if (ncxItem) {
    const ncxPath = resolveHref(opfPath, ncxItem.href);
    const entry = zip.getEntry(ncxPath);
    if (entry) {
      const xml = entry.getData().toString('utf8');
      const entries = [];
      const re =
        /<navPoint\b[\s\S]*?<text>([\s\S]*?)<\/text>[\s\S]*?<content\b[^>]*src="([^"]+)"/gi;
      for (const match of xml.matchAll(re)) {
        const title = textOf(match[1]);
        if (title) {
          entries.push({ href: resolveHref(ncxPath, match[2]), title });
        }
      }
      return entries;
    }
  }

  return [];
}

function openEpub(file) {
  let zip;
  try {
    zip = new AdmZip(file);
  } catch (error) {
    throw new ParseError(`EPUB 解析失败：${error.message}`);
  }

  const containerEntry = zip.getEntry('META-INF/container.xml');
  if (!containerEntry) throw new ParseError('EPUB 缺少 META-INF/container.xml');
  const container = containerEntry.getData().toString('utf8');
  const rootMatch = container.match(/<rootfile\b[^>]*full-path="([^"]+)"/i);
  if (!rootMatch) throw new ParseError('EPUB container.xml 缺少 rootfile');

  const opfPath = decodeURIComponent(rootMatch[1]);
  const opfEntry = zip.getEntry(opfPath);
  if (!opfEntry) throw new ParseError('EPUB 找不到 OPF 文件');
  const opf = opfEntry.getData().toString('utf8');

  const titleMatch = opf.match(/<dc:title\b[^>]*>([\s\S]*?)<\/dc:title>/i);
  const authorMatch = opf.match(/<dc:creator\b[^>]*>([\s\S]*?)<\/dc:creator>/i);
  const title = titleMatch
    ? cleanTitle(textOf(titleMatch[1]))
    : cleanTitle(path.basename(file, path.extname(file)));
  const author = authorMatch ? textOf(authorMatch[1]) : null;

  const manifest = {};
  for (const match of opf.matchAll(/<item\b[^>]*\/?>/gi)) {
    const item = attrs(match[0]);
    if (item.id && item.href) manifest[item.id] = item;
  }

  const spineBlock = opf.match(/<spine\b[^>]*>([\s\S]*?)<\/spine>/i);
  const spine = spineBlock
    ? [...spineBlock[1].matchAll(/<itemref\b[^>]*\/?>/gi)]
        .map((match) => attrs(match[0]).idref)
        .filter(Boolean)
    : [];
  if (spine.length === 0) throw new ParseError('EPUB spine 为空');

  return { zip, opfPath, opf, manifest, spine, title, author };
}

function findCoverItem(opf, manifest) {
  const meta = opf.match(
    /<meta\b[^>]*name="cover"[^>]*content="([^"]+)"/i
  );
  if (meta && manifest[meta[1]]) return manifest[meta[1]];

  const byProperty = Object.values(manifest).find((item) =>
    (item.properties || '').split(/\s+/).includes('cover-image')
  );
  if (byProperty) return byProperty;

  return (
    Object.values(manifest).find(
      (item) =>
        /^image\//.test(item['media-type'] || '') &&
        /cover/i.test(`${item.id} ${item.href}`)
    ) || null
  );
}

export function readEpubMetadata(file) {
  const { opfPath, opf, manifest, title, author } = openEpub(file);
  const cover = findCoverItem(opf, manifest);
  return {
    title,
    author,
    coverPath: cover ? resolveHref(opfPath, cover.href) : null,
    coverMime: cover ? cover['media-type'] || 'image/jpeg' : null
  };
}

export function readEpubCover(file) {
  const { zip, opfPath, opf, manifest } = openEpub(file);
  const cover = findCoverItem(opf, manifest);
  if (!cover) return null;
  const entry = zip.getEntry(resolveHref(opfPath, cover.href));
  if (!entry) return null;
  return {
    mime: cover['media-type'] || 'image/jpeg',
    data: entry.getData()
  };
}

export function parseEpub(file) {
  const { zip, opfPath, manifest, spine, title, author } = openEpub(file);
  const docs = [];
  const lines = [];
  for (const id of spine) {
    const item = manifest[id];
    if (!item) continue;
    const fullPath = resolveHref(opfPath, item.href);
    const entry = zip.getEntry(fullPath);
    if (!entry) continue;
    const docLines = htmlToLines(entry.getData().toString('utf8'));
    docs.push({ href: fullPath, firstLine: lines.length, titled: false });
    lines.push(...docLines, '');
  }
  while (lines.length > 0 && lines[lines.length - 1] === '') lines.pop();
  if (lines.length === 0) throw new ParseError('EPUB 正文为空');

  const toc = readToc(zip, opfPath, manifest);
  const docByHref = new Map(docs.map((doc) => [doc.href, doc]));
  const chapters = [];
  for (const entry of toc) {
    const doc = docByHref.get(entry.href);
    if (!doc || doc.titled) continue;
    doc.titled = true;
    chapters.push({ title: entry.title.slice(0, 40), startLine: doc.firstLine });
  }
  chapters.sort((a, b) => a.startLine - b.startLine);

  return {
    title: title || path.basename(file, path.extname(file)),
    author,
    format: 'epub',
    sourcePath: path.resolve(file),
    lines,
    chapters: chapters.length >= 2 ? chapters : splitChapters(lines),
    pageStarts: null
  };
}
