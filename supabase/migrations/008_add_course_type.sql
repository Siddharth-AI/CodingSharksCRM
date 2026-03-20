-- Add course_type enum and column to courses table
-- regular = normal courses (Python, Web Dev, etc.)
-- workshop = temporary workshops (changes frequently)

CREATE TYPE course_type_enum AS ENUM ('regular', 'workshop');

ALTER TABLE courses
  ADD COLUMN course_type course_type_enum NOT NULL DEFAULT 'regular';
