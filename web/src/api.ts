import type {
  BookDetail,
  BookSummary,
  ChapterContent,
  ImportResult,
  SearchResult
} from './types';

async function getJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  if (!response.ok) {
    let message = `HTTP ${response.status}`;
    try {
      const data = (await response.json()) as { error?: string };
      if (data.error) message = data.error;
    } catch {
      // 非 JSON 错误
    }
    throw new Error(message);
  }
  return (await response.json()) as T;
}

export const api = {
  library: () =>
    getJson<{ books: BookSummary[]; dirs: string[] }>('/api/library'),

  scan: () =>
    getJson<{ books: BookSummary[]; dirs: string[] }>('/api/scan', {
      method: 'POST',
      headers: { 'X-Moyu': '1' }
    }),

  book: (id: string) => getJson<BookDetail>(`/api/books/${id}`),

  chapter: (id: string, index: number) =>
    getJson<ChapterContent>(`/api/books/${id}/chapter/${index}`),

  search: (id: string, query: string) =>
    getJson<{ results: SearchResult[] }>(
      `/api/books/${id}/search?q=${encodeURIComponent(query)}`
    ),

  importFile: (file: File, onProgress?: (ratio: number) => void) =>
    new Promise<ImportResult>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open(
        'POST',
        `/api/import?name=${encodeURIComponent(file.name)}`
      );
      xhr.setRequestHeader('X-Moyu', '1');
      xhr.setRequestHeader('Content-Type', 'application/octet-stream');
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable && onProgress) {
          onProgress(event.loaded / event.total);
        }
      };
      xhr.onload = () => {
        let data: unknown = null;
        try {
          data = JSON.parse(xhr.responseText);
        } catch {
          // 非 JSON 错误
        }
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(data as ImportResult);
          return;
        }
        const message =
          data &&
          typeof data === 'object' &&
          'error' in data &&
          typeof (data as { error?: unknown }).error === 'string'
            ? (data as { error: string }).error
            : `导入失败（HTTP ${xhr.status}）`;
        reject(new Error(message));
      };
      xhr.onerror = () => reject(new Error('导入失败：网络错误'));
      xhr.send(file);
    }),

  saveProgress: (id: string, offset: number) =>
    getJson<{ offset: number; percent: number }>(
      `/api/books/${id}/progress`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Moyu': '1'
        },
        body: JSON.stringify({ offset })
      }
    ),

  hide: (id: string) =>
    getJson<{ ok: boolean; hidden: boolean; name: string }>(
      `/api/books/${id}/hide`,
      { method: 'POST', headers: { 'X-Moyu': '1' } }
    ),

  unhide: (id: string) =>
    getJson<{ ok: boolean; hidden: boolean; name: string }>(
      `/api/books/${id}/unhide`,
      { method: 'POST', headers: { 'X-Moyu': '1' } }
    ),

  deleteFile: (id: string) =>
    getJson<{ ok: boolean; deleted: boolean; name: string }>(
      `/api/books/${id}/file`,
      { method: 'DELETE', headers: { 'X-Moyu': '1' } }
    ),

  shutdown: () =>
    getJson<{ ok: boolean }>('/api/shutdown', {
      method: 'POST',
      headers: { 'X-Moyu': '1' }
    })
};
