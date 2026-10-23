import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { detectChapterStarts } from './text.js';
import { ParseError } from './error.js';

export function parsePdfText(raw) {
  const pages = raw.replace(/\r\n?/g, '\n').split('\f');
  const lines = [];
  const pageStarts = [];

  for (const page of pages) {
    const pageLines = page
      .split('\n')
      .map((line) => line.replace(/[ \t]+$/g, ''));
    while (
      pageLines.length > 0 &&
      pageLines[pageLines.length - 1].trim() === ''
    ) {
      pageLines.pop();
    }
    pageStarts.push(lines.length);
    lines.push(...pageLines);
  }
  while (lines.length > 0 && lines[lines.length - 1].trim() === '') lines.pop();

  if (lines.every((line) => line.trim() === '')) {
    throw new ParseError('该 PDF 无文字层（可能是扫描版），暂不支持');
  }

  const starts = detectChapterStarts(lines);
  let chapters;
  if (starts.length >= 2) {
    chapters = starts;
  } else {
    chapters = [];
    for (let i = 0; i < pages.length; i += 10) {
      chapters.push({
        title: `第 ${i + 1}-${Math.min(i + 10, pages.length)} 页`,
        startLine: pageStarts[i] ?? lines.length
      });
    }
  }

  return { lines, chapters, pageStarts };
}

export function parsePdf(file) {
  let raw;
  try {
    raw = execFileSync(
      'pdftotext',
      ['-layout', '-enc', 'UTF-8', file, '-'],
      { maxBuffer: 1024 * 1024 * 1024 }
    ).toString('utf8');
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new ParseError('未找到 pdftotext，请先安装 poppler-utils');
    }
    throw new ParseError(
      `PDF 解析失败：${String(error.message).split('\n')[0]}`
    );
  }

  const parsed = parsePdfText(raw);
  return {
    title: path.basename(file, path.extname(file)),
    author: null,
    format: 'pdf',
    sourcePath: path.resolve(file),
    lines: parsed.lines,
    chapters: parsed.chapters,
    pageStarts: parsed.pageStarts
  };
}
