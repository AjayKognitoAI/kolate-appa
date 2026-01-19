-- =============================================================================
-- Patient Screening Module - Seed Data
-- =============================================================================
-- Sample data for development and testing
-- Run this after patient-screening-database.sql
-- =============================================================================

-- Replace these UUIDs with actual values from your system
-- These are placeholder UUIDs for demonstration
DO $$
DECLARE
    v_enterprise_id UUID := 'e0000000-0000-0000-0000-000000000001';
    v_user_id_1 UUID := 'u0000000-0000-0000-0000-000000000001';
    v_user_id_2 UUID := 'u0000000-0000-0000-0000-000000000002';
    v_master_data_1 UUID;
    v_master_data_2 UUID;
    v_master_data_3 UUID;
    v_filter_1 UUID;
    v_filter_2 UUID;
    v_filter_3 UUID;
    v_filter_4 UUID;
    v_filter_5 UUID;
    v_cohort_1 UUID;
    v_cohort_2 UUID;
    v_cohort_3 UUID;
    v_cohort_4 UUID;
    v_cohort_5 UUID;
BEGIN

-- =============================================================================
-- Master Data Records
-- =============================================================================

-- Master Data 1: Atopic Dermatitis Clinical Trial Data
INSERT INTO patient_screening_master_data (
    id, s3_bucket, s3_key, file_name, file_type, file_size, row_count,
    columns, content_type, enterprise_id, created_by
) VALUES (
    uuid_generate_v4(),
    'kolate-patient-screening',
    'master-data/' || uuid_generate_v4() || '/atopic_dermatitis_patients.csv',
    'atopic_dermatitis_patients.csv',
    'csv',
    2457600,  -- ~2.4 MB
    12500,
    '{
        "patient_id": "string",
        "age": "number",
        "gender": "categorical",
        "ad_duration_years": "number",
        "EASI_score": "number",
        "vIGA_AD": "number",
        "BSA_percent": "number",
        "PP_NRS": "number",
        "prior_topical_failure": "categorical",
        "active_skin_infection": "categorical",
        "recent_biologic_use": "categorical",
        "pregnant_or_breastfeeding": "categorical",
        "comorbidities": "string",
        "enrollment_site": "categorical",
        "screening_date": "string"
    }'::jsonb,
    'text/csv',
    v_enterprise_id,
    v_user_id_1
) RETURNING id INTO v_master_data_1;

-- Master Data 2: Lung Cancer Screening Data
INSERT INTO patient_screening_master_data (
    id, s3_bucket, s3_key, file_name, file_type, file_size, row_count,
    columns, content_type, enterprise_id, created_by
) VALUES (
    uuid_generate_v4(),
    'kolate-patient-screening',
    'master-data/' || uuid_generate_v4() || '/lung_cancer_screening.xlsx',
    'lung_cancer_screening.xlsx',
    'xlsx',
    5242880,  -- ~5 MB
    8750,
    '{
        "patient_id": "string",
        "age": "number",
        "gender": "categorical",
        "smoking_status": "categorical",
        "pack_years": "number",
        "tumor_stage": "categorical",
        "histology": "categorical",
        "ECOG_score": "number",
        "egfr_mutation": "categorical",
        "alk_rearrangement": "categorical",
        "pd_l1_expression": "number",
        "prior_treatment_lines": "number",
        "brain_metastases": "categorical",
        "enrollment_center": "categorical"
    }'::jsonb,
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    v_enterprise_id,
    v_user_id_1
) RETURNING id INTO v_master_data_2;

-- Master Data 3: CAR-T Cell Therapy Candidates
INSERT INTO patient_screening_master_data (
    id, s3_bucket, s3_key, file_name, file_type, file_size, row_count,
    columns, content_type, enterprise_id, created_by
) VALUES (
    uuid_generate_v4(),
    'kolate-patient-screening',
    'master-data/' || uuid_generate_v4() || '/car_t_candidates.json',
    'car_t_candidates.json',
    'json',
    1048576,  -- ~1 MB
    3200,
    '{
        "patient_id": "string",
        "age": "number",
        "gender": "categorical",
        "diagnosis": "categorical",
        "disease_status": "categorical",
        "prior_lines_of_therapy": "number",
        "cd19_expression": "categorical",
        "lymphocyte_count": "number",
        "organ_function_status": "categorical",
        "active_infection": "categorical",
        "cns_involvement": "categorical",
        "performance_status": "number",
        "bridging_therapy": "categorical"
    }'::jsonb,
    'application/json',
    v_enterprise_id,
    v_user_id_2
) RETURNING id INTO v_master_data_3;

