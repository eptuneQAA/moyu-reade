import type { ReaderSettings } from './types';

export const DEFAULT_SETTINGS: ReaderSettings = {
  theme: 'opencode',
  mode: 'paged',
  animation: 'slide',
  font: 'serif',
  fontSize: 20,
  lineHeight: 1.85,
  margin: 56,
  letterSpacing: 0,
  paragraphSpacing: 0.78,
  indent: 2,
  align: 'justify',
  showTitle: false
};

const STORAGE_KEY = 'moyu.reader.settings.v1';

export function loadSettings(): ReaderSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<ReaderSettings>;
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      fontSize: clamp(Number(parsed.fontSize) || DEFAULT_SETTINGS.fontSize, 16, 32),
      lineHeight: clamp(
        Number(parsed.lineHeight) || DEFAULT_SETTINGS.lineHeight,
        1.2,
        2.4
      ),
      margin: clamp(Number(parsed.margin) ?? DEFAULT_SETTINGS.margin, 0, 120),
      letterSpacing: clamp(
        Number(parsed.letterSpacing) || 0,
        0,
        0.2
      ),
      paragraphSpacing: clamp(
        Number(parsed.paragraphSpacing) || DEFAULT_SETTINGS.paragraphSpacing,
        0.2,
        1.6
      ),
      indent: clamp(Number(parsed.indent) ?? DEFAULT_SETTINGS.indent, 0, 4),
      align: parsed.align === 'left' ? 'left' : 'justify',
      showTitle: parsed.showTitle === true
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: ReaderSettings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
