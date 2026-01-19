import React, { useMemo, useState, useCallback } from "react";
import CustomDataGrid from "./CustomDataGrid";
import {
  Box,
  Button,
  Typography,
  Avatar,
  IconButton,
  Menu,
  MenuItem,
  TablePagination,
} from "@mui/material";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import { RevoGrid } from "@revolist/react-datagrid";
import { toast } from "react-toastify";
import predictService, {
  PatientRecord,
} from "@/services/predict/predict-service";
import squamousService from "@/services/predict/squamous-service";
import { Add, PlusOne } from "@mui/icons-material";
import lungCancerService from "@/services/predict/lung-cancer-service";
import { getCurrentProject } from "@/store/slices/projectsSlice";
import { useRouter } from "next/navigation";
import { useAppSelector } from "@/store";

interface ExtraColumn {
  field?: string;
  prop?: string;
  headerName?: string;
  name?: string;
  width?: number;
  size?: number;
  sortable?: boolean;
}

interface PatientTableProps {
  projectId: string;
  trialSlug: string;
  modelName: string;
  patients: any[];
  setPatients: React.Dispatch<React.SetStateAction<any[]>>;
  onAddPatient: () => void;
  extraColumns: ExtraColumn[];
  navigation: (arg: any) => void;
}

interface PatientRow {
  id: string;
  uid: string;
  name: string;
  age: number;
  gender: string;
  [key: string]: any;
}