-- =============================================================================
-- Saved Filters (Reusable Templates)
-- =============================================================================

-- Filter 1: Adult Patients (18+) - Template
INSERT INTO patient_screening_filters (
    id, name, description, filter, is_template,
    enterprise_id, created_by
) VALUES (
    uuid_generate_v4(),
    'Adult Patients (18+)',
    'Basic age filter for adult patients 18 years and older',
    '{
        "id": "group-adult",
        "name": "Adult Age Filter",
        "logic": "AND",
        "negate": false,
        "rules": [
            {
                "id": "rule-age-adult",
                "field": "age",
                "operator": "gte",
                "value": 18
            }
        ]
    }'::jsonb,
    true,
    v_enterprise_id,
    v_user_id_1
) RETURNING id INTO v_filter_1;

-- Filter 2: AD Phase III Eligibility Criteria
INSERT INTO patient_screening_filters (
    id, name, description, filter, is_template,
    enterprise_id, created_by
) VALUES (
    uuid_generate_v4(),
    'AD Phase III Eligibility',
    'Complete eligibility criteria for Atopic Dermatitis Phase III clinical trials including disease severity and safety exclusions',
    '{
        "id": "group-main",
        "name": "Full Eligibility Criteria",
        "logic": "AND",
        "negate": false,
        "rules": [
            {
                "id": "rule-age",
                "field": "age",
                "operator": "gte",
                "value": 18
            },
            {
                "id": "rule-duration",
                "field": "ad_duration_years",
                "operator": "gte",
                "value": 1
            },
            {
                "id": "rule-easi",
                "field": "EASI_score",
                "operator": "gte",
                "value": 16
            },
            {
                "id": "rule-viga",
                "field": "vIGA_AD",
                "operator": "gte",
                "value": 3
            },
            {
                "id": "rule-bsa",
                "field": "BSA_percent",
                "operator": "gte",
                "value": 10
            },
            {
                "id": "rule-pruritus",
                "field": "PP_NRS",
                "operator": "gte",
                "value": 4
            },
            {
                "id": "rule-topical",
                "field": "prior_topical_failure",
                "operator": "equals",
                "value": "Yes"
            },
            {
                "id": "group-safety",
                "name": "Safety Exclusions",
                "logic": "AND",
                "rules": [
                    {
                        "id": "rule-infection",
                        "field": "active_skin_infection",
                        "operator": "equals",
                        "value": "No"
                    },
                    {
                        "id": "rule-biologic",
                        "field": "recent_biologic_use",
                        "operator": "equals",
                        "value": "No"
                    },
                    {
                        "id": "rule-pregnant",
                        "field": "pregnant_or_breastfeeding",
                        "operator": "equals",
                        "value": "No"
                    }
                ]
            }
        ]
    }'::jsonb,
    false,
    v_enterprise_id,
    v_user_id_1
) RETURNING id INTO v_filter_2;

-- Filter 3: Moderate-Severe Disease Severity - Template
INSERT INTO patient_screening_filters (
    id, name, description, filter, is_template,
    enterprise_id, created_by
) VALUES (
    uuid_generate_v4(),
    'Moderate-Severe Disease',
    'Template for moderate to severe disease severity criteria based on common scoring systems',
    '{
        "id": "group-severity",
        "name": "Severity Criteria",
        "logic": "AND",
        "negate": false,
        "rules": [
            {
                "id": "rule-easi-high",
                "field": "EASI_score",
                "operator": "gte",
                "value": 21
            },
            {
                "id": "rule-bsa-high",
                "field": "BSA_percent",
                "operator": "gte",
                "value": 25
            },
            {
                "id": "rule-viga-severe",
                "field": "vIGA_AD",
                "operator": "gte",
                "value": 4
            }
        ]
    }'::jsonb,
    true,
    v_enterprise_id,
    v_user_id_1
) RETURNING id INTO v_filter_3;

