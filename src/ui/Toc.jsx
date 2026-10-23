import React from 'react';
import { Box, Text } from 'ink';

export default function Toc({ chapters, cursor, width, pad, theme }) {
  const windowSize = 15;
  let start = Math.max(0, cursor - Math.floor(windowSize / 2));
  start = Math.min(start, Math.max(0, chapters.length - windowSize));
  const visible = chapters.slice(start, start + windowSize);

  return (
    <Box
      flexDirection="column"
      width={width}
      marginLeft={pad}
      borderStyle="round"
      borderColor={theme.track}
      paddingX={1}
    >
      <Text bold color={theme.accent}>目录（{chapters.length} 章）</Text>
      {visible.map((chapter, index) => {
        const absolute = start + index;
        return (
          <Text
            key={chapter.startLine}
            color={theme.foreground}
            inverse={absolute === cursor}
            wrap="truncate-end"
          >
            {absolute === cursor ? '> ' : '  '}
            {chapter.title}
          </Text>
        );
      })}
      <Text color={theme.dim}>j/k 选择  Enter 跳转  Esc 关闭</Text>
    </Box>
  );
}
