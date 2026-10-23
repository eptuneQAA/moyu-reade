export const SETTINGS = [
  {
    key: 'theme',
    label: '主题',
    options: ['paper', 'night', 'opencode']
  },
  {
    key: 'charsPerLine',
    label: '每行字数',
    min: 40,
    max: 120,
    step: 10
  },
  {
    key: 'linesPerPage',
    label: '每页行数',
    min: 0,
    max: 60,
    step: 1
  },
  {
    key: 'autoPageSeconds',
    label: '自动翻页间隔',
    min: 5,
    max: 120,
    step: 5,
    unit: '秒'
  }
];

export function adjustValue(config, key, delta, autoLines = 0) {
  const setting = SETTINGS.find((item) => item.key === key);
  if (!setting) return config[key];

  if (key === 'theme') {
    const values = setting.options;
    const current = Math.max(0, values.indexOf(config.theme));
    return values[(current + delta + values.length) % values.length];
  }

  let value = config[key];

  if (key === 'linesPerPage' && value === 0) {
    if (delta <= 0) return 0;
    value = Math.max(10, autoLines);
  } else {
    value += delta * setting.step;
  }

  if (key === 'linesPerPage' && value > 0 && value < 10) {
    value = delta > 0 ? 10 : 0;
  }

  return Math.max(setting.min, Math.min(setting.max, value));
}
