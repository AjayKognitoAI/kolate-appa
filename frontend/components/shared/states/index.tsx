/**
 * Shared State Components
 *
 * Reusable components for loading, empty, and error states.
 * Use these throughout the app for consistent UX.
 */

"use client";

import React from "react";
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  Skeleton,
  Alert,
  AlertTitle,
  Stack,
} from "@mui/material";
import {
  IconInbox,
  IconAlertTriangle,
  IconRefresh,
  IconPlus,
} from "@tabler/icons-react";

// =============================================================================
// Loading States
// =============================================================================

interface LoadingStateProps {
  message?: string;
  size?: "small" | "medium" | "large";
}

export const LoadingSpinner: React.FC<LoadingStateProps> = ({
  message = "Loading...",
  size = "medium",
}) => {
  const sizes = { small: 24, medium: 40, large: 56 };
  return (
    <Box display="flex" flexDirection="column" alignItems="center" gap={2} py={4}>
      <CircularProgress size={sizes[size]} />
      {message && (
        <Typography variant="body2" color="text.secondary">
          {message}
        </Typography>
      )}
    </Box>
  );
};

interface SkeletonCardProps {
  count?: number;
  height?: number;
}

export const SkeletonCard: React.FC<SkeletonCardProps> = ({
  count = 1,
  height = 120,
}) => (
  <>
    {Array.from({ length: count }).map((_, i) => (
      <Skeleton
        key={i}
        variant="rounded"
        height={height}
        sx={{ mb: 2 }}
        animation="wave"
      />
    ))}
  </>
);

interface SkeletonTableProps {
  rows?: number;
  columns?: number;
}

export const SkeletonTable: React.FC<SkeletonTableProps> = ({
  rows = 5,
  columns = 4,
}) => (
  <Box>
    <Skeleton variant="rounded" height={48} sx={{ mb: 1 }} />
    {Array.from({ length: rows }).map((_, i) => (
      <Box key={i} display="flex" gap={2} mb={1}>
        {Array.from({ length: columns }).map((_, j) => (
          <Skeleton key={j} variant="text" sx={{ flex: 1 }} height={40} />
        ))}
      </Box>
    ))}
  </Box>
);

// =============================================================================
// Empty States
// =============================================================================

interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = "No data",
  description = "There's nothing here yet.",
  icon,
  actionLabel,
  onAction,
}) => (
  <Box
    display="flex"
    flexDirection="column"
    alignItems="center"
    justifyContent="center"
    py={8}
    px={4}
    textAlign="center"
  >
    <Box color="grey.400" mb={2}>
      {icon || <IconInbox size={64} stroke={1.5} />}
    </Box>
    <Typography variant="h6" color="text.secondary" gutterBottom>
      {title}
    </Typography>
    <Typography variant="body2" color="text.secondary" mb={3} maxWidth={320}>
      {description}
    </Typography>
    {actionLabel && onAction && (
      <Button
        variant="contained"
        startIcon={<IconPlus size={18} />}
        onClick={onAction}
      >
        {actionLabel}
      </Button>
    )}
  </Box>
);

// Preset empty states
export const EmptyProjects: React.FC<{ onAction?: () => void }> = ({ onAction }) => (
  <EmptyState
    title="No projects yet"
    description="Create your first project to get started with data analysis."
    actionLabel="Create Project"
    onAction={onAction}
  />
);

export const EmptyMembers: React.FC<{ onAction?: () => void }> = ({ onAction }) => (
  <EmptyState
    title="No team members"
    description="Invite team members to collaborate on projects."
    actionLabel="Invite Member"
    onAction={onAction}
  />
);

export const EmptyResults: React.FC<{ query?: string }> = ({ query }) => (
  <EmptyState
    title="No results found"
    description={query ? `No matches for "${query}". Try a different search.` : "No matching results."}
  />
);

// =============================================================================
// Error States
// =============================================================================

interface ErrorStateProps {
  title?: string;
  message?: string;
  error?: Error | string;
  onRetry?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = "Something went wrong",
  message,
  error,
  onRetry,
}) => {
  const errorMessage = message || (error instanceof Error ? error.message : error) || "An unexpected error occurred.";

  return (
    <Box py={4} px={2}>
      <Alert
        severity="error"
        icon={<IconAlertTriangle size={24} />}
        action={
          onRetry && (
            <Button
              color="inherit"
              size="small"
              startIcon={<IconRefresh size={16} />}
              onClick={onRetry}
            >
              Retry
            </Button>
          )
        }
      >
        <AlertTitle>{title}</AlertTitle>
        {errorMessage}
      </Alert>
    </Box>
  );
};

// =============================================================================
// Data State Wrapper
// =============================================================================

interface DataStateProps<T> {
  isLoading?: boolean;
  error?: Error | string | null;
  data?: T | null;
  isEmpty?: boolean;
  loadingComponent?: React.ReactNode;
  errorComponent?: React.ReactNode;
  emptyComponent?: React.ReactNode;
  onRetry?: () => void;
  children: (data: T) => React.ReactNode;
}

export function DataState<T>({
  isLoading,
  error,
  data,
  isEmpty,
  loadingComponent,
  errorComponent,
  emptyComponent,
  onRetry,
  children,
}: DataStateProps<T>): React.ReactElement | null {
  if (isLoading) {
    return <>{loadingComponent || <LoadingSpinner />}</>;
  }

  if (error) {
    return <>{errorComponent || <ErrorState error={error} onRetry={onRetry} />}</>;
  }

  if (isEmpty || !data) {
    return <>{emptyComponent || <EmptyState />}</>;
  }

  return <>{children(data)}</>;
}

// =============================================================================
// Inline Loading Button
// =============================================================================

interface LoadingButtonProps {
  loading?: boolean;
  children: React.ReactNode;
  [key: string]: unknown;
}

export const LoadingButton: React.FC<LoadingButtonProps> = ({
  loading,
  children,
  ...props
}) => (
  <Button disabled={loading} {...props}>
    {loading ? (
      <Stack direction="row" spacing={1} alignItems="center">
        <CircularProgress size={16} color="inherit" />
        <span>Loading...</span>
      </Stack>
    ) : (
      children
    )}
  </Button>
);

export default { LoadingSpinner, SkeletonCard, SkeletonTable, EmptyState, ErrorState, DataState };
