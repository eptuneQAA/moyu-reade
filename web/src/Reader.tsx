import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties
} from 'react';
import { api } from './api';
import PagedView from './PagedView';
import ScrollView from './ScrollView';
import SearchPanel from './SearchPanel';
import Disguise from './Disguise';
import SettingsPanel from './SettingsPanel';
import TocPanel from './TocPanel';
import { clamp } from './settings';
import type {
  BookDetail,
  ChapterContent,
  ChapterInfo,
  PageState,
  ReaderSettings,
  SearchResult,
  ViewerHandle
} from './types';

interface Props {
  id: string;
  onBack: () => void;
  settings: ReaderSettings;
  onSettingsChange: (settings: ReaderSettings) => void;
}

type Panel = 'settings' | 'toc' | 'search' | null;

function chapterForOffset(book: BookDetail, offset: number) {
  let index = 0;
  for (let i = 0; i < book.chapters.length; i++) {
    if (book.chapters[i].startOffset <= offset) index = i;
    else break;
  }
  return index;
}

function ratioForOffset(chapter: ChapterInfo, offset: number) {
  const length = chapter.endOffset - chapter.startOffset;
  if (length <= 0) return 0;
  return clamp((offset - chapter.startOffset) / length, 0, 1);
}

function percentText(percent: number) {
  if (percent <= 0) return '0';
  if (percent < 0.1) return '<0.1';
  const text = percent.toFixed(1);
  return text.endsWith('.0') ? text.slice(0, -2) : text;
}

