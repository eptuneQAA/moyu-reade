import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef
} from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { bodyParagraphs } from './paragraphs';
import { clamp } from './settings';
import type { ViewerHandle, ViewerProps } from './types';

const ScrollView = forwardRef<ViewerHandle, ViewerProps>(function ScrollView(
  { chapter, settings, initialRatio, markdown = false, onState, onBoundary },
  ref
) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const onStateRef = useRef(onState);
  const onBoundaryRef = useRef(onBoundary);
  onStateRef.current = onState;
  onBoundaryRef.current = onBoundary;
  const ratioRef = useRef(clamp(initialRatio, 0, 1));
  const paragraphs = useMemo(() => bodyParagraphs(chapter), [chapter]);
  const markdownHtml = useMemo(
    () =>
      markdown
        ? DOMPurify.sanitize(
            marked.parse(chapter.lines.map((line) => line.text).join('\n')) as string
          )
        : '',
    [chapter, markdown]
  );

  const notify = useCallback(() => {
    const element = viewportRef.current;
    if (!element) return;
    const max = element.scrollHeight - element.clientHeight;
    const ratio = max > 0 ? clamp(element.scrollTop / max, 0, 1) : 0;
    ratioRef.current = ratio;
    onStateRef.current({ pageIndex: 0, pageCount: 1, ratio });
  }, []);

  useLayoutEffect(() => {
    const element = viewportRef.current;
    if (!element) return;
    const frame = requestAnimationFrame(() => {
      const max = element.scrollHeight - element.clientHeight;
      element.scrollTop = ratioRef.current * Math.max(0, max);
      notify();
    });
    return () => cancelAnimationFrame(frame);
  }, [
    chapter,
    settings.font,
    settings.fontSize,
    settings.lineHeight,
    settings.margin,
    settings.letterSpacing,
    settings.paragraphSpacing,
    settings.indent,
    settings.align,
    notify
  ]);

  const next = useCallback(() => {
    const element = viewportRef.current;
    if (!element) return;
    const max = element.scrollHeight - element.clientHeight;
    if (element.scrollTop >= max - 2) {
      onBoundaryRef.current(1);
      return;
    }
    element.scrollTo({
      top: Math.min(max, element.scrollTop + element.clientHeight * 0.9),
      behavior: settings.animation === 'none' ? 'auto' : 'smooth'
    });
  }, [settings.animation]);

  const prev = useCallback(() => {
    const element = viewportRef.current;
    if (!element) return;
    if (element.scrollTop <= 2) {
      onBoundaryRef.current(-1);
      return;
    }
    element.scrollTo({
      top: Math.max(0, element.scrollTop - element.clientHeight * 0.9),
      behavior: settings.animation === 'none' ? 'auto' : 'smooth'
    });
  }, [settings.animation]);

  const goToRatio = useCallback(
    (ratio: number) => {
      const element = viewportRef.current;
      if (!element) return;
      const max = element.scrollHeight - element.clientHeight;
      const clamped = clamp(ratio, 0, 1);
      ratioRef.current = clamped;
      element.scrollTop = clamped * Math.max(0, max);
      notify();
    },
    [notify]
  );

  useImperativeHandle(ref, () => ({ next, prev, goToRatio }), [
    next,
    prev,
    goToRatio
  ]);

  return (
    <div className="scroll-viewport" ref={viewportRef} onScroll={notify}>
      <div className="scroll-content">
        {markdown ? (
          <div
            className="markdown"
            dangerouslySetInnerHTML={{ __html: markdownHtml }}
          />
        ) : (
          <>
            <h2 className="chapter-heading">{chapter.title}</h2>
            {paragraphs.map((line) => (
              <p key={line.offset}>{line.text}</p>
            ))}
          </>
        )}
      </div>
    </div>
  );
});

export default ScrollView;
