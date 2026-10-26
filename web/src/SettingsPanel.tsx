import { useState } from 'react';
import { THEME_OPTIONS } from './theme';
import type { ReaderSettings } from './types';

interface Props {
  settings: ReaderSettings;
  onChange: (settings: ReaderSettings) => void;
  onClose: () => void;
  onShutdown: () => void;
  onCopyLink: () => Promise<void>;
}

export default function SettingsPanel({
  settings,
  onChange,
  onClose,
  onShutdown,
  onCopyLink
}: Props) {
  const [copied, setCopied] = useState(false);

  const set = <K extends keyof ReaderSettings>(
    key: K,
    value: ReaderSettings[K]
  ) => onChange({ ...settings, [key]: value });

  const copyLink = async () => {
    try {
      await onCopyLink();
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // 剪贴板不可用时由 Reader 兜底
    }
  };

  return (
    <aside className="panel settings-panel">
      <div className="panel-head">
        <div>
          <span className="eyebrow">Reading</span>
          <h2>阅读设置</h2>
        </div>
        <button
          type="button"
          className="icon-button"
          onClick={onClose}
          aria-label="关闭"
        >
          ×
        </button>
      </div>

      <div className="settings-body">
        <div className="setting-group">
          <label className="setting-label">主题</label>
          <div className="theme-grid">
            {THEME_OPTIONS.map((theme) => (
              <button
                key={theme.value}
                type="button"
                className={`theme-card ${
                  settings.theme === theme.value ? 'active' : ''
                }`}
                aria-pressed={settings.theme === theme.value}
                onClick={() => set('theme', theme.value)}
              >
                <span
                  className="theme-card-preview"
                  style={{ background: theme.bg, color: theme.fg }}
                >
                  <span style={{ color: theme.accent }}>Aa</span>
                  <span>书</span>
                </span>
                <span className="theme-card-name">{theme.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="setting-group">
          <label className="setting-label">
            书名与章节 <span>按 t 快速切换</span>
          </label>
          <div className="segmented">
            <button
              type="button"
              className={!settings.showTitle ? 'active' : ''}
              onClick={() => set('showTitle', false)}
            >
              隐藏
            </button>
            <button
              type="button"
              className={settings.showTitle ? 'active' : ''}
              onClick={() => set('showTitle', true)}
            >
              显示
            </button>
          </div>
        </div>

        <div className="setting-group">
          <label className="setting-label">字体</label>
          <div className="segmented">
            {[
              ['serif', '宋体'],
              ['sans', '黑体'],
              ['kai', '楷体'],
              ['fangsong', '仿宋'],
              ['lishu', '隶书']
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={settings.font === value ? 'active' : ''}
                onClick={() => set('font', value as ReaderSettings['font'])}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="setting-group">
          <label className="setting-label">
            字号 <span>{settings.fontSize}px</span>
          </label>
          <input
            type="range"
            min="16"
            max="32"
            step="1"
            value={settings.fontSize}
            onChange={(event) => set('fontSize', Number(event.target.value))}
          />
        </div>

        <div className="setting-group">
          <label className="setting-label">
            行高 <span>{settings.lineHeight.toFixed(2)}</span>
          </label>
          <input
            type="range"
            min="1.2"
            max="2.4"
            step="0.05"
            value={settings.lineHeight}
            onChange={(event) => set('lineHeight', Number(event.target.value))}
          />
        </div>

        <div className="setting-group">
          <label className="setting-label">
            字距 <span>{settings.letterSpacing.toFixed(2)}em</span>
          </label>
          <input
            type="range"
            min="0"
            max="0.2"
            step="0.01"
            value={settings.letterSpacing}
            onChange={(event) =>
              set('letterSpacing', Number(event.target.value))
            }
          />
        </div>

        <div className="setting-group">
          <label className="setting-label">
            段距 <span>{settings.paragraphSpacing.toFixed(2)}em</span>
          </label>
          <input
            type="range"
            min="0.2"
            max="1.6"
            step="0.05"
            value={settings.paragraphSpacing}
            onChange={(event) =>
              set('paragraphSpacing', Number(event.target.value))
            }
          />
        </div>

        <div className="setting-group">
          <label className="setting-label">
            首行缩进 <span>{settings.indent}em</span>
          </label>
          <input
            type="range"
            min="0"
            max="4"
            step="0.5"
            value={settings.indent}
            onChange={(event) => set('indent', Number(event.target.value))}
          />
        </div>

        <div className="setting-group">
          <label className="setting-label">
            页边距 <span>{settings.margin}px</span>
          </label>
          <input
            type="range"
            min="0"
            max="120"
            step="4"
            value={settings.margin}
            onChange={(event) => set('margin', Number(event.target.value))}
          />
        </div>

        <div className="setting-group">
          <label className="setting-label">对齐</label>
          <div className="segmented">
            <button
              type="button"
              className={settings.align === 'justify' ? 'active' : ''}
              onClick={() => set('align', 'justify')}
            >
              两端对齐
            </button>
            <button
              type="button"
              className={settings.align === 'left' ? 'active' : ''}
              onClick={() => set('align', 'left')}
            >
              左对齐
            </button>
          </div>
        </div>

        <div className="setting-group">
          <label className="setting-label">阅读模式</label>
          <div className="segmented">
            <button
              type="button"
              className={settings.mode === 'paged' ? 'active' : ''}
              onClick={() => set('mode', 'paged')}
            >
              分页
            </button>
            <button
              type="button"
              className={settings.mode === 'scroll' ? 'active' : ''}
              onClick={() => set('mode', 'scroll')}
            >
              滚动
            </button>
          </div>
        </div>

        <div className="setting-group">
          <label className="setting-label">翻页动画</label>
          <div className="segmented">
            {[
              ['slide', '滑动'],
              ['fade', '淡入'],
              ['none', '无']
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={settings.animation === value ? 'active' : ''}
                onClick={() =>
                  set('animation', value as ReaderSettings['animation'])
                }
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="panel-foot">
        <button type="button" className="button" onClick={copyLink}>
          {copied ? '已复制' : '复制 moyu:// 链接'}
        </button>
        <button
          type="button"
          className="button danger"
          onClick={() => {
            if (window.confirm('关闭 moyu 本地服务？')) onShutdown();
          }}
        >
          关闭 moyu 服务
        </button>
      </div>
    </aside>
  );
}
