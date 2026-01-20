import React from "react";
import { Box, Typography, Paper, Avatar, Button } from "@mui/material";
import CloudUploadOutlinedIcon from "@mui/icons-material/CloudUploadOutlined";

interface SelectPatientProfilePanelProps {
  modelName: string;
  onSelectPatient: () => void;
  onUploadClick: () => void;
}

const patients = Array.from({ length: 7 }, (_, i) => ({
  id: `P${i + 1}`,
  name: `Patient ${i + 1}`,
  age: 73,
  gender: "Female",
}));

const SelectPatientProfilePanel: React.FC<SelectPatientProfilePanelProps> = ({
  modelName,
  onSelectPatient,
  onUploadClick,
}) => {
  return (
    <Paper
      elevation={0}
      variant="outlined"
      sx={{ borderRadius: 1, mt: 3, overflow: "hidden" }}
    >
      <Box
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        px={3}
        py={1}
        sx={{ background: "var(--gray-100)", borderRadius: 0 }}
      >
        <Typography variant="h6" fontWeight={600}>
          Select patient profile ({modelName})
        </Typography>

        <Button onClick={onUploadClick}>
          <CloudUploadOutlinedIcon sx={{ mr: 1, fontSize: 20 }} /> Upload
          Profile
        </Button>
      </Box>
      <Box
        display="flex"
        flexWrap="wrap"
        gap={2}
        justifyContent="flex-start"
        px={3}
        pb={3}
        mt={3}
      >
        {patients.map((p) => (
          <Paper
            key={p.id}
            variant="outlined"
            sx={{
              p: 2,
              minWidth: 140,
              textAlign: "center",
              borderRadius: 1,
              flex: "0 0 140px",
              cursor: "pointer",
            }}
            onClick={onSelectPatient}
          >
            <Avatar
              sx={{
                bgcolor: "#E6E6FA",
                color: "#7B61FF",
                mx: "auto",
                mb: 1,
                fontSize: "16px",
              }}
            >
              {p.id}
            </Avatar>
            <Typography fontWeight={500} fontSize={15}>
              {p.name}
            </Typography>
            <Typography fontSize={13} color="text.secondary">
              {p.age} yrs | {p.gender}
            </Typography>
          </Paper>
        ))}
      </Box>
    </Paper>
  );
};

export default SelectPatientProfilePanel;
