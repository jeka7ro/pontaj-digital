-- Migration: Add Teams Management System
-- Date: 2026-02-17
-- Description: Create tables for team management where team leaders can create teams,
--              select workers, copy from previous day, and modify team composition

-- Teams table
CREATE TABLE IF NOT EXISTS teams (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL,
    name TEXT NOT NULL,
    team_leader_id TEXT NOT NULL,
    site_id TEXT,
    is_active BOOLEAN DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (team_leader_id) REFERENCES users(id) ON DELETE RESTRICT,
    FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE SET NULL
);

-- Team members table (many-to-many relationship)
CREATE TABLE IF NOT EXISTS team_members (
    id TEXT PRIMARY KEY,
    team_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    joined_date DATE NOT NULL,
    left_date DATE,
    is_active BOOLEAN DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(team_id, user_id, joined_date)
);

-- Team history table (for tracking daily team compositions)
CREATE TABLE IF NOT EXISTS team_daily_compositions (
    id TEXT PRIMARY KEY,
    team_id TEXT NOT NULL,
    date DATE NOT NULL,
    site_id TEXT,
    member_ids TEXT NOT NULL, -- JSON array of user IDs
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
    FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE SET NULL,
    UNIQUE(team_id, date)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_teams_organization ON teams(organization_id);
CREATE INDEX IF NOT EXISTS idx_team_members_team ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user ON team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_team_daily_date ON team_daily_compositions(date);
CREATE INDEX IF NOT EXISTS idx_team_daily_team ON team_daily_compositions(team_id);