-- Filter 4: EGFR+ TKI Eligibility
INSERT INTO patient_screening_filters (
    id, name, description, filter, is_template,
    enterprise_id, created_by
) VALUES (
    uuid_generate_v4(),
    'EGFR+ TKI Eligibility',
    'Eligibility criteria for EGFR-mutated NSCLC patients for tyrosine kinase inhibitor therapy',
    '{
        "id": "group-egfr",
        "name": "EGFR+ Eligibility",
        "logic": "AND",
        "negate": false,
        "rules": [
            {
                "id": "rule-egfr-pos",
                "field": "egfr_mutation",
                "operator": "equals",
                "value": "Positive"
            },
            {
                "id": "rule-histology",
                "field": "histology",
                "operator": "equals",
                "value": "Adenocarcinoma"
            },
            {
                "id": "rule-ecog",
                "field": "ECOG_score",
                "operator": "lte",
                "value": 2
            },
            {
                "id": "group-stage",
                "name": "Advanced Stage",
                "logic": "OR",
                "rules": [
                    {
                        "id": "rule-stage-3b",
                        "field": "tumor_stage",
                        "operator": "equals",
                        "value": "IIIB"
                    },
                    {
                        "id": "rule-stage-4",
                        "field": "tumor_stage",
                        "operator": "equals",
                        "value": "IV"
                    }
                ]
            }
        ]
    }'::jsonb,
    false,
    v_enterprise_id,
    v_user_id_2
) RETURNING id INTO v_filter_4;

-- Filter 5: Immunotherapy High PD-L1 - Template
INSERT INTO patient_screening_filters (
    id, name, description, filter, is_template,
    enterprise_id, created_by
) VALUES (
    uuid_generate_v4(),
    'High PD-L1 Immunotherapy',
    'Template for immunotherapy eligibility based on high PD-L1 expression and absence of targetable mutations',
    '{
        "id": "group-io",
        "name": "Immunotherapy Criteria",
        "logic": "AND",
        "negate": false,
        "rules": [
            {
                "id": "rule-pdl1",
                "field": "pd_l1_expression",
                "operator": "gte",
                "value": 50
            },
            {
                "id": "rule-egfr-neg",
                "field": "egfr_mutation",
                "operator": "equals",
                "value": "Negative"
            },
            {
                "id": "rule-alk-neg",
                "field": "alk_rearrangement",
                "operator": "equals",
                "value": "Negative"
            },
            {
                "id": "rule-ecog-io",
                "field": "ECOG_score",
                "operator": "lte",
                "value": 1
            }
        ]
    }'::jsonb,
    true,
    v_enterprise_id,
    v_user_id_2
) RETURNING id INTO v_filter_5;

-- =============================================================================
-- Cohort Records (Using Saved Filters)
-- =============================================================================

-- Cohort 1: AD Phase III - Using saved filter
INSERT INTO patient_screening_cohorts (
    id, name, description, master_data_id, columns, filter_id, filter,
    filtered_patient_ids, patient_count, enterprise_id, created_by
) VALUES (
    uuid_generate_v4(),
    'AD Phase III - Full Eligibility',
    'Patients meeting all Phase III clinical trial eligibility criteria for atopic dermatitis treatment',
    v_master_data_1,
    '{
        "patient_id": "string",
        "age": "number",
        "gender": "categorical",
        "ad_duration_years": "number",
        "EASI_score": "number",
        "vIGA_AD": "number",
        "BSA_percent": "number",
        "PP_NRS": "number",
        "prior_topical_failure": "categorical",
        "active_skin_infection": "categorical",
        "recent_biologic_use": "categorical",
        "pregnant_or_breastfeeding": "categorical"
    }'::jsonb,
    v_filter_2,  -- References saved filter
    NULL,  -- No inline filter since using filter_id
    ARRAY['AD-001', 'AD-005', 'AD-012', 'AD-023', 'AD-034', 'AD-045', 'AD-056', 'AD-067', 'AD-078', 'AD-089',
          'AD-101', 'AD-112', 'AD-123', 'AD-134', 'AD-145', 'AD-156', 'AD-167', 'AD-178', 'AD-189', 'AD-200',
          'AD-211', 'AD-222', 'AD-233', 'AD-244', 'AD-255', 'AD-266', 'AD-277', 'AD-288', 'AD-299', 'AD-310',
          'AD-321', 'AD-332', 'AD-343', 'AD-354', 'AD-365', 'AD-376', 'AD-387', 'AD-398', 'AD-409', 'AD-420',
          'AD-431', 'AD-442', 'AD-453', 'AD-464', 'AD-475', 'AD-486', 'AD-497', 'AD-508', 'AD-519', 'AD-530'],
    1875,
    v_enterprise_id,
    v_user_id_1
) RETURNING id INTO v_cohort_1;

