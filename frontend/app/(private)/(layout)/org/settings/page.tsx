"use client";

import React, { useState } from "react";
import { Box, Typography, Paper, Divider, Button, Stack } from "@mui/material";
import {
  IconAlertTriangleFilled,
  IconMessageChatbot,
  IconPalette,
  IconTrash,
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import PageContainer from "@/components/container/PageContainer";
import DashboardHeader from "@/components/admin/admin-dashboard/dashboard-header";
import DeleteAccountModal from "@/components/org/delete-account-modal";
import Header from "@/components/layout/header/Header";
import { ThemeModeToggle, LanguageSelector } from "@/components/settings";

export default function SettingsPage() {
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const { t } = useTranslation("settings");

  return (
    <PageContainer title={t("title")} description="Enterprise Settings">
      <Box px={3}>
        <Header title={t("title")} subtitle={t("subtitle")} />

        {/* Appearance & Language Section */}
        <Paper sx={{ mb: 3, p: 3 }} variant="outlined">
          <Box display="flex" alignItems="center" gap={2} mb={3}>
            <IconPalette size={24} />
            <Typography variant="h6" fontWeight={600}>
              {t("appearance.title")}
            </Typography>
          </Box>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={4}
            alignItems={{ xs: "flex-start", sm: "flex-end" }}
          >
            <ThemeModeToggle />
            <LanguageSelector />
          </Stack>
        </Paper>

        {/* Support Section */}
        <Paper sx={{ mb: 3, p: 3 }} variant="outlined">
          <Typography variant="h6" fontWeight={600} mb={3}>
            {t("support.title")}
          </Typography>
          <Box display="flex" alignItems="center" gap={2}>
            <IconMessageChatbot size={28} />
            <Box flex={1}>
              <Typography variant="h5" fontWeight={600} mb={1}>
                {t("support.needHelp")}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t("support.helpText")}
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

        {/* Account Management Section */}
        <Paper variant="outlined">
          <Box sx={{ p: 3, background: "#F9F9F9" }}>
            <Typography variant="h6" fontWeight={600} mb={1}>
              {t("account.title")}
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={2}>
              {t("account.subtitle")}
            </Typography>
          </Box>
          <Divider />
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
                display="flex"
                alignItems="center"
                gap={1}
              >
                <IconAlertTriangleFilled size={18} /> {t("danger.title")}
              </Typography>
              <Typography variant="body2" color="text.secondary" mt={1}>
                {t("danger.warning")}
              </Typography>
            </Box>
            <Button
              variant="text"
              color="error"
              startIcon={<IconTrash size={18} />}
              sx={{ ml: 3, fontWeight: 600 }}
              onClick={() => setDeleteModalOpen(true)}
            >
              {t("danger.deleteButton")}
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
