import React from 'react';
import { Box, Text } from 'ink';

export default function Search({
  query,
  results,
  cursor,
  chapters,
  width,
  pad,
  theme
}) {
  const windowSize = 10;
  let start = Math.max(0, cursor - Math.floor(windowSize / 2));
  start = Math.min(start, Math.max(0, results.length - windowSize));
  const visible = results.slice(start, start + windowSize);

  return (
    <Box
      flexDirection="column"
      width={width}
      marginLeft={pad}
      borderStyle="round"
      borderColor={theme.track}
      paddingX={1}
    >
      <Text bold color={theme.accent}>
        搜索：{query || '（输入关键词）'}
      </Text>
      {query && results.length === 0 ? (
        <Text color={theme.dim}>没有匹配</Text>
      ) : null}
      {visible.map((result, index) => {
        const absolute = start + index;
        const chapter = chapters[result.chapterIndex];
        return (
          <Text
            key={`${result.offset}-${index}`}
            color={theme.foreground}
            inverse={absolute === cursor}
            wrap="truncate-end"
          >
            {chapter ? `[${chapter.title}] ` : ''}
            {result.snippet}
          </Text>
        );
      })}
      <Text color={theme.dim}>输入关键词  ↑/↓ 选择  Enter 跳转  Esc 关闭</Text>
    </Box>
  );
}
