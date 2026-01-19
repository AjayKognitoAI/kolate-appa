"use client";
import * as React from "react";
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
  LinearProgress,
  Tabs,
  Tab,
  Paper,
  TableSortLabel,
} from "@mui/material";
import { IconEye, IconX, IconCloudDownload, IconDots, IconDownload } from "@tabler/icons-react";
import { dataPipelineService, TaskResponse } from "@/services/data-pipeline/data-pipeline-service";
import { toast } from "react-toastify";
import TaskDetailsModal from "./task-details-modal";

type Order = "asc" | "desc";
type SortField = "dataset_name" | "status" | "progress_percent" | "total_bytes" | "created_at";

// Empty state component
const EmptyState = ({ status }: { status: string }) => (
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
    <IconCloudDownload
      size={64}
      style={{
        color: "#9e9e9e",
        marginBottom: "16px",
      }}
    />
    <Typography variant="h6" color="textSecondary" gutterBottom>
      {status ? `No ${status} tasks found` : "No tasks found"}
    </Typography>
    <Typography variant="body2" color="textSecondary">
      {status
        ? `There are no ${status} tasks at the moment`
        : "Tasks will appear here once you create download jobs"}
    </Typography>
  </Box>
);

// Loading skeleton
const LoadingSkeleton = () => (
  <>
    {[...Array(5)].map((_, index) => (
      <TableRow key={index}>
        <TableCell>
          <Skeleton variant="text" width={200} />
        </TableCell>
        <TableCell>
          <Skeleton variant="text" width={150} />
        </TableCell>
        <TableCell>
          <Skeleton variant="rectangular" width={80} height={24} />
        </TableCell>
        <TableCell>
          <Skeleton variant="rectangular" width="100%" height={8} />
        </TableCell>
        <TableCell>
          <Skeleton variant="text" width={100} />
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

const TasksTable = () => {
  const [data, setData] = React.useState<TaskResponse[]>([]);
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [loading, setLoading] = React.useState(false);
  const [page, setPage] = React.useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(10);
  const [totalItems, setTotalItems] = React.useState(0);
  const [selectedTask, setSelectedTask] = React.useState<TaskResponse | null>(null);
  const [statusFilter, setStatusFilter] = React.useState<string>("");
  const [detailsModalOpen, setDetailsModalOpen] = React.useState(false);
  const [orderBy, setOrderBy] = React.useState<SortField>("created_at");
  const [order, setOrder] = React.useState<Order>("desc");

  const statusOptions = [
    { label: "All", value: "" },
    { label: "Pending", value: "pending" },
    { label: "Running", value: "running" },
    { label: "Completed", value: "completed" },
    { label: "Failed", value: "failed" },
    { label: "Cancelled", value: "cancelled" },
  ];

  const handleRequestSort = (property: SortField) => {
    const isAsc = orderBy === property && order === "asc";
    setOrder(isAsc ? "desc" : "asc");
    setOrderBy(property);
  };

  const sortData = (data: TaskResponse[]): TaskResponse[] => {
    return [...data].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (orderBy) {
        case "dataset_name":
          aValue = a.dataset_name.toLowerCase();
          bValue = b.dataset_name.toLowerCase();
          break;
        case "status":
          aValue = a.status;
          bValue = b.status;
          break;
        case "progress_percent":
          aValue = a.progress_percent ?? (a.status === "completed" ? 100 : 0);
          bValue = b.progress_percent ?? (b.status === "completed" ? 100 : 0);
          break;
        case "total_bytes":
          aValue = a.total_bytes ?? 0;
          bValue = b.total_bytes ?? 0;
          break;
        case "created_at":
          aValue = new Date(a.created_at).getTime();
          bValue = new Date(b.created_at).getTime();
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

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, task: TaskResponse) => {
    setAnchorEl(event.currentTarget);
    setSelectedTask(task);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleViewDetails = () => {
    if (selectedTask) {
      setDetailsModalOpen(true);
    }
    handleMenuClose();
  };

  const handleCancelTask = async () => {
    if (!selectedTask) return;

    try {
      await dataPipelineService.cancelTask(selectedTask.task_id);
      toast.success("Task cancelled successfully");
      fetchTasks();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || "Failed to cancel task");
    }
    handleMenuClose();
  };

  const handleDownloadFile = async () => {
    if (!selectedTask || !selectedTask.s3_key) {
      toast.error("No S3 key available for download");
      handleMenuClose();
      return;
    }

    try {
      toast.info("Preparing download...");
      const blob = await dataPipelineService.downloadFile(selectedTask.s3_key);

      // Create a download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;

      // Extract filename from s3_key or use dataset name
      const filename = selectedTask.s3_key.split("/").pop() || `${selectedTask.dataset_name}.csv`;
      link.download = filename;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success("Download started");
    } catch (error: any) {
      toast.error(error.response?.data?.detail || "Failed to download file");
    }
    handleMenuClose();
  };

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const response = await dataPipelineService.listTasks(
        statusFilter || undefined,
        rowsPerPage,
        page * rowsPerPage
      );
      setData(response.tasks);
      setTotalItems(response.total);
    } catch (error: any) {
      toast.error(error.response?.data?.detail || "Failed to fetch tasks");
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchTasks();
  }, [page, rowsPerPage, statusFilter]);

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleStatusFilterChange = (event: React.SyntheticEvent, newValue: string) => {
    setStatusFilter(newValue);
    setPage(0);
  };

  const getStatusColor = (status: string): "default" | "primary" | "success" | "error" | "warning" => {
    switch (status) {
      case "completed":
        return "success";
      case "running":
        return "primary";
      case "failed":
        return "error";
      case "cancelled":
        return "default";
      case "pending":
        return "warning";
      default:
        return "default";
    }
  };

  const formatBytes = (bytes: number | null | undefined): string => {
    if (!bytes || bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
  };

  const formatDate = (dateString: string | null | undefined): string => {
    if (!dateString) return "N/A";
    // Ensure UTC dates are properly parsed by appending 'Z' if not present
    const utcDateString = dateString.endsWith("Z") ? dateString : `${dateString}Z`;
    return new Date(utcDateString).toLocaleString();
  };

  return (
    <Box>
      {/* Status Filter Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={statusFilter}
          onChange={handleStatusFilterChange}
          variant="scrollable"
          scrollButtons="auto"
        >
          {statusOptions.map((option) => (
            <Tab key={option.value} label={option.label} value={option.value} />
          ))}
        </Tabs>
      </Paper>

      {/* Tasks Table */}
      <Paper variant="outlined">
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>
                  <TableSortLabel
                    active={orderBy === "dataset_name"}
                    direction={orderBy === "dataset_name" ? order : "asc"}
                    onClick={() => handleRequestSort("dataset_name")}
                  >
                    <Typography variant="subtitle2" fontWeight="600">
                      URL / Dataset
                    </Typography>
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <Typography variant="subtitle2" fontWeight="600">
                    Task ID
                  </Typography>
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={orderBy === "status"}
                    direction={orderBy === "status" ? order : "asc"}
                    onClick={() => handleRequestSort("status")}
                  >
                    <Typography variant="subtitle2" fontWeight="600">
                      Status
                    </Typography>
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={orderBy === "progress_percent"}
                    direction={orderBy === "progress_percent" ? order : "asc"}
                    onClick={() => handleRequestSort("progress_percent")}
                  >
                    <Typography variant="subtitle2" fontWeight="600">
                      Progress
                    </Typography>
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={orderBy === "total_bytes"}
                    direction={orderBy === "total_bytes" ? order : "asc"}
                    onClick={() => handleRequestSort("total_bytes")}
                  >
                    <Typography variant="subtitle2" fontWeight="600">
                      Size
                    </Typography>
                  </TableSortLabel>
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
                    <EmptyState status={statusFilter} />
                  </TableCell>
                </TableRow>
              ) : (
                sortedData.map((task) => (
                  <TableRow key={task.task_id} hover>
                    <TableCell>
                      <Box>
                        <Typography variant="body2" fontWeight="600">
                          {task.dataset_name}
                        </Typography>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{
                            display: "block",
                            maxWidth: 300,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {task.url}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontFamily: "monospace", fontSize: "0.75rem" }}>
                        {task.task_id.substring(0, 8)}...
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={task.status.toUpperCase()}
                        color={getStatusColor(task.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ minWidth: 150 }}>
                        {task.status === "running" && task.progress_percent !== null ? (
                          <>
                            <LinearProgress
                              variant="determinate"
                              value={task.progress_percent}
                              sx={{ height: 6, borderRadius: 3, mb: 0.5 }}
                            />
                            <Typography variant="caption" color="text.secondary">
                              {task.progress_percent}%
                            </Typography>
                          </>
                        ) : (
                          <Typography variant="caption" color="text.secondary">
                            {task.status === "completed" ? "100%" : "—"}
                          </Typography>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {task.total_bytes
                          ? `${formatBytes(task.bytes_downloaded)} / ${formatBytes(task.total_bytes)}`
                          : "—"}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{formatDate(task.created_at)}</Typography>
                    </TableCell>
                    <TableCell align="center">
                      <IconButton onClick={(e) => handleMenuOpen(e, task)}>
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
        <MenuItem onClick={handleViewDetails}>
          <IconEye size={18} style={{ marginRight: 8 }} />
          View Details
        </MenuItem>
        {selectedTask?.status === "completed" && selectedTask?.s3_key && (
          <MenuItem onClick={handleDownloadFile}>
            <IconDownload size={18} style={{ marginRight: 8 }} />
            Download Dataset
          </MenuItem>
        )}
        {selectedTask?.status === "pending" || selectedTask?.status === "running" ? (
          <MenuItem onClick={handleCancelTask}>
            <IconX size={18} style={{ marginRight: 8 }} />
            Cancel Task
          </MenuItem>
        ) : null}
      </Menu>

      {/* Task Details Modal */}
      {selectedTask && (
        <TaskDetailsModal
          open={detailsModalOpen}
          onClose={() => setDetailsModalOpen(false)}
          task={JSON.parse(JSON.stringify(selectedTask))}
          onRefresh={fetchTasks}
        />
      )}
    </Box>
  );
};

export default TasksTable;
