"use client"

import { useState } from "react"
import {
  Box,
  Paper,
  Typography,
  Button,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
} from "@mui/material"
import {
  Edit,
  Delete,
  Add,
  CheckCircle,
  Cancel,
  PlayArrow,
} from "@mui/icons-material"
import type { ScreeningRule } from "@/lib/screening-logic"
import type { ColumnType } from "@/types/cohort.types"

interface ScreeningRuleManagerProps {
  rules: ScreeningRule[]
  onRulesChange: (rules: ScreeningRule[]) => void
  columns: Record<string, ColumnType>
  eligibleCount: number
  totalCount: number
  onApplyRules?: () => void
}

export function ScreeningRuleManager({
  rules,
  onRulesChange,
  columns,
  eligibleCount,
  totalCount,
  onApplyRules,
}: ScreeningRuleManagerProps) {
  const [editingRule, setEditingRule] = useState<ScreeningRule | null>(null)
  const [isAddingNew, setIsAddingNew] = useState(false)
  const [formData, setFormData] = useState<Partial<ScreeningRule>>({
    gate: "Gate 1: Basic Eligibility",
    category: "inclusion",
    operator: "gte",
  })

  const handleEdit = (rule: ScreeningRule) => {
    setEditingRule(rule)
    setFormData(rule)
  }

  const handleDelete = (ruleId: string) => {
    onRulesChange(rules.filter((r) => r.id !== ruleId))
  }

  const handleSave = () => {
    if (!formData.field || !formData.description || formData.value === undefined) {
      alert("Please fill in all required fields")
      return
    }

    const newRule: ScreeningRule = {
      id: editingRule?.id || `rule-${Date.now()}`,
      gate: formData.gate || "Gate 1: Basic Eligibility",
      description: formData.description || "",
      field: formData.field || "",
      operator: formData.operator || "gte",
      value: formData.value,
      category: formData.category || "inclusion",
    }

    if (editingRule) {
      onRulesChange(rules.map((r) => (r.id === editingRule.id ? newRule : r)))
    } else {
      onRulesChange([...rules, newRule])
    }

    setEditingRule(null)
    setIsAddingNew(false)
    setFormData({
      gate: "Gate 1: Basic Eligibility",
      category: "inclusion",
      operator: "gte",
    })
  }

  const handleCancel = () => {
    setEditingRule(null)
    setIsAddingNew(false)
    setFormData({
      gate: "Gate 1: Basic Eligibility",
      category: "inclusion",
      operator: "gte",
    })
  }

  // Group rules by gate
  const groupedRules = rules.reduce(
    (acc, rule) => {
      if (!acc[rule.gate]) acc[rule.gate] = []
      acc[rule.gate].push(rule)
      return acc
    },
    {} as Record<string, ScreeningRule[]>
  )

  const passRate = totalCount > 0 ? ((eligibleCount / totalCount) * 100).toFixed(1) : "0"
  const excludedCount = totalCount - eligibleCount

  return (
    <Box>
      {/* Stats Card */}
      <Paper elevation={0} sx={{ mb: 3, border: "1px solid #ececf1" }}>
        <Box p={2} borderBottom="1px solid #ececf1">
          <Typography variant="h6">Screening Results Preview</Typography>
        </Box>
        <Box p={3}>
          <Grid container spacing={3}>
            <Grid size={{ xs: 3 }}>
              <Box textAlign="center">
                <Typography variant="h4" fontWeight={600}>
                  {totalCount}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Patients
                </Typography>
              </Box>
            </Grid>
            <Grid size={{ xs: 3 }}>
              <Box textAlign="center">
                <Typography variant="h4" fontWeight={600} color="success.main">
                  {eligibleCount}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Eligible
                </Typography>
              </Box>
            </Grid>
            <Grid size={{ xs: 3 }}>
              <Box textAlign="center">
                <Typography variant="h4" fontWeight={600} color="error.main">
                  {excludedCount}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Excluded
                </Typography>
              </Box>
            </Grid>
            <Grid size={{ xs: 3 }}>
              <Box textAlign="center">
                <Typography variant="h4" fontWeight={600} color="primary.main">
                  {passRate}%
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Pass Rate
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Box>
      </Paper>

      {/* Header with Add Rule Button */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6" fontWeight={600}>
          Screening Rules ({rules.length})
        </Typography>
        <Button
          variant="outlined"
          size="small"
          startIcon={<Add />}
          onClick={() => setIsAddingNew(true)}
        >
          Add Rule
        </Button>
      </Box>

      {/* Rules List */}
      {Object.entries(groupedRules).map(([gate, gateRules]) => (
        <Paper key={gate} elevation={0} sx={{ mb: 2, border: "1px solid #ececf1" }}>
          <Box p={2} bgcolor="#fafbfc" borderBottom="1px solid #ececf1">
            <Typography variant="subtitle1" fontWeight={600}>
              {gate}
            </Typography>
          </Box>
          <Box p={2}>
            {gateRules.map((rule) => (
              <Paper
                key={rule.id}
                elevation={0}
                sx={{
                  p: 2,
                  mb: 1,
                  border: "1px solid #ececf1",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  "&:hover": { bgcolor: "#fafbfc" },
                }}
              >
                <Box flex={1}>
                  <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                    <Chip
                      size="small"
                      icon={rule.category === "inclusion" ? <CheckCircle /> : <Cancel />}
                      label={rule.category}
                      color={rule.category === "inclusion" ? "success" : "error"}
                      variant="outlined"
                    />
                    <Typography variant="body2" fontWeight={500}>
                      {rule.description}
                    </Typography>
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    Field: <code style={{ background: "#f3f4f6", padding: "2px 6px", borderRadius: 4 }}>{rule.field}</code>
                    {" → "}
                    {rule.operator} {String(rule.value)}
                  </Typography>
                </Box>
                <Box>
                  <IconButton size="small" onClick={() => handleEdit(rule)}>
                    <Edit fontSize="small" />
                  </IconButton>
                  <IconButton size="small" color="error" onClick={() => handleDelete(rule.id)}>
                    <Delete fontSize="small" />
                  </IconButton>
                </Box>
              </Paper>
            ))}
          </Box>
        </Paper>
      ))}

      {/* Apply Rules Button */}
      {onApplyRules && (
        <Box display="flex" justifyContent="center" mt={4}>
          <Button
            variant="contained"
            size="large"
            startIcon={<PlayArrow />}
            onClick={onApplyRules}
            sx={{ minWidth: 200 }}
          >
            Apply Screening Rules
          </Button>
        </Box>
      )}

      {/* Edit/Add Dialog */}
      <Dialog
        open={editingRule !== null || isAddingNew}
        onClose={handleCancel}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {editingRule ? "Edit Rule" : "Add New Rule"}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" mb={3}>
            {editingRule
              ? "Modify the screening rule below"
              : "Create a new screening rule for patient eligibility"}
          </Typography>

          <Grid container spacing={3}>
            <Grid size={{ xs: 12 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Gate / Category Group</InputLabel>
                <Select
                  value={formData.gate || ""}
                  label="Gate / Category Group"
                  onChange={(e) => setFormData({ ...formData, gate: e.target.value })}
                >
                  <MenuItem value="Gate 1: Basic Eligibility">Gate 1: Basic Eligibility</MenuItem>
                  <MenuItem value="Gate 2: Disease Severity">Gate 2: Disease Severity</MenuItem>
                  <MenuItem value="Gate 3: Treatment History">Gate 3: Treatment History</MenuItem>
                  <MenuItem value="Gate 4: Stability & Compliance">Gate 4: Stability & Compliance</MenuItem>
                  <MenuItem value="Gate 5: Safety Exclusions">Gate 5: Safety Exclusions</MenuItem>
                  <MenuItem value="Gate 6: Laboratory Tests">Gate 6: Laboratory Tests</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                size="small"
                label="Description"
                value={formData.description || ""}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="e.g., Age >= 18 years"
              />
            </Grid>

            <Grid size={{ xs: 6 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Field Name</InputLabel>
                <Select
                  value={formData.field || ""}
                  label="Field Name"
                  onChange={(e) => setFormData({ ...formData, field: e.target.value })}
                >
                  {Object.keys(columns).map((col) => (
                    <MenuItem key={col} value={col}>
                      {col} ({columns[col]})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid size={{ xs: 6 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Rule Type</InputLabel>
                <Select
                  value={formData.category || "inclusion"}
                  label="Rule Type"
                  onChange={(e) =>
                    setFormData({ ...formData, category: e.target.value as "inclusion" | "exclusion" })
                  }
                >
                  <MenuItem value="inclusion">Inclusion (must pass)</MenuItem>
                  <MenuItem value="exclusion">Exclusion (must fail)</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid size={{ xs: 6 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Operator</InputLabel>
                <Select
                  value={formData.operator || "gte"}
                  label="Operator"
                  onChange={(e) => setFormData({ ...formData, operator: e.target.value as any })}
                >
                  <MenuItem value="equals">Equals (=)</MenuItem>
                  <MenuItem value="gte">{"Greater than or equal (>=)"}</MenuItem>
                  <MenuItem value="gt">{"Greater than (>)"}</MenuItem>
                  <MenuItem value="lte">{"Less than or equal (<=)"}</MenuItem>
                  <MenuItem value="lt">{"Less than (<)"}</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid size={{ xs: 6 }}>
              <TextField
                fullWidth
                size="small"
                label="Value"
                value={String(formData.value ?? "")}
                onChange={(e) => {
                  const val = e.target.value
                  let parsedValue: string | number | boolean = val
                  if (val === "true" || val === "false") {
                    parsedValue = val === "true"
                  } else if (!isNaN(Number(val)) && val !== "") {
                    parsedValue = Number(val)
                  }
                  setFormData({ ...formData, value: parsedValue })
                }}
                placeholder="e.g., 18 or true"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancel}>Cancel</Button>
          <Button variant="contained" onClick={handleSave}>
            {editingRule ? "Save Changes" : "Add Rule"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
