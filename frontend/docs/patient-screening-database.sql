-- =============================================================================
-- Patient Screening Module - Database Schema
-- =============================================================================
-- This schema supports the Patient Screening Cohort API
-- Database: PostgreSQL 14+
--
-- NOTE: All tables are prefixed with 'patient_screening_' for module isolation.
-- Authentication is handled by API Gateway. The fields enterprise_id,
-- user_id, user_name, and project_id are passed in the request body when needed.
-- These fields are stored for data isolation and audit trails.
-- =============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- Master Data Reference Table
-- =============================================================================
-- Stores metadata about uploaded patient data files in S3
-- The actual file content is stored in S3, only references are kept here

CREATE TABLE patient_screening_master_data (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- S3 Storage Information
    s3_bucket VARCHAR(255) NOT NULL,
    s3_key VARCHAR(500) NOT NULL,
    s3_region VARCHAR(50) DEFAULT 'us-east-1',

    -- File Metadata
    file_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(50) NOT NULL,  -- csv, json, xlsx
    file_size BIGINT NOT NULL,       -- Size in bytes
    content_type VARCHAR(100),       -- MIME type

    -- Data Metadata
    row_count INTEGER NOT NULL,
    columns JSONB NOT NULL,          -- {"column_name": "column_type", ...}
    sample_data JSONB,               -- First 5 rows for preview (optional)

    -- Audit Fields
    enterprise_id UUID NOT NULL,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraints
    CONSTRAINT ps_master_data_valid_file_type CHECK (file_type IN ('csv', 'json', 'xlsx')),
    CONSTRAINT ps_master_data_positive_row_count CHECK (row_count >= 0),
    CONSTRAINT ps_master_data_positive_file_size CHECK (file_size > 0)
);

-- Indexes for patient_screening_master_data
CREATE INDEX idx_ps_master_data_enterprise ON patient_screening_master_data(enterprise_id);
CREATE INDEX idx_ps_master_data_created_by ON patient_screening_master_data(created_by);
CREATE INDEX idx_ps_master_data_created_at ON patient_screening_master_data(created_at DESC);

COMMENT ON TABLE patient_screening_master_data IS 'Metadata for patient data files stored in S3';
COMMENT ON COLUMN patient_screening_master_data.columns IS 'JSON mapping of column names to types: string, number, categorical';

-- =============================================================================
-- Saved Filters Table
-- =============================================================================
-- Stores reusable filter configurations that can be applied to multiple cohorts

CREATE TABLE patient_screening_filters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Basic Information
    name VARCHAR(255) NOT NULL,
    description TEXT,

    -- Filter Configuration
    filter JSONB NOT NULL,           -- FilterGroup structure (see API spec)

    -- Metadata
    is_template BOOLEAN DEFAULT false,  -- If true, this is a system/shared template
    usage_count INTEGER DEFAULT 0,       -- Track how many cohorts use this filter

    -- Audit Fields
    enterprise_id UUID NOT NULL,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraints
    CONSTRAINT ps_filters_valid_filter CHECK (jsonb_typeof(filter) = 'object'),
    CONSTRAINT ps_filters_valid_name CHECK (char_length(name) >= 1)
);

-- Indexes for patient_screening_filters
CREATE INDEX idx_ps_filters_enterprise ON patient_screening_filters(enterprise_id);
CREATE INDEX idx_ps_filters_created_by ON patient_screening_filters(created_by);
CREATE INDEX idx_ps_filters_created_at ON patient_screening_filters(created_at DESC);
CREATE INDEX idx_ps_filters_name ON patient_screening_filters(name);
CREATE INDEX idx_ps_filters_template ON patient_screening_filters(is_template) WHERE is_template = true;

COMMENT ON TABLE patient_screening_filters IS 'Reusable filter configurations for patient screening';
COMMENT ON COLUMN patient_screening_filters.is_template IS 'System/shared templates visible to all users in enterprise';
COMMENT ON COLUMN patient_screening_filters.usage_count IS 'Number of cohorts currently using this filter';

-- =============================================================================
-- Cohorts Table
-- =============================================================================
-- Stores cohort definitions with reference to saved filters or inline filter

