import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Paper,
  Alert,
  Pagination,
  Container,
  Stack,
  Skeleton,
  Grid,
  Menu,
  MenuItem,
  ListItemIcon,
} from "@mui/material";
import { Person } from "@mui/icons-material";
import PatientHistoryCard from "./PatientHistoryCard";
import { IconExternalLink } from "@tabler/icons-react";
import { History as HistoryIcon } from "@mui/icons-material";

export interface ExecutionRecord {
  execution_id: string;
  user_id: string;
  base_patient_data: any;
  base_prediction: any[];
  executed_by: string;
  executed_at: string;
  updated_by?: string;
  updated_at: string;
}
export interface HistoryResponse {
  content: ExecutionRecord[];
  total_elements: number;
  total_pages: number;
  page: number;
  size: number;
}

interface PatientHistoryComponentProps {
  projectId: string;
  trialSlug: string;
  getExecutionRecords: (
    projectId: string,
    trialSlug: string,
    page: number,
    size: number
  ) => Promise<{ data: HistoryResponse }>;
  onViewDetails: (record: ExecutionRecord) => void;
}

const PatientHistoryComponent: React.FC<PatientHistoryComponentProps> = ({
  projectId,
  trialSlug,
  getExecutionRecords,
  onViewDetails,
}) => {
  const [historyData, setHistoryData] = useState<HistoryResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState<number>(1); // MUI Pagination is 1-based
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedRecord, setSelectedRecord] = useState<ExecutionRecord | null>(
    null
  );

  const pageSize = 8;

  const fetchHistory = async (pageNumber: number) => {
    setLoading(true);
    setError(null);

    try {
      const response = await getExecutionRecords(
        projectId,
        trialSlug,
        pageNumber - 1, // Convert to 0-based for API
        pageSize
      );
      setHistoryData(response.data);
    } catch (err) {
      setError("Failed to load history data");
      console.error("Error fetching history:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projectId && trialSlug) {
      fetchHistory(page);
    }
  }, [projectId, trialSlug, page]);

  const handlePageChange = (
    _event: React.ChangeEvent<unknown>,
    value: number
  ) => {
    setPage(value);
  };

  // Menu handlers
  const handleMenuClick = (
    event: React.MouseEvent<HTMLButtonElement>,
    record: ExecutionRecord
  ) => {
    setAnchorEl(event.currentTarget);
    setSelectedRecord(record);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedRecord(null);
  };

  const handleViewReport = () => {
    if (selectedRecord) {
      onViewDetails(selectedRecord);
    }
    handleMenuClose();
  };

  if (loading) {
    return (
      <Box
        display="grid"
        gridTemplateColumns={{ xs: "1fr", sm: "1fr 1fr" }} // 1 col on mobile, 2 cols on sm+
        gap={4}
      >
        {[...Array(8)].map((_, index) => (
          <Paper
            key={index}
            sx={{
              p: 2,
              borderRadius: 0.5,
            }}
            variant="outlined"
          >
            <Skeleton variant="text" width="40%" height={28} sx={{ mb: 1 }} />
            <Skeleton variant="text" width="70%" height={20} sx={{ mb: 2 }} />
          </Paper>
        ))}
      </Box>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      </Container>
    );
  }

  return (
    <Box pb={5}>
      {/* Content */}
      {historyData?.content.length === 0 ? (
        <Paper
          elevation={0}
          sx={{
            p: 6,
            textAlign: "center",
            border: "1px dashed",
            borderColor: "divider",
            borderRadius: 1,
            bgcolor: "background.default",
          }}
        >
          <Box
            sx={{
              width: 72,
              height: 72,
              borderRadius: "50%",
              bgcolor: "grey.100",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              mx: "auto",
              mb: 2,
            }}
          >
            <HistoryIcon sx={{ fontSize: 36, color: "text.secondary" }} />
          </Box>

          <Typography variant="h6" fontWeight={600} gutterBottom>
            No Records Found
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            maxWidth={360}
            mx="auto"
          >
            No execution records are available for this trial yet. Once
            predictions are run, they will appear here.
          </Typography>
        </Paper>
      ) : (
        <>
          {/* History Cards */}
          <Grid container spacing={2}>
            {historyData?.content.map((record) => (
              <Grid
                key={record.execution_id}
                component={Grid}
                size={{ xs: 12, sm: 6 }}
              >
                <PatientHistoryCard
                  executionRecord={record}
                  onMenuClick={handleMenuClick}
                  trialSlug={trialSlug}
                />
              </Grid>
            ))}
          </Grid>

          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
            anchorOrigin={{ vertical: "top", horizontal: "right" }}
            transformOrigin={{ vertical: "top", horizontal: "right" }}
            disableScrollLock
            PaperProps={{
              sx: {
                border: "1px solid",
                borderColor: "divider",
                boxShadow: "none", // optional: remove default shadow
                minWidth: 160,
                p: 0, // optional: tighter padding
                mt: 4,
              },
            }}
          >
            <MenuItem onClick={handleViewReport}>
              <ListItemIcon sx={{ minWidth: 30 }}>
                <IconExternalLink size={16} />
              </ListItemIcon>
              <Typography variant="body2">View Report</Typography>
            </MenuItem>
          </Menu>

          {/* Pagination */}
          {historyData && historyData.total_pages > 1 && (
            <Box display="flex" justifyContent="center" mt={3}>
              <Pagination
                count={historyData.total_pages}
                page={page}
                onChange={handlePageChange}
                color="primary"
                size="medium"
                showFirstButton
                showLastButton
                sx={{
                  "& .MuiPaginationItem-root": {
                    fontSize: "0.875rem",
                  },
                }}
              />
            </Box>
          )}
        </>
      )}
    </Box>
  );
};

export default PatientHistoryComponent;
