import fs from 'node:fs';
import path from 'node:path';
import { decodeBuffer } from './txt.js';
import { cleanTitle } from './text.js';
import { ParseError } from './error.js';

const HEADING_RE = /^(#{1,6})\s+(.+?)\s*#*\s*$/;

export function stripMarkdownInline(text) {
  return text
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/[*_`~]/g, '')
    .trim();
}

function stripFrontMatter(lines) {
  if (lines.length === 0 || lines[0].trim() !== '---') return lines;
  for (let index = 1; index < Math.min(lines.length, 100); index++) {
    if (lines[index].trim() === '---') {
      return lines.slice(index + 1);
    }
  }
  return lines;
}

export function detectMarkdownChapters(lines) {
  const chapters = [];
  for (let index = 0; index < lines.length; index++) {
    const match = lines[index].match(HEADING_RE);
    if (!match) continue;
    const title = stripMarkdownInline(match[2]);
    if (title) {
      chapters.push({ title: title.slice(0, 80), startLine: index });
    }
  }
  return chapters;
}

export function parseMarkdown(file) {
  const buffer = fs.readFileSync(file);
  let lines = decodeBuffer(buffer)
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => line.replace(/[ \t]+$/g, ''));

  lines = stripFrontMatter(lines);
  while (lines.length > 0 && lines[0].trim() === '') lines.shift();
  while (lines.length > 0 && lines[lines.length - 1].trim() === '') {
    lines.pop();
  }
  if (lines.length === 0) throw new ParseError('文件内容为空');

  let title = cleanTitle(path.basename(file, path.extname(file)));
  for (const line of lines) {
    const match = line.match(/^#\s+(.+?)\s*#*\s*$/);
    if (match) {
      const heading = stripMarkdownInline(match[1]);
      if (heading) title = heading;
      break;
    }
  }

  let chapters = detectMarkdownChapters(lines);
  if (chapters.length < 2) {
    chapters = [{ title, startLine: 0 }];
  }

  return {
    title,
    author: null,
    format: 'md',
    sourcePath: path.resolve(file),
    lines,
    chapters,
    pageStarts: null
  };
}
