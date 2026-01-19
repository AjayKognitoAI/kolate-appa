"use client";
import React from "react";
import { Card, CardContent, Typography, Grid, Box, Chip, Stack } from "@mui/material";
import { IconFlask, IconPill, IconVirus, IconDna } from "@tabler/icons-react";
import { Drug, AVAILABLE_DRUGS } from "@/utils/compare/compare-config";

interface StudyOption {
  id: string;
  name: string;
  description: string;
  category: Drug["category"];
  icon: React.ReactNode;
  drugs: Drug[];
}

// Group drugs by category to create study options
const getStudyOptions = (): StudyOption[] => {
  const categoryMap: Record<Drug["category"], { name: string; description: string; icon: React.ReactNode }> = {
    "CAR-T": {
      name: "CAR-T Cell Therapy Comparison",
      description: "Compare CAR-T cell therapies for hematological malignancies",
      icon: <IconDna size={24} />,
    },
    "Antibody": {
      name: "Antibody Therapy Comparison",
      description: "Compare monoclonal antibody treatments",
      icon: <IconVirus size={24} />,
    },
    "Immunotherapy": {
      name: "Immunotherapy Comparison",
      description: "Compare checkpoint inhibitor immunotherapies",
      icon: <IconFlask size={24} />,
    },
    "Chemotherapy": {
      name: "Chemotherapy Comparison",
      description: "Compare chemotherapy regimens",
      icon: <IconPill size={24} />,
    },
  };

  const groupedDrugs = AVAILABLE_DRUGS.reduce((acc, drug) => {
    if (!acc[drug.category]) {
      acc[drug.category] = [];
    }
    acc[drug.category].push(drug);
    return acc;
  }, {} as Record<Drug["category"], Drug[]>);

  return Object.entries(groupedDrugs).map(([category, drugs]) => ({
    id: category.toLowerCase().replace(/\s+/g, "-"),
    category: category as Drug["category"],
    name: categoryMap[category as Drug["category"]].name,
    description: categoryMap[category as Drug["category"]].description,
    icon: categoryMap[category as Drug["category"]].icon,
    drugs,
  }));
};

interface CompareStudySelectorProps {
  onSelect: (study: StudyOption) => void;
}

const CompareStudySelector: React.FC<CompareStudySelectorProps> = ({ onSelect }) => {
  const studyOptions = getStudyOptions();

  const getCategoryColor = (category: Drug["category"]): "primary" | "secondary" | "success" | "warning" => {
    switch (category) {
      case "CAR-T":
        return "primary";
      case "Antibody":
        return "secondary";
      case "Immunotherapy":
        return "success";
      case "Chemotherapy":
        return "warning";
      default:
        return "primary";
    }
  };

  return (
    <Grid container spacing={3}>
      {studyOptions.map((study) => (
        <Grid size={{ xs: 12, md: 6 }} key={study.id}>
          <Card
            variant="outlined"
            onClick={() => onSelect(study)}
            sx={{
              display: "flex",
              alignItems: "flex-start",
              p: 2,
              boxShadow: "none",
              borderRadius: 1,
              cursor: "pointer",
              transition: "all 0.2s ease-in-out",
              "&:hover": {
                borderColor: "primary.main",
                boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
              },
            }}
          >
            <Box
              sx={{
                width: 60,
                height: 60,
                mr: 2,
                bgcolor: "primary.light",
                color: "primary.main",
                borderRadius: 0.4,
                display: "grid",
                placeItems: "center",
                flexShrink: 0,
              }}
            >
              {study.icon}
            </Box>

            <CardContent sx={{ flex: 1, p: "0 !important" }}>
              <Stack direction="row" alignItems="center" spacing={1} mb={0.5}>
                <Typography variant="h6">{study.name}</Typography>
                <Chip
                  size="small"
                  label={study.category}
                  color={getCategoryColor(study.category)}
                  sx={{ height: 20, fontSize: 11 }}
                />
              </Stack>
              <Typography variant="body2" color="text.secondary" mb={1}>
                {study.description}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {study.drugs.length} drugs available: {study.drugs.map((d) => d.shortName).join(", ")}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
};

export default CompareStudySelector;
export type { StudyOption };
