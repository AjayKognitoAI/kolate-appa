"use client";

import React, { useState, useCallback, useMemo, useEffect } from "react";
import {
  Box,
  Grid,
  Typography,
  Paper,
  Tabs,
  Tab,
  Chip,
  Stack,
  Fade,
  Skeleton,
} from "@mui/material";
import {
  IconChartDots,
  IconChartBar,
  IconChartPie,
  IconAdjustments,
} from "@tabler/icons-react";
import {
  AnimatedLineChart,
  AnimatedBarChart,
  AnimatedPieChart,
} from "./charts";
import CharacteristicsPanel from "./CharacteristicsPanel";
import AddFeatureDialog from "./AddFeatureDialog";
import PredictDropdown from "@/app/(private)/(layout)/admin/data-pipeline/components/DropdownPredictList";
import {
  Characteristic,
  DEFAULT_CHARACTERISTICS,
  LineChartDataPoint,
  BarChartDataPoint,
  PieChartDataPoint,
  CHART_COLORS,
  PIE_CHART_COLORS,
} from "./types";

// Utility function to generate chart data based on characteristics
const generateLineChartData = (
  characteristics: Characteristic[]
): LineChartDataPoint[] => {
  const baseResponderRate = calculateBaseResponderRate(characteristics);
  const data: LineChartDataPoint[] = [];

  for (let month = 0; month <= 24; month += 2) {
    const decay = Math.exp(-month * 0.03);
    const noise = (Math.random() - 0.5) * 5;
    const responders = Math.max(
      0,
      Math.min(100, baseResponderRate * decay + noise)
    );
    const nonResponders = Math.max(
      0,
      Math.min(100, (100 - baseResponderRate) * decay * 0.8 + noise)
    );
    const predicted = Math.max(
      0,
      Math.min(100, (baseResponderRate - 5) * decay)
    );

    data.push({
      month,
      responders: Number(responders.toFixed(1)),
      nonResponders: Number(nonResponders.toFixed(1)),
      predicted: Number(predicted.toFixed(1)),
    });
  }

  return data;
};

const generateBarChartData = (
  characteristics: Characteristic[]
): BarChartDataPoint[] => {
  const baseRate = calculateBaseResponderRate(characteristics);

  const categories = [
    { name: "Age 18-40", modifier: 1.15 },
    { name: "Age 41-60", modifier: 1.0 },
    { name: "Age 61-75", modifier: 0.85 },
    { name: "Age 76+", modifier: 0.7 },
    { name: "Low Burden", modifier: 1.2 },
    { name: "High Burden", modifier: 0.75 },
  ];

  return categories.map((cat) => ({
    category: cat.name,
    responders: Math.min(100, Math.max(0, baseRate * cat.modifier + (Math.random() - 0.5) * 10)),
    nonResponders: Math.min(100, Math.max(0, (100 - baseRate) * (2 - cat.modifier) + (Math.random() - 0.5) * 10)),
  }));
};

const generatePieChartData = (
  characteristics: Characteristic[]
): PieChartDataPoint[] => {
  const baseRate = calculateBaseResponderRate(characteristics);

  const completResponse = baseRate * 0.35;
  const partialResponse = baseRate * 0.45;
  const stableDisease = baseRate * 0.15;
  const progressiveDisease = 100 - completResponse - partialResponse - stableDisease;

  return [
    {
      name: "Complete Response",
      value: Number(completResponse.toFixed(1)),
      color: CHART_COLORS.success,
    },
    {
      name: "Partial Response",
      value: Number(partialResponse.toFixed(1)),
      color: CHART_COLORS.primary,
    },
    {
      name: "Stable Disease",
      value: Number(stableDisease.toFixed(1)),
      color: CHART_COLORS.warning,
    },
    {
      name: "Progressive Disease",
      value: Number(progressiveDisease.toFixed(1)),
      color: CHART_COLORS.error,
    },
  ];
};

