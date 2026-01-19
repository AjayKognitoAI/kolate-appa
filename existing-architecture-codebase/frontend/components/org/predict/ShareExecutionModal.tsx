import React, { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Typography,
  Box,
  Avatar,
  Chip,
  CircularProgress,
  Alert,
  InputAdornment,
  IconButton,
  Paper,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemButton,
} from "@mui/material";
import { Search as SearchIcon, Close as CloseIcon } from "@mui/icons-material";
import {
  projectService,
  ProjectUser,
} from "@/services/project/project-service";
import predictService from "@/services/predict/predict-service";

interface ShareExecutionModalProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  trialSlug: string;
  executionId: string;
  senderId: string;
  initialSelectedUsers?: string[]; // Array of user auth0 IDs already shared with
}

const ShareExecutionModal: React.FC<ShareExecutionModalProps> = ({
  open,
  onClose,
  projectId,
  trialSlug,
  executionId,
  senderId,
  initialSelectedUsers = [],
}) => {
  const [projectUsers, setProjectUsers] = useState<ProjectUser[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>(
    initialSelectedUsers ?? []
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [suggestLoading, setSuggestLoading] = useState(false);

  // Fetch project users when modal opens (no cleanup that sets state)
  useEffect(() => {
    const fetchProjectUsers = async () => {
      if (!projectId) return;
      setLoading(true);
      setError(null);
      try {
        const resp = await projectService.getProjectUsers(projectId);
        const users: ProjectUser[] = resp?.data ?? resp ?? [];
        setProjectUsers(users);
      } catch (err) {
        console.error("Error fetching project users:", err);
        // setError("Error loading project users");
      } finally {
        setLoading(false);
      }
    };

    if (open) {
      setSearchTerm("");
      setError(null);
      setSuccess(false);
      // reset selection to initial only when opening
      fetchProjectUsers();
    }
    // intentionally no cleanup that calls setState
  }, [open, projectId]);

  // Derived: selected user details from projectUsers
  const selectedUsersData = useMemo(
    () => projectUsers.filter((u) => selectedUsers.includes(u.user_auth0_id)),
    [projectUsers, selectedUsers]
  );

  // Suggestions from local list only (exclude already selected and sender)
  const suggestions = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return [];
    return projectUsers
      .filter((u) => u.user_auth0_id !== senderId)
      .filter((u) => !selectedUsers.includes(u.user_auth0_id))
      .filter((u) => {
        const fullName = `${u.first_name ?? ""} ${
          u.last_name ?? ""
        }`.toLowerCase();
        const email = (u.email ?? "").toLowerCase();
        return fullName.includes(q) || email.includes(q);
      })
      .slice(0, 20);
  }, [projectUsers, searchTerm, selectedUsers, senderId]);

  // handle add suggestion (no service call)
  const addSuggestion = (user: ProjectUser) => {
    if (selectedUsers.includes(user.user_auth0_id)) return;
    setSelectedUsers((prev) => [...prev, user.user_auth0_id]);
    setSearchTerm("");
  };

  const removeSelected = (auth0Id: string) => {
    setSelectedUsers((prev) => prev.filter((id) => id !== auth0Id));
  };

  const handleShare = async () => {
    if (selectedUsers.length === 0) {
      setError("Please select at least one team member to share with");
      return;
    }

    setSharing(true);
    setError(null);

    try {
      await predictService.shareExecution(
        projectId,
        trialSlug,
        executionId,
        senderId,
        selectedUsers
      );
      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err) {
      console.error("Error sharing execution:", err);
      setError("Failed to share execution. Please try again.");
    } finally {
      setSharing(false);
    }
  };

  const handleClose = () => {
    if (!sharing) onClose();
  };

  const showSuggestions =
    searchTerm.trim().length > 0 && suggestions.length > 0;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{ sx: { borderRadius: 2 } }}
    >
      <DialogTitle sx={{ pb: 1 }} component="div">
        <Typography variant="h6" fontWeight={600}>
          Share with team members
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Search team members from the project and add only those you want to
          share with.
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ px: 3 }}>
        {/* Search Field (typeahead from fetched list only) */}
        <TextField
          fullWidth
          placeholder="Search team members (type name or email)"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setError(null);
            setSuggestLoading(true);
            // quick small UX delay
            setTimeout(() => setSuggestLoading(false), 120);
          }}
          sx={{ mb: 2 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon color="action" />
              </InputAdornment>
            ),
            endAdornment: suggestLoading ? (
              <InputAdornment position="end">
                <CircularProgress size={18} />
              </InputAdornment>
            ) : null,
          }}
          onKeyDown={(e) => {
            // Enter selects first suggestion
            if (e.key === "Enter" && suggestions.length > 0) {
              e.preventDefault();
              addSuggestion(suggestions[0]);
            }
          }}
        />

        {/* Suggestions list (local only) */}
        {searchTerm.trim().length > 0 && (
          <Box sx={{ mb: 2 }}>
            <Paper
              elevation={1}
              sx={{
                width: "100%",
                maxHeight: 220,
                overflowY: "auto",
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 1,
              }}
            >
              <List dense disablePadding>
                {suggestLoading && (
                  <ListItem sx={{ px: 1.5, py: 0.5 }}>
                    <ListItemText
                      primary="Looking..."
                      primaryTypographyProps={{
                        variant: "body2",
                        sx: { fontSize: "0.85rem" },
                      }}
                    />
                  </ListItem>
                )}

                {!suggestLoading && suggestions.length === 0 && (
                  <ListItem sx={{ px: 1.5, py: 0.5 }}>
                    <ListItemText
                      primary="No matches in project users"
                      primaryTypographyProps={{
                        variant: "body2",
                        sx: { fontSize: "0.85rem" },
                      }}
                    />
                  </ListItem>
                )}

                {!suggestLoading &&
                  suggestions.map((u, idx) => (
                    <React.Fragment key={u.user_auth0_id}>
                      <ListItem disablePadding>
                        <ListItemButton
                          onClick={() => addSuggestion(u)}
                          sx={{ py: 0.5, px: 1.5 }}
                        >
                          <ListItemAvatar>
                            <Avatar
                              src={u.avatar_url}
                              sx={{
                                width: 28,
                                height: 28,
                                fontSize: "0.85rem",
                              }}
                            >
                              {u.first_name?.[0] || u.email?.[0] || "?"}
                            </Avatar>
                          </ListItemAvatar>

                          <ListItemText
                            primary={
                              `${u.first_name ?? ""} ${
                                u.last_name ?? ""
                              }`.trim() || u.email
                            }
                            secondary={u.email}
                            primaryTypographyProps={{
                              variant: "body2",
                              sx: { fontSize: "0.85rem" },
                            }}
                            secondaryTypographyProps={{
                              variant: "caption",
                              sx: { fontSize: "0.75rem" },
                            }}
                          />
                        </ListItemButton>
                      </ListItem>

                      {/* Divider between items */}
                      {idx < suggestions.length - 1 && (
                        <Box
                          sx={{
                            borderBottom: "1px solid",
                            borderColor: "divider",
                            mx: 1,
                          }}
                        />
                      )}
                    </React.Fragment>
                  ))}
              </List>
            </Paper>
          </Box>
        )}

        {/* Selected users area (only show selected users) */}
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Selected team members ({selectedUsers.length})
        </Typography>

        {/* Loading state while initially fetching project users */}
        {loading && (
          <Box display="flex" justifyContent="center" py={2}>
            <CircularProgress size={28} />
          </Box>
        )}

        {/* If no selected users */}
        {!loading && selectedUsers.length === 0 && (
          <Typography color="text.secondary" align="center" py={2}>
            No team members selected
          </Typography>
        )}

        <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
          {/* Render detailed rows for selected users we have details for */}
          {selectedUsersData.map((u) => (
            <Box
              key={u.user_auth0_id}
              sx={{
                display: "flex",
                alignItems: "center",
                p: 0.75,
                pl: 1.5,
                borderRadius: 1,
                border: "1px solid",
                borderColor: "divider",
                bgcolor: "background.paper",
              }}
            >
              <Avatar
                src={u.avatar_url}
                sx={{ width: 28, height: 28, fontSize: "0.85rem", mr: 1.5 }}
              >
                {u.first_name?.[0] || u.email?.[0] || "?"}
              </Avatar>
              <Box sx={{ flexGrow: 1 }}>
                <Typography
                  variant="body2"
                  fontWeight={500}
                  sx={{ fontSize: "0.85rem" }}
                >
                  {u.first_name && u.last_name
                    ? `${u.first_name} ${u.last_name}`
                    : u.email}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {u.email}
                </Typography>
              </Box>
              <IconButton
                onClick={() => removeSelected(u.user_auth0_id)}
                size="small"
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            </Box>
          ))}

          {/* Fallback chips for selected IDs without fetched details */}
          {selectedUsers
            .filter(
              (id) => !selectedUsersData.some((u) => u.user_auth0_id === id)
            )
            .map((id) => (
              <Chip
                key={id}
                label={id}
                onDelete={() => removeSelected(id)}
                sx={{ alignSelf: "flex-start" }}
              />
            ))}
        </Box>

        {/* Error / Success */}
        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert severity="success" sx={{ mt: 2 }}>
            Execution shared successfully!
          </Alert>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button variant="outlined" onClick={handleClose} disabled={sharing}>
          Cancel
        </Button>
        <Button
          onClick={handleShare}
          variant="contained"
          disabled={sharing || selectedUsers.length === 0}
          startIcon={sharing ? <CircularProgress size={16} /> : null}
          sx={{ minWidth: 100 }}
        >
          {sharing ? "Sending..." : "Send"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ShareExecutionModal;
