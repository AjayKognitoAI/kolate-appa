export type PatientData = Record<string, string | number>

export interface ScreeningRule {
  id: string
  gate: string
  description: string
  field: string
  operator: "gte" | "lte" | "equals" | "gt" | "lt"
  value: string | number | boolean
  category: "inclusion" | "exclusion"
}

export const DEFAULT_SCREENING_RULES: ScreeningRule[] = [
  {
    id: "1.1",
    gate: "Gate 1: Basic Eligibility",
    description: "Age ≥ 18 years",
    field: "age",
    operator: "gte",
    value: 18,
    category: "inclusion",
  },
  {
    id: "1.2",
    gate: "Gate 1: Basic Eligibility",
    description: "Disease onset ≥ 1 year",
    field: "ad_duration_years",
    operator: "gte",
    value: 1,
    category: "inclusion",
  },
  {
    id: "2.1",
    gate: "Gate 2: Disease Severity",
    description: "EASI score ≥ 16",
    field: "EASI_score",
    operator: "gte",
    value: 16,
    category: "inclusion",
  },
  {
    id: "2.2",
    gate: "Gate 2: Disease Severity",
    description: "vIGA-AD score ≥ 3",
    field: "vIGA_AD",
    operator: "gte",
    value: 3,
    category: "inclusion",
  },
  {
    id: "2.3",
    gate: "Gate 2: Disease Severity",
    description: "BSA ≥ 10%",
    field: "BSA_percent",
    operator: "gte",
    value: 10,
    category: "inclusion",
  },
  {
    id: "2.4",
    gate: "Gate 2: Disease Severity",
    description: "Peak Pruritus NRS ≥ 4",
    field: "PP_NRS",
    operator: "gte",
    value: 4,
    category: "inclusion",
  },
  {
    id: "3.1",
    gate: "Gate 3: Treatment History",
    description: "Prior treatment failure documented",
    field: "prior_topical_failure",
    operator: "equals",
    value: "Yes",
    category: "inclusion",
  },
  {
    id: "5.1",
    gate: "Gate 5: Safety Exclusions",
    description: "No active skin infection",
    field: "active_skin_infection",
    operator: "equals",
    value: "No",
    category: "inclusion",
  },
  {
    id: "5.3",
    gate: "Gate 5: Safety Exclusions",
    description: "No recent biologics",
    field: "recent_biologic_use",
    operator: "equals",
    value: "No",
    category: "inclusion",
  },
  {
    id: "5.4",
    gate: "Gate 5: Safety Exclusions",
    description: "Not pregnant or breastfeeding",
    field: "pregnant_or_breastfeeding",
    operator: "equals",
    value: "No",
    category: "inclusion",
  },
]

export function evaluateRule(
  patientData: PatientData,
  rule: ScreeningRule
): { passed: boolean; available: boolean; reason?: string } {
  const fieldValue = patientData[rule.field]

  if (fieldValue === undefined || fieldValue === null) {
    return {
      passed: false,
      available: false,
      reason: `Field '${rule.field}' not in data`,
    }
  }

  let passed = false
  let reason: string | undefined

  const numValue = Number(fieldValue)
  // Check for truthy values (field value might be string or number)
  const boolValue =
    fieldValue === "true" ||
    fieldValue === "yes" ||
    fieldValue === "Yes" ||
    fieldValue === 1 ||
    fieldValue === "1" ||
    String(fieldValue).toLowerCase() === "true"

  switch (rule.operator) {
    case "gte":
      passed = numValue >= Number(rule.value)
      if (!passed) reason = `${numValue} < ${rule.value}`
      break
    case "gt":
      passed = numValue > Number(rule.value)
      if (!passed) reason = `${numValue} ≤ ${rule.value}`
      break
    case "lte":
      passed = numValue <= Number(rule.value)
      if (!passed) reason = `${numValue} > ${rule.value}`
      break
    case "lt":
      passed = numValue < Number(rule.value)
      if (!passed) reason = `${numValue} ≥ ${rule.value}`
      break
    case "equals":
      if (typeof rule.value === "boolean") {
        passed = boolValue === rule.value
        if (!passed) reason = `Expected ${rule.value}, got ${fieldValue}`
      } else {
        passed = String(fieldValue).toLowerCase() === String(rule.value).toLowerCase()
        if (!passed) reason = `Expected ${rule.value}, got ${fieldValue}`
      }
      break
  }

  return { passed, available: true, reason }
}

export function applyScreeningRules(
  data: PatientData[],
  rules: ScreeningRule[]
): PatientData[] {
  if (rules.length === 0) return data

  return data.filter((patient) => {
    return rules.every((rule) => {
      const result = evaluateRule(patient, rule)
      if (!result.available) return false
      return result.passed
    })
  })
}

export function getScreeningStats(
  data: PatientData[],
  rules: ScreeningRule[]
): {
  total: number
  eligible: number
  excluded: number
  passRate: number
} {
  const total = data.length
  const eligible = applyScreeningRules(data, rules).length
  const excluded = total - eligible
  const passRate = total > 0 ? (eligible / total) * 100 : 0

  return { total, eligible, excluded, passRate }
}
