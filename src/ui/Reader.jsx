import React from 'react';
import { Box, Text } from 'ink';
import { percentForOffset } from '../core/book.js';
import { truncateToWidth } from '../core/paginate.js';

export default function Reader({
  rows,
  rowIndex,
  pageHeight,
  book,
  chapter,
  offset,
  config,
  width,
  pad,
  autoPage,
  highlight
}) {
  const page = rows.slice(rowIndex, rowIndex + pageHeight);
  const percent = percentForOffset(book, offset);
  const heading = config.showChapterTitle
    ? `${truncateToWidth(book.title, 24)} · ${truncateToWidth(
        chapter ? chapter.title : '',
        30
      )}  `
    : '';

  return (
    <Box flexDirection="column" width={width} marginLeft={pad}>
      <Text dimColor wrap="truncate-end">
        {heading}
        {percent}%{autoPage ? '  [自动翻页]' : ''}
      </Text>
      <Box flexDirection="column" height={pageHeight}>
        {page.map((row, index) => (
          <Text
            key={`${row.start}-${index}`}
            wrap="truncate-end"
            inverse={Boolean(highlight && highlight.line === row.line)}
          >
            {row.text || ' '}
          </Text>
        ))}
      </Box>
      {config.showFooter ? (
        <Text dimColor wrap="truncate-end">
          Space 翻页  j/k 滚动  g 目录  / 搜索  S 设置  a 自动  ~ 伪装  ? 帮助  q 退出
        </Text>
      ) : null}
    </Box>
  );
}
