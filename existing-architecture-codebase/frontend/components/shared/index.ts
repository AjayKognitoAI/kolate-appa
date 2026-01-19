/**
 * Shared Components Index
 *
 * Centralized exports for all shared components.
 * Import from '@/components/shared' for cleaner imports.
 *
 * Usage:
 * ```typescript
 * import {
 *   LoadingSpinner,
 *   EmptyState,
 *   ErrorState,
 *   DataState,
 *   DataTable,
 *   TextInput,
 *   SelectInput,
 * } from '@/components/shared';
 * ```
 */

// State components
export {
  LoadingSpinner,
  SkeletonCard,
  SkeletonTable,
  EmptyState,
  EmptyProjects,
  EmptyMembers,
  EmptyResults,
  ErrorState,
  DataState,
  LoadingButton,
} from "./states";

// Data table
export {
  DataTable,
  viewAction,
  editAction,
  deleteAction,
} from "./DataTable";
export type { Column, RowAction } from "./DataTable";

// Form controls
export {
  TextInput,
  SelectInput,
  CheckboxInput,
  RadioGroupInput,
  SwitchInput,
  FormSection,
  FormRow,
} from "./FormControls";

// Card components (re-export existing)
export { default as BlankCard } from "./BlankCard";
export { default as DashboardCard } from "./DashboardCard";
