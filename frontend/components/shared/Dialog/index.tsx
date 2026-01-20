/**
 * Modern Dialog Components
 *
 * Accessible dialog/modal components with proper focus management.
 */

"use client";

import React, { useCallback, useRef, useEffect } from "react";
import {
  Dialog as MuiDialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  IconButton,
  Button,
  Box,
  Typography,
  Slide,
  CircularProgress,
} from "@mui/material";
import { TransitionProps } from "@mui/material/transitions";
import { IconX, IconAlertTriangle, IconInfoCircle, IconCheck } from "@tabler/icons-react";

// =============================================================================
// Transition
// =============================================================================

const SlideTransition = React.forwardRef(function Transition(
  props: TransitionProps & { children: React.ReactElement },
  ref: React.Ref<unknown>
) {
  return <Slide direction="up" ref={ref} {...props} />;
});

// =============================================================================
// Base Dialog
// =============================================================================

interface BaseDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  maxWidth?: "xs" | "sm" | "md" | "lg" | "xl";
  fullWidth?: boolean;
  showCloseButton?: boolean;
}

export const BaseDialog: React.FC<BaseDialogProps> = ({
  open,
  onClose,
  title,
  children,
  actions,
  maxWidth = "sm",
  fullWidth = true,
  showCloseButton = true,
}) => {
  const titleId = React.useId();
  const contentId = React.useId();

  return (
    <MuiDialog
      open={open}
      onClose={onClose}
      maxWidth={maxWidth}
      fullWidth={fullWidth}
      TransitionComponent={SlideTransition}
      aria-labelledby={titleId}
      aria-describedby={contentId}
    >
      <DialogTitle
        id={titleId}
        sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", pr: 1 }}
      >
        {title}
        {showCloseButton && (
          <IconButton onClick={onClose} aria-label="Close dialog" size="small">
            <IconX size={20} />
          </IconButton>
        )}
      </DialogTitle>
      <DialogContent id={contentId} dividers>
        {children}
      </DialogContent>
      {actions && <DialogActions sx={{ px: 3, py: 2 }}>{actions}</DialogActions>}
    </MuiDialog>
  );
};

// =============================================================================
// Confirm Dialog
// =============================================================================

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  message: string | React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning" | "info";
  loading?: boolean;
}

const variantConfig = {
  danger: { color: "error" as const, icon: IconAlertTriangle },
  warning: { color: "warning" as const, icon: IconAlertTriangle },
  info: { color: "primary" as const, icon: IconInfoCircle },
};

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "info",
  loading = false,
}) => {
  const config = variantConfig[variant];
  const Icon = config.icon;

  const handleConfirm = useCallback(async () => {
    await onConfirm();
    onClose();
  }, [onConfirm, onClose]);

  return (
    <BaseDialog
      open={open}
      onClose={onClose}
      title={title}
      maxWidth="xs"
      actions={
        <>
          <Button onClick={onClose} disabled={loading}>
            {cancelText}
          </Button>
          <Button
            onClick={handleConfirm}
            variant="contained"
            color={config.color}
            disabled={loading}
            startIcon={loading ? <CircularProgress size={16} /> : undefined}
          >
            {confirmText}
          </Button>
        </>
      }
    >
      <Box sx={{ display: "flex", gap: 2, alignItems: "flex-start" }}>
        <Box sx={{ color: `${config.color}.main`, mt: 0.5 }}>
          <Icon size={24} />
        </Box>
        <Box>
          {typeof message === "string" ? (
            <DialogContentText>{message}</DialogContentText>
          ) : (
            message
          )}
        </Box>
      </Box>
    </BaseDialog>
  );
};

// =============================================================================
// Delete Confirm Dialog
// =============================================================================

interface DeleteDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  itemName: string;
  itemType?: string;
  consequences?: string[];
  loading?: boolean;
}

export const DeleteDialog: React.FC<DeleteDialogProps> = ({
  open,
  onClose,
  onConfirm,
  itemName,
  itemType = "item",
  consequences,
  loading,
}) => (
  <ConfirmDialog
    open={open}
    onClose={onClose}
    onConfirm={onConfirm}
    title={`Delete ${itemType}?`}
    variant="danger"
    confirmText="Delete"
    loading={loading}
    message={
      <Box>
        <Typography gutterBottom>
          Are you sure you want to delete <strong>{itemName}</strong>?
        </Typography>
        {consequences && consequences.length > 0 && (
          <>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              This will:
            </Typography>
            <Box component="ul" sx={{ m: 0, pl: 2 }}>
              {consequences.map((c, i) => (
                <li key={i}>
                  <Typography variant="body2" color="text.secondary">
                    {c}
                  </Typography>
                </li>
              ))}
            </Box>
          </>
        )}
        <Typography variant="body2" color="error" sx={{ mt: 2 }}>
          This action cannot be undone.
        </Typography>
      </Box>
    }
  />
);

// =============================================================================
// Success Dialog
// =============================================================================

interface SuccessDialogProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  message: string;
}

export const SuccessDialog: React.FC<SuccessDialogProps> = ({
  open,
  onClose,
  title = "Success",
  message,
}) => (
  <BaseDialog
    open={open}
    onClose={onClose}
    title={title}
    maxWidth="xs"
    actions={
      <Button onClick={onClose} variant="contained" color="success">
        OK
      </Button>
    }
  >
    <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
      <Box sx={{ color: "success.main" }}>
        <IconCheck size={24} />
      </Box>
      <DialogContentText>{message}</DialogContentText>
    </Box>
  </BaseDialog>
);

// =============================================================================
// useConfirmDialog Hook
// =============================================================================

interface UseConfirmDialogReturn {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  confirm: () => Promise<boolean>;
}

export function useConfirmDialog(): UseConfirmDialogReturn {
  const [isOpen, setIsOpen] = React.useState(false);
  const resolveRef = useRef<((value: boolean) => void) | null>(null);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => {
    setIsOpen(false);
    resolveRef.current?.(false);
  }, []);

  const confirm = useCallback(() => {
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
      setIsOpen(true);
    });
  }, []);

  return { isOpen, open, close, confirm };
}

export default { BaseDialog, ConfirmDialog, DeleteDialog, SuccessDialog };
