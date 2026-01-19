/**
 * Shared Form Controls
 *
 * Reusable form components with built-in validation display.
 * Wraps React Hook Form for consistent patterns.
 */

"use client";

import React from "react";
import {
  TextField,
  FormControl,
  FormLabel,
  FormHelperText,
  Select,
  MenuItem,
  InputLabel,
  Checkbox,
  FormControlLabel,
  RadioGroup,
  Radio,
  Switch,
  Box,
  Typography,
  InputAdornment,
  IconButton,
} from "@mui/material";
import { Controller, Control, FieldError, FieldValues, Path } from "react-hook-form";
import { IconEye, IconEyeOff } from "@tabler/icons-react";
import { useState } from "react";

// =============================================================================
// Types
// =============================================================================

interface BaseFieldProps {
  name: string;
  label: string;
  required?: boolean;
  disabled?: boolean;
  helperText?: string;
  error?: FieldError;
}

// =============================================================================
// Text Input
// =============================================================================

interface TextInputProps<T extends FieldValues> extends BaseFieldProps {
  control: Control<T>;
  type?: "text" | "email" | "number" | "password" | "tel" | "url";
  placeholder?: string;
  multiline?: boolean;
  rows?: number;
  maxLength?: number;
  startAdornment?: React.ReactNode;
  endAdornment?: React.ReactNode;
}

export function TextInput<T extends FieldValues>({
  control,
  name,
  label,
  required,
  disabled,
  helperText,
  error,
  type = "text",
  placeholder,
  multiline,
  rows,
  maxLength,
  startAdornment,
  endAdornment,
}: TextInputProps<T>): React.ReactElement {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === "password";

  return (
    <Controller
      name={name as Path<T>}
      control={control}
      render={({ field, fieldState }) => (
        <TextField
          {...field}
          fullWidth
          label={label}
          required={required}
          disabled={disabled}
          type={isPassword && showPassword ? "text" : type}
          placeholder={placeholder}
          multiline={multiline}
          rows={rows}
          error={!!fieldState.error || !!error}
          helperText={fieldState.error?.message || error?.message || helperText}
          inputProps={{ maxLength }}
          InputProps={{
            startAdornment: startAdornment && (
              <InputAdornment position="start">{startAdornment}</InputAdornment>
            ),
            endAdornment: isPassword ? (
              <InputAdornment position="end">
                <IconButton
                  onClick={() => setShowPassword(!showPassword)}
                  edge="end"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <IconEyeOff size={20} /> : <IconEye size={20} />}
                </IconButton>
              </InputAdornment>
            ) : endAdornment ? (
              <InputAdornment position="end">{endAdornment}</InputAdornment>
            ) : undefined,
          }}
        />
      )}
    />
  );
}

// =============================================================================
// Select Input
// =============================================================================

interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

interface SelectInputProps<T extends FieldValues> extends BaseFieldProps {
  control: Control<T>;
  options: SelectOption[];
  placeholder?: string;
  multiple?: boolean;
}

export function SelectInput<T extends FieldValues>({
  control,
  name,
  label,
  required,
  disabled,
  helperText,
  error,
  options,
  placeholder,
  multiple,
}: SelectInputProps<T>): React.ReactElement {
  return (
    <Controller
      name={name as Path<T>}
      control={control}
      render={({ field, fieldState }) => (
        <FormControl fullWidth error={!!fieldState.error || !!error}>
          <InputLabel required={required}>{label}</InputLabel>
          <Select
            {...field}
            label={label}
            disabled={disabled}
            multiple={multiple}
            displayEmpty={!!placeholder}
          >
            {placeholder && (
              <MenuItem value="" disabled>
                <Typography color="text.secondary">{placeholder}</Typography>
              </MenuItem>
            )}
            {options.map((option) => (
              <MenuItem key={option.value} value={option.value} disabled={option.disabled}>
                {option.label}
              </MenuItem>
            ))}
          </Select>
          {(fieldState.error?.message || error?.message || helperText) && (
            <FormHelperText>
              {fieldState.error?.message || error?.message || helperText}
            </FormHelperText>
          )}
        </FormControl>
      )}
    />
  );
}

// =============================================================================
// Checkbox Input
// =============================================================================

interface CheckboxInputProps<T extends FieldValues> extends BaseFieldProps {
  control: Control<T>;
  description?: string;
}

