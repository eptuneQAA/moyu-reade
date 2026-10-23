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
  highlight,
  theme,
  toast
}) {
  const page = rows.slice(rowIndex, rowIndex + pageHeight);
  const percent = percentForOffset(book, offset);
  const totalPages = Math.max(1, Math.ceil(rows.length / pageHeight));
  const currentPage = Math.min(
    totalPages,
    Math.floor(rowIndex / pageHeight) + 1
  );
  const barWidth = Math.max(8, Math.min(24, width - 8));
  const filled = Math.round((percent / 100) * barWidth);
  const titleWidth = Math.max(4, Math.floor(width / 2) - 2);

  return (
    <Box flexDirection="column" width={width} marginLeft={pad}>
      {config.showChapterTitle ? (
        <>
          <Box justifyContent="space-between" width={width}>
            <Text color={theme.dim}>
              {truncateToWidth(book.title, titleWidth)}
            </Text>
            <Text color={theme.dim}>
              {truncateToWidth(chapter ? chapter.title : '', titleWidth)}
            </Text>
          </Box>
          <Text color={theme.track}>{'─'.repeat(width)}</Text>
        </>
      ) : null}

      <Box flexDirection="column" height={pageHeight} marginTop={1}>
        {page.map((row, index) => (
          <Text
            key={`${row.start}-${index}`}
            color={theme.foreground}
            wrap="truncate-end"
            inverse={Boolean(highlight && highlight.line === row.line)}
          >
            {row.text || ' '}
          </Text>
        ))}
      </Box>

      <Box flexDirection="column" alignItems="center" marginTop={1}>
        <Text>
          <Text color={theme.accent}>{'━'.repeat(filled)}</Text>
          <Text color={theme.track}>{'─'.repeat(barWidth - filled)}</Text>
        </Text>
        <Text color={toast ? theme.warn : theme.dim}>
          {toast
            ? toast
            : `第 ${currentPage} 页 / 共 ${totalPages} 页   ${percent}%${
                autoPage ? '   自动翻页' : ''
              }`}
        </Text>
      </Box>

      {config.showFooter ? (
        <Text color={theme.dim} wrap="truncate-end">
          {width >= 80
            ? 'Space/↑↓ 翻页  j/k 滚动  g 目录  / 搜索  S 设置  a 自动  ~ 伪装  ? 帮助  q 退出'
            : '空格/↑↓ 翻页  j/k 滚动  g 目录  / 搜索  S 设置  ~ 伪装  ? 帮助  q 退出'}
        </Text>
      ) : null}
    </Box>
  );
}
