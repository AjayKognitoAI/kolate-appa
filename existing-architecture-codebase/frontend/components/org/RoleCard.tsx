import { Box, Typography, Chip, Stack, Card, IconButton } from "@mui/material";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import React from "react";
import { Add } from "@mui/icons-material";
import { IconKey, IconUser } from "@tabler/icons-react";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
interface RoleCardProps {
  name: string;
  description: string;
  showMoreClick?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  isDeleting?: boolean;
}

const RoleCard: React.FC<RoleCardProps> = ({
  name,
  description,
  showMoreClick,
  onEdit,
  onDelete,
  isDeleting,
}) => {
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };
  const handleEdit = () => {
    handleMenuClose();
    if (onEdit) onEdit();
  };
  const handleDelete = () => {
    handleMenuClose();
    if (onDelete) onDelete();
  };
  return (
    <Card
      variant="outlined"
      sx={{
        border: "1.5px solid #e5e7eb",
        borderRadius: 0.5,
        bgcolor: "#fff",
        minHeight: 120,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        position: "relative",
        boxShadow: "none",
      }}
    >
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        mb={1}
        bgcolor={"var(--gray-50)"}
        p={1.5}
      >
        <Stack direction="row" alignItems="center" gap={1}>
          <Box
            sx={{
              width: "25px",
              height: "25px",
              display: "grid",
              placeItems: "center",
              borderRadius: "100px",
              border: 0.5,
              borderColor: "var(--gray-200)",
            }}
          >
            <Add sx={{ fontSize: "16px" }} color="secondary" />
          </Box>
          <Typography variant="h6" color="var(--gray-700)">
            {name}
          </Typography>
        </Stack>
        {showMoreClick && (
          <IconButton size="small" color="inherit" onClick={handleMenuOpen}>
            <MoreVertIcon color="secondary" sx={{ fontSize: "18px" }} />
          </IconButton>
        )}
      </Stack>
      <Typography variant="body2" color="text.secondary" mb={2} p={1.5}>
        {description}
      </Typography>
      {/* <Stack
        direction="row"
        spacing={2}
        alignItems="center"
        justifyContent={"space-between"}
      >
        <Chip
          icon={<IconUser color="var(--gray-700)" size="16px" />}
          label={`${users} user${users !== 1 ? "s" : ""}`}
          size="small"
          sx={{
            bgcolor: "#f5f6fa",
            color: "var(--gray-600)",
            fontWeight: 500,
          }}
        />
        <Chip
          icon={<IconKey color="var(--gray-700)" size="16px" />}
          label={`${permissions} permission${permissions !== 1 ? "s" : ""}`}
          size="small"
          sx={{
            bgcolor: "#f5f6fa",
            color: "var(--gray-600)",
            fontWeight: 500,
          }}
        />
      </Stack> */}

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <MenuItem onClick={handleEdit}>Edit</MenuItem>
        <MenuItem onClick={handleDelete} disabled={isDeleting}>
          Delete
        </MenuItem>
      </Menu>
    </Card>
  );
};

export default RoleCard;
