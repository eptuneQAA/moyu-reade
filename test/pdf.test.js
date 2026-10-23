import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { parsePdf, parsePdfText } from '../src/parsers/pdf.js';

function makePdf() {
  const objects = [];
  objects[1] = '<< /Type /Catalog /Pages 2 0 R >>';
  objects[2] = '<< /Type /Pages /Kids [3 0 R] /Count 1 >>';
  objects[3] =
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 144] ' +
    '/Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>';
  const stream = 'BT /F1 12 Tf 20 100 Td (Chapter 1) Tj ET';
  objects[4] = `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`;
  objects[5] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>';

  let out = '%PDF-1.4\n';
  const offsets = [0];
  for (let i = 1; i < objects.length; i++) {
    offsets[i] = Buffer.byteLength(out);
    out += `${i} 0 obj\n${objects[i]}\nendobj\n`;
  }
  const xref = Buffer.byteLength(out);
  out += `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
  for (let i = 1; i < objects.length; i++) {
    out += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  out +=
    `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\n` +
    `startxref\n${xref}\n%%EOF\n`;
  return Buffer.from(out);
}

test('parsePdfText splits pages and detects chapters', () => {
  const raw = '第一章 开始\n正文一\n\f第二章 继续\n正文二\n\f';
  const parsed = parsePdfText(raw);
  assert.equal(parsed.lines[0], '第一章 开始');
  assert.deepEqual(parsed.pageStarts.slice(0, 2), [0, 2]);
  assert.deepEqual(
    parsed.chapters.map((c) => c.title),
    ['第一章 开始', '第二章 继续']
  );
});

test('parsePdfText rejects empty text layer', () => {
  assert.throws(() => parsePdfText('\f\f'), /无文字层/);
});

test('parsePdf extracts text with pdftotext', (t) => {
  try {
    execFileSync('pdftotext', ['-v'], { stdio: 'ignore' });
  } catch {
    return t.skip('pdftotext not installed');
  }
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'moyu-pdf-'));
  const file = path.join(dir, 'sample.pdf');
  fs.writeFileSync(file, makePdf());
  const book = parsePdf(file);
  assert.equal(book.format, 'pdf');
  assert.match(book.lines.join('\n'), /Chapter 1/);
  assert.ok(book.chapters.length >= 1);
});
