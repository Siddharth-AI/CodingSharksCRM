-- Add media columns to message_templates table
-- Templates can optionally have one image and/or one video (stored as Cloudinary URLs)

ALTER TABLE message_templates
  ADD COLUMN IF NOT EXISTS media_image_url TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS media_video_url  TEXT DEFAULT NULL;

COMMENT ON COLUMN message_templates.media_image_url IS 'Cloudinary URL for optional image attachment';
COMMENT ON COLUMN message_templates.media_video_url  IS 'Cloudinary URL for optional video attachment';
