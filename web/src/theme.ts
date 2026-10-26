import type { ThemeName } from './types';

export interface ThemeOption {
  value: ThemeName;
  label: string;
  bg: string;
  fg: string;
  accent: string;
}

export const THEME_OPTIONS: ThemeOption[] = [
  { value: 'paper', label: '纸张', bg: '#f6f1e7', fg: '#3b352c', accent: '#8a5a2b' },
  { value: 'sepia', label: '羊皮纸', bg: '#f1e5cb', fg: '#4f3a26', accent: '#8b5a2b' },
  { value: 'green', label: '护眼绿', bg: '#e5efe2', fg: '#2f4134', accent: '#4f7a5a' },
  { value: 'solarized', label: '日光', bg: '#fdf6e3', fg: '#586e75', accent: '#b58900' },
  { value: 'night', label: '夜间', bg: '#1f1e1b', fg: '#d8d2c4', accent: '#c9a86a' },
  { value: 'black', label: '纯黑', bg: '#000000', fg: '#b5b5b5', accent: '#8ab4f8' },
  { value: 'opencode', label: 'opencode', bg: '#15141b', fg: '#edecee', accent: '#a277ff' },
  { value: 'blue', label: '雾蓝', bg: '#eaf2f6', fg: '#2e3f4a', accent: '#3f6e85' },
  { value: 'auto', label: '跟随系统', bg: '#f6f1e7', fg: '#3b352c', accent: '#8a5a2b' }
];
