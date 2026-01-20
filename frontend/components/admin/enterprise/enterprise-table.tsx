"use client";
import * as React from "react";
import {
  TableContainer,
  Table,
  TableRow,
  TableCell,
  TableBody,
  Avatar,
  Typography,
  TableHead,
  Chip,
  Box,
  InputAdornment,
  IconButton,
  Menu,
  MenuItem,
  TablePagination,
  Skeleton,
} from "@mui/material";
import { Stack } from "@mui/system";
import SearchIcon from "@mui/icons-material/Search";
import MoreVertOutlinedIcon from "@mui/icons-material/MoreVertOutlined";
import {
  IconBuildingFactory2,
  IconCircle,
  IconCircleFilled,
  IconDots,
  IconSend,
} from "@tabler/icons-react";
import {
  enterpriseService,
  Enterprise,
} from "@/services/admin/enterprises-service";

import CustomTextField from "@/components/forms/theme-elements/CustomTextField";
import EnterpriseView from "./enterprise-view";
import { toast } from "react-toastify";
import DeleteEnterprisesModal from "../delete-enterprises-modal";
import Header from "@/components/layout/header/Header";
import HeaderMobileMenu from "@/components/layout/header/HeaderMobileMenu";
import ModulePermissionModal from "./module-permission-modal";

// Custom debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = React.useState<T>(value);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Empty state component
const EmptyState = ({ searchKeyword }: { searchKeyword: string }) => (
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
    <IconBuildingFactory2
      size={64}
      style={{
        color: "#9e9e9e",
        marginBottom: "16px",
      }}
    />
    <Typography variant="h6" color="textSecondary" gutterBottom>
      {searchKeyword
        ? `No enterprises found matching "${searchKeyword}"`
        : "No enterprises found"}
    </Typography>
    <Typography variant="body2" color="textSecondary">
      {searchKeyword
        ? "Try adjusting your search or check back later"
        : "Enterprises will appear here once they are added"}
    </Typography>
  </Box>
);

// If not already defined, define the row type for table data
// You can adjust the fields as per your backend response
export interface EnterpriseTableRow {
  id: string;
  name: string;
  logo_url?: string;
  domain?: string;
  admin_email?: string;
  contact_number?: string;
  city?: string;
  state?: string;
  country?: string;
  zip_code?: string;
  size?: string;
  region?: string;
  status?: string;
  organization_id?: string;
  [key: string]: any;
}

