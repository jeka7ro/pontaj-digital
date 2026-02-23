-- Migration: Add activity categories
-- Run: sqlite3 pontaj_digital.db < migrations/add_activity_categories.sql

CREATE TABLE IF NOT EXISTS activity_categories (
    id VARCHAR(36) PRIMARY KEY,
    organization_id VARCHAR(36) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    color VARCHAR(7) DEFAULT '#3b82f6',
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT 1 NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Add category_id and description to activities
ALTER TABLE activities ADD COLUMN category_id VARCHAR(36) REFERENCES activity_categories(id) ON DELETE SET NULL;
ALTER TABLE activities ADD COLUMN description TEXT;
ALTER TABLE activities ADD COLUMN sort_order INTEGER DEFAULT 0;