-- Cohort 2: AD Moderate-Severe Only - Using saved filter
INSERT INTO patient_screening_cohorts (
    id, name, description, master_data_id, columns, filter_id, filter,
    filtered_patient_ids, patient_count, enterprise_id, created_by
) VALUES (
    uuid_generate_v4(),
    'AD Moderate-Severe Subset',
    'Patients with moderate to severe atopic dermatitis based on EASI and BSA scores',
    v_master_data_1,
    '{
        "patient_id": "string",
        "age": "number",
        "EASI_score": "number",
        "BSA_percent": "number",
        "vIGA_AD": "number"
    }'::jsonb,
    v_filter_3,  -- References saved filter
    NULL,
    ARRAY['AD-023', 'AD-045', 'AD-089', 'AD-134', 'AD-178', 'AD-222', 'AD-266', 'AD-310', 'AD-354', 'AD-398',
          'AD-442', 'AD-486', 'AD-530', 'AD-574', 'AD-618', 'AD-662', 'AD-706', 'AD-750', 'AD-794', 'AD-838'],
    2450,
    v_enterprise_id,
    v_user_id_1
) RETURNING id INTO v_cohort_2;

-- Cohort 3: Lung Cancer EGFR+ Cohort - Using saved filter
INSERT INTO patient_screening_cohorts (
    id, name, description, master_data_id, columns, filter_id, filter,
    filtered_patient_ids, patient_count, enterprise_id, created_by
) VALUES (
    uuid_generate_v4(),
    'NSCLC EGFR+ TKI Candidates',
    'Non-small cell lung cancer patients with EGFR mutations eligible for TKI therapy',
    v_master_data_2,
    '{
        "patient_id": "string",
        "age": "number",
        "tumor_stage": "categorical",
        "histology": "categorical",
        "egfr_mutation": "categorical",
        "ECOG_score": "number",
        "brain_metastases": "categorical"
    }'::jsonb,
    v_filter_4,  -- References saved filter
    NULL,
    ARRAY['LC-101', 'LC-203', 'LC-305', 'LC-407', 'LC-509', 'LC-611', 'LC-713', 'LC-815', 'LC-917', 'LC-1019',
          'LC-1121', 'LC-1223', 'LC-1325', 'LC-1427', 'LC-1529', 'LC-1631', 'LC-1733', 'LC-1835', 'LC-1937'],
    892,
    v_enterprise_id,
    v_user_id_2
) RETURNING id INTO v_cohort_3;

-- Cohort 4: Lung Cancer Immunotherapy Candidates - Using saved filter
INSERT INTO patient_screening_cohorts (
    id, name, description, master_data_id, columns, filter_id, filter,
    filtered_patient_ids, patient_count, enterprise_id, created_by
) VALUES (
    uuid_generate_v4(),
    'NSCLC Immunotherapy Eligible',
    'Patients with high PD-L1 expression eligible for first-line immunotherapy',
    v_master_data_2,
    '{
        "patient_id": "string",
        "pd_l1_expression": "number",
        "egfr_mutation": "categorical",
        "alk_rearrangement": "categorical",
        "ECOG_score": "number",
        "tumor_stage": "categorical"
    }'::jsonb,
    v_filter_5,  -- References saved filter
    NULL,
    ARRAY['LC-102', 'LC-204', 'LC-306', 'LC-408', 'LC-510', 'LC-612', 'LC-714', 'LC-816', 'LC-918', 'LC-1020',
          'LC-1122', 'LC-1224', 'LC-1326', 'LC-1428', 'LC-1530', 'LC-1632', 'LC-1734', 'LC-1836', 'LC-1938',
          'LC-2040', 'LC-2142', 'LC-2244', 'LC-2346', 'LC-2448', 'LC-2550'],
    1245,
    v_enterprise_id,
    v_user_id_2
) RETURNING id INTO v_cohort_4;

