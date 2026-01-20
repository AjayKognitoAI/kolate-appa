"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import {
  Box,
  Typography,
  Stack,
  Button,
  Alert,
  Card,
  CardContent,
  CardActionArea,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
} from "@mui/material";
import {
  IconDatabase,
  IconCloudUpload,
  IconLink,
  IconInfoCircle,
} from "@tabler/icons-react";

import CustomTextField from "@/components/forms/theme-elements/CustomTextField";
import { useOnboarding, DatasourceConfig } from "@/context/OnboardingContext";

const schema = yup.object({
  type: yup.string().required("Please select a data source type"),
  name: yup.string().default(""),
  connectionString: yup.string().default(""),
});

interface DatasourceStepProps {
  onComplete: (data?: Record<string, any>) => void;
}

const datasourceTypes = [
  {
    value: "none",
    label: "Skip for Now",
    description: "Configure data sources later from the dashboard",
    icon: IconInfoCircle,
  },
  {
    value: "upload",
    label: "File Upload",
    description: "Upload CSV, Excel, or other data files directly",
    icon: IconCloudUpload,
  },
  {
    value: "database",
    label: "Database Connection",
    description: "Connect to PostgreSQL, MySQL, or other databases",
    icon: IconDatabase,
  },
  {
    value: "api",
    label: "API Integration",
    description: "Connect to external APIs and data sources",
    icon: IconLink,
  },
];

export default function DatasourceStep({ onComplete }: DatasourceStepProps) {
  const { state, setDatasourceConfig } = useOnboarding();
  const [selectedType, setSelectedType] = useState(
    state.datasourceConfig?.type || "none"
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<{ type: string; name: string; connectionString: string }>({
    resolver: yupResolver(schema),
    defaultValues: {
      type: state.datasourceConfig?.type || "none",
      name: state.datasourceConfig?.name || "",
      connectionString: state.datasourceConfig?.connectionString || "",
    },
  });

  const onSubmit = (data: { type: string; name: string; connectionString: string }) => {
    setDatasourceConfig({
      type: data.type,
      name: data.name,
      connectionString: data.connectionString,
      configured: data.type !== "none",
    });
    onComplete({
      datasource_type: data.type,
      datasource_name: data.name,
      datasource_configured: data.type !== "none",
    });
  };

  const handleSkip = () => {
    setDatasourceConfig({
      type: "none",
      configured: false,
    });
    onComplete({
      datasource_type: "none",
      datasource_configured: false,
    });
  };

  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
        <IconDatabase size={28} />
        <Box>
          <Typography variant="h5" fontWeight={600}>
            Configure Data Source
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Set up how you&apos;ll bring data into Kolate
          </Typography>
        </Box>
      </Box>

      <Alert severity="info" sx={{ mb: 3 }} icon={<IconInfoCircle size={20} />}>
        This step is optional. You can always configure data sources from the admin dashboard
        after completing the setup.
      </Alert>

      <Stack component="form" onSubmit={handleSubmit(onSubmit)} spacing={3}>
        <FormControl component="fieldset">
          <RadioGroup
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
          >
            <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 2 }}>
              {datasourceTypes.map((type) => (
                <Card
                  key={type.value}
                  variant="outlined"
                  sx={{
                    border: selectedType === type.value ? 2 : 1,
                    borderColor:
                      selectedType === type.value ? "primary.main" : "divider",
                  }}
                >
                  <CardActionArea onClick={() => setSelectedType(type.value)}>
                    <CardContent>
                      <Box sx={{ display: "flex", alignItems: "flex-start", gap: 2 }}>
                        <Radio
                          value={type.value}
                          checked={selectedType === type.value}
                          {...register("type")}
                        />
                        <Box sx={{ flex: 1 }}>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                            <type.icon size={20} />
                            <Typography variant="subtitle1" fontWeight={600}>
                              {type.label}
                            </Typography>
                          </Box>
                          <Typography variant="body2" color="text.secondary">
                            {type.description}
                          </Typography>
                        </Box>
                      </Box>
                    </CardContent>
                  </CardActionArea>
                </Card>
              ))}
            </Box>
          </RadioGroup>
        </FormControl>

        {selectedType === "database" && (
          <Box sx={{ pt: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Database Connection Details
            </Typography>
            <Stack spacing={2}>
              <CustomTextField
                customLabel="Connection Name"
                {...register("name")}
                error={!!errors.name}
                helperText={errors.name?.message}
                placeholder="Primary Database"
                fullWidth
              />
              <CustomTextField
                customLabel="Connection String"
                {...register("connectionString")}
                error={!!errors.connectionString}
                helperText={errors.connectionString?.message || "postgresql://user:password@host:5432/database"}
                placeholder="postgresql://user:password@host:5432/database"
                fullWidth
              />
            </Stack>
          </Box>
        )}

        {selectedType === "api" && (
          <Box sx={{ pt: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              API Configuration
            </Typography>
            <Stack spacing={2}>
              <CustomTextField
                customLabel="API Name"
                {...register("name")}
                error={!!errors.name}
                helperText={errors.name?.message}
                placeholder="External API"
                fullWidth
              />
              <CustomTextField
                customLabel="API Endpoint"
                {...register("connectionString")}
                error={!!errors.connectionString}
                helperText={errors.connectionString?.message}
                placeholder="https://api.example.com/v1"
                fullWidth
              />
            </Stack>
          </Box>
        )}

        <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 2, pt: 2 }}>
          <Button
            variant="text"
            onClick={handleSkip}
            disabled={state.isLoading}
          >
            Skip for Now
          </Button>
          <Button
            type="submit"
            variant="contained"
            size="large"
            disabled={state.isLoading}
          >
            Continue
          </Button>
        </Box>
      </Stack>
    </Box>
  );
}
