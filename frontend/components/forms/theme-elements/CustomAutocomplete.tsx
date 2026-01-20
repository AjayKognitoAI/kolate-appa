import React from "react";
import { styled } from "@mui/material/styles";
import { Autocomplete, TextField } from "@mui/material";
import CustomFormLabel from "./CustomFormLabel";

const StyledAutocomplete = styled(Autocomplete)(({ theme }) => ({
  "& .MuiOutlinedInput-root": {
    minHeight: "44px",
    height: "44px", // Ensure fixed height
  },
  "& .MuiOutlinedInput-input": {
    minHeight: "44px",
    height: "44px", // Ensure fixed height
    boxSizing: "border-box",
    padding: "0 14px",
    display: "flex",
    alignItems: "center",
  },
  "& .MuiOutlinedInput-input::-webkit-input-placeholder": {
    color: theme.palette.text.secondary,
    opacity: "0.8",
  },
  "& .MuiOutlinedInput-input.Mui-disabled::-webkit-input-placeholder": {
    color: theme.palette.text.secondary,
    opacity: "1",
  },
  "& .Mui-disabled .MuiOutlinedInput-notchedOutline": {
    borderColor: theme.palette.grey[200],
  },
}));

const CustomAutocomplete = React.forwardRef<any, any>(
  ({ customLabel, textFieldProps = {}, options = [], ...props }, ref) => (
    <div>
      {customLabel && <CustomFormLabel>{customLabel}</CustomFormLabel>}
      <StyledAutocomplete
        options={options}
        {...props}
        ref={ref}
        renderInput={(params) => <TextField {...params} {...textFieldProps} />}
      />
    </div>
  )
);

CustomAutocomplete.displayName = "CustomAutocomplete";

export default CustomAutocomplete;