-- Cohort 5: CAR-T Eligible Patients - Inline filter (no saved filter)
INSERT INTO patient_screening_cohorts (
    id, name, description, master_data_id, columns, filter_id, filter,
    filtered_patient_ids, patient_count, enterprise_id, created_by
) VALUES (
    uuid_generate_v4(),
    'CAR-T Cell Therapy Candidates',
    'Relapsed/refractory B-cell malignancy patients eligible for CAR-T cell therapy',
    v_master_data_3,
    '{
        "patient_id": "string",
        "age": "number",
        "diagnosis": "categorical",
        "disease_status": "categorical",
        "prior_lines_of_therapy": "number",
        "cd19_expression": "categorical",
        "lymphocyte_count": "number",
        "organ_function_status": "categorical",
        "active_infection": "categorical",
        "performance_status": "number"
    }'::jsonb,
    NULL,  -- No saved filter
    '{
        "id": "group-cart",
        "name": "CAR-T Eligibility",
        "logic": "AND",
        "negate": false,
        "rules": [
            {
                "id": "rule-age-cart",
                "field": "age",
                "operator": "between",
                "value": 18,
                "value2": 75
            },
            {
                "id": "rule-cd19",
                "field": "cd19_expression",
                "operator": "equals",
                "value": "Positive"
            },
            {
                "id": "rule-prior-therapy",
                "field": "prior_lines_of_therapy",
                "operator": "gte",
                "value": 2
            },
            {
                "id": "rule-lymphocyte",
                "field": "lymphocyte_count",
                "operator": "gte",
                "value": 100
            },
            {
                "id": "rule-organ",
                "field": "organ_function_status",
                "operator": "equals",
                "value": "Adequate"
            },
            {
                "id": "rule-infection",
                "field": "active_infection",
                "operator": "equals",
                "value": "No"
            },
            {
                "id": "rule-ps",
                "field": "performance_status",
                "operator": "lte",
                "value": 1
            },
            {
                "id": "group-diagnosis",
                "name": "Eligible Diagnoses",
                "logic": "OR",
                "rules": [
                    {
                        "id": "rule-dlbcl",
                        "field": "diagnosis",
                        "operator": "equals",
                        "value": "DLBCL"
                    },
                    {
                        "id": "rule-all",
                        "field": "diagnosis",
                        "operator": "equals",
                        "value": "B-ALL"
                    },
                    {
                        "id": "rule-fl",
                        "field": "diagnosis",
                        "operator": "equals",
                        "value": "FL"
                    },
                    {
                        "id": "rule-mcl",
                        "field": "diagnosis",
                        "operator": "equals",
                        "value": "MCL"
                    }
                ]
            }
        ]
    }'::jsonb,
    ARRAY['CT-001', 'CT-015', 'CT-029', 'CT-043', 'CT-057', 'CT-071', 'CT-085', 'CT-099', 'CT-113', 'CT-127',
          'CT-141', 'CT-155', 'CT-169', 'CT-183', 'CT-197', 'CT-211', 'CT-225', 'CT-239', 'CT-253', 'CT-267',
          'CT-281', 'CT-295', 'CT-309', 'CT-323', 'CT-337', 'CT-351', 'CT-365', 'CT-379', 'CT-393', 'CT-407'],
    485,
    v_enterprise_id,
    v_user_id_2
) RETURNING id INTO v_cohort_5;

-- =============================================================================
-- Cohort Activity Records
-- =============================================================================

