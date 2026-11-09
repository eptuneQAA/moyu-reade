import { useEffect, useMemo, useRef, useState } from 'react';
import type { ChapterInfo } from './types';

interface Props {
  chapters: ChapterInfo[];
  currentIndex: number;
  onSelect: (index: number) => void;
  onClose: () => void;
}

export default function TocPanel({
  chapters,
  currentIndex,
  onSelect,
  onClose
}: Props) {
  const [query, setQuery] = useState('');
  const [reversed, setReversed] = useState(() => {
    try {
      return window.localStorage.getItem('moyu.toc.reversed') === '1';
    } catch {
      return false;
    }
  });
  const currentRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const matched = needle
      ? chapters.filter((chapter) =>
          chapter.title.toLowerCase().includes(needle)
        )
      : chapters;
    return reversed ? [...matched].reverse() : matched;
  }, [chapters, query, reversed]);

  useEffect(() => {
    currentRef.current?.scrollIntoView({ block: 'center' });
  }, []);

  const changeOrder = (next: boolean) => {
    if (next === reversed) return;
    setReversed(next);
    try {
      window.localStorage.setItem('moyu.toc.reversed', next ? '1' : '0');
    } catch {
      // 隐私模式下无法写入时只影响本次会话
    }
    listRef.current?.scrollTo({ top: 0 });
  };

  return (
    <aside className="panel toc-panel">
      <div className="panel-head">
        <div>
          <span className="eyebrow">Contents</span>
          <h2>目录</h2>
        </div>
        <div className="toc-head-actions">
          <div className="toc-order" role="group" aria-label="目录顺序">
            <button
              type="button"
              className={!reversed ? 'active' : ''}
              aria-pressed={!reversed}
              onClick={() => changeOrder(false)}
            >
              正序
            </button>
            <button
              type="button"
              className={reversed ? 'active' : ''}
              aria-pressed={reversed}
              onClick={() => changeOrder(true)}
            >
              倒序
            </button>
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
      </div>

      <input
        className="panel-input"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="筛选章节"
        autoFocus
      />

      <div className="toc-list" ref={listRef}>
        {visible.map((chapter) => (
          <button
            key={chapter.index}
            ref={chapter.index === currentIndex ? currentRef : undefined}
            type="button"
            className={`toc-item ${
              chapter.index === currentIndex ? 'active' : ''
            }`}
            onClick={() => onSelect(chapter.index)}
          >
            <span>{chapter.title}</span>
            <small>{chapter.index + 1}</small>
          </button>
        ))}
        {visible.length === 0 ? (
          <div className="panel-empty">没有匹配章节</div>
        ) : null}
      </div>
    </aside>
  );
}
