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
  Box,
  IconButton,
  Menu,
  MenuItem,
  TablePagination,
  Skeleton,
  Paper,
  Chip,
  TableSortLabel,
  Breadcrumbs,
  Link,
} from "@mui/material";
import {
  IconDownload,
  IconTrash,
  IconDots,
  IconFolder,
  IconFolderOpen,
  IconFile,
  IconHome,
  IconChevronRight,
} from "@tabler/icons-react";
import {
  dataPipelineService,
  S3FolderStructureResponse,
} from "@/services/data-pipeline/data-pipeline-service";
import { toast } from "react-toastify";

type Order = "asc" | "desc";
type SortField = "name" | "size" | "last_modified";

interface FolderItem {
  name: string;
  path: string;
  type: "folder";
}

interface FileItem {
  name: string;
  key: string;
  size: number;
  last_modified: string;
  type: "file";
}

type ListItem = FolderItem | FileItem;

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
    <IconFolder
      size={64}
      style={{
        color: "#9e9e9e",
        marginBottom: "16px",
      }}
    />
    <Typography variant="h6" color="textSecondary" gutterBottom>
      This folder is empty
    </Typography>
    <Typography variant="body2" color="textSecondary">
      Upload files or create subfolders to get started
    </Typography>
  </Box>
);

// Loading skeleton
const LoadingSkeleton = () => (
  <>
    {[...Array(5)].map((_, index) => (
      <TableRow key={index}>
        <TableCell>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Skeleton variant="circular" width={24} height={24} />
            <Skeleton variant="text" width={200} />
          </Box>
        </TableCell>
        <TableCell>
          <Skeleton variant="text" width={80} />
        </TableCell>
        <TableCell>
          <Skeleton variant="text" width={100} />
        </TableCell>
        <TableCell>
          <Skeleton variant="text" width={150} />
        </TableCell>
        <TableCell>
          <Skeleton variant="circular" width={32} height={32} />
        </TableCell>
      </TableRow>
    ))}
  </>
);

