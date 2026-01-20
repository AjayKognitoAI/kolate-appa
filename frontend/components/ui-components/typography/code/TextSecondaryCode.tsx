import CodeDialog from "@/components/shared/CodeDialog";
import React from "react";
const TextSecondaryCode = () => {
  return (
    <>
      <CodeDialog>
        {`
"use client";

import { Typography } from '@mui/material';

<Typography variant="h5" color="textSecondary">
    Text Secondary
</Typography>

<Typography variant="body1" color="textSecondary">
    Lorem ipsum dolor sit amet, consectetur adipisicing elit. Quos blanditiis tenetur
</Typography>`}
      </CodeDialog>
    </>
  );
};

export default TextSecondaryCode;
