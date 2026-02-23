-- Geofence Auto-Pause: tracks periods when worker is outside site radius
-- Hours during these pauses are NOT counted as worked time.

CREATE TABLE IF NOT EXISTS geofence_pauses (
    id VARCHAR(36) PRIMARY KEY,
    segment_id VARCHAR(36) NOT NULL REFERENCES timesheet_segments(id) ON DELETE CASCADE,
    pause_start DATETIME NOT NULL,
    pause_end DATETIME,
    distance_at_pause FLOAT,
    latitude FLOAT,
    longitude FLOAT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_geofence_pauses_segment ON geofence_pauses(segment_id);
CREATE INDEX IF NOT EXISTS idx_geofence_pauses_active ON geofence_pauses(segment_id, pause_end);
