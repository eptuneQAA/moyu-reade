export type ThemeName =
  | 'paper'
  | 'sepia'
  | 'green'
  | 'solarized'
  | 'night'
  | 'black'
  | 'opencode'
  | 'auto' | 'blue';
export type ReadingMode = 'paged' | 'scroll';
export type PageAnimation = 'slide' | 'fade' | 'none';
export type ReadingFont = 'serif' | 'sans' | 'kai' | 'fangsong' | 'lishu';

export interface ReaderSettings {
  theme: ThemeName;
  mode: ReadingMode;
  animation: PageAnimation;
  font: ReadingFont;
  fontSize: number;
  lineHeight: number;
  margin: number;
  letterSpacing: number;
  paragraphSpacing: number;
  indent: number;
  align: 'justify' | 'left';
  showTitle: boolean;
}

export interface BookSummary {
  id: string;
  path: string;
  title: string;
  author: string | null;
  format: string;
  percent: number;
  updatedAt: string | null;
  missing: boolean;
  hasCover: boolean;
  hidden: boolean;
  deletable: boolean;
}

export interface ChapterInfo {
  index: number;
  title: string;
  startLine: number;
  startOffset: number;
  endOffset: number;
}

export interface BookProgress {
  offset: number;
  percent: number;
  updatedAt: string | null;
}

export interface BookDetail {
  id: string;
  title: string;
  author: string | null;
  format: string;
  textLength: number;
  chapters: ChapterInfo[];
  progress: BookProgress | null;
}

export interface ChapterLine {
  text: string;
  offset: number;
}

export interface ChapterContent {
  index: number;
  title: string;
  startOffset: number;
  endOffset: number;
  totalChapters: number;
  lines: ChapterLine[];
}

export interface SearchResult {
  chapterIndex: number;
  lineIndex: number;
  offset: number;
  snippet: string;
  chapterTitle: string;
}

export interface ImportResult {
  ok: boolean;
  name: string;
  file: string;
  dir: string;
}

export interface PageState {
  pageIndex: number;
  pageCount: number;
  ratio: number;
}

export interface ViewerHandle {
  next: () => void;
  prev: () => void;
  goToRatio: (ratio: number) => void;
}

export interface ViewerProps {
  chapter: ChapterContent;
  settings: ReaderSettings;
  initialRatio: number;
  markdown?: boolean;
  onState: (state: PageState) => void;
  onBoundary: (direction: 1 | -1) => void;
}
