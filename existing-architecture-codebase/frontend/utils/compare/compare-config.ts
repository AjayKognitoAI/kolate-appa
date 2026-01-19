// Compare Configuration - Drug definitions, filters, and clinical metrics

export interface Drug {
  id: string;
  name: string;
  shortName: string;
  category: "CAR-T" | "Antibody" | "Chemotherapy" | "Immunotherapy";
  indication: string;
}

export interface CompareFilter {
  id: string;
  label: string;
  type: "range" | "multiselect" | "boolean";
  options?: string[];
  min?: number;
  max?: number;
  unit?: string;
  defaultValue?: any;
}

export interface ClinicalOutcome {
  metric: string;
  comparatorValue: number;
  targetValue: number;
  unit: string;
  pValue?: number;
}

export interface ComparePatient {
  patient_id: string;
  age: number;
  gender: string;
  ecog: number;
  ldh: number;
  ipi_score: number;
  diagnosis: string;
  prior_lines: number;
  best_response: string;
  pfs_months: number;
  os_months: number;
  [key: string]: any;
}

export interface DrugResults {
  drug: string;
  drugId: string;
  patientCount: number;
  orr: number;
  cr: number;
  pr: number;
  sd: number;
  pd: number;
  medianPfs: number;
  medianOs: number;
  medianDor: number;
}

export interface ComparisonResult {
  comparator: DrugResults;
  target: DrugResults;
  statistics: {
    orrPValue: number;
    crPValue: number;
    pfsPValue: number;
    osPValue: number;
  };
  survivalData: {
    comparator: { month: number; pfs: number; os: number }[];
    target: { month: number; pfs: number; os: number }[];
  };
}

export interface FilterState {
  ldh: [number, number];
  age: [number, number];
  ecog: string[];
  ipi: string[];
  gender: string[];
  priorLines: [number, number];
}

// Available drugs for comparison
export const AVAILABLE_DRUGS: Drug[] = [
  {
    id: "cart-axi-cel",
    name: "Axicabtagene ciloleucel (Yescarta)",
    shortName: "Axi-cel",
    category: "CAR-T",
    indication: "DLBCL",
  },
  {
    id: "cart-tisa-cel",
    name: "Tisagenlecleucel (Kymriah)",
    shortName: "Tisa-cel",
    category: "CAR-T",
    indication: "ALL/DLBCL",
  },
  {
    id: "cart-liso-cel",
    name: "Lisocabtagene maraleucel (Breyanzi)",
    shortName: "Liso-cel",
    category: "CAR-T",
    indication: "LBCL",
  },
  {
    id: "cart-ide-cel",
    name: "Idecabtagene vicleucel (Abecma)",
    shortName: "Ide-cel",
    category: "CAR-T",
    indication: "Multiple Myeloma",
  },
  {
    id: "panitumumab",
    name: "Panitumumab (Vectibix)",
    shortName: "Panitumumab",
    category: "Antibody",
    indication: "mCRC",
  },
  {
    id: "cetuximab",
    name: "Cetuximab (Erbitux)",
    shortName: "Cetuximab",
    category: "Antibody",
    indication: "mCRC/HNSCC",
  },
  {
    id: "nivolumab",
    name: "Nivolumab (Opdivo)",
    shortName: "Nivolumab",
    category: "Immunotherapy",
    indication: "Multiple",
  },
  {
    id: "pembrolizumab",
    name: "Pembrolizumab (Keytruda)",
    shortName: "Pembrolizumab",
    category: "Immunotherapy",
    indication: "Multiple",
  },
];

// Comparison filters configuration
export const COMPARISON_FILTERS: CompareFilter[] = [
  {
    id: "ldh",
    label: "LDH Level",
    type: "range",
    min: 0,
    max: 1000,
    unit: "U/L",
    defaultValue: [0, 1000],
  },
  {
    id: "age",
    label: "Age",
    type: "range",
    min: 18,
    max: 90,
    unit: "years",
    defaultValue: [18, 90],
  },
  {
    id: "ecog",
    label: "ECOG Status",
    type: "multiselect",
    options: ["0", "1", "2", "3", "4"],
    defaultValue: [],
  },
  {
    id: "ipi",
    label: "IPI Score",
    type: "multiselect",
    options: ["0-1", "2", "3", "4-5"],
    defaultValue: [],
  },
  {
    id: "gender",
    label: "Gender",
    type: "multiselect",
    options: ["Male", "Female"],
    defaultValue: [],
  },
  {
    id: "priorLines",
    label: "Prior Lines of Therapy",
    type: "range",
    min: 0,
    max: 10,
    unit: "lines",
    defaultValue: [0, 10],
  },
];

// Clinical metrics to display
export const CLINICAL_METRICS = [
  { id: "orr", label: "ORR", fullName: "Overall Response Rate", unit: "%" },
  { id: "cr", label: "CR", fullName: "Complete Response", unit: "%" },
  { id: "pr", label: "PR", fullName: "Partial Response", unit: "%" },
  { id: "sd", label: "SD", fullName: "Stable Disease", unit: "%" },
  { id: "pd", label: "PD", fullName: "Progressive Disease", unit: "%" },
  {
    id: "pfs",
    label: "PFS",
    fullName: "Progression-Free Survival",
    unit: "months",
  },
  { id: "os", label: "OS", fullName: "Overall Survival", unit: "months" },
  { id: "dor", label: "DoR", fullName: "Duration of Response", unit: "months" },
];

// Default filter state
export const DEFAULT_FILTER_STATE: FilterState = {
  ldh: [0, 1000],
  age: [18, 90],
  ecog: [],
  ipi: [],
  gender: [],
  priorLines: [0, 10],
};

// Patient table columns for preview
export const PATIENT_TABLE_COLUMNS = [
  { field: "patient_id", headerName: "Patient ID", width: 120 },
  { field: "age", headerName: "Age", width: 80 },
  { field: "gender", headerName: "Gender", width: 100 },
  { field: "ecog", headerName: "ECOG", width: 80 },
  { field: "ldh", headerName: "LDH", width: 100 },
  { field: "ipi_score", headerName: "IPI Score", width: 100 },
  { field: "diagnosis", headerName: "Diagnosis", width: 150 },
  { field: "prior_lines", headerName: "Prior Lines", width: 100 },
  { field: "best_response", headerName: "Best Response", width: 120 },
];
