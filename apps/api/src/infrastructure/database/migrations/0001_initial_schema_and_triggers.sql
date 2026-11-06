-- Scienpay Database Migration 0001: Esquema Inicial, Inmutabilidad y Triggers
-- Cumple con ADR-001, ADR-002, ADR-003, ADR-006 y Especificación de Referencia

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Tabla: users
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(50) NOT NULL UNIQUE,
  email VARCHAR(120) NOT NULL UNIQUE,
  full_name VARCHAR(150) NOT NULL,
  title VARCHAR(150) DEFAULT '',
  role VARCHAR(20) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  failed_attempts INTEGER DEFAULT 0 NOT NULL,
  is_locked BOOLEAN DEFAULT FALSE NOT NULL,
  lockout_expires_at TIMESTAMPTZ,
  permanent_lock BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 2. Tabla: refresh_tokens
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(128) NOT NULL,
  family_id UUID NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 3. Tabla: projects
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(20) NOT NULL UNIQUE,
  name VARCHAR(150) NOT NULL,
  description TEXT DEFAULT '',
  area VARCHAR(20) NOT NULL,
  scope VARCHAR(20) NOT NULL,
  status VARCHAR(20) DEFAULT 'ACTIVO' NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  budget_usd NUMERIC(14,2) DEFAULT 0.00 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 4. Tabla: payment_groups
CREATE TABLE IF NOT EXISTS payment_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  periodicity VARCHAR(20) NOT NULL,
  cut_off_config JSONB DEFAULT '{}'::jsonb NOT NULL,
  description TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 5. Tabla: persons (Beneficiarios sin cuenta de usuario)
CREATE TABLE IF NOT EXISTS persons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_type VARCHAR(10) DEFAULT 'V' NOT NULL,
  document_number VARCHAR(30) NOT NULL,
  first_name VARCHAR(80) NOT NULL,
  last_name VARCHAR(80) NOT NULL,
  email VARCHAR(120),
  phone VARCHAR(30),
  specialty VARCHAR(150) DEFAULT '',
  status VARCHAR(20) DEFAULT 'ACTIVO' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT uq_person_document UNIQUE (document_type, document_number)
);

-- 6. Tabla: assignments
CREATE TABLE IF NOT EXISTS assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id UUID NOT NULL REFERENCES persons(id) ON DELETE RESTRICT,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE RESTRICT,
  payment_group_id UUID NOT NULL REFERENCES payment_groups(id) ON DELETE RESTRICT,
  amount_per_period NUMERIC(14,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD' NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  status VARCHAR(20) DEFAULT 'ACTIVO' NOT NULL,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 7. Tabla: causation_batches (INMUTABLE)
CREATE TABLE IF NOT EXISTS causation_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE RESTRICT,
  payment_group_id UUID NOT NULL REFERENCES payment_groups(id) ON DELETE RESTRICT,
  period_start_date DATE NOT NULL,
  period_end_date DATE NOT NULL,
  total_causation_amount NUMERIC(14,2) NOT NULL,
  status VARCHAR(20) DEFAULT 'CALCULADO' NOT NULL,
  calculated_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  annulment_reason TEXT,
  annulled_by_user_id UUID REFERENCES users(id) ON DELETE RESTRICT,
  annulled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT uq_causation_batch_idempotence UNIQUE (project_id, payment_group_id, period_start_date, period_end_date)
);

-- 8. Tabla: causation_items (INMUTABLE)
CREATE TABLE IF NOT EXISTS causation_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL REFERENCES causation_batches(id) ON DELETE RESTRICT,
  person_id UUID NOT NULL REFERENCES persons(id) ON DELETE RESTRICT,
  assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE RESTRICT,
  period_start_date DATE NOT NULL,
  period_end_date DATE NOT NULL,
  total_days_in_period INTEGER NOT NULL,
  active_days INTEGER NOT NULL,
  base_amount NUMERIC(14,2) NOT NULL,
  calculated_amount NUMERIC(14,2) NOT NULL,
  paid_amount NUMERIC(14,2) DEFAULT 0.00 NOT NULL,
  remaining_debt NUMERIC(14,2) NOT NULL,
  status VARCHAR(20) DEFAULT 'PENDIENTE' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 9. Tabla: payment_requests (INMUTABLE)
