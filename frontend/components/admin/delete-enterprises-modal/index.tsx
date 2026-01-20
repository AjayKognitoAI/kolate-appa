import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Box,
  IconButton,
} from "@mui/material";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import CloseIcon from "@mui/icons-material/Close";

interface DeleteEnterprisesModalProps {
  open: boolean;
  onClose: () => void;
  onDelete: () => void;
  enterpriseName: string;
  loading?: boolean;
}

const DeleteEnterprisesModal: React.FC<DeleteEnterprisesModalProps> = ({
  open,
  onClose,
  onDelete,
  enterpriseName,
  loading,
}) => {
  const [confirm, setConfirm] = useState("");

  const handleDelete = () => {
    if (confirm === "delete") {
      onDelete();
      setConfirm("");
    }
  };

  const handleClose = () => {
    setConfirm("");
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <Box sx={{ position: "absolute", right: 8, top: 8 }}>
        <IconButton onClick={handleClose} size="small">
          <CloseIcon />
        </IconButton>
      </Box>
      <DialogContent>
        <ErrorOutlineIcon
          sx={{
            color: "#FF5252",
            fontSize: 40,
            mb: 1,
            background: "#FEE4E2",
            borderRadius: 100,
            border: "5px solid #FEF3F2",
            padding: "5px",
          }}
        />
        <Typography variant="h4" sx={{ mb: 2, fontWeight: 500 }}>
          Delete Enterprise
        </Typography>
        <Typography variant="body2" sx={{ mb: 2 }}>
          Are you sure you want to delete <b>{enterpriseName}</b>? This action
          cannot be undone
        </Typography>
        <Typography variant="body2" sx={{ mb: 1 }}>
          Type <span style={{ color: "#FF5252", fontWeight: 500 }}>delete</span>{" "}
          to confirm
        </Typography>
        <TextField
          fullWidth
          placeholder='Type "delete" to confirm'
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          size="small"
        />
      </DialogContent>
      <DialogActions sx={{ justifyContent: "flex-end", pb: 3, px: 3 }}>
        <Button onClick={handleClose} variant="outlined" color="inherit">
          Cancel
        </Button>
        <Button
          onClick={handleDelete}
          variant="contained"
          sx={{ background: "#B11F26" }}
          disabled={confirm !== "delete"}
          loading={loading}
        >
          Delete Enterprise
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DeleteEnterprisesModal;
