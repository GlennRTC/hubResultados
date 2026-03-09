-- Migration: 0001_patients_orders
-- Run this in the Supabase Dashboard > SQL Editor

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE document_type AS ENUM ('CC', 'CE', 'PA', 'RC', 'TI');
CREATE TYPE order_status AS ENUM ('pending', 'validated', 'delivered');
CREATE TYPE result_flag AS ENUM ('normal', 'high', 'low', 'critical');

-- ============================================================
-- TABLES
-- ============================================================

CREATE TABLE patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  laboratory_id UUID NOT NULL REFERENCES laboratories(id) ON DELETE CASCADE,
  document_type document_type NOT NULL,
  document_number TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  date_of_birth TEXT NOT NULL, -- ISO "YYYY-MM-DD"
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  laboratory_id UUID NOT NULL REFERENCES laboratories(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  order_number TEXT NOT NULL,
  status order_status NOT NULL DEFAULT 'pending',
  verification_code TEXT NOT NULL UNIQUE,
  pdf_path TEXT,
  validated_by_id UUID REFERENCES lab_users(id),
  validated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  test_name TEXT NOT NULL,
  value TEXT NOT NULL,
  unit TEXT,
  reference_range TEXT,
  flag result_flag NOT NULL DEFAULT 'normal',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Belt-and-suspenders RLS policies using auth.uid() for future Supabase client access.
-- Application layer enforces via laboratoryId WHERE clause (Transaction mode pooler).

-- patients: lab users can only see patients belonging to their laboratory
CREATE POLICY "patients_lab_isolation" ON patients
  USING (
    laboratory_id IN (
      SELECT laboratory_id FROM lab_users WHERE auth_user_id = auth.uid()
    )
  );

-- orders: lab users can only see orders belonging to their laboratory
CREATE POLICY "orders_lab_isolation" ON orders
  USING (
    laboratory_id IN (
      SELECT laboratory_id FROM lab_users WHERE auth_user_id = auth.uid()
    )
  );

-- order_items: accessible if the parent order belongs to the user's lab
CREATE POLICY "order_items_lab_isolation" ON order_items
  USING (
    order_id IN (
      SELECT id FROM orders WHERE laboratory_id IN (
        SELECT laboratory_id FROM lab_users WHERE auth_user_id = auth.uid()
      )
    )
  );

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_patients_laboratory_id ON patients(laboratory_id);
CREATE INDEX idx_orders_laboratory_id ON orders(laboratory_id);
CREATE INDEX idx_orders_patient_id ON orders(patient_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_verification_code ON orders(verification_code);