export default function PatientTable({
  projectId,
  trialSlug,
  modelName,
  patients,
  setPatients,
  onAddPatient,
  extraColumns,
  navigation,
}: PatientTableProps) {
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [menuRowId, setMenuRowId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  // Pagination state only (search removed)
  const [currentPage, setCurrentPage] = useState<number>(0);
  const [pageSize, setPageSize] = useState<number>(20);
  const project = useAppSelector(getCurrentProject);
  const openMenu = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>, id: string) => {
      setMenuAnchor(event.currentTarget);
      setMenuRowId(id);
    },
    []
  );

  const closeMenu = useCallback(() => {
    setMenuAnchor(null);
    setMenuRowId(null);
  }, []);

  // Normalize rows
  const normalizedRows = useMemo(() => {
    return patients.map((item, i) => {
      const pd = item.patient_data || {};

      let uid = `P${i + 1}`;
      let name = `Patient ${i + 1}`;
      let age = 0;
      let gender = "Unknown";

      if (trialSlug === "car-t-cell-therapy-b") {
        uid = pd.patid || uid;
        name = pd.name || pd.patient_name || pd.patid || name;
        age = Number(pd.ptage || 0);
        gender = pd.sex_id || gender;
      } else if (trialSlug === "squamous-lung-therapy-n") {
        uid = pd.ALTPATID || uid;
        name = pd.ALTPATID || name;
        age = Number(pd.age_cat || 0);
        gender = pd.SEX || gender;
      } else if (trialSlug === "lung-cancer-risk") {
        uid = pd.Patient_ID || uid;
        name = pd.Patient_ID ? `Patient ${pd.Patient_ID}` : name;
        age = Number(pd.Age || 0);
        gender = pd.Gender || gender;
      }

      return {
        id: item.record_id,
        uid,
        name,
        age,
        gender,
        ...pd,
      } as PatientRow;
    });
  }, [patients, trialSlug]);

  // Pagination (applied to all rows since RevoGrid handles filtering internally)
  const paginatedRows = useMemo(() => {
    const startIndex = currentPage * pageSize;
    const endIndex = startIndex + pageSize;
    return normalizedRows.slice(startIndex, endIndex);
  }, [normalizedRows, currentPage, pageSize]);

  // Stable columns reference for RevoGrid with proper typing and accessibility
  const columns = useMemo(
    () => [
      {
        prop: "uid",
        name: "Patient ID",
        size: 150,
        pin: "colPinStart" as const,
        filter: "string" as const,
        sortable: true,
        cellTemplate: (createElement: any, props: any) => {
          const row = props.model;
          return createElement(
            "div",
            {
              style: {
                display: "flex",
                alignItems: "center",
                gap: "8px",
                height: "100%",
                padding: "8px",
                userSelect: "text",
                cursor: "text",
              },
              role: "cell",
              tabIndex: 0,
              "aria-label": `Patient ID: ${row.uid}`,
            },
            [
              createElement(
                "div",
                {
                  style: {
                    width: "30px",
                    height: "30px",
                    borderRadius: "50%",
                    backgroundColor: "#E0E7FF",
                    color: "#1e3a8a",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: "700",
                    fontSize: "12px",
                    flexShrink: 0,
                  },
                },
                "P"
              ),
              createElement(
                "span",
                {
                  style: {
                    fontWeight: "500",
                    fontSize: "14px",
                    userSelect: "text",
                    cursor: "text",
                  },
                },
                String(row.uid) // Ensure it's always a string for display
              ),
            ]
          );
        },
      },

      {
        prop: "age",
        name: "Age",
        size: 80,
        filter: "number" as const,
        sortable: true,
        cellTemplate: (createElement: any, props: any) => {
          const row = props.model;
          return createElement(
            "div",
            {
              style: {
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                height: "100%",
                padding: "8px",
                userSelect: "text",
                cursor: "text",
                fontSize: "14px",
              },
              role: "cell",
              tabIndex: 0,
              "aria-label": `Age: ${row.age} years`,
            },
            `${row.age}`
          );
        },
      },
      {
        prop: "gender",
        name: "Gender",
        size: 100,
        filter: "string" as const,
        sortable: true,
        cellTemplate: (createElement: any, props: any) => {
          const row = props.model;
          return createElement(
            "div",
            {
              style: {
                display: "flex",
                alignItems: "center",
                height: "100%",
                padding: "8px",
                userSelect: "text",
                cursor: "text",
                fontSize: "14px",
              },
              role: "cell",
              tabIndex: 0,
              "aria-label": `Gender: ${row.gender}`,
            },
            row.gender
          );
        },
      },
      ...extraColumns.map((col) => ({
        prop: col.field || col.prop || "unknown",
        name: col.headerName || col.name || "Column",
        size: col.width || col.size || 150,
        filter: "string" as const,
        sortable: col.sortable !== false, // Enable sorting unless explicitly disabled
        cellTemplate: (createElement: any, props: any) => {
          const row = props.model;
          const value = row[col.field || col.prop || "unknown"];
          return createElement(
            "div",
            {
              style: {
                display: "flex",
                alignItems: "center",
                height: "100%",
                padding: "8px",
                userSelect: "text",
                cursor: "text",
                fontSize: "14px",
              },
              role: "cell",
              tabIndex: 0,
              "aria-label": `${col.headerName || col.name}: ${value}`,
            },
            String(value || "")
          );
        },
      })),
      {
        prop: "action",
        name: "Action",
        size: 120,
        pin: "colPinEnd" as const,
        filter: false,
        sortable: false,
        cellTemplate: (createElement: any, props: any) => {
          const row = props.model;
          return createElement(
            "div",
            {
              style: {
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                height: "100%",
                cursor: "pointer",
              },
              role: "cell",
            },
            [
              createElement(
                "button",
                {
                  style: {
                    border: "1px solid #e2e8f0",
                    background: "#ffffff",
                    cursor: "pointer",
                    padding: "6px 8px",
                    borderRadius: "6px",
                    fontSize: "16px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#64748b",
                    transition: "all 0.2s ease",
                    boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)",
                    minWidth: "32px",
                    minHeight: "32px",
                  },
                  disabled: actionLoading,
                  onClick: (e: any) => {
                    e.stopPropagation();
                    const mockEvent = {
                      currentTarget: e.target,
                      stopPropagation: () => {},
                    } as React.MouseEvent<HTMLButtonElement>;
                    openMenu(mockEvent, row.id);
                  },
                  onMouseEnter: (e: any) => {
                    e.target.style.backgroundColor = "#f1f5f9";
                    e.target.style.borderColor = "#cbd5e1";
                    e.target.style.color = "#334155";
                    e.target.style.transform = "translateY(-1px)";
                    e.target.style.boxShadow = "0 2px 4px rgba(0, 0, 0, 0.1)";
                  },
                  onMouseLeave: (e: any) => {
                    e.target.style.backgroundColor = "#ffffff";
                    e.target.style.borderColor = "#e2e8f0";
                    e.target.style.color = "#64748b";
                    e.target.style.transform = "translateY(0)";
                    e.target.style.boxShadow = "0 1px 2px rgba(0, 0, 0, 0.05)";
                  },
                  "aria-label": `Actions for patient ${row.uid}`,
                  "aria-haspopup": "true",
                  role: "button",
                  tabIndex: 0,
                },
                "⋮"
              ),
            ]
          );
        },
      },
    ],
    [extraColumns, openMenu, actionLoading]
  );

  // Transform data for the grid - keep original structure for filtering
  const source = useMemo(() => {
    return paginatedRows.map((row) => ({
      ...row,
      // Ensure all filterable fields are properly typed for mixed content
      uid: String(row.uid), // Convert to string for consistent filtering of numbers and text
      age: Number(row.age) || 0,
      gender: String(row.gender),
    }));
  }, [paginatedRows]);

  const handleRunPrediction = async () => {
    if (!menuRowId) return;
    closeMenu();
    setActionLoading(true);
    const loadingToastId = toast.loading("Running prediction...");
    try {
      const record = patients.find((p) => p.record_id === menuRowId);
      if (!record) throw new Error("Record not found");

      if (trialSlug === "car-t-cell-therapy-b") {
        const result = await predictService.predict(
          {
            patient_data: record.patient_data,
          },
          project?.project_id ?? ""
        );
        navigation(result?.data);
      } else if (trialSlug === "squamous-lung-therapy-n") {
        const result = await squamousService.predict(
          record.patient_data,
          project?.project_id ?? ""
        );
        navigation(result?.data);
      } else if (trialSlug === "lung-cancer-risk") {
        const result = await lungCancerService.predict(
          record.patient_data,
          project?.project_id ?? ""
        );
        navigation(result);
      }

      toast.dismiss(loadingToastId);
    } catch (error) {
      toast.dismiss(loadingToastId);
      toast.error("Failed to run prediction.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!menuRowId) return;
    closeMenu();
    setActionLoading(true);
    const loadingToastId = toast.loading("Deleting patient...");
    try {
      await predictService.deletePatientRecord(projectId, trialSlug, menuRowId);
      setPatients((prev) => prev.filter((p) => p.record_id !== menuRowId));
      toast.dismiss(loadingToastId);
      toast.success("Patient deleted!");
    } catch (error) {
      toast.dismiss(loadingToastId);
      toast.error("Failed to delete patient.");
    } finally {
      setActionLoading(false);
    }
  };

  const handlePageChange = (
    event: React.MouseEvent<HTMLButtonElement> | null,
    newPage: number
  ) => {
    setCurrentPage(newPage);
  };

  const handlePageSizeChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setPageSize(parseInt(event.target.value, 10));
    setCurrentPage(0);
  };

  return (
    <Box>
      {/* Header */}
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={2}
      >
        <Typography variant="h6">
          Select patient profile ({modelName})
        </Typography>
        <Button
          variant="contained"
          onClick={onAddPatient}
          startIcon={<Add fontSize={"small"} />}
        >
          Add Patients Data
        </Button>
      </Box>

      <CustomDataGrid
        columns={columns.map((col) => ({
          ...col,
          id: col.prop,
          label: col.name,
        }))}
        source={source}
        height="calc(100vh - 350px)"
        minHeight={400}
        rowSize={60}
        theme="compact"
        filter={true}
        resize={true}
        readonly={true}
      />

      {/* Pagination */}
      <Box display="flex" justifyContent="end" mt={0}>
        <TablePagination
          component="div"
          count={normalizedRows.length}
          page={currentPage}
          onPageChange={handlePageChange}
          rowsPerPage={pageSize}
          onRowsPerPageChange={handlePageSizeChange}
          rowsPerPageOptions={[10, 20, 50, 100]}
          showFirstButton
          showLastButton
        />
      </Box>

      {/* Action menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={closeMenu}
      >
        <MenuItem onClick={handleRunPrediction} disabled={actionLoading}>
          Run Prediction
        </MenuItem>
        <MenuItem onClick={handleDelete} disabled={actionLoading}>
          Delete
        </MenuItem>
      </Menu>
    </Box>
  );
}
