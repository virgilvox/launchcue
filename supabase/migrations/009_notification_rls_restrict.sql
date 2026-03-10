-- Migration 009: Restrict notification INSERT to service_role only
-- Notifications are system-generated (triggers, server-side). No user should insert directly.

DROP POLICY IF EXISTS notifications_insert ON notifications;

-- Only service_role (Express API server) can insert notifications
CREATE POLICY notifications_insert ON notifications FOR INSERT
  TO service_role
  WITH CHECK (true);
