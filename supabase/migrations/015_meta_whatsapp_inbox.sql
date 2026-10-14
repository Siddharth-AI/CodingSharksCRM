ALTER TYPE lead_source_enum ADD VALUE IF NOT EXISTS 'whatsapp';
ALTER TYPE activity_type_enum ADD VALUE IF NOT EXISTS 'lead_touch';

ALTER TABLE whatsapp_messages
  ADD COLUMN IF NOT EXISTS direction TEXT NOT NULL DEFAULT 'outbound',
  ADD COLUMN IF NOT EXISTS wa_message_id TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS message_type TEXT NOT NULL DEFAULT 'text',
  ADD COLUMN IF NOT EXISTS media_id TEXT,
  ADD COLUMN IF NOT EXISTS media_mime_type TEXT,
  ADD COLUMN IF NOT EXISTS is_read BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE whatsapp_messages
  DROP CONSTRAINT IF EXISTS whatsapp_messages_direction_check;
ALTER TABLE whatsapp_messages
  ADD CONSTRAINT whatsapp_messages_direction_check CHECK (direction IN ('inbound', 'outbound'));

CREATE UNIQUE INDEX IF NOT EXISTS idx_messages_wa_message_id
  ON whatsapp_messages(wa_message_id) WHERE wa_message_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_messages_lead_created
  ON whatsapp_messages(lead_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_unread_inbound
  ON whatsapp_messages(lead_id) WHERE direction = 'inbound' AND is_read = false;

ALTER TABLE message_templates
  ADD COLUMN IF NOT EXISTS meta_template_id TEXT,
  ADD COLUMN IF NOT EXISTS meta_name TEXT,
  ADD COLUMN IF NOT EXISTS meta_language TEXT NOT NULL DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS meta_category TEXT,
  ADD COLUMN IF NOT EXISTS meta_status TEXT,
  ADD COLUMN IF NOT EXISTS meta_rejection_reason TEXT,
  ADD COLUMN IF NOT EXISTS meta_param_names JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS meta_header_format TEXT,
  ADD COLUMN IF NOT EXISTS meta_submitted_at TIMESTAMPTZ;

ALTER TABLE message_templates
  DROP CONSTRAINT IF EXISTS message_templates_meta_category_check;
ALTER TABLE message_templates
  ADD CONSTRAINT message_templates_meta_category_check CHECK (meta_category IS NULL OR meta_category IN ('MARKETING', 'UTILITY'));

CREATE UNIQUE INDEX IF NOT EXISTS idx_templates_meta_template_id
  ON message_templates(meta_template_id) WHERE meta_template_id IS NOT NULL;
