import React from 'react';
import { Box, Text } from 'ink';

const KEYS = [
  ['Space / PgDn / f', '下一页'],
  ['b / PgUp', '上一页'],
  ['j / k', '下 / 上滚动一行'],
  ['d / u', '下 / 上半页'],
  ['n / p', '下一章 / 上一章'],
  ['g', '目录'],
  ['/', '全文搜索'],
  ['s', '书架'],
  ['S 或 ,', '设置'],
  ['a', '自动翻页开关'],
  ['+ / -', '自动翻页间隔 -/+ 5 秒'],
  ['[ / ]', '每行字数 -/+ 10 列'],
  ['{ / }', '每页行数 -/+ 1'],
  ['t / h', '隐藏书名章节 / 页脚'],
  ['~', '伪装界面'],
  ['q', '退出']
];

export default function Help({ width, pad }) {
  return (
    <Box
      flexDirection="column"
      width={width}
      marginLeft={pad}
      borderStyle="round"
      paddingX={1}
    >
      <Text bold color="cyan">快捷键</Text>
      {KEYS.map(([key, description]) => (
        <Text key={key}>
          {key.padEnd(20)} {description}
        </Text>
      ))}
      <Text dimColor>任意键关闭</Text>
    </Box>
  );
}
