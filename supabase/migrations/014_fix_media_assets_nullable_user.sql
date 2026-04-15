-- Fix: Make uploaded_by column nullable in media_assets table
-- This allows migrating existing media without user attribution

ALTER TABLE media_assets
ALTER COLUMN uploaded_by DROP NOT NULL;

-- Verify change
SELECT column_name, is_nullable, data_type
FROM information_schema.columns
WHERE table_name = 'media_assets'
  AND column_name = 'uploaded_by';
