"use client";

import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import {
  Box,
  Typography,
  Stack,
  MenuItem,
  FormControl,
  FormHelperText,
  Select,
  InputLabel,
  Button,
} from "@mui/material";
import { IconBuilding } from "@tabler/icons-react";

import CustomTextField from "@/components/forms/theme-elements/CustomTextField";
import { useOnboarding, CompanyInfoData } from "@/context/OnboardingContext";

const schema = yup.object({
  name: yup.string().required("Company name is required").min(2, "Name must be at least 2 characters"),
  description: yup.string().default(""),
  industry: yup.string().default(""),
  employeeCount: yup.string().default(""),
  website: yup.string().url("Enter a valid URL").default(""),
  logoUrl: yup.string().url("Enter a valid URL").default(""),
});

interface CompanyInfoStepProps {
  onComplete: (data?: Record<string, any>) => void;
}

const industries = [
  "Healthcare & Life Sciences",
  "Pharmaceuticals",
  "Biotechnology",
  "Medical Devices",
  "Clinical Research",
  "Hospital & Health Systems",
  "Insurance",
  "Technology",
  "Other",
];

const employeeCounts = [
  "1-10",
  "11-50",
  "51-200",
  "201-500",
  "501-1000",
  "1001-5000",
  "5000+",
];

export default function CompanyInfoStep({ onComplete }: CompanyInfoStepProps) {
  const { state, setCompanyInfo } = useOnboarding();

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<CompanyInfoData>({
    resolver: yupResolver(schema),
    defaultValues: {
      name: state.companyInfo?.name || state.enterpriseName || "",
      description: state.companyInfo?.description || "",
      industry: state.companyInfo?.industry || "",
      employeeCount: state.companyInfo?.employeeCount || "",
      website: state.companyInfo?.website || `https://${state.enterpriseDomain || ""}`,
      logoUrl: state.companyInfo?.logoUrl || "",
    },
  });

  const onSubmit = (data: CompanyInfoData) => {
    setCompanyInfo(data);
    onComplete({
      company_name: data.name,
      company_description: data.description,
      industry: data.industry,
      employee_count: data.employeeCount,
      website: data.website,
      logo_url: data.logoUrl,
    });
  };

  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
        <IconBuilding size={28} />
        <Box>
          <Typography variant="h5" fontWeight={600}>
            Company Information
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Tell us about your organization
          </Typography>
        </Box>
      </Box>

      <Stack component="form" onSubmit={handleSubmit(onSubmit)} spacing={3}>
        <CustomTextField
          customLabel="Company Name *"
          {...register("name")}
          error={!!errors.name}
          helperText={errors.name?.message}
          placeholder="Acme Healthcare Inc."
          fullWidth
        />

        <CustomTextField
          customLabel="Company Description"
          {...register("description")}
          error={!!errors.description}
          helperText={errors.description?.message}
          placeholder="A leading healthcare technology company..."
          multiline
          rows={3}
          fullWidth
        />

        <Box sx={{ display: "flex", gap: 2 }}>
          <FormControl fullWidth error={!!errors.industry}>
            <InputLabel id="industry-label" size="small">
              Industry
            </InputLabel>
            <Select
              labelId="industry-label"
              label="Industry"
              size="small"
              value={watch("industry") || ""}
              onChange={(e) => setValue("industry", e.target.value)}
            >
              {industries.map((industry) => (
                <MenuItem key={industry} value={industry}>
                  {industry}
                </MenuItem>
              ))}
            </Select>
            {errors.industry && (
              <FormHelperText>{errors.industry.message}</FormHelperText>
            )}
          </FormControl>

          <FormControl fullWidth error={!!errors.employeeCount}>
            <InputLabel id="employees-label" size="small">
              Company Size
            </InputLabel>
            <Select
              labelId="employees-label"
              label="Company Size"
              size="small"
              value={watch("employeeCount") || ""}
              onChange={(e) => setValue("employeeCount", e.target.value)}
            >
              {employeeCounts.map((count) => (
                <MenuItem key={count} value={count}>
                  {count} employees
                </MenuItem>
              ))}
            </Select>
            {errors.employeeCount && (
              <FormHelperText>{errors.employeeCount.message}</FormHelperText>
            )}
          </FormControl>
        </Box>

        <CustomTextField
          customLabel="Company Website"
          {...register("website")}
          error={!!errors.website}
          helperText={errors.website?.message}
          placeholder="https://www.example.com"
          fullWidth
        />

        <CustomTextField
          customLabel="Company Logo URL"
          {...register("logoUrl")}
          error={!!errors.logoUrl}
          helperText={errors.logoUrl?.message || "Provide a URL to your company logo (optional)"}
          placeholder="https://www.example.com/logo.png"
          fullWidth
        />

        <Box sx={{ display: "flex", justifyContent: "flex-end", pt: 2 }}>
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
