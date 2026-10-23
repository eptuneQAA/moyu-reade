import React from 'react';
import { Box, Text } from 'ink';
import { SETTINGS } from '../core/settings.js';

function valueLabel(config, key, autoLines) {
  if (key === 'charsPerLine') {
    const value = config.charsPerLine;
    return `${value} 列（约 ${Math.floor(value / 2)} 汉字）`;
  }
  if (key === 'linesPerPage') {
    const value = config.linesPerPage;
    if (value === 0) return `自适应（${autoLines} 行）`;
    const charsPerPage = Math.floor(config.charsPerLine / 2) * value;
    return `${value} 行（每页约 ${charsPerPage} 字）`;
  }
  return `${config.autoPageSeconds} 秒`;
}

export default function Settings({ config, cursor, autoLines, width, pad }) {
  return (
    <Box
      flexDirection="column"
      width={width}
      marginLeft={pad}
      borderStyle="round"
      paddingX={1}
    >
      <Text bold color="cyan">阅读设置</Text>
      {SETTINGS.map((setting, index) => (
        <Text key={setting.key} inverse={index === cursor}>
          {index === cursor ? '> ' : '  '}
          {setting.label}：{valueLabel(config, setting.key, autoLines)}
        </Text>
      ))}
      <Text dimColor>↑/↓ 选择  ←/→ 调整  Esc 保存并关闭</Text>
    </Box>
  );
}
