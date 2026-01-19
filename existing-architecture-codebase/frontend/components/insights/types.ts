export interface Characteristic {
  id: string;
  name: string;
  value: number;
  min: number;
  max: number;
  unit?: string;
  description?: string;
  isUserDefined?: boolean;
}

export interface ChartDataPoint {
  name: string;
  value: number;
  [key: string]: string | number;
}

export interface LineChartDataPoint {
  month: number;
  responders: number;
  nonResponders: number;
  predicted?: number;
}

export interface PieChartDataPoint {
  name: string;
  value: number;
  color: string;
}

export interface BarChartDataPoint {
  category: string;
  responders: number;
  nonResponders: number;
}

export interface InsightsState {
  characteristics: Characteristic[];
  selectedView: string;
  isAnimating: boolean;
}

export const DEFAULT_CHARACTERISTICS: Characteristic[] = [
  {
    id: "age",
    name: "Age",
    value: 55,
    min: 18,
    max: 90,
    unit: "years",
    description: "Patient age in years",
  },
  {
    id: "biomarker_expression",
    name: "Biomarker Expression",
    value: 65,
    min: 0,
    max: 100,
    unit: "%",
    description: "PD-L1 expression level",
  },
  {
    id: "tumor_burden",
    name: "Tumor Burden",
    value: 40,
    min: 0,
    max: 100,
    unit: "%",
    description: "Estimated tumor burden percentage",
  },
  {
    id: "prior_treatments",
    name: "Prior Treatments",
    value: 2,
    min: 0,
    max: 6,
    unit: "lines",
    description: "Number of prior treatment lines",
  },
  {
    id: "performance_status",
    name: "Performance Status",
    value: 1,
    min: 0,
    max: 4,
    unit: "ECOG",
    description: "ECOG performance status score",
  },
  {
    id: "mutation_count",
    name: "Mutation Count",
    value: 12,
    min: 0,
    max: 50,
    unit: "mut/Mb",
    description: "Tumor mutational burden",
  },
];

export const CHART_COLORS = {
  primary: "#1d4fd7",
  primaryLight: "#4c75e7",
  primaryDark: "#102c79",
  secondary: "#7c9aed",
  success: "#07c690",
  successLight: "#27f7bc",
  warning: "#d97218",
  warningLight: "#eb974d",
  error: "#e34444",
  purple: "#6b2bda",
  purpleLight: "#8d5ce2",
  indigo: "#5146ce",
  indigoLight: "#7a71d9",
  gray: "#5b6b86",
  grayLight: "#8292aa",
};

export const PIE_CHART_COLORS = [
  CHART_COLORS.primary,
  CHART_COLORS.success,
  CHART_COLORS.warning,
  CHART_COLORS.purple,
  CHART_COLORS.indigo,
  CHART_COLORS.error,
];
