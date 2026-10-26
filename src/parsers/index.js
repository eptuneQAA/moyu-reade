import fs from 'node:fs';
import path from 'node:path';
import { parseTxt } from './txt.js';
import { parseEpub } from './epub.js';
import { parsePdf } from './pdf.js';
import { parseMarkdown } from './markdown.js';
import { ParseError } from './error.js';

export function parseFile(file) {
  if (!fs.existsSync(file)) throw new ParseError(`文件不存在：${file}`);
  const ext = path.extname(file).toLowerCase();
  if (ext === '.txt') return parseTxt(file);
  if (ext === '.epub') return parseEpub(file);
  if (ext === '.pdf') return parsePdf(file);
  if (ext === '.md') return parseMarkdown(file);
  throw new ParseError(`不支持的格式：${ext || '未知'}`);
}
