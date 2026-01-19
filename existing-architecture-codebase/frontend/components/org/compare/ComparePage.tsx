"use client";
import React, { useState } from "react";
import { Box, Typography, Divider } from "@mui/material";

import Breadcrumb from "@/components/layout/shared/breadcrumb/Breadcrumb";
import CompareStudySelector, { StudyOption } from "./CompareStudySelector";
import CompareWizard from "./CompareWizard";

const ComparePage: React.FC = () => {
  const [selectedStudy, setSelectedStudy] = useState<StudyOption | null>(null);

  const handleStudySelect = (study: StudyOption) => {
    setSelectedStudy(study);
  };

  const handleBackToSelection = () => {
    setSelectedStudy(null);
  };

  return (
    <Box>
      {/* Header */}
      <Box px={3} py={2} display="flex" alignItems="center">
        <Typography fontWeight={500} variant="h4">
          Compare
        </Typography>
      </Box>
      <Divider />

      {/* Breadcrumb */}
      <Box px={3} mt={3}>
        <Breadcrumb
          items={[
            { title: "Home", to: "/dashboard" },
            { title: "Compare", to: selectedStudy ? "/compare" : undefined },
            ...(selectedStudy ? [{ title: selectedStudy.name }] : []),
          ]}
        />
      </Box>

      {/* Main Content */}
      <Box px={3} mt={3} pb={4}>
        {!selectedStudy ? (
          <>
            <Typography variant="h6" mb={2}>
              Select a Comparison Study
            </Typography>
            <CompareStudySelector onSelect={handleStudySelect} />
          </>
        ) : (
          <CompareWizard study={selectedStudy} onBack={handleBackToSelection} />
        )}
      </Box>
    </Box>
  );
};

export default ComparePage;
