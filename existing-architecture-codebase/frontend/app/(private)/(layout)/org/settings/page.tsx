"use client";
import React, { useState } from "react";
import { Box, Typography, Paper, Divider, Button } from "@mui/material";
import {
  IconAlertTriangleFilled,
  IconMessageChatbot,
  IconMessageReport,
  IconTrash,
} from "@tabler/icons-react";
import PageContainer from "@/components/container/PageContainer";
import DashboardHeader from "@/components/admin/admin-dashboard/dashboard-header";
import DeleteAccountModal from "@/components/org/delete-account-modal";
import Header from "@/components/layout/header/Header";

export default function SettingsPage() {
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  return (
    <PageContainer title="Settings" description="Enterprise Settings">
      <Box px={3}>
        <Header
          title="Settings"
          subtitle="Manage your organization's account settings and preferences"
        />
        <Paper sx={{ mb: 3, p: 3 }} variant="outlined">
          <Typography variant="h6" fontWeight={600} mb={3}>
            Support
          </Typography>
          <Box display={"flex"} alignItems="center" gap={2}>
            <IconMessageChatbot size={28} />
            <Box flex={1}>
              <Typography variant="h5" fontWeight={600} mb={1}>
                Need Help?
              </Typography>

              <Typography variant="body2" color="text.secondary">
                If you have any questions or need help, please reach out to our
                support team.
                <span
                  style={{ float: "right", fontWeight: 600, color: "#3B5AFB" }}
                >
                  <a
                    href="mailto:support@kolate.ai"
                    style={{ color: "#3B5AFB", textDecoration: "none" }}
                  >
                    support@kolate.ai
                  </a>
                </span>
              </Typography>
            </Box>
          </Box>
        </Paper>
        <Paper variant="outlined">
          <Box sx={{ p: 3, background: "#F9F9F9" }}>
            <Typography variant="h6" fontWeight={600} mb={1}>
              Account Management
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={2}>
              Advanced options for your organization's account
            </Typography>
          </Box>
          <Divider sx={{}} />
          <Box
            sx={{
              background: "#FFF6F6",
              borderRadius: 0,
              p: 3,
              display: "flex",
              alignItems: "center",
            }}
          >
            <Box sx={{ flex: 1 }}>
              <Typography
                variant="subtitle1"
                color="#E6524B"
                fontWeight={600}
                display={"flex"}
                alignItems={"center"}
                gap={1}
              >
                <IconAlertTriangleFilled size={18} /> Danger Zone
              </Typography>
              <Typography variant="body2" color="text.secondary" mt={1}>
                Deleting your enterprise account will permanently remove all
                data, users, and configurations.
                <br />
                This action cannot be undone.
              </Typography>
            </Box>
            <Button
              variant="text"
              color="error"
              startIcon={<IconTrash size={18} />}
              sx={{ ml: 3, fontWeight: 600 }}
              onClick={() => setDeleteModalOpen(true)}
            >
              Request Account Deletion
            </Button>
          </Box>
        </Paper>
        {deleteModalOpen && (
          <DeleteAccountModal
            open={deleteModalOpen}
            onClose={() => setDeleteModalOpen(false)}
          />
        )}
      </Box>
    </PageContainer>
  );
}
