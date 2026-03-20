-- Add media columns to whatsapp_messages table
ALTER TABLE whatsapp_messages
  ADD COLUMN IF NOT EXISTS media_image_url TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS media_video_url  TEXT DEFAULT NULL;
