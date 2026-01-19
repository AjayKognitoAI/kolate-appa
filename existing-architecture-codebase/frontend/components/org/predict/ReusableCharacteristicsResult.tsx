import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
  Box,
  Typography,
  Paper,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Stack,
  SelectChangeEvent,
  IconButton,
  Popover,
  Skeleton,
  Alert,
  Button,
} from "@mui/material";
import CharacteristicChartOptions from "./shared/CharacteristicChartOptions";
import ReactApexChart from "react-apexcharts";
import { ApexOptions } from "apexcharts";
import TuneIcon from "@mui/icons-material/Tune";
import { Settings } from "@mui/icons-material";
import { CharacteristicsConfig } from "@/utils/predict/predict-trials.config";

interface ChartStats {
  total_data_points?: number;
  complete_response_rate?: number;
  partial_response_rate?: number;
}

// Chart color constants
const CR_COLOR = "#3B4FE8";
const PR_COLOR = "#FF8200";

// Heights
const defaultChartHeight = 360;

type Metric = "CR" | "PR";

type ChartOption = {
  chartType: "bar" | "stacked100" | "line" | "area";
  showLabels: boolean;
  sortBy: "label" | "CR" | "PR";
};

type ChartEntry = {
  label: string;
  CR: number;
  PR: number;
};

type ChartDef = {
  id: string;
  title: string;
  subtitle?: string;
  data: ChartEntry[];
};

const defaultOptions: ChartOption = {
  chartType: "bar",
  showLabels: true,
  sortBy: "label",
};

// Beautiful and distinct color schemes for charts
const COLOR_SCHEMES = {
  default: [CR_COLOR, PR_COLOR],
  ocean: ["#1E3A8A", "#3B82F6", "#06B6D4", "#0891B2"],
  sunset: ["#DC2626", "#F97316", "#EAB308", "#84CC16"],
  forest: ["#166534", "#16A34A", "#65A30D", "#CA8A04"],
  berry: ["#7C2D12", "#DC2626", "#C2410C", "#EA580C"],
};

// Bar Chart Component
const BarChart = ({
  data,
  options,
  colorScheme,
  stacked = false,
}: {
  data: ChartEntry[];
  options: ChartOption;
  colorScheme: string;
  stacked?: boolean;
}) => {
  const chartData = useMemo(() => {
    const sorted = [...data];
    if (options.sortBy === "CR")
      sorted.sort((a, b) => (b.CR ?? 0) - (a.CR ?? 0));
    else if (options.sortBy === "PR")
      sorted.sort((a, b) => (b.PR ?? 0) - (a.PR ?? 0));

    return {
      series: [
        {
          name: "Complete Response (CR)",
          data: sorted.map((d) => d.CR ?? 0),
        },
        {
          name: "Partial Response (PR)",
          data: sorted.map((d) => d.PR ?? 0),
        },
      ],
      categories: sorted.map((d) => d.label),
    };
  }, [data, options.sortBy]);

  const chartOptions: ApexOptions = {
    ...getBaseChartOptions(options.showLabels),
    chart: {
      ...getBaseChartOptions(options.showLabels).chart,
      type: "bar",
      height: defaultChartHeight,
      stacked: stacked,
    },
    colors:
      COLOR_SCHEMES[colorScheme as keyof typeof COLOR_SCHEMES] ||
      COLOR_SCHEMES.default,
    xaxis: {
      categories: chartData.categories,
      labels: {
        style: {
          colors: "#666666",
          fontSize: "12px",
        },
      },
    },
    yaxis: {
      title: {
        text: "Percentage (%)",
        style: {
          color: "#333333",
          fontSize: "12px",
        },
      },
      labels: {
        formatter: (val: number) => `${val}%`,
        style: {
          colors: "#666666",
          fontSize: "12px",
        },
      },
    },
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: "60%",
        borderRadius: 4,
      },
    },
  };

  return (
    <Box
      sx={{
        backgroundColor: "transparent",
        borderRadius: 1,
        p: 1,
      }}
    >
      <ReactApexChart
        options={chartOptions}
        series={chartData.series}
        type="bar"
        height={defaultChartHeight}
      />
    </Box>
  );
};

// Stacked 100% Chart
const Stacked100Chart = ({
  data,
  options,
  colorScheme,
}: {
  data: ChartEntry[];
  options: ChartOption;
  colorScheme: string;
}) => {
  const normalizedData = useMemo(() => {
    return data.map((d) => {
      const cr = Number(d.CR ?? 0);
      const pr = Number(d.PR ?? 0);
      const total = cr + pr || 1;
      return {
        ...d,
        CR: Number(((cr / total) * 100).toFixed(2)),
        PR: Number(((pr / total) * 100).toFixed(2)),
      };
    });
  }, [data]);

  return (
    <BarChart
      data={normalizedData}
      options={options}
      colorScheme={colorScheme}
      stacked={true}
    />
  );
};

