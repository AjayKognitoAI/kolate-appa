// Mock data for the Compare feature
import {
  ComparePatient,
  ComparisonResult,
  DrugResults,
  AVAILABLE_DRUGS,
} from "./compare-config";

// Generate random patient data
const generatePatient = (id: number): ComparePatient => {
  const genders = ["Male", "Female"];
  const diagnoses = ["DLBCL", "FL", "MCL", "CLL", "PMBCL", "BL"];
  const responses = ["CR", "PR", "SD", "PD"];

  const age = Math.floor(Math.random() * 50) + 30; // 30-80
  const ecog = Math.floor(Math.random() * 3); // 0-2
  const ldh = Math.floor(Math.random() * 600) + 150; // 150-750
  const ipi = Math.floor(Math.random() * 5); // 0-4

  return {
    patient_id: `PT${String(id).padStart(4, "0")}`,
    age,
    gender: genders[Math.floor(Math.random() * genders.length)],
    ecog,
    ldh,
    ipi_score: ipi,
    diagnosis: diagnoses[Math.floor(Math.random() * diagnoses.length)],
    prior_lines: Math.floor(Math.random() * 5) + 1,
    best_response: responses[Math.floor(Math.random() * responses.length)],
    pfs_months: Math.round((Math.random() * 24 + 3) * 10) / 10,
    os_months: Math.round((Math.random() * 36 + 6) * 10) / 10,
  };
};

// Generate sample patients
export const generateSamplePatients = (count: number): ComparePatient[] => {
  return Array.from({ length: count }, (_, i) => generatePatient(i + 1));
};

// Pre-generated mock patient dataset
export const MOCK_PATIENTS: ComparePatient[] = generateSamplePatients(50);

// Generate survival curve data points
const generateSurvivalCurve = (
  months: number,
  initialRate: number,
  decayRate: number
) => {
  const data: { month: number; pfs: number; os: number }[] = [];
  let pfsRate = 100;
  let osRate = 100;

  for (let m = 0; m <= months; m += 3) {
    pfsRate = Math.max(
      0,
      100 * Math.exp(-decayRate * m * (1 + Math.random() * 0.1))
    );
    osRate = Math.max(
      0,
      100 * Math.exp(-decayRate * 0.6 * m * (1 + Math.random() * 0.1))
    );
    data.push({
      month: m,
      pfs: Math.round(pfsRate * 10) / 10,
      os: Math.round(osRate * 10) / 10,
    });
  }
  return data;
};

// Generate drug results based on drug type
const generateDrugResults = (
  drugId: string,
  patientCount: number
): DrugResults => {
  const drug = AVAILABLE_DRUGS.find((d) => d.id === drugId);

  // Different baseline outcomes based on drug category
  let baseOrr = 0.7;
  let baseCr = 0.4;
  let basePfs = 10;
  let baseOs = 20;

  if (drug?.category === "CAR-T") {
    baseOrr = 0.75 + Math.random() * 0.15;
    baseCr = 0.45 + Math.random() * 0.15;
    basePfs = 10 + Math.random() * 8;
    baseOs = 20 + Math.random() * 10;
  } else if (drug?.category === "Immunotherapy") {
    baseOrr = 0.5 + Math.random() * 0.2;
    baseCr = 0.2 + Math.random() * 0.15;
    basePfs = 6 + Math.random() * 6;
    baseOs = 15 + Math.random() * 10;
  } else if (drug?.category === "Antibody") {
    baseOrr = 0.4 + Math.random() * 0.2;
    baseCr = 0.15 + Math.random() * 0.1;
    basePfs = 5 + Math.random() * 5;
    baseOs = 12 + Math.random() * 8;
  }

  const orr = Math.round(baseOrr * 100) / 100;
  const cr = Math.round(baseCr * 100) / 100;
  const pr = Math.round((orr - cr) * 100) / 100;
  const sd = Math.round((1 - orr) * 0.4 * 100) / 100;
  const pd = Math.round((1 - orr - sd) * 100) / 100;

  return {
    drug: drug?.name || drugId,
    drugId,
    patientCount,
    orr,
    cr,
    pr,
    sd: Math.max(0, sd),
    pd: Math.max(0, pd),
    medianPfs: Math.round(basePfs * 10) / 10,
    medianOs: Math.round(baseOs * 10) / 10,
    medianDor: Math.round((basePfs * 0.8 + Math.random() * 4) * 10) / 10,
  };
};