const calculateBaseResponderRate = (characteristics: Characteristic[]): number => {
  let rate = 50; // Base rate

  characteristics.forEach((char) => {
    const normalizedValue = (char.value - char.min) / (char.max - char.min);

    switch (char.id) {
      case "age":
        // Younger patients tend to respond better
        rate += (0.5 - normalizedValue) * 15;
        break;
      case "biomarker_expression":
        // Higher expression = better response
        rate += normalizedValue * 20;
        break;
      case "tumor_burden":
        // Lower burden = better response
        rate += (1 - normalizedValue) * 15;
        break;
      case "prior_treatments":
        // Fewer prior treatments = better response
        rate += (1 - normalizedValue) * 10;
        break;
      case "performance_status":
        // Better performance status = better response
        rate += (1 - normalizedValue) * 12;
        break;
      case "mutation_count":
        // Higher mutation count = better immunotherapy response
        rate += normalizedValue * 8;
        break;
      default:
        // Custom features have a moderate impact
        rate += (normalizedValue - 0.5) * 5;
    }
  });

  return Math.max(10, Math.min(90, rate));
};

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => (
  <div role="tabpanel" hidden={value !== index}>
    {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
  </div>
);

const InsightsDashboard: React.FC = () => {
  const [characteristics, setCharacteristics] = useState<Characteristic[]>(
    DEFAULT_CHARACTERISTICS
  );
  const [activeTab, setActiveTab] = useState(0);
  const [addFeatureOpen, setAddFeatureOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [panelExpanded, setPanelExpanded] = useState(true);
  const [selectedTrial, setSelectedTrial] = useState<{ category: string; model: string } | null>(null);

  // Simulate initial loading
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  // Generate chart data based on characteristics
  const lineChartData = useMemo(
    () => generateLineChartData(characteristics),
    [characteristics]
  );

  const barChartData = useMemo(
    () => generateBarChartData(characteristics),
    [characteristics]
  );

  const pieChartData = useMemo(
    () => generatePieChartData(characteristics),
    [characteristics]
  );

  const responderRate = useMemo(
    () => calculateBaseResponderRate(characteristics),
    [characteristics]
  );

  // Handlers
  const handleCharacteristicChange = useCallback((id: string, value: number) => {
    setCharacteristics((prev) =>
      prev.map((char) => (char.id === id ? { ...char, value } : char))
    );
  }, []);

  const handleRemoveCharacteristic = useCallback((id: string) => {
    setCharacteristics((prev) => prev.filter((char) => char.id !== id));
  }, []);

  const handleAddCharacteristic = useCallback((newChar: Characteristic) => {
    setCharacteristics((prev) => [...prev, newChar]);
  }, []);

  const handleTabChange = useCallback((_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  }, []);

  const handleTrialChange = useCallback((category: string, model: string) => {
    setSelectedTrial({ category, model });
  }, []);

  // Summary cards data
  const summaryCards = useMemo(
    () => [
      {
        label: "Predicted Response Rate",
        value: `${responderRate.toFixed(1)}%`,
        color: CHART_COLORS.primary,
        bgColor: "var(--primary-50)",
      },
      {
        label: "Complete Response",
        value: `${(responderRate * 0.35).toFixed(1)}%`,
        color: CHART_COLORS.success,
        bgColor: "var(--green-50)",
      },
      {
        label: "Partial Response",
        value: `${(responderRate * 0.45).toFixed(1)}%`,
        color: CHART_COLORS.warning,
        bgColor: "var(--orange-50)",
      },
      {
        label: "Active Features",
        value: characteristics.length.toString(),
        color: CHART_COLORS.purple,
        bgColor: "var(--purple-50)",
      },
    ],
    [responderRate, characteristics.length]
  );

  if (isLoading) {
    return (
      <Box>
        <Box sx={{ maxWidth: 400, mb: 3 }}>
          <Skeleton variant="rounded" height={70} />
        </Box>
        <Grid container spacing={3}>
          {[1, 2, 3, 4].map((i) => (
            <Grid size={{ xs: 12, sm: 6, md: 3 }} key={i}>
              <Skeleton variant="rounded" height={100} />
            </Grid>
          ))}
          <Grid size={{ xs: 12, md: 8 }}>
            <Skeleton variant="rounded" height={400} />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <Skeleton variant="rounded" height={400} />
          </Grid>
        </Grid>
      </Box>
    );
  }

  return (
    <Fade in timeout={500}>
      <Box>
        {/* Trial Selection Dropdown */}
        <Box sx={{ maxWidth: 400, mb: 3 }}>
          <PredictDropdown onChange={handleTrialChange} />
        </Box>

        {/* Header with View Selector */}
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          mb={3}
        >
          <Box>
            <Stack direction="row" alignItems="center" spacing={1} mb={0.5}>
              <Chip
                label="Key Characteristics"
                size="small"
                sx={{
                  bgcolor: "var(--primary-100)",
                  color: "var(--primary-700)",
                  fontWeight: 600,
                }}
              />
              <Typography variant="caption" color="text.secondary">
                Model-identified responder characteristics
              </Typography>
            </Stack>
          </Box>
        </Box>

        {/* Summary Cards */}
        <Grid container spacing={2} mb={3}>
          {summaryCards.map((card, index) => (
            <Grid size={{ xs: 12, sm: 6, md: 3 }} key={index}>
              <Paper
                variant="outlined"
                sx={{
                  p: 2.5,
                  borderRadius: 2,
                  border: "1px solid var(--gray-200)",
                  bgcolor: card.bgColor,
                  transition: "all 0.2s ease",
                  "&:hover": {
                    transform: "translateY(-2px)",
                    boxShadow: "var(--shadow-md)",
                  },
                }}
              >
                <Typography
                  variant="caption"
                  color="text.secondary"
                  fontWeight={500}
                >
                  {card.label}
                </Typography>
                <Typography
                  variant="h4"
                  fontWeight={700}
                  sx={{ color: card.color, mt: 0.5 }}
                >
                  {card.value}
                </Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>

        {/* Main Content */}
        <Grid container spacing={3}>
          {/* Charts Section */}
          <Grid size={{ xs: 12, lg: 8 }}>
            <Paper
              variant="outlined"
              sx={{
                borderRadius: 2,
                border: "1px solid var(--gray-200)",
                overflow: "hidden",
              }}
            >
              <Box
                sx={{
                  borderBottom: "1px solid var(--gray-200)",
                  bgcolor: "var(--gray-50)",
                }}
              >
                <Tabs
                  value={activeTab}
                  onChange={handleTabChange}
                  sx={{
                    px: 2,
                    "& .MuiTab-root": {
                      minHeight: 56,
                      textTransform: "none",
                      fontWeight: 500,
                      color: "var(--gray-600)",
                      "&.Mui-selected": {
                        color: "var(--primary-700)",
                      },
                    },
                    "& .MuiTabs-indicator": {
                      bgcolor: "var(--primary-600)",
                      height: 3,
                      borderRadius: "3px 3px 0 0",
                    },
                  }}
                >
                  <Tab
                    icon={<IconChartDots size={18} />}
                    iconPosition="start"
                    label="Survival Trends"
                  />
                  <Tab
                    icon={<IconChartBar size={18} />}
                    iconPosition="start"
                    label="Response by Group"
                  />
                  <Tab
                    icon={<IconChartPie size={18} />}
                    iconPosition="start"
                    label="Response Distribution"
                  />
                </Tabs>
              </Box>

              <Box sx={{ p: 2.5 }}>
                <TabPanel value={activeTab} index={0}>
                  <AnimatedLineChart
                    data={lineChartData}
                    title="Survival Probability Over Time"
                    subtitle="Predicted response curves based on current characteristics"
                    height={350}
                  />
                </TabPanel>

                <TabPanel value={activeTab} index={1}>
                  <AnimatedBarChart
                    data={barChartData}
                    title="Response Rate by Patient Group"
                    subtitle="Comparative analysis across demographic segments"
                    height={350}
                  />
                </TabPanel>

                <TabPanel value={activeTab} index={2}>
                  <AnimatedPieChart
                    data={pieChartData}
                    title="Overall Response Distribution"
                    subtitle="Breakdown of predicted treatment outcomes"
                    height={350}
                    innerRadius={70}
                    outerRadius={120}
                  />
                </TabPanel>
              </Box>
            </Paper>

            {/* Secondary Charts Row */}
            <Grid container spacing={3} mt={0}>
              <Grid size={{ xs: 12, md: 6 }}>
                <AnimatedBarChart
                  data={barChartData.slice(0, 4)}
                  title="Age Group Analysis"
                  subtitle="Response rates by age cohort"
                  height={280}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <AnimatedPieChart
                  data={[
                    { name: "Biomarker+", value: responderRate * 0.6, color: CHART_COLORS.success },
                    { name: "Biomarker-", value: responderRate * 0.4, color: CHART_COLORS.warning },
                    { name: "Unknown", value: 100 - responderRate, color: CHART_COLORS.gray },
                  ]}
                  title="Biomarker Status"
                  subtitle="Response by biomarker expression"
                  height={280}
                  innerRadius={50}
                  outerRadius={90}
                  showLabels={false}
                />
              </Grid>
            </Grid>
          </Grid>

          {/* Characteristics Panel */}
          <Grid size={{ xs: 12, lg: 4 }}>
            <CharacteristicsPanel
              characteristics={characteristics}
              onCharacteristicChange={handleCharacteristicChange}
              onRemoveCharacteristic={handleRemoveCharacteristic}
              onAddFeatureClick={() => setAddFeatureOpen(true)}
              expanded={panelExpanded}
              onExpandToggle={() => setPanelExpanded((prev) => !prev)}
            />

            {/* Insights Summary */}
            <Paper
              variant="outlined"
              sx={{
                mt: 3,
                p: 2.5,
                borderRadius: 2,
                border: "1px solid var(--gray-200)",
              }}
            >
              <Stack direction="row" alignItems="center" spacing={1} mb={2}>
                <IconAdjustments size={20} style={{ color: "var(--primary-600)" }} />
                <Typography variant="subtitle1" fontWeight={600}>
                  Analysis Summary
                </Typography>
              </Stack>
              <Stack spacing={1.5}>
                <Box
                  sx={{
                    p: 1.5,
                    borderRadius: 1,
                    bgcolor: "var(--green-50)",
                    border: "1px solid var(--green-200)",
                  }}
                >
                  <Typography variant="caption" color="var(--green-700)" fontWeight={500}>
                    Favorable Factors
                  </Typography>
                  <Typography variant="body2" color="var(--green-800)" mt={0.5}>
                    {characteristics
                      .filter((c) => {
                        const norm = (c.value - c.min) / (c.max - c.min);
                        return (c.id === "biomarker_expression" && norm > 0.6) ||
                          (c.id === "mutation_count" && norm > 0.5) ||
                          (c.id === "age" && norm < 0.4);
                      })
                      .map((c) => c.name)
                      .join(", ") || "None identified"}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    p: 1.5,
                    borderRadius: 1,
                    bgcolor: "var(--orange-50)",
                    border: "1px solid var(--orange-200)",
                  }}
                >
                  <Typography variant="caption" color="var(--orange-700)" fontWeight={500}>
                    Risk Factors
                  </Typography>
                  <Typography variant="body2" color="var(--orange-800)" mt={0.5}>
                    {characteristics
                      .filter((c) => {
                        const norm = (c.value - c.min) / (c.max - c.min);
                        return (c.id === "tumor_burden" && norm > 0.6) ||
                          (c.id === "prior_treatments" && norm > 0.5) ||
                          (c.id === "performance_status" && norm > 0.5);
                      })
                      .map((c) => c.name)
                      .join(", ") || "None identified"}
                  </Typography>
                </Box>
              </Stack>
            </Paper>
          </Grid>
        </Grid>

        {/* Add Feature Dialog */}
        <AddFeatureDialog
          open={addFeatureOpen}
          onClose={() => setAddFeatureOpen(false)}
          onAdd={handleAddCharacteristic}
          existingIds={characteristics.map((c) => c.id)}
        />
      </Box>
    </Fade>
  );
};

export default InsightsDashboard;
