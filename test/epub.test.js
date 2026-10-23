import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import AdmZip from 'adm-zip';
import { parseEpub } from '../src/parsers/epub.js';

function makeEpub(file) {
  const zip = new AdmZip();
  zip.addFile('mimetype', Buffer.from('application/epub+zip'));
  zip.addFile(
    'META-INF/container.xml',
    Buffer.from(
      '<?xml version="1.0"?><container><rootfiles>' +
        '<rootfile full-path="OEBPS/content.opf" ' +
        'media-type="application/oebps-package+xml"/></rootfiles></container>'
    )
  );
  zip.addFile(
    'OEBPS/content.opf',
    Buffer.from(
      '<?xml version="1.0"?><package><metadata>' +
        '<dc:title>测试书</dc:title><dc:creator>作者甲</dc:creator>' +
        '</metadata><manifest>' +
        '<item id="c1" href="ch1.xhtml" media-type="application/xhtml+xml"/>' +
        '<item id="c2" href="ch2.xhtml" media-type="application/xhtml+xml"/>' +
        '<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>' +
        '</manifest><spine><itemref idref="c1"/><itemref idref="c2"/></spine></package>'
    )
  );
  zip.addFile(
    'OEBPS/nav.xhtml',
    Buffer.from(
      '<html><body><nav><ol>' +
        '<li><a href="ch1.xhtml">第一章 开始</a></li>' +
        '<li><a href="ch2.xhtml">第二章 继续</a></li>' +
        '</ol></nav></body></html>'
    )
  );
  zip.addFile(
    'OEBPS/ch1.xhtml',
    Buffer.from('<html><body><h1>第一章 开始</h1><p>正文一</p></body></html>')
  );
  zip.addFile(
    'OEBPS/ch2.xhtml',
    Buffer.from('<html><body><h1>第二章 继续</h1><p>正文二</p></body></html>')
  );
  zip.writeZip(file);
}

function tmpEpub() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'moyu-epub-'));
  const file = path.join(dir, 'book.epub');
  makeEpub(file);
  return file;
}

test('parseEpub reads metadata, chapters and text', () => {
  const book = parseEpub(tmpEpub());
  assert.equal(book.title, '测试书');
  assert.equal(book.author, '作者甲');
  assert.equal(book.format, 'epub');
  assert.deepEqual(
    book.chapters.map((c) => c.title),
    ['第一章 开始', '第二章 继续']
  );
  assert.deepEqual(
    book.chapters.map((c) => c.startLine),
    [0, 3]
  );
  assert.ok(book.lines.includes('正文一'));
  assert.ok(book.lines.includes('正文二'));
});

test('parseEpub rejects a broken archive', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'moyu-epub-bad-'));
  const file = path.join(dir, 'bad.epub');
  fs.writeFileSync(file, 'not a zip');
  assert.throws(() => parseEpub(file), /container|EPUB/);
});
