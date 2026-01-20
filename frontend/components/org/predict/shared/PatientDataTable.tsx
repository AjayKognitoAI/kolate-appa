import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
  Paper,
  Box,
  Typography,
} from "@mui/material";

interface PatientDataTableProps {
  patientData: Record<string, any>;
  fieldsConfig?: { field: string; label: string }[];
  // optional: if you want custom labels/order
}

const PatientDataTable = ({
  patientData,
  fieldsConfig,
}: PatientDataTableProps) => {
  // If a config is passed, use it; otherwise, use all keys from patientData
  const rows =
    fieldsConfig && fieldsConfig.length > 0
      ? fieldsConfig.map((f) => ({
          label: f.label,
          value: patientData[f.field],
        }))
      : Object.keys(patientData).map((key) => ({
          label: key,
          value: patientData[key],
        }));

  if (!rows.length) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
        No patient data available.
      </Typography>
    );
  }

  return (
    <Box sx={{ overflowX: "auto", mt: 2 }}>
      <TableContainer component={Paper} sx={{ maxWidth: "100%" }}>
        <Table size="small">
          <TableBody>
            {/* Row for labels */}
            <TableRow>
              {rows.map((row, i) => (
                <TableCell
                  key={i}
                  component="th"
                  scope="row"
                  sx={{ fontWeight: 600, whiteSpace: "nowrap" }}
                >
                  {row.label}
                </TableCell>
              ))}
            </TableRow>

            {/* Row for values */}
            <TableRow>
              {rows.map((row, i) => (
                <TableCell
                  key={i}
                  sx={{ whiteSpace: "normal", minWidth: "160px" }}
                >
                  {row.value || "-"}
                </TableCell>
              ))}
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default PatientDataTable;
