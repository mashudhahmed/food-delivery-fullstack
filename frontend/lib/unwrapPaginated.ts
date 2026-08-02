export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Unwraps backend responses that may be:
 * - plain array
 * - { data: T[] }
 * - { success, data: T[] }  (ResponseInterceptor)
 * - { data: { data: T[], total, page, ... } }  (paginated + interceptor)
 */
export function unwrapPaginated<T = any>(raw: any): PaginatedResult<T> {
  let cur = raw;

  for (
    let i = 0;
    i < 4 && cur && typeof cur === 'object' && !Array.isArray(cur);
    i++
  ) {
    if ('total' in cur && 'totalPages' in cur && Array.isArray(cur.data)) break;
    if (!('data' in cur)) break;
    cur = cur.data;
  }

  if (Array.isArray(cur)) {
    return {
      items: cur,
      total: cur.length,
      page: 1,
      limit: cur.length || 20,
      totalPages: 1,
    };
  }

  if (cur && typeof cur === 'object' && Array.isArray(cur.data)) {
    return {
      items: cur.data,
      total: typeof cur.total === 'number' ? cur.total : cur.data.length,
      page: typeof cur.page === 'number' ? cur.page : 1,
      limit:
        typeof cur.limit === 'number' ? cur.limit : cur.data.length || 20,
      totalPages:
        typeof cur.totalPages === 'number' ? cur.totalPages : 1,
    };
  }

  console.warn('⚠️ Unexpected paginated response format:', raw);
  return { items: [], total: 0, page: 1, limit: 20, totalPages: 1 };
}

/** Always returns an array – never undefined/null */
export function ensureArray<T = any>(value: any): T[] {
  if (Array.isArray(value)) return value;
  if (value == null) return [];
  if (Array.isArray(value?.items)) return value.items;
  if (Array.isArray(value?.data)) return value.data;
  return [];
}