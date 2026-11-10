// 排版性能基准：node scripts/bench-layout.mjs
// 用来验证 TUI 全量排版的耗时，改动 buildRows/layout 前后对比。
import { createBook, layout, layoutCached } from '../src/core/book.js';

const LINE =
  '这是一段用于测试排版性能的中文正文，长度大约四十个字，用来模拟真实小说的段落。';

function makeBook(mb) {
  const target = mb * 1024 * 1024;
  const lines = [];
  let total = 0;
  while (total < target) {
    lines.push(LINE);
    total += LINE.length + 1;
  }
  const chapters = [];
  for (let i = 0; i < lines.length; i += 2000) {
    chapters.push({ index: chapters.length, title: `第 ${chapters.length + 1} 章`, startLine: i });
  }
  return createBook({ name: 'bench', format: 'txt', title: 'bench', lines, chapters });
}

for (const mb of [1, 5, 15]) {
  const book = makeBook(mb);
  const chapterStarts = new Set(book.chapters.map((chapter) => chapter.startLine));

  const t0 = performance.now();
  const rows = layout(book, 80, { indent: true, chapterStarts });
  const t1 = performance.now();

  layoutCached(book, 80, { indent: true, chapterStarts });
  const t2 = performance.now();
  layoutCached(book, 80, { indent: true, chapterStarts });
  const t3 = performance.now();

  console.log(
    `${mb}MB 行数=${book.lines.length} 行数据=${rows.length} ` +
      `首次排版=${(t1 - t0).toFixed(0)}ms 缓存命中=${(t3 - t2).toFixed(2)}ms ` +
      `堆内存≈${(process.memoryUsage().heapUsed / 1048576).toFixed(0)}MB`
  );
}
