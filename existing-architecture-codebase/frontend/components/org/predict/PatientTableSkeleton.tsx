import { Box, Skeleton } from "@mui/material";

export const PatientTableSkeleton = () => (
  <Box sx={{ mt: 3 }}>
    <Box
      display="flex"
      justifyContent="space-between"
      alignItems="center"
      mb={2}
    >
      <Skeleton variant="text" width={300} height={32} />
      <Skeleton
        variant="rectangular"
        width={180}
        height={36}
        sx={{ borderRadius: 1 }}
      />
    </Box>
    <Box
      sx={{
        border: "1px solid #e6e7ea",
        borderRadius: 1,
        backgroundColor: "#fff",
        p: 2,
      }}
    >
      <Box
        display="flex"
        gap={2}
        mb={2}
        pb={1}
        borderBottom="1px solid #e6e7ea"
      >
        {[240, 200, 140, 120, 70, 120, 110, 100, 120, 100, 120].map(
          (width, i) => (
            <Skeleton key={i} variant="text" width={width} height={24} />
          )
        )}
      </Box>
      {[...Array(5)].map((_, i) => (
        <Box key={i} display="flex" gap={2} mb={2} alignItems="center">
          <Box display="flex" alignItems="center" gap={1} width={240}>
            <Skeleton variant="circular" width={30} height={30} />
            <Box>
              <Skeleton variant="text" width={120} height={20} />
              <Skeleton variant="text" width={80} height={16} />
            </Box>
          </Box>
          {[200, 140, 120, 70, 120, 110, 100, 120, 100].map((width, j) => (
            <Skeleton key={j} variant="text" width={width} height={20} />
          ))}
          <Skeleton
            variant="circular"
            width={24}
            height={24}
            sx={{ ml: "auto" }}
          />
        </Box>
      ))}
    </Box>
  </Box>
);