CREATE TABLE patient_screening_cohorts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Basic Information
    name VARCHAR(255) NOT NULL,
    description TEXT,

    -- Data Reference
    master_data_id UUID NOT NULL REFERENCES patient_screening_master_data(id) ON DELETE RESTRICT,
    columns JSONB NOT NULL,          -- Column types (may differ from master if user modified)

    -- Filter Configuration (either filter_id OR filter, not both required)
    filter_id UUID REFERENCES patient_screening_filters(id) ON DELETE SET NULL,  -- Reference to saved filter
    filter JSONB,                    -- Inline filter (used if filter_id is NULL)

    -- Cached Results (computed on frontend, stored for quick access)
    filtered_patient_ids TEXT[],     -- Array of patient IDs matching filter
    patient_count INTEGER NOT NULL DEFAULT 0,

    -- Audit Fields
    enterprise_id UUID NOT NULL,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraints: must have either filter_id or inline filter
    CONSTRAINT ps_cohorts_valid_filter_config CHECK (
        (filter_id IS NOT NULL) OR (filter IS NOT NULL AND jsonb_typeof(filter) = 'object')
    ),
    CONSTRAINT ps_cohorts_valid_name CHECK (char_length(name) >= 1)
);

-- Indexes for patient_screening_cohorts
CREATE INDEX idx_ps_cohorts_enterprise ON patient_screening_cohorts(enterprise_id);
CREATE INDEX idx_ps_cohorts_created_by ON patient_screening_cohorts(created_by);
CREATE INDEX idx_ps_cohorts_created_at ON patient_screening_cohorts(created_at DESC);
CREATE INDEX idx_ps_cohorts_master_data ON patient_screening_cohorts(master_data_id);
CREATE INDEX idx_ps_cohorts_filter ON patient_screening_cohorts(filter_id);
CREATE INDEX idx_ps_cohorts_name ON patient_screening_cohorts(name);
CREATE INDEX idx_ps_cohorts_patient_count ON patient_screening_cohorts(patient_count DESC);

-- GIN index for searching in filtered_patient_ids array
CREATE INDEX idx_ps_cohorts_patient_ids ON patient_screening_cohorts USING GIN (filtered_patient_ids);

COMMENT ON TABLE patient_screening_cohorts IS 'Patient screening cohort definitions with filter configuration';
COMMENT ON COLUMN patient_screening_cohorts.filter_id IS 'Reference to saved filter (if using saved filter)';
COMMENT ON COLUMN patient_screening_cohorts.filter IS 'Inline filter config OR FilterGroup JSON structure';
COMMENT ON COLUMN patient_screening_cohorts.filtered_patient_ids IS 'Cached list of patient IDs matching the filter';

-- =============================================================================
-- Cohort Activity Log Table
-- =============================================================================
-- Audit trail for cohort modifications

CREATE TABLE patient_screening_cohort_activity (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    cohort_id UUID NOT NULL REFERENCES patient_screening_cohorts(id) ON DELETE CASCADE,

    -- Activity Details
    action VARCHAR(50) NOT NULL,     -- created, updated, filter_changed, exported, compared
    description TEXT NOT NULL,

    -- Change Tracking (optional)
    previous_value JSONB,            -- Previous state (for updates)
    new_value JSONB,                 -- New state (for updates)

    -- Metadata
    metadata JSONB,                  -- Additional action-specific data

    -- Audit Fields
    user_id UUID NOT NULL,
    user_name VARCHAR(255),          -- Denormalized for display
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraints
    CONSTRAINT ps_activity_valid_action CHECK (action IN ('created', 'updated', 'filter_changed', 'exported', 'compared'))
);

-- Indexes for patient_screening_cohort_activity
CREATE INDEX idx_ps_activity_cohort ON patient_screening_cohort_activity(cohort_id);
CREATE INDEX idx_ps_activity_timestamp ON patient_screening_cohort_activity(timestamp DESC);
CREATE INDEX idx_ps_activity_action ON patient_screening_cohort_activity(action);
CREATE INDEX idx_ps_activity_user ON patient_screening_cohort_activity(user_id);

COMMENT ON TABLE patient_screening_cohort_activity IS 'Audit log for cohort operations';

