import React from 'react';
import { Box, Text } from 'ink';

export default function Shelf({ items, cursor, height, toast }) {
  const visibleCount = Math.max(3, height - 5);
  let start = Math.max(0, cursor - Math.floor(visibleCount / 2));
  if (start + visibleCount > items.length) {
    start = Math.max(0, items.length - visibleCount);
  }
  const visible = items.slice(start, start + visibleCount);

  return (
    <Box flexDirection="column">
      <Text bold color="cyan">moyu 书架</Text>
      {items.length === 0 ? (
        <Text dimColor>
          没有找到书。把 txt/epub/pdf 放到 ~/Documents/Books 或 ~/Downloads。
        </Text>
      ) : (
        visible.map((item, index) => {
          const absolute = start + index;
          const entry = item.progress;
          return (
            <Text
              key={item.path}
              inverse={absolute === cursor}
              color={item.missing ? 'red' : undefined}
              wrap="truncate-end"
            >
              {absolute === cursor ? '> ' : '  '}
              {item.title}  [{item.format}]
              {entry ? `  ${entry.percent}%` : ''}
              {item.missing ? '  (文件缺失)' : ''}
            </Text>
          );
        })
      )}
      <Text dimColor>j/k 选择  Enter 打开  r 重新扫描  q 退出</Text>
      {toast ? <Text color="yellow">{toast}</Text> : null}
    </Box>
  );
}
