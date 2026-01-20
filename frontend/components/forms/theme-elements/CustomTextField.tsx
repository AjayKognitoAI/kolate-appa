import React from "react";
import { styled } from "@mui/material/styles";
import { TextField } from "@mui/material";
import CustomFormLabel from "./CustomFormLabel"; // adjust path if needed
import { Padding } from "@mui/icons-material";

const StyledTextField = styled((props: any) => <TextField {...props} />)(
  ({ theme }) => ({
    // Target the root of the outlined input
    "& .MuiOutlinedInput-root": {
      minHeight: "44px",
    },
    // Target the actual input element
    "& .MuiOutlinedInput-input": {
      minHeight: "44px",
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
  })
);

const CustomTextField = React.forwardRef<any, any>(
  ({ customLabel, ...props }, ref) => (
    <div>
      {customLabel && <CustomFormLabel>{customLabel}</CustomFormLabel>}
      <StyledTextField {...props} ref={ref} />
    </div>
  )
);

CustomTextField.displayName = "CustomTextField";

export default CustomTextField;
