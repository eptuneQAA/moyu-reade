import React, { useEffect, useMemo, useState } from 'react';
import { Box, Text } from 'ink';

const FILES = [
  'src/app.tsx',
  'src/router.ts',
  'src/store.ts',
  'src/ui/theme.ts',
  'src/api/client.ts'
];

function buildLine(index, startedAt) {
  const time = new Date(startedAt + index * 850).toISOString().slice(11, 19);
  const stage = index % 7;
  if (stage === 0) {
    return { color: 'cyan', text: `[${time}] webpack 5.91.0 compiling...` };
  }
  if (stage === 1) {
    const modules = 40 + (index % 30);
    const total = 120 + (index % 40);
    return {
      color: 'gray',
      text: `[${time}]   modules ${modules}/${total}  assets ${index % 12}`
    };
  }
  if (stage === 2) {
    return {
      color: 'gray',
      text: `[${time}]   ./${FILES[index % FILES.length]} ${120 + (index % 60)} bytes`
    };
  }
  if (stage === 3) {
    return {
      color: 'yellow',
      text: `[${time}] warning: unused variable 'tmp${index}' (eslint no-unused-vars)`
    };
  }
  if (stage === 4) {
    return {
      color: 'green',
      text: `[${time}]   module ${FILES[index % FILES.length]} compiled`
    };
  }
  if (stage === 5) {
    return {
      color: 'gray',
      text: `[${time}] tsc --noEmit: checking ${(index % 9) + 1}/${(index % 9) + 9} files`
    };
  }
  return {
    color: 'green',
    text: `[${time}] webpack compiled with ${index % 4} warnings in ${1200 + (index % 1500)} ms`
  };
}

export default function Disguise({ rows }) {
  const [count, setCount] = useState(Math.max(8, rows - 2));
  const startedAt = useMemo(() => Date.now() - 3600000, []);

  useEffect(() => {
    const id = setInterval(() => setCount((value) => value + 1), 700);
    return () => clearInterval(id);
  }, []);

  const lines = useMemo(
    () =>
      Array.from({ length: count }, (_, index) =>
        buildLine(index, startedAt)
      ).slice(-(rows - 1)),
    [count, rows, startedAt]
  );

  return (
    <Box flexDirection="column">
      {lines.map((line, index) => (
        <Text key={index} color={line.color} wrap="truncate-end">
          {line.text}
        </Text>
      ))}
    </Box>
  );
}
