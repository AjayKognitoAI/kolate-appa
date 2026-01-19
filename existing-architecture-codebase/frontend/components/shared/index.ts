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
 *   Breadcrumbs,
 *   ConfirmDialog,
 *   StatsCard,
 *   SkipLinks,
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
export { DataTable, viewAction, editAction, deleteAction } from "./DataTable";
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

// Breadcrumbs
export { Breadcrumbs } from "./Breadcrumbs";

// Dialog components
export {
  BaseDialog,
  ConfirmDialog,
  DeleteDialog,
  SuccessDialog,
  useConfirmDialog,
} from "./Dialog";

// Stats cards
export { StatsCard, MiniStatsCard } from "./StatsCard";

// Accessibility components
export {
  SkipLinks,
  VisuallyHidden,
  LiveRegion,
  LoadingAnnouncer,
  ErrorAnnouncer,
  FocusManager,
  Heading,
  useReducedMotion,
  useAnnounce,
  useFocusTrap,
} from "./Accessibility";

// Card components (re-export existing)
export { default as BlankCard } from "./BlankCard";
export { default as DashboardCard } from "./DashboardCard";
