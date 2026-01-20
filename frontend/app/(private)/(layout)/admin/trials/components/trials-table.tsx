"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import {
  TableContainer,
  Table,
  TableRow,
  TableCell,
  TableBody,
  Typography,
  TableHead,
  Chip,
  Box,
  IconButton,
  Menu,
  MenuItem,
  TablePagination,
  Skeleton,
  Paper,
  TableSortLabel,
  TextField,
  InputAdornment,
  Avatar,
  Tooltip,
} from "@mui/material";
import {
  IconEye,
  IconPencil,
  IconTrash,
  IconDots,
  IconFlask,
  IconSearch,
  IconSettings,
  IconBrain,
  IconPlayerPlay,
} from "@tabler/icons-react";
import { trialsService, Trial, Module } from "@/services/admin/trials-service";
import { mlEvaluationAdminService } from "@/services/admin/ml-evaluation-admin-service";
import { toast } from "react-toastify";
import TrialFormModal from "./trial-form-modal";
import DeleteTrialModal from "./delete-trial-modal";

type MLConfigStatus = "active" | "draft" | "not_configured";

type Order = "asc" | "desc";
type SortField = "name" | "slug" | "module_id" | "created_at" | "updated_at";

// Empty state component
const EmptyState = () => (
  <Box
    sx={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      py: 8,
      px: 2,
      textAlign: "center",
    }}
  >
    <IconFlask
      size={64}
      style={{
        color: "#9e9e9e",
        marginBottom: "16px",
      }}
    />
    <Typography variant="h6" color="textSecondary" gutterBottom>
      No studies found
    </Typography>
    <Typography variant="body2" color="textSecondary">
      Create your first trial to get started
    </Typography>
  </Box>
);

// Loading skeleton
const LoadingSkeleton = () => (
  <>
    {[...Array(5)].map((_, index) => (
      <TableRow key={index}>
        <TableCell>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Skeleton variant="circular" width={40} height={40} />
            <Box>
              <Skeleton variant="text" width={150} />
              <Skeleton variant="text" width={100} />
            </Box>
          </Box>
        </TableCell>
        <TableCell>
          <Skeleton variant="text" width={120} />
        </TableCell>
        <TableCell>
          <Skeleton variant="rectangular" width={80} height={24} />
        </TableCell>
        <TableCell>
          <Skeleton variant="text" width={200} />
        </TableCell>
        <TableCell>
          <Skeleton variant="rectangular" width={100} height={24} />
        </TableCell>
        <TableCell>
          <Skeleton variant="text" width={100} />
        </TableCell>
        <TableCell>
          <Skeleton variant="circular" width={32} height={32} />
        </TableCell>
      </TableRow>
    ))}
  </>
);

interface TrialsTableProps {
  refreshTrigger?: number;
  onRefresh?: () => void;
}