CREATE TABLE IF NOT EXISTS payment_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_code VARCHAR(30) NOT NULL UNIQUE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE RESTRICT,
  causation_batch_id UUID NOT NULL REFERENCES causation_batches(id) ON DELETE RESTRICT,
  period_description VARCHAR(150) NOT NULL,
  total_amount_usd NUMERIC(14,2) NOT NULL,
  status VARCHAR(20) DEFAULT 'BORRADOR' NOT NULL,
  created_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  reviewed_by_user_id UUID REFERENCES users(id) ON DELETE RESTRICT,
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT chk_four_eyes_approval CHECK (reviewed_by_user_id IS NULL OR created_by_user_id <> reviewed_by_user_id)
);

-- 10. Tabla: disbursements (INMUTABLE)
CREATE TABLE IF NOT EXISTS disbursements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_request_id UUID NOT NULL REFERENCES payment_requests(id) ON DELETE RESTRICT,
  disbursed_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  payment_method VARCHAR(20) NOT NULL,
  reference_number VARCHAR(100) DEFAULT '',
  total_amount NUMERIC(14,2) NOT NULL,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 11. Tabla: receipts (INMUTABLE)
CREATE TABLE IF NOT EXISTS receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_number VARCHAR(30) NOT NULL UNIQUE,
  disbursement_id UUID NOT NULL REFERENCES disbursements(id) ON DELETE RESTRICT,
  person_id UUID NOT NULL REFERENCES persons(id) ON DELETE RESTRICT,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE RESTRICT,
  total_amount_usd NUMERIC(14,2) NOT NULL,
  remaining_debt_after_usd NUMERIC(14,2) NOT NULL,
  issued_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  issued_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  notes TEXT DEFAULT ''
);

