import React from "react";
import { Box } from "@mui/material";
import { RevoGrid } from "@revolist/react-datagrid";

export interface Column {
  id: string;
  label: string;
  prop: string;
  name: string;
  size?: number;
  width?: number;
  type?: "string" | "number" | "date" | "boolean" | "actions";
  pin?: "colPinStart" | "colPinEnd";
  filter?: boolean | "string" | "number";
  sortable?: boolean;
  cellTemplate?: (createElement: any, props: any) => React.ReactNode;
}

interface CustomDataGridProps {
  columns: Column[];
  source: any[];
  height?: string | number;
  minHeight?: number;
  rowSize?: number;
  theme?: string;
  filter?: boolean;
  resize?: boolean;
  readonly?: boolean;
}

const CustomDataGrid: React.FC<CustomDataGridProps> = ({
  columns,
  source,
  height = "calc(100vh - 280px)",
  minHeight = 400,
  rowSize = 60,
  theme = "compact",
  filter = true,
  resize = true,
  readonly = true,
}) => {
  return (
    <Box
      sx={{
        height: height,
        minHeight: minHeight,
        width: "100%",
        border: "1px solid #e6e7ea",
        backgroundColor: "#fff",
        "& .revogr-header": {
          backgroundColor: "#fbfbfc",
          borderBottom: "1px solid #eef0f2",
          fontWeight: 600,
        },
        "& .revogr-cell": {
          borderRight: "1px solid #eef0f2",
        },
        "& .revogr-row:hover": {
          backgroundColor: "#f8fafc",
        },
        "& .revogr-cell:focus": {
          outline: "2px solid #1976d2",
          outlineOffset: "-2px",
        },
        "& .revogr-cell[data-col='action']": {
          backgroundColor: "#ffffff !important",
        },
        "& .revogr-row:hover .revogr-cell[data-col='action']": {
          backgroundColor: "#f8fafc !important",
        },
        // Ensure text selection works but prevent editing
        "& .revogr-cell *": {
          userSelect: "text !important",
          cursor: "text !important",
        },
        "& .revogr-cell[data-col='action'] *": {
          userSelect: "none !important",
          cursor: "pointer !important",
        },
        // Style filter popup
        "& .revogr-filter-popup .close-button": {
          color: "var(--primary) !important",
        },
        "& .revogr-filter .filter-button": {
          color: "var(--primary) !important",
        },
        "& .revogr-filter-popup .revogr-button": {
          color: "var(--primary) !important",
        },
        "& .revogr-filter-popup button": {
          color: "var(--primary) !important",
        },
        "& [data-testid='filter-popup'] button": {
          color: "var(--primary) !important",
        },
        "& .filter-popup button": {
          color: "var(--primary) !important",
        },
        "& .revo-button.green": {
          background: "var(--primary) !important",
        },
      }}
    >
      <RevoGrid
        columns={columns}
        source={source}
        theme={theme}
        filter={filter}
        resize={resize}
        readonly={readonly}
        rowSize={rowSize}
        role="grid"
        aria-label="Data grid"
      />
    </Box>
  );
};

export default CustomDataGrid;