-- Activity for Cohort 1
INSERT INTO patient_screening_cohort_activity (cohort_id, action, description, user_id, user_name, metadata) VALUES
(v_cohort_1, 'created', 'Cohort created using saved filter "AD Phase III Eligibility"', v_user_id_1, 'Dr. Sarah Chen',
 '{"initial_patient_count": 1875, "filter_id": "' || v_filter_2 || '", "filter_name": "AD Phase III Eligibility"}'::jsonb);

INSERT INTO patient_screening_cohort_activity (cohort_id, action, description, user_id, user_name, metadata) VALUES
(v_cohort_1, 'exported', 'Exported screened data as CSV', v_user_id_1, 'Dr. Sarah Chen',
 '{"format": "csv", "record_count": 1875}'::jsonb);

-- Activity for Cohort 2
INSERT INTO patient_screening_cohort_activity (cohort_id, action, description, user_id, user_name, metadata) VALUES
(v_cohort_2, 'created', 'Cohort created using saved filter "Moderate-Severe Disease"', v_user_id_1, 'Dr. Sarah Chen',
 '{"initial_patient_count": 2450, "filter_id": "' || v_filter_3 || '", "filter_name": "Moderate-Severe Disease"}'::jsonb);

-- Activity for Cohort 3
INSERT INTO patient_screening_cohort_activity (cohort_id, action, description, user_id, user_name, metadata) VALUES
(v_cohort_3, 'created', 'Cohort created using saved filter "EGFR+ TKI Eligibility"', v_user_id_2, 'Dr. Michael Wong',
 '{"initial_patient_count": 892, "filter_id": "' || v_filter_4 || '", "filter_name": "EGFR+ TKI Eligibility"}'::jsonb);

INSERT INTO patient_screening_cohort_activity (cohort_id, action, description, user_id, user_name, metadata) VALUES
(v_cohort_3, 'compared', 'Compared with NSCLC Immunotherapy Eligible cohort', v_user_id_2, 'Dr. Michael Wong',
 '{"compared_with": "NSCLC Immunotherapy Eligible", "overlap_count": 156}'::jsonb);

INSERT INTO patient_screening_cohort_activity (cohort_id, action, description, user_id, user_name, metadata) VALUES
(v_cohort_3, 'exported', 'Exported master data as Excel', v_user_id_2, 'Dr. Michael Wong',
 '{"format": "xlsx", "record_count": 8750, "type": "master_data"}'::jsonb);

-- Activity for Cohort 4
INSERT INTO patient_screening_cohort_activity (cohort_id, action, description, user_id, user_name, metadata) VALUES
(v_cohort_4, 'created', 'Cohort created using saved filter "High PD-L1 Immunotherapy"', v_user_id_2, 'Dr. Michael Wong',
 '{"initial_patient_count": 1245, "filter_id": "' || v_filter_5 || '", "filter_name": "High PD-L1 Immunotherapy"}'::jsonb);

INSERT INTO patient_screening_cohort_activity (cohort_id, action, description, user_id, user_name, previous_value, new_value, metadata) VALUES
(v_cohort_4, 'updated', 'Updated cohort description', v_user_id_2, 'Dr. Michael Wong',
 '{"description": "High PD-L1 patients"}'::jsonb,
 '{"description": "Patients with high PD-L1 expression eligible for first-line immunotherapy"}'::jsonb,
 '{}'::jsonb);

-- Activity for Cohort 5
INSERT INTO patient_screening_cohort_activity (cohort_id, action, description, user_id, user_name, metadata) VALUES
(v_cohort_5, 'created', 'Cohort created with inline filter (8 rules including nested diagnosis group)', v_user_id_2, 'Dr. Michael Wong',
 '{"initial_patient_count": 485, "rule_count": 8, "filter_type": "inline"}'::jsonb);

INSERT INTO patient_screening_cohort_activity (cohort_id, action, description, user_id, user_name, metadata) VALUES
(v_cohort_5, 'exported', 'Exported screened data as JSON', v_user_id_2, 'Dr. Michael Wong',
 '{"format": "json", "record_count": 485}'::jsonb);

-- =============================================================================
-- Cohort Comparison Cache
-- =============================================================================

