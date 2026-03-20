-- Remove the unique constraint on (course_id, type) from message_templates
-- This allows multiple templates of the same type per course
ALTER TABLE message_templates
  DROP CONSTRAINT IF EXISTS message_templates_course_id_type_key;
