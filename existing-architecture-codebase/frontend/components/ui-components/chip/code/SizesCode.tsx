import CodeDialog from "@/components/shared/CodeDialog";
import React from "react";
const SizesCode = () => {
  return (
    <>
      <CodeDialog>
        {`
"use client";
import * as React from 'react';
import {  
Chip, 
 }  from '@mui/material';
import InlineItemCard from "@/components/shared/InlineItemCard";

<InlineItemCard>
    <Chip label="Small" size="small" color="primary" />
    <Chip label="Normal" color="primary" />
</InlineItemCard>`}
      </CodeDialog>
    </>
  );
};

export default SizesCode;
