-- Migration: Add GPS tracking fields for clock-in/out
-- Date: 2026-02-17

-- Add GPS coordinates to timesheet_segments
ALTER TABLE timesheet_segments ADD COLUMN check_in_latitude REAL;
ALTER TABLE timesheet_segments ADD COLUMN check_in_longitude REAL;
ALTER TABLE timesheet_segments ADD COLUMN check_out_latitude REAL;
ALTER TABLE timesheet_segments ADD COLUMN check_out_longitude REAL;
ALTER TABLE timesheet_segments ADD COLUMN is_within_geofence BOOLEAN DEFAULT 1;
ALTER TABLE timesheet_segments ADD COLUMN distance_from_site REAL;  -- meters

-- Add GPS coordinates and geofence to sites
ALTER TABLE sites ADD COLUMN latitude REAL;
ALTER TABLE sites ADD COLUMN longitude REAL;
ALTER TABLE sites ADD COLUMN geofence_radius INTEGER DEFAULT 100;  -- meters

-- Add break tracking fields
ALTER TABLE timesheet_segments ADD COLUMN break_start_latitude REAL;
ALTER TABLE timesheet_segments ADD COLUMN break_start_longitude REAL;
