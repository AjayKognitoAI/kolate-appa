// frontend/src/utils/LungCancerTherapySPatientReorder.ts

export type PatientRecord = Record<string, any>;

export class LungCancerTherapySPatientReorder {
  // Desired field order (same as backend preprocessor FIELD_TYPES)
  private static FIELD_ORDER: string[] = [
    "Patient_ID",
    "Age",
    "Gender",
    "Smoking_History",
    "Years_Smoked",
    "Family_History_Cancer",
    "Occupation",
    "Exposure_to_Toxins",
    "Residential_Area",
    "BMI",
    "Chest_Pain_Symptoms",
    "Shortness_of_Breath",
    "Chronic_Cough",
    "Weight_Loss",
    "Physical_Activity_Level",
    "Dietary_Habits",
    "Air_Quality_Index",
    "Leukocytes",
    "Alkaline_Phosphatase",
    "Blood_Urea_Nitrogen",
    "Erythrocytes",
  ];

  static reorder(data: PatientRecord): PatientRecord {
    if (typeof data !== "object" || data === null) {
      throw new Error("Input must be a non-null object");
    }

    const reordered: PatientRecord = {};

    // 1. Add fields in the specified FIELD_ORDER
    this.FIELD_ORDER.forEach((key) => {
      if (key in data) {
        reordered[key] = data[key];
      }
    });

    // 2. Append any extra fields at the end (like metadata, etc.)
    Object.keys(data).forEach((key) => {
      if (!(key in reordered)) {
        reordered[key] = data[key];
      }
    });

    return reordered;
  }
}
