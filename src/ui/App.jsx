import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Box, Text, useApp, useInput, useStdout } from 'ink';
import fs from 'node:fs';
import os from 'node:os';
import { loadConfig, saveConfig } from '../config.js';
import { bookKey, loadProgress, saveProgress } from '../core/store.js';
import { scanBooks } from '../core/library.js';
import {
  chapterAt,
  createBook,
  layout,
  offsetForLine,
  percentForOffset,
  searchBook
} from '../core/book.js';
import { offsetToRow } from '../core/paginate.js';
import { adjustValue, SETTINGS } from '../core/settings.js';
import { parseFile } from '../parsers/index.js';
import Reader from './Reader.jsx';
import Shelf from './Shelf.jsx';
import Toc from './Toc.jsx';
import Search from './Search.jsx';
import Settings from './Settings.jsx';
import Help from './Help.jsx';
import Disguise from './Disguise.jsx';
import { themeOf } from './theme.js';

export default function App({ initialFile = null, noResume = false }) {
  const { exit } = useApp();
  const { stdout } = useStdout();
  const [cols, setCols] = useState(stdout.columns || 80);
  const [rows, setRows] = useState(stdout.rows || 24);
  const [config, setConfig] = useState(() => loadConfig());
  const [progress, setProgress] = useState(() => loadProgress());
  const progressRef = useRef(progress);
  progressRef.current = progress;

  const [book, setBook] = useState(null);
  const [offset, setOffset] = useState(0);
  const offsetRef = useRef(offset);
  offsetRef.current = offset;

  const [screen, setScreen] = useState(initialFile ? 'reader' : 'shelf');
  const [loading, setLoading] = useState(initialFile ? '正在打开…' : null);
  const [toast, setToast] = useState(null);
  const [overlay, setOverlay] = useState(null);
  const [shelf, setShelf] = useState([]);
  const [shelfCursor, setShelfCursor] = useState(0);
  const [tocCursor, setTocCursor] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchCursor, setSearchCursor] = useState(0);
  const [settingsCursor, setSettingsCursor] = useState(0);
  const [autoPage, setAutoPage] = useState(false);
  const [disguise, setDisguise] = useState(false);
  const [highlight, setHighlight] = useState(null);

  useEffect(() => {
    const onResize = () => {
      setCols(stdout.columns || 80);
      setRows(stdout.rows || 24);
    };
    stdout.on('resize', onResize);
    return () => stdout.off('resize', onResize);
  }, [stdout]);

  useEffect(() => {
    const user = process.env.USER || 'user';
    process.stdout.write(`\x1b]0;${user}@${os.hostname()}:~/project\x07`);
    return () => {
      process.stdout.write('\x1b]0;\x07');
    };
  }, []);

  useEffect(() => {
    saveConfig(config);
  }, [config]);

  useEffect(() => {
    if (!toast) return undefined;
    const id = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(id);
  }, [toast]);

  useEffect(() => {
    if (!highlight) return undefined;
    const id = setTimeout(() => setHighlight(null), 2000);
    return () => clearTimeout(id);
  }, [highlight]);

  const theme = themeOf(config.theme);
  const textWidth = Math.max(20, Math.min(config.charsPerLine, cols - 2));
  const pad = Math.max(0, Math.floor((cols - textWidth) / 2));
  const chrome =
    (config.showChapterTitle ? 2 : 0) + 4 + (config.showFooter ? 1 : 0);
  const autoLines = Math.max(5, rows - chrome);
  const pageHeight =
    config.linesPerPage > 0
      ? Math.min(config.linesPerPage, autoLines)
      : autoLines;

  const chapterStarts = useMemo(
    () => new Set(book ? book.chapters.map((item) => item.startLine) : []),
    [book]
  );
  const rowsData = useMemo(
    () =>
      book
        ? layout(book, textWidth, {
            indent: book.format !== 'pdf',
            chapterStarts
          })
        : [],
    [book, textWidth, chapterStarts]
  );
  const rowIndex = useMemo(
    () => offsetToRow(rowsData, offset),
    [rowsData, offset]
  );
  const currentLine = rowsData[rowIndex] ? rowsData[rowIndex].line : 0;
  const chapter = book ? chapterAt(book, currentLine) : null;
  const chapterIndex = book && chapter ? book.chapters.indexOf(chapter) : 0;
  const searchResults = useMemo(
    () =>
      book && overlay === 'search' && searchQuery
        ? searchBook(book, searchQuery)
        : [],
    [book, overlay, searchQuery]
  );

  const refreshShelf = useCallback(() => {
    setShelf(scanBooks(config.booksDirs));
  }, [config.booksDirs]);

  const shelfItems = useMemo(() => {
    const progressByPath = new Map(
      Object.values(progress.books).map((entry) => [entry.path, entry])
    );
    const items = shelf.map((item) => ({
      ...item,
      progress: progressByPath.get(item.path) || null
    }));
    for (const entry of Object.values(progress.books)) {
      if (!items.some((item) => item.path === entry.path)) {
        items.push({
          path: entry.path,
          title: entry.title,
          format: entry.path.split('.').pop().toLowerCase(),
          missing: !fs.existsSync(entry.path),
          progress: entry
        });
      }
    }
    return items.sort((a, b) => {
      const at = a.progress ? a.progress.updatedAt : '';
      const bt = b.progress ? b.progress.updatedAt : '';
      if (at !== bt) return bt.localeCompare(at);
      return a.title.localeCompare(b.title);
    });
  }, [shelf, progress]);

  const openBook = useCallback(
    (file) => {
      setLoading(`正在打开 ${file.split('/').pop()}…`);
      setTimeout(() => {
        try {
          const meta = parseFile(file);
          const nextBook = createBook(meta);
          const key = bookKey(file);
          const saved = noResume
            ? 0
            : progressRef.current.books[key]?.offset ?? 0;
          setBook(nextBook);
          setOffset(Math.max(0, Math.min(saved, nextBook.textLength)));
          setScreen('reader');
          setOverlay(null);
          setAutoPage(false);
          setHighlight(null);
        } catch (error) {
          setScreen('shelf');
          setToast(error.message);
        }
        setLoading(null);
      }, 30);
    },
    [noResume]
  );

  useEffect(() => {
    refreshShelf();
    if (initialFile) openBook(initialFile);
  }, []);

  useEffect(() => {
    if (!book || screen !== 'reader') return undefined;
    const id = setTimeout(() => {
      const key = bookKey(book.sourcePath);
      const entry = {
        path: book.sourcePath,
        title: book.title,
        offset,
        percent: percentForOffset(book, offset),
        updatedAt: new Date().toISOString()
      };
      const next = { books: { ...progressRef.current.books, [key]: entry } };
      progressRef.current = next;
      saveProgress(next);
      setProgress(next);
    }, 500);
    return () => clearTimeout(id);
  }, [offset, book, screen]);

  const saveNow = useCallback(() => {
    if (!book) return;
    const key = bookKey(book.sourcePath);
    const entry = {
      path: book.sourcePath,
      title: book.title,
      offset: offsetRef.current,
      percent: percentForOffset(book, offsetRef.current),
      updatedAt: new Date().toISOString()
    };
    const next = { books: { ...progressRef.current.books, [key]: entry } };
    progressRef.current = next;
    saveProgress(next);
    setProgress(next);
  }, [book]);

  const quit = useCallback(() => {
    saveNow();
    exit();
  }, [saveNow, exit]);

  const goToRow = useCallback(
    (index) => {
      if (!book || rowsData.length === 0) return;
      const clamped = Math.max(0, Math.min(index, rowsData.length - 1));
      setOffset(rowsData[clamped].start);
    },
    [book, rowsData]
  );

  const pageDown = useCallback(() => {
    if (rowsData.length === 0) return;
    const index = offsetToRow(rowsData, offsetRef.current);
    const pageStart = Math.floor(index / pageHeight) * pageHeight;
    const lastPageStart =
      Math.floor((rowsData.length - 1) / pageHeight) * pageHeight;
    const target = Math.min(pageStart + pageHeight, lastPageStart);
    setOffset(rowsData[target].start);
  }, [rowsData, pageHeight]);

  const pageUp = useCallback(() => {
    if (rowsData.length === 0) return;
    const index = offsetToRow(rowsData, offsetRef.current);
    const pageStart = Math.floor(index / pageHeight) * pageHeight;
    setOffset(rowsData[Math.max(0, pageStart - pageHeight)].start);
  }, [rowsData, pageHeight]);

  const lineDown = useCallback(
    () => goToRow(offsetToRow(rowsData, offsetRef.current) + 1),
    [goToRow, rowsData]
  );
  const lineUp = useCallback(
    () => goToRow(offsetToRow(rowsData, offsetRef.current) - 1),
    [goToRow, rowsData]
  );
  const halfDown = useCallback(
    () =>
      goToRow(
        offsetToRow(rowsData, offsetRef.current) +
          Math.max(1, Math.floor(pageHeight / 2))
      ),
    [goToRow, rowsData, pageHeight]
  );
  const halfUp = useCallback(
    () =>
      goToRow(
        offsetToRow(rowsData, offsetRef.current) -
          Math.max(1, Math.floor(pageHeight / 2))
      ),
    [goToRow, rowsData, pageHeight]
  );

  const jumpChapter = useCallback(
    (index) => {
      if (!book || book.chapters.length === 0) return;
      const clamped = Math.max(0, Math.min(index, book.chapters.length - 1));
      const target = book.chapters[clamped];
      setOffset(offsetForLine(book, target.startLine));
      setToast(`→ ${target.title}`);
    },
    [book]
  );

  const nextChapter = useCallback(() => {
    if (!book) return;
    const target = book.chapters.find((item) => item.startLine > currentLine);
    if (target) {
      setOffset(offsetForLine(book, target.startLine));
      setToast(`→ ${target.title}`);
    } else {
      setToast('已经是最后一章');
    }
  }, [book, currentLine]);

  const prevChapter = useCallback(() => {
    if (!book) return;
    const earlier = book.chapters.filter(
      (item) => item.startLine < currentLine
    );
    const target = earlier[earlier.length - 1];
    if (target) {
      setOffset(offsetForLine(book, target.startLine));
      setToast(`→ ${target.title}`);
    } else {
      setToast('已经是第一章');
    }
  }, [book, currentLine]);

  useEffect(() => {
    if (
      !autoPage ||
      screen !== 'reader' ||
      overlay ||
      disguise ||
      rowsData.length === 0
    ) {
      return undefined;
    }
    const id = setInterval(() => {
      const index = offsetToRow(rowsData, offsetRef.current);
      const pageStart = Math.floor(index / pageHeight) * pageHeight;
      if (pageStart + pageHeight >= rowsData.length) {
        setAutoPage(false);
        setToast('已到末尾');
        return;
      }
      setOffset(rowsData[pageStart + pageHeight].start);
    }, config.autoPageSeconds * 1000);
    return () => clearInterval(id);
  }, [
    autoPage,
    screen,
    overlay,
    disguise,
    rowsData,
    pageHeight,
    config.autoPageSeconds
  ]);

  useInput((input, key) => {
    if (disguise) {
      setDisguise(false);
      return;
    }
    if (loading) return;

    if (overlay === 'help') {
      setOverlay(null);
      return;
    }

    if (overlay === 'settings') {
      if (key.escape || key.return || input === 'q') {
        setOverlay(null);
      } else if (key.upArrow) {
        setSettingsCursor((value) => Math.max(0, value - 1));
      } else if (key.downArrow) {
        setSettingsCursor((value) =>
          Math.min(SETTINGS.length - 1, value + 1)
        );
      } else if (key.leftArrow || key.rightArrow) {
        const setting = SETTINGS[settingsCursor];
        const delta = key.rightArrow ? 1 : -1;
        setConfig((value) => ({
          ...value,
          [setting.key]: adjustValue(value, setting.key, delta, autoLines)
        }));
      }
      return;
    }

    if (overlay === 'toc') {
      if (key.escape) setOverlay(null);
      else if (key.upArrow || input === 'k') {
        setTocCursor((value) => Math.max(0, value - 1));
      } else if (key.downArrow || input === 'j') {
        setTocCursor((value) =>
          Math.min(book.chapters.length - 1, value + 1)
        );
      } else if (input === 'g') {
        setTocCursor(0);
      } else if (input === 'G') {
        setTocCursor(book.chapters.length - 1);
      } else if (key.return) {
        jumpChapter(tocCursor);
        setOverlay(null);
      }
      return;
    }

    if (overlay === 'search') {
      if (key.escape) {
        setOverlay(null);
        setSearchQuery('');
        return;
      }
      if (key.return) {
        const result = searchResults[searchCursor];
        if (result) {
          setOffset(result.offset);
          setHighlight({ line: result.lineIndex });
          setOverlay(null);
        }
        return;
      }
      if (key.upArrow) {
        setSearchCursor((value) => Math.max(0, value - 1));
        return;
      }
      if (key.downArrow) {
        setSearchCursor((value) =>
          Math.min(Math.max(0, searchResults.length - 1), value + 1)
        );
        return;
      }
      if (key.backspace || key.delete) {
        setSearchQuery((value) => value.slice(0, -1));
        setSearchCursor(0);
        return;
      }
      if (input && !key.ctrl && !key.meta) {
        setSearchQuery((value) => value + input);
        setSearchCursor(0);
      }
      return;
    }

    if (screen === 'shelf') {
      if (input === 'q') return quit();
      if (key.upArrow || input === 'k') {
        setShelfCursor((value) => Math.max(0, value - 1));
      } else if (key.downArrow || input === 'j') {
        setShelfCursor((value) =>
          Math.min(shelfItems.length - 1, value + 1)
        );
      } else if (input === 'r') {
        refreshShelf();
        setToast('已重新扫描书架');
      } else if (key.return) {
        const item = shelfItems[shelfCursor];
        if (!item) return;
        if (item.missing) setToast('文件不存在');
        else openBook(item.path);
      }
      return;
    }

    if (input === 'q') return quit();
    if (key.escape) {
      setOverlay(null);
      return;
    }
    if (key.downArrow) return pageDown();
    if (key.upArrow) return pageUp();
    if (input === ' ') return pageDown();
    if (key.pageDown || input === 'f') return pageDown();
    if (key.pageUp || input === 'b') return pageUp();
    if (input === 'j') return lineDown();
    if (input === 'k') return lineUp();
    if (input === 'd') return halfDown();
    if (input === 'u') return halfUp();
    if (input === 'n') return nextChapter();
    if (input === 'p') return prevChapter();
    if (input === 'g') {
      setTocCursor(chapterIndex);
      setOverlay('toc');
      return;
    }
    if (input === '/') {
      setSearchQuery('');
      setSearchCursor(0);
      setOverlay('search');
      return;
    }
    if (input === 's') {
      refreshShelf();
      setScreen('shelf');
      setAutoPage(false);
      return;
    }
    if (input === 'S' || input === ',') {
      setOverlay('settings');
      return;
    }
    if (input === 'a') {
      setAutoPage((value) => !value);
      return;
    }
    if (input === '+') {
      setConfig((value) => ({
        ...value,
        autoPageSeconds: Math.min(120, value.autoPageSeconds + 5)
      }));
      return;
    }
    if (input === '-') {
      setConfig((value) => ({
        ...value,
        autoPageSeconds: Math.max(5, value.autoPageSeconds - 5)
      }));
      return;
    }
    if (input === '[') {
      setConfig((value) => ({
        ...value,
        charsPerLine: Math.max(40, value.charsPerLine - 10)
      }));
      return;
    }
    if (input === ']') {
      setConfig((value) => ({
        ...value,
        charsPerLine: Math.min(120, value.charsPerLine + 10)
      }));
      return;
    }
    if (input === '{') {
      setConfig((value) => ({
        ...value,
        linesPerPage: adjustValue(value, 'linesPerPage', -1, autoLines)
      }));
      return;
    }
    if (input === '}') {
      setConfig((value) => ({
        ...value,
        linesPerPage: adjustValue(value, 'linesPerPage', 1, autoLines)
      }));
      return;
    }
    if (input === 't') {
      setConfig((value) => ({
        ...value,
        showChapterTitle: !value.showChapterTitle
      }));
      return;
    }
    if (input === 'h') {
      setConfig((value) => ({ ...value, showFooter: !value.showFooter }));
      return;
    }
    if (input === '~') {
      setDisguise(true);
      return;
    }
    if (input === '?') setOverlay('help');
  });

  if (cols < 40 || rows < 10) {
    return <Text color="red">终端窗口太小（至少 40x10）</Text>;
  }

  if (loading) {
    return (
      <Box>
        <Text color="cyan">{loading}</Text>
      </Box>
    );
  }

  if (screen === 'shelf') {
    return (
      <Shelf
        items={shelfItems}
        cursor={shelfCursor}
        height={rows}
        toast={toast}
      />
    );
  }

  if (!book) {
    return (
      <Box flexDirection="column">
        <Text>没有打开的书。</Text>
        <Text dimColor>按 s 回到书架，或运行 moyu &lt;文件&gt;。</Text>
      </Box>
    );
  }

  if (disguise) return <Disguise rows={rows} />;

  return (
    <Box
      flexDirection="column"
      width={cols}
      height={rows}
      backgroundColor={theme.background}
    >
      {overlay === 'toc' ? (
        <Toc
          chapters={book.chapters}
          cursor={tocCursor}
          width={textWidth}
          pad={pad}
          theme={theme}
        />
      ) : null}
      {overlay === 'search' ? (
        <Search
          query={searchQuery}
          results={searchResults}
          cursor={searchCursor}
          chapters={book.chapters}
          width={textWidth}
          pad={pad}
          theme={theme}
        />
      ) : null}
      {overlay === 'settings' ? (
        <Settings
          config={config}
          cursor={settingsCursor}
          autoLines={autoLines}
          width={textWidth}
          pad={pad}
          theme={theme}
        />
      ) : null}
      {overlay === 'help' ? (
        <Help width={textWidth} pad={pad} theme={theme} />
      ) : null}
      {!overlay ? (
        <Reader
          rows={rowsData}
          rowIndex={rowIndex}
          pageHeight={pageHeight}
          book={book}
          chapter={chapter}
          offset={offset}
          config={config}
          width={textWidth}
          pad={pad}
          autoPage={autoPage}
          highlight={highlight}
          theme={theme}
          toast={toast}
        />
      ) : null}
    </Box>
  );
}
