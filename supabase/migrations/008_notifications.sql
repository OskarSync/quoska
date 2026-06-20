-- Migration: 008_notifications
-- In-app and email notifications for employees and managers.
-- Types: forgot_clockout, break_reminder, correction_request, correction_reviewed.

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  type TEXT NOT NULL
    CHECK (type IN (
      'forgot_clockout',
      'break_reminder',
      'correction_request',
      'correction_approved',
      'correction_rejected'
    )),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Find unread notifications for an employee (badge count + list)
CREATE INDEX idx_notifications_employee_unread
  ON notifications (employee_id, read, created_at DESC)
  WHERE read = false;

-- List all notifications for an employee, newest first
CREATE INDEX idx_notifications_employee_created
  ON notifications (employee_id, created_at DESC);

COMMENT ON TABLE notifications IS 'In-app notifications. Deduplication handled by service layer (check within 24h).';
