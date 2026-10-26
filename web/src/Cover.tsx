import { useMemo, useState } from 'react';
import type { BookSummary } from './types';

function hueOf(text: string) {
  let hash = 0;
  for (const char of text) {
    hash = (hash * 31 + char.charCodeAt(0)) % 360;
  }
  return hash;
}

export default function Cover({ book }: { book: BookSummary }) {
  const [failed, setFailed] = useState(false);
  const hue = useMemo(() => hueOf(book.title || book.id), [book.title, book.id]);
  const showImage = book.hasCover && !book.missing && !failed;

  return (
    <div className="cover">
      {showImage ? (
        <img
          src={`/api/books/${book.id}/cover`}
          alt={book.title}
          loading="lazy"
          onError={() => setFailed(true)}
        />
      ) : (
        <div
          className="cover-generated"
          style={{
            background: `linear-gradient(145deg, hsl(${hue} 44% 42%), hsl(${
              (hue + 44) % 360
            } 38% 18%))`
          }}
        >
          <span className="cover-title">{book.title}</span>
          <span className="cover-format">{book.format.toUpperCase()}</span>
        </div>
      )}
      {book.missing ? <span className="cover-missing">文件缺失</span> : null}
    </div>
  );
}
