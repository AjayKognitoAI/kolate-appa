"use client";
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
  Card,
  CardContent,
  TextField,
  InputAdornment,
  Menu,
  MenuItem,
  ListItemIcon,
} from "@mui/material";
import { Search, BookmarkBorder } from "@mui/icons-material";
import { IconExternalLink, IconBookmarkOff } from "@tabler/icons-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

import BookmarkService from "@/services/bookmark/bookmark-service";
import { getCurrentProject } from "@/store/slices/projectsSlice";
import { useAppSelector } from "@/store";
import { log } from "console";
import PatientHistoryCard from "./PatientHistoryCard";

interface BookmarksTabProps {
  trialSlug: string;
}

const BookmarksTab: React.FC<BookmarksTabProps> = ({ trialSlug }) => {
  const [bookmarks, setBookmarks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [debouncedQuery, setDebouncedQuery] = useState<string>("");
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedBookmark, setSelectedBookmark] = useState<any>(null);

  const project = useAppSelector(getCurrentProject);
  const { data: user } = useSession();
  const router = useRouter();
  const pageSize = 8;

  // Debounce search query
  useEffect(() => {
    const handler = window.setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 500);

    return () => {
      clearTimeout(handler);
    };
  }, [searchQuery]);

  const fetchBookmarks = useCallback(
    async (pageNumber: number, query?: string) => {
      if (!project?.project_id || !user?.user?.sub) return;
      setLoading(true);
      setError("");

      try {
        const response = await BookmarkService.getBookmarks(
          project.project_id,
          trialSlug,
          pageNumber - 1,
          pageSize
        );

        console.log("Full API Response:", response);
        console.log("Response data:", response.data);

        let bookmarksData: any[] = [];
        let totalPagesData = 0;
        let totalElementsData = 0;

        if (response.data?.data?.content !== undefined) {
          // Structure with data.content
          bookmarksData = Array.isArray(response.data.data.content)
            ? response.data.data.content
            : []; // handle null case
          totalPagesData =
            response.data.data.total_pages || response.data.data.totalPages || 0;
          totalElementsData =
            response.data.data.total_elements ||
            response.data.data.totalElements ||
            0;
        } else if (response.data?.content !== undefined) {
          // Structure with content
          bookmarksData = Array.isArray(response.data.content)
            ? response.data.content
            : [];
          totalPagesData = response.data.total_pages || 0;
          totalElementsData = response.data.total_elements || 0;
        } else if (Array.isArray(response.data)) {
          // Direct array response
          bookmarksData = response.data;
          totalPagesData = 1;
          totalElementsData = response.data.length;
        } else {
          console.error("Unexpected response structure:", response);
          setError("Unexpected response format");
          return;
        }

        const bookmarksWithPatientData = bookmarksData
          .filter(
            (bookmark: any) =>
              bookmark.execution_record || bookmark.executionRecord
          )
          .map((bookmark: any) => {
            const executionRecord =
              bookmark.execution_record || bookmark.executionRecord;
            const bookmarkInfo = bookmark.bookmark;

            return {
              ...executionRecord,
              bookmarkId: bookmarkInfo?.bookmark_id || bookmarkInfo?.bookmarkId,
              bookmarkedAt:
                bookmarkInfo?.bookmarked_at || bookmarkInfo?.bookmarkedAt,
            };
          });

        let filteredBookmarks = bookmarksWithPatientData;
        if (query) {
          filteredBookmarks = bookmarksWithPatientData.filter((bookmark: any) =>
            bookmark.base_patient_data?.patid
              ?.toLowerCase()
              .includes(query.toLowerCase()) ||
            bookmark.base_patient_data?.diagnosis
              ?.toLowerCase()
              .includes(query.toLowerCase())
          );
        }

        console.log("Processed bookmarks:", filteredBookmarks);

        setBookmarks(filteredBookmarks);
        setTotalPages(totalPagesData || 1);
        setTotalElements(totalElementsData || filteredBookmarks.length);
      } catch (err) {
        setError("Failed to load bookmarks data");
        console.error("Error fetching bookmarks:", err);
      } finally {
        setLoading(false);
      }
    },
    [project?.project_id, trialSlug, user?.user?.sub]
  );

  // Fetch bookmarks when dependencies change
  useEffect(() => {
    if (!project?.project_id || !user?.user?.sub) return;
    fetchBookmarks(page, debouncedQuery);
  }, [page, debouncedQuery, fetchBookmarks]);

  // Reset page when search query changes
  useEffect(() => {
    setPage(1);
  }, [debouncedQuery]);

  const handlePageChange = (
    _event: React.ChangeEvent<unknown>,
    value: number
  ) => {
    setPage(value);
  };

  const handleNavigation = (record: any) => {
    router.push(`/predict/${trialSlug}/${record?.execution_id}`);
  };

  const handleMenuClick = (
    event: React.MouseEvent<HTMLButtonElement, MouseEvent>,
    bookmark: any
  ) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
    setSelectedBookmark(bookmark);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedBookmark(null);
  };

  const handleViewReport = () => {
    if (selectedBookmark) {
      handleNavigation(selectedBookmark);
    }
    handleMenuClose();
  };

  const handleRemoveBookmark = async () => {
    if (selectedBookmark?.bookmarkId) {
      try {
        await BookmarkService.deleteBookmark(selectedBookmark.bookmarkId);
        // Refresh the bookmarks list
        fetchBookmarks(page, debouncedQuery);
      } catch (err) {
        console.error("Error removing bookmark:", err);
      }
    }
    handleMenuClose();
  };

  if (loading && bookmarks.length === 0) {
    return (
      <Box>
        <Grid container spacing={2}>
          {[...Array(pageSize)].map((_, index) => (
            <Grid size={{ xs: 12, sm: 6 }} key={index}>
              <Paper sx={{ p: 2, borderRadius: 0.5 }} variant="outlined">
                <Skeleton variant="text" width="40%" height={28} sx={{ mb: 1 }} />
                <Skeleton variant="text" width="70%" height={20} sx={{ mb: 2 }} />
                <Skeleton variant="text" width="50%" height={16} />
              </Paper>
            </Grid>
          ))}
        </Grid>
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
      {/* Header with Search */}
      <Stack sx={{ mb: 3 }} direction={"row"} justifyContent={"space-between"}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Typography variant="h6" fontWeight={600}>
            Bookmarked Executions
          </Typography>
          <Typography variant="body2" color="text.secondary">
            ({totalElements} bookmark{totalElements !== 1 ? 's' : ''})
          </Typography>
        </Box>
      </Stack>

      {/* Content */}
      {loading ? (
        <Grid container spacing={2}>
          {[...Array(pageSize)].map((_, index) => (
            <Grid size={{ xs: 12, sm: 6 }} key={index}>
              <Paper sx={{ p: 2, borderRadius: 0.5 }} variant="outlined">
                <Skeleton variant="text" width="40%" height={28} sx={{ mb: 1 }} />
                <Skeleton variant="text" width="70%" height={20} sx={{ mb: 2 }} />
                <Skeleton variant="text" width="50%" height={16} />
              </Paper>
            </Grid>
          ))}
        </Grid>
      ) : bookmarks.length === 0 ? (
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
            <BookmarkBorder
              sx={{
                fontSize: 28,
                color: "grey.600",
              }}
            />
          </Box>

          <Typography variant="h6" fontWeight={600} gutterBottom>
            {searchQuery ? "No Results Found" : "No Bookmarks Found"}
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            maxWidth={360}
            mx="auto"
          >
            {searchQuery
              ? `No bookmarks found matching "${searchQuery}". Try a different search term.`
              : "You have not bookmarked any trial executions yet."}
          </Typography>
        </Paper>
      ) : (
        <>
          {/* Bookmark Cards */}
          <Grid container spacing={2}>
            {bookmarks.map((bookmark) => (
              <Grid size={{ xs: 12, sm: 6 }} key={bookmark.bookmarkId}>
                  <PatientHistoryCard
                    executionRecord={bookmark}
                    onMenuClick={handleMenuClick}
                    trialSlug={trialSlug}
                    bookmarkInfo={bookmark.bookmarkedAt ? { bookmarkedAt: bookmark.bookmarkedAt } : undefined}
                  />
              </Grid>
            ))}
          </Grid>

          {/* Menu */}
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
            <MenuItem onClick={handleRemoveBookmark}>
              <ListItemIcon sx={{ minWidth: 30 }}>
                <IconBookmarkOff size={16} />
              </ListItemIcon>
              <Typography variant="body2">Remove Bookmark</Typography>
            </MenuItem>
          </Menu>

          {/* Pagination */}
          {totalPages > 1 && (
            <Box display="flex" justifyContent="center" mt={3}>
              <Pagination
                count={totalPages}
                page={page}
                onChange={handlePageChange}
                color="primary"
                size="medium"
                showFirstButton
                showLastButton
                sx={{
                  '& .MuiPagination-ul': {
                    gap: 1,
                  },
                  '& .MuiPaginationItem-root': {
                    minWidth: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    border: 'none',
                    fontSize: '14px',
                    fontWeight: 500,
                    color: '#666',
                    backgroundColor: 'transparent',
                    '&:hover': {
                      backgroundColor: '#f5f5f5',
                    },
                    '&.Mui-selected': {
                      backgroundColor: '#1976d2',
                      color: 'white',
                      '&:hover': {
                        backgroundColor: '#1565c0',
                      },
                    },
                    '&.MuiPaginationItem-previousNext': {
                      '& .MuiSvgIcon-root': {
                        fontSize: '18px',
                      },
                    },
                    '&.MuiPaginationItem-firstLast': {
                      '& .MuiSvgIcon-root': {
                        fontSize: '18px',
                      },
                    },
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

export default BookmarksTab;