// Get base chart options
const getBaseChartOptions = (
  showLabels: boolean,
  chartType: string = ""
): ApexOptions => {
  const isAreaOrLine = chartType === "area" || chartType === "line";

  return {
    chart: {
      background: "transparent",
      foreColor: "#333333",
      fontFamily:
        '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      toolbar: {
        show: false,
      },
      animations: {
        enabled: true,
        speed: 800,
      },
    },
    grid: {
      borderColor: "#e2e8f0",
      strokeDashArray: 0,
      xaxis: {
        lines: {
          show: false,
        },
      },
      yaxis: {
        lines: {
          show: true,
        },
      },
    },
    dataLabels: {
      enabled: showLabels,
      style: {
        colors: isAreaOrLine ? ["#333333"] : ["#ffffff"],
        fontSize: "12px",
        fontWeight: 500,
      },
      formatter: (val: number) => `${val}%`,
      ...(isAreaOrLine && showLabels
        ? {
            background: {
              enabled: true,
              foreColor: "#ffffff",
              borderRadius: 4,
              borderWidth: 1,
              borderColor: "#cccccc",
              opacity: 0.9,
              dropShadow: {
                enabled: false,
              },
            },
          }
        : {}),
    },
    tooltip: {
      theme: "light",
      style: {
        fontSize: "12px",
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      },
    },
    legend: {
      labels: {
        colors: "#333333",
      },
    },
  };
};

// Line Chart Component
const LineChart = ({
  data,
  options,
  colorScheme,
  area = false,
}: {
  data: ChartEntry[];
  options: ChartOption;
  colorScheme: string;
  area?: boolean;
}) => {
  const chartData = useMemo(() => {
    const sorted = [...data];
    if (options.sortBy === "CR")
      sorted.sort((a, b) => (b.CR ?? 0) - (a.CR ?? 0));
    else if (options.sortBy === "PR")
      sorted.sort((a, b) => (b.PR ?? 0) - (a.PR ?? 0));

    return {
      series: [
        {
          name: "Complete Response (CR)",
          data: sorted.map((d) => d.CR ?? 0),
        },
        {
          name: "Partial Response (PR)",
          data: sorted.map((d) => d.PR ?? 0),
        },
      ],
      categories: sorted.map((d) => d.label),
    };
  }, [data, options.sortBy]);

  const chartType = area ? "area" : "line";
  const chartOptions: ApexOptions = {
    ...getBaseChartOptions(options.showLabels, chartType),
    chart: {
      ...getBaseChartOptions(options.showLabels, chartType).chart,
      type: chartType as "area" | "line",
      height: defaultChartHeight,
    },
    colors:
      COLOR_SCHEMES[colorScheme as keyof typeof COLOR_SCHEMES] ||
      COLOR_SCHEMES.default,
    stroke: {
      curve: "smooth",
      width: area ? 0 : 3,
    },
    fill: {
      type: area ? "gradient" : "solid",
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.7,
        opacityTo: 0.1,
        stops: [0, 90, 100],
      },
    },
    xaxis: {
      categories: chartData.categories,
      labels: {
        style: {
          colors: "#666666",
          fontSize: "12px",
        },
      },
    },
    yaxis: {
      title: {
        text: "Percentage (%)",
        style: {
          color: "#333333",
          fontSize: "12px",
        },
      },
      labels: {
        formatter: (val: number) => `${val}%`,
        style: {
          colors: "#666666",
          fontSize: "12px",
        },
      },
    },
    markers: {
      size: 6,
      hover: {
        size: 8,
      },
    },
  };

  return (
    <Box
      sx={{
        backgroundColor: "transparent",
        borderRadius: 1,
        p: 1,
      }}
    >
      <ReactApexChart
        options={chartOptions}
        series={chartData.series}
        type={chartType as "area" | "line"}
        height={defaultChartHeight}
      />
    </Box>
  );
};