// Generate mock comparison result
export const generateComparisonResult = (
  comparatorDrugId: string,
  targetDrugId: string,
  comparatorPatientCount: number,
  targetPatientCount: number
): ComparisonResult => {
  const comparator = generateDrugResults(comparatorDrugId, comparatorPatientCount);
  const target = generateDrugResults(targetDrugId, targetPatientCount);

  // Generate p-values (lower when there's a bigger difference)
  const orrDiff = Math.abs(comparator.orr - target.orr);
  const crDiff = Math.abs(comparator.cr - target.cr);
  const pfsDiff = Math.abs(comparator.medianPfs - target.medianPfs);
  const osDiff = Math.abs(comparator.medianOs - target.medianOs);

  return {
    comparator,
    target,
    statistics: {
      orrPValue: Math.round((0.5 - orrDiff * 2 + Math.random() * 0.3) * 1000) / 1000,
      crPValue: Math.round((0.5 - crDiff * 2 + Math.random() * 0.3) * 1000) / 1000,
      pfsPValue: Math.round((0.5 - pfsDiff * 0.03 + Math.random() * 0.3) * 1000) / 1000,
      osPValue: Math.round((0.5 - osDiff * 0.02 + Math.random() * 0.3) * 1000) / 1000,
    },
    survivalData: {
      comparator: generateSurvivalCurve(36, 100, 0.05 + Math.random() * 0.03),
      target: generateSurvivalCurve(36, 100, 0.06 + Math.random() * 0.04),
    },
  };
};

// Response rate data for bar charts
export const generateResponseRateData = (result: ComparisonResult) => {
  return [
    {
      metric: "ORR",
      comparator: Math.round(result.comparator.orr * 100),
      target: Math.round(result.target.orr * 100),
    },
    {
      metric: "CR",
      comparator: Math.round(result.comparator.cr * 100),
      target: Math.round(result.target.cr * 100),
    },
    {
      metric: "PR",
      comparator: Math.round(result.comparator.pr * 100),
      target: Math.round(result.target.pr * 100),
    },
    {
      metric: "SD",
      comparator: Math.round(result.comparator.sd * 100),
      target: Math.round(result.target.sd * 100),
    },
    {
      metric: "PD",
      comparator: Math.round(result.comparator.pd * 100),
      target: Math.round(result.target.pd * 100),
    },
  ];
};

// Survival data formatted for Recharts
export const formatSurvivalData = (result: ComparisonResult) => {
  const comparatorData = result.survivalData.comparator;
  const targetData = result.survivalData.target;

  // Merge data points
  const merged: {
    month: number;
    comparatorPfs: number;
    comparatorOs: number;
    targetPfs: number;
    targetOs: number;
  }[] = [];

  const allMonths = new Set([
    ...comparatorData.map((d) => d.month),
    ...targetData.map((d) => d.month),
  ]);

  Array.from(allMonths)
    .sort((a, b) => a - b)
    .forEach((month) => {
      const compPoint = comparatorData.find((d) => d.month === month);
      const targetPoint = targetData.find((d) => d.month === month);

      merged.push({
        month,
        comparatorPfs: compPoint?.pfs ?? 0,
        comparatorOs: compPoint?.os ?? 0,
        targetPfs: targetPoint?.pfs ?? 0,
        targetOs: targetPoint?.os ?? 0,
      });
    });

  return merged;
};

// CSV template for patient upload
export const PATIENT_CSV_TEMPLATE = `patient_id,age,gender,ecog,ldh,ipi_score,diagnosis,prior_lines,best_response,pfs_months,os_months
PT0001,58,Male,1,245,2,DLBCL,2,CR,18.5,24.3
PT0002,64,Female,0,312,3,FL,3,PR,12.1,20.8
PT0003,52,Male,1,189,1,MCL,1,CR,22.4,30.1`;
