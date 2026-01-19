// components/shared/AddPatientProfileModalBase.tsx
import React, { useState, useEffect } from "react";
import {
  Drawer,
  Box,
  Typography,
  Tabs,
  Tab,
  IconButton,
  Button,
  Paper,
  Grid,
  Divider,
  Skeleton,
  Alert,
  Stack,
  Avatar,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import CloudUploadOutlinedIcon from "@mui/icons-material/CloudUploadOutlined";
import { toast } from "react-toastify";
import theme from "@/utils/theme";
import CustomFormLabel from "@/components/forms/theme-elements/CustomFormLabel";
import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";

interface FieldMeta {
  name: string;
  type: "number" | "text";
  description: string;
  options?: string[];
  min?: number;
  max?: number;
}

const generateYupSchema = (fields: FieldMeta[]) => {
  const shape: Record<string, any> = {};
  fields.forEach((field) => {
    shape[field.name] =
      field.type === "number"
        ? yup.number().typeError("Must be a number")
        : yup.string();
  });
  return yup.object().shape(shape);
};

const buildDefaults = (fields: FieldMeta[]) => {
  const obj: Record<string, any> = {};
  fields.forEach((f) => (obj[f.name] = ""));
  return obj;
};

export interface AddPatientProfileModalBaseProps<TPatient, TResult = any> {
  open: boolean;
  onClose: () => void;
  defaultTab?: "csv" | "manual";
  setPatients: React.Dispatch<React.SetStateAction<TPatient[]>>;
  projectId: string;
  trialSlug: string;
  title: string;

  // 🔑 service injection
  getFields: () => Promise<FieldMeta[]>;
  uploadCsv: (
    file: File,
    projectId: string,
    trialSlug: string
  ) => Promise<TPatient[]>;
  createRecord: (
    projectId: string,
    trialSlug: string,
    data: any
  ) => Promise<TPatient>;
  runPrediction?: (
    patient: TPatient,
    projectId: string,
    trialSlug: string
  ) => Promise<TResult>;
  navigation?: (arg: any) => void;
  getSamplePatients?: () => Promise<TPatient[]>;
}

function AddPatientProfileModalBase<TPatient>({
  open,
  onClose,
  defaultTab = "csv",
  setPatients,
  projectId,
  trialSlug,
  title,
  getFields,
  uploadCsv,
  createRecord,
  runPrediction,
  getSamplePatients,
  navigation,
}: AddPatientProfileModalBaseProps<TPatient>) {
  const [tab, setTab] = useState<"csv" | "manual" | "sample">(defaultTab);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvLoading, setCsvLoading] = useState(false);

  const [fields, setFields] = useState<FieldMeta[]>([]);
  const [fieldError, setFieldError] = useState("");
  const [fieldLoading, setFieldLoading] = useState(true);

  const [manualLoading, setManualLoading] = useState(false);
  const [schema, setSchema] = useState<yup.AnyObjectSchema>(yup.object());
  const [defaults, setDefaults] = useState<any>({});
  const [sampleLoading, setSampleLoading] = useState(false);
  const [samplePredicting, setSamplePredicting] = useState(false);

  const {
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: defaults,
  });

  // fetch fields
  useEffect(() => {
    if (tab === "manual") {
      setFieldLoading(true);
      getFields()
        .then((fetched) => {
          setFields(fetched);
          setSchema(generateYupSchema(fetched));
          setDefaults(buildDefaults(fetched));
        })
        .catch(() => setFieldError("Failed to fetch field details"))
        .finally(() => setFieldLoading(false));
    }

    if (tab === "sample" && getSamplePatients) {
      setSampleLoading(true); // ✅ start loading
      getSamplePatients()
        .then((patients) => setSamplePatients(patients))
        .catch(() => {
          toast.error("Failed to load sample dataset.");
        })
        .finally(() => setSampleLoading(false)); // ✅ end loading
    }
  }, [open, tab]);

  useEffect(() => {
    setTab(defaultTab);
  }, [defaultTab, open]);

  const [samplePatients, setSamplePatients] = useState<any[]>([]);
  const [selectedSample, setSelectedSample] = useState<number | null>(null);

  const handleCsvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) setCsvFile(e.target.files[0]);
  };

  const handleCsvUpload = async () => {
    if (!csvFile) return;
    setCsvLoading(true);
    try {
      const patients = await uploadCsv(csvFile, projectId, trialSlug);
      setPatients((prev) => [...prev, ...patients]);
      onClose();
    } catch {
      toast.error("Failed to upload CSV.");
    } finally {
      setCsvLoading(false);
    }
  };

  const onManualSubmit = async (data: any) => {
    setManualLoading(true);
    try {
      const patient = await createRecord(projectId, trialSlug, data);
      setPatients((prev) => [...prev, patient]);
      onClose();
      reset();
    } catch {
      toast.error("Failed to save patient.");
    } finally {
      setManualLoading(false);
    }
  };

  // Helper to normalize sample patient display
  const getSampleDisplay = (p: any, i: number, trialSlug: string) => {
    const pd = p?.data?.[0] || {};

    if (trialSlug === "car-t-cell-therapy-b") {
      return {
        name: `Patient ${i + 1}`,
        age: pd.ptage || "-",
        gender: pd.sex_id || "Unknown",
      };
    }

    if (trialSlug === "squamous-lung-therapy-n") {
      return {
        name: pd.ALTPATID || `Patient ${i + 1}`,
        age: pd.age_cat || "-",
        gender: pd.SEX || "Unknown",
      };
    }

    if (trialSlug === "lung-cancer-risk") {
      return {
        name: pd.Patient_ID ? `Patient ${pd.Patient_ID}` : `Patient ${i + 1}`,
        age: pd.Age || "-",
        gender: pd.Gender || "Unknown",
      };
    }

    if (trialSlug === "lung-cancer-therapy-s") {
      return {
        name: `Patient ${i + 1}`,
        age: pd.agecat || "-",
        gender: pd.sex || "Unknown",
      };
    }

    // fallback
    return {
      name: `Patient ${i + 1}`,
      age: pd.ptage || pd.age_cat || "-",
      gender: pd.sex_id || pd.SEX || "Unknown",
    };
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: { xs: "100%" },
          borderRadius: "16px 0 0 16px",
          maxWidth: "768px",
        },
      }}
    >
      {/* Header */}
      <Box
        sx={{
          p: 3,
          pb: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Typography variant="h5" fontWeight={600}>
          {title}
        </Typography>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </Box>

      {/* Tabs */}
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ px: 3, pt: 1 }}>
        <Tab label="Upload CSV" value="csv" />
        <Tab label="Manual Entry" value="manual" />
        <Tab label="Kolate AI Dataset" value="sample" />
      </Tabs>

      <Divider sx={{ mb: 2 }} />

      {/* Body */}
      <Box sx={{ px: 3, pb: 3, pt: 0, overflowY: "auto", flex: 1 }}>
        {tab === "csv" && (
          <Box>
            <Typography fontWeight={600} mb={1} variant="h6">
              Upload patient data
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={3}>
              Upload a CSV file containing patient medical data. The file should
              include all required biomarkers and measurements.
            </Typography>
            <Paper
              variant="outlined"
              sx={{
                borderStyle: "dashed",
                borderWidth: 2,
                p: 6,
                textAlign: "center",
                background: "var(--gray-50, #fafbfc)",
                cursor: "pointer",
                mb: 2,
              }}
              onClick={() =>
                document.getElementById("csv-upload-input")?.click()
              }
            >
              <input
                id="csv-upload-input"
                type="file"
                accept=".csv"
                style={{ display: "none" }}
                onChange={handleCsvChange}
              />
              <CloudUploadOutlinedIcon
                color="primary"
                sx={{ fontSize: 40, mb: 1 }}
              />
              <Typography>
                {csvFile ? csvFile.name : "Click to upload or drag and drop"}
              </Typography>
            </Paper>
          </Box>
        )}

        {tab === "manual" && (
          <Box>
            <Typography fontWeight={600} mb={1} variant="h6">
              Manual patient data entry
            </Typography>

            <Typography variant="body2" color="text.secondary" mb={3}>
              Enter patient information manually. Required fields are marked
              with an asterisk (*).{" "}
            </Typography>
            {fieldLoading ? (
              <Grid container spacing={2} mb={2}>
                {[...Array(6)].map((_, i) => (
                  <Grid component={Grid} size={{ xs: 12, sm: 6 }} key={i}>
                    <Stack direction="column" gap={1}>
                      <Skeleton height={10} width="50%" />
                      <Skeleton height={45} />
                    </Stack>
                  </Grid>
                ))}
              </Grid>
            ) : fieldError ? (
              <Alert severity="error" sx={{ mb: 2 }}>
                {fieldError}
              </Alert>
            ) : (
              <Grid container spacing={2} mb={2}>
                {fields?.map((field) => (
                  <Grid
                    component={Grid}
                    size={{ xs: 12, sm: 6 }}
                    key={field.name}
                  >
                    <CustomFormLabel>{field.description}</CustomFormLabel>
                    <Controller
                      name={field.name}
                      control={control}
                      render={({ field: rhfField }) => (
                        <input
                          {...rhfField}
                          value={rhfField.value ?? ""}
                          inputMode={
                            field.type === "number" ? "decimal" : undefined
                          }
                          step={field.type === "number" ? "any" : undefined}
                          list={field.options ? field.name : undefined}
                          onWheel={(e) =>
                            field.type === "number" && e.currentTarget.blur()
                          }
                          style={{
                            width: "100%",
                            height: 40,
                            padding: "10px",
                            borderRadius: 8,
                            outline: "none",
                            border: `1px solid ${theme.palette.divider}`,
                          }}
                        />
                      )}
                    />
                    {errors[field.name] && (
                      <Typography variant="caption" color="error">
                        {errors[field.name]?.message as string}
                      </Typography>
                    )}
                    {Array.isArray(field.options) && (
                      <datalist id={field.name}>
                        {field.options.map((opt, i) => (
                          <option value={opt} key={i} />
                        ))}
                      </datalist>
                    )}
                  </Grid>
                ))}
              </Grid>
            )}
          </Box>
        )}

        {tab === "sample" && (
          <Box>
            <Typography fontWeight={600} mb={1} variant="h6">
              Try sample dataset
            </Typography>

            <Typography variant="body2" color="text.secondary" mb={3}>
              Explore KolateAI instantly with pre-loaded patient profiles.
            </Typography>

            {sampleLoading ? ( // ✅ use sampleLoading here, not fieldLoading
              <Stack gap={2}>
                {[...Array(3)].map((_, i) => (
                  <Paper
                    key={i}
                    variant="outlined"
                    sx={{ p: 2, display: "flex", alignItems: "center", gap: 2 }}
                  >
                    <Skeleton variant="circular" width={30} height={30} />
                    <Box flex={1}>
                      <Skeleton width="40%" height={14} />
                      <Skeleton width="30%" height={12} />
                    </Box>
                  </Paper>
                ))}
              </Stack>
            ) : (
              <Stack gap={2}>
                {samplePatients?.map((p, i) => {
                  const display = getSampleDisplay(p, i, trialSlug);
                  const selected = selectedSample === i;
                  return (
                    <Paper
                      key={i}
                      variant="outlined"
                      sx={{
                        p: 2,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        borderRadius: 0.5,
                        cursor: "pointer",
                        borderColor: selected ? "var(--indigo-700)" : "divider",
                        bgcolor: selected ? "primary.50" : "background.paper",
                      }}
                      onClick={() => setSelectedSample(i)}
                    >
                      <Box display="flex" alignItems="center" gap={1}>
                        <Avatar
                          sx={{
                            width: 30,
                            height: 30,
                            background: "var(--indigo-100)",
                            color: "var(--indigo-700)",
                            fontWeight: 700,
                            fontSize: 14,
                          }}
                        >
                          P
                        </Avatar>
                        <Box>
                          <Typography fontWeight={600}>
                            {display.name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {display.age} yrs | {display.gender}
                          </Typography>
                        </Box>
                      </Box>
                      {selected && (
                        <Typography
                          variant="caption"
                          fontWeight={600}
                          sx={{
                            background: "var(--indigo-100)",
                            color: "var(--indigo-700)",
                            px: 1,
                            borderRadius: "4px",
                          }}
                        >
                          Selected
                        </Typography>
                      )}
                    </Paper>
                  );
                })}
              </Stack>
            )}
          </Box>
        )}
      </Box>

      {/* Global Footer only for CSV + Manual */}

      <Box
        sx={{
          px: 3,
          pb: 3,
          pt: 1,
          display: "flex",
          gap: 2,
          justifyContent: "flex-end",
          borderTop: "1px solid #eee",
        }}
      >
        <Button onClick={onClose} variant="outlined" color="inherit">
          Cancel
        </Button>
        {tab === "csv" && (
          <Button
            variant="contained"
            disabled={!csvFile || csvLoading}
            onClick={handleCsvUpload}
          >
            {csvLoading ? "Saving..." : "Save Patient(s)"}
          </Button>
        )}
        {tab === "manual" && (
          <Button
            variant="contained"
            disabled={!fields.length || manualLoading}
            onClick={handleSubmit(onManualSubmit)}
          >
            {manualLoading ? "Saving..." : "Save Patient"}
          </Button>
        )}

        {tab === "sample" && (
          <Button
            variant="contained"
            disabled={
              selectedSample === null || !runPrediction || samplePredicting
            }
            onClick={async () => {
              if (selectedSample === null || !runPrediction) return;
              const patient = samplePatients[selectedSample]?.data?.[0];
              try {
                setSamplePredicting(true);
                const prediction = await runPrediction(
                  patient,
                  projectId,
                  trialSlug
                );
                if (navigation) navigation(prediction);
                toast.success("Prediction completed!");
                onClose();
              } catch {
                toast.error("Failed to run prediction for sample patient.");
              } finally {
                setSamplePredicting(false);
              }
            }}
          >
            {samplePredicting ? "Running Prediction..." : "Run Prediction"}
          </Button>
        )}
      </Box>
    </Drawer>
  );
}

export default AddPatientProfileModalBase;
