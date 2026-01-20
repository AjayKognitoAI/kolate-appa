import CodeDialog from "@/components/shared/CodeDialog";
import React from "react";
const DisabledCode = () => {
  return (
    <>
      <CodeDialog>
        {`
"use client";
import * as React from 'react';
import { 
Avatar, 
Chip,
 }  from '@mui/material';
import InlineItemCard from "@/components/shared/InlineItemCard";

<InlineItemCard>
    <Chip
        label="Custom Icon" disabled avatar={<Avatar >M</Avatar>}
        onDelete={handleDelete}
    />
    <Chip
        label="Custom Icon" color="primary" disabled avatar={<Avatar >S</Avatar>}
        onDelete={handleDelete}
    />
</InlineItemCard>`}
      </CodeDialog>
    </>
  );
};

export default DisabledCode;