// Transform API response
function transformApiToChartDefs(
  apiObj: any,
  chartKeyMap: Record<string, { id: string; title: string; subtitle?: string }>
): ChartDef[] {
  if (!apiObj || typeof apiObj !== "object") return [];

  const defs: ChartDef[] = [];

  Object.entries(apiObj).forEach(([rawKey, val]) => {
    const arr = Array.isArray(val) ? val : [];
    const data: ChartEntry[] = arr.map((it: any) => {
      const label =
        it.label ?? it.Label ?? String(it[Object.keys(it)[0]] ?? "");
      const CR = Number(it.CR ?? it.cr ?? 0);
      const PR = Number(it["PR+NR"] ?? it.PR ?? it.pr ?? 0);
      return { label, CR, PR };
    });

    const known = chartKeyMap[rawKey];
    if (known)
      defs.push({
        id: known.id,
        title: known.title,
        subtitle: known.subtitle,
        data,
      });
    else {
      const id = rawKey
        .toLowerCase()
        .replace(/\s+/g, "_")
        .replace(/[^\w_]/g, "");
      defs.push({ id, title: rawKey, subtitle: "", data });
    }
  });

  return defs;
}

// Chart Options Popover Component
const ChartOptionsPopover = ({
  anchorEl,
  open,
  onClose,
  chartId,
  options,
  onOptionChange,
}: {
  anchorEl: HTMLElement | null;
  open: boolean;
  onClose: () => void;
  chartId: string;
  options: ChartOption;
  onOptionChange: (chartId: string, partial: Partial<ChartOption>) => void;
}) => {
  return (
    <Popover
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      disableScrollLock={false}
      anchorOrigin={{
        vertical: "bottom",
        horizontal: "left",
      }}
      transformOrigin={{
        vertical: "top",
        horizontal: "left",
      }}
      PaperProps={{
        sx: {
          p: 2,
          borderRadius: 2,
          boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
          minWidth: 280,
          maxHeight: "80vh",
          overflowY: "auto",
        },
      }}
    >
      <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
        Chart Options
      </Typography>

      <Stack spacing={2}>
        <FormControl size="small" fullWidth>
          <InputLabel>Chart Type</InputLabel>
          <Select
            value={options.chartType}
            label="Chart Type"
            onChange={(e: SelectChangeEvent) =>
              onOptionChange(chartId, {
                chartType: e.target.value as ChartOption["chartType"],
              })
            }
          >
            <MenuItem value="bar">Bar Chart</MenuItem>
            <MenuItem value="stacked100">Stacked Bar</MenuItem>
            <MenuItem value="line">Line Chart</MenuItem>
            <MenuItem value="area">Area Chart</MenuItem>
          </Select>
        </FormControl>

        <FormControl size="small" fullWidth>
          <InputLabel>Sort By</InputLabel>
          <Select
            value={options.sortBy}
            label="Sort By"
            onChange={(e: SelectChangeEvent) =>
              onOptionChange(chartId, {
                sortBy: e.target.value as ChartOption["sortBy"],
              })
            }
          >
            <MenuItem value="label">Label (Default)</MenuItem>
            <MenuItem value="CR">CR (Descending)</MenuItem>
            <MenuItem value="PR">PR (Descending)</MenuItem>
          </Select>
        </FormControl>

        <FormControlLabel
          control={
            <Switch
              size="small"
              checked={options.showLabels}
              onChange={(_, checked) =>
                onOptionChange(chartId, {
                  showLabels: checked,
                })
              }
            />
          }
          label="Show Values on Chart"
        />
      </Stack>
    </Popover>
  );
};

// Main Component
interface ReusableCharacteristicsResultProps {
  config: CharacteristicsConfig;
}

const ReusableCharacteristicsResult: React.FC<
  ReusableCharacteristicsResultProps
