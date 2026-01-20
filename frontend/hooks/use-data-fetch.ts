/**
 * useDataFetch Hook
 *
 * Generic data fetching hook with loading, error, and caching support.
 * Reduces boilerplate for API calls throughout the app.
 */

"use client";

import { useState, useEffect, useCallback, useRef } from "react";

// =============================================================================
// Types
// =============================================================================

interface FetchState<T> {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
  isEmpty: boolean;
}

interface UseFetchOptions<T> {
  /** Initial data value */
  initialData?: T | null;
  /** Skip initial fetch */
  skip?: boolean;
  /** Cache key for deduplication */
  cacheKey?: string;
  /** Transform response data */
  transform?: (data: unknown) => T;
  /** Callback on success */
  onSuccess?: (data: T) => void;
  /** Callback on error */
  onError?: (error: Error) => void;
  /** Dependencies that trigger refetch */
  deps?: unknown[];
}

interface UseFetchReturn<T> extends FetchState<T> {
  /** Manually trigger fetch */
  refetch: () => Promise<void>;
  /** Update data manually */
  setData: (data: T | null) => void;
  /** Clear error */
  clearError: () => void;
}

// Simple cache
const cache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// =============================================================================
// Hook Implementation
// =============================================================================

export function useDataFetch<T>(
  fetcher: () => Promise<T>,
  options: UseFetchOptions<T> = {}
): UseFetchReturn<T> {
  const {
    initialData = null,
    skip = false,
    cacheKey,
    transform,
    onSuccess,
    onError,
    deps = [],
  } = options;

  const [state, setState] = useState<FetchState<T>>({
    data: initialData,
    isLoading: !skip,
    error: null,
    isEmpty: false,
  });

  const mountedRef = useRef(true);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const fetchData = useCallback(async () => {
    // Check cache
    if (cacheKey) {
      const cached = cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        setState({
          data: cached.data as T,
          isLoading: false,
          error: null,
          isEmpty: isEmptyData(cached.data),
        });
        return;
      }
    }

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      let data = await fetcherRef.current();

      if (transform) {
        data = transform(data);
      }

      if (cacheKey) {
        cache.set(cacheKey, { data, timestamp: Date.now() });
      }

      if (mountedRef.current) {
        setState({
          data,
          isLoading: false,
          error: null,
          isEmpty: isEmptyData(data),
        });
        onSuccess?.(data);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      if (mountedRef.current) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error,
        }));
        onError?.(error);
      }
    }
  }, [cacheKey, transform, onSuccess, onError]);

  // Initial fetch
  useEffect(() => {
    if (!skip) {
      fetchData();
    }
  }, [skip, fetchData, ...deps]);

  // Cleanup
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  return {
    ...state,
    refetch: fetchData,
    setData: (data) => setState((prev) => ({ ...prev, data, isEmpty: isEmptyData(data) })),
    clearError: () => setState((prev) => ({ ...prev, error: null })),
  };
}

// =============================================================================
// Paginated Fetch Hook
// =============================================================================

interface PaginatedState<T> extends FetchState<T[]> {
  page: number;
  totalPages: number;
  totalItems: number;
  hasMore: boolean;
}

interface UsePaginatedOptions<T> extends Omit<UseFetchOptions<T[]>, "transform"> {
  initialPage?: number;
  pageSize?: number;
}

interface UsePaginatedReturn<T> extends PaginatedState<T> {
  refetch: () => Promise<void>;
  goToPage: (page: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  setPageSize: (size: number) => void;
}

export function usePaginatedFetch<T>(
  fetcher: (page: number, size: number) => Promise<{
    items: T[];
    total: number;
    pages: number;
  }>,
  options: UsePaginatedOptions<T> = {}
): UsePaginatedReturn<T> {
  const { initialPage = 1, pageSize: initialSize = 10, ...fetchOptions } = options;

  const [page, setPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(initialSize);
  const [pagination, setPagination] = useState({ totalPages: 0, totalItems: 0 });

  const { data, isLoading, error, isEmpty, refetch, setData } = useDataFetch<T[]>(
    async () => {
      const result = await fetcher(page, pageSize);
      setPagination({ totalPages: result.pages, totalItems: result.total });
      return result.items;
    },
    {
      ...fetchOptions,
      deps: [page, pageSize, ...(fetchOptions.deps || [])],
    }
  );

  return {
    data,
    isLoading,
    error,
    isEmpty,
    page,
    totalPages: pagination.totalPages,
    totalItems: pagination.totalItems,
    hasMore: page < pagination.totalPages,
    refetch,
    goToPage: setPage,
    nextPage: () => setPage((p) => Math.min(p + 1, pagination.totalPages)),
    prevPage: () => setPage((p) => Math.max(p - 1, 1)),
    setPageSize: (size) => {
      setPageSize(size);
      setPage(1);
    },
  };
}

// =============================================================================
// Mutation Hook
// =============================================================================

interface MutationState<T> {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
  isSuccess: boolean;
}

interface UseMutationOptions<T, V> {
  onSuccess?: (data: T, variables: V) => void;
  onError?: (error: Error, variables: V) => void;
  invalidateKeys?: string[];
}

interface UseMutationReturn<T, V> extends MutationState<T> {
  mutate: (variables: V) => Promise<T | undefined>;
  reset: () => void;
}

export function useMutation<T, V = void>(
  mutationFn: (variables: V) => Promise<T>,
  options: UseMutationOptions<T, V> = {}
): UseMutationReturn<T, V> {
  const { onSuccess, onError, invalidateKeys } = options;

  const [state, setState] = useState<MutationState<T>>({
    data: null,
    isLoading: false,
    error: null,
    isSuccess: false,
  });

  const mutate = useCallback(
    async (variables: V) => {
      setState({ data: null, isLoading: true, error: null, isSuccess: false });

      try {
        const data = await mutationFn(variables);
        setState({ data, isLoading: false, error: null, isSuccess: true });

        // Invalidate cache
        invalidateKeys?.forEach((key) => cache.delete(key));

        onSuccess?.(data, variables);
        return data;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setState({ data: null, isLoading: false, error, isSuccess: false });
        onError?.(error, variables);
        return undefined;
      }
    },
    [mutationFn, onSuccess, onError, invalidateKeys]
  );

  const reset = useCallback(() => {
    setState({ data: null, isLoading: false, error: null, isSuccess: false });
  }, []);

  return { ...state, mutate, reset };
}

// =============================================================================
// Helpers
// =============================================================================

function isEmptyData(data: unknown): boolean {
  if (data === null || data === undefined) return true;
  if (Array.isArray(data)) return data.length === 0;
  if (typeof data === "object") return Object.keys(data).length === 0;
  return false;
}

/** Clear all cached data */
export function clearCache(): void {
  cache.clear();
}

/** Clear specific cache key */
export function invalidateCache(key: string): void {
  cache.delete(key);
}

export default useDataFetch;
