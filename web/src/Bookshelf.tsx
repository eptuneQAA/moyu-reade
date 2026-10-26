import { useEffect, useMemo, useRef, useState } from 'react';
import type { DragEvent as ReactDragEvent } from 'react';
import { api } from './api';
import Cover from './Cover';
import type { BookSummary } from './types';

interface LibraryResponse {
  books: BookSummary[];
  dirs: string[];
}

function percentLabel(percent: number) {
  if (percent > 0 && percent < 0.1) return '<0.1%';
  if (percent >= 100) return '100%';
  return `${Math.round(percent * 10) / 10}%`;
}

function formatDate(value: string | null) {
  if (!value) return '尚未阅读';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '尚未阅读';
  return date.toLocaleDateString('zh-CN', {
    month: 'short',
    day: 'numeric'
  });
}

function BookCard({
  book,
  onOpen,
  onMenu
}: {
  book: BookSummary;
  onOpen: (id: string) => void;
  onMenu: (book: BookSummary) => void;
}) {
  return (
    <div
      className={`book-card ${book.missing ? 'is-missing' : ''} ${
        book.hidden ? 'is-hidden' : ''
      }`}
    >
      <button
        type="button"
        className="book-open"
        onClick={() => onOpen(book.id)}
        title={book.title}
      >
        <Cover book={book} />
        <div className="book-card-body">
          <div className="book-title">{book.title}</div>
          <div className="book-sub">
            <span>{book.author || book.format.toUpperCase()}</span>
            <span>{percentLabel(book.percent)}</span>
          </div>
          <div className="book-progress">
            <span
              style={{ width: `${Math.min(100, Math.max(0, book.percent))}%` }}
            />
          </div>
        </div>
      </button>
      <button
        type="button"
        className="book-menu"
        aria-label={`管理 ${book.title}`}
        title="下架或删除"
        onClick={(event) => {
          event.stopPropagation();
          onMenu(book);
        }}
      >
        ⋯
      </button>
      {book.hidden ? <span className="hidden-badge">已下架</span> : null}
    </div>
  );
}