-- =============================================================================
-- Cohort Comparisons Table (Optional - for caching comparison results)
-- =============================================================================
-- Stores results of cohort comparisons for quick retrieval

CREATE TABLE patient_screening_cohort_comparisons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Cohorts being compared (stored as sorted array for consistency)
    cohort_ids UUID[] NOT NULL,

    -- Comparison Results
    total_unique_patients INTEGER NOT NULL,
    common_to_all INTEGER NOT NULL,
    comparison_data JSONB NOT NULL,  -- Full comparison results (cohorts + overlaps)

    -- Audit Fields
    enterprise_id UUID NOT NULL,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,  -- Cache expiration

    -- Constraints
    CONSTRAINT ps_comparisons_min_cohorts CHECK (array_length(cohort_ids, 1) >= 2),
    CONSTRAINT ps_comparisons_max_cohorts CHECK (array_length(cohort_ids, 1) <= 5)
);

-- Index for finding existing comparisons
CREATE INDEX idx_ps_comparisons_cohorts ON patient_screening_cohort_comparisons USING GIN (cohort_ids);
CREATE INDEX idx_ps_comparisons_enterprise ON patient_screening_cohort_comparisons(enterprise_id);
CREATE INDEX idx_ps_comparisons_expires ON patient_screening_cohort_comparisons(expires_at);

COMMENT ON TABLE patient_screening_cohort_comparisons IS 'Cached comparison results between cohorts';

-- =============================================================================
-- Functions
-- =============================================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION patient_screening_update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for cohorts table
CREATE TRIGGER trg_ps_cohorts_updated_at
    BEFORE UPDATE ON patient_screening_cohorts
    FOR EACH ROW
    EXECUTE FUNCTION patient_screening_update_updated_at();

-- Trigger for filters table
CREATE TRIGGER trg_ps_filters_updated_at
    BEFORE UPDATE ON patient_screening_filters
    FOR EACH ROW
    EXECUTE FUNCTION patient_screening_update_updated_at();

-- Function to update filter usage count
CREATE OR REPLACE FUNCTION patient_screening_update_filter_usage()
RETURNS TRIGGER AS $$
BEGIN
    -- Decrement old filter usage count
    IF TG_OP = 'UPDATE' AND OLD.filter_id IS NOT NULL AND OLD.filter_id != NEW.filter_id THEN
        UPDATE patient_screening_filters
        SET usage_count = GREATEST(0, usage_count - 1)
        WHERE id = OLD.filter_id;
    END IF;

    -- Increment new filter usage count
    IF TG_OP = 'INSERT' AND NEW.filter_id IS NOT NULL THEN
        UPDATE patient_screening_filters
        SET usage_count = usage_count + 1
        WHERE id = NEW.filter_id;
    ELSIF TG_OP = 'UPDATE' AND NEW.filter_id IS NOT NULL AND (OLD.filter_id IS NULL OR OLD.filter_id != NEW.filter_id) THEN
        UPDATE patient_screening_filters
        SET usage_count = usage_count + 1
        WHERE id = NEW.filter_id;
    END IF;

    -- Decrement on delete
    IF TG_OP = 'DELETE' AND OLD.filter_id IS NOT NULL THEN
        UPDATE patient_screening_filters
        SET usage_count = GREATEST(0, usage_count - 1)
        WHERE id = OLD.filter_id;
        RETURN OLD;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to track filter usage
CREATE TRIGGER trg_ps_cohorts_filter_usage
    AFTER INSERT OR UPDATE OR DELETE ON patient_screening_cohorts
    FOR EACH ROW
    EXECUTE FUNCTION patient_screening_update_filter_usage();