> = ({ config }) => {
  const [chartsDef, setChartsDef] = useState<ChartDef[]>([]);
  const [chartsLoading, setChartsLoading] = useState(true);
  const [stats, setStats] = useState<ChartStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);
  const [optionsMap, setOptionsMap] = useState<Record<string, ChartOption>>({});
  const [popoverAnchor, setPopoverAnchor] = useState<{
    [chartId: string]: HTMLElement | null;
  }>({});

  const [selectedChartTypes, setSelectedChartTypes] = useState<string[]>([]);
  const [globalColorScheme, setGlobalColorScheme] = useState<string>("default");
  const [isChartOptionsOpen, setIsChartOptionsOpen] = useState(false);

  // Fetch chart data
  const fetchCharts = useCallback(
    async (chartTypes?: string) => {
      let canceled = false;
      try {
        setChartsLoading(true);
        setError(null);
        const res = await config.getCharacteristicCharts(chartTypes);
        const defs = transformApiToChartDefs(res?.data?.data, config.chartKeyMap);

        if (defs.length === 0) {
          throw new Error("No valid chart data received from API");
        }

        if (!canceled) {
          setChartsDef(defs);
        }
      } catch (err) {
        if (!canceled) {
          const errorMsg =
            err instanceof Error ? err.message : "Failed to load chart data";
          setError(errorMsg);
          console.error("Failed to fetch /charts:", err);
        }
      } finally {
        if (!canceled) setChartsLoading(false);
      }
      return () => {
        canceled = true;
      };
    },
    [config]
  );

  // Fetch stats data
  useEffect(() => {
    if (!config.getChartStats) {
      setStatsLoading(false);
      return;
    }

    let canceled = false;
    const fetchStats = async () => {
      try {
        setStatsLoading(true);
        const response = await config.getChartStats!();
        if (!canceled && response?.data?.data) {
          setStats(response?.data?.data);
        }
      } catch (err) {
        if (!canceled) {
          console.error("Failed to fetch /charts/stats:", err);
        }
      } finally {
        if (!canceled) setStatsLoading(false);
      }
    };

    fetchStats();
    return () => {
      canceled = true;
    };
  }, [config]);

  // Initial fetch of chart data
  useEffect(() => {
    fetchCharts();
  }, [fetchCharts]);

  // Initialize options map
  useEffect(() => {
    setOptionsMap((prev) => {
      const next = { ...prev };
      chartsDef.forEach((c) => {
        if (!next[c.id]) next[c.id] = { ...defaultOptions };
      });
      return next;
    });
  }, [chartsDef]);

  const handleOptionChange = (
    chartId: string,
    partial: Partial<ChartOption>
  ) => {
    setOptionsMap((prev) => ({
      ...prev,
      [chartId]: { ...prev[chartId], ...partial },
    }));
  };

  const handlePopoverOpen = (
    chartId: string,
    event: React.MouseEvent<HTMLElement>
  ) => {
    setPopoverAnchor((prev) => ({
      ...prev,
      [chartId]: event.currentTarget,
    }));
  };

  const handlePopoverClose = (chartId: string) => {
    setPopoverAnchor((prev) => ({
      ...prev,
      [chartId]: null,
    }));
  };

  return (
    <Box>
      {/* Statistics Section */}
      {statsLoading ? (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          {[1, 2, 3].map((item) => (
            <Grid component={Grid} size={{ xs: 12, sm: 4 }} key={item}>
              <Paper sx={{ p: 3 }}>
                <Skeleton variant="text" width="60%" height={24} sx={{ mb: 1 }} />
                <Skeleton variant="text" width="40%" height={32} />
              </Paper>
            </Grid>
          ))}
        </Grid>
      ) : stats ? (
        <Paper
          variant="outlined"
          sx={{
            borderRadius: 1,
            p: 1,
            mb: 3,
            boxShadow: "none",
            background: "#fff",
          }}
        >
          <Grid container spacing={3}>
            {[
              {
                label: "Total Data Points",
                value: stats?.total_data_points ?? 0,
              },
              {
                label: "Complete Response Rate",
                value: (stats?.complete_response_rate || 0)?.toString() + "%",
              },
              {
                label: "Partial Response Rate",
                value: (stats?.partial_response_rate || 0)?.toString() + "%",
              },
            ].map((s, i) => (
              <Grid component={Grid} size={{ xs: 12, sm: 3 }} key={i}>
                <Box sx={{ p: 2.5 }}>
                  <Typography
                    fontWeight={700}
                    variant="h3"
                    color="var(--primary-700)"
                  >
                    {s.value}
                  </Typography>
                  <Typography
                    color="text.secondary"
                    fontWeight={500}
                    variant="body2"
                  >
                    {s.label}
                  </Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Paper>
      ) : null}

      {chartsLoading ? (
        <Box>
          <Grid container spacing={3}>
            {Array.from({ length: 4 }).map((_, i) => (
              <Grid component={Grid} size={{ xs: 12, sm: 6 }} key={i}>
                <Paper sx={{ borderRadius: 1, p: 3, background: "#fff" }}>
                  <Skeleton variant="text" width="60%" height={24} />
                  <Skeleton
                    variant="text"
                    width="80%"
                    height={16}
                    sx={{ mb: 2 }}
                  />
                  <Skeleton variant="rectangular" height={350} />
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Box>
      ) : error ? (
        <Box>
          <Alert severity="error" sx={{ mb: 3 }}>
            <Typography variant="h6">Failed to Load Chart Data</Typography>
            <Typography>{error}</Typography>
            <Typography variant="body2" sx={{ mt: 1 }}>
              Please check your API connection and try refreshing the page.
            </Typography>
          </Alert>
        </Box>
      ) : chartsDef?.length == 0 ? (
        <Box>
          <Alert severity="info" sx={{ mb: 3 }}>
            <Typography variant="h6">No Chart Data Available</Typography>
            <Typography>No chart data was returned from the API.</Typography>
          </Alert>
        </Box>
      ) : (
        <>
          <Stack
            direction="row"
            justifyContent="end"
            alignItems="center"
            spacing={2}
            mb={2}
          >
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
              spacing={2}
            >
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel>Color Scheme</InputLabel>
                <Select
                  value={globalColorScheme}
                  label="Color Scheme"
                  onChange={(e: SelectChangeEvent) =>
                    setGlobalColorScheme(e.target.value)
                  }
                  MenuProps={{ disableScrollLock: true }}
                >
                  <MenuItem value="default">Default</MenuItem>
                  <MenuItem value="ocean">Ocean Blue</MenuItem>
                  <MenuItem value="sunset">Sunset</MenuItem>
                  <MenuItem value="forest">Forest Green</MenuItem>
                  <MenuItem value="berry">Berry Purple</MenuItem>
                </Select>
              </FormControl>
              <Button
                variant="outlined"
                startIcon={<Settings />}
                onClick={() => setIsChartOptionsOpen(true)}
              >
                Configure
              </Button>
            </Stack>
          </Stack>
          {/* Charts */}
          <Grid container spacing={3}>
            {chartsDef.map((chartDef, index) => {
              const opts = optionsMap[chartDef.id] ?? defaultOptions;
              const isPopoverOpen = Boolean(popoverAnchor[chartDef.id]);

              return (
                <Grid component={Grid} size={{ xs: 12, sm: 6 }} key={index}>
                  <Paper
                    variant="outlined"
                    sx={{
                      borderRadius: 1,
                      p: 3,
                      mb: 0,
                      background: "#fff",
                    }}
                  >
                    <Box
                      display="flex"
                      justifyContent="space-between"
                      alignItems="flex-start"
                      mb={2}
                    >
                      <Box sx={{ flex: 1 }}>
                        <Typography fontWeight={600} fontSize={17}>
                          {chartDef.title}
                        </Typography>
                        <Typography
                          color="text.secondary"
                          fontSize={15}
                          fontWeight={400}
                        >
                          {chartDef.subtitle}
                        </Typography>
                      </Box>

                      <IconButton
                        size="small"
                        onClick={(e) => handlePopoverOpen(chartDef.id, e)}
                        sx={{
                          bgcolor: isPopoverOpen ? "primary.main" : "grey.100",
                          color: isPopoverOpen ? "white" : "grey.700",
                          "&:hover": {
                            bgcolor: isPopoverOpen
                              ? "primary.dark"
                              : "grey.200",
                          },
                          transition: "all 0.2s ease-in-out",
                          boxShadow: isPopoverOpen
                            ? "0 2px 8px rgba(0,0,0,0.15)"
                            : "none",
                        }}
                      >
                        <TuneIcon fontSize="small" />
                      </IconButton>
                    </Box>

                    <ChartOptionsPopover
                      anchorEl={popoverAnchor[chartDef.id]}
                      open={isPopoverOpen}
                      onClose={() => handlePopoverClose(chartDef.id)}
                      chartId={chartDef.id}
                      options={opts}
                      onOptionChange={handleOptionChange}
                    />

                    {/* Chart Renderers */}
                    {opts.chartType === "bar" && (
                      <BarChart
                        data={chartDef.data}
                        options={opts}
                        colorScheme={globalColorScheme}
                        stacked={false}
                      />
                    )}
                    {opts.chartType === "stacked100" && (
                      <Stacked100Chart
                        data={chartDef.data}
                        options={opts}
                        colorScheme={globalColorScheme}
                      />
                    )}
                    {opts.chartType === "line" && (
                      <LineChart
                        data={chartDef.data}
                        options={opts}
                        colorScheme={globalColorScheme}
                        area={false}
                      />
                    )}
                    {opts.chartType === "area" && (
                      <LineChart
                        data={chartDef.data}
                        options={opts}
                        colorScheme={globalColorScheme}
                        area={true}
                      />
                    )}
                  </Paper>
                </Grid>
              );
            })}
          </Grid>
        </>
      )}

      <CharacteristicChartOptions
        selectedChartTypes={selectedChartTypes}
        onApply={(types) => {
          setSelectedChartTypes(types);
          if (types.length > 0) {
            fetchCharts(types.join(","));
          } else {
            fetchCharts();
          }
          setIsChartOptionsOpen(false);
        }}
        onClose={() => setIsChartOptionsOpen(false)}
        open={isChartOptionsOpen}
        getChartTypes={config.getChartTypes}
      />
    </Box>
  );
};

export default ReusableCharacteristicsResult;
