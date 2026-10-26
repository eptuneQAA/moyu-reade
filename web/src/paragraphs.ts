import type { ChapterContent, ChapterLine } from './types';

export function bodyParagraphs(chapter: ChapterContent): ChapterLine[] {
  const lines = chapter.lines.filter((line) => line.text.trim() !== '');
  if (
    lines.length > 0 &&
    lines[0].text.trim() === chapter.title.trim()
  ) {
    lines.shift();
  }
  return lines;
}