export default function Bookshelf({
  onOpen
}: {
  onOpen: (id: string) => void;
}) {
  const [books, setBooks] = useState<BookSummary[]>([]);
  const [dirs, setDirs] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<'recent' | 'title'>('recent');
  const [importing, setImporting] = useState<{
    name: string;
    index: number;
    total: number;
    progress: number;
  } | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [showHidden, setShowHidden] = useState(false);
  const [menuBook, setMenuBook] = useState<BookSummary | null>(null);
  const [menuMode, setMenuMode] = useState<'menu' | 'delete'>('menu');
  const [busyBook, setBusyBook] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const busyRef = useRef(false);
  const dragDepth = useRef(0);

  const load = async (scan = false) => {
    setError('');
    if (scan) setScanning(true);
    else setLoading(true);
    try {
      const data: LibraryResponse = scan ? await api.scan() : await api.library();
      setBooks(data.books);
      setDirs(data.dirs || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : '书库加载失败');
    } finally {
      setLoading(false);
      setScanning(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const preventFileDrop = (event: DragEvent) => {
      if (event.dataTransfer?.types.includes('Files')) {
        event.preventDefault();
      }
    };
    window.addEventListener('dragover', preventFileDrop);
    window.addEventListener('drop', preventFileDrop);
    return () => {
      window.removeEventListener('dragover', preventFileDrop);
      window.removeEventListener('drop', preventFileDrop);
    };
  }, []);

  const handleFiles = async (files: File[]) => {
    if (busyRef.current || files.length === 0) return;

    const supported = files.filter((file) =>
      /\.(txt|epub|pdf|md)$/i.test(file.name)
    );
    const skipped = files.length - supported.length;

    if (supported.length === 0) {
      setNotice('');
      setError('只支持 TXT / EPUB / PDF 文件');
      return;
    }

    busyRef.current = true;
    setError('');
    setNotice('');

    let imported = 0;
    const failures: string[] = [];

    try {
      for (let index = 0; index < supported.length; index++) {
        const file = supported[index];
        setImporting({
          name: file.name,
          index: index + 1,
          total: supported.length,
          progress: 0
        });

        try {
          await api.importFile(file, (ratio) => {
            setImporting((current) =>
              current ? { ...current, progress: ratio } : current
            );
          });
          imported += 1;
        } catch (err) {
          failures.push(
            `${file.name}：${err instanceof Error ? err.message : '导入失败'}`
          );
        }
      }

      await load();

      if (imported > 0) {
        setNotice(`已导入 ${imported} 本书`);
        window.setTimeout(() => setNotice(''), 4000);
      }

      const problems = [
        ...(skipped > 0 ? [`已跳过 ${skipped} 个不支持的文件`] : []),
        ...failures
      ];
      if (problems.length > 0) setError(problems.join('；'));
    } finally {
      setImporting(null);
      busyRef.current = false;
    }
  };

  const onDragEnter = (event: ReactDragEvent) => {
    if (!event.dataTransfer.types.includes('Files')) return;
    event.preventDefault();
    dragDepth.current += 1;
    setDragActive(true);
  };

  const onDragOver = (event: ReactDragEvent) => {
    if (!event.dataTransfer.types.includes('Files')) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  };

  const onDragLeave = (event: ReactDragEvent) => {
    event.preventDefault();
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setDragActive(false);
  };

  const onDrop = (event: ReactDragEvent) => {
    event.preventDefault();
    dragDepth.current = 0;
    setDragActive(false);
    void handleFiles(Array.from(event.dataTransfer.files));
  };

  const showNotice = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(''), 4000);
  };

  const closeMenu = () => {
    setMenuBook(null);
    setMenuMode('menu');
    setBusyBook(null);
  };

  const hideBook = async (book: BookSummary) => {
    setBusyBook(book.id);
    try {
      await api.hide(book.id);
      closeMenu();
      await load();
      showNotice(`已下架「${book.title}」，本地文件保留`);
    } catch (err) {
      closeMenu();
      setError(err instanceof Error ? err.message : '下架失败');
    }
  };

  const unhideBook = async (book: BookSummary) => {
    setBusyBook(book.id);
    try {
      await api.unhide(book.id);
      closeMenu();
      await load();
      showNotice(`已重新上架「${book.title}」`);
    } catch (err) {
      closeMenu();
      setError(err instanceof Error ? err.message : '重新上架失败');
    }
  };

  const deleteBook = async (book: BookSummary) => {
    setBusyBook(book.id);
    try {
      await api.deleteFile(book.id);
      closeMenu();
      await load();
      showNotice(`已删除本地文件「${book.title}」`);
    } catch (err) {
      closeMenu();
      setError(err instanceof Error ? err.message : '删除失败');
    }
  };

  const hiddenCount = useMemo(
    () => books.filter((book) => book.hidden).length,
    [books]
  );

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const filtered = books.filter((book) => {
      if (!showHidden && book.hidden) return false;
      if (!needle) return true;
      return (
        book.title.toLowerCase().includes(needle) ||
        (book.author || '').toLowerCase().includes(needle)
      );
    });

    return filtered.sort((a, b) => {
      if (sort === 'title') return a.title.localeCompare(b.title, 'zh');
      const at = a.updatedAt || '';
      const bt = b.updatedAt || '';
      if (at !== bt) return bt.localeCompare(at);
      return a.title.localeCompare(b.title, 'zh');
    });
  }, [books, query, sort, showHidden]);

  const recent =
    [...books]
      .filter((book) => !book.hidden && !book.missing && book.percent > 0)
      .sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''))[0] ||
    books.find((book) => !book.hidden && !book.missing) ||
    null;

  return (
    <div
      className="shelf"
      onDragEnter={onDragEnter}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".txt,.epub,.pdf,.md"
        multiple
        hidden
        onChange={(event) => {
          const files = Array.from(event.target.files || []);
          event.target.value = '';
          void handleFiles(files);
        }}
      />

      <header className="shelf-header">
        <div className="brand">
          <div className="brand-mark">m</div>
          <div>
            <h1>moyu</h1>
            <p>本地书库</p>
          </div>
        </div>
        <div className="shelf-tools">
          <input
            className="search-input"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索书名、作者"
            aria-label="搜索书名、作者"
          />
          <select
            className="select"
            value={sort}
            onChange={(event) => setSort(event.target.value as 'recent' | 'title')}
            aria-label="排序方式"
          >
            <option value="recent">最近阅读</option>
            <option value="title">书名</option>
          </select>
          <button
            type="button"
            className="button primary"
            onClick={() => inputRef.current?.click()}
            disabled={Boolean(importing)}
          >
            导入文件
          </button>
          <button
            type="button"
            className="button"
            onClick={() => load(true)}
            disabled={scanning || Boolean(importing)}
          >
            {scanning ? '扫描中…' : '重新扫描'}
          </button>
        </div>
      </header>

      {notice ? <div className="banner success">{notice}</div> : null}

      {importing ? (
        <div className="import-status">
          <div className="import-copy">
            <span>正在导入 {importing.name}</span>
            <small>
              {importing.index}/{importing.total} ·{' '}
              {Math.round(importing.progress * 100)}%
            </small>
          </div>
          <div className="import-bar">
            <span style={{ width: `${importing.progress * 100}%` }} />
          </div>
        </div>
      ) : null}

      {error ? <div className="banner error">{error}</div> : null}

      {recent ? (
        <section className="continue-card">
          <Cover book={recent} />
          <div className="continue-copy">
            <span className="eyebrow">继续阅读</span>
            <h2>{recent.title}</h2>
            <p>
              {recent.author || recent.format.toUpperCase()}
              <span className="dot">·</span>
              {percentLabel(recent.percent)}
              <span className="dot">·</span>
              {formatDate(recent.updatedAt)}
            </p>
            <div className="continue-progress">
              <span
                style={{
                  width: `${Math.min(100, Math.max(0, recent.percent))}%`
                }}
              />
            </div>
            <button
              type="button"
              className="button primary"
              onClick={() => onOpen(recent.id)}
              disabled={recent.missing}
            >
              {recent.percent > 0 ? '继续阅读' : '开始阅读'}
            </button>
          </div>
        </section>
      ) : null}

      <div className="shelf-section-head">
        <h2>全部书籍</h2>
        <div className="shelf-section-actions">
          {hiddenCount > 0 ? (
            <button
              type="button"
              className="shelf-toggle"
              onClick={() => setShowHidden((value) => !value)}
            >
              {showHidden ? '隐藏已下架' : `显示已下架 (${hiddenCount})`}
            </button>
          ) : null}
          <span>{loading ? '加载中…' : `${visible.length} 本`}</span>
        </div>
      </div>

      {loading ? (
        <div className="shelf-grid">
          {Array.from({ length: 8 }, (_, index) => (
            <div className="book-card skeleton" key={index}>
              <div className="cover skeleton-cover" />
              <div className="book-card-body">
                <div className="skeleton-line" />
                <div className="skeleton-line short" />
              </div>
            </div>
          ))}
        </div>
      ) : visible.length === 0 ? (
        <div className="empty-state">
          <div className="empty-mark">m</div>
          <h3>{books.length === 0 ? '书架还是空的' : '没有匹配的书'}</h3>
          <p>
            导入 TXT / EPUB / PDF / Markdown，或把文件拖进这个页面。也可以放进{' '}
            <code>~/Documents/Books</code> 或 <code>~/Downloads</code> 后重新扫描。
          </p>
          <button
            type="button"
            className="button primary"
            onClick={() => inputRef.current?.click()}
          >
            导入第一本书
          </button>
        </div>
      ) : (
        <div className="shelf-grid">
          {visible.map((book) => (
            <BookCard
              key={book.id}
              book={book}
              onOpen={onOpen}
              onMenu={(selected) => {
                setMenuBook(selected);
                setMenuMode('menu');
              }}
            />
          ))}
        </div>
      )}

      {dirs.length > 0 ? (
        <footer className="shelf-footer">
          书库目录：{dirs.join(' · ')}
          {dirs[0] ? `　导入保存到：${dirs[0]}` : ''}
        </footer>
      ) : null}

      {dragActive ? (
        <div className="drop-overlay">
          <div className="drop-card">
            <div className="drop-mark">↓</div>
            <h3>松开即可导入</h3>
            <p>支持 TXT / EPUB / PDF / Markdown，单个文件最大 200MB</p>
          </div>
        </div>
      ) : null}

      {menuBook ? (
        <div className="modal-backdrop" onClick={closeMenu}>
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            onClick={(event) => event.stopPropagation()}
          >
            {menuMode === 'menu' ? (
              <>
                <span className="eyebrow">书籍管理</span>
                <h3>{menuBook.title}</h3>
                <p className="modal-path">{menuBook.path}</p>
                <p className="modal-note">
                  下架只会从书架隐藏，本地文件保留；删除会永久删除原文件并清除阅读进度，无法恢复。
                </p>
                <div className="modal-actions">
                  {menuBook.hidden ? (
                    <button
                      type="button"
                      className="button primary"
                      disabled={busyBook === menuBook.id}
                      onClick={() => unhideBook(menuBook)}
                    >
                      重新上架
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="button"
                      disabled={busyBook === menuBook.id}
                      onClick={() => hideBook(menuBook)}
                    >
                      下架（保留本地文件）
                    </button>
                  )}
                  {menuBook.deletable ? (
                    <button
                      type="button"
                      className="button danger"
                      onClick={() => setMenuMode('delete')}
                    >
                      删除本地文件…
                    </button>
                  ) : (
                    <p className="modal-hint">
                      该文件不在书库目录内，只能下架，不能在这里删除。
                    </p>
                  )}
                  <button type="button" className="button" onClick={closeMenu}>
                    取消
                  </button>
                </div>
              </>
            ) : (
              <>
                <span className="eyebrow">危险操作</span>
                <h3>删除本地文件？</h3>
                <p className="modal-path">{menuBook.path}</p>
                <p className="modal-note">
                  将永久删除「{menuBook.title}」的本地文件，同时清除阅读进度。此操作不可恢复。
                </p>
                <div className="modal-actions">
                  <button
                    type="button"
                    className="button danger"
                    disabled={busyBook === menuBook.id}
                    onClick={() => deleteBook(menuBook)}
                  >
                    确认删除本地文件
                  </button>
                  <button
                    type="button"
                    className="button"
                    onClick={() => setMenuMode('menu')}
                  >
                    返回
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
