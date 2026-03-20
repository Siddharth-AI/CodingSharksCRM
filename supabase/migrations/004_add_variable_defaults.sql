-- Add variable_defaults column to message_templates
-- Stores default values for custom (non-auto-fill) template variables
-- Format: { "batch_date": "15 April 2026", "offer_price": "₹9,999" }

ALTER TABLE message_templates
  ADD COLUMN IF NOT EXISTS variable_defaults JSONB DEFAULT '{}'::jsonb;