const DatasetsTable = () => {
  const [folders, setFolders] = React.useState<FolderItem[]>([]);
  const [files, setFiles] = React.useState<FileItem[]>([]);
  const [currentPath, setCurrentPath] = React.useState<string>("");
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [loading, setLoading] = React.useState(false);
  const [page, setPage] = React.useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(10);
  const [selectedFile, setSelectedFile] = React.useState<FileItem | null>(null);
  const [orderBy, setOrderBy] = React.useState<SortField>("name");
  const [order, setOrder] = React.useState<Order>("asc");

  const handleRequestSort = (property: SortField) => {
    const isAsc = orderBy === property && order === "asc";
    setOrder(isAsc ? "desc" : "asc");
    setOrderBy(property);
  };

  // Combine and sort folders and files
  const sortedItems = React.useMemo(() => {
    const allItems: ListItem[] = [
      ...folders.map((f) => ({ ...f, type: "folder" as const })),
      ...files.map((f) => ({ ...f, type: "file" as const })),
    ];

    return allItems.sort((a, b) => {
      // Folders always come first
      if (a.type === "folder" && b.type === "file") return -1;
      if (a.type === "file" && b.type === "folder") return 1;

      // Same type - apply sort
      let aValue: any;
      let bValue: any;

      switch (orderBy) {
        case "name":
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case "size":
          aValue = a.type === "file" ? a.size : 0;
          bValue = b.type === "file" ? b.size : 0;
          break;
        case "last_modified":
          aValue = a.type === "file" ? new Date(a.last_modified).getTime() : 0;
          bValue = b.type === "file" ? new Date(b.last_modified).getTime() : 0;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return order === "asc" ? -1 : 1;
      if (aValue > bValue) return order === "asc" ? 1 : -1;
      return 0;
    });
  }, [folders, files, orderBy, order]);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, file: FileItem) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
    setSelectedFile(file);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleDownloadFile = async () => {
    if (!selectedFile) return;

    try {
      toast.info("Preparing download...");
      const blob = await dataPipelineService.downloadFile(selectedFile.key);

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = selectedFile.name;

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

  const handleDeleteFile = async () => {
    if (!selectedFile) return;

    if (!confirm(`Are you sure you want to delete ${selectedFile.name}?`)) {
      handleMenuClose();
      return;
    }

    try {
      await dataPipelineService.deleteFile(selectedFile.key);
      toast.success("File deleted successfully");
      fetchStructure(currentPath);
    } catch (error: any) {
      toast.error(error.response?.data?.detail || "Failed to delete file");
    }
    handleMenuClose();
  };

  const fetchStructure = async (prefix: string) => {
    setLoading(true);
    try {
      const response: S3FolderStructureResponse =
        await dataPipelineService.getS3FolderStructure(prefix || undefined);

      setFolders(
        response.folders.map((f) => ({
          name: f.name,
          path: f.path,
          type: "folder" as const,
        }))
      );

      setFiles(
        response.files.map((f) => ({
          name: f.name,
          key: f.key,
          size: f.size,
          last_modified: f.last_modified,
          type: "file" as const,
        }))
      );
    } catch (error: any) {
      toast.error(error.response?.data?.detail || "Failed to fetch folder structure");
      setFolders([]);
      setFiles([]);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchStructure(currentPath);
  }, [currentPath]);

  const handleFolderClick = (folderPath: string) => {
    setCurrentPath(folderPath);
    setPage(0);
  };

  const handleBreadcrumbClick = (index: number) => {
    if (index === -1) {
      setCurrentPath("");
    } else {
      const pathParts = currentPath.split("/").filter(Boolean);
      const newPath = pathParts.slice(0, index + 1).join("/") + "/";
      setCurrentPath(newPath);
    }
    setPage(0);
  };

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleString();
  };

  const getFileExtension = (name: string): string => {
    const parts = name.split(".");
    return parts.length > 1 ? parts[parts.length - 1].toUpperCase() : "FILE";
  };

  const pathParts = currentPath.split("/").filter(Boolean);
  const paginatedItems = sortedItems.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  return (
    <Box>
      {/* Breadcrumb Navigation */}
      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Breadcrumbs
          separator={<IconChevronRight size={16} />}
          aria-label="folder navigation"
        >
          <Link
            component="button"
            variant="body2"
            onClick={() => handleBreadcrumbClick(-1)}
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 0.5,
              cursor: "pointer",
              textDecoration: "none",
              color: currentPath === "" ? "primary.main" : "text.secondary",
              fontWeight: currentPath === "" ? 600 : 400,
              "&:hover": {
                textDecoration: "underline",
              },
            }}
          >
            <IconHome size={18} />
            Root
          </Link>
          {pathParts.map((part, index) => (
            <Link
              key={index}
              component="button"
              variant="body2"
              onClick={() => handleBreadcrumbClick(index)}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 0.5,
                cursor: "pointer",
                textDecoration: "none",
                color:
                  index === pathParts.length - 1 ? "primary.main" : "text.secondary",
                fontWeight: index === pathParts.length - 1 ? 600 : 400,
                "&:hover": {
                  textDecoration: "underline",
                },
              }}
            >
              {part}
            </Link>
          ))}
        </Breadcrumbs>
      </Paper>

      {/* Datasets Table */}
      <Paper variant="outlined">
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>
                  <TableSortLabel
                    active={orderBy === "name"}
                    direction={orderBy === "name" ? order : "asc"}
                    onClick={() => handleRequestSort("name")}
                  >
                    <Typography variant="subtitle2" fontWeight="600">
                      Name
                    </Typography>
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <Typography variant="subtitle2" fontWeight="600">
                    Type
                  </Typography>
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={orderBy === "size"}
                    direction={orderBy === "size" ? order : "asc"}
                    onClick={() => handleRequestSort("size")}
                  >
                    <Typography variant="subtitle2" fontWeight="600">
                      Size
                    </Typography>
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={orderBy === "last_modified"}
                    direction={orderBy === "last_modified" ? order : "asc"}
                    onClick={() => handleRequestSort("last_modified")}
                  >
                    <Typography variant="subtitle2" fontWeight="600">
                      Last Modified
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
              ) : sortedItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5}>
                    <EmptyState />
                  </TableCell>
                </TableRow>
              ) : (
                paginatedItems.map((item) =>
                  item.type === "folder" ? (
                    <TableRow
                      key={item.path}
                      hover
                      onClick={() => handleFolderClick(item.path)}
                      sx={{ cursor: "pointer" }}
                    >
                      <TableCell>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <IconFolderOpen size={24} color="#f9a825" />
                          <Typography variant="body2" fontWeight="600">
                            {item.name}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label="Folder"
                          size="small"
                          color="warning"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          -
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          -
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant="body2" color="text.secondary">
                          -
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    <TableRow key={item.key} hover>
                      <TableCell>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <IconFile size={24} color="#5c6bc0" />
                          <Box>
                            <Typography variant="body2" fontWeight="600">
                              {item.name}
                            </Typography>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              sx={{
                                display: "block",
                                maxWidth: 350,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {item.key}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={getFileExtension(item.name)}
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{formatBytes(item.size)}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {formatDate(item.last_modified)}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <IconButton onClick={(e) => handleMenuOpen(e, item)}>
                          <IconDots size={18} />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  )
                )
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Pagination */}
        {!loading && sortedItems.length > 0 && (
          <TablePagination
            rowsPerPageOptions={[5, 10, 25, 50]}
            component="div"
            count={sortedItems.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
        )}
      </Paper>

      {/* Context Menu */}
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
        <MenuItem onClick={handleDownloadFile}>
          <IconDownload size={18} style={{ marginRight: 8 }} />
          Download
        </MenuItem>
        <MenuItem onClick={handleDeleteFile}>
          <IconTrash size={18} style={{ marginRight: 8 }} />
          Delete
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default DatasetsTable;
