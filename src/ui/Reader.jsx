import React from 'react';
import { Box, Text } from 'ink';
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
  const exactPercent = book.textLength
    ? (offset / book.textLength) * 100
    : 0;
  const percentText =
    exactPercent <= 0
      ? '0'
      : exactPercent < 0.1
        ? '<0.1'
        : exactPercent < 1
          ? exactPercent.toFixed(1)
          : String(Math.min(100, Math.round(exactPercent)));
  const totalPages = Math.max(1, Math.ceil(rows.length / pageHeight));
  const currentPage = Math.min(
    totalPages,
    Math.floor(rowIndex / pageHeight) + 1
  );
  const barWidth = Math.max(8, Math.min(24, width - 8));
  const filled =
    exactPercent > 0
      ? Math.max(1, Math.round((exactPercent / 100) * barWidth))
      : 0;
  const titleWidth = Math.max(6, Math.floor(width * 0.32));
  const chapterWidth = Math.max(8, width - titleWidth - 2);
  const hints =
    width >= 79
      ? 'Space/↑↓ 翻页  j/k 滚动  g 目录  / 搜索  S 设置  a 自动  ~ 伪装  ? 帮助  q 退出'
      : width >= 70
        ? '空格/↑↓ 翻页  j/k 滚动  g 目录  / 搜索  S 设置  ~ 伪装  ? 帮助  q 退出'
        : width >= 52
          ? '空格/↑↓ 翻页  g 目录  / 搜索  S 设置  ? 帮助  q 退出'
          : width >= 36
            ? '空格/↑↓ 翻页  g 目录  ? 帮助  q 退出'
            : '空格/↑↓ 翻页  ? 帮助  q 退出';

  return (
    <Box flexDirection="column" width={width} marginLeft={pad}>
      {config.showChapterTitle ? (
        <>
          <Box justifyContent="space-between" width={width}>
            <Text color={theme.dim}>
              {truncateToWidth(book.title, titleWidth)}
            </Text>
            <Text color={theme.dim}>
              {truncateToWidth(chapter ? chapter.title : '', chapterWidth)}
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
            : `第 ${currentPage} 页 / 共 ${totalPages} 页   ${percentText}%${
                autoPage ? '   自动翻页' : ''
              }`}
        </Text>
      </Box>

      {config.showFooter ? (
        <Text color={theme.dim} wrap="truncate-end">
          {hints}
        </Text>
      ) : null}
    </Box>
  );
}
