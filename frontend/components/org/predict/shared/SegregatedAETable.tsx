import React from "react";
import {
  Paper,
  Box,
  Typography,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Chip,
} from "@mui/material";

type SegregatedPrediction = Record<string, string>;
type SegregatedConfidence = Record<string, string>;

interface Props {
  title?: string;
  prediction: SegregatedPrediction;
  confidence: SegregatedConfidence;
  overall_confidence?: string;
}

const toLabel = (key: string) =>
  key.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());

const SegregatedAETable: React.FC<Props> = ({
  title = "Results for AE Types",
  prediction,
  confidence,
  overall_confidence,
}) => {
  const keys = Object.keys(prediction || {});
  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2,
        borderRadius: 1,
        boxShadow: "none",
        overflowX: "auto",
        mt: 3,
      }}
    >
      <Box
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        mb={4}
      >
        <Typography fontWeight={600} variant="h6">
          {title}
        </Typography>
        {overall_confidence && (
          <Chip
            label={`Overall: ${overall_confidence}`}
            size="small"
            sx={{
              fontWeight: 500,
              fontSize: 12,
              height: 24,
              borderRadius: 1,
              background: overall_confidence === "High" ? "#219653" : "#FFF6ED",
              color: overall_confidence === "High" ? "#fff" : "#B76E00",
            }}
          />
        )}
      </Box>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: 700, width: 180 }}> </TableCell>
            {keys.map((k) => (
              <TableCell
                key={k}
                sx={{ fontWeight: 700, textTransform: "none" }}
              >
                {toLabel(k)}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          <TableRow>
            <TableCell sx={{ fontWeight: 600 }}>Prediction</TableCell>
            {keys.map((k) => (
              <TableCell key={k}>{prediction[k]}</TableCell>
            ))}
          </TableRow>
          <TableRow>
            <TableCell sx={{ fontWeight: 600 }}>Confidence</TableCell>
            {keys.map((k) => (
              <TableCell key={k}>{confidence[k]}</TableCell>
            ))}
          </TableRow>
        </TableBody>
      </Table>
    </Paper>
  );
};

export default SegregatedAETable;
