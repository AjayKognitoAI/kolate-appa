import React, { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  IconButton,
  Grid,
} from "@mui/material";
import { IconX, IconUpload } from "@tabler/icons-react";
import CustomTextField from "@/components/forms/theme-elements/CustomTextField";
import CustomSelect from "@/components/forms/theme-elements/CustomSelect";
import { styled } from "@mui/material/styles";
import { useForm, Controller } from "react-hook-form";
import {
  updateEnterprise,
  getEnterpriseByOrgId,
  uploadEnterpriseFile,
  updateOnboardingProgress,
} from "@/services/org-admin/enterprise-setup";
import { useSession } from "next-auth/react";
import Skeleton from "@mui/material/Skeleton";
import ImageCropperModal from "@/components/common/ImageCropperModal";
import { blobToFile } from "@/utils/blobToFile";
import Image from "next/image";

interface EnterpriseSetupModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: EnterpriseSetupData) => void;
  loading?: boolean;
}

interface EnterpriseSetupData {
  enterpriseName: string;
  zipCode: string;
  enterpriseSize: string;
  region: string;
  phoneNumber: string;
  about: string;
  logo?: string | null;
}

const UploadBox = styled(Box)(({ theme }) => ({
  border: "1px dashed #ccc",
  borderRadius: "4px",
  padding: "24px",
  textAlign: "center",
  cursor: "pointer",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  height: "80px",
  width: "80px",
  backgroundColor: "#f9fafb",
  "&:hover": {
    borderColor: theme.palette.primary.main,
  },
}));

const enterpriseSizeOptions = [
  { value: "1-50", label: "1-50 employees" },
  { value: "51-200", label: "51-200 employees" },
  { value: "201-1000", label: "201-1000 employees" },
  { value: "1001-5000", label: "1001-5000 employees" },
  { value: "5000+", label: "5000+ employees" },
];

