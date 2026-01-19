import CodeDialog from "@/components/shared/CodeDialog";
import React from "react";
const TextInfoCode = () => {
  return (
    <>
      <CodeDialog>
        {`
"use client";

import { Typography } from '@mui/material';

<Typography
    variant="h5"
    sx={{ color: (theme) => theme.palette.info.main }}
>
    Text Info
</Typography>

<Typography variant="body1" sx={{ color: (theme) => theme.palette.info.main }}>
    Lorem ipsum dolor sit amet, consectetur adipisicing elit. Quos blanditiis tenetur
</Typography>`}
      </CodeDialog>
    </>
  );
};

export default TextInfoCode;