const EnterpriseTable = ({
  isEnterprisePage,
}: {
  isEnterprisePage?: boolean;
}) => {
  // Change type of data and selectedEnt to EnterpriseTableRow[]
  const [data, setData] = React.useState<EnterpriseTableRow[]>([]);
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [searchKeyword, setSearchKeyword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [page, setPage] = React.useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(10);
  const [totalItems, setTotalItems] = React.useState(0);
  const [selectedEnt, setSelectedEnt] =
    React.useState<EnterpriseTableRow | null>(null);
  const [resendLoading, setResendLoading] = React.useState(false);
  const [deleteLoading, setDeleteLoading] = React.useState(false);
  const [deleteModal, setDeleteModal] = React.useState(false);
  const [enterpriseView, setEnterpriseView] = React.useState(false);
  const [manageAccessModal, setManageAccessModal] = React.useState(false);

  // Debounce the search keyword
  const debouncedSearchKeyword = useDebounce(searchKeyword, 500);

  const handleMenuOpen = (
    event: React.MouseEvent<HTMLElement>,
    data: EnterpriseTableRow
  ) => {
    setAnchorEl(event.currentTarget);
    setSelectedEnt(data);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleSearch = React.useCallback(
    async (keyword: string, pageNum: number, size: number) => {
      setLoading(true);
      setError(null);
      try {
        const response = await enterpriseService.searchEnterprises(
          keyword,
          pageNum,
          size
        );
        if (response.state === "success") {
          setData(response.data.enterprises as any[]);
          setTotalItems(response.data.totalItems);
        }
      } catch (error) {
        setError("Failed to load enterprises. Please try again.");
        setData([]);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Combined effect to handle search, page changes, and initial load
  React.useEffect(() => {
    const currentPage = debouncedSearchKeyword !== searchKeyword ? 0 : page;
    handleSearch(debouncedSearchKeyword, currentPage, rowsPerPage);
  }, [debouncedSearchKeyword, page, rowsPerPage, handleSearch]);

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleReInvite = async () => {
    if (!selectedEnt) return;
    try {
      setResendLoading(true);
      await enterpriseService.reInviteEnterprise(selectedEnt.id);
      toast.success("Re-invitation sent successfully", {
        icon: <IconSend size={18} color="var(--primary-700)" />,
      });
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message ||
          "Failed to resend invitation. Please try again."
      );
    } finally {
      setResendLoading(false);
      handleMenuClose();
    }
  };

  const handleDeleteEnterprise = async () => {
    if (!selectedEnt) return;
    try {
      setResendLoading(true); // reuse resendLoading for delete, or create a new state if you want separate
      await enterpriseService.deleteEnterprise(selectedEnt.id);
      toast.success("Enterprise deleted successfully");
      // Refresh table data
      handleSearch(debouncedSearchKeyword, page, rowsPerPage);
      setDeleteModal(false);
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message ||
          "Failed to delete enterprise. Please try again."
      );
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <>
      <Box sx={{ width: "100%", maxWidth: "100%", overflow: "hidden" }}>
        <Box sx={{ width: "100%", maxWidth: "100%" }}>
          <Box sx={{ mb: 4 }}>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              justifyContent="space-between"
              alignItems={{ xs: "flex-start", sm: "center" }}
              spacing={2}
              pt={1}
            >
              <Stack direction="row" spacing={1} alignItems="center">
                {isEnterprisePage && <HeaderMobileMenu />}
                <Typography variant="h5" fontWeight="600">
                  Enterprises
                </Typography>
              </Stack>
              <CustomTextField
                placeholder="Search"
                size="small"
                value={searchKeyword}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setSearchKeyword(e.target.value)
                }
                sx={{
                  width: "300px",
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon color="action" />
                    </InputAdornment>
                  ),
                }}
              />
            </Stack>
          </Box>

          <Box>
            <TableContainer
              sx={{
                border: "1px solid",
                borderColor: "divider",
                borderRadius: "8px",
                boxShadow: "none",
                mt: 2,
                position: "relative",
              }}
            >
              <Table
                sx={{
                  whiteSpace: "nowrap",
                  borderCollapse: "separate",
                  borderSpacing: 0,
                }}
              >
                <TableHead>
                  <TableRow sx={{ backgroundColor: "white" }}>
                    {[
                      "Enterprise name",
                      "Contact",
                      "Location",
                      "Enterprise size",
                      "Status",
                      "",
                    ].map((header, index) => (
                      <TableCell
                        key={index}
                        sx={{
                          fontWeight: 700,
                          fontSize: "15px",
                          borderBottom: "1px solid",
                          borderColor: "divider",
                          paddingY: 2,
                          paddingX: 2,
                        }}
                      >
                        <Typography variant="h6">{header}</Typography>
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading ? (
                    Array.from({ length: rowsPerPage }).map((_, idx) => (
                      <TableRow key={`skeleton-row-${idx}`}>
                        {Array.from({ length: 6 }).map((_, colIdx) => (
                          <TableCell key={`skeleton-cell-${colIdx}`}>
                            <Skeleton variant="rectangular" height={32} />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : error ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center">
                        <Typography color="error">{error}</Typography>
                      </TableCell>
                    </TableRow>
                  ) : data.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                        <EmptyState searchKeyword={searchKeyword} />
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.map((row, idx) => (
                      <TableRow
                        key={row.id}
                        sx={{
                          borderBottom: "1px solid",
                          borderColor: "divider",
                          "&:last-child": { borderBottom: "none" },
                          backgroundColor: idx % 2 === 0 ? "white" : "grey.50",
                        }}
                      >
                        <TableCell
                          sx={{
                            paddingY: 2,
                            paddingX: 2,
                            borderBottom: "none",
                          }}
                        >
                          <Stack direction="row" spacing={2}>
                            <Avatar
                              src={row.logo_url}
                              alt={row.name}
                              sx={{ width: 40, height: 40 }}
                            />
                            <Box>
                              <Typography
                                variant="h6"
                                fontWeight="600"
                                sx={{ fontSize: "14px", lineHeight: "20px" }}
                              >
                                {row.name}
                              </Typography>
                              <Typography
                                color="textSecondary"
                                sx={{ fontSize: "12px" }}
                              >
                                {row.domain}
                              </Typography>
                            </Box>
                          </Stack>
                        </TableCell>
                        {/* Contact column: email and phone stacked, styled */}
                        <TableCell
                          sx={{
                            paddingY: 2,
                            paddingX: 2,
                            borderBottom: "none",
                          }}
                        >
                          <Box>
                            <Typography
                              sx={{
                                fontSize: "14px",
                                fontWeight: 500,
                              }}
                            >
                              {row.admin_email}
                            </Typography>
                            {row.contact_number && (
                              <Typography
                                sx={{
                                  fontSize: "13px",
                                  lineHeight: "18px",
                                }}
                                color="textSecondary"
                              >
                                {row.contact_number}
                              </Typography>
                            )}
                          </Box>
                        </TableCell>
                        {/* Location column: city,state,country - zip, styled */}
                        <TableCell
                          sx={{
                            paddingY: 2,
                            paddingX: 2,
                            borderBottom: "none",
                          }}
                        >
                          {row.region || row.zip_code ? (
                            <>
                              <Typography
                                sx={{
                                  fontSize: "14px",
                                }}
                              >
                                {row.region}
                              </Typography>
                              <Typography
                                sx={{
                                  fontSize: "14px",
                                }}
                                color="textSecondary"
                              >
                                {row.zip_code ? `${row.zip_code}` : ""}
                              </Typography>
                            </>
                          ) : (
                            <Typography
                              sx={{
                                fontSize: "14px",
                              }}
                              color="textSecondary"
                            >
                              -
                            </Typography>
                          )}
                        </TableCell>
                        {/* Enterprise size region: size bold, region below */}
                        <TableCell
                          sx={{
                            paddingY: 2,
                            paddingX: 2,
                            borderBottom: "none",
                          }}
                        >
                          <Box>
                            <Typography
                              sx={{
                                fontSize: "14px",
                              }}
                            >
                              {row.size || "-"}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell
                          sx={{
                            paddingY: 2,
                            paddingX: 2,
                            borderBottom: "none",
                          }}
                        >
                          <Chip
                            avatar={
                              <IconCircleFilled
                                style={{ fontSize: "10px !important" }}
                                size={10}
                              />
                            }
                            sx={{
                              bgcolor:
                                row.status === "ACTIVE"
                                  ? "#ECFDF3"
                                  : row.status === "INVITED"
                                  ? "#F8F9FC"
                                  : "#FFF6ED",
                              color:
                                row.status === "ACTIVE"
                                  ? "#027A48"
                                  : row.status === "INVITED"
                                  ? "#363F72"
                                  : "#C4320A",

                              height: "24px",
                              fontSize: "12px",
                              fontWeight: 500,
                              "& .MuiChip-label": {
                                px: 1.5,
                              },
                              "& .MuiChip-avatarSmall": {
                                width: "10px",
                                color:
                                  row.status === "ACTIVE"
                                    ? "#12B76A"
                                    : row.status === "INVITED"
                                    ? "#4E5BA6"
                                    : "#FB6514",
                              },
                            }}
                            size="small"
                            label={
                              row.status === "ACTIVE"
                                ? "Active"
                                : row.status === "INVITED"
                                ? "Invited"
                                : row.status === "INACTIVE"
                                ? "Inactive"
                                : row.status
                            }
                          />
                        </TableCell>
                        <TableCell
                          sx={{
                            paddingY: 2,
                            paddingX: 2,
                            borderBottom: "none",
                          }}
                        >
                          <IconButton
                            id={`action-icon-${row.id}`}
                            onClick={(event) => handleMenuOpen(event, row)}
                          >
                            <MoreVertOutlinedIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              <TablePagination
                component="div"
                count={totalItems}
                page={page}
                onPageChange={handleChangePage}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={handleChangeRowsPerPage}
                rowsPerPageOptions={[5, 10, 25, 50]}
                labelRowsPerPage="Rows per page:"
                sx={{ borderTop: "1px solid #eee" }}
              />
            </TableContainer>
          </Box>
        </Box>
      </Box>
      {Boolean(anchorEl) && (
        <Menu
          anchorEl={anchorEl}
          anchorOrigin={{
            vertical: "bottom",
            horizontal: "right",
          }}
          transformOrigin={{
            vertical: "top",
            horizontal: "right",
          }}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
        >
          {selectedEnt?.status === "INVITED" && (
            <MenuItem onClick={handleReInvite} disabled={resendLoading}>
              Resend
            </MenuItem>
          )}
          <MenuItem
            onClick={() => {
              setEnterpriseView(true);
              handleMenuClose();
            }}
          >
            View
          </MenuItem>
          <MenuItem
            onClick={() => {
              setManageAccessModal(true);
              handleMenuClose();
            }}
          >
            Manage Access
          </MenuItem>
          {selectedEnt?.status !== "DELETED" && (
            <MenuItem
              onClick={() => {
                setDeleteModal(true);
                handleMenuClose();
              }}
              disabled={deleteLoading}
            >
              Delete
            </MenuItem>
          )}
        </Menu>
      )}

      <DeleteEnterprisesModal
        enterpriseName={selectedEnt?.name || ""}
        onClose={() => {
          setDeleteModal(false);
          setSelectedEnt(null);
        }}
        loading={deleteLoading}
        onDelete={handleDeleteEnterprise}
        open={deleteModal}
      />

      {enterpriseView && (
        <EnterpriseView
          enterpriseId={selectedEnt?.id || ""}
          orgId={selectedEnt?.organization_id || ""}
          open={enterpriseView}
          onClose={() => {
            setEnterpriseView(false);
            setSelectedEnt(null);
          }}
        />
      )}

      {manageAccessModal && (
        <ModulePermissionModal
          open={manageAccessModal}
          onClose={() => {
            setManageAccessModal(false);
            setSelectedEnt(null);
          }}
          enterpriseId={selectedEnt?.id || ""}
          organizationId={selectedEnt?.organization_id || ""}
          enterpriseName={selectedEnt?.name || ""}
        />
      )}
    </>
  );
};

export default EnterpriseTable;
