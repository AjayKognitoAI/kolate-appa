-- Create ENUM-like tables using VARCHAR
-- (Java enums will map to strings)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ====== 1. Default Roles & Permissions ======
CREATE TABLE default_roles (
    id UUID PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT
);

CREATE TABLE default_permissions (
    id UUID PRIMARY KEY,
    module VARCHAR(50) NOT NULL,
    access_type VARCHAR(50) NOT NULL,
    default_role_id UUID NOT NULL REFERENCES default_roles(id)
);

-- ====== 2. Project-specific Roles ======
CREATE TABLE roles (
    id UUID PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    project_id UUID NOT NULL REFERENCES projects(id),
    default_role_id UUID REFERENCES default_roles(id)
);

CREATE TABLE permissions (
    id UUID PRIMARY KEY,
    module VARCHAR(50) NOT NULL,
    access_type VARCHAR(50) NOT NULL,
    role_id UUID NOT NULL REFERENCES roles(id)
);

-- ALTER TABLE PROJECT_USER --
ALTER TABLE project_users ADD COLUMN role_id UUID REFERENCES roles(id);

-- ====== 3. Insert Default Roles ======
INSERT INTO default_roles (id, name, description)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'ADMIN', 'Full control over all modules'),
  ('00000000-0000-0000-0000-000000000002', 'MANAGER', 'Manage modules and users'),
  ('00000000-0000-0000-0000-000000000003', 'ANALYST', 'Read and analyze data'),
  ('00000000-0000-0000-0000-000000000004', 'MEMBER', 'Basic access');

-- ====== 5. Insert Default Permissions ======
-- ADMIN → FULL_ACCESS to all
INSERT INTO default_permissions (id, module, access_type, default_role_id)
VALUES
  (gen_random_uuid(), 'PREDICT', 'FULL_ACCESS', '00000000-0000-0000-0000-000000000001'),
  (gen_random_uuid(), 'COMPARE', 'FULL_ACCESS', '00000000-0000-0000-0000-000000000001'),
  (gen_random_uuid(), 'COPILOT', 'FULL_ACCESS', '00000000-0000-0000-0000-000000000001'),
  (gen_random_uuid(), 'INSIGHTS', 'FULL_ACCESS', '00000000-0000-0000-0000-000000000001'),

-- MANAGER → FULL_ACCESS to all
  (gen_random_uuid(), 'PREDICT', 'FULL_ACCESS', '00000000-0000-0000-0000-000000000002'),
  (gen_random_uuid(), 'COMPARE', 'FULL_ACCESS', '00000000-0000-0000-0000-000000000002'),
  (gen_random_uuid(), 'COPILOT', 'FULL_ACCESS', '00000000-0000-0000-0000-000000000002'),
  (gen_random_uuid(), 'INSIGHTS', 'FULL_ACCESS', '00000000-0000-0000-0000-000000000002'),

-- ANALYST → FULL_ACCESS to all
  (gen_random_uuid(), 'PREDICT', 'FULL_ACCESS', '00000000-0000-0000-0000-000000000003'),
  (gen_random_uuid(), 'COMPARE', 'FULL_ACCESS', '00000000-0000-0000-0000-000000000003'),
  (gen_random_uuid(), 'COPILOT', 'FULL_ACCESS', '00000000-0000-0000-0000-000000000003'),
  (gen_random_uuid(), 'INSIGHTS', 'FULL_ACCESS', '00000000-0000-0000-0000-000000000003'),

-- MEMBER → READ_ONLY for all
  (gen_random_uuid(), 'PREDICT', 'READ_ONLY', '00000000-0000-0000-0000-000000000004'),
  (gen_random_uuid(), 'COMPARE', 'READ_ONLY', '00000000-0000-0000-0000-000000000004'),
  (gen_random_uuid(), 'COPILOT', 'READ_ONLY', '00000000-0000-0000-0000-000000000004'),
  (gen_random_uuid(), 'INSIGHTS', 'READ_ONLY', '00000000-0000-0000-0000-000000000004');