-- 12. Tabla: receipt_allocations (INMUTABLE - Imputación FIFO)
CREATE TABLE IF NOT EXISTS receipt_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id UUID NOT NULL REFERENCES receipts(id) ON DELETE RESTRICT,
  causation_item_id UUID NOT NULL REFERENCES causation_items(id) ON DELETE RESTRICT,
  allocated_amount_usd NUMERIC(14,2) NOT NULL,
  debt_before_allocation_usd NUMERIC(14,2) NOT NULL,
  debt_after_allocation_usd NUMERIC(14,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 13. Tabla: petty_cash
CREATE TABLE IF NOT EXISTS petty_cash (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT DEFAULT '',
  custodian_name VARCHAR(100) NOT NULL,
  status VARCHAR(20) DEFAULT 'ACTIVA' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 14. Tabla: petty_cash_projects
CREATE TABLE IF NOT EXISTS petty_cash_projects (
  petty_cash_id UUID NOT NULL REFERENCES petty_cash(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  PRIMARY KEY (petty_cash_id, project_id)
);

-- 15. Tabla: petty_cash_periods
CREATE TABLE IF NOT EXISTS petty_cash_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  petty_cash_id UUID NOT NULL REFERENCES petty_cash(id) ON DELETE RESTRICT,
  period_year INTEGER NOT NULL,
  period_month INTEGER NOT NULL,
  opening_balance NUMERIC(14,2) NOT NULL,
  disbursed_total NUMERIC(14,2) DEFAULT 0.00 NOT NULL,
  rendered_total NUMERIC(14,2) DEFAULT 0.00 NOT NULL,
  closing_balance NUMERIC(14,2) DEFAULT 0.00 NOT NULL,
  status VARCHAR(20) DEFAULT 'ABIERTO' NOT NULL,
  opened_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  closed_by_user_id UUID REFERENCES users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT uq_petty_cash_period UNIQUE (petty_cash_id, period_year, period_month)
);

-- 16. Tabla: petty_cash_vouchers
CREATE TABLE IF NOT EXISTS petty_cash_vouchers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  voucher_number VARCHAR(30) NOT NULL UNIQUE,
  petty_cash_period_id UUID NOT NULL REFERENCES petty_cash_periods(id) ON DELETE RESTRICT,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE RESTRICT,
  requested_amount NUMERIC(14,2) NOT NULL,
  rendered_amount NUMERIC(14,2) DEFAULT 0.00 NOT NULL,
  change_amount NUMERIC(14,2) DEFAULT 0.00 NOT NULL,
  purpose TEXT NOT NULL,
  invoice_reference VARCHAR(100) DEFAULT '',
  status VARCHAR(20) DEFAULT 'SOLICITADO' NOT NULL,
  requested_by VARCHAR(100) NOT NULL,
  approved_by_user_id UUID REFERENCES users(id) ON DELETE RESTRICT,
  disbursed_by_user_id UUID REFERENCES users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 17. Tabla: petty_cash_movements (INMUTABLE)
CREATE TABLE IF NOT EXISTS petty_cash_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  petty_cash_period_id UUID NOT NULL REFERENCES petty_cash_periods(id) ON DELETE RESTRICT,
  voucher_id UUID REFERENCES petty_cash_vouchers(id) ON DELETE RESTRICT,
  movement_type VARCHAR(30) NOT NULL,
  amount NUMERIC(14,2) NOT NULL,
  previous_balance NUMERIC(14,2) NOT NULL,
  new_balance NUMERIC(14,2) NOT NULL,
  performed_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 18. Tabla: audit_log (INMUTABLE)
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE RESTRICT,
  user_email VARCHAR(120) DEFAULT '',
  user_role VARCHAR(50) DEFAULT '',
  action VARCHAR(80) NOT NULL,
  entity VARCHAR(80) NOT NULL,
  entity_id VARCHAR(80) DEFAULT '',
  old_values JSONB,
  new_values JSONB,
  ip_address VARCHAR(50) DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- =========================================================================
-- SECUENCIAS DEDICADAS CORRELATIVAS SIN HUECOS (ADR-003)
-- =========================================================================
CREATE SEQUENCE IF NOT EXISTS receipt_number_seq
  AS BIGINT
  START WITH 1
  INCREMENT BY 1
  NO MINVALUE
  NO MAXVALUE
  CACHE 1;

-- =========================================================================
-- FUNCIÓN TRIGGER Y TRIGGERS DE INMUTABILIDAD FINANCIERA (ADR-003)
-- =========================================================================
CREATE OR REPLACE FUNCTION enforce_financial_immutability()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'VIOLACION_DE_INTEGRIDAD_FINANCIERA: La tabla "%" es estrictamente inmutable. Toda correccion contable debe efectuarse mediante una anulacion formal justificada con motivo registrado.', TG_TABLE_NAME
    USING ERRCODE = '55000';
END;
$$ LANGUAGE plpgsql;

-- Triggers BEFORE UPDATE OR DELETE en tablas financieras:
DROP TRIGGER IF EXISTS trg_prevent_mutation_causation_batches ON causation_batches;
CREATE TRIGGER trg_prevent_mutation_causation_batches
BEFORE UPDATE OR DELETE ON causation_batches
FOR EACH ROW EXECUTE FUNCTION enforce_financial_immutability();

DROP TRIGGER IF EXISTS trg_prevent_mutation_causation_items ON causation_items;
CREATE TRIGGER trg_prevent_mutation_causation_items
BEFORE UPDATE OR DELETE ON causation_items
FOR EACH ROW EXECUTE FUNCTION enforce_financial_immutability();

DROP TRIGGER IF EXISTS trg_prevent_mutation_disbursements ON disbursements;
CREATE TRIGGER trg_prevent_mutation_disbursements
BEFORE UPDATE OR DELETE ON disbursements
FOR EACH ROW EXECUTE FUNCTION enforce_financial_immutability();

DROP TRIGGER IF EXISTS trg_prevent_mutation_receipts ON receipts;
CREATE TRIGGER trg_prevent_mutation_receipts
BEFORE UPDATE OR DELETE ON receipts
FOR EACH ROW EXECUTE FUNCTION enforce_financial_immutability();

DROP TRIGGER IF EXISTS trg_prevent_mutation_receipt_allocations ON receipt_allocations;
CREATE TRIGGER trg_prevent_mutation_receipt_allocations
BEFORE UPDATE OR DELETE ON receipt_allocations
FOR EACH ROW EXECUTE FUNCTION enforce_financial_immutability();

DROP TRIGGER IF EXISTS trg_prevent_mutation_petty_cash_movements ON petty_cash_movements;
CREATE TRIGGER trg_prevent_mutation_petty_cash_movements
BEFORE UPDATE OR DELETE ON petty_cash_movements
FOR EACH ROW EXECUTE FUNCTION enforce_financial_immutability();

DROP TRIGGER IF EXISTS trg_prevent_mutation_audit_log ON audit_log;
CREATE TRIGGER trg_prevent_mutation_audit_log
BEFORE UPDATE OR DELETE ON audit_log
FOR EACH ROW EXECUTE FUNCTION enforce_financial_immutability();
