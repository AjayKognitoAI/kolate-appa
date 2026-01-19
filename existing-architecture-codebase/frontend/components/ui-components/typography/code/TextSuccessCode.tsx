import CodeDialog from "@/components/shared/CodeDialog";
import React from "react";
const TextErrorCode = () => {
  return (
    <>
      <CodeDialog>
        {`
"use client";

import { Typography } from '@mui/material';

<Typography
    variant="h5"
    sx={{ color: (theme) => theme.palette.success.main }}
>
    Text Success
</Typography>

<Typography variant="body1" sx={{ color: (theme) => theme.palette.success.main }}>
    Lorem ipsum dolor sit amet, consectetur adipisicing elit. Quos blanditiis tenetur
</Typography>`}
      </CodeDialog>
    </>
  );
};

export default TextErrorCode;