-- Comparison between AD cohorts
INSERT INTO patient_screening_cohort_comparisons (
    cohort_ids, total_unique_patients, common_to_all, comparison_data,
    enterprise_id, created_by, expires_at
) VALUES (
    ARRAY[v_cohort_1, v_cohort_2],
    2875,
    1450,
    '{
        "cohorts": [
            {"cohort_id": "' || v_cohort_1 || '", "cohort_name": "AD Phase III - Full Eligibility", "patient_count": 1875, "master_patient_count": 12500, "match_rate": 15.0, "filter_count": 10},
            {"cohort_id": "' || v_cohort_2 || '", "cohort_name": "AD Moderate-Severe Subset", "patient_count": 2450, "master_patient_count": 12500, "match_rate": 19.6, "filter_count": 3}
        ],
        "overlaps": [
            {"cohort_ids": ["' || v_cohort_1 || '", "' || v_cohort_2 || '"], "overlap_count": 1450, "overlap_percentage": 77.3, "unique_to_first": 425, "unique_to_second": 1000}
        ]
    }'::jsonb,
    v_enterprise_id,
    v_user_id_1,
    NOW() + INTERVAL '24 hours'
);

-- Comparison between Lung Cancer cohorts
INSERT INTO patient_screening_cohort_comparisons (
    cohort_ids, total_unique_patients, common_to_all, comparison_data,
    enterprise_id, created_by, expires_at
) VALUES (
    ARRAY[v_cohort_3, v_cohort_4],
    1981,
    156,
    '{
        "cohorts": [
            {"cohort_id": "' || v_cohort_3 || '", "cohort_name": "NSCLC EGFR+ TKI Candidates", "patient_count": 892, "master_patient_count": 8750, "match_rate": 10.2, "filter_count": 4},
            {"cohort_id": "' || v_cohort_4 || '", "cohort_name": "NSCLC Immunotherapy Eligible", "patient_count": 1245, "master_patient_count": 8750, "match_rate": 14.2, "filter_count": 4}
        ],
        "overlaps": [
            {"cohort_ids": ["' || v_cohort_3 || '", "' || v_cohort_4 || '"], "overlap_count": 156, "overlap_percentage": 17.5, "unique_to_first": 736, "unique_to_second": 1089}
        ]
    }'::jsonb,
    v_enterprise_id,
    v_user_id_2,
    NOW() + INTERVAL '24 hours'
);

RAISE NOTICE 'Seed data inserted successfully!';
RAISE NOTICE 'Master Data IDs: %, %, %', v_master_data_1, v_master_data_2, v_master_data_3;
RAISE NOTICE 'Filter IDs: %, %, %, %, %', v_filter_1, v_filter_2, v_filter_3, v_filter_4, v_filter_5;
RAISE NOTICE 'Cohort IDs: %, %, %, %, %', v_cohort_1, v_cohort_2, v_cohort_3, v_cohort_4, v_cohort_5;

END $$;

-- =============================================================================
-- Verify Seed Data
-- =============================================================================

-- Check inserted data
SELECT 'Master Data' as table_name, COUNT(*) as record_count FROM patient_screening_master_data
UNION ALL
SELECT 'Saved Filters', COUNT(*) FROM patient_screening_filters
UNION ALL
SELECT 'Cohorts', COUNT(*) FROM patient_screening_cohorts
UNION ALL
SELECT 'Activity Log', COUNT(*) FROM patient_screening_cohort_activity
UNION ALL
SELECT 'Comparisons Cache', COUNT(*) FROM patient_screening_cohort_comparisons;

-- Show filter summary
SELECT
    f.name as filter_name,
    f.is_template,
    f.usage_count,
    f.created_at
FROM patient_screening_filters f
ORDER BY f.created_at;

-- Show cohort summary with filter info
SELECT
    c.name,
    c.patient_count,
    m.row_count as master_count,
    ROUND((c.patient_count::numeric / m.row_count * 100), 1) as match_rate_pct,
    f.name as filter_name,
    CASE WHEN c.filter_id IS NOT NULL THEN 'Saved Filter' ELSE 'Inline Filter' END as filter_type,
    c.created_at
FROM patient_screening_cohorts c
JOIN patient_screening_master_data m ON c.master_data_id = m.id
LEFT JOIN patient_screening_filters f ON c.filter_id = f.id
ORDER BY c.created_at;
