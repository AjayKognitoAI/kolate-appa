/**
 * Hooks Index
 *
 * Centralized exports for all custom hooks.
 * Import from '@/hooks' for cleaner imports.
 *
 * Usage:
 * ```typescript
 * import {
 *   useApiAuth,
 *   useDataFetch,
 *   usePaginatedFetch,
 *   useMutation,
 * } from '@/hooks';
 * ```
 */

// Authentication
export {
  useApiAuth,
  useOrgId,
  useHasRole,
  useHasPermission,
  withAuth,
} from "./use-api-auth";
export type { UseApiAuthReturn, ApiAuthUser } from "./use-api-auth";

// Data fetching
export {
  useDataFetch,
  usePaginatedFetch,
  useMutation,
  clearCache,
  invalidateCache,
} from "./use-data-fetch";

// Mobile detection (if exists)
export { useMobile } from "./use-mobile";
