import { useEffect, useRef, useState } from 'react';
import { api } from './api';
import type { SearchResult } from './types';

interface Props {
  bookId: string;
  onSelect: (result: SearchResult) => void;
  onClose: () => void;
}

function snippetParts(snippet: string, query: string) {
  const needle = query.trim();
  if (!needle) return { before: snippet, match: '', after: '' };
  const index = snippet.toLowerCase().indexOf(needle.toLowerCase());
  if (index === -1) return { before: snippet, match: '', after: '' };
  return {
    before: snippet.slice(0, index),
    match: snippet.slice(index, index + needle.length),
    after: snippet.slice(index + needle.length)
  };
}

export default function SearchPanel({ bookId, onSelect, onClose }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const timer = useRef<number | null>(null);

  useEffect(() => {
    if (timer.current) window.clearTimeout(timer.current);
    const needle = query.trim();
    if (!needle) {
      setResults([]);
      setError('');
      setLoading(false);
      return;
    }

    setLoading(true);
    timer.current = window.setTimeout(() => {
      api
        .search(bookId, needle)
        .then((data) => {
          setResults(data.results);
          setError('');
        })
        .catch((err) => {
          setError(err instanceof Error ? err.message : '搜索失败');
        })
        .finally(() => setLoading(false));
    }, 260);

    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [bookId, query]);

  return (
    <aside className="panel search-panel">
      <div className="panel-head">
        <div>
          <span className="eyebrow">Search</span>
          <h2>全文搜索</h2>
        </div>
        <button type="button" className="icon-button" onClick={onClose} aria-label="关闭">
          ×
        </button>
      </div>

      <input
        className="panel-input"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="输入关键词"
        autoFocus
      />

      <div className="search-meta">
        {loading
          ? '搜索中…'
          : query.trim()
            ? `${results.length} 个结果`
            : '输入关键词开始搜索'}
      </div>

      {error ? <div className="banner error">{error}</div> : null}

      <div className="search-list">
        {results.map((result, index) => {
          const parts = snippetParts(result.snippet, query);
          return (
            <button
              key={`${result.offset}-${index}`}
              type="button"
              className="search-item"
              onClick={() => onSelect(result)}
            >
              <small>{result.chapterTitle || `第 ${result.chapterIndex + 1} 章`}</small>
              <span>
                {parts.before}
                {parts.match ? <mark>{parts.match}</mark> : null}
                {parts.after}
              </span>
            </button>
          );
        })}
        {!loading && query.trim() && results.length === 0 ? (
          <div className="panel-empty">没有匹配</div>
        ) : null}
      </div>
    </aside>
  );
}
