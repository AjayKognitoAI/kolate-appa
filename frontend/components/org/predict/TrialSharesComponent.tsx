import React, { useState, useEffect, useCallback } from "react";
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
  Chip,
  TextField,
  InputAdornment,
  ButtonGroup,
  Button,
} from "@mui/material";
import { Person, Search } from "@mui/icons-material";
import PatientHistoryCard from "./PatientHistoryCard";
import { IconExternalLink, IconShare } from "@tabler/icons-react";
import { History as HistoryIcon } from "@mui/icons-material";
import predictService from "@/services/predict/predict-service";

export interface ShareRecord {
  id: string;
  project_id: string;
  trial_slug: string;
  execution_id: string;
  execution: {
    execution_id: string;
    user_id: string;
    base_patient_data: any;
    base_prediction: any[];
    executed_by: string;
    executed_at: string;
    updated_by?: string;
    updated_at: string;
  } | null;
  sender: {
    auth0_id: string;
    first_name: string;
    last_name: string;
    email: string;
    avatar_url: string;
    job_title: string | null;
  };
  recipients: Array<{
    auth0_id: string;
    first_name: string;
    last_name: string;
    email: string;
    avatar_url: string;
    job_title: string | null;
  }>;
  created_at: string;
}

export interface SharesResponse {
  content: ShareRecord[];
  total_elements: number;
  total_pages: number;
  page: number;
  size: number;
}

interface TrialSharesComponentProps {
  projectId: string;
  trialSlug: string;
  auth0Id: string;
  onViewDetails: (record: ShareRecord) => void;
}

