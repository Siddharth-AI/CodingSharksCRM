-- Create media_assets table to track all uploaded media across the application
-- This allows reusing media across templates without re-uploading

CREATE TABLE IF NOT EXISTS media_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Media info
  type TEXT NOT NULL CHECK (type IN ('image', 'video')),
  url TEXT NOT NULL,
  public_id TEXT NOT NULL UNIQUE,
  file_name TEXT,
  
  -- Metadata
  file_size_bytes BIGINT,
  mime_type TEXT,
  width INTEGER,
  height INTEGER,
  duration_seconds NUMERIC(8,2),
  
  -- References
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Lifecycle
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX idx_media_assets_type_created ON media_assets(type, created_at DESC);
CREATE INDEX idx_media_assets_uploaded_by ON media_assets(uploaded_by);
CREATE INDEX idx_media_assets_public_id ON media_assets(public_id);

-- Comments
COMMENT ON TABLE media_assets IS 'Library of all uploaded media (images/videos) - enables reuse across templates and messages';
COMMENT ON COLUMN media_assets.type IS 'Type of media: image or video';
COMMENT ON COLUMN media_assets.url IS 'Cloudinary URL to the media file';
COMMENT ON COLUMN media_assets.public_id IS 'Cloudinary public_id - used for deletion';
COMMENT ON COLUMN media_assets.uploaded_by IS 'User who uploaded the media';

-- ─── Replication / Sync ────────────────────────────────────────────────
-- Optional: trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_media_assets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_media_assets_updated_at ON media_assets;
CREATE TRIGGER trigger_media_assets_updated_at
BEFORE UPDATE ON media_assets
FOR EACH ROW
EXECUTE FUNCTION update_media_assets_updated_at();
