-- Make price optional — workshops can be free
ALTER TABLE courses ALTER COLUMN price DROP NOT NULL;
