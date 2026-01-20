import CodeDialog from "@/components/shared/CodeDialog";
import React from "react";
const CustomOutlinedIcon = () => {
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
        label="Custom Icon" color="primary" avatar={<Avatar >M</Avatar>}
        onDelete={handleDelete}
        deleteIcon={<IconCheck width={20} />}
    />
    <Chip
        label="Custom Icon" color="secondary" avatar={<Avatar >S</Avatar>}
        onDelete={handleDelete}
        deleteIcon={<IconChecks width={20} />}
    />
</InlineItemCard>`}
      </CodeDialog>
    </>
  );
};

export default CustomOutlinedIcon;