-- Function to log cohort activity
CREATE OR REPLACE FUNCTION patient_screening_log_activity(
    p_cohort_id UUID,
    p_action VARCHAR(50),
    p_description TEXT,
    p_user_id UUID,
    p_user_name VARCHAR(255) DEFAULT NULL,
    p_previous_value JSONB DEFAULT NULL,
    p_new_value JSONB DEFAULT NULL,
    p_metadata JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_activity_id UUID;
BEGIN
    INSERT INTO patient_screening_cohort_activity (
        cohort_id, action, description, user_id, user_name,
        previous_value, new_value, metadata
    ) VALUES (
        p_cohort_id, p_action, p_description, p_user_id, p_user_name,
        p_previous_value, p_new_value, p_metadata
    ) RETURNING id INTO v_activity_id;

    RETURN v_activity_id;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate overlap between two cohorts
CREATE OR REPLACE FUNCTION patient_screening_calculate_overlap(
    p_cohort_id_1 UUID,
    p_cohort_id_2 UUID
)
RETURNS TABLE (
    overlap_count INTEGER,
    unique_to_first INTEGER,
    unique_to_second INTEGER,
    overlap_percentage NUMERIC
) AS $$
DECLARE
    v_ids_1 TEXT[];
    v_ids_2 TEXT[];
    v_overlap TEXT[];
    v_smaller_count INTEGER;
BEGIN
    -- Get patient IDs for both cohorts
    SELECT filtered_patient_ids INTO v_ids_1 FROM patient_screening_cohorts WHERE id = p_cohort_id_1;
    SELECT filtered_patient_ids INTO v_ids_2 FROM patient_screening_cohorts WHERE id = p_cohort_id_2;

    -- Calculate overlap
    v_overlap := ARRAY(
        SELECT UNNEST(v_ids_1)
        INTERSECT
        SELECT UNNEST(v_ids_2)
    );

    -- Get smaller cohort size for percentage calculation
    v_smaller_count := LEAST(array_length(v_ids_1, 1), array_length(v_ids_2, 1));

    RETURN QUERY SELECT
        COALESCE(array_length(v_overlap, 1), 0)::INTEGER,
        (COALESCE(array_length(v_ids_1, 1), 0) - COALESCE(array_length(v_overlap, 1), 0))::INTEGER,
        (COALESCE(array_length(v_ids_2, 1), 0) - COALESCE(array_length(v_overlap, 1), 0))::INTEGER,
        CASE WHEN v_smaller_count > 0
             THEN (COALESCE(array_length(v_overlap, 1), 0)::NUMERIC / v_smaller_count * 100)
             ELSE 0
        END;
END;
$$ LANGUAGE plpgsql;

-- Function to get effective filter for a cohort (either from filter_id or inline)
CREATE OR REPLACE FUNCTION patient_screening_get_effective_filter(p_cohort_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_filter_id UUID;
    v_inline_filter JSONB;
    v_saved_filter JSONB;
BEGIN
    SELECT filter_id, filter INTO v_filter_id, v_inline_filter
    FROM patient_screening_cohorts WHERE id = p_cohort_id;

    IF v_filter_id IS NOT NULL THEN
        SELECT filter INTO v_saved_filter
        FROM patient_screening_filters WHERE id = v_filter_id;
        RETURN v_saved_filter;
    END IF;

    RETURN v_inline_filter;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- Views
-- =============================================================================

-- Cohort summary view with master data and filter info
CREATE OR REPLACE VIEW patient_screening_cohort_summary AS
SELECT
    c.id,
    c.name,
    c.description,
    c.patient_count,
    c.filter_id,
    f.name AS filter_name,
    c.created_at,
    c.updated_at,
    c.enterprise_id,
    c.created_by,
    m.row_count AS master_patient_count,
    m.file_name AS master_data_file,
    ROUND((c.patient_count::NUMERIC / NULLIF(m.row_count, 0) * 100), 2) AS match_rate,
    patient_screening_get_effective_filter(c.id) AS effective_filter
FROM patient_screening_cohorts c
JOIN patient_screening_master_data m ON c.master_data_id = m.id
LEFT JOIN patient_screening_filters f ON c.filter_id = f.id;

COMMENT ON VIEW patient_screening_cohort_summary IS 'Summary view of cohorts with computed metrics and filter info';

-- Filter usage summary view
CREATE OR REPLACE VIEW patient_screening_filter_summary AS
SELECT
    f.id,
    f.name,
    f.description,
    f.is_template,
    f.usage_count,
    f.created_at,
    f.updated_at,
    f.enterprise_id,
    f.created_by,
    (SELECT COUNT(*) FROM patient_screening_cohorts c WHERE c.filter_id = f.id) AS actual_usage_count
FROM patient_screening_filters f;

COMMENT ON VIEW patient_screening_filter_summary IS 'Summary view of filters with usage statistics';
