-- Remove the category column from courses table entirely
-- Category functionality has been removed from the codebase

ALTER TABLE courses DROP COLUMN IF EXISTS category;

-- Also drop the course_category enum type if it exists
DROP TYPE IF EXISTS course_category;
