// Compare Service - Mock implementation for comparison functionality
import {
  ComparePatient,
  ComparisonResult,
  FilterState,
  AVAILABLE_DRUGS,
  CompareFilter,
  COMPARISON_FILTERS,
} from "@/utils/compare/compare-config";
import {
  MOCK_PATIENTS,
  generateComparisonResult,
  generateSamplePatients,
} from "@/utils/compare/mock-data";

// Simulate network delay
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Filter patients based on filter state
const applyFilters = (
  patients: ComparePatient[],
  filters: FilterState
): ComparePatient[] => {
  return patients.filter((patient) => {
    // LDH filter
    if (patient.ldh < filters.ldh[0] || patient.ldh > filters.ldh[1]) {
      return false;
    }

    // Age filter
    if (patient.age < filters.age[0] || patient.age > filters.age[1]) {
      return false;
    }

    // ECOG filter
    if (
      filters.ecog.length > 0 &&
      !filters.ecog.includes(String(patient.ecog))
    ) {
      return false;
    }

    // IPI filter
    if (filters.ipi.length > 0) {
      const ipiCategory =
        patient.ipi_score <= 1
          ? "0-1"
          : patient.ipi_score === 2
          ? "2"
          : patient.ipi_score === 3
          ? "3"
          : "4-5";
      if (!filters.ipi.includes(ipiCategory)) {
        return false;
      }
    }

    // Gender filter
    if (
      filters.gender.length > 0 &&
      !filters.gender.includes(patient.gender)
    ) {
      return false;
    }

    // Prior lines filter
    if (
      patient.prior_lines < filters.priorLines[0] ||
      patient.prior_lines > filters.priorLines[1]
    ) {
      return false;
    }

    return true;
  });
};

const compareService = {
  /**
   * Get all available drugs for comparison
   */
  async getDrugs() {
    await delay(200);
    return AVAILABLE_DRUGS;
  },

  /**
   * Get sample patients for a specific drug
   */
  async getSamplePatients(drugId: string): Promise<ComparePatient[]> {
    await delay(500);
    // Generate different patient counts based on drug
    const count = Math.floor(Math.random() * 30) + 20; // 20-50 patients
    return generateSamplePatients(count);
  },

  /**
   * Get available filters for comparison
   */
  async getFilters(): Promise<CompareFilter[]> {
    await delay(100);
    return COMPARISON_FILTERS;
  },

  /**
   * Upload and parse patient CSV file
   */
  async uploadPatientCsv(file: File): Promise<ComparePatient[]> {
    await delay(800);

    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          const lines = text.trim().split("\n");
          const headers = lines[0].split(",").map((h) => h.trim());

          const patients: ComparePatient[] = [];

          for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(",").map((v) => v.trim());
            const patient: any = {};

            headers.forEach((header, index) => {
              const value = values[index];
              // Convert numeric fields
              if (
                [
                  "age",
                  "ecog",
                  "ldh",
                  "ipi_score",
                  "prior_lines",
                  "pfs_months",
                  "os_months",
                ].includes(header)
              ) {
                patient[header] = parseFloat(value) || 0;
              } else {
                patient[header] = value;
              }
            });

            patients.push(patient as ComparePatient);
          }

          resolve(patients);
        } catch (error) {
          reject(new Error("Failed to parse CSV file"));
        }
      };

      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsText(file);
    });
  },

  /**
   * Run comparison between two drugs
   */
  async runComparison(
    comparatorDrugId: string,
    targetDrugId: string,
    patients: ComparePatient[],
    filters: FilterState,
    selectedPatientIds: string[],
    onProgress?: (step: number, total: number, message: string) => void
  ): Promise<ComparisonResult> {
    // Step 1: Filter patients
    onProgress?.(1, 4, "Filtering patient data...");
    await delay(600);

    let filteredPatients = applyFilters(patients, filters);

    // Apply patient ID selection if specified
    if (selectedPatientIds.length > 0) {
      filteredPatients = filteredPatients.filter((p) =>
        selectedPatientIds.includes(p.patient_id)
      );
    }

    // Step 2: Analyze comparator data
    onProgress?.(2, 4, "Analyzing comparator outcomes...");
    await delay(800);

    // Step 3: Analyze target data
    onProgress?.(3, 4, "Analyzing target outcomes...");
    await delay(800);

    // Step 4: Generate comparison results
    onProgress?.(4, 4, "Generating comparison results...");
    await delay(600);

    const comparatorCount = Math.ceil(filteredPatients.length * 0.55);
    const targetCount = filteredPatients.length - comparatorCount;

    return generateComparisonResult(
      comparatorDrugId,
      targetDrugId,
      Math.max(1, comparatorCount),
      Math.max(1, targetCount)
    );
  },

  /**
   * Get summary statistics for filtered patients
   */
  async getPatientSummary(
    patients: ComparePatient[],
    filters: FilterState
  ): Promise<{
    totalPatients: number;
    filteredPatients: number;
    avgAge: number;
    genderDistribution: { male: number; female: number };
    ecogDistribution: Record<string, number>;
  }> {
    await delay(200);

    const filtered = applyFilters(patients, filters);

    const avgAge =
      filtered.reduce((sum, p) => sum + p.age, 0) / filtered.length || 0;

    const genderDistribution = {
      male: filtered.filter((p) => p.gender === "Male").length,
      female: filtered.filter((p) => p.gender === "Female").length,
    };

    const ecogDistribution: Record<string, number> = {};
    filtered.forEach((p) => {
      const key = String(p.ecog);
      ecogDistribution[key] = (ecogDistribution[key] || 0) + 1;
    });

    return {
      totalPatients: patients.length,
      filteredPatients: filtered.length,
      avgAge: Math.round(avgAge * 10) / 10,
      genderDistribution,
      ecogDistribution,
    };
  },

  /**
   * Export comparison results to CSV
   */
  async exportResults(result: ComparisonResult): Promise<string> {
    await delay(300);

    const rows = [
      ["Metric", "Comparator", "Target", "P-Value"],
      [
        "Drug",
        result.comparator.drug,
        result.target.drug,
        "",
      ],
      [
        "Patient Count",
        String(result.comparator.patientCount),
        String(result.target.patientCount),
        "",
      ],
      [
        "ORR (%)",
        String(Math.round(result.comparator.orr * 100)),
        String(Math.round(result.target.orr * 100)),
        String(result.statistics.orrPValue),
      ],
      [
        "CR (%)",
        String(Math.round(result.comparator.cr * 100)),
        String(Math.round(result.target.cr * 100)),
        String(result.statistics.crPValue),
      ],
      [
        "Median PFS (months)",
        String(result.comparator.medianPfs),
        String(result.target.medianPfs),
        String(result.statistics.pfsPValue),
      ],
      [
        "Median OS (months)",
        String(result.comparator.medianOs),
        String(result.target.medianOs),
        String(result.statistics.osPValue),
      ],
    ];

    return rows.map((row) => row.join(",")).join("\n");
  },
};

export default compareService;
