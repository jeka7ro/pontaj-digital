-- Migration: Add work schedule to construction_sites and overtime tracking to timesheet_segments
-- Date: 2026-02-21

-- Site schedule fields
ALTER TABLE construction_sites ADD COLUMN work_start_time TIME DEFAULT '07:00:00';
ALTER TABLE construction_sites ADD COLUMN work_end_time TIME DEFAULT '16:00:00';
ALTER TABLE construction_sites ADD COLUMN max_overtime_minutes INTEGER DEFAULT 120;

-- Set defaults for existing sites
UPDATE construction_sites SET work_start_time = '07:00:00' WHERE work_start_time IS NULL;
UPDATE construction_sites SET work_end_time = '16:00:00' WHERE work_end_time IS NULL;
UPDATE construction_sites SET max_overtime_minutes = 120 WHERE max_overtime_minutes IS NULL;

-- Overtime tracking on timesheet segments
ALTER TABLE timesheet_segments ADD COLUMN overtime_minutes INTEGER DEFAULT 0;
ALTER TABLE timesheet_segments ADD COLUMN overtime_approved BOOLEAN DEFAULT FALSE;
ALTER TABLE timesheet_segments ADD COLUMN overtime_approved_by VARCHAR(36) REFERENCES admins(id) ON DELETE SET NULL;
ALTER TABLE timesheet_segments ADD COLUMN overtime_approved_at TIMESTAMP;
