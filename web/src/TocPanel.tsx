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
  const currentRef = useRef<HTMLButtonElement>(null);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return chapters;
    return chapters.filter((chapter) =>
      chapter.title.toLowerCase().includes(needle)
    );
  }, [chapters, query]);

  useEffect(() => {
    currentRef.current?.scrollIntoView({ block: 'center' });
  }, []);

  return (
    <aside className="panel toc-panel">
      <div className="panel-head">
        <div>
          <span className="eyebrow">Contents</span>
          <h2>目录</h2>
        </div>
        <button type="button" className="icon-button" onClick={onClose} aria-label="关闭">
          ×
        </button>
      </div>

      <input
        className="panel-input"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="筛选章节"
        autoFocus
      />

      <div className="toc-list">
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