const TrialSharesComponent: React.FC<TrialSharesComponentProps> = ({
  projectId,
  trialSlug,
  auth0Id,
  onViewDetails,
}) => {
  const [sharesData, setSharesData] = useState<SharesResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState<number>(1);
  const [direction, setDirection] = useState<"sent" | "received">("received");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [debouncedQuery, setDebouncedQuery] = useState<string>(""); // debounced version of searchQuery
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedRecord, setSelectedRecord] = useState<ShareRecord | null>(
    null
  );

  const pageSize = 8;

  // stable fetch function
  const fetchShares = useCallback(
    async (pageNumber: number, query?: string) => {
      if (!projectId || !trialSlug || !auth0Id) return;
      setLoading(true);
      setError(null);

      try {
        const response = await predictService.getExecutionShares(
          projectId,
          trialSlug,
          auth0Id,
          direction,
          pageSize,
          pageNumber - 1, // API expects 0-based page
          query || undefined
        );
        // Ensure we set data only if present
        setSharesData(response?.data?.data ?? null);
      } catch (err) {
        setError("Failed to load shares data");
        console.error("Error fetching shares:", err);
      } finally {
        setLoading(false);
      }
    },
    [projectId, trialSlug, auth0Id, direction]
  );

  // Debounce searchQuery -> debouncedQuery (500ms)
  useEffect(() => {
    const handler = window.setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 500);

    return () => {
      clearTimeout(handler);
    };
  }, [searchQuery]);

  // Centralized fetching whenever page / direction / project/trial/auth0Id / debouncedQuery changes
  useEffect(() => {
    if (!projectId || !trialSlug || !auth0Id) return;
    fetchShares(page, debouncedQuery);
  }, [
    page,
    direction,
    projectId,
    trialSlug,
    auth0Id,
    debouncedQuery,
    fetchShares,
  ]);

  // When direction / project / trial / auth changes -> reset page to 1 and immediately apply current searchQuery
  // This ensures switching tabs uses the current search immediately (no waiting for debounce)
  useEffect(() => {
    if (!projectId || !trialSlug || !auth0Id) return;
    setPage(1);
    setDebouncedQuery(searchQuery);
  }, [projectId, trialSlug, auth0Id, direction]); // intentionally not including searchQuery here

  const handlePageChange = (
    _event: React.ChangeEvent<unknown>,
    value: number
  ) => {
    setPage(value);
  };

  const handleDirectionChange = (newDirection: "sent" | "received") => {
    setDirection(newDirection);
    // page reset and immediate fetch handled by the effect above
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
    setPage(1); // reset to first page when user types
    // actual fetch will happen after debounce via debouncedQuery effect
  };

  // Menu handlers
  const handleMenuClick = (
    event: React.MouseEvent<HTMLButtonElement, MouseEvent>,
    executionRecord: any // This will be ExecutionRecord from PatientHistoryCard
  ) => {
    // Find the corresponding ShareRecord from our sharesData
    const shareRecord = sharesData?.content.find(
      (record) =>
        record.execution?.execution_id === executionRecord.execution_id
    );

    if (shareRecord) {
      setAnchorEl(event.currentTarget);
      setSelectedRecord(shareRecord);
    }
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

  if (loading && !sharesData) {
    return (
      <Box>
        {/* Cards skeleton */}
        <Box
          display="grid"
          gridTemplateColumns={{ xs: "1fr", sm: "1fr 1fr" }}
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
      {/* Header with ButtonGroup and Search */}
      <Stack sx={{ mb: 3 }} direction={"row"} justifyContent={"space-between"}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
          <ButtonGroup variant="outlined" size="small">
            <Button
              onClick={() => handleDirectionChange("received")}
              variant={direction === "received" ? "contained" : "outlined"}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                textTransform: "none",
              }}
            >
              <Typography variant="body2">Shared with Me</Typography>
              {sharesData && direction === "received" && (
                <Chip
                  size="small"
                  label={loading ? 0 : sharesData.total_elements}
                  sx={{
                    height: 18,
                    fontSize: "0.75rem",
                    bgcolor:
                      direction === "received" ? "white" : "primary.main",
                    color: direction === "received" ? "primary.main" : "white",
                  }}
                />
              )}
            </Button>
            <Button
              onClick={() => handleDirectionChange("sent")}
              variant={direction === "sent" ? "contained" : "outlined"}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                textTransform: "none",
              }}
            >
              <Typography variant="body2">Shared by Me</Typography>
              {sharesData && direction === "sent" && (
                <Chip
                  size="small"
                  label={loading ? 0 : sharesData.total_elements}
                  sx={{
                    height: 18,
                    fontSize: "0.75rem",
                    bgcolor: direction === "sent" ? "white" : "primary.main",
                    color: direction === "sent" ? "primary.main" : "white",
                  }}
                />
              )}
            </Button>
          </ButtonGroup>
        </Box>

        <TextField
          placeholder={
            direction === "received"
              ? "Search by sender name or email..."
              : "Search by recipient name or email..."
          }
          variant="outlined"
          size="small"
          fullWidth
          value={searchQuery}
          onChange={handleSearchChange}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search fontSize="small" />
              </InputAdornment>
            ),
          }}
          sx={{ maxWidth: 400 }}
        />
      </Stack>

      {/* Content */}
      {loading ? (
        /* Loading skeleton */
        <Box
          display="grid"
          gridTemplateColumns={{ xs: "1fr", sm: "1fr 1fr" }}
          gap={2}
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
              <Skeleton variant="text" width="50%" height={16} />
            </Paper>
          ))}
        </Box>
      ) : sharesData?.content?.length === 0 ? (
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
            <IconShare
              size={28}
              style={{
                color: "var(--gray-600)",
              }}
            />
          </Box>

          <Typography variant="h6" fontWeight={600} gutterBottom>
            {searchQuery ? "No Results Found" : "No Shares Found"}
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            maxWidth={360}
            mx="auto"
          >
            {searchQuery
              ? `No shares found matching "${searchQuery}". Try a different search term.`
              : direction === "received"
              ? "No trial executions have been shared with you yet."
              : "You haven't shared any trial executions yet."}
          </Typography>
        </Paper>
      ) : (
        <>
          {/* Shares Cards */}
          <Grid container spacing={2}>
            {sharesData?.content.map((record) => (
              <Grid key={record.id} component={Grid} size={{ xs: 12, sm: 6 }}>
                {record.execution ? (
                  <PatientHistoryCard
                    executionRecord={record.execution}
                    onMenuClick={handleMenuClick}
                    trialSlug={trialSlug}
                    shareInfo={{
                      direction,
                      sender: record?.sender,
                      recipients: record?.recipients,
                      sharedAt: record?.created_at,
                    }}
                  />
                ) : (
                  <Paper
                    variant="outlined"
                    sx={{
                      p: 2,
                      borderRadius: 0.5,
                      height: "100%",
                      display: "flex",
                      flexDirection: "column",
                      bgcolor: "grey.50",
                    }}
                  >
                    <Typography variant="body2" color="text.secondary">
                      Execution data unavailable
                    </Typography>
                    <Box sx={{ mt: "auto" }}>
                      <Typography variant="caption" color="text.secondary">
                        {direction === "received" ? "From" : "To"}:{" "}
                        {direction === "received"
                          ? `${record.sender.first_name} ${record.sender.last_name}`
                          : record.recipients
                              .map((r) => `${r.first_name} ${r.last_name}`)
                              .join(", ")}
                      </Typography>
                    </Box>
                  </Paper>
                )}
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
                boxShadow: "none",
                minWidth: 160,
                p: 0,
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
          {sharesData && sharesData.total_pages > 1 && (
            <Box display="flex" justifyContent="center" mt={3}>
              <Pagination
                count={sharesData.total_pages}
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

export default TrialSharesComponent;