export function CheckboxInput<T extends FieldValues>({
  control,
  name,
  label,
  required,
  disabled,
  helperText,
  error,
  description,
}: CheckboxInputProps<T>): React.ReactElement {
  return (
    <Controller
      name={name as Path<T>}
      control={control}
      render={({ field, fieldState }) => (
        <FormControl error={!!fieldState.error || !!error}>
          <FormControlLabel
            control={
              <Checkbox
                {...field}
                checked={!!field.value}
                disabled={disabled}
                required={required}
              />
            }
            label={
              <Box>
                <Typography variant="body1">{label}</Typography>
                {description && (
                  <Typography variant="caption" color="text.secondary">
                    {description}
                  </Typography>
                )}
              </Box>
            }
          />
          {(fieldState.error?.message || error?.message || helperText) && (
            <FormHelperText>
              {fieldState.error?.message || error?.message || helperText}
            </FormHelperText>
          )}
        </FormControl>
      )}
    />
  );
}

// =============================================================================
// Radio Group Input
// =============================================================================

interface RadioGroupInputProps<T extends FieldValues> extends BaseFieldProps {
  control: Control<T>;
  options: SelectOption[];
  row?: boolean;
}

export function RadioGroupInput<T extends FieldValues>({
  control,
  name,
  label,
  required,
  disabled,
  helperText,
  error,
  options,
  row,
}: RadioGroupInputProps<T>): React.ReactElement {
  return (
    <Controller
      name={name as Path<T>}
      control={control}
      render={({ field, fieldState }) => (
        <FormControl error={!!fieldState.error || !!error}>
          <FormLabel required={required}>{label}</FormLabel>
          <RadioGroup {...field} row={row}>
            {options.map((option) => (
              <FormControlLabel
                key={option.value}
                value={option.value}
                control={<Radio disabled={disabled || option.disabled} />}
                label={option.label}
              />
            ))}
          </RadioGroup>
          {(fieldState.error?.message || error?.message || helperText) && (
            <FormHelperText>
              {fieldState.error?.message || error?.message || helperText}
            </FormHelperText>
          )}
        </FormControl>
      )}
    />
  );
}

// =============================================================================
// Switch Input
// =============================================================================

interface SwitchInputProps<T extends FieldValues> extends BaseFieldProps {
  control: Control<T>;
  description?: string;
}

export function SwitchInput<T extends FieldValues>({
  control,
  name,
  label,
  disabled,
  helperText,
  error,
  description,
}: SwitchInputProps<T>): React.ReactElement {
  return (
    <Controller
      name={name as Path<T>}
      control={control}
      render={({ field, fieldState }) => (
        <FormControl error={!!fieldState.error || !!error}>
          <FormControlLabel
            control={
              <Switch {...field} checked={!!field.value} disabled={disabled} />
            }
            label={
              <Box>
                <Typography variant="body1">{label}</Typography>
                {description && (
                  <Typography variant="caption" color="text.secondary">
                    {description}
                  </Typography>
                )}
              </Box>
            }
          />
          {(fieldState.error?.message || error?.message || helperText) && (
            <FormHelperText>
              {fieldState.error?.message || error?.message || helperText}
            </FormHelperText>
          )}
        </FormControl>
      )}
    />
  );
}

// =============================================================================
// Form Section
// =============================================================================

interface FormSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
}

export const FormSection: React.FC<FormSectionProps> = ({
  title,
  description,
  children,
}) => (
  <Box mb={4}>
    <Typography variant="h6" gutterBottom>
      {title}
    </Typography>
    {description && (
      <Typography variant="body2" color="text.secondary" mb={2}>
        {description}
      </Typography>
    )}
    <Box display="flex" flexDirection="column" gap={2}>
      {children}
    </Box>
  </Box>
);

// =============================================================================
// Form Row (for horizontal layouts)
// =============================================================================

interface FormRowProps {
  children: React.ReactNode;
  columns?: number;
}

export const FormRow: React.FC<FormRowProps> = ({ children, columns = 2 }) => (
  <Box
    display="grid"
    gridTemplateColumns={{ xs: "1fr", md: `repeat(${columns}, 1fr)` }}
    gap={2}
  >
    {children}
  </Box>
);

export default {
  TextInput,
  SelectInput,
  CheckboxInput,
  RadioGroupInput,
  SwitchInput,
  FormSection,
  FormRow,
};
