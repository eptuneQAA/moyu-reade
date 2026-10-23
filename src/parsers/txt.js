import fs from 'node:fs';
import path from 'node:path';
import iconv from 'iconv-lite';
import { cleanTitle, splitChapters } from './text.js';
import { ParseError } from './error.js';

export function decodeBuffer(buffer) {
  if (
    buffer.length >= 3 &&
    buffer[0] === 0xef &&
    buffer[1] === 0xbb &&
    buffer[2] === 0xbf
  ) {
    return buffer.subarray(3).toString('utf8');
  }
  if (buffer.length >= 2 && buffer[0] === 0xff && buffer[1] === 0xfe) {
    return iconv.decode(buffer.subarray(2), 'utf16le');
  }
  if (buffer.length >= 2 && buffer[0] === 0xfe && buffer[1] === 0xff) {
    return iconv.decode(buffer.subarray(2), 'utf16be');
  }
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buffer);
  } catch {
    return iconv.decode(buffer, 'gb18030');
  }
}

export function parseTxt(file) {
  const buffer = fs.readFileSync(file);
  const text = decodeBuffer(buffer).replace(/\r\n?/g, '\n');
  const lines = text.split('\n').map((line) => line.replace(/[ \t]+$/g, ''));
  while (lines.length > 0 && lines[lines.length - 1].trim() === '') lines.pop();
  if (lines.length === 0) throw new ParseError('文件内容为空');

  return {
    title: cleanTitle(path.basename(file, path.extname(file))),
    author: null,
    format: 'txt',
    sourcePath: path.resolve(file),
    lines,
    chapters: splitChapters(lines),
    pageStarts: null
  };
}
