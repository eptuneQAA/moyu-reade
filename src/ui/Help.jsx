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
  ['t / h', '隐藏页眉 / 快捷键提示'],
  ['~', '伪装界面'],
  ['q', '退出']
];

export default function Help({ width, pad, theme }) {
  return (
    <Box
      flexDirection="column"
      width={width}
      marginLeft={pad}
      borderStyle="round"
      borderColor={theme.track}
      paddingX={1}
    >
      <Text bold color={theme.accent}>快捷键</Text>
      {KEYS.map(([key, description]) => (
        <Text key={key} color={theme.foreground}>
          {key.padEnd(20)} {description}
        </Text>
      ))}
      <Text color={theme.dim}>任意键关闭</Text>
    </Box>
  );
}
