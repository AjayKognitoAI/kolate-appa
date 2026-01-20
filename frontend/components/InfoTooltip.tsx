import React from "react";
import { Tooltip, IconButton, Box, Typography, TooltipProps } from "@mui/material";
import { IconInfoCircle, IconQuestionMark } from "@tabler/icons-react";

interface InfoTooltipProps {
  title: string;
  description?: string;
  placement?: TooltipProps["placement"];
  icon?: "info" | "question";
  size?: "small" | "medium" | "large";
  variant?: "standard" | "inline";
}

/**
 * InfoTooltip Component
 *
 * A reusable tooltip component for providing helpful information to users.
 * Designed to be user-friendly and accessible for non-technical users.
 *
 * @param title - Main tooltip text (keep concise)
 * @param description - Additional detailed explanation (optional)
 * @param placement - Tooltip position relative to icon
 * @param icon - Icon style: "info" (default) or "question"
 * @param size - Icon size: "small", "medium" (default), or "large"
 * @param variant - Display variant: "standard" (icon button) or "inline" (text icon)
 */
export function InfoTooltip({
  title,
  description,
  placement = "top",
  icon = "info",
  size = "medium",
  variant = "standard",
}: InfoTooltipProps) {
  const iconSize = size === "small" ? 16 : size === "large" ? 22 : 18;

  const tooltipContent = description ? (
    <Box sx={{ maxWidth: 320 }}>
      <Typography variant="body2" fontWeight="600" gutterBottom>
        {title}
      </Typography>
      <Typography variant="caption" sx={{ opacity: 0.9 }}>
        {description}
      </Typography>
    </Box>
  ) : (
    title
  );

  const IconComponent = icon === "question" ? IconQuestionMark : IconInfoCircle;

  if (variant === "inline") {
    return (
      <Tooltip
        title={tooltipContent}
        placement={placement}
        arrow
        enterDelay={200}
        leaveDelay={200}
      >
        <Box
          component="span"
          sx={{
            display: "inline-flex",
            alignItems: "center",
            ml: 0.5,
            cursor: "help",
            color: "text.secondary",
            transition: "color 0.2s",
            "&:hover": {
              color: "primary.main",
            },
          }}
        >
          <IconComponent size={iconSize} />
        </Box>
      </Tooltip>
    );
  }

  return (
    <Tooltip
      title={tooltipContent}
      placement={placement}
      arrow
      enterDelay={200}
      leaveDelay={200}
    >
      <IconButton
        size={size}
        sx={{
          color: "text.secondary",
          "&:hover": {
            color: "primary.main",
            bgcolor: "primary.lighter",
          },
        }}
      >
        <IconComponent size={iconSize} />
      </IconButton>
    </Tooltip>
  );
}

/**
 * Field Label with Tooltip
 *
 * Convenience component for form labels with info tooltips
 */
interface FieldLabelWithTooltipProps {
  label: string;
  tooltip: string;
  required?: boolean;
  tooltipDescription?: string;
}

export function FieldLabelWithTooltip({
  label,
  tooltip,
  required,
  tooltipDescription,
}: FieldLabelWithTooltipProps) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 0.5 }}>
      <Typography variant="body2" fontWeight="500">
        {label}
        {required && (
          <Typography component="span" color="error.main" sx={{ ml: 0.5 }}>
            *
          </Typography>
        )}
      </Typography>
      <InfoTooltip
        title={tooltip}
        description={tooltipDescription}
        variant="inline"
        size="small"
      />
    </Box>
  );
}
