"use client";
import React from "react";
import { styled } from "@mui/material/styles";
import { Typography } from "@mui/material";

const CustomFormLabel = styled((props: any) => (
  <Typography
    variant="subtitle1"
    fontWeight={500}
    {...props}
    component="label"
    htmlFor={props.htmlFor}
  />
))(() => ({
  marginBottom: "5px",
  display: "block",
  fontSize: "14px",
}));

export default CustomFormLabel;
