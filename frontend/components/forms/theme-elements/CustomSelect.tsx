"use client";
import React from "react";
import { styled } from "@mui/material/styles";
import { Select, MenuItem, FormHelperText, FormControl } from "@mui/material";
import CustomFormLabel from "./CustomFormLabel";

interface SelectOption {
  value: string | number;
  label: string;
}

const StyledSelect = styled((props: any) => <Select {...props} />)(
  ({ theme }) => ({
    // Target the root of the outlined input
    "& .MuiOutlinedInput-root": {
      // Remove vertical padding if needed
      paddingTop: 0,
      paddingBottom: 0,
      height: "44px",
      minHeight: "44px",
    },
    // Target the actual select element
    "& .MuiSelect-select": {
      height: "44px",
      minHeight: "44px",
      boxSizing: "border-box",
      padding: "0 14px",
      display: "flex",
      alignItems: "center",
    },
    "& .MuiOutlinedInput-input.Mui-disabled::-webkit-input-placeholder": {
      color: theme.palette.text.secondary,
      opacity: "1",
    },
    "& .Mui-disabled .MuiOutlinedInput-notchedOutline": {
      borderColor: theme.palette.grey[200],
    },
  })
);

interface CustomSelectProps {
  customLabel?: string;
  options?: SelectOption[];
  helperText?: React.ReactNode;
  error?: boolean;
  placeholder?: string;
  [key: string]: any;
}

const CustomSelect = React.forwardRef<HTMLDivElement, CustomSelectProps>(
  (
    {
      customLabel,
      options = [],
      children,
      helperText,
      error,
      placeholder,
      ...props
    },
    ref
  ) => (
    <div>
      {customLabel && <CustomFormLabel>{customLabel}</CustomFormLabel>}
      <FormControl fullWidth error={error}>
        <StyledSelect
          {...props}
          ref={ref}
          fullWidth
          error={error}
          style={{ height: "44px", minHeight: "44px" }}
          displayEmpty
          renderValue={(selected: unknown) => {
            if (!selected) {
              return (
                <span style={{ color: "#aaa" }}>
                  {placeholder || "Select..."}
                </span>
              );
            }
            const found = options.find(
              (o: SelectOption) => o.value === selected
            );
            return found ? found.label : (selected as string);
          }}
        >
          {placeholder && (
            <MenuItem value="" disabled hidden>
              {placeholder}
            </MenuItem>
          )}
          {options && options.length > 0
            ? options.map((option: SelectOption) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))
            : children}
        </StyledSelect>
        {helperText && <FormHelperText>{helperText}</FormHelperText>}
      </FormControl>
    </div>
  )
);

CustomSelect.displayName = "CustomSelect";

export default CustomSelect;