const TrialsTable = ({ refreshTrigger, onRefresh }: TrialsTableProps) => {
  const router = useRouter();
  const [data, setData] = React.useState<Trial[]>([]);
  const [modules, setModules] = React.useState<Module[]>([]);
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [loading, setLoading] = React.useState(false);
  const [page, setPage] = React.useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(10);
  const [totalItems, setTotalItems] = React.useState(0);
  const [selectedTrial, setSelectedTrial] = React.useState<Trial | null>(null);
  const [orderBy, setOrderBy] = React.useState<SortField>("created_at");
  const [order, setOrder] = React.useState<Order>("desc");
  const [searchKeyword, setSearchKeyword] = React.useState("");
  const [editModalOpen, setEditModalOpen] = React.useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = React.useState(false);
  const [mlConfigStatus, setMlConfigStatus] = React.useState<Record<string, MLConfigStatus>>({});

  const handleRequestSort = (property: SortField) => {
    const isAsc = orderBy === property && order === "asc";
    setOrder(isAsc ? "desc" : "asc");
    setOrderBy(property);
  };

  const sortData = (data: Trial[]): Trial[] => {
    return [...data].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (orderBy) {
        case "name":
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case "slug":
          aValue = a.slug.toLowerCase();
          bValue = b.slug.toLowerCase();
          break;
        case "module_id":
          aValue = a.module_id;
          bValue = b.module_id;
          break;
        case "created_at":
          aValue = new Date(a.created_at).getTime();
          bValue = new Date(b.created_at).getTime();
          break;
        case "updated_at":
          aValue = new Date(a.updated_at).getTime();
          bValue = new Date(b.updated_at).getTime();
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return order === "asc" ? -1 : 1;
      if (aValue > bValue) return order === "asc" ? 1 : -1;
      return 0;
    });
  };

  const sortedData = React.useMemo(() => sortData(data), [data, orderBy, order]);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, trial: Trial) => {
    setAnchorEl(event.currentTarget);
    setSelectedTrial(trial);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleEditClick = () => {
    setEditModalOpen(true);
    handleMenuClose();
  };

  const handleDeleteClick = () => {
    setDeleteModalOpen(true);
    handleMenuClose();
  };

  const handleEditSuccess = () => {
    setEditModalOpen(false);
    setSelectedTrial(null);
    fetchTrials();
    onRefresh?.();
  };

  const handleDeleteSuccess = () => {
    setDeleteModalOpen(false);
    setSelectedTrial(null);
    fetchTrials();
    onRefresh?.();
  };

  const handleConfigureML = () => {
    if (selectedTrial) {
      router.push(`/admin/trials/${selectedTrial.slug}/configure`);
    }
    handleMenuClose();
  };

  const handleTestModel = () => {
    if (selectedTrial) {
      router.push(`/admin/trials/${selectedTrial.slug}/test`);
    }
    handleMenuClose();
  };

  const getTrialMLConfigStatus = (trial: Trial): MLConfigStatus => {
    const compositeKey = `${trial.slug}:${trial.module_name}`;
    return mlConfigStatus[compositeKey] || "not_configured";
  };

  // Fetch ML config status for all trials
  // Uses composite key (trial_slug:module_name) for unique identification
  const fetchMLConfigStatuses = async (trials: Trial[]) => {
    const statusMap: Record<string, MLConfigStatus> = {};

    await Promise.all(
      trials.map(async (trial) => {
        // Create composite key for lookup: slug:moduleName
        const compositeKey = `${trial.slug}:${trial.module_name}`;
        try {
          // Pass both trialSlug and moduleName to the service
          const status = await mlEvaluationAdminService.getMLConfigStatus(
            trial.slug,
            trial.module_name
          );
          statusMap[compositeKey] = status;
        } catch {
          statusMap[compositeKey] = "not_configured";
        }
      })
    );

    setMlConfigStatus(statusMap);
  };

  // Helper to get ML config status badge props
  const getMLConfigBadgeProps = (status: MLConfigStatus) => {
    switch (status) {
      case "active":
        return { label: "Active", color: "success" as const };
      case "draft":
        return { label: "Draft", color: "warning" as const };
      default:
        return { label: "Not Configured", color: "default" as const };
    }
  };

  const fetchModules = async () => {
    try {
      const response = await trialsService.getModules();
      setModules(response.data?.modules || []);
    } catch (error: any) {
      console.error("Failed to fetch modules:", error);
    }
  };

  const fetchTrials = async () => {
    setLoading(true);
    try {
      const response = await trialsService.getAllTrials();
      const allTrials = response.trials || [];

      // Client-side filtering
      const filteredTrials = searchKeyword
        ? allTrials.filter(
            (trial) =>
              trial.name.toLowerCase().includes(searchKeyword.toLowerCase()) ||
              trial.slug.toLowerCase().includes(searchKeyword.toLowerCase())
          )
        : allTrials;

      setTotalItems(filteredTrials.length);

      // Client-side pagination
      const startIndex = page * rowsPerPage;
      const paginatedTrials = filteredTrials.slice(startIndex, startIndex + rowsPerPage);
      setData(paginatedTrials);

      // Fetch ML config status for displayed trials (non-blocking)
      fetchMLConfigStatuses(paginatedTrials);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to fetch trials");
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchModules();
  }, []);

  React.useEffect(() => {
    fetchTrials();
  }, [page, rowsPerPage, searchKeyword, refreshTrigger]);

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchKeyword(event.target.value);
    setPage(0);
  };

  const getModuleName = (moduleId: number): string => {
    const module = modules.find((m) => m.id === moduleId);
    return module?.name || `Module ${moduleId}`;
  };

  const formatDate = (dateString: string | null | undefined): string => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <Box>
      {/* Search Bar */}
      <Paper sx={{ mb: 3, p: 2 }}>
        <TextField
          placeholder="Search trials by name or slug..."
          value={searchKeyword}
          onChange={handleSearchChange}
          size="small"
          fullWidth
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <IconSearch size={18} />
                </InputAdornment>
              ),
            },
          }}
          sx={{ maxWidth: 400 }}
        />
      </Paper>

      {/* Trials Table */}
      <Paper variant="outlined">
        <TableContainer sx={{
          overflowX: 'auto',
          overflowY: 'auto',
          maxWidth: '100%',
          maxHeight: 'calc(100vh - 300px)'
        }}>
          <Table sx={{ minWidth: 800 }} stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>
                  <TableSortLabel
                    active={orderBy === "name"}
                    direction={orderBy === "name" ? order : "asc"}
                    onClick={() => handleRequestSort("name")}
                  >
                    <Typography variant="subtitle2" fontWeight="600">
                      Study
                    </Typography>
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={orderBy === "slug"}
                    direction={orderBy === "slug" ? order : "asc"}
                    onClick={() => handleRequestSort("slug")}
                  >
                    <Typography variant="subtitle2" fontWeight="600">
                      Slug
                    </Typography>
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={orderBy === "module_id"}
                    direction={orderBy === "module_id" ? order : "asc"}
                    onClick={() => handleRequestSort("module_id")}
                  >
                    <Typography variant="subtitle2" fontWeight="600">
                      Module
                    </Typography>
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <Typography variant="subtitle2" fontWeight="600">
                    Description
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="subtitle2" fontWeight="600">
                    ML Config
                  </Typography>
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={orderBy === "created_at"}
                    direction={orderBy === "created_at" ? order : "asc"}
                    onClick={() => handleRequestSort("created_at")}
                  >
                    <Typography variant="subtitle2" fontWeight="600">
                      Created
                    </Typography>
                  </TableSortLabel>
                </TableCell>
                <TableCell align="center">
                  <Typography variant="subtitle2" fontWeight="600">
                    Actions
                  </Typography>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <LoadingSkeleton />
              ) : sortedData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7}>
                    <EmptyState />
                  </TableCell>
                </TableRow>
              ) : (
                sortedData.map((trial) => (
                  <TableRow key={trial.id} hover>
                    <TableCell>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                        <Avatar
                          src={trial.icon_url || undefined}
                          sx={{
                            bgcolor: "primary.light",
                            color: "primary.main",
                            width: 40,
                            height: 40,
                          }}
                        >
                          <IconFlask size={20} />
                        </Avatar>
                        <Box>
                          <Typography variant="body2" fontWeight="600">
                            {trial.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            ID: {trial.id}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={trial.slug}
                        size="small"
                        variant="outlined"
                        sx={{ fontFamily: "monospace", fontSize: "0.75rem" }}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={trial.module_name || getModuleName(trial.module_id)}
                        size="small"
                        color="primary"
                        variant="filled"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{
                          maxWidth: 250,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {trial.description || "No description"}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {(() => {
                        // Use composite key for ML config status lookup
                        const compositeKey = `${trial.slug}:${trial.module_name}`;
                        const status = mlConfigStatus[compositeKey] || "not_configured";
                        const badgeProps = getMLConfigBadgeProps(status);
                        return (
                          <Tooltip title={status === "not_configured" ? "Click Configure to set up" : ""}>
                            <Chip
                              icon={<IconBrain size={14} />}
                              label={badgeProps.label}
                              size="small"
                              color={badgeProps.color}
                              variant={status === "not_configured" ? "outlined" : "filled"}
                            />
                          </Tooltip>
                        );
                      })()}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{formatDate(trial.created_at)}</Typography>
                    </TableCell>
                    <TableCell align="center">
                      <IconButton onClick={(e) => handleMenuOpen(e, trial)}>
                        <IconDots size={18} />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Pagination */}
        {!loading && sortedData.length > 0 && (
          <TablePagination
            rowsPerPageOptions={[5, 10, 25, 50]}
            component="div"
            count={totalItems}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
        )}
      </Paper>

      {/* Context Menu */}
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
        <MenuItem onClick={handleConfigureML}>
          <IconSettings size={18} style={{ marginRight: 8 }} />
          Configure Study
        </MenuItem>
        <Tooltip
          title={
            selectedTrial && getTrialMLConfigStatus(selectedTrial) !== "active"
              ? "Model must be configured and active to test"
              : ""
          }
          placement="left"
        >
          <span>
            <MenuItem
              onClick={handleTestModel}
              disabled={!selectedTrial || getTrialMLConfigStatus(selectedTrial) !== "active"}
            >
              <IconPlayerPlay size={18} style={{ marginRight: 8 }} />
              Test Model
            </MenuItem>
          </span>
        </Tooltip>
        <MenuItem onClick={handleEditClick}>
          <IconPencil size={18} style={{ marginRight: 8 }} />
          Edit Study
        </MenuItem>
        <MenuItem onClick={handleDeleteClick} sx={{ color: "error.main" }}>
          <IconTrash size={18} style={{ marginRight: 8 }} />
          Delete Study
        </MenuItem>
      </Menu>

      {/* Edit Modal */}
      {selectedTrial && (
        <TrialFormModal
          open={editModalOpen}
          onClose={() => {
            setEditModalOpen(false);
            setSelectedTrial(null);
          }}
          onSuccess={handleEditSuccess}
          mode="edit"
          trial={selectedTrial}
        />
      )}

      {/* Delete Confirmation Modal */}
      {selectedTrial && (
        <DeleteTrialModal
          open={deleteModalOpen}
          onClose={() => {
            setDeleteModalOpen(false);
            setSelectedTrial(null);
          }}
          onSuccess={handleDeleteSuccess}
          trial={selectedTrial}
        />
      )}
    </Box>
  );
};

export default TrialsTable;
