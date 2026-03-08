-- ============================================================
-- LabFlash RLS Policies — Phase 1
-- Apply in Supabase Dashboard: SQL Editor > Run
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE laboratories ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_users ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- laboratories policies
-- ============================================================

-- SELECT: lab staff can read their own lab's row
CREATE POLICY "lab_staff_select_own_lab"
  ON laboratories
  FOR SELECT
  USING (
    id IN (
      SELECT laboratory_id FROM lab_users WHERE auth_user_id = auth.uid()
    )
  );

-- UPDATE: only admins can update their lab
CREATE POLICY "lab_admin_update_own_lab"
  ON laboratories
  FOR UPDATE
  USING (
    id IN (
      SELECT laboratory_id FROM lab_users
      WHERE auth_user_id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================
-- lab_users policies
-- ============================================================

-- SELECT: lab staff can see all users in their own lab
CREATE POLICY "lab_staff_select_own_lab_users"
  ON lab_users
  FOR SELECT
  USING (
    laboratory_id IN (
      SELECT laboratory_id FROM lab_users WHERE auth_user_id = auth.uid()
    )
  );

-- INSERT: only admins can add users to their lab (Phase 4 feature; safe to add now)
CREATE POLICY "lab_admin_insert_lab_users"
  ON lab_users
  FOR INSERT
  WITH CHECK (
    laboratory_id IN (
      SELECT laboratory_id FROM lab_users
      WHERE auth_user_id = auth.uid() AND role = 'admin'
    )
  );

-- DELETE: only admins can remove users from their lab
CREATE POLICY "lab_admin_delete_lab_users"
  ON lab_users
  FOR DELETE
  USING (
    laboratory_id IN (
      SELECT laboratory_id FROM lab_users
      WHERE auth_user_id = auth.uid() AND role = 'admin'
    )
  );
