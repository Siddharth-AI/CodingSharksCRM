-- ← RUN THIS IN SUPABASE SQL EDITOR TO MIGRATE EXISTING MEDIA ←
-- Directly migrate existing media URLs from message_templates to media_assets

-- Step 0: First check what data we have
-- SELECT COUNT(*) FROM message_templates WHERE media_video_url IS NOT NULL OR media_image_url IS NOT NULL;

-- Step 1: Insert all existing media from message_templates into media_assets
INSERT INTO media_assets (type, url, public_id, file_name, uploaded_by, created_at)
SELECT DISTINCT
  CASE 
    WHEN media_video_url IS NOT NULL THEN 'video'
    WHEN media_image_url IS NOT NULL THEN 'image'
  END as type,
  COALESCE(media_video_url, media_image_url) as url,
  -- Extract public_id from Cloudinary URL
  -- Example: https://res.cloudinary.com/dinxxn5mg/video/upload/v1776257730/crm-whatsapp/templates/wtxuazntw5Ixahhhcpv.mp4
  -- Extract: crm-whatsapp/templates/wtxuazntw5Ixahhhcpv
  SUBSTRING(
    COALESCE(media_video_url, media_image_url),
    POSITION('crm-whatsapp' IN COALESCE(media_video_url, media_image_url)),
    LENGTH(COALESCE(media_video_url, media_image_url))
  )::TEXT as public_id,
  -- Extract filename from the end of URL (after last /)
  REVERSE(SPLIT_PART(REVERSE(COALESCE(media_video_url, media_image_url)), '/', 1)) as file_name,
  NULL::uuid as uploaded_by,
  created_at
FROM message_templates
WHERE media_video_url IS NOT NULL OR media_image_url IS NOT NULL
  AND COALESCE(media_video_url, media_image_url) != ''
ON CONFLICT (public_id) DO NOTHING;

-- Step 2: Verify migration worked
SELECT 
  COUNT(*) as "✅ Total Migrated Media",
  COUNT(CASE WHEN type = 'video' THEN 1 END) as "Videos",
  COUNT(CASE WHEN type = 'image' THEN 1 END) as "Images"
FROM media_assets;

-- Step 3: Show what was migrated (last 20)
SELECT 
  id,
  type,
  file_name,
  url,
  created_at
FROM media_assets
ORDER BY created_at DESC
LIMIT 20;
