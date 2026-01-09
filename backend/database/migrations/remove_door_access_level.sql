-- Migration: Remove access_level from doors table
-- Reason: Access control is now purely permission-based through card_permissions table
-- The access_level field (all/department/vip) is legacy from the old hardcoded system

-- Remove access_level and department_id (no longer used for access control)
ALTER TABLE doors DROP COLUMN IF EXISTS access_level;
ALTER TABLE doors DROP COLUMN IF EXISTS department_id;

-- Add comment to clarify the new architecture
ALTER TABLE doors COMMENT = 'Doors table - Access control is managed through permissions system';
