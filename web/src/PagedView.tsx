import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import type {
  TouchEvent as ReactTouchEvent,
  WheelEvent as ReactWheelEvent
} from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { bodyParagraphs } from './paragraphs';
import { clamp } from './settings';
import type { ViewerHandle, ViewerProps } from './types';

const GAP = 64;

const PagedView = forwardRef<ViewerHandle, ViewerProps>(function PagedView(
  { chapter, settings, initialRatio, markdown = false, onState, onBoundary },
  ref
) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const columnsRef = useRef<HTMLDivElement>(null);
  const onStateRef = useRef(onState);
  const onBoundaryRef = useRef(onBoundary);
  onStateRef.current = onState;
  onBoundaryRef.current = onBoundary;

  const ratioRef = useRef(clamp(initialRatio, 0, 1));
  const pageIndexRef = useRef(0);
  const pageCountRef = useRef(1);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [pageIndex, setPageIndex] = useState(0);
  const [ready, setReady] = useState(false);
  const [fading, setFading] = useState(false);
  const fadeTimer = useRef<number | null>(null);

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

  useLayoutEffect(() => {
    const element = viewportRef.current;
    if (!element) return;

    const update = () => {
      const width = element.clientWidth;
      const lineHeight = settings.fontSize * settings.lineHeight;
      const height = Math.max(
        lineHeight,
        Math.floor(element.clientHeight / lineHeight) * lineHeight
      );
      setSize((previous) =>
        previous.width === width && previous.height === height
          ? previous
          : { width, height }
      );
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, [settings.fontSize, settings.lineHeight]);

  useLayoutEffect(() => {
    if (!size.width || !size.height) return;
    const element = columnsRef.current;
    if (!element) return;

    const total = Math.max(
      1,
      Math.round((element.scrollWidth + GAP) / (size.width + GAP))
    );
    const ratio = clamp(ratioRef.current, 0, 1);
    const target = total > 1 ? Math.round(ratio * (total - 1)) : 0;
    const nextIndex = Math.min(total - 1, Math.max(0, target));

    pageCountRef.current = total;
    pageIndexRef.current = nextIndex;
    setPageIndex(nextIndex);
    setReady(true);
    onStateRef.current({
      pageIndex: nextIndex,
      pageCount: total,
      ratio: total > 1 ? nextIndex / (total - 1) : 0
    });
  }, [
    size.width,
    size.height,
    chapter,
    settings.font,
    settings.fontSize,
    settings.lineHeight,
    settings.letterSpacing,
    settings.paragraphSpacing,
    settings.indent,
    settings.align
  ]);

  useLayoutEffect(
    () => () => {
      if (fadeTimer.current) window.clearTimeout(fadeTimer.current);
    },
    []
  );

  const applyPage = useCallback((target: number) => {
    const total = pageCountRef.current;
    if (target < 0) {
      onBoundaryRef.current(-1);
      return;
    }
    if (target >= total) {
      onBoundaryRef.current(1);
      return;
    }

    const ratio = total > 1 ? target / (total - 1) : 0;
    ratioRef.current = ratio;
    pageIndexRef.current = target;
    setPageIndex(target);
    onStateRef.current({ pageIndex: target, pageCount: total, ratio });
  }, []);

  const goTo = useCallback(
    (target: number) => {
      const total = pageCountRef.current;
      if (target < 0) {
        onBoundaryRef.current(-1);
        return;
      }
      if (target >= total) {
        onBoundaryRef.current(1);
        return;
      }

      if (settings.animation !== 'fade') {
        applyPage(target);
        return;
      }

      setFading(true);
      if (fadeTimer.current) window.clearTimeout(fadeTimer.current);
      fadeTimer.current = window.setTimeout(() => {
        applyPage(target);
        requestAnimationFrame(() => setFading(false));
      }, 130);
    },
    [applyPage, settings.animation]
  );

  const next = useCallback(() => goTo(pageIndexRef.current + 1), [goTo]);
  const prev = useCallback(() => goTo(pageIndexRef.current - 1), [goTo]);
  const goToRatio = useCallback(
    (ratio: number) => {
      ratioRef.current = clamp(ratio, 0, 1);
      const total = pageCountRef.current;
      const target =
        total > 1 ? Math.round(ratioRef.current * (total - 1)) : 0;
      applyPage(target);
    },
    [applyPage]
  );

  useImperativeHandle(ref, () => ({ next, prev, goToRatio }), [
    next,
    prev,
    goToRatio
  ]);

  const wheelAt = useRef(0);
  const onWheel = (event: ReactWheelEvent) => {
    if (Math.abs(event.deltaY) < 6) return;
    const now = Date.now();
    if (now - wheelAt.current < 360) return;
    wheelAt.current = now;
    if (event.deltaY > 0) next();
    else prev();
  };

  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const onTouchStart = (event: ReactTouchEvent) => {
    const touch = event.touches[0];
    touchStart.current = { x: touch.clientX, y: touch.clientY };
  };
  const onTouchEnd = (event: ReactTouchEvent) => {
    const start = touchStart.current;
    if (!start) return;
    const touch = event.changedTouches[0];
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    touchStart.current = null;
    if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.4) {
      if (dx < 0) next();
      else prev();
    }
  };

  const animationClass =
    settings.animation === 'slide'
      ? 'anim-slide'
      : settings.animation === 'fade'
        ? 'anim-fade'
        : 'anim-none';

  return (
    <div
      className="page-viewport"
      ref={viewportRef}
      onWheel={onWheel}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <div
        className={`page-columns ${animationClass}`}
        ref={columnsRef}
        style={{
          columnWidth: `${size.width}px`,
          columnGap: `${GAP}px`,
          height: `${size.height}px`,
          width: `${size.width}px`,
          transform: `translate3d(${-pageIndex * (size.width + GAP)}px, 0, 0)`,
          opacity: ready && !fading ? 1 : 0
        }}
      >
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
      <button
        type="button"
        className="page-hit left"
        aria-label="上一页"
        onClick={prev}
      />
      <button
        type="button"
        className="page-hit right"
        aria-label="下一页"
        onClick={next}
      />
    </div>
  );
});

export default PagedView;