const EnterpriseSetupModal: React.FC<EnterpriseSetupModalProps> = ({
  open,
  onClose,
  onSave,
  loading = false,
}) => {
  const { data: session } = useSession();
  const {
    control,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { isSubmitting, isValid },
  } = useForm<EnterpriseSetupData>({
    mode: "onChange",
    defaultValues: {
      enterpriseName: "",
      zipCode: "",
      enterpriseSize: "",
      region: "",
      phoneNumber: "",
      about: "",
      logo: null,
    },
  });

  const logo = watch("logo");
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [loadingEnterprise, setLoadingEnterprise] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Store the cropped image blob until save
  const [pendingLogoBlob, setPendingLogoBlob] = useState<Blob | null>(null);
  const [hasNewLogo, setHasNewLogo] = useState(false);

  // Prefill form with enterprise data when modal opens
  React.useEffect(() => {
    if (open && session?.user?.orgId) {
      setLoadingEnterprise(true);
      getEnterpriseByOrgId(session.user.orgId)
        .then((res) => {
          const ent = res.data.data; // Use the nested 'data' property from API response
          console.log("Enterprise data fetched:", ent);
          setValue("enterpriseName", ent.name || "");
          setValue("zipCode", ent.zip_code || "");
          setValue("enterpriseSize", ent.size || "");
          setValue("region", ent.region || "");
          setValue("phoneNumber", ent.contact_number || "");
          setValue("about", ent.description || "");
          setValue("logo", ent.logo_url || "");
          if (ent.logo_url) setLogoPreview(ent.logo_url);
        })
        .catch((err) => {
          // Optionally handle error (e.g., show notification)
          // eslint-disable-next-line no-console
          console.error("Failed to fetch enterprise data", err);
        })
        .finally(() => setLoadingEnterprise(false));
    }
    // Optionally reset form when closed
    if (!open) {
      reset();
      setLogoPreview(null);
      setPendingLogoBlob(null);
      setHasNewLogo(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, session?.user?.orgId]);

  // --- Handle cropped image - Store locally until save ---
  const handleCrop = async (blob: Blob) => {
    try {
      // Store the blob for later upload
      setPendingLogoBlob(blob);
      setHasNewLogo(true);

      // Create a preview URL for display
      const previewUrl = URL.createObjectURL(blob);
      setLogoPreview(previewUrl);

      // Close cropper
      setCropperOpen(false);
      setSelectedImage(null);
    } catch (error) {
      console.error("Error processing cropped image:", error);
      // You might want to show an error message to the user here
    }
  };

  const onSubmit = async (data: EnterpriseSetupData) => {
    let logoUrl = data.logo || "";

    // Upload new logo if one was selected
    if (hasNewLogo && pendingLogoBlob) {
      try {
        const file = blobToFile(pendingLogoBlob, "ent_logo.png", "image/png");
        const response = await uploadEnterpriseFile(
          file,
          session?.user?.orgId || ""
        );
        logoUrl = response.data.data;
      } catch (error) {
        console.error("Error uploading logo:", error);
        // You might want to show an error message and return early here
        return;
      }
    }

    const payload = {
      name: data.enterpriseName,
      description: data.about,
      logo_url: logoUrl,
      size: data.enterpriseSize,
      region: data.region,
      contact_number: data.phoneNumber,
      zip_code: data.zipCode,
    };

    const organizationId = session?.user?.orgId;
    if (!organizationId) {
      console.error("Organization ID not found in session");
      return;
    }

    try {
      await updateEnterprise(organizationId, payload);
      onSave({ ...data, logo: logoUrl });
      // Clear pending logo after successful save
      updateOnboardingProgress("PROFILE_UPDATED");

      setPendingLogoBlob(null);
      setHasNewLogo(false);
    } catch (error) {
      console.error(error);
    }
  };

  const handleClose = () => {
    reset();
    setLogoPreview(null);
    setPendingLogoBlob(null);
    setHasNewLogo(false);
    onClose();
  };

  const [cropperOpen, setCropperOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // --- Drag & Drop Upload UI ---
  const handleLogoDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setSelectedImage(ev.target?.result as string);
        setCropperOpen(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLogoBrowse = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setSelectedImage(ev.target?.result as string);
        setCropperOpen(true);
      };
      reader.readAsDataURL(file);
    }
    e.target.value = ""; // Reset input
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: "8px",
          boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
        },
      }}
    >
      <Box sx={{ position: "absolute", right: 15, top: 15 }}>
        <IconButton onClick={handleClose} size="small">
          <IconX size={20} />
        </IconButton>
      </Box>
      <DialogContent sx={{ pt: 3, pb: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>
          Enterprise setup
        </Typography>
        <Typography variant="body2" sx={{ mb: 3, color: "text.secondary" }}>
          Set up your organization basic information.
        </Typography>

        {loadingEnterprise ? (
          <Box sx={{ px: 1 }}>
            <Skeleton
              variant="rectangular"
              height={48}
              sx={{ mb: 2, borderRadius: 1 }}
            />
            <Skeleton
              variant="rectangular"
              height={48}
              sx={{ mb: 2, borderRadius: 1 }}
            />
            <Skeleton
              variant="rectangular"
              height={48}
              sx={{ mb: 2, borderRadius: 1 }}
            />
            <Skeleton
              variant="rectangular"
              height={48}
              sx={{ mb: 2, borderRadius: 1 }}
            />
            <Skeleton
              variant="rectangular"
              height={48}
              sx={{ mb: 2, borderRadius: 1 }}
            />
            <Skeleton
              variant="rectangular"
              height={96}
              sx={{ mb: 2, borderRadius: 1 }}
            />
          </Box>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12 }}>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    mb: 3,
                    gap: 2,
                  }}
                >
                  <Box
                    sx={{
                      border: "1.5px dashed #d1d5db",
                      borderRadius: 2,
                      width: 80,
                      height: 80,
                      minWidth: 80,
                      minHeight: 80,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      bgcolor: "#f9fafb",
                      cursor: "pointer",
                      transition: "border-color 0.2s",
                      "&:hover": { borderColor: "#6366f1" },
                      position: "relative",
                      overflow: "hidden",
                    }}
                    onDrop={handleLogoDrop}
                    onDragOver={(e) => e.preventDefault()}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {logoPreview ? (
                      <Image
                        width={80}
                        height={80}
                        src={logoPreview}
                        alt="Logo Preview"
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          borderRadius: 8,
                        }}
                        loading="lazy"
                      />
                    ) : (
                      <IconUpload color="#6366f1" size={32} />
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      style={{ display: "none" }}
                      onChange={handleLogoBrowse}
                    />
                  </Box>
                  <Box>
                    <Typography fontSize={15} color="text.secondary">
                      Drag and drop your logo here,
                      <br />
                      or{" "}
                      <span
                        style={{
                          color: "#6366f1",
                          textDecoration: "underline",
                          cursor: "pointer",
                        }}
                        onClick={() => fileInputRef.current?.click()}
                      >
                        click to browse
                      </span>
                    </Typography>
                  </Box>
                </Box>
              </Grid>
              <Grid size={{ xs: 12 }}>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                    Enterprise Name *
                  </Typography>
                  <Controller
                    name="enterpriseName"
                    control={control}
                    rules={{ required: true }}
                    render={({ field }) => (
                      <CustomTextField
                        fullWidth
                        {...field}
                        placeholder="Enter enterprise name"
                        size="small"
                      />
                    )}
                  />
                </Box>
              </Grid>
              <Grid size={{ xs: 12 }}>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                    Zip code *
                  </Typography>
                  <Controller
                    name="zipCode"
                    control={control}
                    rules={{ required: true }}
                    render={({ field }) => (
                      <CustomTextField
                        fullWidth
                        {...field}
                        placeholder="Search zip code"
                        size="small"
                      />
                    )}
                  />
                </Box>
              </Grid>
              <Grid size={{ xs: 6 }}>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                    Enterprise size *
                  </Typography>
                  <Controller
                    name="enterpriseSize"
                    control={control}
                    rules={{ required: true }}
                    render={({ field }) => (
                      <CustomSelect
                        {...field}
                        options={enterpriseSizeOptions}
                        fullWidth
                      />
                    )}
                  />
                </Box>
              </Grid>
              <Grid size={{ xs: 6 }}>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                    Region *
                  </Typography>
                  <Controller
                    name="region"
                    control={control}
                    rules={{ required: true }}
                    render={({ field }) => (
                      <CustomTextField
                        fullWidth
                        {...field}
                        placeholder="North America"
                        size="small"
                      />
                    )}
                  />
                </Box>
              </Grid>
              <Grid size={{ xs: 12 }}>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                    Phone Number *
                  </Typography>
                  <Controller
                    name="phoneNumber"
                    control={control}
                    rules={{ required: true }}
                    render={({ field }) => (
                      <CustomTextField
                        fullWidth
                        {...field}
                        placeholder="Enter phone number"
                        size="small"
                      />
                    )}
                  />
                </Box>
              </Grid>
              <Grid size={{ xs: 12 }}>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                    About *
                  </Typography>
                  <Controller
                    name="about"
                    control={control}
                    rules={{ required: true }}
                    render={({ field }) => (
                      <CustomTextField
                        fullWidth
                        {...field}
                        placeholder="Tell us about your organization..."
                        multiline
                        rows={4}
                      />
                    )}
                  />
                </Box>
              </Grid>
            </Grid>
            <DialogActions
              sx={{
                px: 0,
                pb: 2,
                pt: 3,
                justifyContent: "space-between",
                position: "sticky",
                bottom: "-20px",
                background: "#fff",
              }}
            >
              <Button
                variant="outlined"
                color="inherit"
                onClick={handleClose}
                sx={{ width: "48%" }}
                disabled={isSubmitting || loading}
              >
                Cancel
              </Button>
              <Button
                variant="contained"
                color="primary"
                type="submit"
                disabled={isSubmitting || loading || !isValid}
                sx={{ width: "48%" }}
              >
                {isSubmitting || loading ? "Saving..." : "Save"}
              </Button>
            </DialogActions>
          </form>
        )}
        {cropperOpen && (
          <ImageCropperModal
            open={cropperOpen}
            image={selectedImage || ""}
            onClose={() => setCropperOpen(false)}
            onCrop={handleCrop}
            aspectRatio={1 / 1}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};

export default EnterpriseSetupModal;
