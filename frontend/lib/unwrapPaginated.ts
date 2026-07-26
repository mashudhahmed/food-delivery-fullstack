export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Unwraps a paginated admin-list response. The backend's global
 * ResponseInterceptor wraps every response in its own envelope (e.g.
 * { success, data: ... }), and the paginated service methods separately
 * return { data: T[], total, page, limit, totalPages } — so the real
 * array can end up a level or two deeper than a naive `response.data`
 * read expects. This walks down through `.data` until it finds either
 * a bare array or an object that already looks like the pagination
 * shape (has both `data` and `total`), so it works regardless of how
 * many envelope layers are in front of it.
 */
export function unwrapPaginated<T = any>(raw: any): PaginatedResult<T> {
  let cur = raw;

  for (let i = 0; i < 4 && cur && typeof cur === 'object' && !Array.isArray(cur); i++) {
    if ('total' in cur && 'totalPages' in cur && Array.isArray(cur.data)) break;
    if (!('data' in cur)) break;
    cur = cur.data;
  }

  if (Array.isArray(cur)) {
    return { items: cur, total: cur.length, page: 1, limit: cur.length || 20, totalPages: 1 };
  }

  if (cur && typeof cur === 'object' && Array.isArray(cur.data)) {
    return {
      items: cur.data,
      total: typeof cur.total === 'number' ? cur.total : cur.data.length,
      page: typeof cur.page === 'number' ? cur.page : 1,
      limit: typeof cur.limit === 'number' ? cur.limit : cur.data.length || 20,
      totalPages: typeof cur.totalPages === 'number' ? cur.totalPages : 1,
    };
  }

  console.warn('⚠️ Unexpected paginated response format:', raw);
  return { items: [], total: 0, page: 1, limit: 20, totalPages: 1 };
}