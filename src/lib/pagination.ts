/**
 * Pagination utilities for database queries
 */

export interface PaginationParams {
  page: number;
  pageSize: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasMore: boolean;
}

/**
 * Calculate pagination range
 */
export function getPaginationRange(page: number, pageSize: number) {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  return { from, to };
}

/**
 * Create paginated query
 */
export async function paginateQuery<T>(
  query: any,
  page: number = 1,
  pageSize: number = 20
): Promise<PaginatedResult<T>> {
  const { from, to } = getPaginationRange(page, pageSize);
  
  // Get total count
  const { count, error: countError } = await query.select('*', { count: 'exact', head: true });
  
  if (countError) {
    throw countError;
  }
  
  const total = count || 0;
  
  // Get paginated data
  const { data, error } = await query.range(from, to);
  
  if (error) {
    throw error;
  }
  
  const totalPages = Math.ceil(total / pageSize);
  
  return {
    data: (data || []) as T[],
    total,
    page,
    pageSize,
    totalPages,
    hasMore: page < totalPages,
  };
}

