const CHAPTER_RE =
  /^\s*(第[0-9零一二三四五六七八九十百千万两]+[章节回卷集部篇][^\n]{0,40}|序章[^\n]{0,40}|楔子[^\n]{0,40}|番外[^\n]{0,40})\s*$/;

const NAMED_ENTITIES = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  ldquo: '\u201c',
  rdquo: '\u201d',
  lsquo: '\u2018',
  rsquo: '\u2019',
  hellip: '\u2026',
  mdash: '\u2014',
  ndash: '\u2013'
};

export function decodeEntities(text) {
  return text.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (match, body) => {
    if (body[0] === '#') {
      const hex = body[1] && body[1].toLowerCase() === 'x';
      const code = parseInt(hex ? body.slice(2) : body.slice(1), hex ? 16 : 10);
      if (!Number.isFinite(code) || code < 0 || code > 0x10ffff) return match;
      try {
        return String.fromCodePoint(code);
      } catch {
        return match;
      }
    }
    return NAMED_ENTITIES[body.toLowerCase()] ?? match;
  });
}

export function htmlToLines(html) {
  let text = html.replace(
    /<\s*(script|style)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi,
    ''
  );
  text = text.replace(/<\s*br\s*\/?>/gi, '\n');
  text = text.replace(
    /<\s*\/\s*(p|div|h[1-6]|li|tr|section|article|blockquote)\s*>/gi,
    '\n'
  );
  text = text.replace(/<[^>]+>/g, '');
  text = decodeEntities(text);
  text = text.replace(/\r\n?/g, '\n');

  const out = [];
  for (const raw of text.split('\n')) {
    const line = raw.replace(/[ \t]+$/g, '').replace(/^[ \t]+/g, '');
    if (line.trim() === '') {
      if (out.length > 0 && out[out.length - 1] !== '') out.push('');
    } else {
      out.push(line);
    }
  }
  while (out.length > 0 && out[out.length - 1] === '') out.pop();
  return out;
}

export function cleanTitle(raw) {
  const original = String(raw || '').trim();
  let text = original;

  const quoted = text.match(/^\u300a([^\u300b]+)\u300b/);
  if (quoted) text = quoted[1].trim();

  const cut = text.search(/[\u005b\u3010]/);
  if (cut > 1) text = text.slice(0, cut).trim();

  text = text
    .replace(
      /\s*[\uff08(](全本|完结|校对|精校|番外|TXT)[^\uff09)]*[\uff09)]\s*$/iu,
      ''
    )
    .replace(/\s*作者[:：].*$/u, '')
    .trim();

  return text || original;
}

export function detectChapterStarts(lines) {
  const chapters = [];
  for (let i = 0; i < lines.length; i++) {
    const title = lines[i].trim();
    if (title && CHAPTER_RE.test(title)) {
      chapters.push({ title: title.slice(0, 40), startLine: i });
    }
  }
  return chapters;
}

export function splitChapters(lines, fallbackEvery = 3000) {
  const starts = detectChapterStarts(lines);
  if (starts.length < 2) {
    const chapters = [];
    for (let i = 0; i < lines.length; i += fallbackEvery) {
      chapters.push({ title: `分卷 ${chapters.length + 1}`, startLine: i });
    }
    return chapters.length > 0 ? chapters : [{ title: '正文', startLine: 0 }];
  }

  const chapters = [];
  if (starts[0].startLine > 0) chapters.push({ title: '前言', startLine: 0 });
  for (let i = 0; i < starts.length; i++) {
    const next = starts[i + 1] ? starts[i + 1].startLine : lines.length;
    if (next - starts[i].startLine > 1) chapters.push(starts[i]);
  }
  return chapters.length > 0 ? chapters : [{ title: '正文', startLine: 0 }];
}
