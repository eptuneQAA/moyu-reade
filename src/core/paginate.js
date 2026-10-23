export function charWidth(ch) {
  const cp = ch.codePointAt(0);
  if (cp === 0 || cp < 32) return 0;
  if (cp >= 0x0300 && cp <= 0x036f) return 0;
  if (
    cp >= 0x1100 &&
    (cp <= 0x115f ||
      cp === 0x2329 ||
      cp === 0x232a ||
      (cp >= 0x2e80 && cp <= 0xa4cf && cp !== 0x303f) ||
      (cp >= 0xac00 && cp <= 0xd7a3) ||
      (cp >= 0xf900 && cp <= 0xfaff) ||
      (cp >= 0xfe10 && cp <= 0xfe19) ||
      (cp >= 0xfe30 && cp <= 0xfe6f) ||
      (cp >= 0xff00 && cp <= 0xff60) ||
      (cp >= 0xffe0 && cp <= 0xffe6) ||
      (cp >= 0x1f300 && cp <= 0x1f64f) ||
      (cp >= 0x1f900 && cp <= 0x1f9ff) ||
      (cp >= 0x20000 && cp <= 0x3fffd))
  ) {
    return 2;
  }
  return 1;
}

export function wrapLine(text, width) {
  const limit = Math.max(2, width);
  const chars = [];
  let offset = 0;
  for (const ch of text) {
    chars.push({ ch, off: offset });
    offset += ch.length;
  }
  if (chars.length === 0) return [{ text: '', col: 0 }];

  const rows = [];
  let i = 0;
  while (i < chars.length) {
    if (rows.length > 0) {
      while (i < chars.length && chars[i].ch === ' ') i++;
      if (i >= chars.length) break;
    }

    let row = '';
    let used = 0;
    let j = i;
    let lastSpaceChar = -1;
    let lastSpaceUnits = -1;

    while (j < chars.length) {
      const w = charWidth(chars[j].ch);
      if (row !== '' && used + w > limit) break;
      if (chars[j].ch === ' ') {
        lastSpaceChar = j;
        lastSpaceUnits = row.length;
      }
      row += chars[j].ch;
      used += w;
      j++;
    }

    if (j < chars.length && lastSpaceChar > i) {
      const next = chars[j].ch;
      const prev = chars[j - 1].ch;
      if (/[A-Za-z0-9]/.test(next) && /[A-Za-z0-9]/.test(prev)) {
        row = row.slice(0, lastSpaceUnits);
        j = lastSpaceChar + 1;
      }
    }

    rows.push({ text: row.replace(/[ \t]+$/g, ''), col: chars[i].off });
    i = Math.max(j, i + 1);
  }
  return rows.length > 0 ? rows : [{ text: '', col: 0 }];
}

export function buildRows(lines, width, lineStarts, options = {}) {
  const rows = [];
  const chapterStarts = options.chapterStarts;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const indent =
      options.indent &&
      line.trim() !== '' &&
      !(chapterStarts && chapterStarts.has(i))
        ? '\u3000\u3000'
        : '';
    for (const row of wrapLine(indent + line, width)) {
      rows.push({
        text: row.text,
        start: lineStarts[i] + Math.max(0, row.col - indent.length),
        line: i
      });
    }
  }
  return rows;
}

export function offsetToRow(rows, offset) {
  if (rows.length === 0) return 0;
  let low = 0;
  let high = rows.length - 1;
  let answer = 0;
  while (low <= high) {
    const mid = (low + high) >> 1;
    if (rows[mid].start <= offset) {
      answer = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  return answer;
}

export function truncateToWidth(text, width) {
  let out = '';
  let used = 0;
  for (const ch of text) {
    const w = charWidth(ch);
    if (used + w > width) return out;
    out += ch;
    used += w;
  }
  return out;
}
