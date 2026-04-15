-- Migrate existing media URLs from message_templates to media_assets table
-- This script extracts all existing video and image URLs and creates media_assets records

-- First, check if we have any data to migrate
WITH existing_media AS (
  SELECT DISTINCT
    CASE 
      WHEN media_video_url IS NOT NULL THEN 'video'
      WHEN media_image_url IS NOT NULL THEN 'image'
    END as type,
    COALESCE(media_video_url, media_image_url) as url,
    created_at
  FROM message_templates
  WHERE media_video_url IS NOT NULL OR media_image_url IS NOT NULL
)
INSERT INTO media_assets (type, url, public_id, file_name, uploaded_by, created_at)
SELECT
  type,
  url,
  -- Extract public_id from Cloudinary URL
  -- Format: https://res.cloudinary.com/{cloud}/video/upload/v{version}/{public_id}
  -- We extract everything after the last /upload/v{version}/
  substring(
    url 
    from position('crm-whatsapp' in url) 
    for length(url)
  ) as public_id,
  -- Extract filename (last part after /)
  split_part(url, '/', length(url) - length(replace(url, '/', '')) + 1) as file_name,
  NULL::uuid as uploaded_by,
  created_at
FROM existing_media
ON CONFLICT (public_id) DO NOTHING;

-- Verify migration results
SELECT COUNT(*) as migrated_media_count FROM media_assets;