export default function Reader({
  id,
  onBack,
  settings,
  onSettingsChange
}: Props) {
  const [book, setBook] = useState<BookDetail | null>(null);
  const [chapter, setChapter] = useState<ChapterContent | null>(null);
  const [chapterIndex, setChapterIndex] = useState<number | null>(null);
  const [viewRatio, setViewRatio] = useState(0);
  const [page, setPage] = useState<PageState>({
    pageIndex: 0,
    pageCount: 1,
    ratio: 0
  });
  const [panel, setPanel] = useState<Panel>(null);
  const [loading, setLoading] = useState(true);
  const [chapterLoading, setChapterLoading] = useState(false);
  const [error, setError] = useState('');
  const [disguise, setDisguise] = useState(false);
  const viewRef = useRef<ViewerHandle>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');

    api
      .book(id)
      .then((data) => {
        if (cancelled) return;
        setBook(data);
        const offset = data.progress?.offset ?? 0;
        const index = chapterForOffset(data, offset);
        const target = data.chapters[index];
        const ratio = target ? ratioForOffset(target, offset) : 0;
        setViewRatio(ratio);
        setPage({ pageIndex: 0, pageCount: 1, ratio });
        setChapterIndex(index);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : '打开失败');
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    if (chapterIndex === null) return;
    let cancelled = false;
    setChapterLoading(true);

    api
      .chapter(id, chapterIndex)
      .then((data) => {
        if (cancelled) return;
        setChapter(data);
        setPage({ pageIndex: 0, pageCount: 1, ratio: viewRatio });
        setChapterLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : '章节加载失败');
        setChapterLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id, chapterIndex]);

  useEffect(() => {
    document.title = disguise
      ? 'webpack 5.91.0 compiling...'
      : settings.showTitle && book
        ? `${book.title} · moyu`
        : 'moyu';
    return () => {
      document.title = 'moyu';
    };
  }, [book, disguise, settings.showTitle]);

  const loadChapter = useCallback(
    (index: number, ratio: number) => {
      if (!book) return;
      const clampedIndex = Math.max(
        0,
        Math.min(book.chapters.length - 1, index)
      );
      if (chapterIndex === clampedIndex) {
        viewRef.current?.goToRatio(ratio);
        return;
      }
      setViewRatio(ratio);
      setChapterIndex(clampedIndex);
    },
    [book, chapterIndex]
  );

  const onBoundary = useCallback(
    (direction: 1 | -1) => {
      if (!book || !chapter) return;
      const next = chapter.index + direction;
      if (next < 0 || next >= book.chapters.length) return;
      loadChapter(next, direction > 0 ? 0 : 1);
    },
    [book, chapter, loadChapter]
  );

  const handleState = useCallback((state: PageState) => {
    setPage(state);
  }, []);

  const chapterLength = chapter
    ? chapter.endOffset - chapter.startOffset
    : 0;
  const currentOffset = chapter
    ? chapter.startOffset + page.ratio * chapterLength
    : 0;
  const overallPercent =
    book && book.textLength > 0
      ? Math.min(100, Math.max(0, (currentOffset / book.textLength) * 100))
      : 0;

  const latest = useRef({ book, chapter, ratio: page.ratio });
  latest.current = { book, chapter, ratio: page.ratio };

  useEffect(() => {
    if (!book || !chapter || chapterLoading) return undefined;
    const offset = Math.round(
      chapter.startOffset +
        page.ratio * (chapter.endOffset - chapter.startOffset)
    );
    const timer = window.setTimeout(() => {
      api.saveProgress(id, offset).catch(() => {});
    }, 500);
    return () => window.clearTimeout(timer);
  }, [book, chapter, page.ratio, chapterLoading, id]);

  useEffect(
    () => () => {
      const current = latest.current;
      if (!current.book || !current.chapter) return;
      const offset = Math.round(
        current.chapter.startOffset +
          current.ratio *
            (current.chapter.endOffset - current.chapter.startOffset)
      );
      fetch(`/api/books/${current.book.id}/progress`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Moyu': '1'
        },
        body: JSON.stringify({ offset }),
        keepalive: true
      }).catch(() => {});
    },
    []
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (disguise) {
        event.preventDefault();
        setDisguise(false);
        return;
      }

      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      if (panel) {
        if (event.key === 'Escape') {
          event.preventDefault();
          setPanel(null);
        }
        return;
      }

      if (event.key === 'ArrowRight' || event.key === 'PageDown' || event.key === ' ') {
        event.preventDefault();
        viewRef.current?.next();
      } else if (event.key === 'ArrowLeft' || event.key === 'PageUp') {
        event.preventDefault();
        viewRef.current?.prev();
      } else if (event.key === 'ArrowDown' && settings.mode === 'paged') {
        event.preventDefault();
        viewRef.current?.next();
      } else if (event.key === 'ArrowUp' && settings.mode === 'paged') {
        event.preventDefault();
        viewRef.current?.prev();
      } else if (event.key === 'g' || event.key === 'G') {
        setPanel('toc');
      } else if (event.key === '/') {
        event.preventDefault();
        setPanel('search');
      } else if (event.key === 's' || event.key === 'S' || event.key === ',') {
        setPanel('settings');
      } else if (event.key === 't') {
        onSettingsChange({
          ...settings,
          showTitle: !settings.showTitle
        });
      } else if (event.key === '~') {
        event.preventDefault();
        setDisguise(true);
      } else if (event.key === 'Escape') {
        setPanel(null);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [panel, settings.mode, disguise, settings.showTitle, onSettingsChange]);

  const selectChapter = (index: number) => {
    loadChapter(index, 0);
    setPanel(null);
  };

  const selectSearchResult = (result: SearchResult) => {
    if (!book) return;
    const target = book.chapters[result.chapterIndex];
    const ratio = target ? ratioForOffset(target, result.offset) : 0;
    loadChapter(result.chapterIndex, ratio);
    setPanel(null);
  };

  const copyProtocolLink = useCallback(async () => {
    if (!book) return;
    const link = `moyu://read/${book.id}`;
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(link);
      return;
    }
    window.prompt('复制 moyu:// 链接', link);
  }, [book]);

  const shutdown = async () => {
    setPanel(null);
    try {
      await api.shutdown();
    } catch {
      // 服务可能已经退出
    }
    setError('moyu 服务已关闭，现在可以关闭页面。');
  };

  const pageLabel =
    settings.mode === 'paged'
      ? `第 ${Math.min(page.pageCount, page.pageIndex + 1)} 页 / 共 ${page.pageCount} 页`
      : '滚动阅读';

  const viewKey = chapter ? `${chapter.index}-${settings.mode}` : 'none';
  const cardStyle = {
    '--reader-margin': `${settings.margin}px`,
    '--reader-size': `${settings.fontSize}px`,
    '--reader-line': String(settings.lineHeight),
    '--reader-font':
      settings.font === 'sans'
        ? 'var(--sans)'
        : settings.font === 'kai'
          ? 'var(--kai)'
          : settings.font === 'fangsong'
            ? 'var(--fangsong)'
            : settings.font === 'lishu'
              ? 'var(--lishu)'
              : 'var(--serif)',
    '--reader-letter-spacing': `${settings.letterSpacing}em`,
    '--reader-paragraph-gap': `${settings.paragraphSpacing}em`,
    '--reader-indent': `${settings.indent}em`,
    '--reader-align': settings.align
  } as CSSProperties;

  return (
    <div className="reader-shell">
      <header className="reader-top">
        <div className="reader-top-left">
          <button
            type="button"
            className="icon-button"
            onClick={onBack}
            aria-label="返回书架"
          >
            ←
          </button>
          <div className="reader-titles">
            {settings.showTitle ? (
              <>
                <strong>{book?.title || 'moyu'}</strong>
                <span>{book?.author || book?.format?.toUpperCase() || ''}</span>
              </>
            ) : (
              <strong>moyu</strong>
            )}
          </div>
        </div>
        <div className="reader-top-right">
          <button type="button" className="top-action" onClick={() => setPanel('toc')}>
            目录
          </button>
          <button
            type="button"
            className="top-action"
            onClick={() => setPanel('search')}
          >
            搜索
          </button>
          <button
            type="button"
            className="top-action"
            onClick={() => setPanel('settings')}
          >
            设置
          </button>
        </div>
      </header>

      {error && book && chapter ? (
        <div className="banner error reader-error">{error}</div>
      ) : null}

      <main className="reader-main">
        {loading || !book || !chapter ? (
          <div className="reader-state">
            {error ? (
              <>
                <h2>打不开这本书</h2>
                <p>{error}</p>
                <button type="button" className="button" onClick={onBack}>
                  返回书架
                </button>
              </>
            ) : (
              <div className="spinner" aria-label="加载中" />
            )}
          </div>
        ) : (
          <div className="reader-card" style={cardStyle}>
            {settings.mode === 'paged' ? (
              <PagedView
                key={viewKey}
                ref={viewRef}
                chapter={chapter}
                settings={settings}
                initialRatio={page.ratio}
                markdown={book.format === 'md'}
                onState={handleState}
                onBoundary={onBoundary}
              />
            ) : (
              <ScrollView
                key={viewKey}
                ref={viewRef}
                chapter={chapter}
                settings={settings}
                initialRatio={page.ratio}
                markdown={book.format === 'md'}
                onState={handleState}
                onBoundary={onBoundary}
              />
            )}
            {chapterLoading ? (
              <div className="chapter-loading">加载章节…</div>
            ) : null}
          </div>
        )}
      </main>

      <footer className="reader-foot">
        <div className="reader-progress">
          <span style={{ width: `${overallPercent}%` }} />
        </div>
        <div className="reader-foot-row">
          <span className="reader-chapter">
            {settings.showTitle
              ? chapter?.title || (error ? '已断开' : '')
              : '阅读中'}
          </span>
          <span>
            {pageLabel}
            <span className="dot">·</span>
            {percentText(overallPercent)}%
          </span>
        </div>
      </footer>

      {panel ? (
        <div className="panel-backdrop" onClick={() => setPanel(null)} />
      ) : null}

      {panel === 'settings' ? (
        <SettingsPanel
          settings={settings}
          onChange={onSettingsChange}
          onClose={() => setPanel(null)}
          onShutdown={shutdown}
          onCopyLink={copyProtocolLink}
        />
      ) : null}

      {panel === 'toc' && book ? (
        <TocPanel
          chapters={book.chapters}
          currentIndex={chapter?.index ?? 0}
          onSelect={selectChapter}
          onClose={() => setPanel(null)}
        />
      ) : null}

      {panel === 'search' ? (
        <SearchPanel
          bookId={id}
          onSelect={selectSearchResult}
          onClose={() => setPanel(null)}
        />
      ) : null}

      {disguise ? <Disguise onHide={() => setDisguise(false)} /> : null}
    </div>
  );
}
