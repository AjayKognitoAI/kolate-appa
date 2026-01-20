import PredictionModels from "@/components/org/predict/PredictionModels";
import { Box, Divider, Typography } from "@mui/material";
import React from "react";

const Page = () => {
  return (
    <Box>
      <Box px={3} py={2} display="flex" alignItems="center">
        <Typography fontWeight={500} variant="h4">
          Predict
        </Typography>
      </Box>
      <Divider />
      <Box px={3} mt={3}>
        <Typography variant="h6" mb={2}>
          Select a Prediction Model(s)
        </Typography>
        <PredictionModels />
      </Box>
    </Box>
  );
};

export default Page;