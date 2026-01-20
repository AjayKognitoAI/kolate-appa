"use client";
import React from "react";
import { Card, CardContent, Typography, Grid, Box } from "@mui/material";
import Image from "next/image";
import Link from "next/link";
import { getModuleList } from "@/store/slices/moduleAccessSlice";
import { useAppSelector } from "@/store";

const PredictionModels: React.FC = () => {
  const models = useAppSelector(getModuleList);

  const predictionModels = models.find((model) => model?.slug == "predict");

  return (
    <Grid container spacing={3}>
      {predictionModels?.trials.map((trial, idx) => (
        <Grid size={{ xs: 12, md: 6 }} key={idx}>
          <Link href={"/predict/" + trial.slug}>
            <Card
              variant="outlined"
              sx={{
                display: "flex",
                alignItems: "center",
                p: 2,
                boxShadow: "none",
                borderRadius: 1,
                cursor: "pointer",
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
                }}
              >
                <Image
                  width={20}
                  height={20}
                  src={trial?.icon_url ?? ""}
                  alt=""
                  style={{ objectFit: "contain" }}
                />
              </Box>

              <CardContent sx={{ flex: 1, p: "0 !important" }}>
                <Typography variant="h6" mb={1}>
                  {trial?.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {trial?.description}
                </Typography>
              </CardContent>
            </Card>
          </Link>
        </Grid>
      ))}
    </Grid>
  );
};

export default PredictionModels;
